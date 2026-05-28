import { SessionMode } from '@/types/study';
import React, { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useStudy } from '@/contexts/StudyContext';
import {
  completePomodoroPhase,
  createPomodoroRuntime,
  createStopwatchRuntime,
  finishStopwatch,
  getPomodoroRemainingSeconds,
  getStopwatchElapsedSeconds,
  getStopwatchPauseSeconds,
  pausePomodoro,
  pauseStopwatch,
  resumePomodoro,
  resumeStopwatch,
  skipPomodoroBreak,
  type CompletedPomodoroPhase,
  type FinishedRuntimeSummary,
  type PomodoroRuntimeState,
  type StopwatchRuntimeState,
  type TrackerBinding,
} from '@/features/tracker/runtime';
import {
  DEFAULT_POMODORO_SETTINGS,
  getTrackerStorageKeys,
  loadPomodoroSettings,
  loadTrackerRuntime,
  savePomodoroSettings,
  saveTrackerRuntime,
  type TrackerRuntimeState,
} from '@/features/tracker/storage';
import { formatSecondsAsClock } from '@/features/tracker/session-metrics';
import { toDateKey } from '@/lib/date-utils';
import { sendNotification, requestNotificationPermission } from '@/lib/notifications';
import { useNotifications } from '@/contexts/NotificationContext';

export type TrackerMode = 'stopwatch' | 'pomodoro';
export type TrackerBindingState = 'running' | 'paused' | null;
export type TrackerStartStatus = 'started' | 'resumed' | 'already-active' | 'conflict';

export interface TrackerStartResult {
  ok: boolean;
  status: TrackerStartStatus;
}

interface TrackerContextValue {
  runtime: TrackerRuntimeState | null;
  mode: TrackerMode;
  setMode: (mode: TrackerMode) => void;
  nowMs: number;
  isTransitioning: boolean;
  pomodoroSettings: typeof DEFAULT_POMODORO_SETTINGS;
  setPomodoroSettings: React.Dispatch<React.SetStateAction<typeof DEFAULT_POMODORO_SETTINGS>>;
  isRunning: boolean;
  isPaused: boolean;
  displayTimeLabel: string;
  secondaryTimeLabel?: string;
  phaseLabel?: string;
  phaseStateLabel?: string;
  activeStartTime?: string;
  startWithBinding: (
    binding: TrackerBinding,
    options?: { mode?: TrackerMode; forceSwitch?: boolean },
  ) => Promise<TrackerStartResult>;
  setActiveStartTime: (value?: string) => void;
  pauseActive: () => void;
  resumeActive: () => void;
  togglePauseResume: () => void;
  finishActive: (status?: 'completed' | 'abandoned') => Promise<boolean>;
  skipCurrentBreak: () => Promise<boolean>;
  clearRuntime: () => void;
  getBindingState: (binding: Partial<TrackerBinding>) => TrackerBindingState;
}

const TrackerContext = createContext<TrackerContextValue | undefined>(undefined);

function clockFromIso(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function isRuntimeRunning(runtime: TrackerRuntimeState | null): boolean {
  if (!runtime) return false;
  if (runtime.kind === 'stopwatch') return runtime.status === 'running';
  return runtime.phaseStatus === 'running';
}

function isRuntimePaused(runtime: TrackerRuntimeState | null): boolean {
  if (!runtime) return false;
  if (runtime.kind === 'stopwatch') return runtime.status === 'paused';
  return runtime.phaseStatus === 'paused';
}

function isSameBinding(runtime: TrackerRuntimeState, binding: Partial<TrackerBinding>): boolean {
  if (!binding.subjectId || runtime.subjectId !== binding.subjectId) return false;

  if (binding.scheduleEntryId) {
    return runtime.scheduleEntryId === binding.scheduleEntryId;
  }

  if (binding.scheduleDate) {
    return runtime.scheduleDate === binding.scheduleDate;
  }

  return true;
}

function parseClock(value?: string): { hour: number; minute: number } | null {
  if (!value) return null;
  const [hourRaw, minuteRaw] = value.split(':');
  const hour = Number(hourRaw);
  const minute = Number(minuteRaw);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return null;
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;
  return { hour, minute };
}

function toIsoFromDateAndClock(dateKey: string, clock: string): string | null {
  const parsed = parseClock(clock);
  if (!parsed) return null;
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(parsed.hour, parsed.minute, 0, 0);
  return date.toISOString();
}

function summaryToSessionPayload(
  runtime: StopwatchRuntimeState | PomodoroRuntimeState,
  summary: FinishedRuntimeSummary,
  options?: {
    status?: 'completed' | 'abandoned';
    source?: 'tracker' | 'pomodoro';
    phase?: 'focus' | 'short_break' | 'long_break';
    cycle?: number;
  },
) {
  const effectiveStartedAt = runtime.actualStartedAtOverride || summary.startedAt;
  const date = runtime.scheduleDate || toDateKey(new Date(effectiveStartedAt));
  const status = options?.status || 'completed';
  const phase = options?.phase;
  const source = options?.source || (runtime.kind === 'pomodoro' ? 'pomodoro' : 'tracker');
  const adjustedClockDuration = Math.max(
    summary.actualDurationSeconds + summary.totalPauseSeconds,
    Math.max(0, Math.floor((new Date(summary.endedAt).getTime() - new Date(effectiveStartedAt).getTime()) / 1000)),
  );

  const finalActualDurationSeconds = runtime.actualStartedAtOverride
    ? Math.max(
        0,
        Math.floor((new Date(summary.endedAt).getTime() - new Date(runtime.actualStartedAtOverride).getTime()) / 1000) -
          summary.totalPauseSeconds,
      )
    : summary.actualDurationSeconds;

  return {
    subjectId: runtime.subjectId,
    planId: runtime.planId,
    date,
    startTime: runtime.actualStartTimeOverride || clockFromIso(effectiveStartedAt),
    endTime: clockFromIso(summary.endedAt),
    durationMinutes: Math.round(finalActualDurationSeconds / 60),
    note: runtime.note,
    sessionMode: (runtime.kind === 'pomodoro' ? 'pomodoro' : 'stopwatch') as SessionMode,
    status,
    source,
    pomodoroPhase: phase,
    pomodoroCycle: options?.cycle,
    isFocusSession: runtime.kind === 'pomodoro' ? phase === 'focus' : true,
    startedAt: effectiveStartedAt,
    endedAt: summary.endedAt,
    actualDurationSeconds: finalActualDurationSeconds,
    totalPauseSeconds: summary.totalPauseSeconds,
    clockDurationSeconds: adjustedClockDuration,
    plannedStartTime: runtime.plannedStartTime,
    plannedMinutes: runtime.plannedMinutes,
    scheduleDate: runtime.scheduleDate,
    scheduleEntryId: runtime.scheduleEntryId,
    metadata: runtime.kind === 'pomodoro' ? { phaseIndex: runtime.phaseIndex } : undefined,
    pauses: summary.pauses.map((pause) => ({
      pauseStartedAt: pause.startedAt,
      pauseEndedAt: pause.endedAt,
      durationSeconds: pause.durationSeconds,
    })),
  };
}

export function TrackerProvider({ children }: { children: ReactNode }) {
  const { addSession, getSubject } = useStudy();
  const { addNotification } = useNotifications();

  const [runtime, setRuntime] = useState<TrackerRuntimeState | null>(() => loadTrackerRuntime());
  const [mode, setMode] = useState<TrackerMode>(() => (runtime?.kind === 'pomodoro' ? 'pomodoro' : 'stopwatch'));
  const [pomodoroSettings, setPomodoroSettings] = useState(loadPomodoroSettings);
  const [nowMs, setNowMs] = useState(Date.now());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const transitionRef = useRef(false);

  useEffect(() => {
    if (runtime?.kind === 'pomodoro') setMode('pomodoro');
    if (runtime?.kind === 'stopwatch') setMode('stopwatch');
  }, [runtime]);

  useEffect(() => {
    saveTrackerRuntime(runtime);
  }, [runtime]);

  useEffect(() => {
    savePomodoroSettings(pomodoroSettings);
  }, [pomodoroSettings]);

  useEffect(() => {
    const keys = getTrackerStorageKeys();
    const onStorage = (event: StorageEvent) => {
      if (event.key === keys.runtimeKey) {
        setRuntime(loadTrackerRuntime());
      }
      if (event.key === keys.pomodoroSettingsKey) {
        setPomodoroSettings(loadPomodoroSettings());
      }
    };

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    if (!isRuntimeRunning(runtime)) {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.getNotifications({ tag: 'timer-pwa' }).then((notifications) => {
            notifications.forEach((n) => n.close());
          });
        });
      }
      return;
    }
    
    const updatePwaNotification = () => {
      if ('serviceWorker' in navigator && Notification.permission === 'granted') {
        const title = runtime?.kind === 'pomodoro' ? 'Pomodoro Ativo' : 'Sessão Ativa';
        let displayTime = '';
        if (runtime?.kind === 'stopwatch') {
          displayTime = formatSecondsAsClock(getStopwatchElapsedSeconds(runtime, Date.now()));
        } else if (runtime?.kind === 'pomodoro') {
          displayTime = formatSecondsAsClock(getPomodoroRemainingSeconds(runtime, Date.now()));
        }

        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body: `Tempo rodando: ${displayTime}`,
            icon: '/studei-icon-192.png',
            badge: '/studei-icon-32.png',
            tag: 'timer-pwa',
            silent: true,
            renotify: false,
          }).catch(() => {});
        });
      }
    };

    updatePwaNotification();
    const timer = window.setInterval(() => {
      setNowMs(Date.now());
      updatePwaNotification();
    }, 1000);
    
    return () => window.clearInterval(timer);
  }, [runtime]);


  const persistPomodoroPhase = useCallback(
    async (runtimeState: PomodoroRuntimeState, completed: CompletedPomodoroPhase, status: 'completed' | 'abandoned' = 'completed') => {
      await addSession(
        summaryToSessionPayload(runtimeState, completed.summary, {
          status,
          source: 'pomodoro',
          phase: completed.phase,
          cycle: runtimeState.completedFocusSessions,
        }),
      );
    },
    [addSession],
  );

  useEffect(() => {
    if (!runtime || runtime.kind !== 'pomodoro' || runtime.phaseStatus !== 'running') return;

    const remaining = getPomodoroRemainingSeconds(runtime, nowMs);
    if (remaining > 0 || transitionRef.current) return;

    transitionRef.current = true;
    setIsTransitioning(true);

    (async () => {
      const completed = completePomodoroPhase(runtime, nowMs);
      await persistPomodoroPhase(runtime, completed, 'completed');
      setRuntime(completed.next);
      const subject = getSubject(runtime.subjectId);
      const subjectName = subject?.name || 'Matéria';
      const msg = completed.phase === 'focus' 
        ? `Foco em ${subjectName} concluído. Hora da pausa.` 
        : `Pausa concluída. Hora de focar em ${subjectName}.`;
      addNotification('BoraEstudar', msg, 'success');
    })().finally(() => {
      transitionRef.current = false;
      setIsTransitioning(false);
    });
  }, [runtime, nowMs, persistPomodoroPhase, getSubject, addNotification]);

  const finishCurrentRuntime = useCallback(
    async (current: TrackerRuntimeState, status: 'completed' | 'abandoned') => {
      if (current.kind === 'stopwatch') {
        const summary = finishStopwatch(current, Date.now());
        if (status === 'completed' && summary.actualDurationSeconds < 1) return false;
        await addSession(summaryToSessionPayload(current, summary, { status, source: 'tracker' }));
        if (status === 'completed') {
          const subject = getSubject(current.subjectId);
          const subjectName = subject?.name || 'Matéria';
          const finalActualDurationSeconds = current.actualStartedAtOverride
            ? Math.max(
                0,
                Math.floor((Date.now() - new Date(current.actualStartedAtOverride).getTime()) / 1000) -
                  summary.totalPauseSeconds,
              )
            : summary.actualDurationSeconds;
          const minutes = Math.round(finalActualDurationSeconds / 60);
          addNotification(
            'Sessão Concluída',
            `Você estudou ${subjectName} por ${minutes} minutos. Bom trabalho!`,
            'success'
          );
        }
        return true;
      }

      const completed = completePomodoroPhase(current, Date.now());
      await persistPomodoroPhase(current, completed, status);
      if (status === 'completed') {
        const subject = getSubject(current.subjectId);
        const subjectName = subject?.name || 'Matéria';
        const minutes = Math.round(completed.summary.actualDurationSeconds / 60);
        addNotification(
          'Pomodoro Concluído',
          `Sessão de foco em ${subjectName} encerrada. Você focou por ${minutes} minutos.`,
          'success'
        );
      }
      return true;
    },
    [addSession, persistPomodoroPhase, getSubject, addNotification],
  );

  const startWithBinding = useCallback(
    async (binding: TrackerBinding, options?: { mode?: TrackerMode; forceSwitch?: boolean }): Promise<TrackerStartResult> => {
      const targetMode = options?.mode || mode;
      const forceSwitch = Boolean(options?.forceSwitch);
      const now = Date.now();

      // Pedir permissão de notificações em gesto do usuário
      requestNotificationPermission().catch(console.error);

      if (runtime) {
        const same = isSameBinding(runtime, binding);
        if (same) {
          if (runtime.kind === 'stopwatch' && runtime.status === 'paused') {
            setRuntime(resumeStopwatch(runtime, now));
            return { ok: true, status: 'resumed' };
          }
          if (runtime.kind === 'pomodoro' && runtime.phaseStatus === 'paused') {
            setRuntime(resumePomodoro(runtime, now));
            return { ok: true, status: 'resumed' };
          }
          return { ok: true, status: 'already-active' };
        }

        if (!forceSwitch) {
          return { ok: false, status: 'conflict' };
        }

        setIsTransitioning(true);
        try {
          await finishCurrentRuntime(runtime, 'abandoned');
        } finally {
          setIsTransitioning(false);
        }
      }

      if (targetMode === 'pomodoro') {
        let created = createPomodoroRuntime(binding, pomodoroSettings, now);
        if (created.phaseStatus === 'paused') {
          created = resumePomodoro(created, now);
        }
        setRuntime(created);
        return { ok: true, status: 'started' };
      }

      setRuntime(createStopwatchRuntime(binding, now));
      return { ok: true, status: 'started' };
    },
    [runtime, mode, pomodoroSettings, finishCurrentRuntime],
  );

  const pauseActive = useCallback(() => {
    if (!runtime) return;
    const now = Date.now();
    if (runtime.kind === 'stopwatch') {
      setRuntime(pauseStopwatch(runtime, now));
      return;
    }
    setRuntime(pausePomodoro(runtime, now));
  }, [runtime]);

  const setActiveStartTime = useCallback((value?: string) => {
    setRuntime((previous) => {
      if (!previous || previous.kind !== 'stopwatch') return previous;

      if (!value) {
        return {
          ...previous,
          actualStartTimeOverride: undefined,
          actualStartedAtOverride: undefined,
        };
      }

      const baseDate = previous.scheduleDate || toDateKey(new Date(previous.startedAt));
      const startedAtOverride = toIsoFromDateAndClock(baseDate, value);
      if (!startedAtOverride) return previous;

      return {
        ...previous,
        actualStartTimeOverride: value,
        actualStartedAtOverride: startedAtOverride,
      };
    });
  }, []);

  const resumeActive = useCallback(() => {
    if (!runtime) return;
    const now = Date.now();
    if (runtime.kind === 'stopwatch') {
      setRuntime(resumeStopwatch(runtime, now));
      return;
    }
    setRuntime(resumePomodoro(runtime, now));
  }, [runtime]);

  const togglePauseResume = useCallback(() => {
    if (!runtime) return;
    if (isRuntimeRunning(runtime)) {
      pauseActive();
      return;
    }
    resumeActive();
  }, [runtime, pauseActive, resumeActive]);

  const finishActive = useCallback(
    async (status: 'completed' | 'abandoned' = 'completed') => {
      if (!runtime) return false;
      setIsTransitioning(true);
      const saved = await finishCurrentRuntime(runtime, status);
      setRuntime(null);
      setIsTransitioning(false);
      if (!saved && status === 'completed') {
        toast.error('Sessao muito curta para salvar.');
      }
      return saved;
    },
    [runtime, finishCurrentRuntime],
  );

  const skipCurrentBreak = useCallback(async () => {
    if (!runtime || runtime.kind !== 'pomodoro') return false;
    const skipped = skipPomodoroBreak(runtime, Date.now());
    if (!skipped) return false;

    setIsTransitioning(true);
    await persistPomodoroPhase(runtime, skipped, 'completed');
    setRuntime(skipped.next);
    setIsTransitioning(false);
    return true;
  }, [runtime, persistPomodoroPhase]);

  const clearRuntime = useCallback(() => {
    setRuntime(null);
  }, []);

  const getBindingState = useCallback(
    (binding: Partial<TrackerBinding>): TrackerBindingState => {
      if (!runtime) return null;
      if (!isSameBinding(runtime, binding)) return null;
      return isRuntimeRunning(runtime) ? 'running' : 'paused';
    },
    [runtime],
  );

  const displayTimeLabel = useMemo(() => {
    if (!runtime) return formatSecondsAsClock(0);
    if (runtime.kind === 'stopwatch') {
      return formatSecondsAsClock(getStopwatchElapsedSeconds(runtime, nowMs));
    }
    return formatSecondsAsClock(getPomodoroRemainingSeconds(runtime, nowMs));
  }, [runtime, nowMs]);

  const secondaryTimeLabel = useMemo(() => {
    if (!runtime || runtime.kind !== 'stopwatch') return undefined;
    return `Pausado ${formatSecondsAsClock(getStopwatchPauseSeconds(runtime, nowMs))}`;
  }, [runtime, nowMs]);

  const phaseLabel = useMemo(() => {
    if (!runtime || runtime.kind !== 'pomodoro') return undefined;
    if (runtime.phase === 'focus') return 'Foco';
    if (runtime.phase === 'short_break') return 'Pausa curta';
    return 'Pausa longa';
  }, [runtime]);

  const phaseStateLabel = useMemo(() => {
    if (!runtime) return undefined;
    return isRuntimeRunning(runtime) ? 'Rodando' : 'Pausado';
  }, [runtime]);

  const activeStartTime = useMemo(() => {
    if (!runtime || runtime.kind !== 'stopwatch') return undefined;
    return runtime.actualStartTimeOverride || clockFromIso(runtime.startedAt);
  }, [runtime]);

  useEffect(() => {
    if (runtime) {
      const subj = getSubject ? getSubject(runtime.subjectId) : undefined;
      const subjectName = subj?.name || 'Matéria';
      const label = runtime.kind === 'pomodoro' && runtime.phase !== 'focus' ? 'Pausa' : subjectName;
      const statusText = isRuntimeRunning(runtime) ? '(Timer)' : '(Pausado)';
      document.title = `${statusText} ${displayTimeLabel} | ${label}`;
    } else {
      document.title = 'BoraEstudar';
    }
  }, [runtime, displayTimeLabel, getSubject]);

  const value = useMemo<TrackerContextValue>(
    () => ({
      runtime,
      mode,
      setMode,
      nowMs,
      isTransitioning,
      pomodoroSettings,
      setPomodoroSettings,
      isRunning: isRuntimeRunning(runtime),
      isPaused: isRuntimePaused(runtime),
      displayTimeLabel,
      secondaryTimeLabel,
      phaseLabel,
      phaseStateLabel,
      activeStartTime,
      startWithBinding,
      setActiveStartTime,
      pauseActive,
      resumeActive,
      togglePauseResume,
      finishActive,
      skipCurrentBreak,
      clearRuntime,
      getBindingState,
    }),
    [
      runtime,
      mode,
      nowMs,
      isTransitioning,
      pomodoroSettings,
      displayTimeLabel,
      secondaryTimeLabel,
      phaseLabel,
      phaseStateLabel,
      activeStartTime,
      startWithBinding,
      setActiveStartTime,
      pauseActive,
      resumeActive,
      togglePauseResume,
      finishActive,
      skipCurrentBreak,
      clearRuntime,
      getBindingState,
    ],
  );

  return <TrackerContext.Provider value={value}>{children}</TrackerContext.Provider>;
}

export function useTracker() {
  const context = useContext(TrackerContext);
  if (!context) throw new Error('useTracker must be used within TrackerProvider');
  return context;
}

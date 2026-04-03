import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useStudy } from '@/contexts/StudyContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Pause, Play, SkipForward, Square, RotateCcw, TimerReset, Coffee, Brain } from 'lucide-react';
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
import { formatSecondsAsClock, getSessionActualMinutes, getSessionDateKey, getSessionEndLabel, getSessionPauseSeconds, getSessionStartLabel } from '@/features/tracker/session-metrics';
import { formatMinutesCompact } from '@/lib/duration-utils';
import { toDateKey } from '@/lib/date-utils';


type TimerMode = 'stopwatch' | 'pomodoro';

function clockFromIso(iso: string): string {
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function summaryToSessionPayload(
  runtime: StopwatchRuntimeState | PomodoroRuntimeState,
  summary: FinishedRuntimeSummary,
  options?: { status?: 'completed' | 'abandoned'; source?: 'tracker' | 'pomodoro'; phase?: 'focus' | 'short_break' | 'long_break'; cycle?: number }
) {
  const date = runtime.scheduleDate || toDateKey(new Date(summary.startedAt));
  const status = options?.status || 'completed';
  const phase = options?.phase;
  const source = options?.source || (runtime.kind === 'pomodoro' ? 'pomodoro' : 'tracker');

  return {
    subjectId: runtime.subjectId,
    date,
    startTime: clockFromIso(summary.startedAt),
    endTime: clockFromIso(summary.endedAt),
    durationMinutes: Math.round(summary.actualDurationSeconds / 60),
    note: runtime.note,
    sessionMode: runtime.kind === 'pomodoro' ? 'pomodoro' : 'stopwatch',
    status,
    source,
    pomodoroPhase: phase,
    pomodoroCycle: options?.cycle,
    isFocusSession: runtime.kind === 'pomodoro' ? phase === 'focus' : true,
    startedAt: summary.startedAt,
    endedAt: summary.endedAt,
    actualDurationSeconds: summary.actualDurationSeconds,
    totalPauseSeconds: summary.totalPauseSeconds,
    clockDurationSeconds: summary.clockDurationSeconds,
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

export default function TimerPage() {
  const { data, getSubject, addSession } = useStudy();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<TimerMode>('stopwatch');
  const [subjectId, setSubjectId] = useState('');
  const [note, setNote] = useState('');
  const [runtime, setRuntime] = useState<TrackerRuntimeState | null>(() => loadTrackerRuntime());
  const [pomodoroSettings, setPomodoroSettings] = useState(loadPomodoroSettings);
  const [nowMs, setNowMs] = useState(Date.now());

  const transitionInFlight = useRef(false);
  const hasHydratedRuntimeRef = useRef(false);

  const scheduleDateParam = searchParams.get('date') || undefined;
  const scheduleEntryParam = searchParams.get('entry') || undefined;
  const plannedStartParam = searchParams.get('plannedStart') || undefined;
  const plannedMinutesParam = searchParams.get('plannedMinutes');

  const plannedMinutes = plannedMinutesParam ? Number(plannedMinutesParam) : undefined;

  const activeSubjects = data.subjects.filter((s) => s.active);
  const subject = subjectId ? getSubject(subjectId) : undefined;

  useEffect(() => {
    const initialSubject = searchParams.get('subject');
    if (initialSubject && data.subjects.some((s) => s.id === initialSubject)) {
      setSubjectId(initialSubject);
    }
  }, [searchParams, data.subjects]);

  useEffect(() => {
    if (!runtime) {
      saveTrackerRuntime(null);
      hasHydratedRuntimeRef.current = false;
      return;
    }
    saveTrackerRuntime(runtime);
  }, [runtime]);

  useEffect(() => {
    if (!runtime || hasHydratedRuntimeRef.current) return;
    hasHydratedRuntimeRef.current = true;
    setMode(runtime.kind === 'pomodoro' ? 'pomodoro' : 'stopwatch');
    if (runtime.subjectId) setSubjectId(runtime.subjectId);
    if (runtime.note) setNote(runtime.note);
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
    const isRunning =
      (runtime?.kind === 'stopwatch' && runtime.status === 'running') ||
      (runtime?.kind === 'pomodoro' && runtime.phaseStatus === 'running');

    if (!isRunning) return;

    const timer = window.setInterval(() => {
      setNowMs(Date.now());
    }, 1000);

    return () => window.clearInterval(timer);
  }, [runtime]);

  const persistPomodoroPhase = useCallback(async (
    runtimeState: PomodoroRuntimeState,
    completed: CompletedPomodoroPhase,
    status: 'completed' | 'abandoned' = 'completed',
  ) => {
    const payload = summaryToSessionPayload(runtimeState, completed.summary, {
      status,
      source: 'pomodoro',
      phase: completed.phase,
      cycle: runtimeState.completedFocusSessions,
    });
    await addSession(payload);
  }, [addSession]);

  useEffect(() => {
    const current = runtime;
    if (!current || current.kind !== 'pomodoro' || current.phaseStatus !== 'running') return;

    const remaining = getPomodoroRemainingSeconds(current, nowMs);
    if (remaining > 0 || transitionInFlight.current) return;

    transitionInFlight.current = true;

    (async () => {
      const completed = completePomodoroPhase(current, nowMs);
      await persistPomodoroPhase(current, completed, 'completed');
      setRuntime(completed.next);
      toast.success(
        completed.phase === 'focus'
          ? 'Foco concluido. Hora da pausa.'
          : 'Pausa concluida. Hora de focar.',
      );
    })().finally(() => {
      transitionInFlight.current = false;
    });
  }, [runtime, nowMs, persistPomodoroPhase]);

  const currentBinding = useMemo(() => ({
    subjectId,
    scheduleDate: scheduleDateParam,
    scheduleEntryId: scheduleEntryParam,
    plannedStartTime: plannedStartParam,
    plannedMinutes: Number.isFinite(plannedMinutes as number) ? plannedMinutes : undefined,
    note: note.trim() || undefined,
  }), [subjectId, scheduleDateParam, scheduleEntryParam, plannedStartParam, plannedMinutes, note]);

  const stopwatchRuntime = runtime?.kind === 'stopwatch' ? runtime : null;
  const pomodoroRuntime = runtime?.kind === 'pomodoro' ? runtime : null;

  const stopwatchElapsed = stopwatchRuntime ? getStopwatchElapsedSeconds(stopwatchRuntime, nowMs) : 0;
  const stopwatchPaused = stopwatchRuntime ? getStopwatchPauseSeconds(stopwatchRuntime, nowMs) : 0;

  const pomodoroRemaining = pomodoroRuntime ? getPomodoroRemainingSeconds(pomodoroRuntime, nowMs) : 0;
  const pomodoroPhaseLabel = pomodoroRuntime
    ? pomodoroRuntime.phase === 'focus'
      ? 'Foco'
      : pomodoroRuntime.phase === 'short_break'
        ? 'Pausa curta'
        : 'Pausa longa'
    : 'Foco';

  const isTrackerLockedByOtherMode = runtime && runtime.kind !== mode;

  const handleStart = () => {
    if (!subjectId) {
      toast.error('Selecione uma materia para iniciar.');
      return;
    }

    if (mode === 'stopwatch') {
      if (runtime?.kind === 'stopwatch') {
        if (runtime.status === 'paused') {
          setRuntime(resumeStopwatch(runtime, Date.now()));
        }
        return;
      }

      const started = createStopwatchRuntime(currentBinding, Date.now());
      setRuntime(started);
      toast.success('Cronometro iniciado.');
      return;
    }

    // Pomodoro
    if (runtime?.kind === 'pomodoro') {
      if (runtime.phaseStatus === 'paused') {
        setRuntime(resumePomodoro(runtime, Date.now()));
      }
      return;
    }

    let created = createPomodoroRuntime(currentBinding, pomodoroSettings, Date.now());
    if (created.phaseStatus === 'paused') {
      created = resumePomodoro(created, Date.now());
    }
    setRuntime(created);
    toast.success('Pomodoro iniciado.');
  };

  const handlePause = () => {
    if (!runtime) return;
    if (runtime.kind === 'stopwatch') {
      setRuntime(pauseStopwatch(runtime, Date.now()));
      return;
    }
    setRuntime(pausePomodoro(runtime, Date.now()));
  };

  const handleReset = () => {
    setRuntime(null);
    setNote('');
    toast.info('Tracker resetado.');
  };

  const handleFinishStopwatch = async () => {
    if (!stopwatchRuntime) return;

    const summary = finishStopwatch(stopwatchRuntime, Date.now());
    if (summary.actualDurationSeconds < 10) {
      toast.error('Sessao muito curta para salvar.');
      setRuntime(null);
      return;
    }

    await addSession(summaryToSessionPayload(stopwatchRuntime, summary, { status: 'completed', source: 'tracker' }));
    setRuntime(null);
    setNote('');
    toast.success('Sessao de estudo registrada.');
  };

  const handleStopPomodoro = async () => {
    if (!pomodoroRuntime) return;

    transitionInFlight.current = true;
    try {
      const completed = completePomodoroPhase(pomodoroRuntime, Date.now());
      await persistPomodoroPhase(pomodoroRuntime, completed, 'abandoned');
      setRuntime(null);
      setNote('');
      toast.info('Pomodoro encerrado. Fase atual salva no historico.');
    } finally {
      transitionInFlight.current = false;
    }
  };

  const handleSkipBreak = async () => {
    if (!pomodoroRuntime) return;

    const skipped = skipPomodoroBreak(pomodoroRuntime, Date.now());
    if (!skipped) return;

    transitionInFlight.current = true;
    try {
      await persistPomodoroPhase(pomodoroRuntime, skipped, 'completed');
      setRuntime(skipped.next);
      toast.success('Pausa pulada. Voltando para foco.');
    } finally {
      transitionInFlight.current = false;
    }
  };

  const today = toDateKey(new Date());
  const recentSessions = data.sessions
    .filter((session) => session.date === today)
    .sort((a, b) => {
      const aStart = a.startedAt || `${a.date}T${a.startTime || '00:00'}:00`;
      const bStart = b.startedAt || `${b.date}T${b.startTime || '00:00'}:00`;
      return bStart.localeCompare(aStart);
    })
    .slice(0, 8);

  return (
    <div className="space-y-6 w-full max-w-none">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Tracker de Estudo</h1>
          <p className="text-sm text-muted-foreground mt-1">Planejado e executado separados, mas sincronizados com o cronograma.</p>
        </div>
        {runtime && (
          <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            Sessao ativa: <strong className="text-foreground">{runtime.kind === 'stopwatch' ? 'Cronometro' : 'Pomodoro'}</strong>
          </div>
        )}
      </div>

      <div className="glass-card p-3 md:p-4 space-y-4">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 w-fit">
          <button
            onClick={() => !runtime && setMode('stopwatch')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'stopwatch' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            Cronometro
          </button>
          <button
            onClick={() => !runtime && setMode('pomodoro')}
            className={`px-4 py-1.5 rounded-md text-xs font-medium transition-colors ${mode === 'pomodoro' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}
          >
            Pomodoro
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[minmax(0,260px)_1fr] gap-4 items-start">
          <div className="space-y-3">
            <div className="space-y-2">
              <Label>Materia</Label>
              <Select value={subjectId} onValueChange={setSubjectId} disabled={Boolean(runtime)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a materia" />
                </SelectTrigger>
                <SelectContent>
                  {activeSubjects.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                        {s.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {(scheduleDateParam || scheduleEntryParam || plannedStartParam || plannedMinutes) && (
              <div className="rounded-lg border border-border/70 bg-muted/40 px-3 py-2 text-xs text-muted-foreground space-y-1">
                <p className="font-medium text-foreground">Contexto do cronograma</p>
                {scheduleDateParam && <p>Dia: {new Date(`${scheduleDateParam}T12:00:00`).toLocaleDateString('pt-BR')}</p>}
                {plannedStartParam && <p>Planejado: {plannedStartParam}</p>}
                {plannedMinutes !== undefined && Number.isFinite(plannedMinutes) && <p>Meta: {formatMinutesCompact(plannedMinutes)}</p>}
              </div>
            )}

            <div className="space-y-2">
              <Label>Observacao da sessao</Label>
              <Textarea
                value={note}
                onChange={(event) => {
                  const value = event.target.value;
                  setNote(value);
                  setRuntime((prev) => {
                    if (!prev) return prev;
                    return { ...prev, note: value.trim() || undefined };
                  });
                }}
                rows={3}
                placeholder="Anotacoes da sessao, contexto ou dificuldades..."
              />
            </div>

            {mode === 'pomodoro' && !runtime && (
              <div className="rounded-lg border border-border/70 bg-muted/30 p-3 space-y-3">
                <p className="text-xs font-semibold text-foreground uppercase tracking-[0.11em]">Configuracao Pomodoro</p>

                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Foco (min)</Label>
                    <Input
                      type="number"
                      min={1}
                      value={pomodoroSettings.focusMinutes}
                      onChange={(event) => setPomodoroSettings((prev) => ({ ...prev, focusMinutes: Math.max(1, Number(event.target.value || 1)) }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pausa curta</Label>
                    <Input
                      type="number"
                      min={1}
                      value={pomodoroSettings.shortBreakMinutes}
                      onChange={(event) => setPomodoroSettings((prev) => ({ ...prev, shortBreakMinutes: Math.max(1, Number(event.target.value || 1)) }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Pausa longa</Label>
                    <Input
                      type="number"
                      min={1}
                      value={pomodoroSettings.longBreakMinutes}
                      onChange={(event) => setPomodoroSettings((prev) => ({ ...prev, longBreakMinutes: Math.max(1, Number(event.target.value || 1)) }))}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs">Longa a cada</Label>
                    <Input
                      type="number"
                      min={1}
                      value={pomodoroSettings.longBreakEvery}
                      onChange={(event) => setPomodoroSettings((prev) => ({ ...prev, longBreakEvery: Math.max(1, Number(event.target.value || 1)) }))}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="flex items-center justify-between gap-2 text-xs text-foreground">
                    <span>Auto iniciar pausas</span>
                    <Switch
                      checked={pomodoroSettings.autoStartBreak}
                      onCheckedChange={(checked) => setPomodoroSettings((prev) => ({ ...prev, autoStartBreak: checked }))}
                    />
                  </label>
                  <label className="flex items-center justify-between gap-2 text-xs text-foreground">
                    <span>Auto iniciar foco</span>
                    <Switch
                      checked={pomodoroSettings.autoStartFocus}
                      onCheckedChange={(checked) => setPomodoroSettings((prev) => ({ ...prev, autoStartFocus: checked }))}
                    />
                  </label>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full"
                  onClick={() => setPomodoroSettings(DEFAULT_POMODORO_SETTINGS)}
                >
                  <TimerReset className="w-4 h-4 mr-1" /> Restaurar padrao
                </Button>
              </div>
            )}
          </div>

          <div className="glass-card p-5 md:p-6 text-center space-y-5">
            {subject && (
              <div className="flex items-center justify-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject.color }} />
                <span className="text-sm font-medium text-foreground">{subject.name}</span>
              </div>
            )}

            {mode === 'stopwatch' ? (
              <>
                <p className="text-xs uppercase tracking-[0.11em] text-muted-foreground font-semibold">Cronometro</p>
                <p className="text-5xl font-display font-bold text-foreground tabular-nums">{formatSecondsAsClock(stopwatchElapsed)}</p>
                <p className="text-sm text-muted-foreground">Pausado: <strong className="text-foreground">{formatSecondsAsClock(stopwatchPaused)}</strong></p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center gap-2">
                  {pomodoroRuntime?.phase === 'focus' ? <Brain className="w-4 h-4 text-primary" /> : <Coffee className="w-4 h-4 text-accent" />}
                  <p className="text-xs uppercase tracking-[0.11em] text-muted-foreground font-semibold">{pomodoroPhaseLabel}</p>
                </div>
                <p className="text-5xl font-display font-bold text-foreground tabular-nums">{formatSecondsAsClock(pomodoroRemaining)}</p>
                <div className="text-sm text-muted-foreground space-y-1">
                  <p>Ciclo: <strong className="text-foreground">{pomodoroRuntime?.completedFocusSessions ?? 0}</strong></p>
                  {pomodoroRuntime && (
                    <p>Proxima longa em <strong className="text-foreground">{Math.max(1, pomodoroSettings.longBreakEvery - (pomodoroRuntime.completedFocusSessions % pomodoroSettings.longBreakEvery))}</strong> foco(s)</p>
                  )}
                </div>
              </>
            )}

            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Button onClick={handleStart} disabled={isTrackerLockedByOtherMode || transitionInFlight.current}>
                <Play className="w-4 h-4 mr-1" />
                {runtime ? 'Retomar/Iniciar' : 'Iniciar'}
              </Button>

              {runtime && (
                <Button variant="outline" onClick={handlePause} disabled={transitionInFlight.current}>
                  <Pause className="w-4 h-4 mr-1" />Pausar
                </Button>
              )}

              {mode === 'stopwatch' && stopwatchRuntime && (
                <Button variant="default" onClick={handleFinishStopwatch} disabled={transitionInFlight.current}>
                  <Square className="w-4 h-4 mr-1" />Finalizar
                </Button>
              )}

              {mode === 'pomodoro' && pomodoroRuntime && pomodoroRuntime.phase !== 'focus' && (
                <Button variant="secondary" onClick={handleSkipBreak} disabled={transitionInFlight.current}>
                  <SkipForward className="w-4 h-4 mr-1" />Pular pausa
                </Button>
              )}

              {mode === 'pomodoro' && pomodoroRuntime && (
                <Button variant="destructive" onClick={handleStopPomodoro} disabled={transitionInFlight.current}>
                  <Square className="w-4 h-4 mr-1" />Encerrar
                </Button>
              )}

              {runtime && (
                <Button variant="ghost" onClick={handleReset} disabled={transitionInFlight.current}>
                  <RotateCcw className="w-4 h-4 mr-1" />Reset
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-[0.11em]">Sessoes de hoje</h3>
        {recentSessions.length === 0 ? (
          <div className="glass-card p-4 text-sm text-muted-foreground">Nenhuma sessao registrada hoje.</div>
        ) : (
          recentSessions.map((session) => {
            const subj = getSubject(session.subjectId);
            const pauses = data.sessionPauses.filter((pause) => pause.sessionId === session.id);
            const actualMin = getSessionActualMinutes(session);
            const pauseMin = Math.round(getSessionPauseSeconds(session, pauses) / 60);
            const startLabel = getSessionStartLabel(session);
            const endLabel = getSessionEndLabel(session);
            const phaseLabel =
              session.sessionMode === 'pomodoro'
                ? session.pomodoroPhase === 'focus'
                  ? 'Foco'
                  : session.pomodoroPhase === 'short_break'
                    ? 'Pausa curta'
                    : session.pomodoroPhase === 'long_break'
                      ? 'Pausa longa'
                      : 'Pomodoro'
                : 'Cronometro';

            return (
              <div key={session.id} className="glass-card p-3 space-y-2">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subj?.color }} />
                  <span className="text-sm font-medium text-foreground flex-1 truncate">{subj?.name}</span>
                  <span className="text-xs text-muted-foreground">{phaseLabel}</span>
                </div>

                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{startLabel}{endLabel ? ` -> ${endLabel}` : ''}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5">feito {formatMinutesCompact(actualMin)}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5">pausa {formatMinutesCompact(pauseMin)}</span>
                  <span className="rounded bg-muted px-1.5 py-0.5">dia {getSessionDateKey(session)}</span>
                </div>

                {pauses.length > 0 && (
                  <div className="rounded-lg bg-muted/30 px-2 py-2 space-y-1">
                    <p className="text-[11px] text-muted-foreground">Pausas</p>
                    {pauses.map((pause) => (
                      <p key={pause.id} className="text-[11px] text-foreground">
                        {clockFromIso(pause.pauseStartedAt)}
                        {' -> '}
                        {pause.pauseEndedAt ? clockFromIso(pause.pauseEndedAt) : '--:--'}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

import { PomodoroPhase } from '@/types/study';

export type RuntimeStatus = 'running' | 'paused';

export interface RuntimePauseSegment {
  id: string;
  startedAt: string;
  endedAt?: string;
}

export interface TrackerBinding {
  subjectId: string;
  scheduleDate?: string;
  scheduleEntryId?: string;
  plannedStartTime?: string;
  plannedMinutes?: number;
  note?: string;
  actualStartTimeOverride?: string;
  actualStartedAtOverride?: string;
}

export interface StopwatchRuntimeState extends TrackerBinding {
  kind: 'stopwatch';
  runId: string;
  startedAt: string;
  status: RuntimeStatus;
  elapsedCompletedSeconds: number;
  currentRunStartedAt?: string;
  currentPauseStartedAt?: string;
  pauses: RuntimePauseSegment[];
}

export interface PomodoroSettings {
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
  autoStartBreak: boolean;
  autoStartFocus: boolean;
}

export interface PomodoroRuntimeState extends TrackerBinding {
  kind: 'pomodoro';
  runId: string;
  settings: PomodoroSettings;
  phase: PomodoroPhase;
  phaseIndex: number;
  completedFocusSessions: number;
  phaseStatus: RuntimeStatus;
  phaseStartedAt: string;
  phaseEndAt?: string;
  phaseRemainingSeconds: number;
  pauses: RuntimePauseSegment[];
  currentPauseStartedAt?: string;
}

export interface FinishedRuntimeSummary {
  startedAt: string;
  endedAt: string;
  actualDurationSeconds: number;
  totalPauseSeconds: number;
  clockDurationSeconds: number;
  pauses: Array<{ startedAt: string; endedAt: string; durationSeconds: number }>;
}

export interface CompletedPomodoroPhase {
  phase: PomodoroPhase;
  phaseIndex: number;
  summary: FinishedRuntimeSummary;
  next: PomodoroRuntimeState;
}

function nowIso(nowMs: number = Date.now()): string {
  return new Date(nowMs).toISOString();
}

function diffSeconds(startIso: string, endMs: number = Date.now()): number {
  const startMs = new Date(startIso).getTime();
  return Math.max(0, Math.floor((endMs - startMs) / 1000));
}

function clampPositive(value: number): number {
  return Math.max(0, Math.floor(value));
}

function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function closeOpenPauses(pauses: RuntimePauseSegment[], endIso: string) {
  return pauses.map((pause) => (pause.endedAt ? pause : { ...pause, endedAt: endIso }));
}

function toPauseSummaries(pauses: RuntimePauseSegment[]) {
  return pauses
    .filter((pause) => pause.endedAt)
    .map((pause) => {
      const durationSeconds = clampPositive((new Date(pause.endedAt as string).getTime() - new Date(pause.startedAt).getTime()) / 1000);
      return {
        startedAt: pause.startedAt,
        endedAt: pause.endedAt as string,
        durationSeconds,
      };
    });
}

export function getStopwatchElapsedSeconds(state: StopwatchRuntimeState, nowMs: number = Date.now()): number {
  if (state.status === 'running' && state.currentRunStartedAt) {
    return clampPositive(state.elapsedCompletedSeconds + diffSeconds(state.currentRunStartedAt, nowMs));
  }
  return clampPositive(state.elapsedCompletedSeconds);
}

export function getStopwatchPauseSeconds(state: StopwatchRuntimeState, nowMs: number = Date.now()): number {
  let total = 0;
  for (const pause of state.pauses) {
    if (pause.endedAt) {
      total += diffSeconds(pause.startedAt, new Date(pause.endedAt).getTime());
    }
  }
  if (state.status === 'paused' && state.currentPauseStartedAt) {
    total += diffSeconds(state.currentPauseStartedAt, nowMs);
  }
  return clampPositive(total);
}

export function createStopwatchRuntime(binding: TrackerBinding, nowMs: number = Date.now()): StopwatchRuntimeState {
  const startIso = nowIso(nowMs);
  return {
    kind: 'stopwatch',
    runId: generateId('sw'),
    ...binding,
    startedAt: startIso,
    status: 'running',
    elapsedCompletedSeconds: 0,
    currentRunStartedAt: startIso,
    pauses: [],
  };
}

export function pauseStopwatch(state: StopwatchRuntimeState, nowMs: number = Date.now()): StopwatchRuntimeState {
  if (state.status !== 'running' || !state.currentRunStartedAt) return state;

  const elapsedSinceResume = diffSeconds(state.currentRunStartedAt, nowMs);
  const pauseStartedAt = nowIso(nowMs);

  return {
    ...state,
    status: 'paused',
    elapsedCompletedSeconds: clampPositive(state.elapsedCompletedSeconds + elapsedSinceResume),
    currentRunStartedAt: undefined,
    currentPauseStartedAt: pauseStartedAt,
    pauses: [...state.pauses, { id: generateId('pause'), startedAt: pauseStartedAt }],
  };
}

export function resumeStopwatch(state: StopwatchRuntimeState, nowMs: number = Date.now()): StopwatchRuntimeState {
  if (state.status !== 'paused') return state;

  const resumeIso = nowIso(nowMs);
  let pausedUpdated = state.pauses;

  if (state.currentPauseStartedAt) {
    pausedUpdated = state.pauses.map((pause, index, arr) => {
      if (index !== arr.length - 1 || pause.endedAt) return pause;
      return { ...pause, endedAt: resumeIso };
    });
  }

  return {
    ...state,
    status: 'running',
    currentRunStartedAt: resumeIso,
    currentPauseStartedAt: undefined,
    pauses: pausedUpdated,
  };
}

export function finishStopwatch(state: StopwatchRuntimeState, nowMs: number = Date.now()): FinishedRuntimeSummary {
  const endedAt = nowIso(nowMs);
  const pausesClosed = state.status === 'paused' ? closeOpenPauses(state.pauses, endedAt) : state.pauses;
  const totalPauseSeconds = toPauseSummaries(pausesClosed).reduce((acc, pause) => acc + pause.durationSeconds, 0);

  const actualDurationSeconds = state.status === 'running'
    ? clampPositive(state.elapsedCompletedSeconds + (state.currentRunStartedAt ? diffSeconds(state.currentRunStartedAt, nowMs) : 0))
    : clampPositive(state.elapsedCompletedSeconds);

  const clockDurationSeconds = clampPositive(diffSeconds(state.startedAt, nowMs));

  return {
    startedAt: state.startedAt,
    endedAt,
    actualDurationSeconds,
    totalPauseSeconds,
    clockDurationSeconds,
    pauses: toPauseSummaries(pausesClosed),
  };
}

function getPhaseDurationSeconds(settings: PomodoroSettings, phase: PomodoroPhase): number {
  if (phase === 'focus') return clampPositive(settings.focusMinutes * 60);
  if (phase === 'short_break') return clampPositive(settings.shortBreakMinutes * 60);
  return clampPositive(settings.longBreakMinutes * 60);
}

function shouldAutoStart(settings: PomodoroSettings, phase: PomodoroPhase): boolean {
  return phase === 'focus' ? settings.autoStartFocus : settings.autoStartBreak;
}

export function createPomodoroRuntime(binding: TrackerBinding, settings: PomodoroSettings, nowMs: number = Date.now()): PomodoroRuntimeState {
  const phase: PomodoroPhase = 'focus';
  const duration = getPhaseDurationSeconds(settings, phase);
  const startedAt = nowIso(nowMs);
  const autoStart = shouldAutoStart(settings, phase);

  return {
    kind: 'pomodoro',
    runId: generateId('pomo'),
    ...binding,
    settings,
    phase,
    phaseIndex: 1,
    completedFocusSessions: 0,
    phaseStatus: autoStart ? 'running' : 'paused',
    phaseStartedAt: startedAt,
    phaseEndAt: autoStart ? nowIso(nowMs + duration * 1000) : undefined,
    phaseRemainingSeconds: duration,
    pauses: [],
  };
}

export function getPomodoroRemainingSeconds(state: PomodoroRuntimeState, nowMs: number = Date.now()): number {
  if (state.phaseStatus === 'running' && state.phaseEndAt) {
    const remaining = Math.ceil((new Date(state.phaseEndAt).getTime() - nowMs) / 1000);
    return clampPositive(remaining);
  }
  return clampPositive(state.phaseRemainingSeconds);
}

export function pausePomodoro(state: PomodoroRuntimeState, nowMs: number = Date.now()): PomodoroRuntimeState {
  if (state.phaseStatus !== 'running') return state;
  const pauseStartedAt = nowIso(nowMs);
  const remaining = getPomodoroRemainingSeconds(state, nowMs);

  return {
    ...state,
    phaseStatus: 'paused',
    phaseEndAt: undefined,
    phaseRemainingSeconds: remaining,
    currentPauseStartedAt: pauseStartedAt,
    pauses: [...state.pauses, { id: generateId('pause'), startedAt: pauseStartedAt }],
  };
}

export function resumePomodoro(state: PomodoroRuntimeState, nowMs: number = Date.now()): PomodoroRuntimeState {
  if (state.phaseStatus !== 'paused') return state;
  const resumeAt = nowIso(nowMs);

  const updatedPauses = state.pauses.map((pause, index, arr) => {
    if (index !== arr.length - 1 || pause.endedAt) return pause;
    return { ...pause, endedAt: resumeAt };
  });

  return {
    ...state,
    phaseStatus: 'running',
    phaseEndAt: nowIso(nowMs + state.phaseRemainingSeconds * 1000),
    currentPauseStartedAt: undefined,
    pauses: updatedPauses,
  };
}

function finishPomodoroPhaseSummary(state: PomodoroRuntimeState, nowMs: number): FinishedRuntimeSummary {
  const endedAt = nowIso(nowMs);
  const pausesClosed = state.phaseStatus === 'paused' ? closeOpenPauses(state.pauses, endedAt) : state.pauses;
  const pauseSummaries = toPauseSummaries(pausesClosed);
  const totalPauseSeconds = pauseSummaries.reduce((acc, pause) => acc + pause.durationSeconds, 0);
  const clockDurationSeconds = clampPositive(diffSeconds(state.phaseStartedAt, nowMs));
  const actualDurationSeconds = clampPositive(clockDurationSeconds - totalPauseSeconds);

  return {
    startedAt: state.phaseStartedAt,
    endedAt,
    actualDurationSeconds,
    totalPauseSeconds,
    clockDurationSeconds,
    pauses: pauseSummaries,
  };
}

function createNextPhaseState(state: PomodoroRuntimeState, phase: PomodoroPhase, completedFocusSessions: number, nowMs: number): PomodoroRuntimeState {
  const duration = getPhaseDurationSeconds(state.settings, phase);
  const autoStart = shouldAutoStart(state.settings, phase);
  const phaseStartedAt = nowIso(nowMs);

  return {
    ...state,
    phase,
    phaseIndex: state.phaseIndex + 1,
    completedFocusSessions,
    phaseStatus: autoStart ? 'running' : 'paused',
    phaseStartedAt,
    phaseEndAt: autoStart ? nowIso(nowMs + duration * 1000) : undefined,
    phaseRemainingSeconds: duration,
    pauses: [],
    currentPauseStartedAt: undefined,
  };
}

export function completePomodoroPhase(state: PomodoroRuntimeState, nowMs: number = Date.now()): CompletedPomodoroPhase {
  const summary = finishPomodoroPhaseSummary(state, nowMs);
  const completedFocus = state.phase === 'focus' ? state.completedFocusSessions + 1 : state.completedFocusSessions;

  let nextPhase: PomodoroPhase;
  if (state.phase === 'focus') {
    nextPhase = completedFocus % Math.max(1, state.settings.longBreakEvery) === 0 ? 'long_break' : 'short_break';
  } else {
    nextPhase = 'focus';
  }

  const next = createNextPhaseState(state, nextPhase, completedFocus, nowMs);

  return {
    phase: state.phase,
    phaseIndex: state.phaseIndex,
    summary,
    next,
  };
}

export function skipPomodoroBreak(state: PomodoroRuntimeState, nowMs: number = Date.now()): CompletedPomodoroPhase | null {
  if (state.phase === 'focus') return null;
  const summary = finishPomodoroPhaseSummary(state, nowMs);
  const next = createNextPhaseState(state, 'focus', state.completedFocusSessions, nowMs);

  return {
    phase: state.phase,
    phaseIndex: state.phaseIndex,
    summary,
    next,
  };
}

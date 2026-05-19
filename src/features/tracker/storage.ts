import { PomodoroRuntimeState, PomodoroSettings, StopwatchRuntimeState } from '@/features/tracker/runtime';

export type TrackerRuntimeState = StopwatchRuntimeState | PomodoroRuntimeState;

const RUNTIME_KEY = 'studyflow:tracker-runtime-v2';
const POMODORO_SETTINGS_KEY = 'studyflow:pomodoro-settings-v1';

export const DEFAULT_POMODORO_SETTINGS: PomodoroSettings = {
  focusMinutes: 25,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  longBreakEvery: 4,
  autoStartBreak: false,
  autoStartFocus: false,
};

export function loadTrackerRuntime(): TrackerRuntimeState | null {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem(RUNTIME_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as TrackerRuntimeState;
  } catch {
    return null;
  }
}

export function saveTrackerRuntime(runtime: TrackerRuntimeState | null) {
  if (typeof window === 'undefined') return;
  if (!runtime) {
    window.localStorage.removeItem(RUNTIME_KEY);
    return;
  }
  window.localStorage.setItem(RUNTIME_KEY, JSON.stringify(runtime));
}

export function loadPomodoroSettings(): PomodoroSettings {
  if (typeof window === 'undefined') return DEFAULT_POMODORO_SETTINGS;
  const raw = window.localStorage.getItem(POMODORO_SETTINGS_KEY);
  if (!raw) return DEFAULT_POMODORO_SETTINGS;

  try {
    const parsed = JSON.parse(raw) as Partial<PomodoroSettings>;
    return {
      focusMinutes: Math.max(1, Number(parsed.focusMinutes ?? DEFAULT_POMODORO_SETTINGS.focusMinutes)),
      shortBreakMinutes: Math.max(1, Number(parsed.shortBreakMinutes ?? DEFAULT_POMODORO_SETTINGS.shortBreakMinutes)),
      longBreakMinutes: Math.max(1, Number(parsed.longBreakMinutes ?? DEFAULT_POMODORO_SETTINGS.longBreakMinutes)),
      longBreakEvery: Math.max(1, Number(parsed.longBreakEvery ?? DEFAULT_POMODORO_SETTINGS.longBreakEvery)),
      autoStartBreak: Boolean(parsed.autoStartBreak ?? DEFAULT_POMODORO_SETTINGS.autoStartBreak),
      autoStartFocus: Boolean(parsed.autoStartFocus ?? DEFAULT_POMODORO_SETTINGS.autoStartFocus),
    };
  } catch {
    return DEFAULT_POMODORO_SETTINGS;
  }
}

export function savePomodoroSettings(settings: PomodoroSettings) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(POMODORO_SETTINGS_KEY, JSON.stringify(settings));
}

export function getTrackerStorageKeys() {
  return {
    runtimeKey: RUNTIME_KEY,
    pomodoroSettingsKey: POMODORO_SETTINGS_KEY,
  };
}

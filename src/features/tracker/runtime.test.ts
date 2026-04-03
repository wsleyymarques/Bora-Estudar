import { describe, expect, it } from 'vitest';
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
  type PomodoroSettings,
} from '@/features/tracker/runtime';

const BASE_TIME = Date.parse('2026-04-03T12:00:00.000Z');

describe('tracker runtime - stopwatch', () => {
  it('handles start, multiple pauses, resume and finish with accurate durations', () => {
    const started = createStopwatchRuntime({ subjectId: 'subject-1' }, BASE_TIME);
    const pause1 = pauseStopwatch(started, BASE_TIME + 20 * 60 * 1000);
    const resume1 = resumeStopwatch(pause1, BASE_TIME + 30 * 60 * 1000);
    const pause2 = pauseStopwatch(resume1, BASE_TIME + 40 * 60 * 1000);
    const resume2 = resumeStopwatch(pause2, BASE_TIME + 45 * 60 * 1000);
    const summary = finishStopwatch(resume2, BASE_TIME + 60 * 60 * 1000);

    expect(getStopwatchElapsedSeconds(resume2, BASE_TIME + 60 * 60 * 1000)).toBe(45 * 60);
    expect(getStopwatchPauseSeconds(resume2, BASE_TIME + 60 * 60 * 1000)).toBe(15 * 60);
    expect(summary.actualDurationSeconds).toBe(45 * 60);
    expect(summary.totalPauseSeconds).toBe(15 * 60);
    expect(summary.clockDurationSeconds).toBe(60 * 60);
    expect(summary.pauses).toHaveLength(2);
    expect(summary.pauses[0].durationSeconds).toBe(10 * 60);
    expect(summary.pauses[1].durationSeconds).toBe(5 * 60);
  });

  it('closes open pause when finishing while paused', () => {
    const started = createStopwatchRuntime({ subjectId: 'subject-1' }, BASE_TIME);
    const paused = pauseStopwatch(started, BASE_TIME + 10 * 60 * 1000);
    const summary = finishStopwatch(paused, BASE_TIME + 25 * 60 * 1000);

    expect(summary.actualDurationSeconds).toBe(10 * 60);
    expect(summary.totalPauseSeconds).toBe(15 * 60);
    expect(summary.clockDurationSeconds).toBe(25 * 60);
    expect(summary.pauses).toHaveLength(1);
    expect(summary.pauses[0].durationSeconds).toBe(15 * 60);
  });
});

describe('tracker runtime - pomodoro', () => {
  const settings: PomodoroSettings = {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 10,
    longBreakEvery: 2,
    autoStartBreak: false,
    autoStartFocus: false,
  };

  it('transitions focus -> short break -> focus -> long break based on cycles', () => {
    const created = createPomodoroRuntime({ subjectId: 'subject-1' }, settings, BASE_TIME);
    expect(created.phase).toBe('focus');
    expect(created.phaseStatus).toBe('paused');
    expect(getPomodoroRemainingSeconds(created, BASE_TIME)).toBe(25 * 60);

    const runningFocus1 = resumePomodoro(created, BASE_TIME);
    const completedFocus1 = completePomodoroPhase(runningFocus1, BASE_TIME + 25 * 60 * 1000);

    expect(completedFocus1.phase).toBe('focus');
    expect(completedFocus1.summary.actualDurationSeconds).toBe(25 * 60);
    expect(completedFocus1.next.phase).toBe('short_break');
    expect(completedFocus1.next.phaseStatus).toBe('paused');
    expect(completedFocus1.next.completedFocusSessions).toBe(1);

    const runningShortBreak = resumePomodoro(completedFocus1.next, BASE_TIME + 25 * 60 * 1000);
    const completedShortBreak = completePomodoroPhase(runningShortBreak, BASE_TIME + 30 * 60 * 1000);

    expect(completedShortBreak.phase).toBe('short_break');
    expect(completedShortBreak.next.phase).toBe('focus');
    expect(completedShortBreak.next.completedFocusSessions).toBe(1);

    const runningFocus2 = resumePomodoro(completedShortBreak.next, BASE_TIME + 30 * 60 * 1000);
    const completedFocus2 = completePomodoroPhase(runningFocus2, BASE_TIME + 55 * 60 * 1000);

    expect(completedFocus2.phase).toBe('focus');
    expect(completedFocus2.next.phase).toBe('long_break');
    expect(completedFocus2.next.completedFocusSessions).toBe(2);
  });

  it('supports pause/resume and skip break flow', () => {
    const autoSettings: PomodoroSettings = {
      ...settings,
      autoStartBreak: true,
      autoStartFocus: true,
    };

    const created = createPomodoroRuntime({ subjectId: 'subject-1' }, autoSettings, BASE_TIME);
    expect(created.phaseStatus).toBe('running');

    const pausedFocus = pausePomodoro(created, BASE_TIME + 5 * 60 * 1000);
    expect(pausedFocus.phaseStatus).toBe('paused');
    expect(getPomodoroRemainingSeconds(pausedFocus, BASE_TIME + 6 * 60 * 1000)).toBe(20 * 60);

    const resumedFocus = resumePomodoro(pausedFocus, BASE_TIME + 6 * 60 * 1000);
    const completedFocus = completePomodoroPhase(resumedFocus, BASE_TIME + 26 * 60 * 1000);

    expect(completedFocus.next.phase).toBe('short_break');
    expect(completedFocus.next.phaseStatus).toBe('running');

    const skippedBreak = skipPomodoroBreak(completedFocus.next, BASE_TIME + 27 * 60 * 1000);
    expect(skippedBreak).not.toBeNull();
    expect(skippedBreak?.phase).toBe('short_break');
    expect(skippedBreak?.next.phase).toBe('focus');
    expect(skippedBreak?.next.phaseStatus).toBe('running');
  });
});


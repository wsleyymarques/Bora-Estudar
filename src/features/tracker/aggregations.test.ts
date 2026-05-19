import { describe, expect, it } from 'vitest';
import {
  calculatePlannedVsExecuted,
  getFocusSessionsForDate,
  getSessionsForDate,
  sumMinutesBySubject,
  sumSessionActualMinutes,
  sumSessionPauseMinutes,
} from '@/features/tracker/aggregations';
import { StudySession, StudySessionPause } from '@/types/study';

const sessions: StudySession[] = [
  {
    id: 's1',
    subjectId: 'math',
    date: '2026-04-03',
    startTime: '08:00',
    durationMinutes: 30,
    actualDurationSeconds: 1800,
    isFocusSession: true,
  },
  {
    id: 's2',
    subjectId: 'math',
    date: '2026-04-03',
    startTime: '12:00',
    durationMinutes: 40,
    actualDurationSeconds: 2400,
    isFocusSession: true,
  },
  {
    id: 's3',
    subjectId: 'port',
    date: '2026-04-03',
    startTime: '15:00',
    durationMinutes: 20,
    actualDurationSeconds: 1200,
    isFocusSession: true,
  },
  {
    id: 's4',
    subjectId: 'math',
    date: '2026-04-03',
    startTime: '18:00',
    durationMinutes: 5,
    actualDurationSeconds: 300,
    isFocusSession: false,
  },
];

const pauses: StudySessionPause[] = [
  {
    id: 'p1',
    sessionId: 's1',
    pauseStartedAt: '2026-04-03T08:10:00.000Z',
    pauseEndedAt: '2026-04-03T08:15:00.000Z',
  },
  {
    id: 'p2',
    sessionId: 's2',
    pauseStartedAt: '2026-04-03T12:15:00.000Z',
    pauseEndedAt: '2026-04-03T12:20:00.000Z',
  },
];

describe('tracker aggregations', () => {
  it('filters sessions by date and focus', () => {
    const byDate = getSessionsForDate(sessions, '2026-04-03');
    const focusByDate = getFocusSessionsForDate(sessions, '2026-04-03');

    expect(byDate).toHaveLength(4);
    expect(focusByDate).toHaveLength(3);
  });

  it('sums executed and paused minutes correctly', () => {
    const focusByDate = getFocusSessionsForDate(sessions, '2026-04-03');
    expect(sumSessionActualMinutes(focusByDate)).toBe(90);
    expect(sumSessionPauseMinutes(focusByDate, pauses)).toBe(10);
  });

  it('aggregates totals by subject', () => {
    const focusByDate = getFocusSessionsForDate(sessions, '2026-04-03');
    const totals = sumMinutesBySubject(focusByDate);

    expect(totals.math).toBe(70);
    expect(totals.port).toBe(20);
  });

  it('computes planned vs executed adherence', () => {
    const result = calculatePlannedVsExecuted(60, 90);
    expect(result.plannedMinutes).toBe(60);
    expect(result.executedMinutes).toBe(90);
    expect(result.deltaMinutes).toBe(30);
    expect(result.adherencePercent).toBe(150);
  });
});


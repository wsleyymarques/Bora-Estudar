import { describe, expect, it } from 'vitest';
import { buildMonthlyCells, buildYearlyMinutesSummary, getDayStats, getEntriesForDate, getWeeklyDateKeys } from '@/features/schedule/selectors';
import { Note, ScheduleDayPlan, ScheduleEntry, StudySession, StudySessionPause } from '@/types/study';
import { parseDateKey } from '@/lib/date-utils';

const schedule: ScheduleEntry[] = [
  { id: 'e1', date: '2026-04-06', subjectId: 's1', optional: false, completed: true, order: 0, startTime: '08:00', plannedMinutes: 90 },
  { id: 'e2', date: '2026-04-06', subjectId: 's2', optional: false, completed: false, order: 1, plannedMinutes: 30 },
  { id: 'e3', date: '2026-04-07', subjectId: 's3', optional: true, completed: false, order: 0, dayNote: 'Template note' },
];

const sessions: StudySession[] = [
  { id: 'ss1', subjectId: 's1', date: '2026-04-06', startTime: '10:00', durationMinutes: 50 },
  { id: 'ss2', subjectId: 's2', date: '2026-04-06', startTime: '11:00', durationMinutes: 30 },
];

const pauses: StudySessionPause[] = [
  {
    id: 'p1',
    sessionId: 'ss1',
    pauseStartedAt: '2026-04-06T10:20:00.000Z',
    pauseEndedAt: '2026-04-06T10:30:00.000Z',
  },
];

const notes: Note[] = [
  { id: 'n1', type: 'day', referenceDate: '2026-04-06', content: 'Nota manual', createdAt: '2026-04-06' },
];
const dayPlans: ScheduleDayPlan[] = [
  { id: 'd1', date: '2026-04-06', dayTargetMinutes: 180, dayNote: 'Meta alta' },
];

describe('schedule selectors', () => {
  it('builds week keys from monday anchor', () => {
    const keys = getWeeklyDateKeys(parseDateKey('2026-04-08'));
    expect(keys[0]).toBe('2026-04-06');
    expect(keys[6]).toBe('2026-04-12');
  });

  it('computes day stats consistently for completion and notes', () => {
    const stats = getDayStats(schedule, sessions, notes, dayPlans, '2026-04-06', pauses);
    expect(stats.total).toBe(2);
    expect(stats.completed).toBe(1);
    expect(stats.hasPending).toBe(true);
    expect(stats.hasObservation).toBe(true);
    expect(stats.minutes).toBe(80);
    expect(stats.pausedMinutes).toBe(10);
    expect(stats.plannedMinutes).toBe(120);
    expect(stats.dayTargetMinutes).toBe(180);
    expect(stats.hasAnyStartTime).toBe(true);
  });

  it('creates monthly cells with outside-month days and status', () => {
    const cells = buildMonthlyCells(parseDateKey('2026-04-10'), schedule, sessions, notes, dayPlans);
    expect(cells).toHaveLength(42);
    expect(cells[0].inCurrentMonth).toBe(false);

    const apr6 = cells.find(c => c.date === '2026-04-06');
    expect(apr6).toBeTruthy();
    expect(apr6?.stats.completed).toBe(1);
    expect(apr6?.stats.total).toBe(2);
  });

  it('builds yearly summary from sessions', () => {
    const yearly = buildYearlyMinutesSummary(2026, sessions);
    expect(yearly).toHaveLength(12);
    expect(yearly[3].totalMin).toBe(80); // April
    expect(yearly[3].studiedDays).toBe(1);
  });

  it('orders entries by start time before fallback order', () => {
    const ordered = getEntriesForDate([
      { id: 'a', date: '2026-04-06', subjectId: 's1', optional: false, completed: false, order: 2 },
      { id: 'b', date: '2026-04-06', subjectId: 's1', optional: false, completed: false, order: 1, startTime: '09:30' },
      { id: 'c', date: '2026-04-06', subjectId: 's1', optional: false, completed: false, order: 0, startTime: '08:00' },
    ], '2026-04-06');
    expect(ordered.map(e => e.id)).toEqual(['c', 'b', 'a']);
  });

  it('supports legacy entries without planning fields', () => {
    const stats = getDayStats(
      [{ id: 'x', date: '2026-04-08', subjectId: 's2', optional: false, completed: false, order: 0 }],
      [],
      [],
      [],
      '2026-04-08',
    );
    expect(stats.plannedMinutes).toBe(0);
    expect(stats.dayTargetMinutes).toBeUndefined();
    expect(stats.hasAnyStartTime).toBe(false);
  });
});

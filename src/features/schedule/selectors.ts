import { Note, ScheduleDayPlan, ScheduleEntry, StudySession, StudySessionPause } from '@/types/study';
import { addDays, getMonday, parseDateKey, toDateKey } from '@/lib/date-utils';
import { getSessionActualMinutes } from '@/features/tracker/session-metrics';
import { calculatePlannedVsExecuted, getFocusSessionsForDate, sumSessionActualMinutes, sumSessionPauseMinutes } from '@/features/tracker/aggregations';

export interface DayStats {
  total: number;
  completed: number;
  hasPending: boolean;
  hasObservation: boolean;
  minutes: number;
  pausedMinutes: number;
  focusSessions: number;
  plannedMinutes: number;
  dayTargetMinutes?: number;
  targetDeltaMinutes?: number;
  adherencePercent?: number;
  hasAnyStartTime: boolean;
}

export interface MonthlyCell {
  date: string;
  day: number;
  inCurrentMonth: boolean;
  stats: DayStats;
  entries: ScheduleEntry[];
}

export function getEntriesForDate(schedule: ScheduleEntry[], date: string): ScheduleEntry[] {
  return schedule
    .filter(s => s.date === date)
    .sort((a, b) => {
      if (a.startTime && b.startTime) {
        if (a.startTime < b.startTime) return -1;
        if (a.startTime > b.startTime) return 1;
      } else if (a.startTime && !b.startTime) {
        return -1;
      } else if (!a.startTime && b.startTime) {
        return 1;
      }
      return a.order - b.order;
    });
}

export function getDayObservation(
  notes: Note[],
  entries: ScheduleEntry[],
  dayPlans: ScheduleDayPlan[],
  date: string
): string | undefined {
  const fromPlan = dayPlans.find(d => d.date === date)?.dayNote;
  if (fromPlan) return fromPlan;
  const note = notes.find(n => n.type === 'day' && n.referenceDate === date)?.content;
  if (note) return note;
  return entries.find(e => e.dayNote)?.dayNote;
}

export function getDayStats(
  schedule: ScheduleEntry[],
  sessions: StudySession[],
  notes: Note[],
  dayPlans: ScheduleDayPlan[],
  date: string,
  sessionPauses: StudySessionPause[] = [],
): DayStats {
  const entries = getEntriesForDate(schedule, date);
  const completed = entries.filter(e => e.completed).length;
  const hasPending = entries.some(e => !e.completed && !e.optional);
  const hasObservation = Boolean(getDayObservation(notes, entries, dayPlans, date));
  const focusSessions = getFocusSessionsForDate(sessions, date);
  const minutes = sumSessionActualMinutes(focusSessions);
  const pausedMinutes = sumSessionPauseMinutes(focusSessions, sessionPauses);
  const plannedMinutes = entries.reduce((acc, e) => acc + (e.plannedMinutes || 0), 0);
  const dayTargetMinutes = dayPlans.find(d => d.date === date)?.dayTargetMinutes;
  const targetDeltaMinutes = dayTargetMinutes !== undefined ? dayTargetMinutes - plannedMinutes : undefined;
  const adherencePercent = calculatePlannedVsExecuted(plannedMinutes, minutes).adherencePercent;
  const hasAnyStartTime = entries.some(e => !!e.startTime);
  return {
    total: entries.length,
    completed,
    hasPending,
    hasObservation,
    minutes,
    pausedMinutes,
    focusSessions: focusSessions.length,
    plannedMinutes,
    dayTargetMinutes,
    targetDeltaMinutes,
    adherencePercent,
    hasAnyStartTime,
  };
}

export function getWeeklyDateKeys(anchorDate: Date): string[] {
  const monday = getMonday(anchorDate);
  return Array.from({ length: 7 }, (_, i) => toDateKey(addDays(monday, i)));
}

export function buildMonthlyCells(
  currentDate: Date,
  schedule: ScheduleEntry[],
  sessions: StudySession[],
  notes: Note[],
  dayPlans: ScheduleDayPlan[],
  sessionPauses: StudySessionPause[] = [],
): MonthlyCell[] {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1, 12, 0, 0, 0);
  const gridStart = new Date(firstDay);
  const mondayOffset = (firstDay.getDay() + 6) % 7;
  gridStart.setDate(firstDay.getDate() - mondayOffset);

  return Array.from({ length: 42 }, (_, i) => {
    const d = addDays(gridStart, i);
    const date = toDateKey(d);
    const entries = getEntriesForDate(schedule, date);
    return {
      date,
      day: d.getDate(),
      inCurrentMonth: d.getMonth() === month,
      stats: getDayStats(schedule, sessions, notes, dayPlans, date, sessionPauses),
      entries,
    };
  });
}

export function buildYearlyMinutesSummary(year: number, sessions: StudySession[]) {
  return Array.from({ length: 12 }, (_, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    let totalMin = 0;
    let studiedDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const date = toDateKey(new Date(year, month, day, 12, 0, 0, 0));
      const mins = sessions
        .filter(s => s.date === date && s.isFocusSession !== false)
        .reduce((acc, s) => acc + getSessionActualMinutes(s), 0);
      if (mins > 0) {
        totalMin += mins;
        studiedDays++;
      }
    }

    return { month, totalMin, studiedDays };
  });
}

export function dayKeyFromInput(value: string): string {
  return toDateKey(parseDateKey(value));
}

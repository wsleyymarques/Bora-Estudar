import { StudySession, StudySessionPause } from '@/types/study';
import { getSessionActualMinutes, getSessionPauseSeconds } from '@/features/tracker/session-metrics';

export interface PlannedVsExecuted {
  plannedMinutes: number;
  executedMinutes: number;
  deltaMinutes: number;
  adherencePercent?: number;
}

export function getFocusSessions(sessions: StudySession[]): StudySession[] {
  return sessions.filter((session) => session.isFocusSession !== false);
}

export function getSessionsForDate(sessions: StudySession[], date: string): StudySession[] {
  return sessions.filter((session) => session.date === date);
}

export function getFocusSessionsForDate(sessions: StudySession[], date: string): StudySession[] {
  return getFocusSessions(getSessionsForDate(sessions, date));
}

export function sumSessionActualMinutes(sessions: StudySession[]): number {
  return sessions.reduce((acc, session) => acc + getSessionActualMinutes(session), 0);
}

export function sumSessionPauseMinutes(sessions: StudySession[], pauses: StudySessionPause[] = []): number {
  const pauseSeconds = sessions.reduce((acc, session) => acc + getSessionPauseSeconds(session, pauses), 0);
  return Math.round(pauseSeconds / 60);
}

export function sumMinutesBySubject(sessions: StudySession[]): Record<string, number> {
  return sessions.reduce<Record<string, number>>((acc, session) => {
    const current = acc[session.subjectId] || 0;
    acc[session.subjectId] = current + getSessionActualMinutes(session);
    return acc;
  }, {});
}

export function calculatePlannedVsExecuted(plannedMinutes: number, executedMinutes: number): PlannedVsExecuted {
  const normalizedPlanned = Math.max(0, Math.round(plannedMinutes || 0));
  const normalizedExecuted = Math.max(0, Math.round(executedMinutes || 0));

  return {
    plannedMinutes: normalizedPlanned,
    executedMinutes: normalizedExecuted,
    deltaMinutes: normalizedExecuted - normalizedPlanned,
    adherencePercent: normalizedPlanned > 0 ? Math.round((normalizedExecuted / normalizedPlanned) * 100) : undefined,
  };
}


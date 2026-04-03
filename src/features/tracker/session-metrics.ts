import { StudySession, StudySessionPause } from '@/types/study';
import { toDateKey } from '@/lib/date-utils';

export function getSessionActualSeconds(session: StudySession): number {
  if (session.actualDurationSeconds !== undefined && session.actualDurationSeconds !== null) {
    return Math.max(0, Math.round(session.actualDurationSeconds));
  }
  return Math.max(0, Math.round((session.durationMinutes || 0) * 60));
}

export function getSessionPauseSeconds(session: StudySession, pauses: StudySessionPause[] = []): number {
  if (session.totalPauseSeconds !== undefined && session.totalPauseSeconds !== null) {
    return Math.max(0, Math.round(session.totalPauseSeconds));
  }

  return pauses
    .filter((pause) => pause.sessionId === session.id)
    .reduce((acc, pause) => {
      if (pause.durationSeconds !== undefined && pause.durationSeconds !== null) {
        return acc + Math.max(0, Math.round(pause.durationSeconds));
      }
      if (!pause.pauseEndedAt) return acc;
      const diff = Math.floor((new Date(pause.pauseEndedAt).getTime() - new Date(pause.pauseStartedAt).getTime()) / 1000);
      return acc + Math.max(0, diff);
    }, 0);
}

export function getSessionClockSeconds(session: StudySession, pauses: StudySessionPause[] = []): number {
  if (session.clockDurationSeconds !== undefined && session.clockDurationSeconds !== null) {
    return Math.max(0, Math.round(session.clockDurationSeconds));
  }

  const actual = getSessionActualSeconds(session);
  const paused = getSessionPauseSeconds(session, pauses);
  return Math.max(0, actual + paused);
}

export function getSessionActualMinutes(session: StudySession): number {
  return Math.round(getSessionActualSeconds(session) / 60);
}

export function formatClockTimeFromIso(iso?: string): string | undefined {
  if (!iso) return undefined;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return undefined;
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false });
}

export function getSessionStartLabel(session: StudySession): string {
  return formatClockTimeFromIso(session.startedAt) || session.startTime;
}

export function getSessionEndLabel(session: StudySession): string | undefined {
  return formatClockTimeFromIso(session.endedAt) || session.endTime;
}

export function getSessionDateKey(session: StudySession): string {
  if (session.scheduleDate) return session.scheduleDate;
  if (session.date) return session.date;
  if (session.startedAt) return toDateKey(new Date(session.startedAt));
  return toDateKey(new Date());
}

export function formatSecondsAsClock(totalSeconds: number): string {
  const sec = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;

  if (h > 0) {
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

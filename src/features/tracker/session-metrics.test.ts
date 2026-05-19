import { describe, expect, it } from 'vitest';
import {
  formatSecondsAsClock,
  getSessionActualMinutes,
  getSessionActualSeconds,
  getSessionClockSeconds,
  getSessionDateKey,
  getSessionEndLabel,
  getSessionPauseSeconds,
  getSessionStartLabel,
} from '@/features/tracker/session-metrics';
import { StudySession, StudySessionPause } from '@/types/study';

describe('session metrics', () => {
  const baseSession: StudySession = {
    id: 'session-1',
    subjectId: 'subject-1',
    date: '2026-04-03',
    startTime: '12:00',
    endTime: '13:00',
    durationMinutes: 60,
  };

  it('prioritizes explicit second fields over legacy duration', () => {
    const withSeconds: StudySession = {
      ...baseSession,
      actualDurationSeconds: 3000,
      totalPauseSeconds: 600,
      clockDurationSeconds: 3600,
    };

    expect(getSessionActualSeconds(withSeconds)).toBe(3000);
    expect(getSessionActualMinutes(withSeconds)).toBe(50);
    expect(getSessionPauseSeconds(withSeconds)).toBe(600);
    expect(getSessionClockSeconds(withSeconds)).toBe(3600);
  });

  it('falls back to pause rows when total pause seconds is missing', () => {
    const legacySession: StudySession = {
      ...baseSession,
      actualDurationSeconds: undefined,
      totalPauseSeconds: undefined,
      clockDurationSeconds: undefined,
      durationMinutes: 60,
    };
    const pauses: StudySessionPause[] = [
      {
        id: 'pause-1',
        sessionId: legacySession.id,
        pauseStartedAt: '2026-04-03T12:20:00.000Z',
        pauseEndedAt: '2026-04-03T12:30:00.000Z',
      },
    ];

    expect(getSessionPauseSeconds(legacySession, pauses)).toBe(10 * 60);
    expect(getSessionClockSeconds(legacySession, pauses)).toBe(70 * 60);
  });

  it('resolves start/end labels from ISO timestamps when available', () => {
    const trackedSession: StudySession = {
      ...baseSession,
      startedAt: '2026-04-03T12:00:00.000Z',
      endedAt: '2026-04-03T13:00:00.000Z',
    };

    expect(getSessionStartLabel(trackedSession)).toMatch(/^\d{2}:\d{2}$/);
    expect(getSessionEndLabel(trackedSession)).toMatch(/^\d{2}:\d{2}$/);
  });

  it('uses schedule date first when deriving date key', () => {
    const withScheduleDate: StudySession = {
      ...baseSession,
      scheduleDate: '2026-04-02',
      startedAt: '2026-04-03T00:30:00.000Z',
    };

    expect(getSessionDateKey(withScheduleDate)).toBe('2026-04-02');
    expect(getSessionDateKey({ ...baseSession, scheduleDate: undefined })).toBe('2026-04-03');
  });

  it('formats seconds as clock with hour when needed', () => {
    expect(formatSecondsAsClock(65)).toBe('01:05');
    expect(formatSecondsAsClock(3661)).toBe('01:01:01');
  });
});


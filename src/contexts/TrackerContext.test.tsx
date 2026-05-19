import React from 'react';
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TrackerProvider, useTracker } from '@/contexts/TrackerContext';

const addSession = vi.fn().mockResolvedValue(undefined);

vi.mock('@/contexts/StudyContext', () => ({
  useStudy: () => ({
    addSession,
  }),
}));

function wrapper({ children }: { children: React.ReactNode }) {
  return <TrackerProvider>{children}</TrackerProvider>;
}

describe('TrackerContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-03T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('executa fluxo stopwatch start/pause/resume/finish', async () => {
    const { result } = renderHook(() => useTracker(), { wrapper });

    await act(async () => {
      const started = await result.current.startWithBinding(
        { subjectId: 'subject-1', scheduleDate: '2026-04-03', scheduleEntryId: 'entry-1' },
        { mode: 'stopwatch' },
      );
      expect(started.ok).toBe(true);
    });

    expect(result.current.getBindingState({ subjectId: 'subject-1', scheduleEntryId: 'entry-1' })).toBe('running');

    act(() => {
      result.current.pauseActive();
    });
    expect(result.current.getBindingState({ subjectId: 'subject-1', scheduleEntryId: 'entry-1' })).toBe('paused');

    act(() => {
      result.current.resumeActive();
    });
    expect(result.current.getBindingState({ subjectId: 'subject-1', scheduleEntryId: 'entry-1' })).toBe('running');

    vi.setSystemTime(new Date('2026-04-03T12:00:20Z'));

    await act(async () => {
      await result.current.finishActive('completed');
    });

    expect(result.current.runtime).toBeNull();
    expect(addSession).toHaveBeenCalledTimes(1);
  });

  it('retorna conflito para outro binding ativo e permite force switch', async () => {
    const { result } = renderHook(() => useTracker(), { wrapper });

    await act(async () => {
      await result.current.startWithBinding(
        { subjectId: 'subject-1', scheduleDate: '2026-04-03', scheduleEntryId: 'entry-1' },
        { mode: 'stopwatch' },
      );
    });

    let conflictResult: Awaited<ReturnType<typeof result.current.startWithBinding>> | null = null;
    await act(async () => {
      conflictResult = await result.current.startWithBinding(
        { subjectId: 'subject-2', scheduleDate: '2026-04-03', scheduleEntryId: 'entry-2' },
        { mode: 'stopwatch' },
      );
    });

    expect(conflictResult).toEqual({ ok: false, status: 'conflict' });

    await act(async () => {
      const forced = await result.current.startWithBinding(
        { subjectId: 'subject-2', scheduleDate: '2026-04-03', scheduleEntryId: 'entry-2' },
        { mode: 'stopwatch', forceSwitch: true },
      );
      expect(forced.ok).toBe(true);
    });

    expect(result.current.runtime?.subjectId).toBe('subject-2');
    expect(addSession).toHaveBeenCalledTimes(1);
  });

  it('permite editar horario de inicio no cronometro e persiste no payload final', async () => {
    const { result } = renderHook(() => useTracker(), { wrapper });

    await act(async () => {
      await result.current.startWithBinding(
        { subjectId: 'subject-1', scheduleDate: '2026-04-03', scheduleEntryId: 'entry-1' },
        { mode: 'stopwatch' },
      );
    });

    act(() => {
      result.current.setActiveStartTime('08:15');
    });

    expect(result.current.activeStartTime).toBe('08:15');

    vi.setSystemTime(new Date('2026-04-03T12:20:00Z'));

    await act(async () => {
      await result.current.finishActive('completed');
    });

    expect(addSession).toHaveBeenCalledWith(
      expect.objectContaining({
        subjectId: 'subject-1',
        date: '2026-04-03',
        startTime: '08:15',
      }),
    );
  });
});

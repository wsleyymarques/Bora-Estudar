import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { ScheduleItemPlayButton } from '@/components/schedule/ScheduleItemPlayButton';
import { ScheduleEntry } from '@/types/study';

const startWithBinding = vi.fn();
const togglePauseResume = vi.fn();
const setMode = vi.fn();
const setPomodoroSettings = vi.fn();

const trackerState = {
  setMode,
  pomodoroSettings: {
    focusMinutes: 25,
    shortBreakMinutes: 5,
    longBreakMinutes: 15,
    longBreakEvery: 4,
    autoStartBreak: false,
    autoStartFocus: false,
  },
  setPomodoroSettings,
  getBindingState: vi.fn(() => null as 'running' | 'paused' | null),
  startWithBinding,
  togglePauseResume,
  isTransitioning: false,
};

vi.mock('@/contexts/TrackerContext', () => ({
  useTracker: () => trackerState,
}));

vi.mock('@/contexts/StudyContext', () => ({
  useStudy: () => ({
    getSubject: vi.fn(() => ({ id: 'subject-1', name: 'Matematica', color: '#6B9BD2' })),
  }),
}));

const baseEntry: ScheduleEntry = {
  id: 'entry-1',
  date: '2026-04-03',
  subjectId: 'subject-1',
  optional: false,
  completed: false,
  order: 0,
  startTime: '08:00',
  plannedMinutes: 60,
};

describe('ScheduleItemPlayButton', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    trackerState.getBindingState.mockReturnValue(null);
    startWithBinding.mockResolvedValue({ ok: true, status: 'started' });
  });

  it('abre seletor e inicia cronometro quando escolhido', async () => {
    render(<ScheduleItemPlayButton entry={baseEntry} date={baseEntry.date} />);

    fireEvent.click(screen.getByRole('button', { name: /Escolher modo de inicio/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Iniciar cronometro/i }));

    expect(startWithBinding).toHaveBeenCalledWith(
      {
        subjectId: baseEntry.subjectId,
        scheduleDate: baseEntry.date,
        scheduleEntryId: baseEntry.id,
        plannedStartTime: baseEntry.startTime,
        plannedMinutes: baseEntry.plannedMinutes,
      },
      { mode: 'stopwatch' },
    );
    expect(setMode).toHaveBeenCalledWith('stopwatch');
  });

  it('pausa/retoma quando a materia ja esta ativa', () => {
    trackerState.getBindingState.mockReturnValue('running');
    render(<ScheduleItemPlayButton entry={baseEntry} date={baseEntry.date} />);

    fireEvent.click(screen.getByRole('button'));

    expect(togglePauseResume).toHaveBeenCalledTimes(1);
    expect(startWithBinding).not.toHaveBeenCalled();
  });

  it('permite force switch quando existe conflito e usuario confirma', async () => {
    startWithBinding
      .mockResolvedValueOnce({ ok: false, status: 'conflict' })
      .mockResolvedValueOnce({ ok: true, status: 'started' });
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);

    render(<ScheduleItemPlayButton entry={baseEntry} date={baseEntry.date} />);
    fireEvent.click(screen.getByRole('button', { name: /Escolher modo de inicio/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Iniciar cronometro/i }));

    await waitFor(() => {
      expect(confirmSpy).toHaveBeenCalledTimes(1);
      expect(startWithBinding).toHaveBeenNthCalledWith(
        2,
        {
          subjectId: baseEntry.subjectId,
          scheduleDate: baseEntry.date,
          scheduleEntryId: baseEntry.id,
          plannedStartTime: baseEntry.startTime,
          plannedMinutes: baseEntry.plannedMinutes,
        },
        { mode: 'stopwatch', forceSwitch: true },
      );
    });

    confirmSpy.mockRestore();
  });

  it('permite editar pomodoro antes de iniciar no card', async () => {
    render(<ScheduleItemPlayButton entry={baseEntry} date={baseEntry.date} />);

    fireEvent.click(screen.getByRole('button', { name: /Escolher modo de inicio/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Pomodoro \(editar e iniciar\)/i }));

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Foco \(min\)/i), { target: { value: '30' } });
    expect(setPomodoroSettings).toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Iniciar pomodoro/i }));
    await waitFor(() => {
      expect(startWithBinding).toHaveBeenCalledWith(
        {
          subjectId: baseEntry.subjectId,
          scheduleDate: baseEntry.date,
          scheduleEntryId: baseEntry.id,
          plannedStartTime: baseEntry.startTime,
          plannedMinutes: baseEntry.plannedMinutes,
        },
        { mode: 'pomodoro' },
      );
    });
    expect(setMode).toHaveBeenCalledWith('pomodoro');
  });
});

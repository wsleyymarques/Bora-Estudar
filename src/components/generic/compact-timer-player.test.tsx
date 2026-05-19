import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { CompactTimerPlayer } from '@/components/generic/compact-timer-player';

const navigate = vi.fn();
const togglePauseResume = vi.fn();
const finishActive = vi.fn();
const skipCurrentBreak = vi.fn();
const setMode = vi.fn();
const setActiveStartTime = vi.fn();
const setPomodoroSettings = vi.fn();

type RuntimeMock =
  | {
      kind: 'stopwatch';
      subjectId: string;
    }
  | {
      kind: 'pomodoro';
      subjectId: string;
      phase: 'focus' | 'short_break' | 'long_break';
    };

const trackerState = {
  runtime: null as RuntimeMock | null,
  mode: 'stopwatch' as 'stopwatch' | 'pomodoro',
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
  isRunning: false,
  displayTimeLabel: '00:00',
  secondaryTimeLabel: undefined as string | undefined,
  phaseLabel: undefined as string | undefined,
  phaseStateLabel: 'Pausado',
  activeStartTime: undefined as string | undefined,
  setActiveStartTime,
  togglePauseResume,
  finishActive,
  skipCurrentBreak,
  isTransitioning: false,
};

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => navigate,
  };
});

vi.mock('@/contexts/TrackerContext', () => ({
  useTracker: () => trackerState,
}));

vi.mock('@/contexts/StudyContext', () => ({
  useStudy: () => ({
    getSubject: vi.fn(() => ({ id: 'subject-1', name: 'Matematica', color: '#6B9BD2' })),
  }),
}));

describe('CompactTimerPlayer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    trackerState.runtime = null;
    trackerState.mode = 'stopwatch';
    trackerState.pomodoroSettings = {
      focusMinutes: 25,
      shortBreakMinutes: 5,
      longBreakMinutes: 15,
      longBreakEvery: 4,
      autoStartBreak: false,
      autoStartFocus: false,
    };
    trackerState.isRunning = false;
    trackerState.displayTimeLabel = '00:00';
    trackerState.secondaryTimeLabel = undefined;
    trackerState.phaseLabel = undefined;
    trackerState.phaseStateLabel = 'Pausado';
  });

  it('nao renderiza quando nao ha sessao ativa', () => {
    render(<CompactTimerPlayer />);
    expect(screen.queryByText(/Sem sessao ativa/i)).not.toBeInTheDocument();
  });

  it('renderiza sessao ativa e permite controles rapidos', () => {
    trackerState.runtime = {
      kind: 'stopwatch',
      subjectId: 'subject-1',
    };
    trackerState.isRunning = true;
    trackerState.displayTimeLabel = '12:34';
    trackerState.phaseStateLabel = 'Rodando';

    render(<CompactTimerPlayer />);

    expect(screen.getByText(/Matematica/i)).toBeInTheDocument();
    expect(screen.getByText(/12:34/i)).toBeInTheDocument();

    fireEvent.click(screen.getByTitle('Pausar'));
    fireEvent.click(screen.getByTitle('Finalizar'));
    fireEvent.click(screen.getByTitle('Expandir'));

    expect(togglePauseResume).toHaveBeenCalledTimes(1);
    expect(finishActive).toHaveBeenCalledWith('completed');
    expect(navigate).toHaveBeenCalledWith('/timer');
  });

  it('mostra seletor de modo quando inativo com showWhenIdle', () => {
    trackerState.runtime = null;
    trackerState.mode = 'stopwatch';

    render(<CompactTimerPlayer showWhenIdle />);

    expect(screen.getByText(/Timer rapido inativo/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Pomodoro/i }));
    expect(setMode).toHaveBeenCalledWith('pomodoro');
  });

  it('deixa ajustes de pomodoro editaveis antes de iniciar sessao', () => {
    trackerState.runtime = null;
    trackerState.mode = 'pomodoro';

    render(<CompactTimerPlayer showWhenIdle />);

    fireEvent.change(screen.getByLabelText(/Foco \(min\)/i), { target: { value: '30' } });

    expect(setPomodoroSettings).toHaveBeenCalled();
  });
});

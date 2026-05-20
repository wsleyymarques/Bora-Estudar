import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { TrackerProvider } from '@/contexts/TrackerContext';
import { ScheduleItemPlayButton } from '@/components/schedule/ScheduleItemPlayButton';
import { CompactTimerPlayer } from '@/components/generic/compact-timer-player';
import { ScheduleEntry } from '@/types/study';

const addSession = vi.fn().mockResolvedValue(undefined);
const getSubject = vi.fn((id: string) => ({
  id,
  name: 'Matematica',
  color: '#6B9BD2',
}));

vi.mock('@/contexts/StudyContext', () => ({
  useStudy: () => ({
    addSession,
    getSubject,
  }),
}));

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(),
  };
});

vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuTrigger: ({ children }: any) => children,
  DropdownMenuContent: ({ children }: any) => <div role="menu">{children}</div>,
  DropdownMenuItem: ({ children, onClick, ...props }: any) => (
    <div role="menuitem" onClick={onClick} {...props}>
      {children}
    </div>
  ),
}));

const entry: ScheduleEntry = {
  id: 'entry-1',
  date: '2026-04-03',
  subjectId: 'subject-1',
  optional: false,
  completed: false,
  order: 0,
  startTime: '08:00',
  plannedMinutes: 60,
};

function renderHarness() {
  return render(
    <TrackerProvider>
      <ScheduleItemPlayButton entry={entry} date={entry.date} />
      <CompactTimerPlayer />
    </TrackerProvider>,
  );
}

describe('Schedule + Timer integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('inicia pelo card e mantem mini player apos remount', () => {
    const first = renderHarness();

    fireEvent.click(screen.getByRole('button', { name: /Escolher modo de inicio/i }));
    fireEvent.click(screen.getByRole('menuitem', { name: /Iniciar cronometro/i }));
    expect(screen.getByText(/Matematica/i)).toBeInTheDocument();

    first.unmount();

    renderHarness();
    expect(screen.getByText(/Matematica/i)).toBeInTheDocument();
  });
});

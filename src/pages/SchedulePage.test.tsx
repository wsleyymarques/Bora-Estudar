import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SchedulePage from '@/pages/SchedulePage';
import { toDateKey } from '@/lib/date-utils';

const today = toDateKey(new Date());

const mockStudy = {
  data: {
    subjects: [
      { id: 's1', name: 'Matematica', color: '#6B9BD2', category: 'Exatas', active: true, optional: false, weeklyGoalHours: 4, monthlyGoalHours: 16, order: 0 },
    ],
    schedule: [
      { id: 'e1', date: today, subjectId: 's1', optional: false, completed: false, order: 0 },
    ],
    dayPlans: [],
    sessions: [],
    sessionPauses: [],
    notes: [],
  },
  loading: false,
  addSubject: vi.fn(),
  updateSubject: vi.fn(),
  deleteSubject: vi.fn(),
  addScheduleEntry: vi.fn().mockResolvedValue(undefined),
  updateScheduleEntry: vi.fn().mockResolvedValue(undefined),
  deleteScheduleEntry: vi.fn().mockResolvedValue(undefined),
  toggleScheduleComplete: vi.fn().mockResolvedValue(undefined),
  upsertScheduleDayPlan: vi.fn().mockResolvedValue(undefined),
  addSession: vi.fn(),
  updateSession: vi.fn(),
  addNote: vi.fn().mockResolvedValue(undefined),
  updateNote: vi.fn(),
  deleteNote: vi.fn(),
  getSubject: vi.fn((id: string) => mockStudy.data.subjects.find(s => s.id === id)),
  getSessionsForDate: vi.fn(() => []),
  getScheduleForDate: vi.fn((date: string) => mockStudy.data.schedule.filter(s => s.date === date)),
  getDayPlanForDate: vi.fn(() => undefined),
  getTotalMinutesForDate: vi.fn(() => 0),
  getTotalMinutesForSubject: vi.fn(() => 0),
  refreshData: vi.fn().mockResolvedValue(undefined),
};

vi.mock('@/contexts/StudyContext', () => ({
  useStudy: () => mockStudy,
}));

vi.mock('@/hooks/useTemplates', () => ({
  useTemplates: () => ({
    templates: [],
    loading: false,
    fetchTemplates: vi.fn(),
    createTemplate: vi.fn(),
    updateTemplateName: vi.fn(),
    deleteTemplate: vi.fn(),
    addTemplateItem: vi.fn(),
    removeTemplateItem: vi.fn(),
    updateTemplateItem: vi.fn(),
    setDayNote: vi.fn(),
    applyTemplate: vi.fn(),
  }),
}));

describe('SchedulePage sync behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('shows same schedule data in weekly and monthly views', () => {
    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(/Matematica/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'Mensal' }));

    expect(screen.getAllByText(/Matematica/i).length).toBeGreaterThan(0);
  });

  it('opens day detail from monthly day click', () => {
    render(
      <MemoryRouter>
        <SchedulePage />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Mensal' }));

    const subjectPreview = screen.getByText(/Matematica/i);
    const dayButton = subjectPreview.closest('button');
    expect(dayButton).toBeTruthy();
    fireEvent.click(dayButton!);

    expect(screen.getByText('Detalhe diario do seu cronograma.')).toBeInTheDocument();
  });
});

import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SchedulePage from '@/pages/SchedulePage';
import { toDateKey } from '@/lib/date-utils';

const today = toDateKey(new Date());

const mockStudy = {
  data: {
    schedules: [
      {
        id: 'sch1',
        userId: 'u1',
        name: 'Cronograma principal',
        status: 'active',
        startDate: today,
        isActive: true,
        createdAt: '',
        updatedAt: '',
      },
    ],
    subjectAreas: [],
    subjectCategories: [],
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
  activeScheduleId: 'sch1',
  activeSchedule: {
    id: 'sch1',
    userId: 'u1',
    name: 'Cronograma principal',
    status: 'active',
    startDate: today,
    isActive: true,
    createdAt: '',
    updatedAt: '',
  },
  createSchedule: vi.fn(),
  updateSchedule: vi.fn(),
  deleteSchedule: vi.fn(),
  archiveSchedule: vi.fn(),
  setActiveSchedule: vi.fn(),
  addSubject: vi.fn(),
  createSubject: vi.fn().mockResolvedValue(undefined),
  updateSubject: vi.fn(),
  deleteSubject: vi.fn(),
  findSubjects: vi.fn(() => mockStudy.data.subjects),
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
  getSessionPauses: vi.fn(() => []),
  getScheduleForDate: vi.fn((date: string) => mockStudy.data.schedule.filter(s => s.date === date)),
  getDayPlanForDate: vi.fn(() => undefined),
  getTotalMinutesForDate: vi.fn(() => 0),
  getTotalPauseMinutesForDate: vi.fn(() => 0),
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
    updateTemplate: vi.fn(),
    updateTemplateName: vi.fn(),
    duplicateTemplate: vi.fn(),
    deleteTemplate: vi.fn(),
    addTemplateItem: vi.fn(),
    addTemplateItemsBatch: vi.fn(),
    removeTemplateItem: vi.fn(),
    removeTemplateItemsBatch: vi.fn(),
    updateTemplateItem: vi.fn(),
    setDayNote: vi.fn(),
    upsertTemplateDayNotesBatch: vi.fn(),
    applyTemplate: vi.fn(),
  }),
}));

vi.mock('@/contexts/TrackerContext', () => ({
  useTracker: () => ({
    getBindingState: vi.fn(() => null),
    startWithBinding: vi.fn(),
    togglePauseResume: vi.fn(),
    isTransitioning: false,
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

    expect(screen.getByText('Painel rapido do seu cronograma.')).toBeInTheDocument();
  });
});

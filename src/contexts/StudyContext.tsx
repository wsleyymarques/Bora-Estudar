
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import {
  Subject,
  ScheduleEntry,
  ScheduleDayPlan,
  StudySession,
  StudySessionPause,
  Note,
  UserData,
  StudySchedule,
  SubjectArea,
  SubjectCategory,
    ScheduleStatus,
    SubjectStatus,
} from '@/types/study';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSessionActualMinutes, getSessionPauseSeconds } from '@/features/tracker/session-metrics';
import { parseDateKey } from '@/lib/date-utils';
import { generateWeeklyOccurrences } from '@/features/schedule/recurrence';

type SessionInput = Omit<StudySession, 'id'> & {
  pauses?: Array<Omit<StudySessionPause, 'id' | 'sessionId' | 'userId'>>;
};

export interface ScheduleCreateInput {
  name: string;
  description?: string;
  color?: string;
  status?: ScheduleStatus;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  viewSettings?: Record<string, unknown>;
}

export interface RecurringScheduleEntryInput {
  subjectId: string;
  startDate: string;
  endDate: string;
  weekdays: number[];
  optional?: boolean;
  startTime?: string;
  plannedMinutes?: number;
  itemNote?: string;
  scheduleId?: string;
  planId?: string;
}

export interface SubjectCreateInput {
  name: string;
  color?: string;
  category?: string;
  optional?: boolean;
  active?: boolean;
  weeklyGoalHours?: number;
  monthlyGoalHours?: number;
  description?: string;
  icon?: string;
  areaId?: string;
  categoryId?: string;
  subcategoryId?: string;
  status?: SubjectStatus;
}

interface SubjectFinderFilters {
  query?: string;
  areaId?: string;
  categoryId?: string;
  subcategoryId?: string;
  includeArchived?: boolean;
  origin?: 'global' | 'user' | 'all';
}

interface StudyContextType {
  data: UserData;
  loading: boolean;
  activeScheduleId?: string;
  activeSchedule?: StudySchedule;
  createSchedule: (schedule: ScheduleCreateInput) => Promise<string | null>;
  updateSchedule: (id: string, schedule: Partial<ScheduleCreateInput>) => Promise<void>;
  deleteSchedule: (id: string) => Promise<void>;
  archiveSchedule: (id: string) => Promise<void>;
  setActiveSchedule: (id: string) => Promise<void>;
  addSubject: (s: Omit<Subject, 'id' | 'order'>) => Promise<void>;
  createSubject: (s: SubjectCreateInput) => Promise<void>;
  updateSubject: (id: string, s: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  findSubjects: (filters?: SubjectFinderFilters) => Subject[];
  addScheduleEntry: (e: Omit<ScheduleEntry, 'id'>) => Promise<void>;
  addRecurringScheduleEntries: (e: RecurringScheduleEntryInput) => Promise<string | null>;
  updateScheduleEntry: (id: string, e: Partial<ScheduleEntry>) => Promise<void>;
  deleteScheduleEntry: (id: string) => Promise<void>;
  toggleScheduleComplete: (id: string) => Promise<void>;
  upsertScheduleDayPlan: (date: string, plan: Partial<Omit<ScheduleDayPlan, 'id' | 'date'>>) => Promise<void>;
  addSession: (s: SessionInput) => Promise<void>;
  updateSession: (id: string, s: Partial<StudySession>) => Promise<void>;
  addNote: (n: Omit<Note, 'id' | 'createdAt'>) => Promise<void>;
  updateNote: (id: string, content: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  getSubject: (id: string) => Subject | undefined;
  getSessionsForDate: (date: string) => StudySession[];
  getSessionPauses: (sessionId: string) => StudySessionPause[];
  getScheduleForDate: (date: string) => ScheduleEntry[];
  getDayPlanForDate: (date: string) => ScheduleDayPlan | undefined;
  getTotalMinutesForDate: (date: string) => number;
  getTotalPauseMinutesForDate: (date: string) => number;
  getTotalMinutesForSubject: (subjectId: string, from?: string, to?: string) => number;
  refreshData: () => Promise<void>;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);
const db = supabase as any;

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function notifySubjectsUpdated() {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new Event(STUDY_SUBJECTS_UPDATED_EVENT));
}

function includesScheduleColumnError(message?: string): boolean {
  if (!message) return false;
  const normalized = message.toLowerCase();
  return normalized.includes('schedule_id') && normalized.includes('does not exist');
}

function mapSchedule(row: any): StudySchedule {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description || undefined,
    color: row.color || undefined,
    status: row.status || 'active',
    startDate: row.start_date,
    endDate: row.end_date || undefined,
    isActive: Boolean(row.is_active),
    viewSettings: row.view_settings || {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapSubjectArea(row: any): SubjectArea {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug || undefined,
    description: row.description || undefined,
    isSystem: Boolean(row.is_system),
    createdBy: row.created_by || undefined,
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

function mapSubjectCategory(row: any): SubjectCategory {
  return {
    id: row.id,
    areaId: row.area_id || undefined,
    parentId: row.parent_id || undefined,
    name: row.name,
    slug: row.slug || undefined,
    description: row.description || undefined,
    isSystem: Boolean(row.is_system),
    createdBy: row.created_by || undefined,
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

function mapSubject(row: any): Subject {
  const origin = (row.origin || (row.user_id ? 'user' : 'global')) as 'global' | 'user';
  const status = (row.status || (row.active ? 'active' : 'archived')) as SubjectStatus;

  return {
    id: row.id,
    name: row.name,
    color: row.color,
    userId: row.user_id || undefined,
    slug: row.slug || undefined,
    description: row.description || undefined,
    icon: row.icon || undefined,
    origin,
    status,
    category: row.category || undefined,
    areaId: row.area_id || undefined,
    categoryId: row.category_id || undefined,
    subcategoryId: row.subcategory_id || undefined,
    active: row.active ?? status !== 'archived',
    optional: row.optional ?? false,
    weeklyGoalHours: Number(row.weekly_goal_hours ?? 0),
    monthlyGoalHours: Number(row.monthly_goal_hours ?? 0),
    order: Number(row.sort_order ?? 0),
  };
}

function mapScheduleEntry(row: any): ScheduleEntry {
  return {
    id: row.id,
    scheduleId: row.schedule_id || undefined,
    planId: row.plan_id || undefined,
    recurrenceRuleId: row.recurrence_rule_id || undefined,
    date: row.date,
    subjectId: row.subject_id,
    optional: Boolean(row.optional),
    completed: Boolean(row.completed),
    order: row.sort_order,
    startTime: row.start_time || undefined,
    plannedMinutes: row.planned_minutes ?? undefined,
    itemNote: row.item_note || undefined,
    templateId: row.template_id || undefined,
    isOverride: row.is_override || false,
    dayNote: row.day_note || undefined,
  };
}

function mapScheduleDayPlan(row: any): ScheduleDayPlan {
  return {
    id: row.id,
    scheduleId: row.schedule_id || undefined,
    planId: row.plan_id || undefined,
    date: row.date,
    dayNote: row.day_note || undefined,
    dayTargetMinutes: row.day_target_minutes ?? undefined,
    templateId: row.template_id || undefined,
    isOverride: row.is_override || false,
  };
}
function mapSession(row: any): StudySession {
  return {
    id: row.id,
    scheduleId: row.schedule_id || undefined,
    planId: row.plan_id || undefined,
    subjectId: row.subject_id,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time || undefined,
    durationMinutes: row.duration_minutes ?? Math.round((row.actual_duration_seconds || 0) / 60),
    note: row.note || undefined,
    sessionMode: row.session_mode || 'manual',
    status: row.status || 'completed',
    source: row.source || 'manual',
    pomodoroPhase: row.pomodoro_phase || undefined,
    pomodoroCycle: row.pomodoro_cycle ?? undefined,
    isFocusSession: row.is_focus_session ?? true,
    startedAt: row.started_at || undefined,
    endedAt: row.ended_at || undefined,
    actualDurationSeconds: row.actual_duration_seconds ?? undefined,
    totalPauseSeconds: row.total_pause_seconds ?? undefined,
    clockDurationSeconds: row.clock_duration_seconds ?? undefined,
    plannedStartTime: row.planned_start_time || undefined,
    plannedMinutes: row.planned_minutes ?? undefined,
    scheduleDate: row.schedule_date || undefined,
    scheduleEntryId: row.schedule_entry_id || undefined,
    metadata: row.metadata || undefined,
  };
}

function mapSessionPause(row: any): StudySessionPause {
  return {
    id: row.id,
    sessionId: row.session_id,
    userId: row.user_id,
    pauseStartedAt: row.pause_started_at,
    pauseEndedAt: row.pause_ended_at || undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

function mapNote(row: any): Note {
  return {
    id: row.id,
    scheduleId: row.schedule_id || undefined,
    planId: row.plan_id || undefined,
    type: row.type,
    referenceDate: row.reference_date,
    content: row.content,
    createdAt: row.created_at?.split('T')[0] || '',
  };
}

async function fetchScopedTable(
  tableName: string,
  activeScheduleId: string | null,
  queryCustomizer?: (query: any) => any,
) {
  let query: any = db.from(tableName as any).select('*');
  if (activeScheduleId) {
    query = query.eq('schedule_id', activeScheduleId);
  }
  if (queryCustomizer) {
    query = queryCustomizer(query);
  }

  const response = await query;
  if (!response.error) return response;

  if (!includesScheduleColumnError(response.error.message)) {
    return response;
  }

  let fallback: any = db.from(tableName as any).select('*');
  if (queryCustomizer) {
    fallback = queryCustomizer(fallback);
  }
  return await fallback;
}

export function StudyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<UserData>({
    schedules: [],
    subjectAreas: [],
    subjectCategories: [],
    subjects: [],
    schedule: [],
    dayPlans: [],
    sessions: [],
    sessionPauses: [],
    notes: [],
  });
  const [loading, setLoading] = useState(true);
  const [activeScheduleId, setActiveScheduleIdState] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setData({
        schedules: [],
        subjectAreas: [],
        subjectCategories: [],
        subjects: [],
        schedule: [],
        dayPlans: [],
        sessions: [],
        sessionPauses: [],
        notes: [],
      });
      setActiveScheduleIdState(null);
      setLoading(false);
      return;
    }

    setLoading(true);

    let schedulesRows: any[] = [];
    const schedulesRes = await db.from('study_schedules').select('*').order('created_at');
    if (schedulesRes.error && !String(schedulesRes.error.message || '').includes('study_schedules')) {
      console.error(schedulesRes.error);
    }
    schedulesRows = schedulesRes.data || [];

    if (schedulesRows.length === 0) {
      const createdScheduleRes = await db
        .from('study_schedules')
        .insert({
          user_id: user.id,
          name: 'Cronograma principal',
          status: 'active',
          start_date: new Date().toISOString().slice(0, 10),
          is_active: true,
        })
        .select('*')
        .single();

      if (createdScheduleRes.data) {
        schedulesRows = [createdScheduleRes.data];
      }
    }

    const mappedSchedules = schedulesRows.map(mapSchedule);
    const activeSchedule = mappedSchedules.find((schedule) => schedule.isActive) || mappedSchedules[0];
    const resolvedActiveScheduleId = activeSchedule?.id || null;
    setActiveScheduleIdState(resolvedActiveScheduleId);

    const [areasRes, categoriesRes, subjectsRes, scheduleRes, dayPlanRes, sessionRes, pauseRes, noteRes] = await Promise.all([
      db.from('subject_areas').select('*').order('name'),
      db.from('subject_categories').select('*').order('name'),
      db.from('subjects').select('*').order('sort_order').order('name'),
      fetchScopedTable('schedule_entries', resolvedActiveScheduleId, (query) => query.order('sort_order')),
      fetchScopedTable('schedule_day_plans', resolvedActiveScheduleId),
      fetchScopedTable('study_sessions', resolvedActiveScheduleId, (query) =>
        query.order('started_at', { ascending: false }).order('created_at', { ascending: false }),
      ),
      db.from('study_session_pauses').select('*').order('pause_started_at', { ascending: false }),
      fetchScopedTable('notes', resolvedActiveScheduleId, (query) => query.order('created_at', { ascending: false })),
    ]);

    if (subjectsRes.error) {
      toast.error('Erro ao carregar materias');
      console.error(subjectsRes.error);
    }

    if (scheduleRes.error) {
      toast.error('Erro ao carregar cronograma');
      console.error(scheduleRes.error);
    }

    setData({
      schedules: mappedSchedules,
      subjectAreas: (areasRes.data || []).map(mapSubjectArea),
      subjectCategories: (categoriesRes.data || []).map(mapSubjectCategory),
      subjects: (subjectsRes.data || []).map(mapSubject),
      schedule: (scheduleRes.data || []).map(mapScheduleEntry),
      dayPlans: (dayPlanRes.data || []).map(mapScheduleDayPlan),
      sessions: (sessionRes.data || []).map(mapSession),
      sessionPauses: (pauseRes.data || []).map(mapSessionPause),
      notes: (noteRes.data || []).map(mapNote),
    });

    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const createSchedule = async (schedule: ScheduleCreateInput) => {
    if (!user) return null;

    const shouldBeActive = schedule.isActive ?? data.schedules.length === 0;

    const { data: inserted, error } = await db
      .from('study_schedules')
      .insert({
        user_id: user.id,
        name: schedule.name,
        description: schedule.description || null,
        color: schedule.color || null,
        status: schedule.status || 'active',
        start_date: schedule.startDate || new Date().toISOString().slice(0, 10),
        end_date: schedule.endDate || null,
        is_active: shouldBeActive,
        view_settings: schedule.viewSettings || {},
      })
      .select('id')
      .single();

    if (error) {
      toast.error('Erro ao criar cronograma');
      console.error(error);
      return null;
    }

    await fetchAll();
    return inserted?.id || null;
  };

  const updateSchedule = async (id: string, schedule: Partial<ScheduleCreateInput>) => {
    const payload: any = {};
    if (schedule.name !== undefined) payload.name = schedule.name;
    if (schedule.description !== undefined) payload.description = schedule.description || null;
    if (schedule.color !== undefined) payload.color = schedule.color || null;
    if (schedule.status !== undefined) payload.status = schedule.status;
    if (schedule.startDate !== undefined) payload.start_date = schedule.startDate;
    if (schedule.endDate !== undefined) payload.end_date = schedule.endDate || null;
    if (schedule.isActive !== undefined) payload.is_active = schedule.isActive;
    if (schedule.viewSettings !== undefined) payload.view_settings = schedule.viewSettings || {};

    const { error } = await db.from('study_schedules').update(payload).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar cronograma');
      console.error(error);
      return;
    }

    await fetchAll();
  };

  const setActiveSchedule = async (id: string) => {
    const { error } = await db
      .from('study_schedules')
      .update({ is_active: true, status: 'active' })
      .eq('id', id)
      .eq('user_id', user?.id);

    if (error) {
      toast.error('Erro ao ativar cronograma');
      console.error(error);
      return;
    }

    await fetchAll();
  };
  const deleteSchedule = async (id: string) => {
    const deletingActive = data.schedules.find((schedule) => schedule.id === id)?.isActive;

    const { error } = await db.from('study_schedules').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir cronograma');
      console.error(error);
      return;
    }

    if (deletingActive) {
      const remaining = data.schedules.find((schedule) => schedule.id !== id && schedule.status !== 'archived');
      if (remaining) {
        await db.from('study_schedules').update({ is_active: true, status: 'active' }).eq('id', remaining.id);
      }
    }

    await fetchAll();
  };

  const archiveSchedule = async (id: string) => {
    const schedule = data.schedules.find((entry) => entry.id === id);
    if (!schedule) return;

    const { error } = await db
      .from('study_schedules')
      .update({ status: 'archived', is_active: false })
      .eq('id', id);

    if (error) {
      toast.error('Erro ao arquivar cronograma');
      console.error(error);
      return;
    }

    if (schedule.isActive) {
      const replacement = data.schedules.find((entry) => entry.id !== id && entry.status !== 'archived');
      if (replacement) {
        await db.from('study_schedules').update({ is_active: true, status: 'active' }).eq('id', replacement.id);
      }
    }

    await fetchAll();
  };

  const createSubject = async (input: SubjectCreateInput) => {
    if (!user) return;

    const weeklyGoalHours = input.weeklyGoalHours ?? 0;
    const monthlyGoalHours = input.monthlyGoalHours ?? 0;
    const status = input.status ?? (input.active === false ? 'archived' : 'active');

    const { error } = await db.from('subjects').insert({
      user_id: user.id,
      name: input.name,
      slug: slugify(input.name),
      description: input.description || null,
      icon: input.icon || null,
      color: input.color || '#5B8C7E',
      category: input.category || null,
      active: input.active ?? true,
      optional: input.optional ?? false,
      weekly_goal_hours: weeklyGoalHours,
      monthly_goal_hours: monthlyGoalHours,
      sort_order: data.subjects.filter((subject) => subject.origin !== 'global').length,
      origin: 'user',
      status,
      area_id: input.areaId || null,
      category_id: input.categoryId || null,
      subcategory_id: input.subcategoryId || null,
    });

    if (error) {
      toast.error('Erro ao salvar materia');
      console.error(error);
      return;
    }

    await fetchAll();
    notifySubjectsUpdated();
  };

  const addSubject = async (s: Omit<Subject, 'id' | 'order'>) => {
    await createSubject({
      name: s.name,
      color: s.color,
      category: s.category,
      optional: s.optional,
      active: s.active,
      weeklyGoalHours: s.weeklyGoalHours,
      monthlyGoalHours: s.monthlyGoalHours,
      description: s.description,
      icon: s.icon,
      areaId: s.areaId,
      categoryId: s.categoryId,
      subcategoryId: s.subcategoryId,
      status: s.status,
    });
  };

  const updateSubject = async (id: string, s: Partial<Subject>) => {
    const subject = data.subjects.find((entry) => entry.id === id);
    if (!subject) return;

    if (subject.origin === 'global') {
      toast.error('Materia global nao pode ser editada por usuario');
      return;
    }

    const update: any = {};
    if (s.name !== undefined) {
      update.name = s.name;
      update.slug = slugify(s.name);
    }
    if (s.color !== undefined) update.color = s.color;
    if (s.category !== undefined) update.category = s.category || null;
    if (s.active !== undefined) update.active = s.active;
    if (s.optional !== undefined) update.optional = s.optional;
    if (s.weeklyGoalHours !== undefined) update.weekly_goal_hours = s.weeklyGoalHours;
    if (s.monthlyGoalHours !== undefined) update.monthly_goal_hours = s.monthlyGoalHours;
    if (s.order !== undefined) update.sort_order = s.order;
    if (s.description !== undefined) update.description = s.description || null;
    if (s.icon !== undefined) update.icon = s.icon || null;
    if (s.areaId !== undefined) update.area_id = s.areaId || null;
    if (s.categoryId !== undefined) update.category_id = s.categoryId || null;
    if (s.subcategoryId !== undefined) update.subcategory_id = s.subcategoryId || null;
    if (s.status !== undefined) update.status = s.status;

    const { error } = await db.from('subjects').update(update).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar materia');
      console.error(error);
      return;
    }

    await fetchAll();
    notifySubjectsUpdated();
  };

  const deleteSubject = async (id: string) => {
    const subject = data.subjects.find((entry) => entry.id === id);
    if (!subject) return;

    if (subject.origin === 'global') {
      toast.error('Materia global nao pode ser excluida');
      return;
    }

    const { error } = await db.from('subjects').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir materia');
      console.error(error);
      return;
    }
    await fetchAll();
    notifySubjectsUpdated();
  };

  const findSubjects = useCallback(
    (filters?: SubjectFinderFilters): Subject[] => {
      const query = (filters?.query || '').trim().toLowerCase();
      const includeArchived = Boolean(filters?.includeArchived);
      const origin = filters?.origin || 'all';

      return data.subjects
        .filter((subject) => {
          if (!includeArchived && (subject.status === 'archived' || !subject.active)) {
            return false;
          }

          if (origin !== 'all' && subject.origin !== origin) {
            return false;
          }

          if (filters?.areaId && subject.areaId !== filters.areaId) {
            return false;
          }

          if (filters?.categoryId && subject.categoryId !== filters.categoryId) {
            return false;
          }

          if (filters?.subcategoryId && subject.subcategoryId !== filters.subcategoryId) {
            return false;
          }

          if (!query) return true;

          const haystacks = [
            subject.name,
            subject.category,
            subject.description,
            data.subjectAreas.find((area) => area.id === subject.areaId)?.name,
            data.subjectCategories.find((category) => category.id === subject.categoryId)?.name,
            data.subjectCategories.find((category) => category.id === subject.subcategoryId)?.name,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();

          return haystacks.includes(query);
        })
        .sort((left, right) => {
          const leftGlobalScore = left.origin === 'global' ? 0 : 1;
          const rightGlobalScore = right.origin === 'global' ? 0 : 1;
          if (leftGlobalScore !== rightGlobalScore) {
            return leftGlobalScore - rightGlobalScore;
          }
          return left.name.localeCompare(right.name, 'pt-BR');
        });
    },
    [data.subjects, data.subjectAreas, data.subjectCategories],
  );
  const addScheduleEntry = async (e: Omit<ScheduleEntry, 'id'>) => {
    if (!user) return;

    const scheduleId = e.scheduleId || activeScheduleId;
    if (!scheduleId) {
      toast.error('Selecione um cronograma ativo');
      return;
    }

    const { error } = await db.from('schedule_entries').insert({
      user_id: user.id,
      schedule_id: scheduleId,
      plan_id: e.planId || null,
      subject_id: e.subjectId,
      date: e.date,
      optional: e.optional,
      completed: e.completed,
      sort_order: e.order,
      start_time: e.startTime || null,
      planned_minutes: e.plannedMinutes ?? null,
      item_note: e.itemNote || null,
      template_id: e.templateId || null,
      recurrence_rule_id: e.recurrenceRuleId || null,
      is_override: e.isOverride || false,
      day_note: e.dayNote || null,
    });

    if (error) {
      toast.error('Erro ao adicionar ao cronograma');
      console.error(error);
      return;
    }

    await fetchAll();
  };

  const addRecurringScheduleEntries = async (input: RecurringScheduleEntryInput) => {
    if (!user) return null;

    const scheduleId = input.scheduleId || activeScheduleId;
    if (!scheduleId) {
      toast.error('Selecione um cronograma ativo');
      return null;
    }

    const validWeekdays = Array.from(new Set((input.weekdays || []).map(Number).filter((day) => Number.isInteger(day) && day >= 0 && day <= 6))).sort((a, b) => a - b);
    if (validWeekdays.length === 0) {
      toast.error('Selecione ao menos um dia da semana');
      return null;
    }

    const startDate = parseDateKey(input.startDate);
    const endDate = parseDateKey(input.endDate);
    const dates = generateWeeklyOccurrences({
      startDate,
      endDate,
      weekdays: validWeekdays,
    });

    if (dates.length === 0) {
      toast.error('Nenhuma data encontrada para a recorrencia');
      return null;
    }

    const { data: rule, error: ruleError } = await db
      .from('schedule_recurrence_rules')
      .insert({
        user_id: user.id,
        schedule_id: scheduleId,
        plan_id: input.planId || null,
        subject_id: input.subjectId,
        start_date: input.startDate,
        end_date: input.endDate,
        weekdays: validWeekdays,
        optional: input.optional ?? false,
        start_time: input.startTime || null,
        planned_minutes: input.plannedMinutes ?? null,
        item_note: input.itemNote || null,
        active: true,
      })
      .select('id')
      .single();

    if (ruleError || !rule) {
      toast.error('Erro ao criar recorrencia');
      console.error(ruleError);
      return null;
    }

    const existingCounts = new Map<string, number>();
    for (const entry of data.schedule) {
      const current = existingCounts.get(entry.date) ?? 0;
      existingCounts.set(entry.date, current + 1);
    }

    const generatedCounts = new Map<string, number>();
    const rows = dates.map((date) => {
      const currentCount = existingCounts.get(date) ?? 0;
      const generatedCount = generatedCounts.get(date) ?? 0;
      generatedCounts.set(date, generatedCount + 1);

      return {
        user_id: user.id,
        schedule_id: scheduleId,
        plan_id: input.planId || null,
        subject_id: input.subjectId,
        date,
        optional: input.optional ?? false,
        completed: false,
        sort_order: currentCount + generatedCount,
        start_time: input.startTime || null,
        planned_minutes: input.plannedMinutes ?? null,
        item_note: input.itemNote || null,
        template_id: null,
        recurrence_rule_id: rule.id,
        is_override: false,
        day_note: null,
      };
    });

    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      const { error } = await db.from('schedule_entries').insert(batch);
      if (error) {
        toast.error('Erro ao gerar recorrencia no cronograma');
        console.error(error);
        return null;
      }
    }

    await fetchAll();
    return rule.id as string;
  };

  const updateScheduleEntry = async (id: string, e: Partial<ScheduleEntry>) => {
    const update: any = {};
    if (e.date !== undefined) update.date = e.date;
    if (e.subjectId !== undefined) update.subject_id = e.subjectId;
    if (e.optional !== undefined) update.optional = e.optional;
    if (e.completed !== undefined) update.completed = e.completed;
    if (e.order !== undefined) update.sort_order = e.order;
    if (e.startTime !== undefined) update.start_time = e.startTime || null;
    if (e.plannedMinutes !== undefined) update.planned_minutes = e.plannedMinutes;
    if (e.itemNote !== undefined) update.item_note = e.itemNote || null;
    if (e.templateId !== undefined) update.template_id = e.templateId || null;
    if (e.isOverride !== undefined) update.is_override = e.isOverride;
    if (e.dayNote !== undefined) update.day_note = e.dayNote || null;
    if (e.scheduleId !== undefined) update.schedule_id = e.scheduleId || null;

    const { error } = await db.from('schedule_entries').update(update).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar cronograma');
      console.error(error);
      return;
    }

    await fetchAll();
  };

  const deleteScheduleEntry = async (id: string) => {
    const { error } = await db.from('schedule_entries').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir item do cronograma');
      console.error(error);
      return;
    }
    await fetchAll();
  };

  const toggleScheduleComplete = async (id: string) => {
    const entry = data.schedule.find((item) => item.id === id);
    if (!entry) return;
    await updateScheduleEntry(id, { completed: !entry.completed });
  };

  const upsertScheduleDayPlan = async (date: string, plan: Partial<Omit<ScheduleDayPlan, 'id' | 'date'>>) => {
    if (!user) return;

    const scheduleId = plan.scheduleId || activeScheduleId;
    if (!scheduleId) {
      toast.error('Selecione um cronograma ativo');
      return;
    }

    const payload: any = {
      user_id: user.id,
      schedule_id: scheduleId,
      date,
      plan_id: plan.planId || null,
    };

    if (plan.dayNote !== undefined) payload.day_note = plan.dayNote || null;
    if (plan.dayTargetMinutes !== undefined) payload.day_target_minutes = plan.dayTargetMinutes;
    if (plan.templateId !== undefined) payload.template_id = plan.templateId || null;
    if (plan.isOverride !== undefined) payload.is_override = plan.isOverride;

    let response = await db.from('schedule_day_plans').upsert(payload, { onConflict: 'user_id,schedule_id,date' });

    if (response.error && String(response.error.message || '').toLowerCase().includes('on conflict')) {
      response = await db.from('schedule_day_plans').upsert(payload, { onConflict: 'user_id,date' });
    }

    if (response.error) {
      toast.error('Erro ao atualizar plano do dia');
      console.error(response.error);
      return;
    }

    await fetchAll();
  };

  const addSession = async (s: SessionInput) => {
    if (!user) return;

    const scheduleId = s.scheduleId || activeScheduleId;

    const actualDurationSeconds = s.actualDurationSeconds ?? Math.max(0, Math.round((s.durationMinutes || 0) * 60));
    const totalPauseSeconds = s.totalPauseSeconds ?? 0;
    const clockDurationSeconds = s.clockDurationSeconds ?? actualDurationSeconds + totalPauseSeconds;
    const durationMinutes = s.durationMinutes ?? Math.round(actualDurationSeconds / 60);

    const { data: inserted, error } = await db
      .from('study_sessions')
      .insert({
        user_id: user.id,
        schedule_id: scheduleId || null,
        plan_id: s.planId || null,
        subject_id: s.subjectId,
        date: s.date,
        start_time: s.startTime,
        end_time: s.endTime || null,
        duration_minutes: durationMinutes,
        note: s.note || null,
        session_mode: s.sessionMode || 'manual',
        status: s.status || 'completed',
        source: s.source || 'tracker',
        pomodoro_phase: s.pomodoroPhase || null,
        pomodoro_cycle: s.pomodoroCycle ?? null,
        is_focus_session: s.isFocusSession ?? true,
        started_at: s.startedAt || null,
        ended_at: s.endedAt || null,
        actual_duration_seconds: actualDurationSeconds,
        total_pause_seconds: totalPauseSeconds,
        clock_duration_seconds: clockDurationSeconds,
        planned_start_time: s.plannedStartTime || null,
        planned_minutes: s.plannedMinutes ?? null,
        schedule_date: s.scheduleDate || null,
        schedule_entry_id: s.scheduleEntryId || null,
        metadata: s.metadata || {},
      })
      .select('id')
      .single();

    if (error || !inserted) {
      toast.error('Erro ao registrar sessao');
      console.error(error);
      return;
    }

    if (s.pauses && s.pauses.length > 0) {
      const pausesPayload = s.pauses.map((pause) => ({
        session_id: inserted.id,
        user_id: user.id,
        pause_started_at: pause.pauseStartedAt,
        pause_ended_at: pause.pauseEndedAt || null,
        duration_seconds: pause.durationSeconds ?? null,
      }));

      const { error: pauseError } = await db.from('study_session_pauses').insert(pausesPayload);
      if (pauseError) {
        toast.error('Sessao salva, mas pausas falharam');
        console.error(pauseError);
      }
    }

    await fetchAll();
  };

  const updateSession = async (id: string, s: Partial<StudySession>) => {
    const update: any = {};
    if (s.subjectId !== undefined) update.subject_id = s.subjectId;
    if (s.scheduleId !== undefined) update.schedule_id = s.scheduleId || null;
    if (s.date !== undefined) update.date = s.date;
    if (s.startTime !== undefined) update.start_time = s.startTime;
    if (s.endTime !== undefined) update.end_time = s.endTime;
    if (s.durationMinutes !== undefined) update.duration_minutes = s.durationMinutes;
    if (s.note !== undefined) update.note = s.note;
    if (s.sessionMode !== undefined) update.session_mode = s.sessionMode;
    if (s.status !== undefined) update.status = s.status;
    if (s.source !== undefined) update.source = s.source;
    if (s.pomodoroPhase !== undefined) update.pomodoro_phase = s.pomodoroPhase;
    if (s.pomodoroCycle !== undefined) update.pomodoro_cycle = s.pomodoroCycle;
    if (s.isFocusSession !== undefined) update.is_focus_session = s.isFocusSession;
    if (s.startedAt !== undefined) update.started_at = s.startedAt;
    if (s.endedAt !== undefined) update.ended_at = s.endedAt;
    if (s.actualDurationSeconds !== undefined) update.actual_duration_seconds = s.actualDurationSeconds;
    if (s.totalPauseSeconds !== undefined) update.total_pause_seconds = s.totalPauseSeconds;
    if (s.clockDurationSeconds !== undefined) update.clock_duration_seconds = s.clockDurationSeconds;
    if (s.plannedStartTime !== undefined) update.planned_start_time = s.plannedStartTime;
    if (s.plannedMinutes !== undefined) update.planned_minutes = s.plannedMinutes;
    if (s.scheduleDate !== undefined) update.schedule_date = s.scheduleDate;
    if (s.scheduleEntryId !== undefined) update.schedule_entry_id = s.scheduleEntryId;
    if (s.metadata !== undefined) update.metadata = s.metadata || {};

    const { error } = await db.from('study_sessions').update(update).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar sessao');
      console.error(error);
      return;
    }

    await fetchAll();
  };
  const addNote = async (n: Omit<Note, 'id' | 'createdAt'>) => {
    if (!user) return;

    const scheduleId = n.scheduleId || activeScheduleId;

    const { error } = await db.from('notes').insert({
      user_id: user.id,
      schedule_id: scheduleId || null,
      plan_id: n.planId || null,
      type: n.type,
      reference_date: n.referenceDate,
      content: n.content,
    });

    if (error) {
      toast.error('Erro ao salvar nota');
      console.error(error);
      return;
    }

    await fetchAll();
  };

  const updateNote = async (id: string, content: string) => {
    const { error } = await db.from('notes').update({ content }).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar nota');
      console.error(error);
      return;
    }
    await fetchAll();
  };

  const deleteNote = async (id: string) => {
    const { error } = await db.from('notes').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir nota');
      console.error(error);
      return;
    }
    await fetchAll();
  };

  const getSubject = (id: string) => data.subjects.find((subject) => subject.id === id);

  const getSessionsForDate = (date: string) =>
    data.sessions
      .filter((session) => session.date === date)
      .sort((left, right) => {
        const leftStart = left.startedAt || `${left.date}T${left.startTime || '00:00'}:00`;
        const rightStart = right.startedAt || `${right.date}T${right.startTime || '00:00'}:00`;
        return leftStart.localeCompare(rightStart);
      });

  const getSessionPauses = (sessionId: string) =>
    data.sessionPauses
      .filter((pause) => pause.sessionId === sessionId)
      .sort((left, right) => left.pauseStartedAt.localeCompare(right.pauseStartedAt));

  const getScheduleForDate = (date: string) =>
    data.schedule
      .filter((entry) => entry.date === date)
      .sort((left, right) => {
        if (left.startTime && right.startTime) {
          if (left.startTime < right.startTime) return -1;
          if (left.startTime > right.startTime) return 1;
        } else if (left.startTime && !right.startTime) {
          return -1;
        } else if (!left.startTime && right.startTime) {
          return 1;
        }
        return left.order - right.order;
      });

  const getDayPlanForDate = (date: string) => data.dayPlans.find((plan) => plan.date === date);

  const getTotalMinutesForDate = (date: string) =>
    data.sessions
      .filter((session) => session.date === date)
      .reduce((accumulator, session) => accumulator + getSessionActualMinutes(session), 0);

  const getTotalPauseMinutesForDate = (date: string) => {
    const seconds = data.sessions
      .filter((session) => session.date === date)
      .reduce((accumulator, session) => accumulator + getSessionPauseSeconds(session, data.sessionPauses), 0);
    return Math.round(seconds / 60);
  };

  const getTotalMinutesForSubject = (subjectId: string, from?: string, to?: string) =>
    data.sessions
      .filter((session) => session.subjectId === subjectId && (!from || session.date >= from) && (!to || session.date <= to))
      .reduce((accumulator, session) => accumulator + getSessionActualMinutes(session), 0);

  const activeSchedule = useMemo(
    () => data.schedules.find((schedule) => schedule.id === activeScheduleId),
    [data.schedules, activeScheduleId],
  );

  return (
    <StudyContext.Provider
      value={{
        data,
        loading,
        activeScheduleId: activeScheduleId || undefined,
        activeSchedule,
        createSchedule,
        updateSchedule,
        deleteSchedule,
        archiveSchedule,
        setActiveSchedule,
        addSubject,
        createSubject,
        updateSubject,
        deleteSubject,
        findSubjects,
        addScheduleEntry,
        addRecurringScheduleEntries,
        updateScheduleEntry,
        deleteScheduleEntry,
        toggleScheduleComplete,
        upsertScheduleDayPlan,
        addSession,
        updateSession,
        addNote,
        updateNote,
        deleteNote,
        getSubject,
        getSessionsForDate,
        getSessionPauses,
        getScheduleForDate,
        getDayPlanForDate,
        getTotalMinutesForDate,
        getTotalPauseMinutesForDate,
        getTotalMinutesForSubject,
        refreshData: fetchAll,
      }}
    >
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy() {
  const context = useContext(StudyContext);
  if (!context) throw new Error('useStudy must be used within StudyProvider');
  return context;
}



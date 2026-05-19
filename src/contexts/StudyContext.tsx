import React, { createContext, useCallback, useContext, useEffect, ReactNode, useMemo, useState } from 'react';
import {
  Note,
  ScheduleDayPlan,
  ScheduleEntry,
  StudyPlan,
  StudySession,
  Subject,
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
  pauses?: Array<{ pauseStartedAt: string; pauseEndedAt?: string; durationSeconds?: number }>;
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
  planId?: string;
  description?: string;
  icon?: string;
  areaId?: string;
  categoryId?: string;
  subcategoryId?: string;
  origin?: 'global' | 'user' | 'plan';
  status?: 'active' | 'inactive' | 'archived';
}

type FindSubjectsFilters = {
  query?: string;
  areaId?: string;
  categoryId?: string;
  subcategoryId?: string;
  planId?: string;
  origin?: 'all' | 'global' | 'user' | 'plan';
  activeOnly?: boolean;
};

interface StudyContextType {
  data: UserData;
  loading: boolean;
  activeStudyPlan?: StudyPlan;
  addSubject: (s: Omit<Subject, 'id' | 'order'>) => Promise<void>;
  createSubject: (s: SubjectCreateInput) => Promise<void>;
  updateSubject: (id: string, s: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  findSubjects: (filters?: FindSubjectsFilters) => Subject[];
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
  getScheduleForDate: (date: string) => ScheduleEntry[];
  getDayPlanForDate: (date: string) => ScheduleDayPlan | undefined;
  getTotalMinutesForDate: (date: string) => number;
  getTotalMinutesForSubject: (subjectId: string, from?: string, to?: string) => number;
  refreshData: () => Promise<void>;
}

const EMPTY_DATA: UserData = {
  studyPlans: [],
  activeStudyPlanId: undefined,
  subjectAreas: [],
  subjectCategories: [],
  subjectSubcategories: [],
  subjects: [],
  schedule: [],
  dayPlans: [],
  sessions: [],
  sessionPauses: [],
  notes: [],
};

const StudyContext = createContext<StudyContextType | undefined>(undefined);
const db = supabase as any;

const hasMissingColumnError = (error: any) => String(error?.message || '').toLowerCase().includes('column');

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
    userId: row.user_id || undefined,
    title: row.title || row.name || row.exam_name || 'Plano de Estudos',
    name: row.name || row.title || undefined,
    examName: row.exam_name || undefined,
    board: row.board || undefined,
    role: row.role || undefined,
    description: row.description || undefined,
    imageUrl: row.image_url || undefined,
    reviewIntervalDays: row.review_interval_days ?? undefined,
    createdAt: row.created_at || undefined,
    updatedAt: row.updated_at || undefined,
  };
}

function mapSubjectArea(row: any): SubjectArea {
  return { id: row.id, name: row.name, description: row.description || undefined, icon: row.icon || undefined, sortOrder: row.sort_order ?? 0 };
}

function mapSubjectCategory(row: any): SubjectCategory {
  return { id: row.id, areaId: row.area_id || undefined, name: row.name, description: row.description || undefined, sortOrder: row.sort_order ?? 0 };
}

function mapSubjectSubcategory(row: any): SubjectSubcategory {
  return { id: row.id, categoryId: row.category_id || undefined, name: row.name, description: row.description || undefined, sortOrder: row.sort_order ?? 0 };
}

function mapSubject(row: any): Subject {
  return {
    id: row.id,
    name: row.name,
    color: row.color || '#5B8C7E',
    userId: row.user_id || undefined,
    planId: row.plan_id || undefined,
    category: row.category || undefined,
    description: row.description || undefined,
    icon: row.icon || undefined,
    areaId: row.area_id || undefined,
    categoryId: row.category_id || undefined,
    subcategoryId: row.subcategory_id || undefined,
    origin: row.origin || (row.plan_id ? 'plan' : row.user_id ? 'user' : 'global'),
    status: row.status || (row.active === false ? 'inactive' : 'active'),
    active: row.active ?? row.status !== 'inactive',
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
    durationMinutes: row.duration_minutes ?? 0,
    note: row.note || undefined,
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

export function StudyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<UserData>(EMPTY_DATA);
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setData(EMPTY_DATA);
      setLoading(false);
      return;
    }

    setLoading(true);

    const [plansRes, areasRes, categoriesRes, subcategoriesRes, subjectsRes, scheduleRes, dayPlanRes, sessionRes, noteRes] = await Promise.all([
      db.from('study_plans').select('*').order('created_at', { ascending: false }),
      db.from('subject_areas').select('*').order('sort_order').order('name'),
      db.from('subject_categories').select('*').order('sort_order').order('name'),
      db.from('subject_subcategories').select('*').order('sort_order').order('name'),
      db.from('subjects').select('*').order('sort_order').order('name'),
      db.from('schedule_entries').select('*').order('sort_order'),
      db.from('schedule_day_plans').select('*'),
      db.from('study_sessions').select('*').order('created_at', { ascending: false }),
      db.from('notes').select('*').order('created_at', { ascending: false }),
    ]);

    if (subjectsRes.error) {
      toast.error('Erro ao carregar matérias');
      console.error(subjectsRes.error);
    }

    if (scheduleRes.error) {
      toast.error('Erro ao carregar cronograma');
      console.error(scheduleRes.error);
    }

    const studyPlans = plansRes.error ? [] : (plansRes.data || []).map(mapStudyPlan);

    setData({
      studyPlans,
      activeStudyPlanId: studyPlans[0]?.id,
      subjectAreas: areasRes.error ? [] : (areasRes.data || []).map(mapSubjectArea),
      subjectCategories: categoriesRes.error ? [] : (categoriesRes.data || []).map(mapSubjectCategory),
      subjectSubcategories: subcategoriesRes.error ? [] : (subcategoriesRes.data || []).map(mapSubjectSubcategory),
      subjects: subjectsRes.error ? [] : (subjectsRes.data || []).map(mapSubject),
      schedule: scheduleRes.error ? [] : (scheduleRes.data || []).map(mapScheduleEntry),
      dayPlans: dayPlanRes.error ? [] : (dayPlanRes.data || []).map(mapScheduleDayPlan),
      sessions: sessionRes.error ? [] : (sessionRes.data || []).map(mapSession),
      sessionPauses: [],
      notes: noteRes.error ? [] : (noteRes.data || []).map(mapNote),
    });

    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const activeStudyPlan = useMemo(
    () => data.studyPlans.find((plan) => plan.id === data.activeStudyPlanId) || data.studyPlans[0],
    [data.activeStudyPlanId, data.studyPlans],
  );

  const findSubjects = useCallback(
    (filters: FindSubjectsFilters = {}) => {
      const normalizedQuery = (filters.query || '').trim().toLowerCase();
      return data.subjects.filter((subject) => {
        if (filters.activeOnly && !subject.active) return false;
        if (filters.planId && subject.planId !== filters.planId) return false;
        if (filters.areaId && subject.areaId !== filters.areaId) return false;
        if (filters.categoryId && subject.categoryId !== filters.categoryId) return false;
        if (filters.subcategoryId && subject.subcategoryId !== filters.subcategoryId) return false;
        if (filters.origin && filters.origin !== 'all') {
          if (filters.origin === 'user' && subject.origin === 'global') return false;
          if (filters.origin !== 'user' && subject.origin !== filters.origin) return false;
        }
        if (!normalizedQuery) return true;
        return [subject.name, subject.category, subject.description].some((value) =>
          String(value || '').toLowerCase().includes(normalizedQuery),
        );
      });
    },
    [data.subjects],
  );

  const createSubject = async (input: SubjectCreateInput) => {
    if (!user) return;

    const sortOrder = input.planId
      ? data.subjects.filter((subject) => subject.planId === input.planId).length
      : data.subjects.filter((subject) => subject.origin !== 'global' && !subject.planId).length;

    const extendedPayload: any = {
      user_id: user.id,
      plan_id: input.planId || null,
      name: input.name,
      color: input.color || '#5B8C7E',
      category: input.category || null,
      description: input.description || null,
      icon: input.icon || null,
      area_id: input.areaId || null,
      category_id: input.categoryId || null,
      subcategory_id: input.subcategoryId || null,
      origin: input.origin || (input.planId ? 'plan' : 'user'),
      status: input.status || 'active',
      active: input.active ?? true,
      optional: input.optional ?? false,
      weekly_goal_hours: input.weeklyGoalHours ?? 4,
      monthly_goal_hours: input.monthlyGoalHours ?? 16,
      sort_order: sortOrder,
    };

    let response = await db.from('subjects').insert(extendedPayload);

    if (response.error && hasMissingColumnError(response.error)) {
      const legacyPayload = {
        user_id: user.id,
        name: input.name,
        color: input.color || '#5B8C7E',
        category: input.category || null,
        active: input.active ?? true,
        optional: input.optional ?? false,
        weekly_goal_hours: input.weeklyGoalHours ?? 4,
        monthly_goal_hours: input.monthlyGoalHours ?? 16,
        sort_order: sortOrder,
      };
      response = await db.from('subjects').insert(legacyPayload);
    }

    if (response.error) {
      toast.error('Erro ao salvar matéria');
      console.error(response.error);
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
      planId: s.planId,
      description: s.description,
      icon: s.icon,
      areaId: s.areaId,
      categoryId: s.categoryId,
      subcategoryId: s.subcategoryId,
      origin: s.origin,
      status: s.status,
    });
  };

  const updateSubject = async (id: string, s: Partial<Subject>) => {
    const update: any = {};
    if (s.name !== undefined) update.name = s.name;
    if (s.color !== undefined) update.color = s.color;
    if (s.category !== undefined) update.category = s.category || null;
    if (s.description !== undefined) update.description = s.description || null;
    if (s.icon !== undefined) update.icon = s.icon || null;
    if (s.areaId !== undefined) update.area_id = s.areaId || null;
    if (s.categoryId !== undefined) update.category_id = s.categoryId || null;
    if (s.subcategoryId !== undefined) update.subcategory_id = s.subcategoryId || null;
    if (s.planId !== undefined) update.plan_id = s.planId || null;
    if (s.origin !== undefined) update.origin = s.origin;
    if (s.status !== undefined) update.status = s.status;
    if (s.active !== undefined) update.active = s.active;
    if (s.optional !== undefined) update.optional = s.optional;
    if (s.weeklyGoalHours !== undefined) update.weekly_goal_hours = s.weeklyGoalHours;
    if (s.monthlyGoalHours !== undefined) update.monthly_goal_hours = s.monthlyGoalHours;
    if (s.order !== undefined) update.sort_order = s.order;

    let response = await db.from('subjects').update(update).eq('id', id);

    if (response.error && hasMissingColumnError(response.error)) {
      const legacyUpdate: any = {};
      ['name', 'color', 'category', 'active', 'optional', 'weekly_goal_hours', 'monthly_goal_hours', 'sort_order'].forEach((key) => {
        if (update[key] !== undefined) legacyUpdate[key] = update[key];
      });
      response = await db.from('subjects').update(legacyUpdate).eq('id', id);
    }

    if (response.error) {
      toast.error('Erro ao atualizar matéria');
      console.error(response.error);
      return;
    }

    await fetchAll();
    notifySubjectsUpdated();
  };

  const deleteSubject = async (id: string) => {
    const { error } = await db.from('subjects').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir matéria');
      console.error(error);
      return;
    }
    await fetchAll();
    notifySubjectsUpdated();
  };

  const addScheduleEntry = async (e: Omit<ScheduleEntry, 'id'>) => {
    if (!user) return;

    const payload: any = {
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
    };

    let response = await db.from('schedule_entries').insert(payload);
    if (response.error && hasMissingColumnError(response.error)) {
      const { plan_id, ...legacyPayload } = payload;
      response = await db.from('schedule_entries').insert(legacyPayload);
    }

    if (response.error) {
      toast.error('Erro ao adicionar ao cronograma');
      console.error(response.error);
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
    if (e.planId !== undefined) update.plan_id = e.planId || null;
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

    let response = await db.from('schedule_entries').update(update).eq('id', id);
    if (response.error && hasMissingColumnError(response.error)) {
      delete update.plan_id;
      response = await db.from('schedule_entries').update(update).eq('id', id);
    }

    if (response.error) {
      toast.error('Erro ao atualizar cronograma');
      console.error(response.error);
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

    const existing = data.dayPlans.find((dp) => dp.date === date && (plan.planId ? dp.planId === plan.planId : true));

    const payload: any = {
      user_id: user.id,
      plan_id: plan.planId || null,
      date,
    };

    if (plan.dayNote !== undefined) payload.day_note = plan.dayNote || null;
    if (plan.dayTargetMinutes !== undefined) payload.day_target_minutes = plan.dayTargetMinutes;
    if (plan.templateId !== undefined) payload.template_id = plan.templateId || null;
    if (plan.isOverride !== undefined) payload.is_override = plan.isOverride;

    let response = existing
      ? await db.from('schedule_day_plans').update(payload).eq('id', existing.id)
      : await db.from('schedule_day_plans').insert(payload);

    if (response.error && hasMissingColumnError(response.error)) {
      delete payload.plan_id;
      response = existing
        ? await db.from('schedule_day_plans').update(payload).eq('id', existing.id)
        : await db.from('schedule_day_plans').insert(payload);
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

    const payload: any = {
      user_id: user.id,
      plan_id: s.planId || null,
      subject_id: s.subjectId,
      date: s.date,
      start_time: s.startTime,
      end_time: s.endTime || null,
      duration_minutes: s.durationMinutes ?? 0,
      note: s.note || null,
    };

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

    if (response.error) {
      toast.error('Erro ao registrar sessão');
      console.error(response.error);
      return;
    }

    await fetchAll();
  };

  const updateSession = async (id: string, s: Partial<StudySession>) => {
    const update: any = {};
    if (s.planId !== undefined) update.plan_id = s.planId || null;
    if (s.subjectId !== undefined) update.subject_id = s.subjectId;
    if (s.date !== undefined) update.date = s.date;
    if (s.startTime !== undefined) update.start_time = s.startTime;
    if (s.endTime !== undefined) update.end_time = s.endTime;
    if (s.durationMinutes !== undefined) update.duration_minutes = s.durationMinutes;
    if (s.note !== undefined) update.note = s.note;

    let response = await db.from('study_sessions').update(update).eq('id', id);
    if (response.error && hasMissingColumnError(response.error)) {
      delete update.plan_id;
      response = await db.from('study_sessions').update(update).eq('id', id);
    }

    if (response.error) {
      toast.error('Erro ao atualizar sessão');
      console.error(response.error);
      return;
    }

    await fetchAll();
  };

  const addNote = async (n: Omit<Note, 'id' | 'createdAt'>) => {
    if (!user) return;

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
      .sort((left, right) => (left.startTime || '').localeCompare(right.startTime || ''));

  const getScheduleForDate = (date: string) =>
    data.schedule
      .filter((entry) => entry.date === date)
      .sort((left, right) => {
        if (left.startTime && right.startTime) return left.startTime.localeCompare(right.startTime);
        if (left.startTime && !right.startTime) return -1;
        if (!left.startTime && right.startTime) return 1;
        return left.order - right.order;
      });

  const getDayPlanForDate = (date: string) => data.dayPlans.find((plan) => plan.date === date);

  const getTotalMinutesForDate = (date: string) =>
    data.sessions
      .filter((session) => session.date === date)
      .reduce((acc, session) => acc + getSessionActualMinutes(session), 0);

  const getTotalMinutesForSubject = (subjectId: string, from?: string, to?: string) =>
    data.sessions
      .filter((session) => session.subjectId === subjectId && (!from || session.date >= from) && (!to || session.date <= to))
      .reduce((acc, session) => acc + getSessionActualMinutes(session), 0);

  return (
    <StudyContext.Provider
      value={{
        data,
        loading,
        activeStudyPlan,
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
        getScheduleForDate,
        getDayPlanForDate,
        getTotalMinutesForDate,
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

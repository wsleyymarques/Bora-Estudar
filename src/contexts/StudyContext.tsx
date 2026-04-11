
import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import {
  Subject,
  ScheduleEntry,
  ScheduleDayPlan,
  StudySession,
  Note,
  UserData,
} from '@/types/study';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSessionActualMinutes } from '@/features/tracker/session-metrics';

type SessionInput = Omit<StudySession, 'id'> & {
  pauses?: Array<{ pauseStartedAt: string; pauseEndedAt?: string; durationSeconds?: number }>;
};

export interface SubjectCreateInput {
  name: string;
  color?: string;
  category?: string;
  optional?: boolean;
  active?: boolean;
  weeklyGoalHours?: number;
  monthlyGoalHours?: number;
}

interface StudyContextType {
  data: UserData;
  loading: boolean;
  addSubject: (s: Omit<Subject, 'id' | 'order'>) => Promise<void>;
  createSubject: (s: SubjectCreateInput) => Promise<void>;
  updateSubject: (id: string, s: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  addScheduleEntry: (e: Omit<ScheduleEntry, 'id'>) => Promise<void>;
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

const StudyContext = createContext<StudyContextType | undefined>(undefined);
const db = supabase as any;

function mapSubject(row: any): Subject {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    userId: row.user_id || undefined,
    category: row.category || undefined,
    active: row.active ?? true,
    optional: row.optional ?? false,
    weeklyGoalHours: Number(row.weekly_goal_hours ?? 0),
    monthlyGoalHours: Number(row.monthly_goal_hours ?? 0),
    order: Number(row.sort_order ?? 0),
  };
}

function mapScheduleEntry(row: any): ScheduleEntry {
  return {
    id: row.id,
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
    type: row.type,
    referenceDate: row.reference_date,
    content: row.content,
    createdAt: row.created_at?.split('T')[0] || '',
  };
}

export function StudyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<UserData>({
    subjects: [],
    schedule: [],
    dayPlans: [],
    sessions: [],
    sessionPauses: [],
    notes: [],
  });
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) {
      setData({ subjects: [], schedule: [], dayPlans: [], sessions: [], notes: [] });
      setLoading(false);
      return;
    }

    setLoading(true);

    const [subjectsRes, scheduleRes, dayPlanRes, sessionRes, noteRes] = await Promise.all([
      db.from('subjects').select('*').order('sort_order').order('name'),
      db.from('schedule_entries').select('*').order('sort_order'),
      db.from('schedule_day_plans').select('*'),
      db.from('study_sessions').select('*').order('created_at', { ascending: false }),
      db.from('notes').select('*').order('created_at', { ascending: false }),
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
      subjects: (subjectsRes.data || []).map(mapSubject),
      schedule: (scheduleRes.data || []).map(mapScheduleEntry),
      dayPlans: (dayPlanRes.data || []).map(mapScheduleDayPlan),
      sessions: (sessionRes.data || []).map(mapSession),
      notes: (noteRes.data || []).map(mapNote),
    });

    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const createSubject = async (input: SubjectCreateInput) => {
    if (!user) return;

    const { error } = await db.from('subjects').insert({
      user_id: user.id,
      name: input.name,
      color: input.color || '#5B8C7E',
      category: input.category || null,
      active: input.active ?? true,
      optional: input.optional ?? false,
      weekly_goal_hours: input.weeklyGoalHours ?? 4,
      monthly_goal_hours: input.monthlyGoalHours ?? 16,
      sort_order: data.subjects.length,
    });

    if (error) {
      toast.error('Erro ao salvar materia');
      console.error(error);
      return;
    }

    await fetchAll();
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
    });
  };

  const updateSubject = async (id: string, s: Partial<Subject>) => {
    const update: any = {};
    if (s.name !== undefined) update.name = s.name;
    if (s.color !== undefined) update.color = s.color;
    if (s.category !== undefined) update.category = s.category || null;
    if (s.active !== undefined) update.active = s.active;
    if (s.optional !== undefined) update.optional = s.optional;
    if (s.weeklyGoalHours !== undefined) update.weekly_goal_hours = s.weeklyGoalHours;
    if (s.monthlyGoalHours !== undefined) update.monthly_goal_hours = s.monthlyGoalHours;
    if (s.order !== undefined) update.sort_order = s.order;

    const { error } = await db.from('subjects').update(update).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar materia');
      console.error(error);
      return;
    }

    await fetchAll();
  };

  const deleteSubject = async (id: string) => {
    const { error } = await db.from('subjects').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir materia');
      console.error(error);
      return;
    }
    await fetchAll();
  };

  const addScheduleEntry = async (e: Omit<ScheduleEntry, 'id'>) => {
    if (!user) return;

    const { error } = await db.from('schedule_entries').insert({
      user_id: user.id,
      subject_id: e.subjectId,
      date: e.date,
      optional: e.optional,
      completed: e.completed,
      sort_order: e.order,
      start_time: e.startTime || null,
      planned_minutes: e.plannedMinutes ?? null,
      item_note: e.itemNote || null,
      template_id: e.templateId || null,
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

    const existing = data.dayPlans.find((dp) => dp.date === date);

    const payload: any = {
      user_id: user.id,
      date,
    };

    if (plan.dayNote !== undefined) payload.day_note = plan.dayNote || null;
    if (plan.dayTargetMinutes !== undefined) payload.day_target_minutes = plan.dayTargetMinutes;
    if (plan.templateId !== undefined) payload.template_id = plan.templateId || null;
    if (plan.isOverride !== undefined) payload.is_override = plan.isOverride;

    let response;
    if (existing) {
      response = await db.from('schedule_day_plans').update(payload).eq('id', existing.id);
    } else {
      response = await db.from('schedule_day_plans').insert(payload);
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

    const { error } = await db
      .from('study_sessions')
      .insert({
        user_id: user.id,
        subject_id: s.subjectId,
        date: s.date,
        start_time: s.startTime,
        end_time: s.endTime || null,
        duration_minutes: s.durationMinutes ?? 0,
        note: s.note || null,
      })
      .select('id')
      .single();

    if (error) {
      toast.error('Erro ao registrar sessao');
      console.error(error);
      return;
    }

    await fetchAll();
  };

  const updateSession = async (id: string, s: Partial<StudySession>) => {
    const update: any = {};
    if (s.subjectId !== undefined) update.subject_id = s.subjectId;
    if (s.date !== undefined) update.date = s.date;
    if (s.startTime !== undefined) update.start_time = s.startTime;
    if (s.endTime !== undefined) update.end_time = s.endTime;
    if (s.durationMinutes !== undefined) update.duration_minutes = s.durationMinutes;
    if (s.note !== undefined) update.note = s.note;

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

    const { error } = await db.from('notes').insert({
      user_id: user.id,
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
        addSubject,
        createSubject,
        updateSubject,
        deleteSubject,
        addScheduleEntry,
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

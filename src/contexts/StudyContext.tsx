import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Subject, ScheduleEntry, ScheduleDayPlan, StudySession, StudySessionPause, Note, UserData } from '@/types/study';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { getSessionActualMinutes, getSessionPauseSeconds } from '@/features/tracker/session-metrics';

type SessionInput = Omit<StudySession, 'id'> & {
  pauses?: Array<Omit<StudySessionPause, 'id' | 'sessionId' | 'userId'>>;
};

interface StudyContextType {
  data: UserData;
  loading: boolean;
  // Subjects
  addSubject: (s: Omit<Subject, 'id' | 'order'>) => Promise<void>;
  updateSubject: (id: string, s: Partial<Subject>) => Promise<void>;
  deleteSubject: (id: string) => Promise<void>;
  // Schedule
  addScheduleEntry: (e: Omit<ScheduleEntry, 'id'>) => Promise<void>;
  updateScheduleEntry: (id: string, e: Partial<ScheduleEntry>) => Promise<void>;
  deleteScheduleEntry: (id: string) => Promise<void>;
  toggleScheduleComplete: (id: string) => Promise<void>;
  upsertScheduleDayPlan: (date: string, plan: Partial<Omit<ScheduleDayPlan, 'id' | 'date'>>) => Promise<void>;
  // Sessions
  addSession: (s: SessionInput) => Promise<void>;
  updateSession: (id: string, s: Partial<StudySession>) => Promise<void>;
  // Notes
  addNote: (n: Omit<Note, 'id' | 'createdAt'>) => Promise<void>;
  updateNote: (id: string, content: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  // Helpers
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

function mapSubject(row: any): Subject {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    category: row.category || undefined,
    active: row.active,
    optional: row.optional,
    weeklyGoalHours: Number(row.weekly_goal_hours),
    monthlyGoalHours: Number(row.monthly_goal_hours),
    order: row.sort_order,
  };
}

function mapScheduleEntry(row: any): ScheduleEntry {
  return {
    id: row.id,
    date: row.date,
    subjectId: row.subject_id,
    optional: row.optional,
    completed: row.completed,
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
      setData({ subjects: [], schedule: [], dayPlans: [], sessions: [], sessionPauses: [], notes: [] });
      setLoading(false);
      return;
    }

    setLoading(true);
    const [subRes, schRes, dayRes, sesRes, pauseRes, noteRes] = await Promise.all([
      supabase.from('subjects').select('*').order('sort_order'),
      supabase.from('schedule_entries').select('*').order('sort_order'),
      supabase.from('schedule_day_plans').select('*'),
      supabase.from('study_sessions').select('*').order('started_at', { ascending: false }).order('created_at', { ascending: false }),
      supabase.from('study_session_pauses').select('*').order('pause_started_at', { ascending: false }),
      supabase.from('notes').select('*').order('created_at', { ascending: false }),
    ]);

    setData({
      subjects: (subRes.data || []).map(mapSubject),
      schedule: (schRes.data || []).map(mapScheduleEntry),
      dayPlans: (dayRes.data || []).map(mapScheduleDayPlan),
      sessions: (sesRes.data || []).map(mapSession),
      sessionPauses: (pauseRes.data || []).map(mapSessionPause),
      notes: (noteRes.data || []).map(mapNote),
    });

    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchAll();
  }, [fetchAll]);

  const addSubject = async (s: Omit<Subject, 'id' | 'order'>) => {
    if (!user) return;
    const { error } = await supabase.from('subjects').insert({
      user_id: user.id,
      name: s.name,
      color: s.color,
      category: s.category || null,
      active: s.active,
      optional: s.optional,
      weekly_goal_hours: s.weeklyGoalHours,
      monthly_goal_hours: s.monthlyGoalHours,
      sort_order: data.subjects.length,
    });
    if (error) {
      toast.error('Erro ao salvar materia');
      console.error(error);
      return;
    }
    await fetchAll();
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

    const { error } = await supabase.from('subjects').update(update).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar materia');
      console.error(error);
      return;
    }

    await fetchAll();
  };

  const deleteSubject = async (id: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir materia');
      console.error(error);
      return;
    }
    await fetchAll();
  };

  const addScheduleEntry = async (e: Omit<ScheduleEntry, 'id'>) => {
    if (!user) return;
    const { error } = await supabase.from('schedule_entries').insert({
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
    if (e.dayNote !== undefined) update.day_note = e.dayNote;

    const { error } = await supabase.from('schedule_entries').update(update).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar cronograma');
      console.error(error);
      return;
    }

    await fetchAll();
  };

  const deleteScheduleEntry = async (id: string) => {
    const { error } = await supabase.from('schedule_entries').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir item do cronograma');
      console.error(error);
      return;
    }
    await fetchAll();
  };

  const toggleScheduleComplete = async (id: string) => {
    const entry = data.schedule.find((e) => e.id === id);
    if (!entry) return;
    await updateScheduleEntry(id, { completed: !entry.completed });
  };

  const upsertScheduleDayPlan = async (date: string, plan: Partial<Omit<ScheduleDayPlan, 'id' | 'date'>>) => {
    if (!user) return;

    const payload: any = {
      user_id: user.id,
      date,
    };

    if (plan.dayNote !== undefined) payload.day_note = plan.dayNote || null;
    if (plan.dayTargetMinutes !== undefined) payload.day_target_minutes = plan.dayTargetMinutes;
    if (plan.templateId !== undefined) payload.template_id = plan.templateId || null;
    if (plan.isOverride !== undefined) payload.is_override = plan.isOverride;

    const { error } = await supabase.from('schedule_day_plans').upsert(payload, { onConflict: 'user_id,date' });
    if (error) {
      toast.error('Erro ao atualizar plano do dia');
      console.error(error);
      return;
    }

    await fetchAll();
  };

  const addSession = async (s: SessionInput) => {
    if (!user) return;

    const actualDurationSeconds = s.actualDurationSeconds ?? Math.max(0, Math.round((s.durationMinutes || 0) * 60));
    const totalPauseSeconds = s.totalPauseSeconds ?? 0;
    const clockDurationSeconds = s.clockDurationSeconds ?? actualDurationSeconds + totalPauseSeconds;
    const durationMinutes = s.durationMinutes ?? Math.round(actualDurationSeconds / 60);

    const { data: inserted, error } = await supabase
      .from('study_sessions')
      .insert({
        user_id: user.id,
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

      const { error: pauseError } = await supabase.from('study_session_pauses').insert(pausesPayload);
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

    const { error } = await supabase.from('study_sessions').update(update).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar sessao');
      console.error(error);
      return;
    }

    await fetchAll();
  };

  const addNote = async (n: Omit<Note, 'id' | 'createdAt'>) => {
    if (!user) return;
    const { error } = await supabase.from('notes').insert({
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
    const { error } = await supabase.from('notes').update({ content }).eq('id', id);
    if (error) {
      toast.error('Erro ao atualizar nota');
      console.error(error);
      return;
    }
    await fetchAll();
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) {
      toast.error('Erro ao excluir nota');
      console.error(error);
      return;
    }
    await fetchAll();
  };

  const getSubject = (id: string) => data.subjects.find((s) => s.id === id);

  const getSessionsForDate = (date: string) =>
    data.sessions
      .filter((s) => s.date === date)
      .sort((a, b) => {
        const aStart = a.startedAt || `${a.date}T${a.startTime || '00:00'}:00`;
        const bStart = b.startedAt || `${b.date}T${b.startTime || '00:00'}:00`;
        return aStart.localeCompare(bStart);
      });

  const getSessionPauses = (sessionId: string) =>
    data.sessionPauses
      .filter((pause) => pause.sessionId === sessionId)
      .sort((a, b) => a.pauseStartedAt.localeCompare(b.pauseStartedAt));

  const getScheduleForDate = (date: string) =>
    data.schedule
      .filter((s) => s.date === date)
      .sort((a, b) => {
        if (a.startTime && b.startTime) {
          if (a.startTime < b.startTime) return -1;
          if (a.startTime > b.startTime) return 1;
        } else if (a.startTime && !b.startTime) {
          return -1;
        } else if (!a.startTime && b.startTime) {
          return 1;
        }
        return a.order - b.order;
      });

  const getDayPlanForDate = (date: string) => data.dayPlans.find((d) => d.date === date);

  const getTotalMinutesForDate = (date: string) =>
    data.sessions
      .filter((s) => s.date === date)
      .reduce((acc, s) => acc + getSessionActualMinutes(s), 0);

  const getTotalPauseMinutesForDate = (date: string) => {
    const seconds = data.sessions
      .filter((s) => s.date === date)
      .reduce((acc, s) => acc + getSessionPauseSeconds(s, data.sessionPauses), 0);
    return Math.round(seconds / 60);
  };

  const getTotalMinutesForSubject = (subjectId: string, from?: string, to?: string) =>
    data.sessions
      .filter((s) => s.subjectId === subjectId && (!from || s.date >= from) && (!to || s.date <= to))
      .reduce((acc, s) => acc + getSessionActualMinutes(s), 0);

  return (
    <StudyContext.Provider
      value={{
        data,
        loading,
        addSubject,
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
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy must be used within StudyProvider');
  return ctx;
}

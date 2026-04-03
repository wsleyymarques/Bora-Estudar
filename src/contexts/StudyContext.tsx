import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Subject, ScheduleEntry, StudySession, Note, UserData } from '@/types/study';
import { useAuth } from './AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  // Sessions
  addSession: (s: Omit<StudySession, 'id'>) => Promise<void>;
  updateSession: (id: string, s: Partial<StudySession>) => Promise<void>;
  // Notes
  addNote: (n: Omit<Note, 'id' | 'createdAt'>) => Promise<void>;
  updateNote: (id: string, content: string) => Promise<void>;
  deleteNote: (id: string) => Promise<void>;
  // Helpers
  getSubject: (id: string) => Subject | undefined;
  getSessionsForDate: (date: string) => StudySession[];
  getScheduleForDate: (date: string) => ScheduleEntry[];
  getTotalMinutesForDate: (date: string) => number;
  getTotalMinutesForSubject: (subjectId: string, from?: string, to?: string) => number;
  refreshData: () => Promise<void>;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

// Map DB row to app type
function mapSubject(row: any): Subject {
  return {
    id: row.id, name: row.name, color: row.color, category: row.category || undefined,
    active: row.active, optional: row.optional,
    weeklyGoalHours: Number(row.weekly_goal_hours), monthlyGoalHours: Number(row.monthly_goal_hours),
    order: row.sort_order,
  };
}
function mapScheduleEntry(row: any): ScheduleEntry {
  return {
    id: row.id, date: row.date, subjectId: row.subject_id,
    optional: row.optional, completed: row.completed, order: row.sort_order,
    templateId: row.template_id || undefined,
    isOverride: row.is_override || false,
    dayNote: row.day_note || undefined,
  };
}
function mapSession(row: any): StudySession {
  return {
    id: row.id, subjectId: row.subject_id, date: row.date,
    startTime: row.start_time, endTime: row.end_time || undefined,
    durationMinutes: row.duration_minutes, note: row.note || undefined,
  };
}
function mapNote(row: any): Note {
  return {
    id: row.id, type: row.type, referenceDate: row.reference_date,
    content: row.content, createdAt: row.created_at?.split('T')[0] || '',
  };
}

export function StudyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<UserData>({ subjects: [], schedule: [], sessions: [], notes: [] });
  const [loading, setLoading] = useState(true);

  const fetchAll = useCallback(async () => {
    if (!user) { setData({ subjects: [], schedule: [], sessions: [], notes: [] }); setLoading(false); return; }
    setLoading(true);
    const [subRes, schRes, sesRes, notRes] = await Promise.all([
      supabase.from('subjects').select('*').order('sort_order'),
      supabase.from('schedule_entries').select('*').order('sort_order'),
      supabase.from('study_sessions').select('*').order('created_at', { ascending: false }),
      supabase.from('notes').select('*').order('created_at', { ascending: false }),
    ]);
    setData({
      subjects: (subRes.data || []).map(mapSubject),
      schedule: (schRes.data || []).map(mapScheduleEntry),
      sessions: (sesRes.data || []).map(mapSession),
      notes: (notRes.data || []).map(mapNote),
    });
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // SUBJECTS
  const addSubject = async (s: Omit<Subject, 'id' | 'order'>) => {
    if (!user) return;
    const { error } = await supabase.from('subjects').insert({
      user_id: user.id, name: s.name, color: s.color, category: s.category || null,
      active: s.active, optional: s.optional,
      weekly_goal_hours: s.weeklyGoalHours, monthly_goal_hours: s.monthlyGoalHours,
      sort_order: data.subjects.length,
    });
    if (error) { toast.error('Erro ao salvar matéria'); console.error(error); return; }
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
    if (error) { toast.error('Erro ao atualizar'); console.error(error); return; }
    await fetchAll();
  };

  const deleteSubject = async (id: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); console.error(error); return; }
    await fetchAll();
  };

  // SCHEDULE
  const addScheduleEntry = async (e: Omit<ScheduleEntry, 'id'>) => {
    if (!user) return;
    const { error } = await supabase.from('schedule_entries').insert({
      user_id: user.id, subject_id: e.subjectId, date: e.date,
      optional: e.optional, completed: e.completed, sort_order: e.order,
      template_id: e.templateId || null,
      is_override: e.isOverride || false,
      day_note: e.dayNote || null,
    });
    if (error) { toast.error('Erro ao adicionar'); console.error(error); return; }
    await fetchAll();
  };

  const updateScheduleEntry = async (id: string, e: Partial<ScheduleEntry>) => {
    const update: any = {};
    if (e.date !== undefined) update.date = e.date;
    if (e.subjectId !== undefined) update.subject_id = e.subjectId;
    if (e.optional !== undefined) update.optional = e.optional;
    if (e.completed !== undefined) update.completed = e.completed;
    if (e.order !== undefined) update.sort_order = e.order;
    if (e.isOverride !== undefined) update.is_override = e.isOverride;
    if (e.dayNote !== undefined) update.day_note = e.dayNote;
    const { error } = await supabase.from('schedule_entries').update(update).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); console.error(error); return; }
    await fetchAll();
  };

  const deleteScheduleEntry = async (id: string) => {
    const { error } = await supabase.from('schedule_entries').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); console.error(error); return; }
    await fetchAll();
  };

  const toggleScheduleComplete = async (id: string) => {
    const entry = data.schedule.find(e => e.id === id);
    if (!entry) return;
    await updateScheduleEntry(id, { completed: !entry.completed });
  };

  // SESSIONS
  const addSession = async (s: Omit<StudySession, 'id'>) => {
    if (!user) return;
    const { error } = await supabase.from('study_sessions').insert({
      user_id: user.id, subject_id: s.subjectId, date: s.date,
      start_time: s.startTime, end_time: s.endTime || null,
      duration_minutes: s.durationMinutes, note: s.note || null,
    });
    if (error) { toast.error('Erro ao registrar sessão'); console.error(error); return; }
    await fetchAll();
  };

  const updateSession = async (id: string, s: Partial<StudySession>) => {
    const update: any = {};
    if (s.subjectId !== undefined) update.subject_id = s.subjectId;
    if (s.endTime !== undefined) update.end_time = s.endTime;
    if (s.durationMinutes !== undefined) update.duration_minutes = s.durationMinutes;
    if (s.note !== undefined) update.note = s.note;
    const { error } = await supabase.from('study_sessions').update(update).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); console.error(error); return; }
    await fetchAll();
  };

  // NOTES
  const addNote = async (n: Omit<Note, 'id' | 'createdAt'>) => {
    if (!user) return;
    const { error } = await supabase.from('notes').insert({
      user_id: user.id, type: n.type, reference_date: n.referenceDate, content: n.content,
    });
    if (error) { toast.error('Erro ao salvar nota'); console.error(error); return; }
    await fetchAll();
  };

  const updateNote = async (id: string, content: string) => {
    const { error } = await supabase.from('notes').update({ content }).eq('id', id);
    if (error) { toast.error('Erro ao atualizar'); console.error(error); return; }
    await fetchAll();
  };

  const deleteNote = async (id: string) => {
    const { error } = await supabase.from('notes').delete().eq('id', id);
    if (error) { toast.error('Erro ao excluir'); console.error(error); return; }
    await fetchAll();
  };

  // HELPERS
  const getSubject = (id: string) => data.subjects.find(s => s.id === id);
  const getSessionsForDate = (date: string) => data.sessions.filter(s => s.date === date);
  const getScheduleForDate = (date: string) => data.schedule.filter(s => s.date === date).sort((a, b) => a.order - b.order);
  const getTotalMinutesForDate = (date: string) => data.sessions.filter(s => s.date === date).reduce((acc, s) => acc + s.durationMinutes, 0);
  const getTotalMinutesForSubject = (subjectId: string, from?: string, to?: string) => {
    return data.sessions
      .filter(s => s.subjectId === subjectId && (!from || s.date >= from) && (!to || s.date <= to))
      .reduce((acc, s) => acc + s.durationMinutes, 0);
  };

  return (
    <StudyContext.Provider value={{
      data, loading, addSubject, updateSubject, deleteSubject,
      addScheduleEntry, updateScheduleEntry, deleteScheduleEntry, toggleScheduleComplete,
      addSession, updateSession, addNote, updateNote, deleteNote,
      getSubject, getSessionsForDate, getScheduleForDate, getTotalMinutesForDate, getTotalMinutesForSubject,
      refreshData: fetchAll,
    }}>
      {children}
    </StudyContext.Provider>
  );
}

export function useStudy() {
  const ctx = useContext(StudyContext);
  if (!ctx) throw new Error('useStudy must be used within StudyProvider');
  return ctx;
}

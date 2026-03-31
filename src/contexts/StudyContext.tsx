import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Subject, ScheduleEntry, StudySession, Note, UserData } from '@/types/study';
import { mockUserData } from '@/data/mockData';
import { useAuth } from './AuthContext';

interface StudyContextType {
  data: UserData;
  // Subjects
  addSubject: (s: Omit<Subject, 'id' | 'order'>) => void;
  updateSubject: (id: string, s: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;
  // Schedule
  addScheduleEntry: (e: Omit<ScheduleEntry, 'id'>) => void;
  updateScheduleEntry: (id: string, e: Partial<ScheduleEntry>) => void;
  deleteScheduleEntry: (id: string) => void;
  toggleScheduleComplete: (id: string) => void;
  // Sessions
  addSession: (s: Omit<StudySession, 'id'>) => void;
  updateSession: (id: string, s: Partial<StudySession>) => void;
  // Notes
  addNote: (n: Omit<Note, 'id' | 'createdAt'>) => void;
  updateNote: (id: string, content: string) => void;
  deleteNote: (id: string) => void;
  // Helpers
  getSubject: (id: string) => Subject | undefined;
  getSessionsForDate: (date: string) => StudySession[];
  getScheduleForDate: (date: string) => ScheduleEntry[];
  getTotalMinutesForDate: (date: string) => number;
  getTotalMinutesForSubject: (subjectId: string, from?: string, to?: string) => number;
}

const StudyContext = createContext<StudyContextType | undefined>(undefined);

function getStorageKey(userId: string) {
  return `studytrack_data_${userId}`;
}

export function StudyProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [data, setData] = useState<UserData>({ subjects: [], schedule: [], sessions: [], notes: [] });

  useEffect(() => {
    if (!user) return;
    const stored = localStorage.getItem(getStorageKey(user.id));
    if (stored) {
      setData(JSON.parse(stored));
    } else {
      setData(mockUserData);
      localStorage.setItem(getStorageKey(user.id), JSON.stringify(mockUserData));
    }
  }, [user]);

  const save = useCallback((newData: UserData) => {
    setData(newData);
    if (user) localStorage.setItem(getStorageKey(user.id), JSON.stringify(newData));
  }, [user]);

  const addSubject = (s: Omit<Subject, 'id' | 'order'>) => {
    const ns = { ...s, id: crypto.randomUUID(), order: data.subjects.length };
    save({ ...data, subjects: [...data.subjects, ns] });
  };
  const updateSubject = (id: string, s: Partial<Subject>) => {
    save({ ...data, subjects: data.subjects.map(x => x.id === id ? { ...x, ...s } : x) });
  };
  const deleteSubject = (id: string) => {
    save({ ...data, subjects: data.subjects.filter(x => x.id !== id) });
  };

  const addScheduleEntry = (e: Omit<ScheduleEntry, 'id'>) => {
    save({ ...data, schedule: [...data.schedule, { ...e, id: crypto.randomUUID() }] });
  };
  const updateScheduleEntry = (id: string, e: Partial<ScheduleEntry>) => {
    save({ ...data, schedule: data.schedule.map(x => x.id === id ? { ...x, ...e } : x) });
  };
  const deleteScheduleEntry = (id: string) => {
    save({ ...data, schedule: data.schedule.filter(x => x.id !== id) });
  };
  const toggleScheduleComplete = (id: string) => {
    save({ ...data, schedule: data.schedule.map(x => x.id === id ? { ...x, completed: !x.completed } : x) });
  };

  const addSession = (s: Omit<StudySession, 'id'>) => {
    save({ ...data, sessions: [...data.sessions, { ...s, id: crypto.randomUUID() }] });
  };
  const updateSession = (id: string, s: Partial<StudySession>) => {
    save({ ...data, sessions: data.sessions.map(x => x.id === id ? { ...x, ...s } : x) });
  };

  const addNote = (n: Omit<Note, 'id' | 'createdAt'>) => {
    save({ ...data, notes: [...data.notes, { ...n, id: crypto.randomUUID(), createdAt: new Date().toISOString().split('T')[0] }] });
  };
  const updateNote = (id: string, content: string) => {
    save({ ...data, notes: data.notes.map(x => x.id === id ? { ...x, content } : x) });
  };
  const deleteNote = (id: string) => {
    save({ ...data, notes: data.notes.filter(x => x.id !== id) });
  };

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
      data, addSubject, updateSubject, deleteSubject,
      addScheduleEntry, updateScheduleEntry, deleteScheduleEntry, toggleScheduleComplete,
      addSession, updateSession, addNote, updateNote, deleteNote,
      getSubject, getSessionsForDate, getScheduleForDate, getTotalMinutesForDate, getTotalMinutesForSubject,
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

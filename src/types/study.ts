export interface Subject {
  id: string;
  name: string;
  color: string;
  category?: string;
  active: boolean;
  optional: boolean;
  weeklyGoalHours: number;
  monthlyGoalHours: number;
  order: number;
}

export interface ScheduleEntry {
  id: string;
  date: string; // YYYY-MM-DD
  subjectId: string;
  optional: boolean;
  completed: boolean;
  order: number;
}

export interface StudySession {
  id: string;
  subjectId: string;
  date: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  note?: string;
}

export interface Note {
  id: string;
  type: 'day' | 'week' | 'session';
  referenceDate: string; // YYYY-MM-DD or YYYY-Www
  content: string;
  createdAt: string;
}

export interface UserData {
  subjects: Subject[];
  schedule: ScheduleEntry[];
  sessions: StudySession[];
  notes: Note[];
}

export type ScheduleView = 'daily' | 'weekly' | 'monthly' | 'yearly';

export const SUBJECT_COLORS = [
  '#5B8C7E', '#6B9BD2', '#E8A838', '#C47ABF',
  '#E57373', '#4DB6AC', '#7986CB', '#FFB74D',
  '#A1887F', '#90A4AE', '#81C784', '#FF8A65',
];

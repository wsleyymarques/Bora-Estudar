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
  startTime?: string;
  plannedMinutes?: number;
  itemNote?: string;
  templateId?: string;
  isOverride?: boolean;
  dayNote?: string;
}

export interface ScheduleDayPlan {
  id: string;
  date: string; // YYYY-MM-DD
  dayNote?: string;
  dayTargetMinutes?: number;
  templateId?: string;
  isOverride?: boolean;
}

export type SessionMode = 'manual' | 'stopwatch' | 'pomodoro';
export type SessionStatus = 'active' | 'paused' | 'completed' | 'abandoned';
export type PomodoroPhase = 'focus' | 'short_break' | 'long_break';

export interface StudySessionPause {
  id: string;
  sessionId: string;
  userId?: string;
  pauseStartedAt: string;
  pauseEndedAt?: string;
  durationSeconds?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface StudySession {
  id: string;
  subjectId: string;
  date: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  note?: string;
  sessionMode?: SessionMode;
  status?: SessionStatus;
  source?: 'tracker' | 'manual' | 'import' | 'pomodoro';
  pomodoroPhase?: PomodoroPhase;
  pomodoroCycle?: number;
  isFocusSession?: boolean;
  startedAt?: string;
  endedAt?: string;
  actualDurationSeconds?: number;
  totalPauseSeconds?: number;
  clockDurationSeconds?: number;
  plannedStartTime?: string;
  plannedMinutes?: number;
  scheduleDate?: string;
  scheduleEntryId?: string;
  metadata?: Record<string, unknown>;
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
  dayPlans: ScheduleDayPlan[];
  sessions: StudySession[];
  sessionPauses: StudySessionPause[];
  notes: Note[];
}

export type ScheduleView = 'weekly' | 'monthly' | 'yearly' | 'templates';

// Template types
export interface WeeklyTemplate {
  id: string;
  name: string;
  items: WeeklyTemplateItem[];
  dayNotes: WeeklyTemplateDayNote[];
}

export interface WeeklyTemplateItem {
  id: string;
  templateId: string;
  dayOfWeek: number; // 0=Monday, 6=Sunday
  subjectId: string;
  optional: boolean;
  startTime?: string;
  plannedMinutes?: number;
  itemNote?: string;
  sortOrder: number;
}

export interface WeeklyTemplateDayNote {
  id: string;
  templateId: string;
  dayOfWeek: number;
  content: string;
  targetMinutes?: number;
}

export const DAY_NAMES = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
export const DAY_NAMES_SHORT = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

export const SUBJECT_COLORS = [
  '#5B8C7E', '#6B9BD2', '#E8A838', '#C47ABF',
  '#E57373', '#4DB6AC', '#7986CB', '#FFB74D',
  '#A1887F', '#90A4AE', '#81C784', '#FF8A65',
];

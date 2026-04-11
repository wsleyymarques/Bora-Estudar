import { Subject, ScheduleEntry, StudySession, Note, UserData } from '@/types/study';

const today = new Date();
const getDate = (daysOffset: number) => {
  const d = new Date(today);
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().split('T')[0];
};

const subjects: Subject[] = [
  { id: 's1', name: 'Português', color: '#5B8C7E', category: 'Linguagens', active: true, optional: false, weeklyGoalHours: 6, monthlyGoalHours: 24, order: 0 },
  { id: 's2', name: 'Matemática', color: '#6B9BD2', category: 'Exatas', active: true, optional: false, weeklyGoalHours: 8, monthlyGoalHours: 32, order: 1 },
  { id: 's3', name: 'Direito Constitucional', color: '#E8A838', category: 'Jurídico', active: true, optional: false, weeklyGoalHours: 5, monthlyGoalHours: 20, order: 2 },
  { id: 's4', name: 'Direito Administrativo', color: '#C47ABF', category: 'Jurídico', active: true, optional: false, weeklyGoalHours: 5, monthlyGoalHours: 20, order: 3 },
  { id: 's5', name: 'Informática', color: '#4DB6AC', category: 'Tecnologia', active: true, optional: false, weeklyGoalHours: 4, monthlyGoalHours: 16, order: 4 },
  { id: 's6', name: 'Redação', color: '#E57373', category: 'Linguagens', active: true, optional: false, weeklyGoalHours: 3, monthlyGoalHours: 12, order: 5 },
  { id: 's7', name: 'Raciocínio Lógico', color: '#7986CB', category: 'Exatas', active: true, optional: true, weeklyGoalHours: 3, monthlyGoalHours: 12, order: 6 },
  { id: 's8', name: 'Atualidades', color: '#90A4AE', category: 'Geral', active: true, optional: true, weeklyGoalHours: 2, monthlyGoalHours: 8, order: 7 },
];

const dayOfWeek = today.getDay();
const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

const schedule: ScheduleEntry[] = [
  { id: 'sc1', date: getDate(mondayOffset), subjectId: 's1', optional: false, completed: true, order: 0 },
  { id: 'sc2', date: getDate(mondayOffset), subjectId: 's2', optional: false, completed: true, order: 1 },
  { id: 'sc3', date: getDate(mondayOffset), subjectId: 's7', optional: true, completed: false, order: 2 },
  { id: 'sc4', date: getDate(mondayOffset + 1), subjectId: 's3', optional: false, completed: true, order: 0 },
  { id: 'sc5', date: getDate(mondayOffset + 1), subjectId: 's5', optional: false, completed: true, order: 1 },
  { id: 'sc6', date: getDate(mondayOffset + 2), subjectId: 's4', optional: false, completed: dayOfWeek > 3, order: 0 },
  { id: 'sc7', date: getDate(mondayOffset + 2), subjectId: 's6', optional: false, completed: dayOfWeek > 3, order: 1 },
  { id: 'sc8', date: getDate(mondayOffset + 2), subjectId: 's8', optional: true, completed: false, order: 2 },
  { id: 'sc9', date: getDate(mondayOffset + 3), subjectId: 's1', optional: false, completed: dayOfWeek > 4, order: 0 },
  { id: 'sc10', date: getDate(mondayOffset + 3), subjectId: 's3', optional: false, completed: false, order: 1 },
  { id: 'sc11', date: getDate(mondayOffset + 4), subjectId: 's2', optional: false, completed: false, order: 0 },
  { id: 'sc12', date: getDate(mondayOffset + 4), subjectId: 's5', optional: false, completed: false, order: 1 },
  { id: 'sc13', date: getDate(mondayOffset + 4), subjectId: 's7', optional: true, completed: false, order: 2 },
  { id: 'sc14', date: getDate(mondayOffset + 5), subjectId: 's6', optional: false, completed: false, order: 0 },
  { id: 'sc15', date: getDate(mondayOffset + 5), subjectId: 's4', optional: false, completed: false, order: 1 },
  { id: 'sc16', date: getDate(mondayOffset + 6), subjectId: 's8', optional: true, completed: false, order: 0 },
];

const sessions: StudySession[] = [
  { id: 'ss1', subjectId: 's1', date: getDate(mondayOffset), startTime: '08:00', endTime: '09:30', durationMinutes: 90, note: 'Revisão de gramática' },
  { id: 'ss2', subjectId: 's2', date: getDate(mondayOffset), startTime: '10:00', endTime: '11:45', durationMinutes: 105 },
  { id: 'ss3', subjectId: 's3', date: getDate(mondayOffset + 1), startTime: '08:00', endTime: '09:20', durationMinutes: 80 },
  { id: 'ss4', subjectId: 's5', date: getDate(mondayOffset + 1), startTime: '10:00', endTime: '11:00', durationMinutes: 60 },
  { id: 'ss5', subjectId: 's4', date: getDate(mondayOffset + 2), startTime: '09:00', endTime: '10:15', durationMinutes: 75 },
  { id: 'ss6', subjectId: 's6', date: getDate(mondayOffset + 2), startTime: '14:00', endTime: '15:00', durationMinutes: 60 },
  { id: 'ss7', subjectId: 's1', date: getDate(mondayOffset - 7), startTime: '08:00', endTime: '09:30', durationMinutes: 90 },
  { id: 'ss8', subjectId: 's2', date: getDate(mondayOffset - 7), startTime: '10:00', endTime: '12:00', durationMinutes: 120 },
  { id: 'ss9', subjectId: 's3', date: getDate(mondayOffset - 6), startTime: '08:00', endTime: '10:00', durationMinutes: 120 },
  { id: 'ss10', subjectId: 's5', date: getDate(mondayOffset - 5), startTime: '09:00', endTime: '10:30', durationMinutes: 90 },
  { id: 'ss11', subjectId: 's4', date: getDate(mondayOffset - 4), startTime: '08:00', endTime: '09:00', durationMinutes: 60 },
  { id: 'ss12', subjectId: 's6', date: getDate(mondayOffset - 3), startTime: '14:00', endTime: '15:30', durationMinutes: 90 },
  { id: 'ss13', subjectId: 's2', date: getDate(mondayOffset - 14), startTime: '10:00', endTime: '12:00', durationMinutes: 120 },
  { id: 'ss14', subjectId: 's1', date: getDate(mondayOffset - 13), startTime: '08:00', endTime: '09:00', durationMinutes: 60 },
];

const notes: Note[] = [
  { id: 'n1', type: 'day', referenceDate: getDate(mondayOffset), content: 'Dia produtivo! Consegui focar bem pela manhã.', createdAt: getDate(mondayOffset) },
  { id: 'n2', type: 'day', referenceDate: getDate(mondayOffset + 1), content: 'Tive dificuldade em Direito Constitucional, preciso revisar.', createdAt: getDate(mondayOffset + 1) },
  { id: 'n3', type: 'week', referenceDate: getDate(mondayOffset), content: 'Semana bem produtiva, preciso manter o ritmo.', createdAt: getDate(mondayOffset + 2) },
  { id: 'n4', type: 'session', referenceDate: getDate(mondayOffset), content: 'Revisão de gramática completa, focar em interpretação próxima vez.', createdAt: getDate(mondayOffset) },
];

const dayPlans = [
  { id: 'dp1', date: getDate(mondayOffset), dayTargetMinutes: 300, dayNote: 'Blocos da manha', isOverride: false },
  { id: 'dp2', date: getDate(mondayOffset + 2), dayTargetMinutes: 270, dayNote: 'Foco em exatas', isOverride: false },
];

export const mockUserData: UserData = { subjects, schedule, dayPlans, sessions, sessionPauses: [], notes };

import { WeeklyTemplate } from '@/types/study';
import { eachDayInclusive, getWeekdayMondayIndex, toDateKey } from '@/lib/date-utils';

interface BuildTemplateEntriesParams {
  userId: string;
  scheduleId?: string;
  planId?: string;
  template: WeeklyTemplate;
  templateId: string;
  startDate: Date;
  endDate: Date;
}

export interface GeneratedScheduleEntryInsert {
  user_id: string;
  schedule_id?: string;
  plan_id?: string;
  subject_id: string;
  date: string;
  optional: boolean;
  completed: boolean;
  sort_order: number;
  start_time: string | null;
  planned_minutes: number | null;
  template_id: string;
  is_override: boolean;
  day_note: string | null;
}

export interface GeneratedScheduleDayPlanInsert {
  user_id: string;
  schedule_id?: string;
  plan_id?: string;
  date: string;
  day_note: string | null;
  day_target_minutes: number | null;
  template_id: string;
  is_override: boolean;
}

export function buildTemplateEntries({
  userId,
  scheduleId,
  planId,
  template,
  templateId,
  startDate,
  endDate,
}: BuildTemplateEntriesParams): { entries: GeneratedScheduleEntryInsert[]; dayPlans: GeneratedScheduleDayPlanInsert[] } {
  const entries: GeneratedScheduleEntryInsert[] = [];
  const dayPlans: GeneratedScheduleDayPlanInsert[] = [];
  const days = eachDayInclusive(startDate, endDate);

  for (const day of days) {
    const dow = getWeekdayMondayIndex(day);
    const dayItems = template.items.filter(i => i.dayOfWeek === dow);
    const dayTemplate = template.dayNotes.find(n => n.dayOfWeek === dow);
    const dayNote = dayTemplate?.content || null;
    const dayTargetMinutes = dayTemplate?.targetMinutes ?? null;
    const date = toDateKey(day);

    if (dayNote || dayTargetMinutes !== null || dayItems.length > 0) {
      dayPlans.push({
        user_id: userId,
        schedule_id: scheduleId,
        plan_id: planId,
        date,
        day_note: dayNote,
        day_target_minutes: dayTargetMinutes,
        template_id: templateId,
        is_override: false,
      });
    }

    for (const item of dayItems) {
      entries.push({
        user_id: userId,
        schedule_id: scheduleId,
        plan_id: planId,
        subject_id: item.subjectId,
        date,
        optional: item.optional,
        completed: false,
        sort_order: item.sortOrder,
        start_time: item.startTime || null,
        planned_minutes: item.plannedMinutes ?? null,
        template_id: templateId,
        is_override: false,
        day_note: dayNote,
      });
    }
  }

  return { entries, dayPlans };
}

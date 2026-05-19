import { eachDayInclusive, getWeekdayMondayIndex } from '@/lib/date-utils';

interface GenerateWeeklyOccurrencesParams {
  startDate: Date;
  endDate: Date;
  weekdays: number[];
}

export function generateWeeklyOccurrences({ startDate, endDate, weekdays }: GenerateWeeklyOccurrencesParams): string[] {
  const allowedWeekdays = new Set(
    weekdays
      .map((weekday) => Number(weekday))
      .filter((weekday) => Number.isInteger(weekday) && weekday >= 0 && weekday <= 6),
  );

  if (allowedWeekdays.size === 0 || endDate < startDate) {
    return [];
  }

  return eachDayInclusive(startDate, endDate)
    .filter((day) => allowedWeekdays.has(getWeekdayMondayIndex(day)))
    .map((day) => day.toISOString().slice(0, 10));
}

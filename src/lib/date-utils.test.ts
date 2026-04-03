import { describe, expect, it } from 'vitest';
import { addDays, eachDayInclusive, getMonday, getWeekdayMondayIndex, parseDateKey, toDateKey } from '@/lib/date-utils';

describe('date-utils', () => {
  it('roundtrips date key using local-safe parsing', () => {
    const key = '2026-04-03';
    const date = parseDateKey(key);
    expect(toDateKey(date)).toBe(key);
  });

  it('returns monday as start of week', () => {
    const sunday = parseDateKey('2026-04-05');
    expect(toDateKey(getMonday(sunday))).toBe('2026-03-30');
  });

  it('maps weekdays to monday-index', () => {
    expect(getWeekdayMondayIndex(parseDateKey('2026-04-06'))).toBe(0); // Monday
    expect(getWeekdayMondayIndex(parseDateKey('2026-04-12'))).toBe(6); // Sunday
  });

  it('iterates inclusive range across month boundary', () => {
    const start = parseDateKey('2026-01-30');
    const end = parseDateKey('2026-02-02');
    const keys = eachDayInclusive(start, end).map(toDateKey);
    expect(keys).toEqual(['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02']);
    expect(toDateKey(addDays(start, 3))).toBe('2026-02-02');
  });
});


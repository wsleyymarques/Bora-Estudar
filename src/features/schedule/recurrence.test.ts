import { describe, expect, it } from 'vitest';
import { generateWeeklyOccurrences } from './recurrence';
import { parseDateKey } from '@/lib/date-utils';

describe('generateWeeklyOccurrences', () => {
  it('returns only selected weekdays inside the interval', () => {
    const dates = generateWeeklyOccurrences({
      startDate: parseDateKey('2026-04-06'),
      endDate: parseDateKey('2026-04-19'),
      weekdays: [0, 2],
    });

    expect(dates).toEqual([
      '2026-04-06',
      '2026-04-08',
      '2026-04-13',
      '2026-04-15',
    ]);
  });

  it('returns an empty list when the range is invalid', () => {
    expect(
      generateWeeklyOccurrences({
        startDate: parseDateKey('2026-04-19'),
        endDate: parseDateKey('2026-04-06'),
        weekdays: [0],
      }),
    ).toEqual([]);
  });
});

import { describe, expect, it } from 'vitest';
import { buildTemplateEntries } from '@/features/schedule/template-generation';
import { WeeklyTemplate } from '@/types/study';
import { parseDateKey } from '@/lib/date-utils';

const template: WeeklyTemplate = {
  id: 'tpl-1',
  name: 'Template Base',
  items: [
    { id: 'i1', templateId: 'tpl-1', dayOfWeek: 0, subjectId: 'math', optional: false, sortOrder: 0 }, // Monday
    { id: 'i2', templateId: 'tpl-1', dayOfWeek: 2, subjectId: 'history', optional: true, sortOrder: 1 }, // Wednesday
    { id: 'i3', templateId: 'tpl-1', dayOfWeek: 6, subjectId: 'physics', optional: false, sortOrder: 0 }, // Sunday
  ],
  dayNotes: [
    { id: 'n1', templateId: 'tpl-1', dayOfWeek: 0, content: 'Revisao forte', targetMinutes: 180 },
  ],
};

describe('buildTemplateEntries', () => {
  it('applies one week range to correct weekdays', () => {
    const { entries, dayPlans } = buildTemplateEntries({
      userId: 'u1',
      template,
      templateId: template.id,
      startDate: parseDateKey('2026-04-06'),
      endDate: parseDateKey('2026-04-12'),
    });

    expect(entries).toHaveLength(3);
    expect(entries.map(e => `${e.date}:${e.subject_id}`)).toEqual([
      '2026-04-06:math',
      '2026-04-08:history',
      '2026-04-12:physics',
    ]);
    expect(entries[0].day_note).toBe('Revisao forte');
    expect(entries[1].optional).toBe(true);
    expect(entries[0].start_time).toBeNull();
    expect(dayPlans.length).toBeGreaterThan(0);
    expect(dayPlans.find(d => d.date === '2026-04-06')?.day_target_minutes).toBe(180);
  });

  it('applies one month and repeats by week pattern', () => {
    const { entries } = buildTemplateEntries({
      userId: 'u1',
      template,
      templateId: template.id,
      startDate: parseDateKey('2026-04-01'),
      endDate: parseDateKey('2026-04-30'),
    });

    // Monday(4), Wednesday(5), Sunday(4) in Apr/2026 => 13
    expect(entries).toHaveLength(13);
    expect(entries.filter(e => e.subject_id === 'math')).toHaveLength(4);
    expect(entries.filter(e => e.subject_id === 'history')).toHaveLength(5);
    expect(entries.filter(e => e.subject_id === 'physics')).toHaveLength(4);
  });

  it('applies multiple months preserving range boundaries', () => {
    const { entries } = buildTemplateEntries({
      userId: 'u1',
      template,
      templateId: template.id,
      startDate: parseDateKey('2026-04-15'),
      endDate: parseDateKey('2026-06-14'),
    });

    expect(entries.length).toBeGreaterThan(20);
    expect(entries[0].date >= '2026-04-15').toBe(true);
    expect(entries[entries.length - 1].date <= '2026-06-14').toBe(true);
  });
});

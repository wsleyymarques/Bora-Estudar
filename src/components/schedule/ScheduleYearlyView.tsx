import React from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { buildYearlyMinutesSummary } from '@/features/schedule/selectors';
import { formatMinutesCompact } from '@/lib/duration-utils';
import { ScheduleEntry } from '@/types/study';

interface ScheduleYearlyViewProps {
  year: number;
  schedule?: ScheduleEntry[];
}

export function ScheduleYearlyView({ year, schedule }: ScheduleYearlyViewProps) {
  const { data } = useStudy();
  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const months = schedule
    ? monthNames.map((name, month) => {
        const monthEntries = schedule.filter((entry) => {
          const date = new Date(`${entry.date}T12:00:00`);
          return date.getFullYear() === year && date.getMonth() === month;
        });
        const totalMin = monthEntries.reduce((sum, entry) => sum + (entry.plannedMinutes || 0), 0);
        const studiedDays = new Set(monthEntries.map((entry) => entry.date)).size;
        return { name, totalMin, studiedDays };
      })
    : monthNames.map((name, month) => ({ name, ...buildYearlyMinutesSummary(year, data.sessions)[month] }));

  const maxMin = Math.max(...months.map((m) => m.totalMin), 1);

  return (
    <div className="workspace-panel p-3 md:p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {months.map((m) => (
        <div key={m.name} className="glass-card p-4 space-y-3">
          <p className="text-base font-display font-semibold text-foreground">{m.name}</p>
          <div className="w-full h-2.5 bg-muted rounded-full">
            <div className="h-full bg-primary rounded-full" style={{ width: `${(m.totalMin / maxMin) * 100}%` }} />
          </div>
          <div className="text-xs text-muted-foreground">
            {m.studiedDays} dias - {formatMinutesCompact(m.totalMin)}
          </div>
        </div>
      ))}
    </div>
  );
}


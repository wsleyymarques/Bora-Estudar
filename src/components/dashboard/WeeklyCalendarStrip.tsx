import React, { useMemo } from 'react';
import { CalendarDays, Flame } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useStudy } from '@/contexts/StudyContext';
import { toDateKey } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

export function WeeklyCalendarStrip({ className }: { className?: string }) {
  const { profile } = useAuth();
  const { getTotalMinutesForDate } = useStudy();

  const dailyGoal = profile?.daily_goal_minutes ?? 60;

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = toDateKey(date);
      const minutes = getTotalMinutesForDate(key);
      const progress = Math.min(Math.round((minutes / Math.max(dailyGoal, 1)) * 100), 100);
      const isToday = index === 6;

      return {
        key,
        label: date.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase(),
        day: date.getDate(),
        minutes,
        progress,
        isToday,
        isDone: minutes >= dailyGoal,
      };
    });
  }, [dailyGoal, getTotalMinutesForDate]);

  const weekMinutes = days.reduce((sum, item) => sum + item.minutes, 0);
  const weekProgress = Math.min(Math.round((weekMinutes / Math.max(dailyGoal * 7, 1)) * 100), 100);

  return (
    <section className={cn('rounded-[1.5rem] border border-border/70 bg-card/90 px-4 py-3 shadow-sm', className)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 text-primary" />
            Calendário semanal
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {weekProgress}% da meta semanal
          </p>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.28em] text-emerald-700/60">Constância</p>
          <p className="text-lg font-black text-foreground">
            {profile?.streak_current ?? 0}
            <span className="ml-1 text-sm font-semibold text-foreground/70">dias</span>
          </p>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-7 gap-2">
        {days.map((day) => (
          <div
            key={day.key}
            className={cn(
              'rounded-2xl border px-2 py-2 text-center transition-colors',
              day.isToday
                ? 'border-emerald-300 bg-emerald-50'
                : day.isDone
                  ? 'border-emerald-200 bg-emerald-50/70'
                  : 'border-border/60 bg-background/70',
            )}
          >
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-muted-foreground">{day.label}</p>
            <div className={cn(
              'mx-auto mt-2 flex h-8 w-8 items-center justify-center rounded-full text-xs font-black',
              day.isToday
                ? 'bg-emerald-600 text-white'
                : day.isDone
                  ? 'bg-emerald-100 text-emerald-700'
                  : 'bg-muted text-muted-foreground',
            )}>
              {day.day}
            </div>
            <div className="mt-2 h-1.5 rounded-full bg-black/5">
              <div className={cn('h-full rounded-full', day.isDone ? 'bg-emerald-500' : day.isToday ? 'bg-emerald-400' : 'bg-muted-foreground/30')} style={{ width: `${Math.max(day.progress, 8)}%` }} />
            </div>
            <p className="mt-1 text-[10px] font-semibold text-muted-foreground">{day.minutes}m</p>
          </div>
        ))}
      </div>

      <div className="mt-3 h-2 rounded-full bg-black/5">
        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${weekProgress}%` }} />
      </div>
    </section>
  );
}

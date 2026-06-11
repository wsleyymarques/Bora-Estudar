import React, { useMemo } from 'react';
import { Clock3 } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useStudy } from '@/contexts/StudyContext';
import { toDateKey } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

export function QuickMetricsCard({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { profile } = useAuth();
  const { data, getTotalMinutesForDate } = useStudy();

  const today = toDateKey(new Date());
  const todayMinutes = getTotalMinutesForDate(today);
  const dailyGoalMinutes = profile?.daily_goal_minutes ?? 60;
  const streakDays = profile?.streak_current ?? 0;
  const dailyPercent = Math.min(Math.round((todayMinutes / Math.max(dailyGoalMinutes, 1)) * 100), 100) || 0;

  const weekDates = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) => {
        const d = new Date();
        d.setDate(d.getDate() - (6 - index));
        return toDateKey(d);
      }),
    [],
  );

  const weekData = useMemo(
    () =>
      weekDates.map((date, index) => {
        const minutes = getTotalMinutesForDate(date);
        return {
          date,
          minutes,
          label: new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'narrow' }).replace('.', '').toUpperCase(),
          isToday: index === 6,
          isStudied: minutes > 0,
        };
      }),
    [getTotalMinutesForDate, weekDates],
  );

  const weekMinutes = weekData.reduce((acc, item) => acc + item.minutes, 0);
  const weeklyGoalHours = data.subjects.reduce((acc, subj) => acc + (subj.weeklyGoalHours || 0), 0) || 4;
  const weeklyGoalMinutes = weeklyGoalHours * 60;
  const weeklyPercent = Math.min(Math.round((weekMinutes / Math.max(weeklyGoalMinutes, 1)) * 100), 100) || 0;

  return (
    <section
      className={cn(
        compact
          ? 'relative flex h-full flex-col overflow-hidden rounded-[1.25rem] border border-[#ddd6c8] bg-[#fbfaf5] p-3 text-[#1f241f] shadow-[0_14px_30px_rgba(18,24,16,0.05)] dark:border-white/10 dark:bg-[#102017] dark:text-white'
          : 'relative flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-[#ddd6c8] bg-[#fbfaf5] p-4 text-[#1f241f] shadow-[0_18px_50px_rgba(18,24,16,0.06)] dark:border-white/10 dark:bg-[#102017] dark:text-white',
        className,
      )}
    >
      <div className={cn('flex items-start justify-between gap-3', compact && 'gap-2')}>
        <div className="min-w-0 space-y-1.5">
          <p className={cn('font-black uppercase tracking-[0.28em] text-black/45 dark:text-white/40', compact ? 'text-[9px]' : 'text-[10px]')}>
            Meta diária
          </p>

          <div className="flex items-end gap-1">
            <span className={cn('font-black leading-none tracking-tight text-[#121612] dark:text-white', compact ? 'text-3xl' : 'text-4xl sm:text-5xl')}>
              {dailyGoalMinutes}
            </span>
            <span className={cn('pb-1 font-semibold leading-none text-[#121612]/65 dark:text-white/70', compact ? 'text-sm' : 'text-xl')}>
              min
            </span>
          </div>

          <p className={cn('font-semibold text-[#4d544d] dark:text-white/72', compact ? 'text-[10px]' : 'text-xs')}>
            {Math.round(todayMinutes)} estudados hoje
          </p>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <div
            className={cn(
              'inline-flex items-center gap-2 rounded-full bg-emerald-100 font-bold text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200',
              compact ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs',
            )}
          >
            <Clock3 className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
            {streakDays} dias
          </div>

          <p className={cn('font-medium text-[#474e47] dark:text-white/72', compact ? 'hidden' : 'text-[11px]')}>
            meta semanal: {weeklyGoalHours}h
          </p>
        </div>
      </div>

      <div className={cn('space-y-1.5', compact ? 'mt-2' : 'mt-3')}>
        <div className="flex items-center justify-between gap-4 text-xs font-bold text-[#404840] dark:text-white/70">
          <span>
            {Math.round(todayMinutes)} / {dailyGoalMinutes} min
          </span>
          <span>{dailyPercent}%</span>
        </div>

        <div className="h-1 rounded-full bg-black/10 dark:bg-white/10">
          <div
            className="h-full rounded-full bg-[#2f9e74] transition-all dark:bg-emerald-400"
            style={{ width: `${dailyPercent}%` }}
          />
        </div>
      </div>

      {!compact ? (
        <>
          <div className="mt-3 flex items-end justify-between gap-1">
            {weekData.map((item) => (
              <div key={item.date} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className={cn(
                    'flex h-3.5 w-3.5 items-center justify-center rounded-full transition-all',
                    item.isToday
                      ? 'bg-emerald-500 ring-4 ring-emerald-500/20'
                      : item.isStudied
                        ? 'bg-emerald-500'
                        : 'bg-black/15 dark:bg-white/20',
                  )}
                  title={`${item.label}: ${item.minutes}m`}
                />
                <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#676d67] dark:text-white/55">
                  {item.label}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs font-semibold text-[#444a44] dark:text-white/70">
            <span>
              {weekMinutes} / {weeklyGoalMinutes} min
            </span>
            <span>{weeklyPercent}%</span>
          </div>

          <div className="mt-2 h-1.5 rounded-full bg-black/8 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-300 via-emerald-500 to-lime-400"
              style={{ width: `${weeklyPercent}%` }}
            />
          </div>
        </>
      ) : null}
    </section>
  );
}

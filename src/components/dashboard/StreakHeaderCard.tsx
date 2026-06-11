import React, { useMemo } from 'react';
import { Flame } from 'lucide-react';

import { useAuth } from '@/contexts/AuthContext';
import { useStudy } from '@/contexts/StudyContext';
import { toDateKey } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

export function StreakHeaderCard({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { profile } = useAuth();
  const { getTotalMinutesForDate } = useStudy();

  const dailyGoalMinutes = profile?.daily_goal_minutes ?? 60;
  const streak = profile?.streak_current ?? 0;

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - index));
      const key = toDateKey(date);
      const minutes = getTotalMinutesForDate(key);

      return {
        key,
        isToday: index === 6,
        isDone: minutes >= dailyGoalMinutes,
      };
    });
  }, [dailyGoalMinutes, getTotalMinutesForDate]);

  if (compact) {
    return (
      <div
        className={cn(
          'flex h-full min-h-[7.5rem] flex-col rounded-[1.25rem] border border-emerald-200/80 bg-gradient-to-b from-emerald-50/90 to-emerald-50/70 px-3 py-2.5 shadow-[0_14px_30px_rgba(18,24,16,0.05)] backdrop-blur',
          'dark:border-emerald-400/20 dark:from-[#0b1f15] dark:to-[#07120d] dark:text-white dark:shadow-[0_12px_32px_rgba(0,0,0,0.35)]',
          className,
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex h-[34px] w-[34px] items-center justify-center rounded-2xl bg-emerald-100 text-amber-500 shadow-inner dark:bg-emerald-400/10 dark:text-amber-300 dark:ring-1 dark:ring-emerald-300/10">
              <Flame className="h-[18px] w-[18px] drop-shadow-[0_0_8px_rgba(251,146,60,0.28)]" />
            </div>

            <div className="min-w-0">
              <p className="text-[8px] font-black uppercase tracking-[0.34em] text-emerald-700/60 dark:text-emerald-300/80">
                Constância
              </p>
              <p className="mt-0.5 text-[1.35rem] font-black leading-none text-foreground dark:text-white">
                {streak}
                <span className="ml-1 text-xs font-semibold text-foreground/70 dark:text-white/80">
                  dias
                </span>
              </p>
            </div>
          </div>

          <div className="rounded-full border border-emerald-200 bg-white/75 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.18em] text-emerald-700 dark:border-emerald-300/20 dark:bg-emerald-300/10 dark:text-emerald-200">
            Hoje
          </div>
        </div>

        <div className="mt-auto pt-3">
          <div className="rounded-full border border-emerald-200 bg-white/75 px-2.5 py-2 dark:border-emerald-300/20 dark:bg-white/10">
            <div className="flex items-center justify-between gap-1.5">
              {days.map((day) => (
                <span
                  key={day.key}
                  title={day.isToday ? 'Hoje' : day.isDone ? 'Dia estudado' : 'Sem estudo'}
                  className={cn(
                    'h-2.5 w-2.5 rounded-full transition-colors',
                    day.isToday
                      ? 'bg-amber-500 ring-2 ring-amber-200 dark:bg-amber-300 dark:ring-amber-300/30'
                      : day.isDone
                        ? 'bg-amber-400 dark:bg-emerald-300'
                        : 'bg-emerald-900/15 dark:bg-emerald-50/20',
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-full border border-emerald-200/80 bg-emerald-50/80 px-4 py-1.5 shadow-sm backdrop-blur dark:border-emerald-400/20 dark:bg-[#07120d]/90 dark:shadow-[0_12px_32px_rgba(0,0,0,0.35)]',
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-100 text-amber-500 shadow-inner dark:bg-emerald-400/10 dark:text-amber-300">
          <Flame className="h-[18px] w-[18px] drop-shadow-[0_0_8px_rgba(251,146,60,0.28)]" />
        </div>
        <div className="min-w-0 text-right">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-emerald-700/60 dark:text-emerald-300/80">
            Constância
          </p>
          <p className="text-base font-black leading-none text-foreground dark:text-white">
            {streak}
            <span className="ml-1 text-sm font-semibold text-foreground/70 dark:text-white/80">
              dias
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white/70 px-3 py-1.5 dark:border-emerald-300/20 dark:bg-white/10">
        {days.map((day) => (
          <span
            key={day.key}
            title={day.isToday ? 'Hoje' : day.isDone ? 'Dia estudado' : 'Sem estudo'}
            className={cn(
              'h-2.5 w-2.5 rounded-full transition-colors',
              day.isToday
                ? 'bg-amber-500 ring-2 ring-amber-200 dark:bg-amber-300 dark:ring-amber-300/30'
                : day.isDone
                  ? 'bg-amber-400 dark:bg-emerald-300'
                  : 'bg-emerald-900/15 dark:bg-emerald-50/20',
            )}
          />
        ))}
      </div>
    </div>
  );
}

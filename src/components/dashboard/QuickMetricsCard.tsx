import React, { useMemo } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { toDateKey } from '@/lib/date-utils';
import { formatMinutesCompact } from '@/lib/duration-utils';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export function QuickMetricsCard({ className }: { className?: string }) {
  const { data, getTotalMinutesForDate } = useStudy();

  const today = toDateKey(new Date());
  const todayMinutes = getTotalMinutesForDate(today);
  
  // Daily Goal
  const todaySchedule = data.schedule.filter(s => s.date === today);
  const dailyGoalMinutes = todaySchedule.reduce((acc, curr) => acc + (curr.plannedMinutes || 0), 0) || 120;
  const dailyPercent = Math.min(Math.round((todayMinutes / dailyGoalMinutes) * 100), 100) || 0;

  // Weekly Goal
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - index));
    return toDateKey(d);
  }), []);
  
  const weekMinutes = weekDates.reduce((acc, date) => acc + getTotalMinutesForDate(date), 0);
  const weeklyGoalHours = data.subjects.reduce((acc, subj) => acc + (subj.weeklyGoalHours || 0), 0) || 28;
  const weeklyGoalMinutes = weeklyGoalHours * 60;

  // For the circular progress (donut)
  const circleRadius = 36;
  const circleCircumference = 2 * Math.PI * circleRadius;
  const strokeDashoffset = circleCircumference - (dailyPercent / 100) * circleCircumference;

  return (
    <div className={cn("grid grid-cols-2 gap-3 sm:gap-4", className)}>
      {/* Daily Goal Card */}
      <div className="bg-[#facc15] text-black rounded-3xl p-4 sm:p-5 flex flex-col justify-between shadow-sm relative overflow-hidden">
        <div>
          <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-black/60">Meta Diária</h4>
          <div className="flex items-baseline gap-0.5 mt-1 sm:mt-2">
            <span className="text-3xl sm:text-4xl font-black tracking-tight">{dailyGoalMinutes}</span>
            <span className="text-sm font-bold">m</span>
          </div>
          <p className="text-[11px] sm:text-xs font-semibold text-black/70 mt-1">
            {Math.floor(todayMinutes)}m estudados hoje
          </p>
        </div>
        
        <div className="mt-4 sm:mt-6 w-full h-1.5 bg-black/15 rounded-full overflow-hidden">
          <div 
            className="h-full bg-black/60 rounded-full" 
            style={{ width: `${dailyPercent}%` }}
          />
        </div>
      </div>

      {/* Weekly Goal Card */}
      <div className="bg-card text-card-foreground rounded-3xl p-4 sm:p-5 flex flex-col justify-between border border-border/50 shadow-sm">
        <div>
          <h4 className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground">Meta Semanal</h4>
          <div className="flex items-baseline gap-0.5 mt-1 sm:mt-2">
            <span className="text-3xl sm:text-4xl font-black tracking-tight">{weeklyGoalHours}</span>
            <span className="text-sm font-bold">h</span>
          </div>
          <p className="text-[11px] sm:text-xs font-semibold text-muted-foreground mt-1">
            {Math.floor(weekMinutes / 60)}h / {weeklyGoalHours}h concluídas
          </p>
        </div>
        
        <div className="mt-4 sm:mt-6 w-full h-1.5 bg-muted rounded-full overflow-hidden">
          <div 
            className="h-full bg-amber-500 rounded-full" 
            style={{ width: `${Math.min(Math.round((weekMinutes / weeklyGoalMinutes) * 100), 100)}%` }}
          />
        </div>
      </div>
    </div>
  );
}

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
    <div className={cn("bg-card border border-border/50 text-card-foreground rounded-3xl p-6 shadow-sm flex flex-col relative", className)}>
      <div className="flex justify-between items-start mb-6">
        <h3 className="text-lg font-black tracking-tight">Métricas Rápidas</h3>
        <span className="text-xs font-bold text-muted-foreground">
          Estudado Hoje: {Math.floor(todayMinutes)}m / {dailyGoalMinutes}m
        </span>
      </div>

      <div className="flex items-center gap-6 flex-1">
        {/* Circular Progress */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg width="96" height="96" className="transform -rotate-90">
            <circle
              cx="48"
              cy="48"
              r={circleRadius}
              className="stroke-muted"
              strokeWidth="10"
              fill="transparent"
            />
            <circle
              cx="48"
              cy="48"
              r={circleRadius}
              className="stroke-green-500 transition-all duration-1000 ease-in-out"
              strokeWidth="10"
              strokeLinecap="round"
              fill="transparent"
              strokeDasharray={circleCircumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-black">{dailyGoalMinutes}</span>
          </div>
        </div>

        {/* Linear Progress */}
        <div className="flex-1 space-y-2">
          <h4 className="text-base font-bold">Meta Diária de Estudo</h4>
          <Progress value={dailyPercent} className="h-3" indicatorClassName="bg-green-500" />
          <p className="text-xs font-bold text-muted-foreground pt-1">
            Meta Semanal: {Math.floor(weekMinutes / 60)}h / {weeklyGoalHours}h
          </p>
        </div>
      </div>
    </div>
  );
}

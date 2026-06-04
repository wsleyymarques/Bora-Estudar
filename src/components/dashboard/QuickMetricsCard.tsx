import React, { useMemo } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { toDateKey } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

const DonutChart = ({ percent, value, unit }: { percent: number, value: string | number, unit: string }) => {
  const size = 84;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center shrink-0" style={{ width: size, height: size }}>
      {/* Inner shaded circle */}
      <div 
        className="absolute rounded-full z-0 bg-primary-foreground/10" 
        style={{ 
          width: size - strokeWidth * 2 + 1,
          height: size - strokeWidth * 2 + 1, 
        }} 
      />
      <svg width={size} height={size} className="transform -rotate-90 z-10">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-primary-foreground/20"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          className="stroke-primary-foreground/90 transition-all duration-1000 ease-out"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-1 z-20">
        <span className="text-[19px] font-black leading-none text-primary-foreground/90 tracking-tight">{value}</span>
        <span className="text-[9px] font-bold text-primary-foreground/70 leading-[1.1] mt-0.5 max-w-[50px] tracking-wide">
          {unit.split(' ').map((word, i) => (
            <React.Fragment key={i}>
              {word}
              {i < unit.split(' ').length - 1 && <br />}
            </React.Fragment>
          ))}
        </span>
      </div>
    </div>
  );
};

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
  const weeklyPercent = Math.min(Math.round((weekMinutes / weeklyGoalMinutes) * 100), 100) || 0;

  return (
    <div className={cn("bg-primary text-primary-foreground rounded-[2rem] p-5 sm:p-6 flex flex-col justify-between shadow-sm relative overflow-hidden", className)}>
      <div className="flex items-center justify-between w-full z-10">
        
        {/* Left: Daily Goal */}
        <div className="flex flex-col items-start">
          <h4 className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest text-primary-foreground/70 mb-1">
            Meta Diária
          </h4>
          <div className="flex items-baseline gap-0.5 text-primary-foreground">
            <span className="text-5xl sm:text-6xl font-black tracking-tighter leading-none">{dailyGoalMinutes}</span>
            <span className="text-xl sm:text-2xl font-bold leading-none">m</span>
          </div>
          <p className="text-xs sm:text-sm font-semibold text-primary-foreground/80 mt-1">
            {Math.floor(todayMinutes)}m estudados hoje
          </p>
        </div>

        {/* Right: Weekly Goal Donut */}
        <div className="flex flex-col items-center justify-center shrink-0">
          <DonutChart 
            percent={weeklyPercent} 
            value={`${weeklyGoalHours}h`} 
            unit="meta semanal" 
          />
        </div>

      </div>
      
      {/* Bottom: Linear Progress Bar for Daily Goal */}
      <div className="mt-5 w-full h-2 bg-primary-foreground/20 rounded-full overflow-hidden z-10">
        <div 
          className="h-full bg-primary-foreground/90 rounded-full transition-all duration-1000 ease-out" 
          style={{ width: `${dailyPercent}%` }}
        />
      </div>
    </div>
  );
}

import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ScheduleShellViewOption {
  key: string;
  label: string;
  icon?: React.ReactNode;
}

interface ScheduleShellProps {
  title: string;
  description: string;
  view: string;
  views: ScheduleShellViewOption[];
  currentLabel: React.ReactNode;
  onViewChange: (view: string) => void;
  onNavigate: (direction: number) => void;
  className?: string;
  children: React.ReactNode;
}

export function ScheduleShell({
  title,
  description,
  view,
  views,
  currentLabel,
  onViewChange,
  onNavigate,
  className,
  children,
}: ScheduleShellProps) {
  return (
    <section className={cn('space-y-4', className)}>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-3xl font-display font-bold">{title}</h2>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
        <div className="calendar-toolbar w-fit">
          {views.map((viewOption) => (
            <button
              key={viewOption.key}
              type="button"
              onClick={() => onViewChange(viewOption.key)}
              className={`calendar-chip ${view === viewOption.key ? 'calendar-chip-active' : 'text-muted-foreground hover:text-foreground'}`}
            >
              {viewOption.icon}
              {viewOption.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => onNavigate(-1)}
            className="h-10 w-10 rounded-full border border-border/60 hover:bg-muted transition-colors flex items-center justify-center"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <span className="text-sm md:text-base font-semibold text-foreground min-w-[150px] text-center capitalize">
            {currentLabel}
          </span>
          <button
            type="button"
            onClick={() => onNavigate(1)}
            className="h-10 w-10 rounded-full border border-border/60 hover:bg-muted transition-colors flex items-center justify-center"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      {children}
    </section>
  );
}


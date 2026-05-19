import React, { useMemo } from 'react';
import { CheckCircle2, Clock3, PauseCircle, Target } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMinutesCompact } from '@/lib/duration-utils';

interface DayAnalysisSummaryProps {
  completedCount: number;
  totalCount: number;
  plannedMinutes: number;
  executedMinutes: number;
  pauseMinutes: number;
  targetMinutes?: number;
  className?: string;
}

export function DayAnalysisSummary({
  completedCount,
  totalCount,
  plannedMinutes,
  executedMinutes,
  pauseMinutes,
  targetMinutes,
  className,
}: DayAnalysisSummaryProps) {
  const checklistPercent = useMemo(() => {
    if (totalCount <= 0) return 0;
    return Math.min(100, Math.round((completedCount / totalCount) * 100));
  }, [completedCount, totalCount]);

  const adherencePercent = useMemo(() => {
    if (plannedMinutes <= 0) return undefined;
    return Math.round((executedMinutes / plannedMinutes) * 100);
  }, [plannedMinutes, executedMinutes]);

  const targetDelta = targetMinutes === undefined ? undefined : targetMinutes - executedMinutes;

  return (
    <div className={cn('rounded-xl border border-border/60 bg-background/70 p-3 space-y-2.5', className)}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.11em]">Analise do dia</p>
          <p className="text-[11px] text-muted-foreground">Visao rapida para decidir a proxima acao</p>
        </div>
        <span className="rounded-md bg-muted px-2 py-1 text-[11px] text-muted-foreground">
          Checklist {completedCount}/{totalCount}
        </span>
      </div>

      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${checklistPercent}%` }} />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
        <div className="rounded-md bg-muted/40 px-2.5 py-2 text-muted-foreground">
          <p className="inline-flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Checklist
          </p>
          <p className="text-foreground font-semibold">{checklistPercent}%</p>
        </div>

        <div className="rounded-md bg-muted/40 px-2.5 py-2 text-muted-foreground">
          <p className="inline-flex items-center gap-1">
            <Target className="w-3.5 h-3.5" />
            Planejado
          </p>
          <p className="text-foreground font-semibold">{formatMinutesCompact(plannedMinutes)}</p>
        </div>

        <div className="rounded-md bg-muted/40 px-2.5 py-2 text-muted-foreground">
          <p className="inline-flex items-center gap-1">
            <Clock3 className="w-3.5 h-3.5" />
            Executado
          </p>
          <p className="text-foreground font-semibold">{formatMinutesCompact(executedMinutes)}</p>
        </div>

        <div className="rounded-md bg-muted/40 px-2.5 py-2 text-muted-foreground">
          <p className="inline-flex items-center gap-1">
            <PauseCircle className="w-3.5 h-3.5" />
            Pausas
          </p>
          <p className="text-foreground font-semibold">{formatMinutesCompact(pauseMinutes)}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
        <span className="rounded-md bg-muted px-1.5 py-0.5">
          Aderencia {adherencePercent !== undefined ? `${adherencePercent}%` : '--'}
        </span>
        <span className="rounded-md bg-muted px-1.5 py-0.5">
          Meta do dia {formatMinutesCompact(targetMinutes)}
        </span>
        {targetDelta !== undefined ? (
          <span className="rounded-md bg-muted px-1.5 py-0.5">
            Delta meta x feito {formatMinutesCompact(targetDelta)}
          </span>
        ) : null}
      </div>
    </div>
  );
}

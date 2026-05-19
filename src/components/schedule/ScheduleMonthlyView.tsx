import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { DAY_NAMES_SHORT, Note, ScheduleDayPlan, ScheduleEntry, StudySession, StudySessionPause, Subject } from '@/types/study';
import { buildMonthlyCells } from '@/features/schedule/selectors';
import { useStudy } from '@/contexts/StudyContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { formatMinutesCompact } from '@/lib/duration-utils';
import { toDateKey } from '@/lib/date-utils';

interface ScheduleMonthlyViewProps {
  currentDate: Date;
  onDayClick: (date: string) => void;
  schedule?: ScheduleEntry[];
  sessions?: StudySession[];
  notes?: Note[];
  dayPlans?: ScheduleDayPlan[];
  sessionPauses?: StudySessionPause[];
  getSubjectById?: (subjectId: string) => Subject | undefined;
}

export function ScheduleMonthlyView({
  currentDate,
  onDayClick,
  schedule,
  sessions,
  notes,
  dayPlans,
  sessionPauses,
  getSubjectById,
}: ScheduleMonthlyViewProps) {
  const { data, getSubject } = useStudy();
  const isMobile = useIsMobile();
  const resolvedSchedule = schedule ?? data.schedule;
  const resolvedSessions = sessions ?? data.sessions;
  const resolvedNotes = notes ?? data.notes;
  const resolvedDayPlans = dayPlans ?? data.dayPlans;
  const resolvedSessionPauses = sessionPauses ?? data.sessionPauses;
  const resolvedGetSubject = getSubjectById ?? getSubject;
  const cells = buildMonthlyCells(currentDate, resolvedSchedule, resolvedSessions, resolvedNotes, resolvedDayPlans, resolvedSessionPauses);
  const today = toDateKey(new Date());
  const monthCells = useMemo(() => cells.filter((cell) => cell.inCurrentMonth), [cells]);
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const todayCell = cells.find((cell) => cell.date === today && cell.inCurrentMonth);
    if (todayCell) return todayCell.date;
    return monthCells[0]?.date || cells[0]?.date || today;
  });

  useEffect(() => {
    if (!cells.some((cell) => cell.date === selectedDate)) {
      const next = monthCells[0]?.date || cells[0]?.date;
      if (next) setSelectedDate(next);
    }
  }, [cells, monthCells, selectedDate]);

  if (isMobile) {
    const selectedCell = cells.find((cell) => cell.date === selectedDate) || monthCells[0] || cells[0];
    const selectedMainSubjects = selectedCell?.entries.filter((entry) => !entry.optional) || [];
    const selectedOptionalSubjects = selectedCell?.entries.filter((entry) => entry.optional) || [];

    return (
      <div className="workspace-panel p-2.5 space-y-3">
        <div className="grid grid-cols-7 gap-1">
          {DAY_NAMES_SHORT.map((dayName) => (
            <div key={dayName} className="text-[10px] text-muted-foreground text-center font-semibold py-1 uppercase tracking-[0.08em]">
              {dayName}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell) => {
            const isToday = cell.date === today;
            const isSelected = cell.date === selectedCell?.date;
            const hasStudy = cell.stats.total > 0 || cell.stats.minutes > 0;

            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => setSelectedDate(cell.date)}
                className={`relative aspect-square rounded-xl border p-1 transition-all focus:outline-none ${cell.inCurrentMonth ? 'bg-card border-border/70' : 'bg-muted/25 border-border/40 text-muted-foreground'} ${isSelected ? 'ring-2 ring-primary/55 border-primary/50 shadow-sm' : ''}`}
              >
                <span className={`text-xs font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>{cell.day}</span>
                <div className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${cell.stats.total > 0 ? 'bg-primary/80' : 'bg-muted'}`} />
                  <span className={`h-1.5 w-1.5 rounded-full ${cell.stats.hasPending ? 'bg-warning' : 'bg-muted'}`} />
                  <span className={`h-1.5 w-1.5 rounded-full ${cell.stats.hasObservation ? 'bg-info' : 'bg-muted'}`} />
                </div>
                {hasStudy && (
                  <span className="absolute top-1 right-1 text-[9px] text-muted-foreground tabular-nums">{cell.stats.completed}/{cell.stats.total}</span>
                )}
              </button>
            );
          })}
        </div>

        {selectedCell && (
          <div className="rounded-xl border border-border/70 bg-card/75 p-3 space-y-2.5">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground capitalize">
                  {new Date(`${selectedCell.date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {selectedCell.stats.completed}/{selectedCell.stats.total} concluidas â€¢ feito {formatMinutesCompact(selectedCell.stats.minutes)}
                </p>
              </div>
              <Button variant="outline" size="sm" className="h-8 rounded-full px-3 text-[11px]" onClick={() => onDayClick(selectedCell.date)}>
                Abrir dia
              </Button>
            </div>

            {(selectedCell.stats.plannedMinutes > 0 || selectedCell.stats.dayTargetMinutes !== undefined) && (
              <p className="text-[11px] text-muted-foreground">
                {selectedCell.stats.plannedMinutes > 0 ? `Planejado ${formatMinutesCompact(selectedCell.stats.plannedMinutes)}` : 'Planejado --'}{' '}
                â€¢ {selectedCell.stats.dayTargetMinutes !== undefined ? `Meta ${formatMinutesCompact(selectedCell.stats.dayTargetMinutes)}` : 'Meta --'}
              </p>
            )}

            {(selectedMainSubjects.length > 0 || selectedOptionalSubjects.length > 0) ? (
              <div className="space-y-1.5">
                {selectedMainSubjects.map((entry) => {
                  const subject = resolvedGetSubject(entry.subjectId);
                  return (
                    <div key={entry.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/85 px-2.5 py-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: subject?.color }} />
                      <p className="text-xs text-foreground truncate flex-1">{subject?.name || 'Materia'}</p>
                      <span className="text-[11px] text-muted-foreground tabular-nums">{entry.startTime || '--:--'}</span>
                    </div>
                  );
                })}
                {selectedOptionalSubjects.map((entry) => {
                  const subject = resolvedGetSubject(entry.subjectId);
                  return (
                    <div key={entry.id} className="flex items-center gap-2 rounded-lg border border-dashed border-border/70 bg-background/70 px-2.5 py-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: subject?.color }} />
                      <p className="text-xs text-foreground truncate flex-1">{subject?.name || 'Materia'}</p>
                      <span className="text-[10px] text-muted-foreground">Opcional</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border/70 px-3 py-3 text-center">
                Sem materias planejadas neste dia.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="workspace-panel p-2 md:p-3 space-y-2">
      <div className="grid grid-cols-7 gap-1.5 md:gap-2">
        {DAY_NAMES_SHORT.map((dayName) => (
          <div key={dayName} className="text-xs text-muted-foreground text-center font-semibold py-2 uppercase tracking-wide">{dayName}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map((cell) => {
          const isToday = cell.date === today;
          const done = cell.stats.total > 0 && cell.stats.completed === cell.stats.total;
          const main = cell.entries.filter((e) => !e.optional);
          const subjects = main.slice(0, 2).map((e) => resolvedGetSubject(e.subjectId)?.name).filter(Boolean) as string[];
          const extraSubjects = Math.max(main.length - 2, 0);

          return (
            <button
              key={cell.date}
              onClick={() => onDayClick(cell.date)}
              className={`text-left rounded-xl border p-2 md:p-2.5 min-h-[120px] md:min-h-[132px] transition-all hover:shadow-md hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40 ${cell.inCurrentMonth ? 'bg-card border-border/70' : 'bg-muted/30 border-border/40 text-muted-foreground'} ${isToday ? 'ring-2 ring-primary/50 border-primary/40' : ''}`}
            >
              <div className="flex items-start justify-between">
                <span className={`text-sm font-semibold ${isToday ? 'text-primary' : ''}`}>{cell.day}</span>
                <div className="flex items-center gap-1">
                  <span className={`h-2 w-2 rounded-full ${done ? 'bg-success' : 'bg-muted'}`} title="Concluido" />
                  <span className={`h-2 w-2 rounded-full ${cell.stats.hasPending ? 'bg-amber-500' : 'bg-muted'}`} title="Pendencias" />
                  <span className={`h-2 w-2 rounded-full ${cell.stats.hasObservation ? 'bg-blue-500' : 'bg-muted'}`} title="Observacoes" />
                </div>
              </div>

              {cell.stats.total > 0 && (
                <div className="mt-2">
                  <div className="w-full h-1.5 bg-muted rounded-full">
                    <div className="h-full bg-primary/70 rounded-full" style={{ width: `${(cell.stats.completed / cell.stats.total) * 100}%` }} />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">{cell.stats.completed}/{cell.stats.total} concluidas</p>
                </div>
              )}

              <div className="mt-2 space-y-1">
                {subjects.map((name) => (
                  <p key={name} className="text-xs text-foreground truncate">{name}</p>
                ))}
                {extraSubjects > 0 && <p className="text-[11px] text-muted-foreground">+{extraSubjects} materias</p>}
                {cell.stats.minutes > 0 && <p className="text-[11px] text-muted-foreground">{formatMinutesCompact(cell.stats.minutes)}</p>}
                {cell.stats.plannedMinutes > 0 && <p className="text-[11px] text-muted-foreground">plan {formatMinutesCompact(cell.stats.plannedMinutes)}</p>}
                {cell.stats.dayTargetMinutes !== undefined && <p className="text-[11px] text-muted-foreground">meta {formatMinutesCompact(cell.stats.dayTargetMinutes)}</p>}
                {cell.stats.hasAnyStartTime && <p className="text-[11px] text-muted-foreground">com horarios</p>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}


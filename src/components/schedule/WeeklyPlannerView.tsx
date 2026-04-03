import React from 'react';
import { ScheduleEntry } from '@/types/study';
import { useStudy } from '@/contexts/StudyContext';
import { addDays, getMonday, toDateKey } from '@/lib/date-utils';
import { getDayStats } from '@/features/schedule/selectors';
import { formatMinutesCompact } from '@/lib/duration-utils';
import { WeeklyTimeGrid } from '@/components/generic/weekly-time-grid';
import { WeeklyMobileAgenda } from '@/components/generic/weekly-mobile-agenda';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ArrowRightLeft, FileText, MoreHorizontal, Plus, Trash2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { getSessionActualMinutes } from '@/features/tracker/session-metrics';

interface WeeklyPlannerViewProps {
  currentDate: Date;
  onAdd: (d: string) => void;
  onNote: (d: string) => void;
  onMove: (entry: ScheduleEntry) => void;
  onChange: (entry: ScheduleEntry) => void;
  onRemove: (id: string) => void;
  onOpenDay: (date: string) => void;
  onEditDay?: (date: string) => void;
}

export default function WeeklyPlannerView({
  currentDate,
  onAdd,
  onNote,
  onMove,
  onChange,
  onRemove,
  onOpenDay,
}: WeeklyPlannerViewProps) {
  const isMobile = useIsMobile();

  const { data, getScheduleForDate, getSubject, toggleScheduleComplete } = useStudy();

  const monday = React.useMemo(() => getMonday(currentDate), [currentDate]);
  const days = React.useMemo(
    () => Array.from({ length: 7 }, (_, i) => toDateKey(addDays(monday, i))),
    [monday],
  );
  const today = toDateKey(new Date());
  const [selectedDayKey, setSelectedDayKey] = React.useState<string>(() =>
    days.includes(today) ? today : days[0],
  );

  React.useEffect(() => {
    const defaultDay = days.includes(today) ? today : days[0];
    if (!selectedDayKey || !days.includes(selectedDayKey)) {
      setSelectedDayKey(defaultDay);
    }
  }, [days, selectedDayKey, today]);

  const dayRows = days.map((date) => {
    const entries = getScheduleForDate(date);
    const stats = getDayStats(data.schedule, data.sessions, data.notes, data.dayPlans, date, data.sessionPauses);
    const dateObj = new Date(`${date}T12:00:00`);

    const dayTarget = stats.dayTargetMinutes;
    const planned = stats.plannedMinutes;
    const metaParts = [
      dayTarget !== undefined ? `Meta ${formatMinutesCompact(dayTarget)}` : undefined,
      planned > 0 ? `Plan ${formatMinutesCompact(planned)}` : undefined,
      stats.minutes > 0 ? `Feito ${formatMinutesCompact(stats.minutes)}` : undefined,
    ].filter(Boolean);

    return {
      key: date,
      weekdayLabel: dateObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '').toUpperCase(),
      dateLabel: dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
      isToday: date === today,
      status: {
        done: entries.length > 0 && stats.completed === entries.length,
        pending: stats.hasPending,
        observation: stats.hasObservation,
      },
      metaLabel: metaParts.join(' • '),
      onClick: () => onOpenDay(date),
      actions: (
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onAdd(date);
            }}
            className="h-6 w-6 rounded-md border border-border/70 bg-background/80 flex items-center justify-center text-muted-foreground hover:text-foreground"
            title="Adicionar materia"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onNote(date);
            }}
            className="h-6 w-6 rounded-md border border-border/70 bg-background/80 flex items-center justify-center text-muted-foreground hover:text-foreground"
            title="Observacao"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>
        </div>
      ),
    };
  });

  const events = days.flatMap((date) => {
    const entries = getScheduleForDate(date);
    const executedBySubject = data.sessions
      .filter((session) => session.date === date && session.isFocusSession !== false)
      .reduce<Record<string, number>>((acc, session) => {
        acc[session.subjectId] = (acc[session.subjectId] || 0) + getSessionActualMinutes(session);
        return acc;
      }, {});

    return entries.map((entry) => {
      const subject = getSubject(entry.subjectId);
      const subjectExecuted = executedBySubject[entry.subjectId] || 0;
      const subtitleParts = [
        entry.plannedMinutes ? `Meta ${formatMinutesCompact(entry.plannedMinutes)}` : undefined,
        subjectExecuted > 0 ? `Feito ${formatMinutesCompact(subjectExecuted)}` : undefined,
      ].filter(Boolean);

      return {
        id: entry.id,
        dayKey: date,
        title: subject?.name || 'Materia',
        subtitle: subtitleParts.join(' • ') || undefined,
        startTime: entry.startTime,
        durationMinutes: entry.plannedMinutes ?? 60,
        badgeLabel: entry.optional ? 'Opcional' : undefined,
        optional: entry.optional,
        completed: entry.completed,
        color: subject?.color,
        onClick: () => onOpenDay(date),
        onToggleComplete: () => {
          void toggleScheduleComplete(entry.id);
        },
        actions: (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60" title="Mais acoes">
                <MoreHorizontal className="w-3.5 h-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onMove(entry)}>
                Mover
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onChange(entry)}>
                <ArrowRightLeft className="w-4 h-4 mr-2" />Trocar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onRemove(entry.id)} className="text-destructive focus:text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />Remover
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ),
      };
    });
  });

  return (
    <div className="flex h-full min-h-[420px] flex-col gap-2 w-full min-w-0 max-w-full">
      {isMobile ? (
        <WeeklyMobileAgenda
          days={dayRows}
          events={events}
          selectedDayKey={selectedDayKey}
          onSelectDay={setSelectedDayKey}
          className="flex-1 min-h-0"
        />
      ) : (
        <WeeklyTimeGrid
          days={dayRows}
          events={events}
          startHour={7}
          endHour={22}
          slotMinutes={30}
          className="flex-1 min-h-0"
        />
      )}
    </div>
  );
}

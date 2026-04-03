import React, { useMemo } from 'react';
import { CalendarDays, CheckCircle2, Circle, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { WeeklyTimeGridDay, WeeklyTimeGridEvent } from '@/components/generic/weekly-time-grid';

interface WeeklyMobileAgendaProps {
  days: WeeklyTimeGridDay[];
  events: WeeklyTimeGridEvent[];
  selectedDayKey: string;
  onSelectDay: (dayKey: string) => void;
  className?: string;
  emptyMessage?: string;
}

interface NormalizedEvent extends WeeklyTimeGridEvent {
  normalizedStartMinutes?: number;
}

function parseTimeToMinutes(value?: string): number | undefined {
  if (!value) return undefined;
  const [hour, minute] = value.split(':').map(Number);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return undefined;
  return hour * 60 + minute;
}

function formatTime(value: number): string {
  const hour = Math.floor(value / 60)
    .toString()
    .padStart(2, '0');
  const minute = (value % 60).toString().padStart(2, '0');
  return `${hour}:${minute}`;
}

function getEventTimeLabel(event: NormalizedEvent): string {
  if (event.startTime) return event.startTime;
  if (event.normalizedStartMinutes !== undefined) return formatTime(event.normalizedStartMinutes);
  return 'Sem horario';
}

export function WeeklyMobileAgenda({
  days,
  events,
  selectedDayKey,
  onSelectDay,
  className,
  emptyMessage = 'Sem materias nesse dia',
}: WeeklyMobileAgendaProps) {
  const eventsByDay = useMemo(() => {
    const result = new Map<string, { timed: NormalizedEvent[]; untimed: NormalizedEvent[] }>();

    for (const day of days) {
      result.set(day.key, { timed: [], untimed: [] });
    }

    for (const event of events) {
      const dayBucket = result.get(event.dayKey);
      if (!dayBucket) continue;

      const startMinutes = event.startMinutes ?? parseTimeToMinutes(event.startTime);
      if (startMinutes === undefined) {
        dayBucket.untimed.push(event);
        continue;
      }

      dayBucket.timed.push({
        ...event,
        normalizedStartMinutes: startMinutes,
      });
    }

    for (const bucket of result.values()) {
      bucket.timed.sort((a, b) => {
        const startA = a.normalizedStartMinutes ?? 0;
        const startB = b.normalizedStartMinutes ?? 0;
        if (startA !== startB) return startA - startB;
        return a.title.localeCompare(b.title, 'pt-BR');
      });
      bucket.untimed.sort((a, b) => a.title.localeCompare(b.title, 'pt-BR'));
    }

    return result;
  }, [days, events]);

  const selectedDay = days.find((day) => day.key === selectedDayKey) || days[0];
  const selectedEvents = selectedDay ? eventsByDay.get(selectedDay.key) : undefined;
  const timedEvents = selectedEvents?.timed || [];
  const untimedEvents = selectedEvents?.untimed || [];
  const allEvents = [...timedEvents, ...untimedEvents];

  return (
    <div className={cn('workspace-panel p-3 space-y-3', className)}>
      <div className="overflow-x-auto -mx-1 px-1 pb-1">
        <div className="flex w-max min-w-full gap-2">
          {days.map((day) => {
            const stats = day.status || {};
            const dayEvents = eventsByDay.get(day.key);
            const eventCount = (dayEvents?.timed.length || 0) + (dayEvents?.untimed.length || 0);
            const isActive = day.key === selectedDay?.key;

            return (
              <button
                key={day.key}
                type="button"
                onClick={() => onSelectDay(day.key)}
                className={cn(
                  'min-w-[86px] rounded-2xl border px-2.5 py-2 text-left transition-all',
                  isActive
                    ? 'bg-foreground text-background border-foreground shadow-sm'
                    : 'bg-card border-border/70 text-foreground',
                )}
              >
                <p className={cn('text-[10px] uppercase tracking-[0.11em] font-semibold', isActive ? 'text-background/70' : 'text-muted-foreground')}>
                  {day.weekdayLabel}
                </p>
                <p className="text-sm font-display font-semibold mt-0.5">{day.dateLabel}</p>
                <div className="mt-1 flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1">
                    <span className={cn('h-1.5 w-1.5 rounded-full', stats.done ? 'bg-success' : isActive ? 'bg-background/30' : 'bg-muted')} />
                    <span className={cn('h-1.5 w-1.5 rounded-full', stats.pending ? 'bg-warning' : isActive ? 'bg-background/30' : 'bg-muted')} />
                    <span className={cn('h-1.5 w-1.5 rounded-full', stats.observation ? 'bg-info' : isActive ? 'bg-background/30' : 'bg-muted')} />
                  </div>
                  <span className={cn('text-[10px] font-medium', isActive ? 'text-background/85' : 'text-muted-foreground')}>
                    {eventCount}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDay && (
        <div className="rounded-xl border border-border/70 bg-card/70 p-2.5 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">
                {selectedDay.weekdayLabel} {selectedDay.dateLabel}
              </p>
              {selectedDay.metaLabel && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{selectedDay.metaLabel}</p>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {selectedDay.actions}
              {selectedDay.onClick && (
                <button
                  type="button"
                  onClick={selectedDay.onClick}
                  className="h-8 rounded-lg border border-border/70 bg-background px-2.5 text-[11px] font-medium text-foreground hover:border-primary/40"
                >
                  Detalhes
                </button>
              )}
            </div>
          </div>

          {allEvents.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border/70 bg-background/70 px-3 py-5 text-center">
              <CalendarDays className="w-4 h-4 text-muted-foreground mx-auto mb-1.5" />
              <p className="text-xs text-muted-foreground">{emptyMessage}</p>
            </div>
          ) : (
            <div className="space-y-2">
              {allEvents.map((event) => {
                const timeLabel = getEventTimeLabel(event);

                return (
                  <div
                    key={event.id}
                    onClick={event.onClick}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(keyboardEvent) => {
                      if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
                        keyboardEvent.preventDefault();
                        event.onClick?.();
                      }
                    }}
                    className={cn(
                      'rounded-lg border bg-background/95 px-2.5 py-2 transition-all active:scale-[0.99] min-w-0',
                      event.completed ? 'opacity-70' : '',
                      event.optional ? 'border-dashed' : '',
                    )}
                    style={{
                      borderLeftWidth: 3,
                      borderLeftColor: event.color || 'hsl(var(--primary))',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 min-w-0">
                      <div className="min-w-0">
                        <p className={cn('text-sm font-medium truncate', event.completed ? 'line-through text-muted-foreground' : 'text-foreground')}>
                          {event.title}
                        </p>

                        <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                          <Clock3 className="w-3 h-3" />
                          {timeLabel}
                          {event.badgeLabel && (
                            <span className="ml-1 inline-flex rounded-md bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground">
                              {event.badgeLabel}
                            </span>
                          )}
                        </p>

                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(clickEvent) => clickEvent.stopPropagation()}>
                        {event.actions}
                        <button
                          type="button"
                          onClick={event.onToggleComplete}
                          disabled={!event.onToggleComplete}
                          className="text-muted-foreground hover:text-foreground disabled:opacity-40"
                        >
                          {event.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-success" />
                          ) : (
                            <Circle className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

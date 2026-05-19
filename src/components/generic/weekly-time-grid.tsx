import React, { useMemo } from 'react';
import { CheckCircle2, Circle, Clock3 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatMinutesCompact } from '@/lib/duration-utils';

export interface WeeklyTimeGridDayStatus {
  done?: boolean;
  pending?: boolean;
  observation?: boolean;
}

export interface WeeklyTimeGridDay {
  key: string;
  weekdayLabel: string;
  dateLabel: string;
  metaLabel?: string;
  isToday?: boolean;
  status?: WeeklyTimeGridDayStatus;
  onClick?: () => void;
  actions?: React.ReactNode;
}

export interface WeeklyTimeGridEvent {
  id: string;
  dayKey: string;
  title: string;
  order?: number;
  subtitle?: string;
  startTime?: string;
  startMinutes?: number;
  durationMinutes?: number;
  badgeLabel?: string;
  optional?: boolean;
  completed?: boolean;
  color?: string;
  onClick?: () => void;
  onToggleComplete?: () => void;
  actions?: React.ReactNode;
}

interface WeeklyTimeGridProps {
  days: WeeklyTimeGridDay[];
  events: WeeklyTimeGridEvent[];
  startHour?: number;
  endHour?: number;
  slotMinutes?: number;
  className?: string;
  emptyMessage?: string;
  showDayCount?: boolean;
  onEventDrop?: (eventId: string, dayKey: string, startTime?: string) => void;
  onUntimedDrop?: (eventId: string, dayKey: string, beforeEventId?: string | null) => void;
}

interface NormalizedEvent extends WeeklyTimeGridEvent {
  normalizedStartMinutes?: number;
  rowStart?: number;
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

export function WeeklyTimeGrid({
  days,
  events,
  startHour = 7,
  endHour = 22,
  slotMinutes = 30,
  className,
  emptyMessage = 'Sem horario',
  showDayCount = true,
  onEventDrop,
  onUntimedDrop,
}: WeeklyTimeGridProps) {
  const slotHeight = 26;
  const hourColumnWidth = 60;
  const startMinutes = startHour * 60;
  const totalMinutes = (endHour - startHour) * 60;

  const eventsByDay = useMemo(() => {
    const result = new Map<string, { timed: NormalizedEvent[]; untimed: NormalizedEvent[] }>();

    for (const day of days) {
      result.set(day.key, { timed: [], untimed: [] });
    }

    for (const event of events) {
      const dayBucket = result.get(event.dayKey);
      if (!dayBucket) continue;

      const parsedMinutes = event.startMinutes ?? parseTimeToMinutes(event.startTime);
      if (parsedMinutes === undefined) {
        dayBucket.untimed.push(event);
        continue;
      }

      const boundedStart = Math.min(Math.max(parsedMinutes, startMinutes), startMinutes + totalMinutes - slotMinutes);
      const rowStart = Math.floor((boundedStart - startMinutes) / slotMinutes) + 1;

      dayBucket.timed.push({
        ...event,
        normalizedStartMinutes: boundedStart,
        rowStart,
      });
    }

    for (const bucket of result.values()) {
      bucket.timed.sort((a, b) => {
        const startA = a.normalizedStartMinutes ?? 0;
        const startB = b.normalizedStartMinutes ?? 0;
        if (startA !== startB) return startA - startB;
        const orderA = a.order ?? 0;
        const orderB = b.order ?? 0;
        if (orderA !== orderB) return orderA - orderB;
        return (a.title || '').localeCompare(b.title || '', 'pt-BR');
      });

      bucket.untimed.sort((a, b) => {
        const orderA = a.order ?? Number.MAX_SAFE_INTEGER;
        const orderB = b.order ?? Number.MAX_SAFE_INTEGER;
        if (orderA !== orderB) return orderA - orderB;
        return (a.title || '').localeCompare(b.title || '', 'pt-BR');
      });
    }

    return result;
  }, [days, events, slotMinutes, startMinutes, totalMinutes]);

  const gridColumnsStyle = useMemo(
    () => ({ gridTemplateColumns: `${hourColumnWidth}px repeat(${days.length}, minmax(170px, 1fr))` }),
    [days.length, hourColumnWidth],
  );

  const rowStarts = useMemo(() => {
    const totalSlots = Math.floor(totalMinutes / slotMinutes);
    const allRows = [];
    for (let i = 1; i <= totalSlots; i++) {
      allRows.push(i);
    }
    return allRows;
  }, [totalMinutes, slotMinutes]);

  const hasAnyUntimed = useMemo(() => {
    for (const bucket of eventsByDay.values()) {
      if (bucket.untimed.length > 0) return true;
    }
    return false;
  }, [eventsByDay]);

  const hasAnyTimed = useMemo(() => {
    for (const bucket of eventsByDay.values()) {
      if (bucket.timed.length > 0) return true;
    }
    return false;
  }, [eventsByDay]);

  const dayEventTotals = useMemo(() => {
    const totals = new Map<string, number>();
    for (const day of days) {
      const bucket = eventsByDay.get(day.key);
      const total = (bucket?.timed.length || 0) + (bucket?.untimed.length || 0);
      totals.set(day.key, total);
    }
    return totals;
  }, [days, eventsByDay]);

  const handleUntimedDrop = (eventId: string, dayKey: string, beforeEventId?: string | null) => {
    if (onUntimedDrop) {
      onUntimedDrop(eventId, dayKey, beforeEventId);
      return;
    }

    if (onEventDrop) {
      onEventDrop(eventId, dayKey, undefined);
    }
  };

  return (
    <div className={cn('workspace-panel p-2 md:p-3 w-full min-w-0 max-w-full overflow-hidden', className)}>
      <div className="overflow-x-auto max-w-full">
        <div className="w-full min-w-0 max-w-full space-y-2">
          <div className="grid w-full min-w-0 gap-2" style={gridColumnsStyle}>
            <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground flex items-end">
              Hora
            </div>
            {days.map((day) => {
              const status = day.status || {};
              const totalEvents = dayEventTotals.get(day.key) || 0;
              return (
                <div
                  key={day.key}
                  onClick={day.onClick}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      day.onClick?.();
                    }
                  }}
                  className={cn(
                    'rounded-2xl border px-3 md:px-3.5 py-3 text-left transition-all hover:shadow-sm cursor-pointer min-w-0',
                    day.isToday
                      ? 'bg-foreground text-background border-foreground shadow-sm'
                      : 'bg-card border-border/70 hover:border-primary/30',
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p
                        className={cn(
                          'text-[10px] uppercase tracking-[0.12em] font-semibold truncate',
                          day.isToday ? 'text-background/70' : 'text-muted-foreground',
                        )}
                      >
                        {day.weekdayLabel}
                      </p>
                      <p className="text-sm font-display font-semibold truncate">{day.dateLabel}</p>
                      {day.metaLabel && (
                        <p className={cn('mt-1 text-[11px] truncate', day.isToday ? 'text-background/80' : 'text-muted-foreground')}>
                          {day.metaLabel}
                        </p>
                      )}
                      {showDayCount && (
                        <p className={cn('mt-0.5 text-[11px] font-medium', day.isToday ? 'text-background/80' : 'text-muted-foreground')}>
                          {totalEvents > 0 ? `${totalEvents} ${totalEvents === 1 ? 'materia' : 'materias'}` : 'Sem materias'}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 md:gap-1.5 shrink-0" onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <span className={cn('h-2 w-2 rounded-full', status.done ? 'bg-success' : day.isToday ? 'bg-background/35' : 'bg-muted')} />
                        <span className={cn('h-2 w-2 rounded-full', status.pending ? 'bg-warning' : day.isToday ? 'bg-background/35' : 'bg-muted')} />
                        <span className={cn('h-2 w-2 rounded-full', status.observation ? 'bg-info' : day.isToday ? 'bg-background/35' : 'bg-muted')} />
                      </div>
                      {day.actions}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {hasAnyUntimed && (
            <div className="grid w-full min-w-0 gap-2" style={gridColumnsStyle}>
              <div className="rounded-xl border border-border/70 bg-card/75 px-2 py-2 text-[11px] font-semibold text-muted-foreground/80">
                Sem horário
              </div>
              {days.map((day) => {
                const untimed = eventsByDay.get(day.key)?.untimed || [];
                return (
                  <div
                    key={`${day.key}-untimed-top`}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const eventId = e.dataTransfer.getData('text/plain');
                      if (eventId) {
                        handleUntimedDrop(eventId, day.key, null);
                      }
                    }}
                    className="rounded-xl border border-border/70 bg-card/80 px-1.5 py-1 min-w-0 transition-colors hover:bg-primary/5"
                  >
                    {untimed.length === 0 ? (
                      <p className="text-[11px] text-muted-foreground/70 px-1 py-1">{emptyMessage}</p>
                    ) : (
                      <div className="space-y-1">
                        {untimed.map((event) => (
                          <div
                            key={event.id}
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData('text/plain', event.id);
                            }}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              const eventId = e.dataTransfer.getData('text/plain');
                              if (eventId) {
                                handleUntimedDrop(eventId, day.key, event.id);
                              }
                            }}
                            onClick={event.onClick}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(keyEvent) => {
                              if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                                keyEvent.preventDefault();
                                event.onClick?.();
                              }
                            }}
                            className={cn(
                              'group relative rounded-2xl border bg-card px-3 py-2.5 text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 cursor-grab active:cursor-grabbing min-w-0 flex flex-col justify-between h-full border-border/40',
                              event.completed ? 'opacity-80 bg-muted/40' : '',
                              event.optional ? 'border-dashed' : '',
                            )}
                            style={{
                              borderLeftWidth: 6,
                              borderLeftColor: event.color || 'hsl(var(--primary))',
                            }}
                          >
                            <div className="flex items-start justify-between gap-2 min-w-0">
                              <div className="min-w-0 flex-1">
                                <p
                                  className={cn(
                                    'text-[13px] font-display font-bold leading-tight truncate transition-colors',
                                    event.completed ? 'line-through text-muted-foreground' : 'text-foreground group-hover:text-primary',
                                  )}
                                >
                                  {event.title}
                                </p>

                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                  <div className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground/80">
                                    Sem horario
                                  </div>
                                  {event.durationMinutes ? (
                                    <div className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                      {formatMinutesCompact(event.durationMinutes)}
                                    </div>
                                  ) : null}
                                  {event.badgeLabel ? (
                                    <div className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                                      {event.badgeLabel}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>

                            {(event.subtitle || event.actions || event.onToggleComplete) && (
                              <div className="mt-2.5 pt-2 border-t border-border/20 flex items-center justify-between gap-2">
                                <div className="min-w-0">
                                  {event.subtitle && (
                                    <p className="text-[10px] font-medium text-muted-foreground/60 truncate flex items-center gap-1">
                                      {event.subtitle}
                                    </p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <button
                                    type="button"
                                    onClick={event.onToggleComplete}
                                    className="h-7 w-7 flex items-center justify-center rounded-full border border-border/60 hover:bg-black/5 transition-colors"
                                  >
                                    {event.completed ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Circle className="w-4 h-4 text-muted-foreground/30" />}
                                  </button>
                                  {event.actions}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!hasAnyTimed && !hasAnyUntimed ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-card/70 px-4 py-6 text-center text-sm text-muted-foreground">
              {emptyMessage}
            </div>
          ) : (
            <div className="space-y-2">
              {hasAnyTimed && (
                <div className="grid w-full min-w-0 gap-x-2" style={gridColumnsStyle}>
                  {rowStarts.map((rowStart, rowIndex) => (
                    <React.Fragment key={`row-${rowStart}`}>
                      <div
                        className={cn(
                          'border border-border/70 bg-card/75 px-2 text-[11px] text-muted-foreground flex items-center font-medium',
                          rowIndex === 0 ? 'rounded-t-xl' : '',
                          rowIndex === rowStarts.length - 1 ? 'rounded-b-xl' : '',
                          rowIndex > 0 ? 'border-t-0' : '',
                        )}
                        style={{ minHeight: `${slotHeight + 10}px` }}
                      >
                        {formatTime(startMinutes + (rowStart - 1) * slotMinutes)}
                      </div>

                      {days.map((day) => {
                        const timed = eventsByDay.get(day.key)?.timed || [];
                        const rowEvents = timed.filter((event) => event.rowStart === rowStart);

                        return (
                          <div
                            key={`${day.key}-row-${rowStart}`}
                            onDragOver={(e) => e.preventDefault()}
                            onDrop={(e) => {
                              e.preventDefault();
                              const eventId = e.dataTransfer.getData('text/plain');
                              if (eventId && onEventDrop) {
                                const timeStr = formatTime(startMinutes + (rowStart - 1) * slotMinutes);
                                onEventDrop(eventId, day.key, timeStr);
                              }
                            }}
                            className={cn(
                              'border border-border/70 bg-card/80 px-2 py-1.5 min-w-0 transition-colors hover:bg-primary/5',
                              rowIndex === 0 ? 'rounded-t-xl' : '',
                              rowIndex === rowStarts.length - 1 ? 'rounded-b-xl' : '',
                              rowIndex > 0 ? 'border-t-0' : '',
                            )}
                            style={{ minHeight: `${slotHeight + 10}px` }}
                          >
                            <div className="space-y-1">
                              {rowEvents.map((event) => {
                                const timeLabel =
                                  event.startTime ||
                                  (event.normalizedStartMinutes !== undefined
                                    ? formatTime(event.normalizedStartMinutes)
                                    : formatTime(startMinutes + (rowStart - 1) * slotMinutes));

                                return (
                                  <div
                                    key={event.id}
                                    draggable
                                    onDragStart={(e) => {
                                      e.dataTransfer.setData('text/plain', event.id);
                                    }}
                                    onClick={event.onClick}
                                    role="button"
                                    tabIndex={0}
                                    onKeyDown={(keyEvent) => {
                                      if (keyEvent.key === 'Enter' || keyEvent.key === ' ') {
                                        keyEvent.preventDefault();
                                        event.onClick?.();
                                      }
                                    }}
                                    className={cn(
                                      'group relative rounded-2xl border bg-card px-3 py-2.5 text-left shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 cursor-grab active:cursor-grabbing min-w-0 flex flex-col justify-between h-full border-border/40',
                                      event.completed ? 'opacity-80 bg-muted/40' : '',
                                      event.optional ? 'border-dashed' : '',
                                    )}
                                    style={{
                                      borderLeftWidth: 6,
                                      borderLeftColor: event.color || 'hsl(var(--primary))',
                                    }}
                                  >
                                    <div className="flex items-start justify-between gap-2 min-w-0">
                                      <div className="min-w-0 flex-1">
                                        <p
                                          className={cn(
                                            'text-[13px] font-display font-bold leading-tight truncate transition-colors',
                                            event.completed ? 'line-through text-muted-foreground' : 'text-foreground group-hover:text-primary',
                                          )}
                                        >
                                          {event.title}
                                        </p>
                                        
                                        <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                          <div className="inline-flex items-center gap-1 rounded-full bg-black/5 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground/80">
                                            <Clock3 className="h-2.5 w-2.5" />
                                            {timeLabel}
                                          </div>
                                          {event.durationMinutes ? (
                                            <div className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-bold text-primary">
                                              {formatMinutesCompact(event.durationMinutes)}
                                            </div>
                                          ) : null}
                                          {event.badgeLabel ? (
                                            <div className="inline-flex items-center rounded-full bg-accent/10 px-2 py-0.5 text-[10px] font-bold text-accent">
                                              {event.badgeLabel}
                                            </div>
                                          ) : null}
                                        </div>
                                      </div>
                                    </div>

                                    {(event.subtitle || event.actions || event.onToggleComplete) && (
                                      <div className="mt-2.5 pt-2 border-t border-border/20 flex items-center justify-between gap-2">
                                        <div className="min-w-0">
                                          {event.subtitle && (
                                            <p className="text-[10px] font-medium text-muted-foreground/60 truncate flex items-center gap-1">
                                              {event.subtitle}
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                          <button
                                            type="button"
                                            onClick={event.onToggleComplete}
                                            className="h-7 w-7 flex items-center justify-center rounded-full border border-border/60 hover:bg-black/5 transition-colors"
                                          >
                                            {event.completed ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Circle className="w-4 h-4 text-muted-foreground/30" />}
                                          </button>
                                          {event.actions}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightLeft, CheckCircle2, Circle, MessageSquare, MoveRight, Plus, Save, Timer, Trash2 } from 'lucide-react';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useStudy } from '@/contexts/StudyContext';
import { ScheduleEntry, StudySession } from '@/types/study';
import { formatMinutesCompact } from '@/lib/duration-utils';
import { ClockTimePickerField, DurationPickerField } from '@/components/generic/time-picker-fields';
import { calculatePlannedVsExecuted, sumSessionActualMinutes, sumSessionPauseMinutes } from '@/features/tracker/aggregations';
import { getSessionActualMinutes, getSessionEndLabel, getSessionPauseSeconds, getSessionStartLabel } from '@/features/tracker/session-metrics';

interface EntryActionsProps {
  onMove: (entry: ScheduleEntry) => void;
  onChange: (entry: ScheduleEntry) => void;
  onRemove: (id: string) => void;
}

interface DayDetailSheetProps extends EntryActionsProps {
  open: boolean;
  date: string | null;
  onOpenChange: (open: boolean) => void;
  onAdd: (date: string) => void;
  onNote: (date: string) => void;
}

function buildTimerHref(date: string, entry: ScheduleEntry): string {
  const params = new URLSearchParams({ subject: entry.subjectId, date, entry: entry.id });
  if (entry.startTime) params.set('plannedStart', entry.startTime);
  if (entry.plannedMinutes !== undefined) params.set('plannedMinutes', String(entry.plannedMinutes));
  return `/timer?${params.toString()}`;
}

function SessionTimeline({ session }: { session: StudySession }) {
  const { getSessionPauses } = useStudy();
  const pauses = getSessionPauses(session.id);
  const startLabel = getSessionStartLabel(session);
  const endLabel = getSessionEndLabel(session) || '--:--';
  const doneLabel = formatMinutesCompact(getSessionActualMinutes(session));
  const pauseLabel = formatMinutesCompact(Math.round(getSessionPauseSeconds(session, pauses) / 60));

  return (
    <div className="rounded-lg border border-border/60 bg-background/80 p-2.5 space-y-1.5">
      <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">
          {startLabel} - {endLabel}
        </span>
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">feito {doneLabel}</span>
        <span className="rounded-md bg-muted px-1.5 py-0.5 text-muted-foreground">pausa {pauseLabel}</span>
      </div>

      {pauses.length > 0 && (
        <div className="rounded-md bg-muted/40 px-2 py-1.5 space-y-1">
          <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Pausas</p>
          {pauses.map((pause) => (
            <p key={pause.id} className="text-[11px] text-foreground">
              {new Date(pause.pauseStartedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })}
              {' -> '}
              {pause.pauseEndedAt
                ? new Date(pause.pauseEndedAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', hour12: false })
                : '--:--'}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DayDetailSheet({
  open,
  date,
  onOpenChange,
  onAdd,
  onNote,
  onMove,
  onChange,
  onRemove,
}: DayDetailSheetProps) {
  const {
    getScheduleForDate,
    getSessionsForDate,
    getSubject,
    toggleScheduleComplete,
    getDayPlanForDate,
    upsertScheduleDayPlan,
    updateScheduleEntry,
    data,
  } = useStudy();

  const activeDate = date || '';
  const entries = useMemo(() => (activeDate ? getScheduleForDate(activeDate) : []), [activeDate, getScheduleForDate]);
  const focusSessions = useMemo(
    () => (activeDate ? getSessionsForDate(activeDate).filter((session) => session.isFocusSession !== false) : []),
    [activeDate, getSessionsForDate],
  );
  const dayPlan = activeDate ? getDayPlanForDate(activeDate) : undefined;
  const dayNotes = useMemo(
    () => (activeDate ? data.notes.filter((note) => note.type === 'day' && note.referenceDate === activeDate) : []),
    [activeDate, data.notes],
  );

  const [targetDraftMinutes, setTargetDraftMinutes] = useState<number | undefined>(undefined);
  const targetMinutes = dayPlan?.dayTargetMinutes;

  useEffect(() => {
    setTargetDraftMinutes(targetMinutes);
  }, [targetMinutes, activeDate]);

  const main = entries.filter((entry) => !entry.optional);
  const optional = entries.filter((entry) => entry.optional);
  const completed = entries.filter((entry) => entry.completed).length;
  const planned = entries.reduce((acc, entry) => acc + (entry.plannedMinutes || 0), 0);
  const executed = sumSessionActualMinutes(focusSessions);
  const paused = sumSessionPauseMinutes(focusSessions, data.sessionPauses);
  const dayComparison = calculatePlannedVsExecuted(planned, executed);
  const templateId = entries.find((entry) => entry.templateId)?.templateId;
  const isTemplateDay = Boolean(templateId);
  const targetDelta = targetDraftMinutes === undefined ? undefined : targetDraftMinutes - planned;

  const sessionsByEntryId = useMemo(() => {
    const map = new Map<string, StudySession[]>();

    for (const session of focusSessions) {
      if (!session.scheduleEntryId) continue;
      const list = map.get(session.scheduleEntryId) || [];
      list.push(session);
      map.set(session.scheduleEntryId, list);
    }

    for (const [key, list] of map.entries()) {
      list.sort((a, b) => {
        const aStart = a.startedAt || `${a.date}T${a.startTime || '00:00'}:00`;
        const bStart = b.startedAt || `${b.date}T${b.startTime || '00:00'}:00`;
        return aStart.localeCompare(bStart);
      });
      map.set(key, list);
    }

    return map;
  }, [focusSessions]);

  const sessionsBySubject = useMemo(() => {
    const map = new Map<string, StudySession[]>();

    for (const session of focusSessions) {
      const list = map.get(session.subjectId) || [];
      list.push(session);
      map.set(session.subjectId, list);
    }

    return map;
  }, [focusSessions]);

  const unlinkedSessionsBySubject = useMemo(() => {
    const knownEntries = new Set(entries.map((entry) => entry.id));
    const map = new Map<string, StudySession[]>();

    for (const session of focusSessions) {
      if (session.scheduleEntryId && knownEntries.has(session.scheduleEntryId)) continue;
      const list = map.get(session.subjectId) || [];
      list.push(session);
      map.set(session.subjectId, list);
    }

    for (const [key, list] of map.entries()) {
      list.sort((a, b) => {
        const aStart = a.startedAt || `${a.date}T${a.startTime || '00:00'}:00`;
        const bStart = b.startedAt || `${b.date}T${b.startTime || '00:00'}:00`;
        return aStart.localeCompare(bStart);
      });
      map.set(key, list);
    }

    return map;
  }, [entries, focusSessions]);

  const saveDayTarget = async () => {
    if (!activeDate) return;
    await upsertScheduleDayPlan(activeDate, { dayTargetMinutes: targetDraftMinutes, isOverride: true });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        {!activeDate ? null : (
          <>
            <SheetHeader>
              <SheetTitle className="font-display capitalize">
                {new Date(`${activeDate}T12:00:00`).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
              </SheetTitle>
              <SheetDescription>
                {isTemplateDay ? 'Dia gerado por template semanal (com possiveis overrides).' : 'Detalhe diario do seu cronograma.'}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-5">
              <div className="glass-card p-5 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Checklist do dia</span>
                  <span className="font-semibold text-foreground">{completed}/{entries.length}</span>
                </div>
                <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all"
                    style={{ width: entries.length ? `${(completed / entries.length) * 100}%` : '0%' }}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                  <div className="rounded-lg bg-muted/40 px-3 py-2 text-muted-foreground">
                    Planejado: <strong className="text-foreground">{formatMinutesCompact(planned)}</strong>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-3 py-2 text-muted-foreground">
                    Executado: <strong className="text-foreground">{formatMinutesCompact(executed)}</strong>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-3 py-2 text-muted-foreground">
                    Pausas: <strong className="text-foreground">{formatMinutesCompact(paused)}</strong>
                  </div>
                  <div className="rounded-lg bg-muted/40 px-3 py-2 text-muted-foreground">
                    Aderencia:{' '}
                    <strong className="text-foreground">
                      {dayComparison.adherencePercent !== undefined ? `${dayComparison.adherencePercent}%` : '--'}
                    </strong>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-2 items-center">
                  <DurationPickerField
                    valueMinutes={targetDraftMinutes}
                    onChangeMinutes={setTargetDraftMinutes}
                    placeholder="Meta do dia"
                    includeSeconds
                  />
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button size="sm" variant="outline" onClick={saveDayTarget}>
                      <Save className="w-4 h-4 mr-1" />
                      Salvar meta
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      Meta: <strong className="text-foreground">{formatMinutesCompact(targetDraftMinutes)}</strong>
                      {' • '}
                      Diferenca meta x planejado:{' '}
                      <strong className="text-foreground">{formatMinutesCompact(targetDelta)}</strong>
                    </p>
                  </div>
                </div>
              </div>

              {entries.length === 0 && (
                <div className="glass-card p-8 text-center">
                  <p className="text-muted-foreground">Nenhuma materia planejada para este dia.</p>
                  <Button variant="outline" size="sm" className="mt-4" onClick={() => onAdd(activeDate)}>
                    <Plus className="w-4 h-4 mr-1" />
                    Adicionar materia
                  </Button>
                </div>
              )}

              {[{ title: 'Principais', list: main }, { title: 'Opcionais', list: optional }].map((section) =>
                section.list.length > 0 ? (
                  <div className="space-y-2" key={section.title}>
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{section.title}</h3>
                    {section.list.map((entry) => {
                      const subject = getSubject(entry.subjectId);
                      const linkedSessions = sessionsByEntryId.get(entry.id) || [];
                      const subjectSessions = sessionsBySubject.get(entry.subjectId) || [];
                      const linkedMinutes = sumSessionActualMinutes(linkedSessions);
                      const subjectMinutes = sumSessionActualMinutes(subjectSessions);
                      const comparison = calculatePlannedVsExecuted(entry.plannedMinutes || 0, subjectMinutes);

                      return (
                        <div key={entry.id} className={`glass-card p-4 space-y-3 ${entry.optional ? 'opacity-85' : ''}`}>
                          <div className="flex items-start gap-3">
                            <button onClick={() => toggleScheduleComplete(entry.id)} className="transition-transform hover:scale-110 mt-0.5">
                              {entry.completed ? (
                                <CheckCircle2 className="w-5 h-5 text-success" />
                              ) : (
                                <Circle className="w-5 h-5 text-muted-foreground" />
                              )}
                            </button>

                            <div className="w-3.5 h-3.5 rounded-full shadow-sm mt-1" style={{ backgroundColor: subject?.color }} />

                            <div className="flex-1 min-w-0 space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <p
                                  className={`text-sm font-medium ${
                                    entry.completed ? 'line-through text-muted-foreground' : 'text-foreground'
                                  }`}
                                >
                                  {subject?.name}
                                </p>

                                <div className="flex items-center gap-1">
                                  <Button asChild variant="ghost" size="icon" className="h-8 w-8">
                                    <Link to={buildTimerHref(activeDate, entry)} title="Iniciar timer">
                                      <Timer className="w-4 h-4" />
                                    </Link>
                                  </Button>
                                  <button
                                    onClick={() => onMove(entry)}
                                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                                  >
                                    <MoveRight className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => onChange(entry)}
                                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"
                                  >
                                    <ArrowRightLeft className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => onRemove(entry.id)}
                                    className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <ClockTimePickerField
                                  value={entry.startTime}
                                  onChange={(value) => updateScheduleEntry(entry.id, { startTime: value, isOverride: true })}
                                  placeholder="--:--"
                                />
                                <DurationPickerField
                                  valueMinutes={entry.plannedMinutes}
                                  onChangeMinutes={(valueMinutes) =>
                                    updateScheduleEntry(entry.id, { plannedMinutes: valueMinutes, isOverride: true })
                                  }
                                  placeholder="Meta"
                                  includeSeconds
                                />
                              </div>

                              <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                                <span className="rounded-md bg-muted px-1.5 py-0.5">
                                  Planejado {entry.startTime || '--:--'} • {formatMinutesCompact(entry.plannedMinutes)}
                                </span>
                                <span className="rounded-md bg-muted px-1.5 py-0.5">
                                  Executado (materia) {formatMinutesCompact(subjectMinutes)}
                                </span>
                                <span className="rounded-md bg-muted px-1.5 py-0.5">
                                  Vinculado ao item {formatMinutesCompact(linkedMinutes)}
                                </span>
                                <span className="rounded-md bg-muted px-1.5 py-0.5">
                                  Aderencia {comparison.adherencePercent !== undefined ? `${comparison.adherencePercent}%` : '--'}
                                </span>
                              </div>

                              {linkedSessions.length > 0 && (
                                <div className="space-y-1.5">
                                  <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Execucoes vinculadas</p>
                                  {linkedSessions.map((session) => (
                                    <SessionTimeline key={session.id} session={session} />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : null,
              )}

              {unlinkedSessionsBySubject.size > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Execucoes sem item planejado
                  </h3>
                  {Array.from(unlinkedSessionsBySubject.entries()).map(([subjectId, sessions]) => {
                    const subject = getSubject(subjectId);
                    return (
                      <div key={subjectId} className="glass-card p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: subject?.color }} />
                          <p className="text-sm font-medium text-foreground">{subject?.name || 'Materia'}</p>
                          <span className="text-xs text-muted-foreground">
                            {sessions.length} sessao{sessions.length > 1 ? 'es' : ''} • {formatMinutesCompact(sumSessionActualMinutes(sessions))}
                          </span>
                        </div>
                        {sessions.map((session) => (
                          <SessionTimeline key={session.id} session={session} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              )}

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => onAdd(activeDate)}>
                  <Plus className="w-4 h-4 mr-1" />
                  Materia
                </Button>
                <Button variant="outline" size="sm" onClick={() => onNote(activeDate)}>
                  <MessageSquare className="w-4 h-4 mr-1" />
                  Observacao
                </Button>
              </div>

              {dayNotes.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Observacoes</h3>
                  {dayNotes.map((note) => (
                    <div key={note.id} className="glass-card p-4 text-sm text-foreground leading-relaxed">
                      {note.content}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}


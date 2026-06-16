import React, { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useStudy } from '@/contexts/StudyContext';
import { getSessionActualMinutes, getSessionPauseSeconds, getSessionStartLabel, getSessionEndLabel } from '@/features/tracker/session-metrics';
import { toDateKey } from '@/lib/date-utils';
import { formatMinutesCompact } from '@/lib/duration-utils';
import { Plus, Pencil, Trash2, History, CalendarDays } from 'lucide-react';
import { DateRange } from 'react-day-picker';
import { PageHeader } from '@/components/generic/PageHeader';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import SessionDialog from '@/components/history/SessionDialog';
import { Checkbox } from '@/components/ui/checkbox';
import { StudySession } from '@/types/study';
import { toast } from 'sonner';
import { QuickPlanTimerCard } from '@/components/dashboard/QuickPlanTimerCard';
import { useStudyPlans } from '@/hooks/useStudyPlans';

type FilterPeriod = 'week' | 'month' | 'year' | 'all';

function formatRangeLabel(range?: DateRange) {
  if (!range?.from) return 'Selecionar período';
  const from = range.from.toLocaleDateString('pt-BR');
  const to = range.to ? range.to.toLocaleDateString('pt-BR') : from;
  return from === to ? from : `${from} - ${to}`;
}

function getFromDateByPeriod(period: FilterPeriod): string | undefined {
  if (period === 'all') return undefined;
  const now = new Date();

  if (period === 'week') now.setDate(now.getDate() - 7);
  if (period === 'month') now.setMonth(now.getMonth() - 1);
  if (period === 'year') now.setFullYear(now.getFullYear() - 1);

  return toDateKey(now);
}

export default function HistoryPage() {
  const { data, getSubject, deleteSession } = useStudy();
  const { plans } = useStudyPlans();
  const [period, setPeriod] = useState<FilterPeriod>('month');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [sessionType, setSessionType] = useState<'all' | 'stopwatch' | 'pomodoro'>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  
  // Multi-select State
  const [selectedSessionIds, setSelectedSessionIds] = useState<Set<string>>(new Set());
  
  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<StudySession | undefined>(undefined);
  const [deleteConfirmSessionId, setDeleteConfirmSessionId] = useState<string | null>(null);
  const [deleteConfirmBulk, setDeleteConfirmBulk] = useState(false);

  const filtered = useMemo(() => {
    let sessions = data.sessions.filter((session) => session.isFocusSession !== false);

    if (dateRange?.from) {
      const fromStr = toDateKey(dateRange.from);
      const toStr = dateRange.to ? toDateKey(dateRange.to) : fromStr;
      sessions = sessions.filter((session) => session.date >= fromStr && session.date <= toStr);
    } else {
      const fromDate = getFromDateByPeriod(period);
      if (fromDate) {
        sessions = sessions.filter((session) => session.date >= fromDate);
      }
    }

    if (subjectFilter !== 'all') {
      sessions = sessions.filter((session) => session.subjectId === subjectFilter);
    }

    if (sessionType !== 'all') {
      sessions = sessions.filter((session) => session.sessionMode === sessionType);
    }

    return sessions.sort((a, b) => {
      const aStart = a.startedAt || `${a.date}T${a.startTime || '00:00'}:00`;
      const bStart = b.startedAt || `${b.date}T${b.startTime || '00:00'}:00`;
      return bStart.localeCompare(aStart);
    });
  }, [data.sessions, period, subjectFilter, sessionType, dateRange]);

  const summary = useMemo(() => {
    const totalMinutes = filtered.reduce((acc, session) => acc + getSessionActualMinutes(session), 0);
    const pauseMinutes = Math.round(
      filtered.reduce((acc, session) => acc + getSessionPauseSeconds(session, data.sessionPauses), 0) / 60,
    );
    const uniqueDays = new Set(filtered.map((session) => session.date)).size;
    return {
      totalMinutes,
      pauseMinutes,
      uniqueDays,
      sessionCount: filtered.length,
    };
  }, [filtered, data.sessionPauses]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    for (const session of filtered) {
      if (!groups[session.date]) groups[session.date] = [];
      groups[session.date].push(session);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const handleAddSession = () => {
    setSelectedSession(undefined);
    setDialogOpen(true);
  };

  const handleEditSession = (session: StudySession) => {
    setSelectedSession(session);
    setDialogOpen(true);
  };

  const handleDeleteSession = (id: string) => {
    setDeleteConfirmSessionId(id);
  };

  const confirmDeleteSession = async () => {
    if (!deleteConfirmSessionId) return;
    try {
      await deleteSession(deleteConfirmSessionId);
      setSelectedSessionIds(prev => {
        const next = new Set(prev);
        next.delete(deleteConfirmSessionId);
        return next;
      });
      toast.success('Sessão excluída com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir sessão.');
    } finally {
      setDeleteConfirmSessionId(null);
    }
  };

  const toggleSelectSession = (id: string) => {
    const next = new Set(selectedSessionIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedSessionIds(next);
  };

  const handleBulkDelete = () => {
    setDeleteConfirmBulk(true);
  };

  const confirmBulkDelete = async () => {
    try {
      for (const id of selectedSessionIds) {
        await deleteSession(id);
      }
      setSelectedSessionIds(new Set());
      toast.success('Sessões excluídas com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir sessões.');
    } finally {
      setDeleteConfirmBulk(false);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-full">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(255,255,255,0.75),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.6),_transparent)]" />

      <PageHeader 
        title="Sessões de Estudo"
        description="Acompanhe o seu progresso, filtre por matérias, períodos e exclua sessões antigas com facilidade."
        badgeText="Seu histórico"
        badgeIcon={History}
        action={
          <div className="flex items-center gap-2">
            {selectedSessionIds.size > 0 && (
              <Button variant="destructive" onClick={handleBulkDelete} className="h-11 rounded-[1.25rem] px-5 shadow-lg shadow-black/5 shrink-0">
                <Trash2 className="mr-1.5 h-4.5 w-4.5" />
                Excluir ({selectedSessionIds.size})
              </Button>
            )}
            <Button onClick={handleAddSession} className="h-11 rounded-[1.25rem] px-5 shadow-lg shadow-black/5 shrink-0">
              <Plus className="mr-1.5 h-4.5 w-4.5" />
              Registrar Sessão
            </Button>
          </div>
        }
      />

      <div className="space-y-6 mt-6">
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        <div className="flex-1 space-y-5 sm:space-y-6 w-full">
      <div className="rounded-[1.5rem] border border-border/60 bg-background/75 px-4 py-2.5 shadow-sm backdrop-blur-md">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select value={sessionType} onValueChange={(val: any) => setSessionType(val)}>
              <SelectTrigger className="w-full sm:w-[14rem] rounded-2xl border-border/60 bg-background/80">
                <SelectValue placeholder="Geral" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Geral</SelectItem>
                <SelectItem value="stopwatch">Cronômetro</SelectItem>
                <SelectItem value="pomodoro">Pomodoro</SelectItem>
              </SelectContent>
            </Select>

            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-full sm:w-[14rem] rounded-2xl border-border/60 bg-background/80">
                <SelectValue placeholder="Todas as matérias" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as matérias</SelectItem>
                {data.subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: subject.color }} />
                      {subject.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="inline-flex items-center gap-1 rounded-2xl border border-border/60 bg-muted/30 p-1 shadow-inner">
              {(['week', 'month', 'year', 'all'] as FilterPeriod[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => { setPeriod(value); setDateRange(undefined); }}
                  className={cn(
                    'rounded-xl px-3 py-1.5 text-xs font-black transition-colors',
                    period === value && !dateRange ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {{ week: 'Semanal', month: 'Mensal', year: 'Anual', all: 'Tudo' }[value]}
                </button>
              ))}
            </div>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-11 rounded-2xl border-border/60 bg-background/80 px-4 justify-start gap-2">
                  <CalendarDays className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">{formatRangeLabel(dateRange)}</span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="end">
                <div className="flex flex-col gap-4 p-4 lg:flex-row">
                  <div className="flex min-w-[9rem] flex-col gap-2 border-b border-border/50 pb-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
                    <button type="button" className="rounded-xl px-3 py-2 text-left text-sm hover:bg-muted/60" onClick={() => setDateRange({ from: new Date(), to: new Date() })}>Hoje</button>
                    <button type="button" className="rounded-xl px-3 py-2 text-left text-sm hover:bg-muted/60" onClick={() => {
                      const end = new Date();
                      const start = new Date();
                      start.setDate(end.getDate() - 6);
                      setDateRange({ from: start, to: end });
                    }}>Últimos 7 dias</button>
                    <button type="button" className="rounded-xl px-3 py-2 text-left text-sm hover:bg-muted/60" onClick={() => {
                      const today = new Date();
                      const start = new Date(today.getFullYear(), today.getMonth(), 1);
                      const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                      setDateRange({ from: start, to: end });
                    }}>Este mês</button>
                    <button type="button" className="rounded-xl px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted/60" onClick={() => setDateRange(undefined)}>Limpar</button>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/80 p-2">
                    <Calendar mode="range" numberOfMonths={2} selected={dateRange} onSelect={setDateRange} />
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{formatMinutesCompact(summary.totalMinutes)}</p>
          <p className="text-xs text-muted-foreground">Total estudado</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{formatMinutesCompact(summary.pauseMinutes)}</p>
          <p className="text-xs text-muted-foreground">Total pausado</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{summary.sessionCount}</p>
          <p className="text-xs text-muted-foreground">Sessões</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{summary.uniqueDays}</p>
          <p className="text-xs text-muted-foreground">Dias ativos</p>
        </div>
      </div>

      {groupedByDate.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">Nenhuma sessão encontrada nesse período.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map(([date, sessions]) => (
            <div key={date}>
              <p className="text-xs font-semibold text-muted-foreground mb-2 capitalize">
                {new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>

              <div className="space-y-2">
                {sessions.map((session) => {
                  const subject = getSubject(session.subjectId);
                  const pauses = data.sessionPauses.filter((p) => p.sessionId === session.id);
                  
                  const actual = formatMinutesCompact(getSessionActualMinutes(session));
                  const paused = formatMinutesCompact(Math.round(getSessionPauseSeconds(session, pauses) / 60));
                  const startLabel = getSessionStartLabel(session);
                  const endLabel = getSessionEndLabel(session);

                  return (
                    <div key={session.id} className="glass-card p-3 space-y-2 group relative">
                      <div className="flex items-center gap-3">
                        <Checkbox 
                          checked={selectedSessionIds.has(session.id)}
                          onCheckedChange={() => toggleSelectSession(session.id)}
                        />
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: subject?.color }} />
                        <span className="text-sm font-medium text-foreground flex-1 truncate">{subject?.name || 'Matéria'}</span>
                        <span className="text-xs font-semibold text-muted-foreground capitalize mr-2">{session.sessionMode === 'pomodoro' ? 'Pomodoro' : 'Cronômetro'}</span>
                        
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            onClick={() => handleEditSession(session)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeleteSession(session.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5">
                          {startLabel}
                          {endLabel ? ` -> ${endLabel}` : ''}
                        </span>
                        <span className="rounded bg-muted px-1.5 py-0.5">feito {actual}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5">pausa {paused}</span>
                        {session.scheduleDate && <span className="rounded bg-muted px-1.5 py-0.5">cronograma {session.scheduleDate}</span>}
                      </div>

                      {pauses.length > 0 && (
                        <div className="rounded-md bg-muted/40 px-2 py-1.5 space-y-1">
                          <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Pausas</p>
                          {pauses.map((pause) => (
                            <p key={pause.id} className="text-[11px] text-foreground">
                              {new Date(pause.pauseStartedAt).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                              })}
                              {' -> '}
                              {pause.pauseEndedAt
                                ? new Date(pause.pauseEndedAt).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false,
                                  })
                                : '--:--'}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Session Add/Edit Dialog */}
      <SessionDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        session={selectedSession} 
      />

      <AlertDialog open={!!deleteConfirmSessionId || deleteConfirmBulk} onOpenChange={(open) => {
        if (!open) {
          setDeleteConfirmSessionId(null);
          setDeleteConfirmBulk(false);
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmBulk 
                ? `Isso excluirá permanentemente ${selectedSessionIds.size} sessões selecionadas.`
                : 'Isso excluirá permanentemente esta sessão de estudo e todos os seus dados.'}
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={deleteConfirmBulk ? confirmBulkDelete : confirmDeleteSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      </div>

      <div className="hidden lg:block w-full lg:w-[420px] xl:w-[480px] shrink-0 sticky top-6">
        <QuickPlanTimerCard plans={plans} />
      </div>
    </div>
    </div>
    </div>
  );
}

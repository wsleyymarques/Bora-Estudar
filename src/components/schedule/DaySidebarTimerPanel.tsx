import React, { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  Bell,
  CheckCircle2,
  Circle,
  Clock,
  MessageSquare,
  MoreHorizontal,
  MoveRight,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CompactTimerPlayer } from '@/components/generic/compact-timer-player';
import { DayAnalysisSummary } from '@/components/generic/day-analysis-summary';
import { ClockTimePickerField, DurationPickerField } from '@/components/generic/time-picker-fields';
import { ScheduleItemPlayButton } from '@/components/schedule/ScheduleItemPlayButton';
import { useStudy } from '@/contexts/StudyContext';
import { sumSessionActualMinutes, sumSessionPauseMinutes } from '@/features/tracker/aggregations';
import { getSessionActualMinutes } from '@/features/tracker/session-metrics';
import { formatMinutesCompact } from '@/lib/duration-utils';
import { Note, ScheduleEntry, StudySession } from '@/types/study';
import SessionDialog from '@/components/history/SessionDialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface DaySidebarTimerPanelProps {
  date: string;
  entries: ScheduleEntry[];
  targetDraftMinutes?: number;
  onTargetDraftChange: (value?: number) => void;
  onAdd: (date: string) => void;
  onNote: (date: string) => void;
  onMove: (entry: ScheduleEntry) => void;
  onChange: (entry: ScheduleEntry) => void;
  onRemove: (id: string) => void;
  onToggleComplete: (id: string) => void;
  onUpdateEntry: (id: string, payload: Partial<ScheduleEntry>) => void;
  onEditSubject?: (subjectId: string) => void;
  onApplyRecurrence?: (entryId: string, repeatValue: number, repeatUnit: string, repeatFrequency: string) => void;
  dayNotes: Note[];
}

export function DaySidebarTimerPanel({
  date,
  entries,
  targetDraftMinutes,
  onTargetDraftChange,
  onAdd,
  onNote,
  onMove,
  onChange,
  onRemove,
  onToggleComplete,
  onUpdateEntry,
  onEditSubject,
  onApplyRecurrence,
  dayNotes,
}: DaySidebarTimerPanelProps) {
  const { getSubject, getSessionsForDate, data } = useStudy();
  const isMobile = useIsMobile();
  const [entryPendingRemoval, setEntryPendingRemoval] = useState<ScheduleEntry | null>(null);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);
  const [recurrenceForms, setRecurrenceForms] = useState<Record<string, { value: number, unit: string, frequency: string }>>({});
  const [expandedRecurrence, setExpandedRecurrence] = useState<string | null>(null);
  const [expandedNotifications, setExpandedNotifications] = useState<string | null>(null);
  const [notificationStates, setNotificationStates] = useState<Record<string, { enabled: boolean; times: string[]; newTime: string }>>({});
  const [editingSession, setEditingSession] = useState<StudySession | null>(null);

  const [dayNotificationExpanded, setDayNotificationExpanded] = useState(false);
  const [dayNotificationState, setDayNotificationState] = useState<{ enabled: boolean; times: string[]; newTime: string }>({
    enabled: false,
    times: [],
    newTime: '14:00'
  });

  // Sync day notification state when date changes or component mounts
  React.useEffect(() => {
    let enabled = false;
    let times: string[] = [];
    try {
      const saved = localStorage.getItem(`day_notification_${date}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          enabled = true;
          times = parsed;
        }
      }
    } catch (e) {
      // ignore
    }
    setDayNotificationState({ enabled, times, newTime: '14:00' });
    setDayNotificationExpanded(false);
  }, [date]);

  const handleUpdateDayNotifications = (enabled: boolean, times: string[]) => {
    let reminders: any[] = [];
    const savedReminders = localStorage.getItem('scheduled_reminders');
    if (savedReminders) {
      try {
        reminders = JSON.parse(savedReminders);
      } catch (e) {
        console.error(e);
      }
    }
    reminders = reminders.filter((r: any) => r.entryId !== `day_${date}`);

    if (enabled && times.length > 0) {
      localStorage.setItem(`day_notification_${date}`, JSON.stringify(times));

      const newReminders = times.map(time => ({
        id: crypto.randomUUID(),
        entryId: `day_${date}`,
        date,
        time,
        subjectName: 'Estudos',
        subjectColor: '#A855F7', // Day color indicator (purple)
        title: 'Lembrete do Dia ⏰',
        body: 'Hora de iniciar sua rotina de estudos!',
        triggered: false
      }));
      localStorage.setItem('scheduled_reminders', JSON.stringify([...reminders, ...newReminders]));
    } else {
      localStorage.removeItem(`day_notification_${date}`);
      localStorage.setItem('scheduled_reminders', JSON.stringify(reminders));
    }

    setDayNotificationState(prev => ({
      enabled,
      times,
      newTime: prev.newTime
    }));
  };

  const handleUpdateNotifications = (entryId: string, enabled: boolean, times: string[], subjectId: string) => {
    const subject = getSubject(subjectId);
    const subjectName = subject?.name || 'Estudos';
    const subjectColor = subject?.color || '#5B8C7E';

    let reminders: any[] = [];
    const savedReminders = localStorage.getItem('scheduled_reminders');
    if (savedReminders) {
      try {
        reminders = JSON.parse(savedReminders);
      } catch (e) {
        console.error(e);
      }
    }
    reminders = reminders.filter((r: any) => r.entryId !== entryId);

    if (enabled && times.length > 0) {
      localStorage.setItem(`entry_notification_${entryId}`, JSON.stringify(times));

      const newReminders = times.map(time => ({
        id: crypto.randomUUID(),
        entryId,
        date,
        time,
        subjectName,
        subjectColor,
        title: 'Hora de Estudar! 📚',
        body: `Lembrete para estudar ${subjectName}`,
        triggered: false
      }));
      localStorage.setItem('scheduled_reminders', JSON.stringify([...reminders, ...newReminders]));
    } else {
      localStorage.removeItem(`entry_notification_${entryId}`);
      localStorage.setItem('scheduled_reminders', JSON.stringify(reminders));
    }

    setNotificationStates(prev => ({
      ...prev,
      [entryId]: {
        enabled,
        times,
        newTime: prev[entryId]?.newTime || '14:00'
      }
    }));
  };

  const focusSessions = useMemo(
    () => getSessionsForDate(date).filter((session) => session.isFocusSession !== false),
    [date, getSessionsForDate],
  );

  const completedCount = entries.filter((entry) => entry.completed).length;
  const plannedMinutes = entries.reduce((acc, entry) => acc + (entry.plannedMinutes || 0), 0);
  const executedMinutes = sumSessionActualMinutes(focusSessions);
  const pauseMinutes = sumSessionPauseMinutes(focusSessions, data.sessionPauses);
  const targetDelta = targetDraftMinutes === undefined ? undefined : targetDraftMinutes - plannedMinutes;

  const subjectMinutesById = useMemo(() => {
    return focusSessions.reduce<Record<string, number>>((acc, session) => {
      acc[session.subjectId] = (acc[session.subjectId] || 0) + getSessionActualMinutes(session);
      return acc;
    }, {});
  }, [focusSessions]);

  const linkedMinutesByEntryId = useMemo(() => {
    return focusSessions.reduce<Record<string, number>>((acc, session) => {
      if (!session.scheduleEntryId) return acc;
      acc[session.scheduleEntryId] = (acc[session.scheduleEntryId] || 0) + getSessionActualMinutes(session);
      return acc;
    }, {});
  }, [focusSessions]);

  const plannedSubjectIds = useMemo(() => new Set(entries.map((e) => e.subjectId)), [entries]);

  const unplannedSubjectsData = useMemo(() => {
    const groups: Record<string, { subjectId: string; doneMinutes: number; sessions: StudySession[] }> = {};

    focusSessions.forEach((session) => {
      if (!plannedSubjectIds.has(session.subjectId)) {
        if (!groups[session.subjectId]) {
          groups[session.subjectId] = {
            subjectId: session.subjectId,
            doneMinutes: 0,
            sessions: [],
          };
        }
        groups[session.subjectId].doneMinutes += getSessionActualMinutes(session);
        groups[session.subjectId].sessions.push(session);
      }
    });

    return Object.values(groups).filter((g) => g.doneMinutes > 0);
  }, [focusSessions, plannedSubjectIds]);

  const formattedDateLabel = useMemo(() => {
    const raw = new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    return raw.charAt(0).toUpperCase() + raw.slice(1);
  }, [date]);

  return (
    <div className="space-y-6">
      <div className="space-y-4 border-b border-border/40 pb-4">
        <div>
          <div className="flex items-center ">
            <h4 className="text-sm font-bold text-foreground">
              {formattedDateLabel}
            </h4>
            {dayNotificationState.enabled && dayNotificationState.times.length > 0 && (
              <Bell className="w-3.5 h-3.5 text-warning shrink-0 animate-pulse" title="Notificações do dia ativas" />
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5">Resumo do seu cronograma para este dia.</p>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <Button 
            variant={dayNotificationExpanded ? "default" : "outline"} 
            size="sm"
            className={cn(
              "rounded-xl text-[11px] font-bold h-9 px-3 gap-1.5 w-full justify-center",
              dayNotificationState.enabled && !dayNotificationExpanded && "border-warning text-warning hover:text-warning"
            )}
            onClick={() => {
              setDayNotificationExpanded(!dayNotificationExpanded);
              setExpandedNotifications(null);
              setExpandedRecurrence(null);
            }} 
            title="Configurar lembretes do dia"
          >
            <Bell className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Lembretes</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            className="rounded-xl text-[11px] font-bold h-9 px-3 gap-1.5 w-full justify-center"
            onClick={() => onAdd(date)} 
            title="Adicionar materia"
          >
            <Plus className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Matéria</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            className="rounded-xl text-[11px] font-bold h-9 px-3 gap-1.5 w-full justify-center"
            onClick={() => onNote(date)} 
            title="Editar observacao"
          >
            <MessageSquare className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Anotar</span>
          </Button>
        </div>
      </div>

      {dayNotificationExpanded && (
        <div className="p-4 rounded-[20px] bg-muted/40 border border-border/50 space-y-3 text-left">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[13px] font-bold text-foreground">Lembretes para este dia</span>
              <p className="text-[10px] text-muted-foreground">Receba alertas no aparelho para iniciar os estudos do dia.</p>
            </div>
            <Switch
              checked={dayNotificationState.enabled}
              onCheckedChange={(checked) => handleUpdateDayNotifications(checked, dayNotificationState.times)}
            />
          </div>

          {dayNotificationState.enabled && (
            <div className="space-y-2.5 pt-2.5 border-t border-border/20">
              <div className="flex gap-2">
                <Input
                  type="time"
                  value={dayNotificationState.newTime}
                  onChange={(e) => {
                    setDayNotificationState(prev => ({
                      ...prev,
                      newTime: e.target.value
                    }));
                  }}
                  className="rounded-xl border-border h-9 w-24 font-bold text-xs bg-background"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    if (!dayNotificationState.newTime) return;
                    if (dayNotificationState.times.includes(dayNotificationState.newTime)) {
                      toast.info('Este horário já foi adicionado.');
                      return;
                    }
                    const updatedTimes = [...dayNotificationState.times, dayNotificationState.newTime].sort();
                    handleUpdateDayNotifications(dayNotificationState.enabled, updatedTimes);
                  }}
                  className="rounded-xl h-9 text-[11px] font-bold flex-1"
                >
                  <Plus className="h-3 w-3 mr-1.5" />
                  Adicionar
                </Button>
              </div>

              {dayNotificationState.times.length > 0 ? (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {dayNotificationState.times.map((time) => (
                    <div
                      key={time}
                      className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-background border border-border text-[11px] font-bold text-foreground"
                    >
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      {time}
                      <button
                        type="button"
                        onClick={() => {
                          const updatedTimes = dayNotificationState.times.filter(t => t !== time);
                          handleUpdateDayNotifications(dayNotificationState.enabled, updatedTimes);
                        }}
                        className="h-4.5 w-4.5 rounded-full hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors"
                      >
                        <Trash2 className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[10px] text-muted-foreground text-center py-2 border border-dashed rounded-xl bg-background/50 font-medium">
                  Nenhum horário de lembrete adicionado ainda.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      <CompactTimerPlayer
        variant="embedded"
        className="!static !w-full !left-auto !right-auto !bottom-auto shadow-none"
      />

      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-2 sm:items-end">
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Meta total do dia</p>
          <DurationPickerField
            valueMinutes={targetDraftMinutes}
            onChangeMinutes={onTargetDraftChange}
            placeholder="Meta do dia"
            includeSeconds
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap sm:self-end">
          <p className="text-[11px] text-muted-foreground">
            Meta {formatMinutesCompact(targetDraftMinutes)} | Delta meta x planejado {formatMinutesCompact(targetDelta)}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {entries.map((entry) => {
          const subject = getSubject(entry.subjectId);
          const doneMinutes = linkedMinutesByEntryId[entry.id] ?? subjectMinutesById[entry.subjectId] ?? 0;
          const sessionDurationMinutes = entry.durationMinutes ?? entry.plannedMinutes ?? 0;
          const hasNotification = (() => {
            try {
              const saved = localStorage.getItem(`entry_notification_${entry.id}`);
              if (saved) {
                const parsed = JSON.parse(saved);
                return Array.isArray(parsed) && parsed.length > 0;
              }
            } catch (e) {
              // ignore
            }
            return false;
          })();

          return (
            <div key={entry.id} className="rounded-xl border border-border/60 bg-background/70 px-2.5 py-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onToggleComplete(entry.id)}
                  className="text-muted-foreground hover:text-foreground"
                  title={entry.completed ? 'Desmarcar' : 'Marcar concluida'}
                >
                  {entry.completed ? <CheckCircle2 className="w-4 h-4 text-success" /> : <Circle className="w-4 h-4" />}
                </button>

                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: subject?.color }} />

                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium truncate ${entry.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {subject?.name || 'Materia'}
                    {entry.optional ? <span className="ml-1 text-[10px] text-muted-foreground">(opcional)</span> : null}
                  </p>
                  <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1">
                    {hasNotification && <Bell className="w-3 h-3 text-warning shrink-0 animate-pulse" title="Notificação ativa" />}
                    <span>
                      {entry.startTime || '--:--'} | {entry.plannedMinutes ? `meta ${formatMinutesCompact(entry.plannedMinutes)}` : 'sem meta'} | sessao {formatMinutesCompact(sessionDurationMinutes)} | feito {formatMinutesCompact(doneMinutes)}
                    </span>
                  </p>
                </div>

                <ScheduleItemPlayButton entry={entry} date={date} />

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted/60"
                      title="Mais acoes"
                    >
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem 
                      onClick={() => {
                        setExpandedEntryId(expandedEntryId === entry.id ? null : entry.id);
                        setExpandedRecurrence(null);
                        setExpandedNotifications(null);
                      }}
                    >
                      <Pencil className="w-4 h-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onMove(entry)}>
                      <MoveRight className="w-4 h-4 mr-2" />
                      Mover
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onChange(entry)}>
                      <ArrowRightLeft className="w-4 h-4 mr-2" />
                      Trocar materia
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setEntryPendingRemoval(entry)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remover
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {expandedEntryId === entry.id && (
                <div className="mt-3 pt-3 border-t border-border/40 space-y-3">
                  
                  <div className="flex flex-col gap-3">
                    <div className="space-y-1">
                      <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Horario planejado</p>
                      <ClockTimePickerField
                        value={entry.startTime}
                        onChange={(value) => onUpdateEntry(entry.id, { startTime: value, isOverride: true })}
                        placeholder="--:--"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Meta da materia</p>
                        <DurationPickerField
                          valueMinutes={entry.plannedMinutes}
                          onChangeMinutes={(valueMinutes) => onUpdateEntry(entry.id, { plannedMinutes: valueMinutes, isOverride: true })}
                          placeholder="Meta"
                          includeSeconds
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Duracao da sessao</p>
                        <DurationPickerField
                          valueMinutes={entry.durationMinutes ?? entry.plannedMinutes}
                          onChangeMinutes={(valueMinutes) => onUpdateEntry(entry.id, { durationMinutes: valueMinutes, isOverride: true })}
                          placeholder="Sessao"
                          includeSeconds
                        />
                      </div>
                    </div>
                  </div>

                {onEditSubject && (
                  <div className="flex justify-end">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-full text-[11px] font-semibold"
                      onClick={() => onEditSubject(entry.subjectId)}
                    >
                      <Pencil className="w-3.5 h-3.5 mr-1.5" />
                      Editar materia
                    </Button>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-4">
                  {onApplyRecurrence && (
                    <button 
                      type="button" 
                      onClick={() => {
                        setExpandedRecurrence(expandedRecurrence === entry.id ? null : entry.id);
                        setExpandedNotifications(null);
                      }}
                      className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
                    >
                      <RefreshCw className={cn("w-3 h-3", expandedRecurrence === entry.id ? "animate-spin-slow" : "")} />
                      {expandedRecurrence === entry.id ? "Fechar repetição" : "Configurar repetição"}
                    </button>
                  )}

                  <button 
                    type="button" 
                    onClick={() => {
                      setExpandedNotifications(expandedNotifications === entry.id ? null : entry.id);
                      setExpandedRecurrence(null);
                    }}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
                  >
                    <Bell className="w-3 h-3" />
                    {expandedNotifications === entry.id ? "Fechar lembretes" : "Configurar lembretes"}
                  </button>
                </div>

                {onApplyRecurrence && expandedRecurrence === entry.id && (
                  <div className="mt-2 p-4 rounded-[20px] bg-[#EBEBEB] border-none space-y-3 shadow-inner">
                    <div className="flex items-center justify-between">
                      <span className="text-[14px] font-bold text-[#333]">Recorrência</span>
                      <div className="bg-[#222] text-white text-[9px] font-black px-2 py-0.5 rounded-full tracking-tighter">ATIVO</div>
                    </div>

                    <div className="space-y-2">
                      <Select 
                        value={recurrenceForms[entry.id]?.frequency || 'daily'} 
                        onValueChange={(val) => setRecurrenceForms(f => ({ ...f, [entry.id]: { ...(f[entry.id] || { value: 1, unit: 'days', frequency: 'daily' }), frequency: val } }))}
                      >
                        <SelectTrigger className="h-12 bg-white border-none rounded-[15px] text-[13px] font-medium shadow-sm px-4">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-[15px]">
                          <SelectItem value="daily">Diariamente</SelectItem>
                          <SelectItem value="weekly">Semanalmente</SelectItem>
                        </SelectContent>
                      </Select>

                      <div className="flex items-center gap-2">
                        <span className="text-[13px] text-[#666] font-medium ml-1">por</span>
                        <Input 
                          type="number" 
                          min={1} 
                          max={365} 
                          value={recurrenceForms[entry.id]?.value || 1}
                          onChange={(e) => setRecurrenceForms(f => ({ ...f, [entry.id]: { ...(f[entry.id] || { value: 1, unit: 'days', frequency: 'daily' }), value: Number(e.target.value) } }))}
                          className="h-12 w-16 bg-white border-none rounded-[15px] text-[13px] font-medium shadow-sm text-center"
                        />
                        <Select 
                          value={recurrenceForms[entry.id]?.unit || 'days'} 
                          onValueChange={(val) => setRecurrenceForms(f => ({ ...f, [entry.id]: { ...(f[entry.id] || { value: 1, unit: 'days', frequency: 'daily' }), unit: val } }))}
                        >
                          <SelectTrigger className="h-12 flex-1 bg-white border-none rounded-[15px] text-[13px] font-medium shadow-sm px-4">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-[15px]">
                            <SelectItem value="days">Dias</SelectItem>
                            <SelectItem value="weeks">Semanas</SelectItem>
                            <SelectItem value="months">Meses</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="flex justify-end pt-1">
                      <Button 
                        size="sm" 
                        className="h-9 px-6 rounded-full bg-[#222] hover:bg-[#333] text-white font-bold text-[11px]" 
                        onClick={() => {
                          const form = recurrenceForms[entry.id] || { value: 1, unit: 'days', frequency: 'daily' };
                          onApplyRecurrence(entry.id, form.value, form.unit, form.frequency);
                          setExpandedRecurrence(null);
                        }}
                      >
                        Aplicar Alteração
                      </Button>
                    </div>
                  </div>
                )}

                {expandedNotifications === entry.id && (() => {
                  const notifState = notificationStates[entry.id] || (() => {
                    let enabled = false;
                    let times: string[] = [];
                    try {
                      const saved = localStorage.getItem(`entry_notification_${entry.id}`);
                      if (saved) {
                        const parsed = JSON.parse(saved);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                          enabled = true;
                          times = parsed;
                        }
                      }
                    } catch (e) {
                      // ignore
                    }
                    return { enabled, times, newTime: '14:00' };
                  })();

                  return (
                    <div className="mt-2 p-4 rounded-[20px] bg-muted/40 border border-border/50 space-y-3 text-left">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <span className="text-[13px] font-bold text-foreground">Lembretes para esta tarefa</span>
                          <p className="text-[10px] text-muted-foreground">Receba alertas no aparelho para esta matéria.</p>
                        </div>
                        <Switch
                          checked={notifState.enabled}
                          onCheckedChange={(checked) => handleUpdateNotifications(entry.id, checked, notifState.times, entry.subjectId)}
                        />
                      </div>

                      {notifState.enabled && (
                        <div className="space-y-2.5 pt-2.5 border-t border-border/20">
                          <div className="flex gap-2">
                            <Input
                              type="time"
                              value={notifState.newTime}
                              onChange={(e) => {
                                setNotificationStates(prev => ({
                                  ...prev,
                                  [entry.id]: {
                                    ...(prev[entry.id] || notifState),
                                    newTime: e.target.value
                                  }
                                }));
                              }}
                              className="rounded-xl border-border h-9 w-24 font-bold text-xs bg-background"
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              onClick={() => {
                                if (!notifState.newTime) return;
                                if (notifState.times.includes(notifState.newTime)) {
                                  toast.info('Este horário já foi adicionado.');
                                  return;
                                }
                                const updatedTimes = [...notifState.times, notifState.newTime].sort();
                                handleUpdateNotifications(entry.id, notifState.enabled, updatedTimes, entry.subjectId);
                              }}
                              className="rounded-xl h-9 text-[11px] font-bold flex-1"
                            >
                              <Plus className="h-3 w-3 mr-1.5" />
                              Adicionar
                            </Button>
                          </div>

                          {notifState.times.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5 pt-1">
                              {notifState.times.map((time) => (
                                <div
                                  key={time}
                                  className="inline-flex items-center gap-1 pl-2.5 pr-1 py-0.5 rounded-full bg-background border border-border text-[11px] font-bold text-foreground"
                                >
                                  <Clock className="h-3 w-3 text-muted-foreground" />
                                  {time}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedTimes = notifState.times.filter(t => t !== time);
                                      handleUpdateNotifications(entry.id, notifState.enabled, updatedTimes, entry.subjectId);
                                    }}
                                    className="h-4.5 w-4.5 rounded-full hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors"
                                  >
                                    <Trash2 className="h-2.5 w-2.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] text-muted-foreground text-center py-2 border border-dashed rounded-xl bg-background/50 font-medium">
                              Nenhum horário de lembrete adicionado ainda.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}
                </div>
              )}
            </div>
          );
        })}

        {entries.length === 0 && (
          <p className="text-xs text-muted-foreground rounded-lg border border-dashed border-border/70 px-3 py-4 text-center">
            Adicione materias no dia para iniciar o timer por aqui.
          </p>
        )}
      </div>

      {unplannedSubjectsData.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
            Matérias extra (fora do cronograma)
          </p>
          <div className="space-y-2">
              {unplannedSubjectsData.map((item) => {
              const subject = getSubject(item.subjectId);
              return (
                <div key={item.subjectId} className="rounded-xl border border-dashed border-border/60 bg-background/50 px-2.5 py-2">
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-muted-foreground/60" />
                    
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: subject?.color || '#a1a1a1' }} />

                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate text-foreground">
                        {subject?.name || 'Matéria'}
                      </p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        feito {formatMinutesCompact(item.doneMinutes)}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {item.sessions.length === 1 && (
                        <button
                          type="button"
                          title="Editar sessão"
                          onClick={() => setEditingSession(item.sessions[0])}
                          className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                      )}
                      {item.sessions.length > 1 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              title="Editar sessão"
                              className="h-6 w-6 rounded-md flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {item.sessions.map((sess, idx) => (
                              <DropdownMenuItem key={sess.id} onClick={() => setEditingSession(sess)}>
                                Sessão {idx + 1} — {formatMinutesCompact(getSessionActualMinutes(sess))}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                      <span className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-[9px] font-black uppercase tracking-wider text-muted-foreground border border-border/40">
                        Extra
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {dayNotes.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-[0.1em]">Observacoes do dia</p>
          {dayNotes.map((note) => (
            <div key={note.id} className="rounded-lg border border-border/60 bg-background/70 px-2.5 py-2 text-xs text-foreground">
              {note.content}
            </div>
          ))}
        </div>
      )}

      <DayAnalysisSummary
        completedCount={completedCount + unplannedSubjectsData.length}
        totalCount={entries.length + unplannedSubjectsData.length}
        plannedMinutes={plannedMinutes}
        executedMinutes={executedMinutes}
        pauseMinutes={pauseMinutes}
        targetMinutes={targetDraftMinutes}
      />

      <AlertDialog
        open={Boolean(entryPendingRemoval)}
        onOpenChange={(open) => {
          if (!open) setEntryPendingRemoval(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover materia do dia?</AlertDialogTitle>
            <AlertDialogDescription>
              Essa acao remove a materia selecionada do cronograma deste dia.
              {entryPendingRemoval ? ` Materia: ${getSubject(entryPendingRemoval.subjectId)?.name || 'Materia'}.` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!entryPendingRemoval) return;
                onRemove(entryPendingRemoval.id);
                setEntryPendingRemoval(null);
              }}
            >
              Sim, remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SessionDialog
        open={editingSession !== null}
        onOpenChange={(open) => { if (!open) setEditingSession(null); }}
        session={editingSession ?? undefined}
      />
    </div>
  );
}

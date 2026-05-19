import React, { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  CheckCircle2,
  Circle,
  MessageSquare,
  MoreHorizontal,
  MoveRight,
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
import { Note, ScheduleEntry } from '@/types/study';
import { useIsMobile } from '@/hooks/use-mobile';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  onApplyRecurrence,
  dayNotes,
}: DaySidebarTimerPanelProps) {
  const { getSubject, getSessionsForDate, data } = useStudy();
  const isMobile = useIsMobile();
  const [entryPendingRemoval, setEntryPendingRemoval] = useState<ScheduleEntry | null>(null);
  const [recurrenceForms, setRecurrenceForms] = useState<Record<string, { value: number, unit: string, frequency: string }>>({});
  const [expandedRecurrence, setExpandedRecurrence] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-[0.11em]">Painel rapido do dia</h3>
          <p className="text-[11px] text-muted-foreground">Timer + materias + edicao em poucos passos</p>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onAdd(date)} title="Adicionar materia">
            <Plus className="w-3.5 h-3.5" />
          </Button>
          <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => onNote(date)} title="Editar observacao">
            <MessageSquare className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

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
                  <p className="text-[11px] text-muted-foreground truncate">
                    {entry.startTime || '--:--'} | {entry.plannedMinutes ? `meta ${formatMinutesCompact(entry.plannedMinutes)}` : 'sem meta'} | feito {formatMinutesCompact(doneMinutes)}
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

              <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Horario planejado</p>
                  <ClockTimePickerField
                    value={entry.startTime}
                    onChange={(value) => onUpdateEntry(entry.id, { startTime: value, isOverride: true })}
                    placeholder="--:--"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Meta da materia</p>
                  <DurationPickerField
                    valueMinutes={entry.plannedMinutes}
                    onChangeMinutes={(valueMinutes) => onUpdateEntry(entry.id, { plannedMinutes: valueMinutes, isOverride: true })}
                    placeholder="Meta"
                    includeSeconds
                  />
                </div>
              </div>

              {onApplyRecurrence && (
                <div className="mt-3 pt-3 border-t border-border/40">
                  <button 
                    type="button" 
                    onClick={() => setExpandedRecurrence(expandedRecurrence === entry.id ? null : entry.id)}
                    className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-primary hover:text-primary/80 transition-colors"
                  >
                    <RefreshCw className={cn("w-3 h-3", expandedRecurrence === entry.id ? "animate-spin-slow" : "")} />
                    {expandedRecurrence === entry.id ? "Fechar recorrência" : "Configurar repetição"}
                  </button>

                  {expandedRecurrence === entry.id && (
                    <div className="mt-3 p-4 rounded-[20px] bg-[#EBEBEB] border-none space-y-3 shadow-inner">
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
        completedCount={completedCount}
        totalCount={entries.length}
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
    </div>
  );
}

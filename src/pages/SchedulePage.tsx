import React, { useEffect, useMemo, useState } from 'react';
import { SubjectCreateInput, useStudy } from '@/contexts/StudyContext';
import { ScheduleView, ScheduleEntry, DAY_NAMES_SHORT } from '@/types/study';
import { ChevronLeft, ChevronRight, ArrowRightLeft, MoveRight, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import WeeklyPlannerView from '@/components/schedule/WeeklyPlannerView';
import TemplateEditor from '@/components/schedule/TemplateEditor';
import ApplyTemplateDialog from '@/components/schedule/ApplyTemplateDialog';
import PropagationDialog, { PropagationScope } from '@/components/schedule/PropagationDialog';
import DayDetailSheet from '@/components/schedule/DayDetailSheet';
import { useTemplates } from '@/hooks/useTemplates';
import { getMonday, parseDateKey, toDateKey } from '@/lib/date-utils';
import { buildMonthlyCells, buildYearlyMinutesSummary } from '@/features/schedule/selectors';
import { formatMinutesCompact } from '@/lib/duration-utils';
import { ClockTimePickerField, DurationPickerField } from '@/components/generic/time-picker-fields';
import { useIsMobile } from '@/hooks/use-mobile';
import { SubjectFinder } from '@/components/generic/subject-finder';
import { SubjectForm } from '@/components/generic/subject-form';

const VIEWS: { key: ScheduleView; label: string; icon?: React.ReactNode }[] = [
  { key: 'weekly', label: 'Semanal' },
  { key: 'monthly', label: 'Mensal' },
  { key: 'yearly', label: 'Anual' },
  { key: 'templates', label: 'Templates', icon: <LayoutTemplate className="w-3.5 h-3.5" /> },
];

function formatMin(m: number) { const h = Math.floor(m / 60); return h > 0 ? `${h}h ${m % 60}m` : `${m}m`; }
function formatWeekRangeLabel(date: Date) {
  const monday = getMonday(date);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const start = monday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  const end = sunday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  return `Semana ${start} - ${end}`;
}

export default function SchedulePage() {
  const [view, setView] = useState<ScheduleView>('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const {
    data,
    
    createSubject,
    getSubject,
    getScheduleForDate,
    updateScheduleEntry,
    deleteScheduleEntry,
    addScheduleEntry,
    addNote,
  } = useStudy();
  const { templates } = useTemplates();

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);

  const [addDialog, setAddDialog] = useState(false);
  const [addDate, setAddDate] = useState('');
  const [addSubjectId, setAddSubjectId] = useState('');
  const [addOptional, setAddOptional] = useState(false);
  const [addStartTime, setAddStartTime] = useState('');
  const [addPlannedMinutes, setAddPlannedMinutes] = useState<number | undefined>(undefined);

  const [noteDialog, setNoteDialog] = useState(false);
  const [noteDate, setNoteDate] = useState('');
  const [noteContent, setNoteContent] = useState('');

  const [moveDialog, setMoveDialog] = useState(false);
  const [moveEntry, setMoveEntry] = useState<ScheduleEntry | null>(null);
  const [moveTargetDate, setMoveTargetDate] = useState('');

  const [changeDialog, setChangeDialog] = useState(false);
  const [changeEntry, setChangeEntry] = useState<ScheduleEntry | null>(null);
  const [changeSubjectId, setChangeSubjectId] = useState('');

  const [propagationDialog, setPropagationDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'move' | 'change' | 'remove'; entry: ScheduleEntry; payload?: any } | null>(null);

  const [applyDialog, setApplyDialog] = useState(false);
  const [applyTemplateId, setApplyTemplateId] = useState('');
  const [quickSubjectDialog, setQuickSubjectDialog] = useState(false);
  const [quickSubjectForm, setQuickSubjectForm] = useState<SubjectCreateInput>({
    name: '',
    color: '#5B8C7E',
    active: true,
    optional: false,
    weeklyGoalHours: 0,
    monthlyGoalHours: 0,
  });

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === 'weekly') d.setDate(d.getDate() + dir * 7);
    else if (view === 'monthly') d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    setCurrentDate(d);
  };

  const openDayDetail = (date: string) => {
    setSelectedDay(date);
    setCurrentDate(parseDateKey(date));
    setDayDetailOpen(true);
  };

  const handleAdd = () => {
    if (!addSubjectId) { toast.error('Selecione uma materia'); return; }
    const existing = getScheduleForDate(addDate);
    addScheduleEntry({
      date: addDate,
      subjectId: addSubjectId,
      optional: addOptional,
      completed: false,
      order: existing.length,
      startTime: addStartTime || undefined,
      plannedMinutes: addPlannedMinutes,
    });
    toast.success('Adicionado ao cronograma');
    setAddDialog(false);
  };

  const handleNote = () => {
    if (!noteContent.trim()) return;
    addNote({ type: 'day', referenceDate: noteDate, content: noteContent });
    toast.success('Observacao salva');
    setNoteDialog(false);
    setNoteContent('');
  };

  const executePropagatedAction = async (scope: PropagationScope) => {
    if (!pendingAction) return;
    const { type, entry, payload } = pendingAction;

    if (scope === 'single') {
      if (type === 'move') {
        await updateScheduleEntry(entry.id, { date: payload.date, startTime: payload.startTime, isOverride: true });
        toast.success('Materia movida');
      } else if (type === 'change') {
        await updateScheduleEntry(entry.id, { subjectId: payload.subjectId, isOverride: true });
        toast.success('Materia trocada');
      } else if (type === 'remove') {
        await deleteScheduleEntry(entry.id);
        toast.success('Materia removida');
      }
    } else if (scope === 'forward') {
      const entryDate = new Date(entry.date + 'T12:00:00');
      const futureEntries = data.schedule.filter(e =>
        e.templateId === entry.templateId &&
        e.date >= entry.date &&
        !e.isOverride &&
        new Date(e.date + 'T12:00:00').getDay() === entryDate.getDay()
      );

      for (const fe of futureEntries) {
        if (type === 'change') {
          await updateScheduleEntry(fe.id, { subjectId: payload.subjectId, isOverride: true });
        } else if (type === 'remove') {
          await deleteScheduleEntry(fe.id);
        }
      }
      if (type === 'move') {
        await updateScheduleEntry(entry.id, { date: payload.date, startTime: payload.startTime, isOverride: true });
      }
      toast.success('Alteracao propagada');
    } else if (scope === 'template') {
      if (type === 'move') {
        await updateScheduleEntry(entry.id, { ...(payload || {}), isOverride: true });
      } else if (type === 'change') {
        await updateScheduleEntry(entry.id, { subjectId: payload.subjectId, isOverride: true });
      } else if (type === 'remove') {
        await deleteScheduleEntry(entry.id);
      }
      toast.success('Template atualizado');
    }

    setPendingAction(null);
  };

  const handleMove = () => {
    if (!moveEntry || !moveTargetDate) { toast.error('Selecione uma data'); return; }
    if (moveEntry.templateId && !moveEntry.isOverride) {
      setPendingAction({ type: 'move', entry: moveEntry, payload: { date: moveTargetDate } });
      setMoveDialog(false);
      setPropagationDialog(true);
    } else {
      updateScheduleEntry(moveEntry.id, { date: moveTargetDate });
      toast.success('Materia movida!');
      setMoveDialog(false);
    }
    setMoveEntry(null);
  };

  const handleChangeSubject = () => {
    if (!changeEntry || !changeSubjectId) { toast.error('Selecione uma materia'); return; }
    if (changeEntry.templateId && !changeEntry.isOverride) {
      setPendingAction({ type: 'change', entry: changeEntry, payload: { subjectId: changeSubjectId } });
      setChangeDialog(false);
      setPropagationDialog(true);
    } else {
      updateScheduleEntry(changeEntry.id, { subjectId: changeSubjectId });
      toast.success('Materia trocada!');
      setChangeDialog(false);
    }
    setChangeEntry(null);
  };

  const handleRemoveEntry = (id: string) => {
    const entry = data.schedule.find(e => e.id === id);
    if (entry?.templateId && !entry.isOverride) {
      setPendingAction({ type: 'remove', entry });
      setPropagationDialog(true);
    } else {
      deleteScheduleEntry(id);
      toast.success('Materia removida do dia');
    }
  };

  const openAddFor = (date: string) => {
    setAddDate(date);
    setAddSubjectId('');
    setAddOptional(false);
    setAddStartTime('');
    setAddPlannedMinutes(undefined);
    setAddDialog(true);
  };

  const openNoteFor = (date: string) => {
    setNoteDate(date);
    const existing = data.notes.find(n => n.type === 'day' && n.referenceDate === date);
    setNoteContent(existing?.content || '');
    setNoteDialog(true);
  };

  const openMoveFor = (entry: ScheduleEntry) => {
    setMoveEntry(entry);
    setMoveTargetDate('');
    setMoveDialog(true);
  };

  const openChangeFor = (entry: ScheduleEntry) => {
    setChangeEntry(entry);
    setChangeSubjectId('');
    setChangeDialog(true);
  };

  const openApplyTemplate = (templateId: string) => {
    setApplyTemplateId(templateId);
    setApplyDialog(true);
  };

  const openQuickSubjectDialog = () => {
    setQuickSubjectForm({
      name: '',
      color: '#5B8C7E',
      active: true,
      optional: false,
      weeklyGoalHours: 0,
      monthlyGoalHours: 0,
    });
    setQuickSubjectDialog(true);
  };

  const handleQuickSubjectSave = async () => {
    if (!quickSubjectForm.name?.trim()) {
      toast.error('Informe o nome da materia');
      return;
    }
    await createSubject(quickSubjectForm);
    setQuickSubjectDialog(false);
    toast.success('Materia criada');
  };

  const handleMoveEntry = async (entryId: string, newDate: string, newStartTime?: string) => {
    const entry = data.schedule.find(e => e.id === entryId);
    if (!entry) return;

    if (entry.templateId && !entry.isOverride) {
      setPendingAction({
        type: 'move',
        entry,
        payload: { date: newDate, startTime: newStartTime }
      });
      setPropagationDialog(true);
    } else {
      await updateScheduleEntry(entryId, { date: newDate, startTime: newStartTime });
      toast.success('Materia movida!');
    }
  };

  const handleUntimedDrop = async (entryId: string, dayKey: string, beforeEventId?: string | null) => {
    const entry = data.schedule.find(e => e.id === entryId);
    if (!entry) return;

    if (entry.templateId && !entry.isOverride) {
      setPendingAction({
        type: 'move',
        entry,
        payload: { date: dayKey, startTime: undefined }
      });
      setPropagationDialog(true);
    } else {
      await updateScheduleEntry(entryId, { date: dayKey, startTime: undefined });
      toast.success('Materia movida para sem horario!');
    }
  };

  const applyTemplateName = templates.find(t => t.id === applyTemplateId)?.name || '';

  return (
    <div className="flex min-h-full flex-col gap-4 md:gap-5 w-full min-w-0 max-w-full">
      <div className="workspace-panel p-3 md:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Cronograma</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Planejamento semanal, mensal e anual com detalhe por dia.
            {''}
          </p>
        </div>
        <div className="calendar-toolbar w-fit">
          {VIEWS.map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`calendar-chip flex items-center gap-1.5 ${
                view === v.key ? 'calendar-chip-active' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {v.icon}
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {view !== 'templates' && (
        <div className="mx-auto w-full max-w-xl workspace-panel p-4 flex items-center justify-between gap-4 shadow-md bg-card/60 backdrop-blur-md border border-border/80 rounded-3xl">
          <button 
            onClick={() => navigate(-1)} 
            className="h-12 w-12 flex items-center justify-center rounded-2xl border border-border/60 bg-background/50 hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-95 transition-all shadow-sm"
            title="Anterior"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <span className="text-lg md:text-xl font-display font-extrabold text-foreground text-center capitalize tracking-tight flex-1 px-4">
            {view === 'weekly' && formatWeekRangeLabel(currentDate)}
            {view === 'monthly' && currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            {view === 'yearly' && currentDate.getFullYear().toString()}
          </span>
          <button 
            onClick={() => navigate(1)} 
            className="h-12 w-12 flex items-center justify-center rounded-2xl border border-border/60 bg-background/50 hover:bg-accent hover:text-accent-foreground hover:scale-105 active:scale-95 transition-all shadow-sm"
            title="Proximo"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </div>
      )}

      {view === 'weekly' && (
        <div className="flex-1 min-h-0">
          <WeeklyPlannerView
            currentDate={currentDate}
            onAdd={openAddFor}
            onNote={openNoteFor}
            onMove={openMoveFor}
            onChange={openChangeFor}
            onRemove={handleRemoveEntry}
            onOpenDay={openDayDetail}
            onMoveEntry={handleMoveEntry}
            onUntimedDrop={handleUntimedDrop}
          />
        </div>
      )}

      {view === 'monthly' && (
        <MonthlyView
          currentDate={currentDate}
          onDayClick={openDayDetail}
        />
      )}

      {view === 'yearly' && <YearlyView year={currentDate.getFullYear()} />}
      {view === 'templates' && <TemplateEditor onApply={openApplyTemplate} />}

      <DayDetailSheet
        open={dayDetailOpen}
        date={selectedDay}
        onOpenChange={setDayDetailOpen}
        onAdd={openAddFor}
        onNote={openNoteFor}
        onMove={openMoveFor}
        onChange={openChangeFor}
        onRemove={handleRemoveEntry}
      />

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Adicionar materia</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{addDate && new Date(addDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
            <SubjectFinder
              value={addSubjectId}
              onChange={setAddSubjectId}
              subjects={data.subjects}
              
              
              onCreateSubject={openQuickSubjectDialog}
              placeholder="Selecione a materia"
            />
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={addOptional} onChange={e => setAddOptional(e.target.checked)} className="rounded" />
              Materia opcional
            </label>
            <div className="grid grid-cols-2 gap-2">
              <ClockTimePickerField value={addStartTime || undefined} onChange={(v) => setAddStartTime(v || '')} placeholder="--:--" />
              <DurationPickerField valueMinutes={addPlannedMinutes} onChangeMinutes={setAddPlannedMinutes} placeholder="Meta" includeSeconds />
            </div>
            <Button onClick={handleAdd} className="w-full">Adicionar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Observacao</DialogTitle></DialogHeader>
          <Textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Escreva uma observacao..." rows={3} />
          <Button onClick={handleNote} className="w-full">Salvar</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={moveDialog} onOpenChange={setMoveDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Mover para outro dia</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {moveEntry && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getSubject(moveEntry.subjectId)?.color }} />
                <span className="text-sm font-medium text-foreground">{getSubject(moveEntry.subjectId)?.name}</span>
              </div>
            )}
            <div className="space-y-2">
              <Label>Nova data</Label>
              <Input type="date" value={moveTargetDate} onChange={e => setMoveTargetDate(e.target.value)} />
            </div>
            <Button onClick={handleMove} className="w-full">
              <MoveRight className="w-4 h-4 mr-2" />Mover
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={changeDialog} onOpenChange={setChangeDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Trocar materia</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {changeEntry && (
              <p className="text-sm text-muted-foreground">
                Trocar <strong>{getSubject(changeEntry.subjectId)?.name}</strong>
              </p>
            )}
            <SubjectFinder
              value={changeSubjectId}
              onChange={setChangeSubjectId}
              subjects={data.subjects}
              
              
              onCreateSubject={openQuickSubjectDialog}
              placeholder="Nova materia"
            />
            <Button onClick={handleChangeSubject} className="w-full">
              <ArrowRightLeft className="w-4 h-4 mr-2" />Trocar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <PropagationDialog
        open={propagationDialog}
        onOpenChange={setPropagationDialog}
        onSelect={executePropagatedAction}
        actionDescription={
          pendingAction?.type === 'move' ? 'Esta materia veio de um template. Como deseja aplicar a mudanca?' :
          pendingAction?.type === 'change' ? 'Esta materia veio de um template. Como deseja aplicar a troca?' :
          'Esta materia veio de um template. Como deseja aplicar a remocao?'
        }
      />

      {applyTemplateId && (
        <ApplyTemplateDialog
          open={applyDialog}
          onOpenChange={setApplyDialog}
          templateId={applyTemplateId}
          templateName={applyTemplateName}
        />
      )}

      <Dialog open={quickSubjectDialog} onOpenChange={setQuickSubjectDialog}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="font-display">Criar materia</DialogTitle>
          </DialogHeader>
          <SubjectForm
            value={quickSubjectForm}
            
            
            onChange={setQuickSubjectForm}
            onSubmit={handleQuickSubjectSave}
            onCancel={() => setQuickSubjectDialog(false)}
            submitLabel="Criar materia"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MonthlyView({ currentDate, onDayClick }: { currentDate: Date; onDayClick: (d: string) => void }) {
  const { data, getSubject } = useStudy();
  const isMobile = useIsMobile();
  const cells = buildMonthlyCells(currentDate, data.schedule, data.sessions, data.notes, data.dayPlans, data.sessionPauses);
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
    const selectedCell =
      cells.find((cell) => cell.date === selectedDate) ||
      monthCells[0] ||
      cells[0];
    const selectedMainSubjects =
      selectedCell?.entries.filter((entry) => !entry.optional) || [];
    const selectedOptionalSubjects =
      selectedCell?.entries.filter((entry) => entry.optional) || [];

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
                className={`relative aspect-square rounded-xl border p-1 transition-all focus:outline-none ${
                  cell.inCurrentMonth ? 'bg-card border-border/70' : 'bg-muted/25 border-border/40 text-muted-foreground'
                } ${isSelected ? 'ring-2 ring-primary/55 border-primary/50 shadow-sm' : ''}`}
              >
                <span className={`text-xs font-semibold ${isToday ? 'text-primary' : 'text-foreground'}`}>
                  {cell.day}
                </span>

                <div className="absolute bottom-1 left-1 right-1 flex items-center justify-center gap-1">
                  <span className={`h-1.5 w-1.5 rounded-full ${cell.stats.total > 0 ? 'bg-primary/80' : 'bg-muted'}`} />
                  <span className={`h-1.5 w-1.5 rounded-full ${cell.stats.hasPending ? 'bg-warning' : 'bg-muted'}`} />
                  <span className={`h-1.5 w-1.5 rounded-full ${cell.stats.hasObservation ? 'bg-info' : 'bg-muted'}`} />
                </div>

                {hasStudy && (
                  <span className="absolute top-1 right-1 text-[9px] text-muted-foreground tabular-nums">
                    {cell.stats.completed}/{cell.stats.total}
                  </span>
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
                  {new Date(`${selectedCell.date}T12:00:00`).toLocaleDateString('pt-BR', {
                    weekday: 'long',
                    day: '2-digit',
                    month: 'long',
                  })}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {selectedCell.stats.completed}/{selectedCell.stats.total} concluidas • feito {formatMinutesCompact(selectedCell.stats.minutes)}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-full px-3 text-[11px]"
                onClick={() => onDayClick(selectedCell.date)}
              >
                Abrir dia
              </Button>
            </div>

            {(selectedCell.stats.plannedMinutes > 0 || selectedCell.stats.dayTargetMinutes !== undefined) && (
              <p className="text-[11px] text-muted-foreground">
                {selectedCell.stats.plannedMinutes > 0 ? `Planejado ${formatMinutesCompact(selectedCell.stats.plannedMinutes)}` : 'Planejado --'}{' '}
                • {selectedCell.stats.dayTargetMinutes !== undefined ? `Meta ${formatMinutesCompact(selectedCell.stats.dayTargetMinutes)}` : 'Meta --'}
              </p>
            )}

            {(selectedMainSubjects.length > 0 || selectedOptionalSubjects.length > 0) ? (
              <div className="space-y-1.5">
                {selectedMainSubjects.map((entry) => {
                  const subject = getSubject(entry.subjectId);
                  return (
                    <div key={entry.id} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/85 px-2.5 py-2">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: subject?.color }} />
                      <p className="text-xs text-foreground truncate flex-1">{subject?.name || 'Materia'}</p>
                      <span className="text-[11px] text-muted-foreground tabular-nums">{entry.startTime || '--:--'}</span>
                    </div>
                  );
                })}
                {selectedOptionalSubjects.map((entry) => {
                  const subject = getSubject(entry.subjectId);
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
        {DAY_NAMES_SHORT.map(d => (
          <div key={d} className="text-xs text-muted-foreground text-center font-semibold py-2 uppercase tracking-wide">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {cells.map(cell => {
          const isToday = cell.date === today;
          const done = cell.stats.total > 0 && cell.stats.completed === cell.stats.total;
          const main = cell.entries.filter(e => !e.optional);
          const subjects = main.slice(0, 2).map(e => getSubject(e.subjectId)?.name).filter(Boolean) as string[];
          const extraSubjects = Math.max(main.length - 2, 0);

          return (
            <button
              key={cell.date}
              onClick={() => onDayClick(cell.date)}
              className={`text-left rounded-xl border p-2 md:p-2.5 min-h-[120px] md:min-h-[132px] transition-all hover:shadow-md hover:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/40 ${
                cell.inCurrentMonth ? 'bg-card border-border/70' : 'bg-muted/30 border-border/40 text-muted-foreground'
              } ${isToday ? 'ring-2 ring-primary/50 border-primary/40' : ''}`}
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
                {subjects.map(name => (
                  <p key={name} className="text-xs text-foreground truncate">{name}</p>
                ))}
                {extraSubjects > 0 && <p className="text-[11px] text-muted-foreground">+{extraSubjects} materias</p>}
                {cell.stats.minutes > 0 && <p className="text-[11px] text-muted-foreground">{formatMin(cell.stats.minutes)}</p>}
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

function YearlyView({ year }: { year: number }) {
  const { data } = useStudy();

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const summary = buildYearlyMinutesSummary(year, data.sessions);
  const months = monthNames.map((name, m) => ({ name, ...summary[m] }));

  const maxMin = Math.max(...months.map(m => m.totalMin), 1);

  return (
    <div className="workspace-panel p-3 md:p-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {months.map(m => (
        <div key={m.name} className="glass-card p-4 space-y-3">
          <p className="text-base font-display font-semibold text-foreground">{m.name}</p>
          <div className="w-full h-2.5 bg-muted rounded-full">
            <div className="h-full bg-primary rounded-full" style={{ width: `${(m.totalMin / maxMin) * 100}%` }} />
          </div>
          <div className="text-xs text-muted-foreground">
            {m.studiedDays} dias - {formatMin(m.totalMin)}
          </div>
        </div>
      ))}
    </div>
  );
}

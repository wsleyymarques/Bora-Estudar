import React, { useEffect, useMemo, useState } from 'react';
import { SubjectCreateInput, useStudy } from '@/contexts/StudyContext';
import { ScheduleView, ScheduleEntry, DAY_NAMES_SHORT } from '@/types/study';
import { ArrowRightLeft, MoveRight, LayoutTemplate, Loader2, CalendarDays, MoveRight as MoveIcon } from 'lucide-react';
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
import { ResponsivePanel } from '@/components/generic/ResponsivePanel';
import { getMonday, parseDateKey, toDateKey } from '@/lib/date-utils';
import { ClockTimePickerField, DurationPickerField } from '@/components/generic/time-picker-fields';
import { SubjectFinder } from '@/components/generic/subject-finder';
import { SubjectForm } from '@/components/generic/subject-form';
import { ScheduleShell } from '@/components/schedule/ScheduleShell';
import { ScheduleMonthlyView } from '@/components/schedule/ScheduleMonthlyView';
import { ScheduleYearlyView } from '@/components/schedule/ScheduleYearlyView';

const VIEWS: { key: ScheduleView; label: string; icon?: React.ReactNode }[] = [
  { key: 'weekly', label: 'Semanal' },
  { key: 'monthly', label: 'Mensal' },
  { key: 'yearly', label: 'Anual' },
  { key: 'templates', label: 'Templates', icon: <LayoutTemplate className="w-3.5 h-3.5" /> },
];

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
    if (!addSubjectId) { toast.error('Selecione uma matéria'); return; }
    const existing = getScheduleForDate(addDate);
    addScheduleEntry({
      date: addDate,
      subjectId: addSubjectId,
      optional: addOptional,
      completed: false,
      order: existing.length,
      startTime: addStartTime || undefined,
      planned_minutes: addPlannedMinutes,
    });
    toast.success('Adicionado ao cronograma');
    setAddDialog(false);
  };

  const handleNote = () => {
    if (!noteContent.trim()) return;
    addNote({ type: 'day', referenceDate: noteDate, content: noteContent });
    toast.success('Observação salva');
    setNoteDialog(false);
    setNoteContent('');
  };

  const executePropagatedAction = async (scope: PropagationScope) => {
    if (!pendingAction) return;
    const { type, entry, payload } = pendingAction;

    if (scope === 'single') {
      if (type === 'move') {
        await updateScheduleEntry(entry.id, { date: payload.date, isOverride: true });
        toast.success('Matéria movida');
      } else if (type === 'change') {
        await updateScheduleEntry(entry.id, { subjectId: payload.subjectId, isOverride: true });
        toast.success('Matéria trocada');
      } else if (type === 'remove') {
        await deleteScheduleEntry(entry.id);
        toast.success('Matéria removida');
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
        await updateScheduleEntry(entry.id, { date: payload.date, isOverride: true });
      }
      toast.success('Alteração propagada');
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
      toast.success('Matéria movida!');
      setMoveDialog(false);
    }
    setMoveEntry(null);
  };

  const handleChangeSubject = () => {
    if (!changeEntry || !changeSubjectId) { toast.error('Selecione uma matéria'); return; }
    if (changeEntry.templateId && !changeEntry.isOverride) {
      setPendingAction({ type: 'change', entry: changeEntry, payload: { subjectId: changeSubjectId } });
      setChangeDialog(false);
      setPropagationDialog(true);
    } else {
      updateScheduleEntry(changeEntry.id, { subjectId: changeSubjectId });
      toast.success('Matéria trocada!');
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
      toast.success('Matéria removida do dia');
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
      toast.error('Informe o nome da matéria');
      return;
    }
    await createSubject(quickSubjectForm);
    setQuickSubjectDialog(false);
    toast.success('Matéria criada');
  };

  const applyTemplateName = templates.find(t => t.id === applyTemplateId)?.name || '';

  return (
    <div className="space-y-5 sm:space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-display font-bold text-foreground">Cronograma</h1>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5 w-full sm:w-auto overflow-x-auto">
          {VIEWS.map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === v.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-md hover:bg-muted"><ChevronLeft className="w-4 h-4" /></button>
        <span className="text-sm font-medium text-foreground min-w-[120px] text-center">
          {view === 'daily' && currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
          {view === 'weekly' && `Semana de ${getMonday(currentDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}`}
          {view === 'monthly' && currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
          {view === 'yearly' && currentDate.getFullYear().toString()}
        </span>
        <button onClick={() => navigate(1)} className="p-1.5 rounded-md hover:bg-muted"><ChevronRight className="w-4 h-4" /></button>
        <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
      </div>

      {view === 'weekly' && <WeeklyView currentDate={currentDate} onAdd={openAddFor} onNote={openNoteFor} onMove={openMoveFor} onChange={openChangeFor} onRemove={handleRemoveEntry} />}
      {view === 'daily' && <DailyView date={fmt(currentDate)} onAdd={() => openAddFor(fmt(currentDate))} onNote={() => openNoteFor(fmt(currentDate))} onMove={openMoveFor} onChange={openChangeFor} onRemove={handleRemoveEntry} />}
      {view === 'monthly' && <MonthlyView currentDate={currentDate} onDayClick={(d) => { setCurrentDate(new Date(d + 'T12:00:00')); setView('daily'); }} />}
      {view === 'yearly' && <YearlyView year={currentDate.getFullYear()} />}

      {/* Add dialog */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Adicionar matéria</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{addDate}</p>
            <Select value={addSubjectId} onValueChange={setAddSubjectId}>
              <SelectTrigger><SelectValue placeholder="Selecione a matéria" /></SelectTrigger>
              <SelectContent>
                {data.subjects.filter(s => s.active).map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      {s.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={addOptional} onChange={e => setAddOptional(e.target.checked)} className="rounded" />
              Matéria opcional
            </label>
            <Button onClick={handleAdd} className="w-full">Adicionar</Button>
          </div>

          <label className="flex items-center gap-3 p-3 rounded-xl border border-border bg-muted/30 cursor-pointer transition-colors hover:bg-muted/50">
            <input 
              type="checkbox" 
              checked={addOptional} 
              onChange={e => setAddOptional(e.target.checked)} 
              className="h-5 w-5 rounded-md border-primary text-primary focus:ring-primary/30" 
            />
            <div className="flex-1">
              <p className="text-sm font-semibold">Matéria opcional</p>
              <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Tarefa secundária</p>
            </div>
          </label>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label>Horário</Label>
              <ClockTimePickerField value={addStartTime || undefined} onChange={(v) => setAddStartTime(v || '')} placeholder="--:--" />
            </div>
            <div className="grid gap-2">
              <Label>Meta de tempo</Label>
              <DurationPickerField valueMinutes={addPlannedMinutes} onChangeMinutes={setAddPlannedMinutes} placeholder="Minutos" includeSeconds />
            </div>
          </div>
        </div>
      </ResponsivePanel>

      <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Observação</DialogTitle></DialogHeader>
          <Textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Escreva uma observação..." rows={3} />
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
              <MoveIcon className="w-4 h-4 mr-2" />Mover
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={changeDialog} onOpenChange={setChangeDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Trocar matéria</DialogTitle></DialogHeader>
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
              placeholder="Nova matéria"
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
          pendingAction?.type === 'move' ? 'Esta matéria veio de um template. Como deseja aplicar a mudança?' :
          pendingAction?.type === 'change' ? 'Esta matéria veio de um template. Como deseja aplicar a troca?' :
          'Esta matéria veio de um template. Como deseja aplicar a remoção?'
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
            <DialogTitle className="font-display">Criar matéria</DialogTitle>
          </DialogHeader>
          <SubjectForm
            value={quickSubjectForm}
            
            
            onChange={setQuickSubjectForm}
            onSubmit={handleQuickSubjectSave}
            onCancel={() => setQuickSubjectDialog(false)}
            submitLabel="Criar matéria"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

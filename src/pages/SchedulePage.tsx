import React, { useState } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { ScheduleView, ScheduleEntry, DAY_NAMES_SHORT } from '@/types/study';
import { ChevronLeft, ChevronRight, ArrowRightLeft, MoveRight, LayoutTemplate } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  const { data, getSubject, getScheduleForDate, updateScheduleEntry, deleteScheduleEntry, addScheduleEntry, addNote } = useStudy();
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
        await updateScheduleEntry(entry.id, { date: payload.date, isOverride: true });
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
        await updateScheduleEntry(entry.id, { date: payload.date, isOverride: true });
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

  const applyTemplateName = templates.find(t => t.id === applyTemplateId)?.name || '';

  return (
    <div className="flex min-h-full flex-col gap-4 md:gap-5 w-full min-w-0 max-w-full">
      <div className="workspace-panel p-3 md:p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Cronograma</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Planejamento semanal, mensal e anual com detalhe por dia.</p>
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
        <div className="workspace-panel p-2 md:p-2.5 flex items-center justify-between gap-2">
          <button onClick={() => navigate(-1)} className="h-10 w-10 flex items-center justify-center rounded-full border border-border/60 hover:bg-muted transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <span className="text-sm md:text-base font-semibold text-foreground min-w-[150px] text-center capitalize">
            {view === 'weekly' && formatWeekRangeLabel(currentDate)}
            {view === 'monthly' && currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            {view === 'yearly' && currentDate.getFullYear().toString()}
          </span>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate(1)} className="h-10 w-10 flex items-center justify-center rounded-full border border-border/60 hover:bg-muted transition-colors"><ChevronRight className="w-5 h-5" /></button>
            {view !== 'weekly' && (
              <Button variant="secondary" size="sm" className="rounded-full" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
            )}
          </div>
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
            <Select value={addSubjectId} onValueChange={setAddSubjectId}>
              <SelectTrigger><SelectValue placeholder="Selecione a materia" /></SelectTrigger>
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
            <Select value={changeSubjectId} onValueChange={setChangeSubjectId}>
              <SelectTrigger><SelectValue placeholder="Nova materia" /></SelectTrigger>
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
    </div>
  );
}

function MonthlyView({ currentDate, onDayClick }: { currentDate: Date; onDayClick: (d: string) => void }) {
  const { data, getSubject } = useStudy();
  const cells = buildMonthlyCells(currentDate, data.schedule, data.sessions, data.notes, data.dayPlans, data.sessionPauses);
  const today = toDateKey(new Date());

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

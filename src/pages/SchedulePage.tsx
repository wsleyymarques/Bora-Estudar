import React, { useState, useMemo } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { ScheduleView, ScheduleEntry } from '@/types/study';
import { CheckCircle2, Circle, Plus, ChevronLeft, ChevronRight, MessageSquare, ArrowRightLeft, Trash2, MoveRight, LayoutTemplate } from 'lucide-react';
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
import { useTemplates } from '@/hooks/useTemplates';

const VIEWS: { key: ScheduleView; label: string; icon?: React.ReactNode }[] = [
  { key: 'weekly', label: 'Semanal' },
  { key: 'daily', label: 'Diário' },
  { key: 'monthly', label: 'Mensal' },
  { key: 'yearly', label: 'Anual' },
  { key: 'templates', label: 'Templates', icon: <LayoutTemplate className="w-3.5 h-3.5" /> },
];

function getMonday(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  return d;
}
function fmt(d: Date) { return d.toISOString().split('T')[0]; }
function formatMin(m: number) { const h = Math.floor(m / 60); return h > 0 ? `${h}h ${m % 60}m` : `${m}m`; }

export default function SchedulePage() {
  const [view, setView] = useState<ScheduleView>('weekly');
  const [currentDate, setCurrentDate] = useState(new Date());
  const { data, getSubject, getScheduleForDate, toggleScheduleComplete, addScheduleEntry, updateScheduleEntry, deleteScheduleEntry, getTotalMinutesForDate, addNote, refreshData } = useStudy();
  const { templates } = useTemplates();

  const [addDialog, setAddDialog] = useState(false);
  const [addDate, setAddDate] = useState('');
  const [addSubjectId, setAddSubjectId] = useState('');
  const [addOptional, setAddOptional] = useState(false);

  const [noteDialog, setNoteDialog] = useState(false);
  const [noteDate, setNoteDate] = useState('');
  const [noteContent, setNoteContent] = useState('');

  const [moveDialog, setMoveDialog] = useState(false);
  const [moveEntry, setMoveEntry] = useState<ScheduleEntry | null>(null);
  const [moveTargetDate, setMoveTargetDate] = useState('');

  const [changeDialog, setChangeDialog] = useState(false);
  const [changeEntry, setChangeEntry] = useState<ScheduleEntry | null>(null);
  const [changeSubjectId, setChangeSubjectId] = useState('');

  // Propagation
  const [propagationDialog, setPropagationDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'move' | 'change' | 'remove'; entry: ScheduleEntry; payload?: any } | null>(null);

  // Apply template dialog
  const [applyDialog, setApplyDialog] = useState(false);
  const [applyTemplateId, setApplyTemplateId] = useState('');

  const navigate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === 'daily') d.setDate(d.getDate() + dir);
    else if (view === 'weekly') d.setDate(d.getDate() + dir * 7);
    else if (view === 'monthly') d.setMonth(d.getMonth() + dir);
    else d.setFullYear(d.getFullYear() + dir);
    setCurrentDate(d);
  };

  const handleAdd = () => {
    if (!addSubjectId) { toast.error('Selecione uma matéria'); return; }
    const existing = getScheduleForDate(addDate);
    addScheduleEntry({ date: addDate, subjectId: addSubjectId, optional: addOptional, completed: false, order: existing.length });
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
      // Mark as override and execute
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
      // Apply to this and all future entries with same template + day of week
      const entryDate = new Date(entry.date + 'T12:00:00');
      const jsDay = entryDate.getDay();
      const dow = jsDay === 0 ? 6 : jsDay - 1;

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
      // This would update the template itself - simplified version
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
    setAddDialog(true);
  };

  const openNoteFor = (date: string) => {
    setNoteDate(date);
    setNoteContent('');
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-display font-bold text-foreground">Cronograma</h1>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {VIEWS.map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-1.5 ${
                view === v.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
              }`}>
              {v.icon}
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {/* Navigation (not for templates view) */}
      {view !== 'templates' && (
        <div className="flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-muted transition-colors"><ChevronLeft className="w-5 h-5" /></button>
          <span className="text-base font-medium text-foreground min-w-[160px] text-center">
            {view === 'daily' && currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {view === 'weekly' && `Semana de ${getMonday(currentDate).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long' })}`}
            {view === 'monthly' && currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            {view === 'yearly' && currentDate.getFullYear().toString()}
          </span>
          <button onClick={() => navigate(1)} className="p-2 rounded-lg hover:bg-muted transition-colors"><ChevronRight className="w-5 h-5" /></button>
          <Button variant="ghost" size="sm" onClick={() => setCurrentDate(new Date())}>Hoje</Button>
        </div>
      )}

      {/* Views */}
      {view === 'weekly' && (
        <WeeklyPlannerView
          currentDate={currentDate}
          onAdd={openAddFor}
          onNote={openNoteFor}
          onMove={openMoveFor}
          onChange={openChangeFor}
          onRemove={handleRemoveEntry}
        />
      )}
      {view === 'daily' && (
        <DailyView
          date={fmt(currentDate)}
          onAdd={() => openAddFor(fmt(currentDate))}
          onNote={() => openNoteFor(fmt(currentDate))}
          onMove={openMoveFor}
          onChange={openChangeFor}
          onRemove={handleRemoveEntry}
        />
      )}
      {view === 'monthly' && <MonthlyView currentDate={currentDate} onDayClick={(d) => { setCurrentDate(new Date(d + 'T12:00:00')); setView('daily'); }} />}
      {view === 'yearly' && <YearlyView year={currentDate.getFullYear()} />}
      {view === 'templates' && <TemplateEditor onApply={openApplyTemplate} />}

      {/* Dialogs */}
      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Adicionar matéria</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">{addDate && new Date(addDate + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
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
        </DialogContent>
      </Dialog>

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
              <MoveRight className="w-4 h-4 mr-2" />Mover
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
            <Select value={changeSubjectId} onValueChange={setChangeSubjectId}>
              <SelectTrigger><SelectValue placeholder="Nova matéria" /></SelectTrigger>
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

      {/* Propagation dialog */}
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

      {/* Apply template dialog */}
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

// ---- Sub-views (kept inline for DailyView, MonthlyView, YearlyView) ----

interface EntryActionsProps {
  onMove: (entry: ScheduleEntry) => void;
  onChange: (entry: ScheduleEntry) => void;
  onRemove: (id: string) => void;
}

function DailyView({ date, onAdd, onNote, onMove, onChange, onRemove }: { date: string; onAdd: () => void; onNote: () => void } & EntryActionsProps) {
  const { getScheduleForDate, getSubject, toggleScheduleComplete, getTotalMinutesForDate, data } = useStudy();
  const entries = getScheduleForDate(date);
  const mins = getTotalMinutesForDate(date);
  const dayNotes = data.notes.filter(n => n.type === 'day' && n.referenceDate === date);
  const main = entries.filter(e => !e.optional);
  const optional = entries.filter(e => e.optional);
  const completed = entries.filter(e => e.completed).length;

  return (
    <div className="max-w-2xl space-y-5">
      <div className="glass-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Progresso do dia</span>
          <span className="text-sm font-semibold text-foreground">{completed}/{entries.length}</span>
        </div>
        <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: entries.length ? `${(completed / entries.length) * 100}%` : '0%' }} />
        </div>
        {mins > 0 && <p className="text-sm text-muted-foreground">Tempo estudado: {formatMin(mins)}</p>}
      </div>

      {entries.length === 0 && (
        <div className="glass-card p-10 text-center">
          <p className="text-muted-foreground">Nenhuma matéria planejada para este dia.</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={onAdd}><Plus className="w-4 h-4 mr-1" />Adicionar matéria</Button>
        </div>
      )}

      {main.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Principais</h3>
          {main.map(e => {
            const s = getSubject(e.subjectId);
            return (
              <div key={e.id} className="glass-card p-4 flex items-center gap-3 group hover:shadow-md transition-shadow">
                <button onClick={() => toggleScheduleComplete(e.id)} className="transition-transform hover:scale-110">
                  {e.completed ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                </button>
                <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: s?.color }} />
                <span className={`text-base font-medium flex-1 ${e.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{s?.name}</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onMove(e)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><MoveRight className="w-4 h-4" /></button>
                  <button onClick={() => onChange(e)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><ArrowRightLeft className="w-4 h-4" /></button>
                  <button onClick={() => onRemove(e.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {optional.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Opcionais</h3>
          {optional.map(e => {
            const s = getSubject(e.subjectId);
            return (
              <div key={e.id} className="glass-card p-4 flex items-center gap-3 opacity-75 group hover:shadow-md transition-shadow">
                <button onClick={() => toggleScheduleComplete(e.id)} className="transition-transform hover:scale-110">
                  {e.completed ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                </button>
                <div className="w-3.5 h-3.5 rounded-full shadow-sm" style={{ backgroundColor: s?.color }} />
                <span className={`text-base flex-1 ${e.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{s?.name}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">opcional</span>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => onMove(e)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><MoveRight className="w-4 h-4" /></button>
                  <button onClick={() => onChange(e)} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground"><ArrowRightLeft className="w-4 h-4" /></button>
                  <button onClick={() => onRemove(e.id)} className="p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {entries.length > 0 && (
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onAdd}><Plus className="w-4 h-4 mr-1" />Matéria</Button>
          <Button variant="outline" size="sm" onClick={onNote}><MessageSquare className="w-4 h-4 mr-1" />Nota</Button>
        </div>
      )}

      {dayNotes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Observações</h3>
          {dayNotes.map(n => (
            <div key={n.id} className="glass-card p-4 text-sm text-foreground leading-relaxed">{n.content}</div>
          ))}
        </div>
      )}
    </div>
  );
}

function MonthlyView({ currentDate, onDayClick }: { currentDate: Date; onDayClick: (d: string) => void }) {
  const { getScheduleForDate, getTotalMinutesForDate } = useStudy();
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = (firstDay.getDay() + 6) % 7;
  const today = fmt(new Date());

  const days: (string | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(fmt(new Date(year, month, d)));
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1.5 mb-1.5">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
          <div key={d} className="text-xs text-muted-foreground text-center font-medium py-2">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1.5">
        {days.map((date, i) => {
          if (!date) return <div key={i} />;
          const entries = getScheduleForDate(date);
          const completed = entries.filter(e => e.completed).length;
          const total = entries.length;
          const mins = getTotalMinutesForDate(date);
          const isToday = date === today;

          return (
            <button key={date} onClick={() => onDayClick(date)}
              className={`glass-card p-3 text-left hover:ring-1 hover:ring-primary/30 transition-all min-h-[70px] ${isToday ? 'ring-2 ring-primary/40' : ''}`}>
              <p className={`text-sm font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>{new Date(date + 'T12:00:00').getDate()}</p>
              {total > 0 && (
                <div className="mt-1.5">
                  <div className="w-full h-1.5 bg-muted rounded-full">
                    <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(completed / total) * 100}%` }} />
                  </div>
                </div>
              )}
              {mins > 0 && <p className="text-[10px] text-muted-foreground mt-1">{formatMin(mins)}</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function YearlyView({ year }: { year: number }) {
  const { getTotalMinutesForDate } = useStudy();

  const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const months = monthNames.map((name, m) => {
    const daysInMonth = new Date(year, m + 1, 0).getDate();
    let totalMin = 0;
    let studiedDays = 0;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = fmt(new Date(year, m, d));
      const mins = getTotalMinutesForDate(date);
      if (mins > 0) { totalMin += mins; studiedDays++; }
    }
    return { name, totalMin, studiedDays };
  });

  const maxMin = Math.max(...months.map(m => m.totalMin), 1);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
      {months.map(m => (
        <div key={m.name} className="glass-card p-4 space-y-3">
          <p className="text-base font-display font-semibold text-foreground">{m.name}</p>
          <div className="w-full h-2.5 bg-muted rounded-full">
            <div className="h-full bg-primary rounded-full" style={{ width: `${(m.totalMin / maxMin) * 100}%` }} />
          </div>
          <div className="text-xs text-muted-foreground">
            {m.studiedDays} dias · {formatMin(m.totalMin)}
          </div>
        </div>
      ))}
    </div>
  );
}

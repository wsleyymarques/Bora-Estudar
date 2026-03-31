import React, { useState, useMemo } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { ScheduleView } from '@/types/study';
import { CheckCircle2, Circle, Plus, ChevronLeft, ChevronRight, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const VIEWS: { key: ScheduleView; label: string }[] = [
  { key: 'daily', label: 'Diário' },
  { key: 'weekly', label: 'Semanal' },
  { key: 'monthly', label: 'Mensal' },
  { key: 'yearly', label: 'Anual' },
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
  const { data, getSubject, getScheduleForDate, toggleScheduleComplete, addScheduleEntry, deleteScheduleEntry, getTotalMinutesForDate, addNote } = useStudy();

  const [addDialog, setAddDialog] = useState(false);
  const [addDate, setAddDate] = useState('');
  const [addSubjectId, setAddSubjectId] = useState('');
  const [addOptional, setAddOptional] = useState(false);

  const [noteDialog, setNoteDialog] = useState(false);
  const [noteDate, setNoteDate] = useState('');
  const [noteContent, setNoteContent] = useState('');

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

  return (
    <div className="space-y-6 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-display font-bold text-foreground">Cronograma</h1>
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {VIEWS.map(v => (
            <button key={v.key} onClick={() => setView(v.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === v.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
              {v.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
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

      {view === 'weekly' && <WeeklyView currentDate={currentDate} onAdd={openAddFor} onNote={openNoteFor} />}
      {view === 'daily' && <DailyView date={fmt(currentDate)} onAdd={() => openAddFor(fmt(currentDate))} onNote={() => openNoteFor(fmt(currentDate))} />}
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
        </DialogContent>
      </Dialog>

      {/* Note dialog */}
      <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Observação</DialogTitle></DialogHeader>
          <Textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Escreva uma observação..." rows={3} />
          <Button onClick={handleNote} className="w-full">Salvar</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function WeeklyView({ currentDate, onAdd, onNote }: { currentDate: Date; onAdd: (d: string) => void; onNote: (d: string) => void }) {
  const { getScheduleForDate, getSubject, toggleScheduleComplete, deleteScheduleEntry, getTotalMinutesForDate, data } = useStudy();
  const monday = getMonday(currentDate);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(d.getDate() + i);
    return fmt(d);
  });
  const today = fmt(new Date());

  return (
    <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
      {days.map(date => {
        const entries = getScheduleForDate(date);
        const main = entries.filter(e => !e.optional);
        const optional = entries.filter(e => e.optional);
        const isToday = date === today;
        const mins = getTotalMinutesForDate(date);
        const dayNotes = data.notes.filter(n => n.type === 'day' && n.referenceDate === date);

        return (
          <div key={date} className={`glass-card p-3 space-y-2 ${isToday ? 'ring-2 ring-primary/30' : ''}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
                  {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' })}
                </p>
                <p className="text-lg font-display font-bold text-foreground">{new Date(date + 'T12:00:00').getDate()}</p>
              </div>
              {mins > 0 && <span className="text-[10px] text-muted-foreground">{formatMin(mins)}</span>}
            </div>
            <div className="space-y-1">
              {main.map(e => <EntryChip key={e.id} entry={e} />)}
              {optional.length > 0 && (
                <div className="border-t border-border/50 pt-1 mt-1">
                  {optional.map(e => <EntryChip key={e.id} entry={e} />)}
                </div>
              )}
            </div>
            {dayNotes.length > 0 && (
              <div className="text-[10px] text-muted-foreground bg-muted/50 rounded p-1.5 line-clamp-2">
                {dayNotes[0].content}
              </div>
            )}
            <div className="flex gap-1">
              <button onClick={() => onAdd(date)} className="text-[10px] text-primary hover:underline flex items-center gap-0.5"><Plus className="w-3 h-3" />matéria</button>
              <button onClick={() => onNote(date)} className="text-[10px] text-muted-foreground hover:text-foreground ml-auto"><MessageSquare className="w-3 h-3" /></button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function EntryChip({ entry }: { entry: any }) {
  const { getSubject, toggleScheduleComplete, deleteScheduleEntry } = useStudy();
  const subj = getSubject(entry.subjectId);
  return (
    <div className={`flex items-center gap-1.5 group ${entry.optional ? 'opacity-70' : ''}`}>
      <button onClick={() => toggleScheduleComplete(entry.id)} className="flex-shrink-0">
        {entry.completed
          ? <CheckCircle2 className="w-3.5 h-3.5 text-success" />
          : <Circle className="w-3.5 h-3.5 text-muted-foreground" />}
      </button>
      <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: subj?.color }} />
      <span className={`text-xs truncate ${entry.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
        {subj?.name}
      </span>
      {entry.optional && <span className="text-[8px] text-muted-foreground">opc</span>}
    </div>
  );
}

function DailyView({ date, onAdd, onNote }: { date: string; onAdd: () => void; onNote: () => void }) {
  const { getScheduleForDate, getSubject, toggleScheduleComplete, getTotalMinutesForDate, data } = useStudy();
  const entries = getScheduleForDate(date);
  const mins = getTotalMinutesForDate(date);
  const dayNotes = data.notes.filter(n => n.type === 'day' && n.referenceDate === date);
  const main = entries.filter(e => !e.optional);
  const optional = entries.filter(e => e.optional);
  const completed = entries.filter(e => e.completed).length;

  return (
    <div className="max-w-lg space-y-4">
      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Progresso do dia</span>
          <span className="text-sm font-medium text-foreground">{completed}/{entries.length}</span>
        </div>
        <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
          <div className="h-full bg-primary rounded-full transition-all" style={{ width: entries.length ? `${(completed / entries.length) * 100}%` : '0%' }} />
        </div>
        {mins > 0 && <p className="text-xs text-muted-foreground">Tempo estudado: {formatMin(mins)}</p>}
      </div>

      {main.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Principais</h3>
          {main.map(e => {
            const s = getSubject(e.subjectId);
            return (
              <div key={e.id} className="glass-card p-3 flex items-center gap-3">
                <button onClick={() => toggleScheduleComplete(e.id)}>
                  {e.completed ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                </button>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s?.color }} />
                <span className={`text-sm font-medium ${e.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{s?.name}</span>
              </div>
            );
          })}
        </div>
      )}

      {optional.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Opcionais</h3>
          {optional.map(e => {
            const s = getSubject(e.subjectId);
            return (
              <div key={e.id} className="glass-card p-3 flex items-center gap-3 opacity-75">
                <button onClick={() => toggleScheduleComplete(e.id)}>
                  {e.completed ? <CheckCircle2 className="w-5 h-5 text-success" /> : <Circle className="w-5 h-5 text-muted-foreground" />}
                </button>
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s?.color }} />
                <span className={`text-sm ${e.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{s?.name}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground ml-auto">opcional</span>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onAdd}><Plus className="w-4 h-4 mr-1" />Matéria</Button>
        <Button variant="outline" size="sm" onClick={onNote}><MessageSquare className="w-4 h-4 mr-1" />Nota</Button>
      </div>

      {dayNotes.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Observações</h3>
          {dayNotes.map(n => (
            <div key={n.id} className="glass-card p-3 text-sm text-foreground">{n.content}</div>
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
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday start
  const today = fmt(new Date());

  const days: (string | null)[] = Array(startOffset).fill(null);
  for (let d = 1; d <= lastDay.getDate(); d++) {
    days.push(fmt(new Date(year, month, d)));
  }

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
          <div key={d} className="text-[10px] text-muted-foreground text-center font-medium py-1">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {days.map((date, i) => {
          if (!date) return <div key={i} />;
          const entries = getScheduleForDate(date);
          const completed = entries.filter(e => e.completed).length;
          const total = entries.length;
          const mins = getTotalMinutesForDate(date);
          const isToday = date === today;

          return (
            <button key={date} onClick={() => onDayClick(date)}
              className={`glass-card p-2 text-left hover:ring-1 hover:ring-primary/30 transition-all min-h-[60px] ${isToday ? 'ring-2 ring-primary/40' : ''}`}>
              <p className={`text-xs font-medium ${isToday ? 'text-primary' : 'text-foreground'}`}>{new Date(date + 'T12:00:00').getDate()}</p>
              {total > 0 && (
                <div className="mt-1">
                  <div className="w-full h-1 bg-muted rounded-full">
                    <div className="h-full bg-primary/60 rounded-full" style={{ width: `${(completed / total) * 100}%` }} />
                  </div>
                </div>
              )}
              {mins > 0 && <p className="text-[9px] text-muted-foreground mt-0.5">{formatMin(mins)}</p>}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function YearlyView({ year }: { year: number }) {
  const { data, getTotalMinutesForDate } = useStudy();

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
    return { name, totalMin, studiedDays, daysInMonth };
  });

  const maxMin = Math.max(...months.map(m => m.totalMin), 1);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {months.map(m => (
          <div key={m.name} className="glass-card p-3 space-y-2">
            <p className="text-sm font-display font-semibold text-foreground">{m.name}</p>
            <div className="w-full h-2 bg-muted rounded-full">
              <div className="h-full bg-primary rounded-full" style={{ width: `${(m.totalMin / maxMin) * 100}%` }} />
            </div>
            <div className="text-[10px] text-muted-foreground">
              {m.studiedDays} dias · {formatMin(m.totalMin)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

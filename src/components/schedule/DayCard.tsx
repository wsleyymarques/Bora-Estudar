import React from 'react';
import { ScheduleEntry } from '@/types/study';
import { useStudy } from '@/contexts/StudyContext';
import { CheckCircle2, Circle, Plus, MessageSquare, MoreHorizontal, MoveRight, ArrowRightLeft, Trash2, Pencil } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface DayCardProps {
  date: string;
  isToday: boolean;
  onAdd: (date: string) => void;
  onNote: (date: string) => void;
  onMove: (entry: ScheduleEntry) => void;
  onChange: (entry: ScheduleEntry) => void;
  onRemove: (id: string) => void;
  onEditDay?: (date: string) => void;
}

export default function DayCard({ date, isToday, onAdd, onNote, onMove, onChange, onRemove, onEditDay }: DayCardProps) {
  const { getScheduleForDate, getSubject, toggleScheduleComplete, getTotalMinutesForDate, data } = useStudy();
  const entries = getScheduleForDate(date);
  const main = entries.filter(e => !e.optional);
  const optional = entries.filter(e => e.optional);
  const completed = entries.filter(e => e.completed).length;
  const mins = getTotalMinutesForDate(date);
  const dayNotes = data.notes.filter(n => n.type === 'day' && n.referenceDate === date);
  // Also check day_note from schedule entries (template-generated)
  const templateDayNote = entries.find(e => e.dayNote)?.dayNote;
  const dayObservation = dayNotes[0]?.content || templateDayNote;

  const dateObj = new Date(date + 'T12:00:00');
  const dayName = dateObj.toLocaleDateString('pt-BR', { weekday: 'long' });
  const dayNum = dateObj.getDate();
  const monthShort = dateObj.toLocaleDateString('pt-BR', { month: 'short' });

  const formatMin = (m: number) => { const h = Math.floor(m / 60); return h > 0 ? `${h}h ${m % 60}m` : `${m}m`; };

  return (
    <div className={`glass-card p-5 space-y-4 min-h-[220px] flex flex-col transition-all hover:shadow-md ${isToday ? 'ring-2 ring-primary/40 shadow-md' : ''}`}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm font-semibold capitalize ${isToday ? 'text-primary' : 'text-muted-foreground'}`}>
            {dayName}
          </p>
          <p className="text-2xl font-display font-bold text-foreground leading-tight">
            {dayNum} <span className="text-sm font-normal text-muted-foreground capitalize">{monthShort}</span>
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {entries.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              completed === entries.length && entries.length > 0
                ? 'bg-success/15 text-success'
                : 'bg-muted text-muted-foreground'
            }`}>
              {completed}/{entries.length}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                <MoreHorizontal className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onAdd(date)}>
                <Plus className="w-4 h-4 mr-2" />Adicionar matéria
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onNote(date)}>
                <MessageSquare className="w-4 h-4 mr-2" />Observação
              </DropdownMenuItem>
              {onEditDay && (
                <DropdownMenuItem onClick={() => onEditDay(date)}>
                  <Pencil className="w-4 h-4 mr-2" />Editar dia
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Day observation */}
      {dayObservation && (
        <div className="text-xs text-muted-foreground bg-muted/60 rounded-lg px-3 py-2 italic leading-relaxed">
          {dayObservation}
        </div>
      )}

      {/* Main subjects */}
      <div className="flex-1 space-y-1.5">
        {main.length === 0 && optional.length === 0 && (
          <div className="flex items-center justify-center h-16 text-sm text-muted-foreground/60">
            Nenhuma matéria
          </div>
        )}
        {main.map(e => (
          <SubjectRow key={e.id} entry={e} onMove={onMove} onChange={onChange} onRemove={onRemove} />
        ))}

        {/* Optional subjects */}
        {optional.length > 0 && (
          <div className="pt-2 mt-2 border-t border-border/40 space-y-1.5">
            {optional.map(e => (
              <SubjectRow key={e.id} entry={e} onMove={onMove} onChange={onChange} onRemove={onRemove} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-1 border-t border-border/30">
        {mins > 0 ? (
          <span className="text-xs text-muted-foreground">{formatMin(mins)} estudado</span>
        ) : (
          <span className="text-xs text-muted-foreground/50">—</span>
        )}
        <button
          onClick={() => onAdd(date)}
          className="text-xs text-primary hover:text-primary/80 font-medium flex items-center gap-1 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          Matéria
        </button>
      </div>
    </div>
  );
}

function SubjectRow({
  entry,
  onMove,
  onChange,
  onRemove,
}: {
  entry: ScheduleEntry;
  onMove: (entry: ScheduleEntry) => void;
  onChange: (entry: ScheduleEntry) => void;
  onRemove: (id: string) => void;
}) {
  const { getSubject, toggleScheduleComplete } = useStudy();
  const subj = getSubject(entry.subjectId);

  return (
    <div className={`flex items-center gap-2.5 group rounded-lg px-2 py-1.5 -mx-2 hover:bg-muted/50 transition-colors ${entry.optional ? 'opacity-70' : ''}`}>
      <button onClick={() => toggleScheduleComplete(entry.id)} className="flex-shrink-0 transition-transform hover:scale-110">
        {entry.completed
          ? <CheckCircle2 className="w-4.5 h-4.5 text-success" />
          : <Circle className="w-4.5 h-4.5 text-muted-foreground/60" />}
      </button>
      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0 shadow-sm" style={{ backgroundColor: subj?.color }} />
      <span className={`text-sm flex-1 font-medium truncate ${
        entry.completed ? 'line-through text-muted-foreground' : 'text-foreground'
      }`}>
        {entry.optional ? `(${subj?.name})` : subj?.name}
      </span>
      {entry.optional && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-medium">opc</span>
      )}
      {/* Hover actions */}
      <div className="hidden group-hover:flex items-center gap-0.5 flex-shrink-0">
        <button onClick={() => onMove(entry)} title="Mover" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <MoveRight className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onChange(entry)} title="Trocar" className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
          <ArrowRightLeft className="w-3.5 h-3.5" />
        </button>
        <button onClick={() => onRemove(entry.id)} title="Remover" className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}

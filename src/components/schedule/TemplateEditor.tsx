import React, { useState } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { useTemplates } from '@/hooks/useTemplates';
import { DAY_NAMES } from '@/types/study';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Trash2, FileText, Calendar, Pencil, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { ClockTimePickerField, DurationPickerField } from '@/components/generic/time-picker-fields';

interface TemplateEditorProps {
  onApply: (templateId: string) => void;
}

export default function TemplateEditor({ onApply }: TemplateEditorProps) {
  const { data } = useStudy();
  const { templates, loading, createTemplate, updateTemplateName, deleteTemplate, addTemplateItem, removeTemplateItem, setDayNote } = useTemplates();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const [addDialog, setAddDialog] = useState(false);
  const [addDay, setAddDay] = useState(0);
  const [addSubjectId, setAddSubjectId] = useState('');
  const [addOptional, setAddOptional] = useState(false);
  const [addStartTime, setAddStartTime] = useState('');
  const [addPlannedMinutes, setAddPlannedMinutes] = useState<number | undefined>(undefined);

  const [noteDialog, setNoteDialog] = useState(false);
  const [noteDay, setNoteDay] = useState(0);
  const [noteContent, setNoteContent] = useState('');
  const [noteTargetMinutes, setNoteTargetMinutes] = useState<number | undefined>(undefined);

  const selected = templates.find(t => t.id === selectedId);
  const activeSubjects = data.subjects.filter(s => s.active);

  const handleCreate = async () => {
    if (!newName.trim()) { toast.error('Digite um nome'); return; }
    const id = await createTemplate(newName.trim());
    if (id) { setSelectedId(id); setCreating(false); setNewName(''); }
  };

  const handleSaveName = async () => {
    if (!editingName || !editName.trim()) return;
    await updateTemplateName(editingName, editName.trim());
    setEditingName(null);
  };

  const handleAddItem = async () => {
    if (!selectedId || !addSubjectId) { toast.error('Selecione uma materia'); return; }
    await addTemplateItem(selectedId, addDay, addSubjectId, addOptional, {
      startTime: addStartTime || undefined,
      plannedMinutes: addPlannedMinutes,
    });
    setAddDialog(false);
    setAddSubjectId('');
    setAddOptional(false);
    setAddStartTime('');
    setAddPlannedMinutes(undefined);
  };

  const handleSaveNote = async () => {
    if (!selectedId) return;
    await setDayNote(selectedId, noteDay, noteContent, noteTargetMinutes);
    setNoteDialog(false);
  };

  const openAddItem = (day: number) => {
    setAddDay(day);
    setAddSubjectId('');
    setAddOptional(false);
    setAddStartTime('');
    setAddPlannedMinutes(undefined);
    setAddDialog(true);
  };

  const openDayNote = (day: number) => {
    setNoteDay(day);
    const existing = selected?.dayNotes.find(n => n.dayOfWeek === day);
    setNoteContent(existing?.content || '');
    setNoteTargetMinutes(existing?.targetMinutes);
    setNoteDialog(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-display font-bold text-foreground">Templates Semanais</h2>
          <Button variant="outline" size="sm" onClick={() => setCreating(true)}>
            <Plus className="w-4 h-4 mr-1" />Novo Template
          </Button>
        </div>

        {creating && (
          <div className="flex items-center gap-2 mb-4 p-3 bg-muted/50 rounded-lg">
            <Input placeholder="Nome do template..." value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleCreate()} className="flex-1" autoFocus />
            <Button size="sm" onClick={handleCreate}><Check className="w-4 h-4" /></Button>
            <Button size="sm" variant="ghost" onClick={() => setCreating(false)}><X className="w-4 h-4" /></Button>
          </div>
        )}

        {templates.length === 0 && !creating && (
          <p className="text-sm text-muted-foreground text-center py-8">
            Nenhum template criado. Crie seu primeiro template semanal para automatizar seu cronograma.
          </p>
        )}

        <div className="space-y-2">
          {templates.map(t => (
            <div key={t.id} onClick={() => setSelectedId(t.id === selectedId ? null : t.id)} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all ${t.id === selectedId ? 'bg-primary/10 ring-1 ring-primary/30' : 'hover:bg-muted/50'}`}>
              <FileText className="w-5 h-5 text-primary flex-shrink-0" />
              <div className="flex-1 min-w-0">
                {editingName === t.id ? (
                  <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                    <Input value={editName} onChange={e => setEditName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSaveName()} className="h-7 text-sm" autoFocus />
                    <button onClick={handleSaveName} className="text-primary"><Check className="w-4 h-4" /></button>
                    <button onClick={() => setEditingName(null)} className="text-muted-foreground"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <>
                    <p className="text-sm font-medium text-foreground truncate">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.items.length} materias configuradas</p>
                  </>
                )}
              </div>
              <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                <button onClick={() => { setEditingName(t.id); setEditName(t.name); }} className="p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Renomear"><Pencil className="w-3.5 h-3.5" /></button>
                <button onClick={() => onApply(t.id)} className="p-1.5 rounded hover:bg-primary/10 text-primary" title="Aplicar template"><Calendar className="w-3.5 h-3.5" /></button>
                <button onClick={() => { if (confirm('Excluir este template?')) deleteTemplate(t.id); }} className="p-1.5 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive" title="Excluir"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-display font-semibold text-foreground">{selected.name}</h3>
            <Button onClick={() => onApply(selected.id)} size="sm"><Calendar className="w-4 h-4 mr-1" />Aplicar Cronograma</Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {DAY_NAMES.map((dayName, dow) => {
              const dayItems = selected.items.filter(i => i.dayOfWeek === dow).sort((a, b) => a.sortOrder - b.sortOrder);
              const mainItems = dayItems.filter(i => !i.optional);
              const optionalItems = dayItems.filter(i => i.optional);
              const dayNote = selected.dayNotes.find(n => n.dayOfWeek === dow);

              return (
                <div key={dow} className="glass-card p-4 space-y-3 min-h-[180px] flex flex-col">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-foreground">{dayName}</h4>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openDayNote(dow)} className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground" title="Observacao"><FileText className="w-3.5 h-3.5" /></button>
                      <button onClick={() => openAddItem(dow)} className="p-1 rounded hover:bg-primary/10 text-primary" title="Adicionar materia"><Plus className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>

                  {dayNote && (
                    <p className="text-xs text-muted-foreground italic bg-muted/50 rounded px-2 py-1.5">
                      {dayNote.content}{dayNote.targetMinutes !== undefined ? ` · meta ${dayNote.targetMinutes}min` : ''}
                    </p>
                  )}

                  <div className="flex-1 space-y-1">
                    {mainItems.map(item => {
                      const subj = data.subjects.find(s => s.id === item.subjectId);
                      return (
                        <div key={item.id} className="flex items-center gap-2 group">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subj?.color }} />
                          <span className="text-sm text-foreground flex-1 truncate">{item.startTime ? `${item.startTime} - ` : ''}{subj?.name}{item.plannedMinutes !== undefined ? ` (${item.plannedMinutes}min)` : ''}</span>
                          <button onClick={() => removeTemplateItem(item.id)} className="hidden group-hover:block p-0.5 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      );
                    })}

                    {optionalItems.length > 0 && (
                      <div className="pt-1.5 mt-1.5 border-t border-border/30 space-y-1">
                        {optionalItems.map(item => {
                          const subj = data.subjects.find(s => s.id === item.subjectId);
                          return (
                            <div key={item.id} className="flex items-center gap-2 opacity-70 group">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: subj?.color }} />
                              <span className="text-sm text-foreground flex-1 truncate">{item.startTime ? `${item.startTime} - ` : ''}({subj?.name}){item.plannedMinutes !== undefined ? ` (${item.plannedMinutes}min)` : ''}</span>
                              <span className="text-[9px] text-muted-foreground">opc</span>
                              <button onClick={() => removeTemplateItem(item.id)} className="hidden group-hover:block p-0.5 text-muted-foreground hover:text-destructive"><Trash2 className="w-3 h-3" /></button>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {dayItems.length === 0 && (
                      <button onClick={() => openAddItem(dow)} className="w-full flex items-center justify-center gap-1 py-4 text-xs text-muted-foreground/50 hover:text-primary hover:bg-muted/30 rounded-lg transition-colors">
                        <Plus className="w-3 h-3" />Adicionar
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Adicionar materia - {DAY_NAMES[addDay]}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Select value={addSubjectId} onValueChange={setAddSubjectId}>
              <SelectTrigger><SelectValue placeholder="Selecione a materia" /></SelectTrigger>
              <SelectContent>
                {activeSubjects.map(s => (
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
            <Button onClick={handleAddItem} className="w-full">Adicionar</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle className="font-display">Observacao - {DAY_NAMES[noteDay]}</DialogTitle></DialogHeader>
          <Textarea value={noteContent} onChange={e => setNoteContent(e.target.value)} placeholder="Ex: Revisao do dia anterior" rows={3} />
          <DurationPickerField valueMinutes={noteTargetMinutes} onChangeMinutes={setNoteTargetMinutes} placeholder="Meta do dia" includeSeconds />
          <Button onClick={handleSaveNote} className="w-full">Salvar</Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}


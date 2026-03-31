import React, { useState } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { Subject, SUBJECT_COLORS } from '@/types/study';
import { Plus, Pencil, Trash2, GripVertical, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';

export default function SubjectsPage() {
  const { data, addSubject, updateSubject, deleteSubject } = useStudy();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Subject | null>(null);
  const [form, setForm] = useState({ name: '', color: SUBJECT_COLORS[0], category: '', optional: false, weeklyGoalHours: 4, monthlyGoalHours: 16 });

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', color: SUBJECT_COLORS[data.subjects.length % SUBJECT_COLORS.length], category: '', optional: false, weeklyGoalHours: 4, monthlyGoalHours: 16 });
    setDialogOpen(true);
  };

  const openEdit = (s: Subject) => {
    setEditing(s);
    setForm({ name: s.name, color: s.color, category: s.category || '', optional: s.optional, weeklyGoalHours: s.weeklyGoalHours, monthlyGoalHours: s.monthlyGoalHours });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) { toast.error('Informe o nome da matéria'); return; }
    if (editing) {
      updateSubject(editing.id, { ...form, category: form.category || undefined });
      toast.success('Matéria atualizada');
    } else {
      addSubject({ ...form, active: true, category: form.category || undefined });
      toast.success('Matéria adicionada');
    }
    setDialogOpen(false);
  };

  const handleDelete = (id: string) => {
    deleteSubject(id);
    toast.success('Matéria removida');
  };

  const active = data.subjects.filter(s => s.active);
  const inactive = data.subjects.filter(s => !s.active);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Matérias</h1>
          <p className="text-muted-foreground text-sm mt-1">{data.subjects.length} matérias cadastradas</p>
        </div>
        <Button onClick={openNew} size="sm"><Plus className="w-4 h-4 mr-1" /> Nova</Button>
      </div>

      {active.length === 0 && inactive.length === 0 && (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">Nenhuma matéria cadastrada ainda.</p>
          <Button onClick={openNew} variant="outline" className="mt-4">Adicionar primeira matéria</Button>
        </div>
      )}

      <div className="space-y-2">
        {active.map(s => (
          <SubjectRow key={s.id} subject={s} onEdit={() => openEdit(s)} onDelete={() => handleDelete(s.id)} onToggle={() => updateSubject(s.id, { active: false })} />
        ))}
      </div>

      {inactive.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-muted-foreground mb-2">Inativas</h3>
          <div className="space-y-2 opacity-60">
            {inactive.map(s => (
              <SubjectRow key={s.id} subject={s} onEdit={() => openEdit(s)} onDelete={() => handleDelete(s.id)} onToggle={() => updateSubject(s.id, { active: true })} />
            ))}
          </div>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{editing ? 'Editar matéria' : 'Nova matéria'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Ex: Matemática" />
            </div>
            <div className="space-y-2">
              <Label>Cor</Label>
              <div className="flex flex-wrap gap-2">
                {SUBJECT_COLORS.map(c => (
                  <button key={c} onClick={() => setForm({ ...form, color: c })}
                    className={`w-7 h-7 rounded-full border-2 transition-all ${form.color === c ? 'border-foreground scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoria (opcional)</Label>
              <Input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} placeholder="Ex: Exatas" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Meta semanal (h)</Label>
                <Input type="number" min={0} value={form.weeklyGoalHours} onChange={e => setForm({ ...form, weeklyGoalHours: +e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Meta mensal (h)</Label>
                <Input type="number" min={0} value={form.monthlyGoalHours} onChange={e => setForm({ ...form, monthlyGoalHours: +e.target.value })} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.optional} onCheckedChange={v => setForm({ ...form, optional: v })} />
              <Label>Matéria opcional</Label>
            </div>
            <Button onClick={handleSave} className="w-full">{editing ? 'Salvar' : 'Adicionar'}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SubjectRow({ subject, onEdit, onDelete, onToggle }: { subject: Subject; onEdit: () => void; onDelete: () => void; onToggle: () => void }) {
  return (
    <div className="glass-card p-3 flex items-center gap-3">
      <GripVertical className="w-4 h-4 text-muted-foreground/40 cursor-grab" />
      <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: subject.color }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-foreground truncate">{subject.name}</span>
          {subject.optional && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">opcional</span>}
          {subject.category && <span className="text-[10px] text-muted-foreground hidden sm:inline">{subject.category}</span>}
        </div>
        <p className="text-xs text-muted-foreground">{subject.weeklyGoalHours}h/sem · {subject.monthlyGoalHours}h/mês</p>
      </div>
      <div className="flex items-center gap-1">
        <Switch checked={subject.active} onCheckedChange={onToggle} />
        <button onClick={onEdit} className="p-1.5 rounded-md hover:bg-muted text-muted-foreground"><Pencil className="w-3.5 h-3.5" /></button>
        <button onClick={onDelete} className="p-1.5 rounded-md hover:bg-destructive/10 text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
      </div>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { Subject } from '@/types/study';
import { SubjectCreateInput, useStudy } from '@/contexts/StudyContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SubjectForm } from '@/components/generic/subject-form';
import { toast } from 'sonner';

const EMPTY_SUBJECT: SubjectCreateInput = {
  name: '',
  color: '#5B8C7E',
  active: true,
  optional: false,
  weeklyGoalHours: 0,
  monthlyGoalHours: 0,
};

export default function SubjectsPage() {
  const { data, createSubject, updateSubject, deleteSubject, findSubjects } = useStudy();
  const [query, setQuery] = useState('');
  const [areaId, setAreaId] = useState('__all__');
  const [categoryId, setCategoryId] = useState('__all__');
  const [originFilter, setOriginFilter] = useState<'all' | 'global' | 'user' | 'plan'>('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [form, setForm] = useState<SubjectCreateInput>(EMPTY_SUBJECT);

  const filtered = useMemo(
    () =>
      findSubjects({
        query,
        areaId: areaId === '__all__' ? undefined : areaId,
        categoryId: categoryId === '__all__' ? undefined : categoryId,
        origin: originFilter,
      }),
    [findSubjects, query, areaId, categoryId, originFilter],
  );

  const userSubjects = filtered.filter((subject) => subject.origin !== 'global');
  const globalSubjects = filtered.filter((subject) => subject.origin === 'global');

  const visibleCategories = useMemo(() => {
    if (areaId === '__all__') return data.subjectCategories;
    return data.subjectCategories.filter((category) => category.areaId === areaId);
  }, [data.subjectCategories, areaId]);

  const openCreate = () => {
    setEditingSubject(null);
    setForm({ ...EMPTY_SUBJECT });
    setDialogOpen(true);
  };

  const openEdit = (subject: Subject) => {
    setEditingSubject(subject);
    setForm({
      name: subject.name,
      color: subject.color,
      category: subject.category,
      optional: subject.optional,
      active: subject.active,
      weeklyGoalHours: subject.weeklyGoalHours,
      monthlyGoalHours: subject.monthlyGoalHours,
      description: subject.description,
      icon: subject.icon,
      areaId: subject.areaId,
      categoryId: subject.categoryId,
      subcategoryId: subject.subcategoryId,
      planId: subject.planId,
      origin: subject.origin,
      status: subject.status,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name?.trim()) {
      toast.error('Informe o nome da matéria');
      return;
    }

    if (editingSubject) {
      await updateSubject(editingSubject.id, {
        ...form,
        name: form.name,
        color: form.color || '#5B8C7E',
        weeklyGoalHours: form.weeklyGoalHours ?? 0,
        monthlyGoalHours: form.monthlyGoalHours ?? 0,
      });
      toast.success('Matéria atualizada');
    } else {
      await createSubject(form);
      toast.success('Matéria criada');
    }

    setDialogOpen(false);
  };

  return (
    <div className="space-y-5 sm:space-y-6 max-w-3xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Matérias</h1>
          <p className="text-muted-foreground text-sm mt-1">{data.subjects.length} matérias cadastradas</p>
        </div>
        <Button onClick={openNew} size="sm" className="w-full sm:w-auto"><Plus className="w-4 h-4 mr-1" /> Nova</Button>
      </div>

        <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-4">
          <div className="flex items-center gap-2 rounded-xl border border-border/70 px-3">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar matéria"
              className="border-0 px-0 shadow-none focus-visible:ring-0"
            />
          </div>

          <Select value={originFilter} onValueChange={(next) => setOriginFilter(next as 'all' | 'global' | 'user' | 'plan')}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Origem" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="global">Globais</SelectItem>
              <SelectItem value="user">Minhas matérias</SelectItem>
              <SelectItem value="plan">Matérias por plano</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={areaId}
            onValueChange={(next) => {
              setAreaId(next);
              setCategoryId('__all__');
            }}
          >
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Área" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as áreas</SelectItem>
              {data.subjectAreas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="rounded-xl">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas as categorias</SelectItem>
              {visibleCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <section className="workspace-panel p-4">
          <h2 className="text-sm font-semibold text-foreground">Minhas matérias ({userSubjects.length})</h2>
          <div className="mt-3 space-y-2">
            {userSubjects.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 px-3 py-6 text-center text-sm text-muted-foreground">
                Nenhuma matéria personalizada encontrada.
              </p>
            ) : (
              userSubjects.map((subject) => (
                <SubjectRow
                  key={subject.id}
                  subject={subject}
                  onEdit={() => openEdit(subject)}
                  onDelete={() => {
                    if (confirm('Deseja realmente excluir esta matéria?')) {
                      void deleteSubject(subject.id);
                    }
                  }}
                />
              ))
            )}
          </div>
        </section>

        <section className="workspace-panel p-4">
          <h2 className="text-sm font-semibold text-foreground">Matérias globais ({globalSubjects.length})</h2>
          <div className="mt-3 space-y-2">
            {globalSubjects.length === 0 ? (
              <p className="rounded-xl border border-dashed border-border/70 px-3 py-6 text-center text-sm text-muted-foreground">
                Nenhuma matéria global encontrada para os filtros.
              </p>
            ) : (
              globalSubjects.map((subject) => (
                <SubjectRow key={subject.id} subject={subject} readonly />
              ))
            )}
          </div>
        </section>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">{editingSubject ? 'Editar matéria' : 'Criar matéria'}</DialogTitle>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

function SubjectRow({
  subject,
  readonly = false,
  onEdit,
  onDelete,
}: {
  subject: Subject;
  readonly?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="glass-card p-3 flex items-center gap-2 sm:gap-3">
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

      {readonly ? (
        <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">Global</span>
      ) : (
        <div className="flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg" onClick={onEdit}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 rounded-lg text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

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
    <div className="space-y-5">
      <div className="workspace-panel p-4 sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold text-foreground">Matérias</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Banco global + matérias personalizadas do usuário.
            </p>
          </div>
          <Button onClick={openCreate} className="rounded-xl">
            <Plus className="mr-1.5 h-4 w-4" />
            Criar matéria
          </Button>
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
          <SubjectForm
            value={form}
            areas={data.subjectAreas}
            categories={data.subjectCategories}
            subcategories={data.subjectSubcategories}
            onChange={setForm}
            onSubmit={handleSave}
            onCancel={() => setDialogOpen(false)}
            submitLabel={editingSubject ? 'Salvar alterações' : 'Criar matéria'}
          />
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
    <div className="flex items-center gap-3 rounded-xl border border-border/70 bg-card/70 px-3 py-2.5">
      <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: subject.color }} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{subject.name}</p>
        <p className="text-xs text-muted-foreground">
          {subject.category || 'Sem categoria'} - {subject.weeklyGoalHours}h/sem
          {subject.planId ? ' - Plano' : ''}
        </p>
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

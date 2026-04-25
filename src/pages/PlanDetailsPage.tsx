import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useStudyPlans, StudyPlanInput } from '@/hooks/useStudyPlans';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { ImageUpload } from '@/components/generic/image-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, CheckCircle2, Clock, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface PlanSubject {
  id: string;
  name: string;
  color: string;
  category?: string | null;
  weekly_goal_hours?: number | null;
  monthly_goal_hours?: number | null;
  description?: string | null;
  active?: boolean | null;
  optional?: boolean | null;
  sort_order?: number | null;
}

interface ScheduleEntryRow {
  id: string;
  date: string;
  subject_id: string;
  start_time?: string | null;
  planned_minutes?: number | null;
  completed?: boolean | null;
  optional?: boolean | null;
  item_note?: string | null;
  sort_order?: number | null;
}

const EMPTY_PLAN_FORM: StudyPlanInput = {
  name: '',
  exam_name: '',
  board_name: '',
  role_name: '',
  description: '',
  cover_image_url: '',
  review_interval_days: 7,
};

const EMPTY_SUBJECT_FORM = {
  name: '',
  color: '#5B8C7E',
  category: '',
  weekly_goal_hours: 4,
  monthly_goal_hours: 16,
  description: '',
};

const EMPTY_ENTRY_FORM = {
  date: new Date().toISOString().slice(0, 10),
  subject_id: '',
  start_time: '',
  planned_minutes: 60,
  item_note: '',
};

function slugify(value: string): string {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

export default function PlanDetailsPage() {
  const { planId } = useParams();
  const { user } = useAuth();
  const { plans, updatePlan } = useStudyPlans();
  const plan = plans.find((item) => item.id === planId);

  const [subjects, setSubjects] = useState<PlanSubject[]>([]);
  const [entries, setEntries] = useState<ScheduleEntryRow[]>([]);
  const [loadingFlow, setLoadingFlow] = useState(false);
  const [editPlanOpen, setEditPlanOpen] = useState(false);
  const [subjectOpen, setSubjectOpen] = useState(false);
  const [entryOpen, setEntryOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [planForm, setPlanForm] = useState<StudyPlanInput>(EMPTY_PLAN_FORM);
  const [subjectForm, setSubjectForm] = useState(EMPTY_SUBJECT_FORM);
  const [entryForm, setEntryForm] = useState(EMPTY_ENTRY_FORM);
  const [editingSubjectId, setEditingSubjectId] = useState<string | null>(null);

  const subjectById = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject])), [subjects]);
  const sortedEntries = useMemo(
    () => [...entries].sort((left, right) => `${left.date}${left.start_time || ''}`.localeCompare(`${right.date}${right.start_time || ''}`)),
    [entries],
  );

  const loadFlow = async () => {
    if (!user || !planId) return;
    setLoadingFlow(true);

    const [subjectsRes, entriesRes] = await Promise.all([
      supabase
        .from('subjects')
        .select('*')
        .eq('user_id', user.id)
        .eq('plan_id', planId)
        .order('sort_order', { ascending: true })
        .order('name', { ascending: true }),
      supabase
        .from('schedule_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('plan_id', planId)
        .order('date', { ascending: true })
        .order('sort_order', { ascending: true }),
    ]);

    if (subjectsRes.error) {
      console.error(subjectsRes.error);
      toast.error('Erro ao carregar matérias do plano.');
    } else {
      setSubjects((subjectsRes.data || []) as PlanSubject[]);
    }

    if (entriesRes.error) {
      console.error(entriesRes.error);
      toast.error('Erro ao carregar cronograma do plano.');
    } else {
      setEntries((entriesRes.data || []) as ScheduleEntryRow[]);
    }

    setLoadingFlow(false);
  };

  useEffect(() => {
    void loadFlow();
  }, [user?.id, planId]);

  const openEditPlan = () => {
    if (!plan) return;
    setPlanForm({
      name: plan.name || '',
      exam_name: plan.exam_name || '',
      board_name: plan.board_name || '',
      role_name: plan.role_name || '',
      description: plan.description || '',
      cover_image_url: plan.cover_image_url || '',
      review_interval_days: plan.review_interval_days || 7,
      status: plan.status,
      start_date: plan.start_date || '',
      target_date: plan.target_date || '',
    });
    setEditPlanOpen(true);
  };

  const savePlan = async () => {
    if (!planId || !planForm.name.trim()) {
      toast.error('Informe o nome do plano.');
      return;
    }

    setSubmitting(true);
    try {
      await updatePlan(planId, {
        ...planForm,
        name: planForm.name.trim(),
        review_interval_days: Number(planForm.review_interval_days) || 7,
      });
      toast.success('Plano atualizado com sucesso.');
      setEditPlanOpen(false);
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateSubject = () => {
    setEditingSubjectId(null);
    setSubjectForm(EMPTY_SUBJECT_FORM);
    setSubjectOpen(true);
  };

  const openEditSubject = (subject: PlanSubject) => {
    setEditingSubjectId(subject.id);
    setSubjectForm({
      name: subject.name || '',
      color: subject.color || '#5B8C7E',
      category: subject.category || '',
      weekly_goal_hours: Number(subject.weekly_goal_hours || 0),
      monthly_goal_hours: Number(subject.monthly_goal_hours || 0),
      description: subject.description || '',
    });
    setSubjectOpen(true);
  };

  const saveSubject = async () => {
    if (!user || !planId || !subjectForm.name.trim()) {
      toast.error('Informe o nome da matéria.');
      return;
    }

    setSubmitting(true);
    const payload = {
      user_id: user.id,
      plan_id: planId,
      name: subjectForm.name.trim(),
      slug: slugify(subjectForm.name),
      color: subjectForm.color || '#5B8C7E',
      category: subjectForm.category || null,
      weekly_goal_hours: Number(subjectForm.weekly_goal_hours) || 0,
      monthly_goal_hours: Number(subjectForm.monthly_goal_hours) || 0,
      description: subjectForm.description || null,
      active: true,
      optional: false,
      origin: 'user',
      status: 'active',
      sort_order: editingSubjectId ? undefined : subjects.length,
    };

    const response = editingSubjectId
      ? await supabase
          .from('subjects')
          .update({ ...payload, sort_order: undefined })
          .eq('id', editingSubjectId)
          .eq('user_id', user.id)
          .eq('plan_id', planId)
      : await supabase.from('subjects').insert(payload);

    if (response.error) {
      console.error(response.error);
      toast.error('Erro ao salvar matéria.');
    } else {
      toast.success(editingSubjectId ? 'Matéria atualizada.' : 'Matéria criada.');
      setSubjectOpen(false);
      await loadFlow();
    }
    setSubmitting(false);
  };

  const deleteSubject = async (subjectId: string) => {
    if (!user || !confirm('Deseja excluir esta matéria do plano?')) return;
    const { error } = await supabase.from('subjects').delete().eq('id', subjectId).eq('user_id', user.id).eq('plan_id', planId);
    if (error) {
      toast.error('Erro ao excluir matéria.');
      console.error(error);
      return;
    }
    toast.success('Matéria excluída.');
    await loadFlow();
  };

  const saveEntry = async () => {
    if (!user || !planId || !entryForm.subject_id || !entryForm.date) {
      toast.error('Informe a data e a matéria.');
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from('schedule_entries').insert({
      user_id: user.id,
      plan_id: planId,
      subject_id: entryForm.subject_id,
      date: entryForm.date,
      start_time: entryForm.start_time || null,
      planned_minutes: Number(entryForm.planned_minutes) || 60,
      item_note: entryForm.item_note || null,
      optional: false,
      completed: false,
      sort_order: entries.filter((entry) => entry.date === entryForm.date).length,
    });

    if (error) {
      console.error(error);
      toast.error('Erro ao adicionar item no cronograma.');
    } else {
      toast.success('Item adicionado ao cronograma.');
      setEntryOpen(false);
      setEntryForm(EMPTY_ENTRY_FORM);
      await loadFlow();
    }
    setSubmitting(false);
  };

  const toggleEntry = async (entry: ScheduleEntryRow) => {
    const { error } = await supabase.from('schedule_entries').update({ completed: !entry.completed }).eq('id', entry.id);
    if (error) {
      toast.error('Erro ao atualizar item.');
      return;
    }
    await loadFlow();
  };

  const deleteEntry = async (entryId: string) => {
    if (!confirm('Deseja remover este item do cronograma?')) return;
    const { error } = await supabase.from('schedule_entries').delete().eq('id', entryId);
    if (error) {
      toast.error('Erro ao remover item.');
      return;
    }
    await loadFlow();
  };

  if (!plan) {
    return (
      <div className="space-y-4">
        <p className="text-muted-foreground">Plano de Estudos não encontrado ou ainda carregando.</p>
        <Button asChild variant="outline"><Link to="/plans">Voltar para planos</Link></Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="workspace-panel overflow-hidden">
        {plan.cover_image_url ? <img src={plan.cover_image_url} alt={plan.name} className="h-44 w-full object-cover" /> : null}
        <div className="p-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Plano de Estudos</p>
              <h1 className="text-2xl font-display font-bold">{plan.name}</h1>
            </div>
            <Button onClick={openEditPlan} variant="outline" className="rounded-xl">
              <Pencil className="mr-1.5 h-4 w-4" />
              Editar plano
            </Button>
          </div>

          <div className="mt-3 grid gap-2 text-sm text-muted-foreground sm:grid-cols-4">
            <span>Concurso: {plan.exam_name || '-'}</span>
            <span>Banca: {plan.board_name || '-'}</span>
            <span>Cargo: {plan.role_name || '-'}</span>
            <span>Revisão: a cada {plan.review_interval_days || 7} dias</span>
          </div>
          {plan.description ? <p className="mt-3 text-sm text-muted-foreground">{plan.description}</p> : null}
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="rounded-xl border bg-card p-4 text-sm">
          <p className="font-medium">Matérias</p>
          <p className="mt-1 text-2xl font-bold">{subjects.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-sm">
          <p className="font-medium">Itens no cronograma</p>
          <p className="mt-1 text-2xl font-bold">{entries.length}</p>
        </div>
        <div className="rounded-xl border bg-card p-4 text-sm">
          <p className="font-medium">Concluídos</p>
          <p className="mt-1 text-2xl font-bold">{entries.filter((entry) => entry.completed).length}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
        <section className="workspace-panel p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="font-display text-lg font-bold">Matérias do plano</h2>
              <p className="text-sm text-muted-foreground">Crie matérias específicas para este plano.</p>
            </div>
            <Button onClick={openCreateSubject} size="sm" className="rounded-xl">
              <Plus className="mr-1 h-4 w-4" />
              Matéria
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {loadingFlow ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Carregando...</p>
            ) : subjects.length === 0 ? (
              <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">Nenhuma matéria criada para este plano.</p>
            ) : (
              subjects.map((subject) => (
                <div key={subject.id} className="flex items-center gap-3 rounded-xl border bg-card/70 px-3 py-2.5">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: subject.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{subject.name}</p>
                    <p className="text-xs text-muted-foreground">{subject.category || 'Sem categoria'} · {subject.weekly_goal_hours || 0}h/sem</p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => openEditSubject(subject)}><Pencil className="h-4 w-4" /></Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => void deleteSubject(subject.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="workspace-panel p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Cronograma do plano</h2>
              <p className="text-sm text-muted-foreground">Adicione matérias por data para montar o fluxo de estudos.</p>
            </div>
            <Button onClick={() => setEntryOpen(true)} disabled={subjects.length === 0} className="rounded-xl">
              <CalendarDays className="mr-1.5 h-4 w-4" />
              Adicionar no cronograma
            </Button>
          </div>

          <div className="mt-4 space-y-2">
            {sortedEntries.length === 0 ? (
              <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
                Crie matérias e depois adicione itens no cronograma do plano.
              </p>
            ) : (
              sortedEntries.map((entry) => {
                const subject = subjectById.get(entry.subject_id);
                return (
                  <div key={entry.id} className="flex flex-col gap-3 rounded-xl border bg-card/70 p-3 sm:flex-row sm:items-center">
                    <button type="button" onClick={() => void toggleEntry(entry)} className="flex items-center gap-2 text-left">
                      <CheckCircle2 className={`h-5 w-5 ${entry.completed ? 'text-primary' : 'text-muted-foreground'}`} />
                      <div>
                        <p className="text-sm font-medium">{subject?.name || 'Matéria removida'}</p>
                        <p className="text-xs text-muted-foreground">{entry.date} {entry.start_time ? `· ${entry.start_time}` : ''}</p>
                      </div>
                    </button>
                    <div className="flex flex-1 items-center gap-2 text-xs text-muted-foreground sm:justify-end">
                      <Clock className="h-4 w-4" />
                      {entry.planned_minutes || 0} min
                      {entry.item_note ? <span className="line-clamp-1">· {entry.item_note}</span> : null}
                    </div>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => void deleteEntry(entry.id)}><Trash2 className="h-4 w-4" /></Button>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      <Dialog open={editPlanOpen} onOpenChange={setEditPlanOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar Plano de Estudos</DialogTitle>
            <DialogDescription>Atualize as informações principais do plano.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Nome do plano *</Label><Input value={planForm.name} onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-2"><Label>Concurso</Label><Input value={planForm.exam_name} onChange={(e) => setPlanForm((f) => ({ ...f, exam_name: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Banca</Label><Input value={planForm.board_name} onChange={(e) => setPlanForm((f) => ({ ...f, board_name: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Cargo</Label><Input value={planForm.role_name} onChange={(e) => setPlanForm((f) => ({ ...f, role_name: e.target.value }))} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_180px] sm:items-start">
              <ImageUpload value={planForm.cover_image_url} onChange={(url) => setPlanForm((f) => ({ ...f, cover_image_url: url }))} folder="study-plans" label="Imagem do plano" />
              <div className="grid gap-2"><Label>Revisão automática</Label><Input type="number" min={1} value={planForm.review_interval_days} onChange={(e) => setPlanForm((f) => ({ ...f, review_interval_days: Number(e.target.value) }))} /><p className="text-xs text-muted-foreground">Intervalo em dias</p></div>
            </div>
            <div className="grid gap-2"><Label>Descrição</Label><Textarea rows={4} value={planForm.description} onChange={(e) => setPlanForm((f) => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEditPlanOpen(false)}>Cancelar</Button><Button onClick={savePlan} disabled={submitting}>{submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : null}Salvar alterações</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={subjectOpen} onOpenChange={setSubjectOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>{editingSubjectId ? 'Editar matéria' : 'Criar matéria'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Nome da matéria *</Label><Input value={subjectForm.name} onChange={(e) => setSubjectForm((f) => ({ ...f, name: e.target.value }))} placeholder="Ex.: Português" /></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Categoria</Label><Input value={subjectForm.category} onChange={(e) => setSubjectForm((f) => ({ ...f, category: e.target.value }))} placeholder="Ex.: Conhecimentos básicos" /></div>
              <div className="grid gap-2"><Label>Cor</Label><Input type="color" value={subjectForm.color} onChange={(e) => setSubjectForm((f) => ({ ...f, color: e.target.value }))} /></div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2"><Label>Meta semanal (h)</Label><Input type="number" min={0} value={subjectForm.weekly_goal_hours} onChange={(e) => setSubjectForm((f) => ({ ...f, weekly_goal_hours: Number(e.target.value) }))} /></div>
              <div className="grid gap-2"><Label>Meta mensal (h)</Label><Input type="number" min={0} value={subjectForm.monthly_goal_hours} onChange={(e) => setSubjectForm((f) => ({ ...f, monthly_goal_hours: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid gap-2"><Label>Descrição</Label><Textarea value={subjectForm.description} onChange={(e) => setSubjectForm((f) => ({ ...f, description: e.target.value }))} /></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setSubjectOpen(false)}>Cancelar</Button><Button onClick={saveSubject} disabled={submitting}>{editingSubjectId ? 'Salvar matéria' : 'Criar matéria'}</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={entryOpen} onOpenChange={setEntryOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader><DialogTitle>Adicionar no cronograma</DialogTitle><DialogDescription>Escolha a matéria, data e tempo planejado.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Matéria *</Label><Select value={entryForm.subject_id} onValueChange={(value) => setEntryForm((f) => ({ ...f, subject_id: value }))}><SelectTrigger><SelectValue placeholder="Selecione uma matéria" /></SelectTrigger><SelectContent>{subjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}</SelectContent></Select></div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-2"><Label>Data *</Label><Input type="date" value={entryForm.date} onChange={(e) => setEntryForm((f) => ({ ...f, date: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Horário</Label><Input type="time" value={entryForm.start_time} onChange={(e) => setEntryForm((f) => ({ ...f, start_time: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Minutos</Label><Input type="number" min={1} value={entryForm.planned_minutes} onChange={(e) => setEntryForm((f) => ({ ...f, planned_minutes: Number(e.target.value) }))} /></div>
            </div>
            <div className="grid gap-2"><Label>Observação</Label><Textarea value={entryForm.item_note} onChange={(e) => setEntryForm((f) => ({ ...f, item_note: e.target.value }))} placeholder="Ex.: teoria, questões ou revisão" /></div>
          </div>
          <div className="flex justify-end gap-2"><Button variant="outline" onClick={() => setEntryOpen(false)}>Cancelar</Button><Button onClick={saveEntry} disabled={submitting}>Adicionar</Button></div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { useStudyPlans, StudyPlanInput } from '@/hooks/useStudyPlans';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Loader2, Plus, Search, Trophy } from 'lucide-react';
import { toast } from 'sonner';

const INITIAL_FORM: StudyPlanInput = {
  name: '',
  exam_name: '',
  board_name: '',
  role_name: '',
  description: '',
  cover_image_url: '',
  review_interval_days: 7,
};

export default function PlansPage() {
  const { plans, loading, error, createPlan } = useStudyPlans();
  const [query, setQuery] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<StudyPlanInput>(INITIAL_FORM);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const filteredPlans = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) return plans;

    return plans.filter((plan) =>
      [plan.name, plan.exam_name, plan.board_name, plan.role_name, plan.description]
        .filter(Boolean)
        .some((value) => value?.toLowerCase().includes(normalizedQuery)),
    );
  }, [plans, query]);

  const updateForm = <K extends keyof StudyPlanInput>(key: K, value: StudyPlanInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const resetForm = () => {
    setForm(INITIAL_FORM);
  };

  const openCreateDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    const name = form.name.trim();

    if (!name) {
      toast.error('Informe o nome do plano de estudos.');
      return;
    }

    setSubmitting(true);

    try {
      const plan = await createPlan({
        ...form,
        name,
        exam_name: form.exam_name?.trim(),
        board_name: form.board_name?.trim(),
        role_name: form.role_name?.trim(),
        description: form.description?.trim(),
        cover_image_url: form.cover_image_url?.trim(),
        review_interval_days: Number(form.review_interval_days) || 7,
      });

      if (plan) {
        toast.success('Plano de estudos criado com sucesso.');
        setDialogOpen(false);
        resetForm();
        navigate(`/plans/${plan.id}`);
      }
    } catch (createError) {
      console.error(createError);
      toast.error('Não foi possível criar o plano de estudos.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <section className="workspace-panel overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Planos de Estudos</p>
            <h1 className="mt-1 text-2xl font-display font-bold text-foreground sm:text-3xl">
              Organize seus concursos por plano
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              Crie um plano geral para cada concurso, com banca, cargo, descrição, imagem e intervalo de revisão.
            </p>
          </div>

          <Button onClick={openCreateDialog} className="rounded-xl">
            <Plus className="mr-1.5 h-4 w-4" />
            Criar plano
          </Button>
        </div>

        <div className="mt-5 flex items-center gap-2 rounded-xl border border-border/70 bg-background/80 px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por plano, concurso, banca ou cargo"
            className="border-0 px-0 shadow-none focus-visible:ring-0"
          />
        </div>
      </section>

      {error ? (
        <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          Erro ao carregar planos: {error}
        </div>
      ) : null}

      {loading ? (
        <div className="workspace-panel flex items-center justify-center gap-2 p-8 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Carregando planos de estudos...
        </div>
      ) : filteredPlans.length === 0 ? (
        <div className="workspace-panel p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
            <Trophy className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-foreground">Nenhum plano encontrado</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie seu primeiro plano para estudar por concurso, banca, cargo e revisões automáticas.
          </p>
          <Button onClick={openCreateDialog} className="mt-4 rounded-xl">
            Criar primeiro plano
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredPlans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => navigate(`/plans/${plan.id}`)}
              className="workspace-panel group overflow-hidden text-left transition hover:-translate-y-0.5 hover:shadow-lg"
            >
              {plan.cover_image_url ? (
                <div className="h-32 w-full overflow-hidden bg-muted">
                  <img src={plan.cover_image_url} alt={plan.name} className="h-full w-full object-cover transition group-hover:scale-105" />
                </div>
              ) : null}

              <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wide text-primary">Plano de Estudos</p>
                    <h2 className="mt-1 truncate text-lg font-display font-bold text-foreground">{plan.name}</h2>
                  </div>
                  <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                    {plan.status === 'active' ? 'Ativo' : plan.status}
                  </span>
                </div>

                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p>Concurso: {plan.exam_name || '-'}</p>
                  <p>Banca: {plan.board_name || '-'}</p>
                  <p>Cargo: {plan.role_name || '-'}</p>
                </div>

                {plan.description ? <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{plan.description}</p> : null}

                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <CalendarDays className="h-4 w-4" />
                  Revisão a cada {plan.review_interval_days || 7} dias
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display">Criar Plano de Estudos</DialogTitle>
            <DialogDescription>
              Cadastre o plano geral do concurso. Depois você poderá vincular matérias, modelo semanal, cronograma e revisões.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="plan-name">Nome do plano *</Label>
              <Input
                id="plan-name"
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                placeholder="Ex.: Soldado PMDF 2026"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="grid gap-2">
                <Label htmlFor="exam-name">Concurso</Label>
                <Input
                  id="exam-name"
                  value={form.exam_name}
                  onChange={(event) => updateForm('exam_name', event.target.value)}
                  placeholder="Ex.: PMDF"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="board-name">Banca</Label>
                <Input
                  id="board-name"
                  value={form.board_name}
                  onChange={(event) => updateForm('board_name', event.target.value)}
                  placeholder="Ex.: Cebraspe"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role-name">Cargo</Label>
                <Input
                  id="role-name"
                  value={form.role_name}
                  onChange={(event) => updateForm('role_name', event.target.value)}
                  placeholder="Ex.: Soldado"
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-[1fr_180px]">
              <div className="grid gap-2">
                <Label htmlFor="cover-image-url">URL da imagem</Label>
                <Input
                  id="cover-image-url"
                  value={form.cover_image_url}
                  onChange={(event) => updateForm('cover_image_url', event.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="review-interval-days">Revisão automática</Label>
                <Input
                  id="review-interval-days"
                  type="number"
                  min={1}
                  value={form.review_interval_days}
                  onChange={(event) => updateForm('review_interval_days', Number(event.target.value))}
                  placeholder="7"
                />
                <p className="text-xs text-muted-foreground">Intervalo em dias</p>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="plan-description">Descrição</Label>
              <Textarea
                id="plan-description"
                value={form.description}
                onChange={(event) => updateForm('description', event.target.value)}
                placeholder="Objetivo, edital, observações e estratégia inicial do plano."
                rows={4}
              />
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={submitting}>
              {submitting ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Plus className="mr-1.5 h-4 w-4" />}
              Criar plano
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { useStudyPlans } from '@/hooks/useStudyPlans';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle2, Loader2, MoreVertical, Plus, Search, Trash2, Trophy } from 'lucide-react';
import { toast } from 'sonner';

export default function PlansPage() {
  const { plans, loading, error, deletePlan } = useStudyPlans();
  const [query, setQuery] = useState('');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
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

  const openCreateDialog = () => {
    navigate('/plans/new');
  };

  const handleDeletePlan = async (event: React.MouseEvent, planId: string, planName: string) => {
    event.stopPropagation();
    setOpenMenuId(null);

    const confirmed = window.confirm(
      `Tem certeza que deseja excluir o plano "${planName}"? Essa ação não poderá ser desfeita.`,
    );

    if (!confirmed) return;

    setDeletingPlanId(planId);
    try {
      await deletePlan(planId);
      toast.success('Plano excluído com sucesso.');
    } catch (deleteError) {
      console.error(deleteError);
      toast.error('Não foi possível excluir o plano.');
    } finally {
      setDeletingPlanId(null);
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
              Crie um plano geral para cada concurso. Cada plano já nasce com um cronograma próprio vinculado para receber matérias, templates, sessões e revisões.
            </p>
          </div>

          <Button onClick={openCreateDialog} className="rounded-xl">
            <Plus className="mr-1.5 h-4 w-4" />
            Criar plano guiado
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
            Crie seu primeiro plano para estudar por concurso, banca, cargo, cronograma próprio e revisões automáticas.
          </p>
          <Button onClick={openCreateDialog} className="mt-4 rounded-xl">
            Criar primeiro plano guiado
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filteredPlans.map((plan) => (
            <div
              key={plan.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/plans/${plan.id}`)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  navigate(`/plans/${plan.id}`);
                }
              }}
              className="workspace-panel group relative cursor-pointer overflow-hidden text-left transition hover:-translate-y-0.5 hover:shadow-lg"
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

                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-border px-2 py-0.5 text-[11px] text-muted-foreground">
                      {plan.status === 'active' ? 'Ativo' : plan.status}
                    </span>

                    <div className="relative">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 rounded-full"
                        onClick={(event) => {
                          event.stopPropagation();
                          setOpenMenuId((current) => (current === plan.id ? null : plan.id));
                        }}
                        disabled={deletingPlanId === plan.id}
                        aria-label={`Abrir ações do plano ${plan.name}`}
                      >
                        {deletingPlanId === plan.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreVertical className="h-4 w-4" />}
                      </Button>

                      {openMenuId === plan.id ? (
                        <div
                          className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-border bg-background p-1 shadow-lg"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(event) => handleDeletePlan(event, plan.id, plan.name)}
                            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-destructive transition hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir plano
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                  <p>Concurso: {plan.exam_name || '-'}</p>
                  <p>Banca: {plan.board_name || '-'}</p>
                  <p>Cargo: {plan.role_name || '-'}</p>
                </div>

                {plan.description ? <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">{plan.description}</p> : null}

                <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-1">
                    <CalendarDays className="h-4 w-4" />
                    Revisão a cada {plan.review_interval_days || 7} dias
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/70 px-2 py-1">
                    <CheckCircle2 className="h-4 w-4" />
                    Cronograma vinculado
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

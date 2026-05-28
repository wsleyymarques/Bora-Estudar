import React, { useMemo, useState } from 'react';
import { useStudyPlans } from '@/hooks/useStudyPlans';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';
import { Loader2, MoreVertical, Plus, Search, Sparkles, Trash2, Trophy, CalendarDays, CheckCircle2 } from 'lucide-react';
import { PageHeader } from '@/components/generic/PageHeader';
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


  const getPlanInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'PL';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  };

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
    <div className="relative mx-auto w-full max-w-full">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(255,255,255,0.75),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.6),_transparent)]" />

      <PageHeader 
        title="Planos de Estudos"
        description="Organize concursos, bancas e cargos em uma visão única, com cronograma e revisões conectados ao seu fluxo."
        badgeText="Espaço de planos"
        badgeIcon={Sparkles}
        action={
          <Button onClick={openCreateDialog} className="h-11 rounded-[1.25rem] px-5 shadow-lg shadow-black/5">
            <Plus className="mr-1.5 h-4.5 w-4.5" />
            Criar plano guiado
          </Button>
        }
      />

      <div className="space-y-2.5 mt-2 sm:space-y-6 sm:mt-6">
        <div className="rounded-xl sm:rounded-[1.25rem] border border-border/60 bg-background/85 p-1 shadow-sm backdrop-blur-sm">
          <div className="flex items-center gap-2 rounded-[1rem] bg-background px-3 py-1.5">
            <Search className="h-4 w-4 text-muted-foreground/70" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por plano, concurso, banca ou cargo"
              className="h-8 border-0 bg-transparent px-0 text-sm shadow-none placeholder:text-muted-foreground/60 focus-visible:ring-0"
            />
          </div>
        </div>

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
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
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
              className="group relative flex cursor-pointer flex-col overflow-hidden rounded-[1.25rem] sm:rounded-[1.75rem] border border-border/60 bg-background/90 text-left shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-black/10"
            >
              {plan.cover_image_url ? (
                <div className="relative h-44 w-full overflow-hidden bg-muted">
                  <img src={plan.cover_image_url} alt={plan.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/15 via-transparent to-transparent" />
                </div>
              ) : (
                <div className="relative flex h-44 w-full items-end overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.7),_transparent_38%),linear-gradient(135deg,_rgba(53,53,53,0.08),_rgba(53,53,53,0.02))] p-5">
                  <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(rgba(0,0,0,0.06)_1px,transparent_1px)] [background-size:16px_16px]" />
                  <div className="relative inline-flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-border/70 bg-background/85 text-2xl font-bold text-foreground shadow-sm">
                    {getPlanInitials(plan.name)}
                  </div>
                </div>
              )}

              <div className="flex flex-1 flex-col p-4 sm:p-5 lg:p-6">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">Plano de Estudos</p>
                    <h2 className="mt-1.5 truncate text-xl font-display font-bold text-foreground">{plan.name}</h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-border/70 bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground shadow-sm">
                      {plan.status === 'active' ? 'Ativo' : plan.status}
                    </span>

                    <div className="relative">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-9 w-9 rounded-full border border-border/60 bg-background/80 shadow-sm"
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
                          className="absolute right-0 z-20 mt-2 w-48 rounded-2xl border border-border/60 bg-background p-2 shadow-xl shadow-black/10"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(event) => handleDeletePlan(event, plan.id, plan.name)}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-destructive transition hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                            Excluir plano
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 text-xs text-muted-foreground">
                    <Trophy className="h-3.5 w-3.5" />
                    Concurso: {plan.exam_name || '-'}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 text-xs text-muted-foreground">
                    <Trophy className="h-3.5 w-3.5" />
                    Banca: {plan.board_name || '-'}
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 text-xs text-muted-foreground">
                    <Trophy className="h-3.5 w-3.5" />
                    Cargo: {plan.role_name || '-'}
                  </span>
                </div>

                {plan.description ? <p className="mt-4 line-clamp-3 text-sm leading-6 text-muted-foreground">{plan.description}</p> : null}

                <div className="mt-auto flex flex-wrap items-center gap-2 pt-5 text-[11px] font-semibold text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 shadow-sm">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Revisão: {plan.review_interval_days || 7} dias
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background px-3 py-1.5 shadow-sm">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Cronograma ativo
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}

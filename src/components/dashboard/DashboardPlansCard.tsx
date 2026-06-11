import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Plus, Trophy } from 'lucide-react';

import { type StudyPlan } from '@/hooks/useStudyPlans';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardPlansCardProps {
  plans: StudyPlan[];
  className?: string;
}

export function DashboardPlansCard({ plans, className }: DashboardPlansCardProps) {
  const navigate = useNavigate();

  const visiblePlans = useMemo(() => plans.slice(0, 2), [plans]);

  const getPlanInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'PL';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  };

  return (
    <section
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-border/50 bg-card p-4 text-card-foreground shadow-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <Trophy className="h-3.5 w-3.5 text-primary" />
            Planos ativos
          </div>
          <h3 className="mt-2 text-base font-black tracking-tight text-foreground">
            Seus Planos de Estudos
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Acompanhe seus cronogramas principais em poucos cliques.
          </p>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full border-border/60 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
          onClick={() => navigate('/plans/new')}
          title="Criar novo plano"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mt-3 space-y-2.5">
        {visiblePlans.length > 0 ? (
          visiblePlans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => navigate(`/plans/${plan.id}`)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl border border-border/50 bg-background/80 px-3 py-2.5 text-left transition-all hover:border-primary/20 hover:bg-primary/[0.03]"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {plan.cover_image_url ? (
                  <img
                    src={plan.cover_image_url}
                    alt={plan.name}
                    className="h-9 w-9 shrink-0 rounded-xl border border-border/60 object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-primary/10 bg-primary/10 text-[10px] font-black text-primary">
                    {getPlanInitials(plan.name)}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-foreground">{plan.name}</p>
                  <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {plan.plan_type === 'concurso'
                      ? 'Concurso'
                      : plan.plan_type === 'faculdade'
                        ? 'Faculdade'
                        : 'Outro'}
                    {plan.exam_name ? ` • ${plan.exam_name}` : ''}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em]',
                    plan.status === 'active'
                      ? 'border-success/20 bg-success/5 text-success'
                      : 'border-border bg-muted/10 text-muted-foreground',
                  )}
                >
                  {plan.status === 'active' ? 'Ativo' : 'Pausado'}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground" />
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-5 text-center">
            <p className="text-sm font-semibold text-foreground">Nenhum plano cadastrado</p>
            <p className="mt-1 text-xs text-muted-foreground">Crie seu primeiro plano para começar a organizar os estudos.</p>
            <Button size="sm" className="mt-3 rounded-full" onClick={() => navigate('/plans/new')}>
              Criar plano
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end border-t border-border/40 pt-2">
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs font-bold text-primary hover:text-primary/80"
          onClick={() => navigate('/plans')}
        >
          Ver todos os planos ({plans.length})
        </Button>
      </div>
    </section>
  );
}

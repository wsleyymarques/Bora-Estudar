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
        'flex h-full flex-col overflow-hidden rounded-[1.5rem] bg-white dark:bg-[#0f1b14] border-gray-200 dark:border-[#1e2e24] p-6 shadow-sm dark:shadow-none',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full bg-gray-100 dark:bg-[#0a120d] px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-white/50">
            <Trophy className="h-3.5 w-3.5 text-emerald-600 dark:text-[#10b981]" />
            Planos ativos
          </div>
          <h3 className="mt-2 text-base font-black tracking-tight text-gray-900 dark:text-white">
            Seus Planos de Estudos
          </h3>
          <p className="mt-1 text-xs text-gray-500 dark:text-white/40">
            Acompanhe seus cronogramas principais em poucos cliques.
          </p>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full text-gray-400 dark:text-white/40 hover:text-emerald-600 dark:hover:text-emerald-500"
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
              className="flex w-full items-center justify-between gap-3 rounded-2xl px-3 py-2.5 text-left transition-all hover:bg-gray-100 dark:hover:bg-[#0a120d]"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                {plan.cover_image_url ? (
                  <img
                    src={plan.cover_image_url}
                    alt={plan.name}
                    className="h-9 w-9 shrink-0 rounded-xl object-cover"
                  />
                ) : (
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-[10px] font-black text-emerald-600 dark:text-emerald-500">
                    {getPlanInitials(plan.name)}
                  </div>
                )}

                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-gray-900 dark:text-white">{plan.name}</p>
                  <p className="mt-0.5 truncate text-[10px] text-gray-500 dark:text-white/40">
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
                    'rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em]',
                    plan.status === 'active'
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-500'
                      : 'bg-gray-100 dark:bg-[#1e2e24] text-gray-500 dark:text-white/40',
                  )}
                >
                  {plan.status === 'active' ? 'Ativo' : 'Pausado'}
                </span>
                <ArrowUpRight className="h-3.5 w-3.5 text-gray-400 dark:text-white/30" />
              </div>
            </button>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-[#1e2e24] bg-gray-100 dark:bg-[#0a120d] px-4 py-5 text-center">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Nenhum plano cadastrado</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-white/40">Crie seu primeiro plano para começar a organizar os estudos.</p>
            <Button size="sm" className="mt-3 rounded-full" onClick={() => navigate('/plans/new')}>
              Criar plano
            </Button>
          </div>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end pt-2 border-t border-transparent shrink-0 text-right">
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs font-bold text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
          onClick={() => navigate('/plans')}
        >
          Ver todos os planos ({plans.length})
        </Button>
      </div>
    </section>
  );
}

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, BookOpen, Plus, Sparkles, Trophy } from 'lucide-react';
import { type StudyPlan } from '@/hooks/useStudyPlans';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DashboardPlansCardProps {
  plans: StudyPlan[];
  className?: string;
}

export function DashboardPlansCard({ plans, className }: DashboardPlansCardProps) {
  const navigate = useNavigate();

  const getPlanInitials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'PL';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return `${parts[0][0] ?? ''}${parts[1][0] ?? ''}`.toUpperCase();
  };

  return (
    <section
      className={cn(
        'bg-card border border-border/50 text-card-foreground rounded-[2rem] p-5 shadow-sm flex flex-col gap-3 min-h-[300px]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <Trophy className="h-3.5 w-3.5 text-primary" />
            Planos ativos
          </div>
          <h3 className="mt-3 text-lg font-display font-black tracking-tight text-foreground">
            Seus Planos de Estudos
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Acompanhe e configure seus cronogramas de estudo ativos.
          </p>
        </div>
        <Button 
          variant="outline" 
          size="icon" 
          className="h-8 w-8 rounded-full border-primary/20 text-primary hover:bg-primary/10 hover:text-primary transition-all" 
          onClick={() => navigate('/plans/new')} 
          title="Criar novo plano"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex-1 flex flex-col justify-between mt-2">
        {plans.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 p-6 text-center">
            <Sparkles className="h-8 w-8 text-primary/40 mb-2" />
            <p className="text-sm font-semibold text-foreground">Nenhum plano cadastrado</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-[200px]">
              Crie seu primeiro plano de estudos para organizar seu cronograma.
            </p>
            <Button size="sm" className="mt-4 rounded-full" onClick={() => navigate('/plans/new')}>
              Criar plano
            </Button>
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
            {plans.map((plan) => (
              <div
                key={plan.id}
                onClick={() => navigate(`/plans/${plan.id}`)}
                className="flex items-center justify-between p-3 rounded-2xl border border-border/40 hover:border-primary/30 bg-muted/5 hover:bg-primary/5 transition-all cursor-pointer group active:scale-[0.99]"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {plan.cover_image_url ? (
                    <img 
                      src={plan.cover_image_url} 
                      alt={plan.name}
                      className="w-10 h-10 rounded-xl object-cover border border-border/60 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary border border-primary/10 flex items-center justify-center font-display font-black text-xs shrink-0">
                      {getPlanInitials(plan.name)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">
                      {plan.name}
                    </h4>
                    <p className="text-[10px] text-muted-foreground font-medium truncate mt-0.5">
                      {plan.plan_type === 'concurso' ? 'Concurso' : plan.plan_type === 'vestibular' ? 'Vestibular' : 'Outro'}
                      {plan.exam_name ? ` • ${plan.exam_name}` : ''}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                    plan.status === 'active' 
                      ? "bg-success/5 text-success border-success/15" 
                      : "bg-muted/10 text-muted-foreground border-border"
                  )}>
                    {plan.status === 'active' ? 'Ativo' : 'Pausado'}
                  </span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
                </div>
              </div>
            ))}
          </div>
        )}

        {plans.length > 0 && (
          <div className="flex items-center justify-end pt-3 mt-2 border-t border-border/40">
            <Button 
              variant="link" 
              size="sm" 
              className="text-xs font-bold text-primary hover:text-primary/80 p-0 h-auto"
              onClick={() => navigate('/plans')}
            >
              Ver todos os planos ({plans.length})
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

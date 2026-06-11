import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Flame, Play, Timer } from 'lucide-react';

import { useStudy } from '@/contexts/StudyContext';
import { useStudyPlans, type StudyPlan } from '@/hooks/useStudyPlans';
import { usePlanSubjects } from '@/hooks/usePlanSubjects';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface QuickPlanTimerCardProps {
  plans?: StudyPlan[];
  className?: string;
}

export function QuickPlanTimerCard({ plans, className }: QuickPlanTimerCardProps) {
  const navigate = useNavigate();
  const { data } = useStudy();
  const { plans: storedPlans } = useStudyPlans();
  const allPlans = plans ?? storedPlans;

  const activePlans = useMemo(() => allPlans.filter((plan) => plan.status === 'active'), [allPlans]);

  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [mode, setMode] = useState<'cronometro' | 'pomodoro'>('cronometro');

  useEffect(() => {
    const preferredPlanId = data.activeStudyPlanId || activePlans[0]?.id || '';
    if (!selectedPlanId || !activePlans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(preferredPlanId);
    }
  }, [activePlans, data.activeStudyPlanId, selectedPlanId]);

  const { planSubjects } = usePlanSubjects(selectedPlanId || undefined);

  useEffect(() => {
    if (!planSubjects.length) {
      setSelectedSubjectId('');
      return;
    }

    if (!selectedSubjectId || !planSubjects.some((subject) => subject.id === selectedSubjectId)) {
      setSelectedSubjectId(planSubjects[0].id);
    }
  }, [planSubjects, selectedSubjectId]);

  const selectedPlan = activePlans.find((plan) => plan.id === selectedPlanId);
  const selectedSubject = planSubjects.find((subject) => subject.id === selectedSubjectId);

  return (
    <section
      className={cn(
        'flex h-full flex-col overflow-hidden rounded-[1.5rem] border border-border/50 bg-card p-4 text-card-foreground shadow-sm',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.26em] text-primary">
            <Timer className="h-3.5 w-3.5" />
            Timer rapido
          </div>

          <div className="space-y-1">
            <h3 className="text-base font-black tracking-tight text-foreground">
              Comecar materia do plano
            </h3>
            <p className="max-w-[28rem] text-xs text-muted-foreground">
              Escolha um plano, selecione a materia e inicie em um toque.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="h-8 w-8 rounded-full border-border/60 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
          onClick={() => navigate('/timer')}
          title="Abrir timer"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Button>
      </div>

      <div className="mt-3 grid gap-3">
        <div className="grid gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-[0.26em] text-muted-foreground">
            Plano
          </label>
          <Select value={selectedPlanId} onValueChange={setSelectedPlanId} disabled={activePlans.length === 0}>
            <SelectTrigger className="h-10 rounded-2xl border-border/60 bg-background/80 px-4 text-sm shadow-sm">
              <SelectValue placeholder={activePlans.length ? 'Selecione um plano' : 'Nenhum plano ativo'} />
            </SelectTrigger>
            <SelectContent>
              {activePlans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-1.5">
          <label className="text-[10px] font-black uppercase tracking-[0.26em] text-muted-foreground">
            MatÃ©ria
          </label>
          <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={!planSubjects.length}>
            <SelectTrigger className="h-10 rounded-2xl border-border/60 bg-background/80 px-4 text-sm shadow-sm">
              <SelectValue placeholder={planSubjects.length ? 'Selecione uma matÃ©ria' : 'Sem matÃ©rias neste plano'} />
            </SelectTrigger>
            <SelectContent>
              {planSubjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex rounded-full border border-border/60 bg-muted/20 p-1">
            <button
              type="button"
              onClick={() => setMode('cronometro')}
              className={cn(
                'rounded-full px-3 py-1.5 text-[11px] font-bold transition-all',
                mode === 'cronometro' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
              )}
            >
              Cronometro
            </button>
            <button
              type="button"
              onClick={() => setMode('pomodoro')}
              className={cn(
                'rounded-full px-3 py-1.5 text-[11px] font-bold transition-all',
                mode === 'pomodoro' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
              )}
            >
              Pomodoro
            </button>
          </div>

          <Button
            className="h-10 rounded-full bg-emerald-700 px-5 text-sm font-bold text-white shadow-[0_12px_28px_rgba(16,97,64,0.24)] hover:bg-emerald-600"
            onClick={() => navigate('/timer')}
            disabled={!selectedPlan}
          >
            <Play className="mr-2 h-4 w-4 fill-current" />
            Iniciar agora
          </Button>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 px-3 py-2.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Flame className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.26em] text-muted-foreground">
                Sessao atual
              </p>
              <p className="truncate text-xs font-semibold text-foreground">
                {selectedPlan?.name || 'Selecione um plano'} {selectedSubject ? `â€¢ ${selectedSubject.name}` : ''}
              </p>
            </div>
          </div>

          <span className="rounded-full border border-primary/15 bg-primary/5 px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.2em] text-primary">
            {mode}
          </span>
        </div>
      </div>
    </section>
  );
}

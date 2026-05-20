import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Brain, Pause, Play, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useTracker } from '@/contexts/TrackerContext';
import { useStudy } from '@/contexts/StudyContext';
import { usePlanSubjects } from '@/hooks/usePlanSubjects';
import { type StudyPlan } from '@/hooks/useStudyPlans';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ClockTimePickerField } from '@/components/generic/time-picker-fields';
import { cn } from '@/lib/utils';

interface QuickPlanTimerCardProps {
  plans: StudyPlan[];
  className?: string;
}

export function QuickPlanTimerCard({ plans, className }: QuickPlanTimerCardProps) {
  const navigate = useNavigate();
  const activePlans = useMemo(() => plans.filter((plan) => plan.status === 'active'), [plans]);
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const selectedPlan = useMemo(
    () => activePlans.find((plan) => plan.id === selectedPlanId) || activePlans[0],
    [activePlans, selectedPlanId],
  );

  useEffect(() => {
    if (activePlans.length === 0) {
      setSelectedPlanId('');
      return;
    }

    if (!selectedPlanId || !activePlans.some((plan) => plan.id === selectedPlanId)) {
      setSelectedPlanId(activePlans[0].id);
    }
  }, [activePlans, selectedPlanId]);

  const { planSubjects, loading: subjectsLoading } = usePlanSubjects(selectedPlan?.id);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [busyMode, setBusyMode] = useState<'stopwatch' | 'pomodoro' | null>(null);

  useEffect(() => {
    if (planSubjects.length === 0) {
      setSelectedSubjectId('');
      return;
    }

    if (!selectedSubjectId || !planSubjects.some((subject) => subject.id === selectedSubjectId)) {
      setSelectedSubjectId(planSubjects[0].id);
    }
  }, [planSubjects, selectedSubjectId]);

  const selectedSubject = useMemo(
    () => planSubjects.find((subject) => subject.id === selectedSubjectId),
    [planSubjects, selectedSubjectId],
  );

  const { getSubject } = useStudy();

  const {
    runtime,
    mode,
    setMode,
    startWithBinding,
    getBindingState,
    togglePauseResume,
    finishActive,
    isTransitioning,
    displayTimeLabel,
    phaseStateLabel,
    activeStartTime,
    setActiveStartTime,
    isRunning,
  } = useTracker();

  const binding = selectedSubject ? { subjectId: selectedSubject.id } : null;
  const bindingState = binding ? getBindingState(binding) : null;

  const activeSubject = useMemo(
    () => (runtime ? getSubject(runtime.subjectId) : null),
    [runtime, getSubject]
  );

  const activePlan = useMemo(
    () => (activeSubject ? plans.find((p) => p.id === activeSubject.planId) : null),
    [activeSubject, plans]
  );

  const handleStart = async (selectedMode: 'stopwatch' | 'pomodoro') => {
    if (!selectedPlan || !selectedSubject) {
      toast.error('Selecione um plano e uma materia.');
      return;
    }

    setBusyMode(selectedMode);
    setMode(selectedMode);

    const result = await startWithBinding({ subjectId: selectedSubject.id }, { mode: selectedMode });
    if (!result.ok && result.status === 'conflict') {
      const shouldSwitch = window.confirm('Ja existe uma sessao ativa em outra materia. Deseja encerrar a atual e iniciar esta?');
      if (!shouldSwitch) {
        setBusyMode(null);
        return;
      }

      const forced = await startWithBinding({ subjectId: selectedSubject.id }, { mode: selectedMode, forceSwitch: true });
      if (!forced.ok) {
        toast.error('Nao foi possivel iniciar esta sessao agora.');
      }
      setBusyMode(null);
      return;
    }

    if (!result.ok) {
      toast.error('Nao foi possivel iniciar esta sessao agora.');
    }

    setBusyMode(null);
  };

  const hasPlans = activePlans.length > 0;
  const hasSubjects = planSubjects.length > 0;

  return (
    <section
      className={cn(
        'bg-card border border-border/50 text-card-foreground rounded-[2rem] p-5 shadow-sm flex flex-col gap-4 min-h-[16rem]',
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <Timer className="h-3.5 w-3.5 text-primary" />
            Timer rapido
          </div>
          <h3 className="mt-3 text-lg font-display font-black tracking-tight text-foreground">
            {runtime ? 'Sessão em andamento' : 'Comecar materia do plano'}
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            {runtime ? 'Você tem uma sessão ativa rodando no momento.' : 'Escolha um plano, selecione a materia e inicie em um toque.'}
          </p>
        </div>
        <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => navigate('/timer')} title="Abrir timer">
          <ArrowUpRight className="h-4 w-4" />
        </Button>
      </div>

      {!hasPlans ? (
        <div className="flex flex-1 flex-col items-start justify-between rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Nenhum plano ativo</p>
            <p className="mt-1 text-xs text-muted-foreground">Crie um plano para iniciar materias mais rapido por aqui.</p>
          </div>
          <Button variant="secondary" className="mt-4 rounded-full" onClick={() => navigate('/plans')}>
            Ver planos
          </Button>
        </div>
      ) : runtime ? (
        <div className="space-y-4 flex-1 flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 bg-muted/30 p-3 rounded-2xl border border-border/40">
            <div className="flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", isRunning ? "bg-success animate-pulse" : "bg-warning")} />
              <span className="text-xs uppercase tracking-[0.11em] font-semibold text-muted-foreground">
                {runtime.kind === 'pomodoro' ? 'Pomodoro' : 'Cronômetro'} - {phaseStateLabel || 'Sessão ativa'}
              </span>
            </div>
            <div className="text-2xl font-display font-black tracking-tight text-foreground tabular-nums">
              {displayTimeLabel}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1.5">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: activeSubject?.color || '#5B8C7E' }} />
              <span className="max-w-[12rem] truncate text-sm font-medium text-foreground">
                {activeSubject?.name || 'Materia'}
              </span>
            </div>
            {activePlan && (
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
                <Brain className="h-3.5 w-3.5" />
                {activePlan.name}
              </div>
            )}
          </div>

          {runtime.kind === 'stopwatch' && (
            <div className="flex flex-col gap-1.5 rounded-2xl border border-border/60 bg-muted/20 px-4 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Início da sessão (retroativo)</p>
              <div className="flex items-center gap-2.5 mt-0.5">
                <ClockTimePickerField
                  value={activeStartTime}
                  onChange={setActiveStartTime}
                  placeholder="--:--"
                  className="h-9 px-2.5 text-xs w-28 bg-background"
                />
                <span className="text-xs text-muted-foreground">Ajuste o horário se começou a estudar mais cedo.</span>
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/40">
            <Button variant={isRunning ? 'default' : 'outline'} className="rounded-full h-9" onClick={() => togglePauseResume()} disabled={isTransitioning}>
              {isRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
              {isRunning ? 'Pausar' : 'Retomar'}
            </Button>
            <Button variant="outline" className="rounded-full h-9 text-destructive hover:bg-destructive/10 hover:text-destructive border-border/60" onClick={() => void finishActive('completed')} disabled={isTransitioning}>
              Finalizar
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Plano</p>
              <Select value={selectedPlan?.id} onValueChange={setSelectedPlanId}>
                <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-background/80">
                  <SelectValue placeholder="Selecione um plano" />
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

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Materia</p>
              <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId} disabled={subjectsLoading || !selectedPlan}>
                <SelectTrigger className="h-11 rounded-2xl border-border/60 bg-background/80">
                  <SelectValue placeholder={subjectsLoading ? 'Carregando...' : 'Selecione uma materia'} />
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
          </div>

          {!hasSubjects ? (
            <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
              Este plano ainda nao tem materias vinculadas.
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-3 py-1.5">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: selectedSubject?.color || '#5B8C7E' }} />
                <span className="max-w-[12rem] truncate text-sm font-medium text-foreground">
                  {selectedSubject?.name || 'Selecione uma materia'}
                </span>
              </div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-xs text-muted-foreground">
                <Brain className="h-3.5 w-3.5" />
                {selectedPlan?.name}
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div className="flex items-center gap-1.5 rounded-full bg-muted/70 p-1 w-fit">
              <button
                type="button"
                onClick={() => setMode('stopwatch')}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors',
                  mode === 'stopwatch' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                Cronometro
              </button>
              <button
                type="button"
                onClick={() => setMode('pomodoro')}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[11px] font-semibold transition-colors',
                  mode === 'pomodoro' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
                )}
              >
                Pomodoro
              </button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                className="rounded-full px-5"
                onClick={() => void handleStart(mode)}
                disabled={isTransitioning || !selectedPlan || !selectedSubject || busyMode !== null}
              >
                {busyMode ? 'Iniciando...' : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Iniciar agora
                  </>
                )}
              </Button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

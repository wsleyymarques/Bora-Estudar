import React, { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Brain, Pause, Play, Timer } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { useTracker } from '@/contexts/TrackerContext';
import { usePlanSubjects } from '@/hooks/usePlanSubjects';
import { type StudyPlan } from '@/hooks/useStudyPlans';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  const { mode, setMode, startWithBinding, getBindingState, togglePauseResume, finishActive, isTransitioning, displayTimeLabel, phaseStateLabel } = useTracker();

  const binding = selectedSubject ? { subjectId: selectedSubject.id } : null;
  const bindingState = binding ? getBindingState(binding) : null;
  const isRunning = bindingState === 'running';

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
          <h3 className="mt-3 text-lg font-display font-black tracking-tight text-foreground">Comecar materia do plano</h3>
          <p className="mt-1 text-xs text-muted-foreground">Escolha um plano, selecione a materia e inicie em um toque.</p>
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
              {bindingState ? (
                <>
                  <Button variant={isRunning ? 'default' : 'outline'} className="rounded-full" onClick={() => togglePauseResume()} disabled={isTransitioning}>
                    {isRunning ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                    {isRunning ? 'Pausar' : 'Retomar'}
                  </Button>
                  <Button variant="outline" className="rounded-full" onClick={() => void finishActive('completed')} disabled={isTransitioning}>
                    Finalizar
                  </Button>
                </>
              ) : (
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
              )}
            </div>
          </div>

          {bindingState ? (
            <div className="rounded-2xl border border-border/60 bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{phaseStateLabel || 'Sessao ativa'}</span>
              <span className="mx-2">•</span>
              <span className="font-semibold text-foreground">{displayTimeLabel}</span>
              <span className="mx-2">•</span>
              <span>{selectedSubject?.name || 'Materia selecionada'}</span>
            </div>
          ) : null}
        </>
      )}
    </section>
  );
}

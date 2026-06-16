import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Flame, Play, Timer, Activity } from 'lucide-react';

import { useStudy } from '@/contexts/StudyContext';
import { useStudyPlans, type StudyPlan } from '@/hooks/useStudyPlans';
import { usePlanSubjects } from '@/hooks/usePlanSubjects';
import { useTracker } from '@/contexts/TrackerContext';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { PomodoroQuickSettings } from '@/components/generic/pomodoro-quick-settings';
import { cn } from '@/lib/utils';

interface QuickPlanTimerCardProps {
  plans?: StudyPlan[];
  className?: string;
  onStart?: () => void;
}

export function QuickPlanTimerCard({ plans, className, onStart }: QuickPlanTimerCardProps) {
  const navigate = useNavigate();
  const { data, getSubject } = useStudy();
  const { plans: storedPlans } = useStudyPlans();
  const allPlans = plans ?? storedPlans;
  const { startWithBinding, runtime, displayTimeLabel, phaseStateLabel, setIsMaximized, pomodoroSettings, setPomodoroSettings } = useTracker();
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // If plans are passed, assume they are the plans to display. Otherwise, use storedPlans and filter out archived ones.
  const activePlans = useMemo(() => {
    if (plans) return plans;
    return storedPlans.filter((plan) => plan.status !== 'archived' && plan.status !== 'deleted');
  }, [plans, storedPlans]);

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

  const handleStartTimer = async () => {
    if (!selectedPlanId || !selectedSubjectId) return
    
    if (mode === 'pomodoro' && !isConfigOpen) {
      setIsConfigOpen(true);
      return;
    }

    setIsConfigOpen(false);

    const res = await startWithBinding(
      { planId: selectedPlanId, subjectId: selectedSubjectId },
      { mode, forceSwitch: true }
    )
    if (res.ok) {
      setIsMaximized(true)
      onStart?.()
    }
  }

  const runtimeSubject = runtime ? getSubject(runtime.subjectId) : null;

  return (
    <div className={cn("flex h-full flex-col overflow-hidden rounded-[1.5rem] bg-white dark:bg-[#0f1b14] border-gray-200 dark:border-[#1e2e24] p-6 shadow-sm dark:shadow-none", className)}>
      <div className="flex items-center gap-2 mb-6 text-emerald-600 dark:text-emerald-500">
        <Timer className="w-5 h-5" />
        <h2 className="text-lg font-black tracking-tight text-gray-900 dark:text-white">Timer Rápido</h2>
      </div>

      <div className="space-y-5">
        {/* Toggle Cronometro / Pomodoro */}
        <div className="flex bg-gray-50 dark:bg-[#0a120d] border border-gray-200 dark:border-[#1e2e24] p-1 rounded-full text-xs font-bold transition-colors w-fit">
          <button 
            onClick={() => setMode('cronometro')}
            className={cn("px-4 py-2 rounded-full transition-colors", mode === 'cronometro' ? "bg-white dark:bg-[#1e2e24] text-gray-900 dark:text-white shadow-sm dark:shadow-none" : "text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70")}
          >
            Cronômetro
          </button>
          <button 
            onClick={() => setMode('pomodoro')}
            className={cn("px-4 py-2 rounded-full transition-colors", mode === 'pomodoro' ? "bg-white dark:bg-[#1e2e24] text-gray-900 dark:text-white shadow-sm dark:shadow-none" : "text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70")}
          >
            Pomodoro
          </button>
        </div>

        <div>
          <p className="text-[10px] font-bold tracking-wider text-gray-500 dark:text-white/50 uppercase mb-2">Plano</p>
          <Select value={selectedPlanId || undefined} onValueChange={setSelectedPlanId} disabled={activePlans.length === 0}>
            <SelectTrigger className="w-full bg-gray-50 dark:bg-[#0a120d] border-gray-200 dark:border-[#1e2e24] text-gray-900 dark:text-white h-12 rounded-xl focus:ring-emerald-500/20 transition-colors">
              <SelectValue placeholder={activePlans.length ? 'Selecione um plano' : 'Nenhum plano ativo'} />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#0a120d] border-gray-200 dark:border-[#1e2e24] text-gray-900 dark:text-white">
              {activePlans.length > 0 ? activePlans.map(plan => (
                <SelectItem key={plan.id} value={plan.id}>{plan.name || plan.title}</SelectItem>
              )) : (
                <SelectItem value="none" disabled>Nenhum plano ativo</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div>
          <p className="text-[10px] font-bold tracking-wider text-gray-500 dark:text-white/50 uppercase mb-2">Matéria</p>
          <Select value={selectedSubjectId || undefined} onValueChange={setSelectedSubjectId} disabled={!planSubjects.length}>
            <SelectTrigger className="w-full bg-gray-50 dark:bg-[#0a120d] border-gray-200 dark:border-[#1e2e24] text-gray-900 dark:text-white h-12 rounded-xl focus:ring-emerald-500/20 transition-colors">
              <SelectValue placeholder={planSubjects.length ? 'Selecione uma matéria' : 'Sem matérias neste plano'} />
            </SelectTrigger>
            <SelectContent className="bg-white dark:bg-[#0a120d] border-gray-200 dark:border-[#1e2e24] text-gray-900 dark:text-white">
              {planSubjects.map(sub => (
                <SelectItem key={sub.id} value={sub.id}>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sub.color || '#10b981' }} />
                    <span className="truncate">{sub.name}</span>
                  </div>
                </SelectItem>
              ))}
              {planSubjects.length === 0 && (
                <SelectItem value="none" disabled>Nenhuma matéria</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="pt-2">
          <Button 
            onClick={handleStartTimer}
            disabled={!selectedPlanId || !selectedSubjectId}
            className="w-full h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Play className="w-4 h-4 mr-2" />
            Iniciar Sessão
          </Button>
        </div>

        {/* Sessão Atual */}
        {runtime && (
          <div className={cn("mt-4 p-4 rounded-xl border flex items-center justify-between transition-colors bg-emerald-500/10 border-emerald-500/20")}>
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
              <div>
                <p className="text-[10px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-500">Sessão Atual</p>
                <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                  {runtimeSubject?.name || 'Matéria'} • {displayTimeLabel}
                </p>
              </div>
            </div>
            <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-500">
              {phaseStateLabel}
            </span>
          </div>
        )}
      </div>

      <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-[#0f1b14] border-gray-200 dark:border-[#1e2e24]">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-white flex items-center gap-2">
              <Timer className="w-5 h-5 text-emerald-600" />
              Configurar Pomodoro
            </DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <PomodoroQuickSettings 
              settings={pomodoroSettings} 
              onChange={setPomodoroSettings} 
              className="border-gray-200 dark:border-[#1e2e24] bg-gray-50 dark:bg-[#0a120d]"
            />
          </div>
          
          <Button 
            onClick={handleStartTimer}
            className="w-full h-12 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20 transition-all"
          >
            <Play className="w-4 h-4 mr-2" />
            Iniciar Sessão Pomodoro
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

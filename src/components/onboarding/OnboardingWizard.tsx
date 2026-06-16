import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Target, Calendar, Clock, ArrowRight, CheckCircle2, ChevronRight, BookOpen, Layers } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { formatMinutesCompact } from '@/lib/duration-utils';
import { TimeSpinner } from '@/components/ui/time-spinner';

export function OnboardingWizard() {
  const { profile, updateProfile } = useAuth();
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Step 1: Goals
  const [dailyGoalHours, setDailyGoalHours] = useState(2);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(0);
  const [weeklyGoalHours, setWeeklyGoalHours] = useState(10);
  const [weeklyGoalMinutes, setWeeklyGoalMinutes] = useState(0);

  const totalDailyMinutes = dailyGoalHours * 60 + dailyGoalMinutes;
  const totalWeeklyMinutes = weeklyGoalHours * 60 + weeklyGoalMinutes;

  // Don't render anything if onboarding is already completed or profile isn't loaded
  if (!profile || profile.onboarding_completed) {
    return null;
  }

  const handleNextStep = () => {
    if (step === 1) {
      if (totalDailyMinutes <= 0 || totalWeeklyMinutes <= 0) {
        toast.error('Por favor, defina um tempo maior que zero para suas metas.');
        return;
      }
      setStep(2);
    }
  };

  const finishOnboarding = async (choice: 'plan' | 'schedule') => {
    setIsSubmitting(true);
    
    const { error } = await updateProfile({
      daily_goal_minutes: totalDailyMinutes,
      weekly_goal_minutes: totalWeeklyMinutes,
      onboarding_completed: true
    });

    setIsSubmitting(false);

    if (error) {
      toast.error('Erro ao salvar configurações.');
      return;
    }

    toast.success('Pronto! Bora Estudar!');
    
    // Redirect based on user choice
    if (choice === 'plan') {
      navigate('/plans/new');
    } else {
      navigate('/schedules');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background overflow-hidden">
      {/* Background Glows */}
      <div className="absolute left-[-10%] top-[-10%] h-[500px] w-[500px] rounded-full bg-emerald-500/20 blur-[150px] pointer-events-none opacity-60 dark:opacity-100" />
      <div className="absolute right-[-10%] bottom-[-10%] h-[400px] w-[400px] rounded-full bg-blue-600/15 blur-[120px] pointer-events-none opacity-60 dark:opacity-100" />

      {/* Header with Stepper */}
      <header className="relative z-10 flex items-center justify-center h-20 border-b border-border/50 bg-background/50 backdrop-blur-md px-6">
        <div className="flex items-center gap-3">
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors",
            step >= 1 ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground border border-border/50"
          )}>
            1
          </div>
          <div className={cn(
            "h-1 w-12 rounded-full transition-colors",
            step >= 2 ? "bg-emerald-500" : "bg-secondary border border-border/50"
          )} />
          <div className={cn(
            "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors",
            step >= 2 ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground border border-border/50"
          )}>
            2
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="relative z-10 flex-1 overflow-y-auto px-6 pt-6 pb-32 md:pt-10 md:pb-20">
        <div className="mx-auto max-w-2xl">
          
          {step === 1 && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-10">
              <div className="flex flex-row md:flex-col items-center md:text-center gap-5 md:gap-0 md:space-y-4 mb-10 text-left">
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 flex flex-shrink-0 items-center justify-center md:mb-6 md:mx-auto border border-emerald-500/20">
                  <Target className="w-8 h-8 text-emerald-400" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Defina suas Metas</h1>
                  <p className="text-muted-foreground text-sm md:text-lg max-w-md mx-auto mt-1 md:mt-0">
                    A consistência é o segredo da aprovação. Quanto tempo você pretende se dedicar?
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Meta Diária */}
                <div className="bg-secondary/30 backdrop-blur-sm border border-border/50 p-6 rounded-3xl space-y-6">
                  <div className="flex items-center gap-3 text-emerald-400">
                    <Clock className="w-5 h-5" />
                    <h3 className="font-bold text-lg text-foreground">Meta Diária</h3>
                  </div>
                  
                  <div className="flex items-center gap-4 justify-center">
                    <div className="flex flex-col items-center">
                      <TimeSpinner 
                        value={dailyGoalHours}
                        onChange={setDailyGoalHours}
                        min={0} max={23}
                        activeColorClass="focus-within:border-emerald-500 focus-within:ring-emerald-500"
                      />
                      <span className="text-xs text-muted-foreground font-bold mt-2 uppercase tracking-wider">Horas</span>
                    </div>
                    <span className="text-2xl font-black text-white/20 mb-6">:</span>
                    <div className="flex flex-col items-center">
                      <TimeSpinner 
                        value={dailyGoalMinutes}
                        onChange={setDailyGoalMinutes}
                        min={0} max={59} step={5}
                        activeColorClass="focus-within:border-emerald-500 focus-within:ring-emerald-500"
                      />
                      <span className="text-xs text-muted-foreground font-bold mt-2 uppercase tracking-wider">Min</span>
                    </div>
                  </div>
                </div>

                {/* Meta Semanal */}
                <div className="bg-secondary/30 backdrop-blur-sm border border-border/50 p-6 rounded-3xl space-y-6">
                  <div className="flex items-center gap-3 text-blue-400">
                    <Calendar className="w-5 h-5" />
                    <h3 className="font-bold text-lg text-foreground">Meta Semanal</h3>
                  </div>
                  
                  <div className="flex items-center gap-4 justify-center">
                    <div className="flex flex-col items-center">
                      <TimeSpinner 
                        value={weeklyGoalHours}
                        onChange={setWeeklyGoalHours}
                        min={0} max={168}
                        activeColorClass="focus-within:border-blue-500 focus-within:ring-blue-500"
                      />
                      <span className="text-xs text-muted-foreground font-bold mt-2 uppercase tracking-wider">Horas</span>
                    </div>
                    <span className="text-2xl font-black text-white/20 mb-6">:</span>
                    <div className="flex flex-col items-center">
                      <TimeSpinner 
                        value={weeklyGoalMinutes}
                        onChange={setWeeklyGoalMinutes}
                        min={0} max={59} step={5}
                        activeColorClass="focus-within:border-blue-500 focus-within:ring-blue-500"
                      />
                      <span className="text-xs text-muted-foreground font-bold mt-2 uppercase tracking-wider">Min</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="fixed md:static bottom-0 left-0 right-0 p-6 md:p-0 bg-gradient-to-t from-background via-background/90 to-transparent md:bg-none z-20 flex justify-center md:pt-8 pointer-events-none md:pointer-events-auto">
                <button
                  onClick={handleNextStep}
                  className="w-full md:w-auto flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-2xl font-bold text-lg transition-all hover:scale-105 active:scale-95 shadow-[0_0_40px_rgba(16,185,129,0.3)] pointer-events-auto"
                >
                  Continuar
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="animate-in fade-in slide-in-from-right-8 duration-500 space-y-10">
              <div className="flex flex-row md:flex-col items-center md:text-center gap-5 md:gap-0 md:space-y-4 mb-10 text-left">
                <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex flex-shrink-0 items-center justify-center md:mb-6 md:mx-auto border border-blue-500/20">
                  <Layers className="w-8 h-8 text-blue-400" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black tracking-tight text-foreground">Como você quer estudar?</h1>
                  <p className="text-muted-foreground text-sm md:text-lg max-w-lg mx-auto mt-1 md:mt-0">
                    Você pode organizar seus estudos focados em um objetivo final (Plano) ou criar uma agenda livre diária (Cronograma).
                  </p>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {/* Opção: Plano de Estudos */}
                <button
                  onClick={() => finishOnboarding('plan')}
                  disabled={isSubmitting}
                  className="group relative flex flex-col text-left bg-secondary/30 backdrop-blur-sm border border-border/50 p-8 rounded-3xl transition-all hover:bg-emerald-500/10 hover:border-emerald-500/30 overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500/80 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                  
                  <div className="w-12 h-12 rounded-xl bg-emerald-500/10 flex items-center justify-center mb-6">
                    <BookOpen className="w-6 h-6 text-emerald-400" />
                  </div>
                  
                  <h3 className="text-xl font-black text-foreground mb-3">Criar Plano de Estudos</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    Ideal para provas, vestibulares ou concursos. Você cadastra um objetivo, adiciona as matérias e o sistema ajuda a organizar ciclos e metas até o dia D.
                  </p>
                  
                  <div className="mt-6 flex items-center text-emerald-400 font-bold text-sm">
                    Escolher este
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>

                {/* Opção: Cronograma Avulso */}
                <button
                  onClick={() => finishOnboarding('schedule')}
                  disabled={isSubmitting}
                  className="group relative flex flex-col text-left bg-secondary/30 backdrop-blur-sm border border-border/50 p-8 rounded-3xl transition-all hover:bg-blue-500/10 hover:border-blue-500/30 overflow-hidden"
                >
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/80 scale-y-0 group-hover:scale-y-100 transition-transform origin-top" />
                  
                  <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6">
                    <Calendar className="w-6 h-6 text-blue-400" />
                  </div>
                  
                  <h3 className="text-xl font-black text-foreground mb-3">Criar Cronograma Avulso</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed flex-1">
                    Ideal para uma rotina livre. Você define o que vai estudar segunda, terça, etc., organizando blocos de horários sem estar preso a um único edital.
                  </p>
                  
                  <div className="mt-6 flex items-center text-blue-400 font-bold text-sm">
                    Escolher este
                    <ChevronRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}

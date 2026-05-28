import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, Play, Sparkles, Trophy, Calendar } from 'lucide-react';
import { useStudy } from '@/contexts/StudyContext';
import { useStudyPlans } from '@/hooks/useStudyPlans';
import { usePlanSubjects } from '@/hooks/usePlanSubjects';
import { toDateKey } from '@/lib/date-utils';
import { ScheduleItemPlayButton } from '@/components/schedule/ScheduleItemPlayButton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface DailySubjectsCardProps {
  className?: string;
}

export function DailySubjectsCard({ className }: DailySubjectsCardProps) {
  const navigate = useNavigate();
  const { data, getSubject, getScheduleForDate, toggleScheduleComplete } = useStudy();
  const { plans } = useStudyPlans();

  const todayStr = useMemo(() => toDateKey(new Date()), []);
  const activePlans = useMemo(() => (plans || []).filter(p => p.status === 'active'), [plans]);

  // Set default selected plan
  const [selectedPlanId, setSelectedPlanId] = useState<string>('');

  useEffect(() => {
    if (activePlans.length > 0 && !selectedPlanId) {
      // Prefer current active plan or fallback to first active plan
      const globalActive = data.activeStudyPlanId || '';
      const exists = activePlans.some(p => p.id === globalActive);
      setSelectedPlanId(exists ? globalActive : activePlans[0].id);
    }
  }, [activePlans, selectedPlanId, data.activeStudyPlanId]);

  // Load subjects for the selected plan to check matches
  const { planSubjects } = usePlanSubjects(selectedPlanId || undefined);

  // Filter today's schedule items for the selected plan
  const todaySchedule = useMemo(() => getScheduleForDate(todayStr), [getScheduleForDate, todayStr]);

  const isPlanSession = useCallback((session: any) => {
    if (session.planId === selectedPlanId) return true;
    if (session.planId) return false;
    return planSubjects.some((subject) => subject.id === session.subjectId);
  }, [selectedPlanId, planSubjects]);

  const planSessionsToday = useMemo(() => {
    if (!selectedPlanId) return [];
    return data.sessions.filter(s => s.date === todayStr && isPlanSession(s));
  }, [data.sessions, todayStr, isPlanSession, selectedPlanId]);

  const planEntries = useMemo(() => {
    if (!selectedPlanId) return [];
    const list = todaySchedule
      .filter(entry => entry.planId === selectedPlanId)
      .map(entry => ({
        id: entry.id,
        userId: entry.userId || '',
        planId: entry.planId || '',
        scheduleId: entry.scheduleId || '',
        date: entry.date,
        subjectId: entry.subjectId,
        startTime: entry.startTime || undefined,
        plannedMinutes: entry.plannedMinutes || undefined,
        completed: entry.completed || false,
        optional: entry.optional || false,
        itemNote: entry.itemNote || undefined,
        order: entry.order || 0,
        isExtra: false
      }));

    const entryKeys = new Set(list.map(e => `${e.date}_${e.subjectId}`));
    const synthesizedKeys = new Set<string>();

    planSessionsToday.forEach(session => {
      if (!session.date || !session.subjectId) return;
      const key = `${session.date}_${session.subjectId}`;
      if (!entryKeys.has(key) && !synthesizedKeys.has(key)) {
        synthesizedKeys.add(key);
        list.push({
          id: `virtual-${session.date}-${session.subjectId}`,
          userId: session.userId || '',
          planId: selectedPlanId || '',
          scheduleId: '',
          date: session.date,
          subjectId: session.subjectId,
          startTime: session.startTime || undefined,
          plannedMinutes: 0,
          completed: true,
          optional: true,
          itemNote: 'Sessão Extra',
          order: 999,
          isExtra: true
        });
      }
    });

    return list;
  }, [todaySchedule, selectedPlanId, planSubjects, planSessionsToday]);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const handleToggleComplete = async (entryId: string, isExtra?: boolean) => {
    if (isExtra) {
      toast.info("Esta é uma sessão extra realizada. Para alterá-la, edite o histórico de sessões.");
      return;
    }
    setTogglingId(entryId);
    try {
      await toggleScheduleComplete(entryId);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao atualizar status da matéria.');
    } finally {
      setTogglingId(null);
    }
  };

  // Calculate actual studied minutes for a subject today
  const getSubjectStudiedMinutesToday = (subjectId: string) => {
    const totalSeconds = data.sessions
      .filter((session) => session.subjectId === subjectId && session.date === todayStr && session.status === 'completed')
      .reduce((acc, session) => acc + (session.actualDurationSeconds || session.durationMinutes * 60 || 0), 0);
    return Math.round(totalSeconds / 60);
  };

  const selectedPlanName = activePlans.find(p => p.id === selectedPlanId)?.name || 'Plano';

  return (
    <section
      className={cn(
        'bg-card border border-border/50 text-card-foreground rounded-3xl p-4 sm:p-5 shadow-sm flex flex-col gap-3 sm:gap-4 min-h-[300px]',
        className
      )}
    >
      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-2.5 py-1 text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <BookOpen className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-primary" />
            Matérias de hoje
          </div>
          <span className="text-[10px] font-bold text-muted-foreground flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
          </span>
        </div>

        <div className="flex items-baseline justify-between mt-2">
          <h3 className="text-base sm:text-lg font-display font-black tracking-tight text-foreground">
            Cronograma do Dia
          </h3>
          {selectedPlanId && (
            <span className="text-xs font-semibold text-primary truncate max-w-[150px]">
              {selectedPlanName}
            </span>
          )}
        </div>
      </div>

      {/* Switcher for active plans (if more than 1 exists) */}
      {activePlans.length > 1 && (
        <div className="flex flex-wrap gap-1.5 p-1 bg-muted/20 border border-border/30 rounded-xl">
          {activePlans.map(plan => (
            <button
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all",
                selectedPlanId === plan.id
                  ? "bg-background text-primary shadow-sm border border-border/60"
                  : "text-muted-foreground hover:bg-muted/30 border border-transparent"
              )}
            >
              {plan.name}
            </button>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-between mt-2">
        {planEntries.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-muted/20 p-6 text-center">
            <Sparkles className="h-8 w-8 text-primary/40 mb-2 animate-pulse" />
            <p className="text-sm font-semibold text-foreground">Nada planejado para hoje</p>
            <p className="mt-1 text-xs text-muted-foreground max-w-[220px] mx-auto">
              {activePlans.length === 0 
                ? 'Crie ou ative um plano de estudos para ver suas matérias diárias aqui.'
                : 'Não há matérias agendadas para hoje neste plano de estudos.'}
            </p>
            {activePlans.length > 0 && selectedPlanId && (
              <Button size="sm" className="mt-4 rounded-full" onClick={() => navigate(`/plans/${selectedPlanId}`)}>
                Ir para o plano
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1 custom-scrollbar">
            {planEntries.map((entry) => {
              const subject = getSubject(entry.subjectId);
              const studiedMinutes = getSubjectStudiedMinutesToday(entry.subjectId);
              const isGoalReached = entry.plannedMinutes ? studiedMinutes >= entry.plannedMinutes : studiedMinutes >= 30;
              const isCompleted = entry.completed || studiedMinutes >= 30;

              return (
                <div
                  key={entry.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-2xl border transition-all duration-300",
                    isCompleted
                      ? "bg-success/5 border-success/20 dark:bg-success/10"
                      : "bg-muted/5 border-border/40 hover:border-primary/20 hover:bg-primary/[0.02]",
                    entry.isExtra && "border-dashed bg-primary/5 border-primary/20 backdrop-blur-sm"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Checkbox button */}
                    <button
                      onClick={() => handleToggleComplete(entry.id, entry.isExtra)}
                      disabled={togglingId === entry.id}
                      className={cn(
                        "w-5 h-5 rounded-full border flex items-center justify-center transition-all shrink-0 hover:scale-105 active:scale-95",
                        isCompleted
                          ? "bg-success border-success text-success-foreground"
                          : "border-muted-foreground/30 hover:border-primary bg-background"
                      )}
                      title={isCompleted ? "Marcar como não concluído" : "Marcar como concluído"}
                    >
                      {isCompleted && <CheckCircle2 className="w-4 h-4 text-white fill-success" />}
                    </button>

                    {/* Color dot */}
                    <div 
                      className="w-2.5 h-2.5 rounded-full shrink-0" 
                      style={{ backgroundColor: subject?.color || '#5B8C7E' }}
                    />

                    {/* Subject info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn(
                          "text-sm font-bold truncate",
                          isCompleted ? "text-muted-foreground line-through decoration-muted-foreground/50" : "text-foreground"
                        )}>
                          {subject?.name || 'Matéria'}
                        </span>
                        {entry.startTime && (
                          <span className="text-[9px] bg-muted px-1.5 py-0.5 rounded text-muted-foreground font-black uppercase tracking-wider">
                            {entry.startTime}
                          </span>
                        )}
                        {entry.isExtra && (
                          <span className="inline-flex rounded-md bg-accent/15 px-1.5 py-0.5 text-[9px] font-bold text-accent italic uppercase tracking-wider">
                            Sessão Extra
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-muted-foreground font-semibold">
                        {entry.plannedMinutes && entry.plannedMinutes > 0 ? (
                          <>
                            <span>Meta: {entry.plannedMinutes}m</span>
                            <span>•</span>
                          </>
                        ) : null}
                        <span className={cn(
                          "font-bold",
                          isGoalReached ? "text-success" : ""
                        )}>
                          Estudado: {studiedMinutes}m
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Play Timer Button */}
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {!entry.isExtra && <ScheduleItemPlayButton entry={entry} date={todayStr} />}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {planEntries.length > 0 && selectedPlanId && (
          <div className="flex items-center justify-end pt-3 mt-2 border-t border-border/40">
            <Button 
              variant="link" 
              size="sm" 
              className="text-xs font-bold text-primary hover:text-primary/80 p-0 h-auto"
              onClick={() => navigate(`/plans/${selectedPlanId}`)}
            >
              Gerenciar Cronograma
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}

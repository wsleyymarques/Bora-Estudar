import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, Calendar, CheckCircle2 } from 'lucide-react';

import { useStudy } from '@/contexts/StudyContext';
import { useStudyPlans } from '@/hooks/useStudyPlans';
import { toDateKey } from '@/lib/date-utils';
import { ScheduleItemPlayButton } from '@/components/schedule/ScheduleItemPlayButton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface DailySubjectsCardProps {
  className?: string;
}

export function DailySubjectsCard({ className }: DailySubjectsCardProps) {
  const navigate = useNavigate();
  const { data, getSubject, getScheduleForDate, toggleScheduleComplete } = useStudy();
  const { plans } = useStudyPlans();

  const todayStr = useMemo(() => toDateKey(new Date()), []);
  const activePlans = useMemo(() => (plans || []).filter((plan) => plan.status === 'active'), [plans]);

  const [selectedPlanId, setSelectedPlanId] = useState('');

  useEffect(() => {
    if (!activePlans.length) return;
    if (selectedPlanId && activePlans.some((plan) => plan.id === selectedPlanId)) return;
    setSelectedPlanId(data.activeStudyPlanId || activePlans[0].id);
  }, [activePlans, data.activeStudyPlanId, selectedPlanId]);

  const todayEntries = useMemo(() => {
    const entries = getScheduleForDate(todayStr);
    const filtered = selectedPlanId ? entries.filter((entry) => entry.planId === selectedPlanId) : entries;
    return filtered.slice(0, 2);
  }, [getScheduleForDate, selectedPlanId, todayStr]);

  const selectedPlan = activePlans.find((plan) => plan.id === selectedPlanId);

  const getSubjectStudiedMinutesToday = (subjectId: string) => {
    const totalSeconds = data.sessions
      .filter((session) => session.subjectId === subjectId && session.date === todayStr && session.status === 'completed')
      .reduce((acc, session) => acc + (session.actualDurationSeconds || session.durationMinutes * 60 || 0), 0);
    return Math.round(totalSeconds / 60);
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
            <BookOpen className="h-3.5 w-3.5 text-emerald-600 dark:text-[#10b981]" />
            Matérias de hoje
          </div>
          <h3 className="mt-2 text-base font-black tracking-tight text-gray-900 dark:text-white">
            Cronograma do Dia
          </h3>
        </div>

        <div className="flex flex-col items-end gap-1">
          <span className="flex items-center gap-1 text-[10px] font-bold text-gray-400 dark:text-white/30">
            <Calendar className="h-3.5 w-3.5" />
            {new Date().toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')}
          </span>
          {selectedPlan ? <span className="max-w-[10rem] truncate text-[11px] font-semibold text-emerald-600 dark:text-emerald-500">{selectedPlan.name}</span> : null}
        </div>
      </div>

      {activePlans.length > 1 ? (
        <div className="mt-3 flex flex-wrap gap-1 rounded-xl bg-gray-100 dark:bg-[#0a120d] p-1.5">
          {activePlans.map((plan) => (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlanId(plan.id)}
              className={cn(
                'rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.16em] transition-all',
                selectedPlanId === plan.id
                  ? 'bg-white dark:bg-[#1e2e24] text-emerald-600 dark:text-emerald-500 shadow-sm dark:shadow-none'
                  : 'text-gray-500 dark:text-white/40 hover:bg-white dark:hover:bg-[#1e2e24]',
              )}
            >
              {plan.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-3 space-y-2">
        {todayEntries.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 dark:border-[#1e2e24] bg-gray-100 dark:bg-[#0a120d] px-4 py-5 text-center">
            <p className="text-sm font-semibold text-gray-900 dark:text-white">Nada planejado para hoje</p>
            <p className="mt-1 text-xs text-gray-500 dark:text-white/40">
              {activePlans.length === 0
                ? 'Crie ou ative um plano para ver o cronograma aqui.'
                : 'Selecione um plano para visualizar as matérias do dia.'}
            </p>
            {activePlans.length > 0 ? (
              <Button size="sm" className="mt-3 rounded-full" onClick={() => navigate('/schedule')}>
                Ir para o cronograma
              </Button>
            ) : null}
          </div>
        ) : (
          todayEntries.map((entry) => {
            const subject = getSubject(entry.subjectId);
            const studiedMinutes = getSubjectStudiedMinutesToday(entry.subjectId);
            const plannedMinutes = entry.plannedMinutes || 60;
            const isDone = entry.completed || studiedMinutes >= plannedMinutes;

            return (
              <div
                key={entry.id}
                className={cn(
                  'flex items-center justify-between gap-3 rounded-2xl px-3 py-2.5 transition-all',
                  isDone
                    ? 'bg-emerald-500/5 dark:bg-emerald-500/10'
                    : 'bg-gray-100 dark:bg-[#0a120d] hover:bg-emerald-500/5 dark:hover:bg-emerald-500/10',
                )}
              >
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => toggleScheduleComplete(entry.id)}
                    className={cn(
                      'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition-all',
                      isDone ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-gray-300 dark:border-[#1e2e24] bg-white dark:bg-[#0f1b14]',
                    )}
                    title={isDone ? 'Marcar como não concluído' : 'Marcar como concluído'}
                  >
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : null}
                  </button>

                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: subject?.color || '#10b981' }} />

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={cn('truncate text-sm font-bold', isDone ? 'text-gray-400 dark:text-white/40 line-through' : 'text-gray-900 dark:text-white')}>
                        {subject?.name || 'Matéria'}
                      </p>
                      {entry.startTime ? (
                        <span className="rounded-full bg-gray-200 dark:bg-[#1e2e24] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-gray-500 dark:text-white/40">
                          {entry.startTime}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 text-[10px] text-gray-500 dark:text-white/40">
                      Meta: {plannedMinutes}m • Estudado: {studiedMinutes}m
                    </p>
                  </div>
                </div>

                <ScheduleItemPlayButton entry={entry} date={todayStr} />
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3 flex items-center justify-end pt-2 border-t border-transparent shrink-0 text-right">
        <Button
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs font-bold text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors"
          onClick={() => navigate('/schedule')}
        >
          Gerenciar Cronograma
        </Button>
      </div>
    </section>
  );
}

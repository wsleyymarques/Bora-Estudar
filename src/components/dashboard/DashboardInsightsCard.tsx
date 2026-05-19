import React, { useMemo } from 'react';
import { ArrowUpRight, BarChart3, CalendarRange, LayoutList, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useStudy } from '@/contexts/StudyContext';
import { useStudyPlans } from '@/hooks/useStudyPlans';
import { getSessionActualMinutes } from '@/features/tracker/session-metrics';
import { formatMinutesCompact } from '@/lib/duration-utils';
import { toDateKey } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface DashboardInsightsCardProps {
  className?: string;
}

type DayBucket = {
  date: string;
  totalMinutes: number;
  segments: Array<{ subjectId: string; minutes: number }>;
  totalHeight: number;
};

function formatShortDate(dateKey: string) {
  const date = new Date(`${dateKey}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: 'short' }).format(date).replace('.', '');
}

export function DashboardInsightsCard({ className }: DashboardInsightsCardProps) {
  const navigate = useNavigate();
  const { data } = useStudy();
  const { plans } = useStudyPlans();

  const recentDays = useMemo(() => {
    return Array.from({ length: 14 }, (_, index) => {
      const date = new Date();
      date.setDate(date.getDate() - (13 - index));
      return toDateKey(date);
    });
  }, []);

  const subjectsById = useMemo(() => new Map(data.subjects.map((subject) => [subject.id, subject])), [data.subjects]);
  const plansById = useMemo(() => new Map(plans.map((plan) => [plan.id, plan])), [plans]);

  const { totalMinutes, topSubject, topPlan, dayBuckets, topActivities } = useMemo(() => {
    const sessions = data.sessions.filter((session) => session.isFocusSession !== false);
    const recentSessions = sessions.filter((session) => recentDays.includes(session.date));

    const totalMinutes = recentSessions.reduce((acc, session) => acc + getSessionActualMinutes(session), 0);

    const subjectMinutes = recentSessions.reduce<Record<string, number>>((acc, session) => {
      acc[session.subjectId] = (acc[session.subjectId] || 0) + getSessionActualMinutes(session);
      return acc;
    }, {});

    const subjectPlanMinutes = recentSessions.reduce<Record<string, Record<string, number>>>((acc, session) => {
      if (!session.planId) return acc;
      if (!acc[session.subjectId]) acc[session.subjectId] = {};
      acc[session.subjectId][session.planId] = (acc[session.subjectId][session.planId] || 0) + getSessionActualMinutes(session);
      return acc;
    }, {});

    const rawDayBuckets = recentDays.map((date) => {
      const daySessions = recentSessions.filter((session) => session.date === date);
      const segments = daySessions.reduce<Record<string, number>>((acc, session) => {
        acc[session.subjectId] = (acc[session.subjectId] || 0) + getSessionActualMinutes(session);
        return acc;
      }, {});

      return {
        date,
        totalMinutes: daySessions.reduce((acc, session) => acc + getSessionActualMinutes(session), 0),
        segments: Object.entries(segments)
          .map(([subjectId, minutes]) => ({ subjectId, minutes }))
          .sort((left, right) => right.minutes - left.minutes)
          .slice(0, 3),
      };
    });

    const maxDayMinutes = Math.max(...rawDayBuckets.map((day) => day.totalMinutes), 1);
    const dayBuckets = rawDayBuckets.map((day) => ({
      ...day,
      totalHeight: Math.max(day.totalMinutes > 0 ? Math.round((day.totalMinutes / maxDayMinutes) * 100) : 6, 6),
    }));

    const topSubjectId = Object.entries(subjectMinutes).sort((left, right) => right[1] - left[1])[0]?.[0];
    const topSubject = topSubjectId ? subjectsById.get(topSubjectId) : undefined;

    const topSubjectPlanId = topSubjectId
      ? Object.entries(subjectPlanMinutes[topSubjectId] || {}).sort((left, right) => right[1] - left[1])[0]?.[0]
      : undefined;
    const topPlan = topSubjectPlanId ? plansById.get(topSubjectPlanId) : undefined;

    const topActivities = Object.entries(subjectMinutes)
      .map(([subjectId, minutes]) => {
        const subject = subjectsById.get(subjectId);
        const planMinutes = Object.entries(subjectPlanMinutes[subjectId] || {}).sort((left, right) => right[1] - left[1])[0];
        const plan = planMinutes ? plansById.get(planMinutes[0]) : undefined;
        return {
          subjectId,
          subject,
          plan,
          minutes,
        };
      })
      .sort((left, right) => right.minutes - left.minutes)
      .slice(0, 8);

    return {
      totalMinutes,
      topSubject,
      topPlan,
      dayBuckets,
      topActivities,
    };
  }, [data.sessions, data.subjects, plansById, recentDays, subjectsById]);

  const maxDayMinutes = Math.max(...dayBuckets.map((day) => day.totalMinutes), 1);

  return (
    <section className={cn('bg-card border border-border/50 text-card-foreground rounded-[2rem] p-5 shadow-sm', className)}>
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-4 xl:flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <BarChart3 className="h-3.5 w-3.5 text-primary" />
                Desempenho do periodo
              </div>
              <h3 className="mt-3 text-xl font-display font-black tracking-tight text-foreground">Tempo por materia</h3>
              <p className="mt-1 text-sm text-muted-foreground">Veja rapidamente onde o estudo esta concentrando tempo nos ultimos 14 dias.</p>
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => navigate('/stats')} title="Abrir estatisticas">
              <ArrowUpRight className="h-4 w-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Total estudado</p>
              <p className="mt-2 text-2xl font-display font-black text-foreground">{formatMinutesCompact(totalMinutes)}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Materia principal</p>
              <p className="mt-2 truncate text-2xl font-display font-black text-foreground">{topSubject?.name || 'Sem dados'}</p>
            </div>
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Plano principal</p>
              <p className="mt-2 truncate text-2xl font-display font-black text-foreground">{topPlan?.name || 'Sem plano'}</p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-border/60 bg-background/70 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <CalendarRange className="h-3.5 w-3.5 text-primary" />
                Ultimos 14 dias
              </div>
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">
                <span className="h-2 w-2 rounded-full bg-primary" />
                Sessoes contabilizadas
              </div>
            </div>

            <div className="mt-5 grid min-h-[14rem] grid-flow-col auto-cols-[minmax(2.25rem,1fr)] items-end gap-2 overflow-x-auto pb-1">
              {dayBuckets.map((day) => (
                <div key={day.date} className="flex min-w-[2.25rem] flex-col items-center gap-2">
                  <div className="flex h-44 w-full flex-col-reverse justify-start overflow-hidden rounded-2xl border border-border/40 bg-muted/20">
                    {day.segments.length > 0 ? (
                      day.segments.map((segment) => {
                        const subject = subjectsById.get(segment.subjectId);
                        const segmentHeight = Math.max(Math.round((segment.minutes / maxDayMinutes) * 100), 8);
                        return (
                          <div
                            key={`${day.date}-${segment.subjectId}`}
                            className="w-full"
                            style={{
                              height: `${segmentHeight}%`,
                              backgroundColor: subject?.color || '#5B8C7E',
                            }}
                            title={`${subject?.name || 'Materia'} • ${formatMinutesCompact(segment.minutes)}`}
                          />
                        );
                      })
                    ) : (
                      <div className="flex h-full items-center justify-center text-[10px] text-muted-foreground/50">0m</div>
                    )}
                  </div>
                  <div className="text-center text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    <p>{formatShortDate(day.date)}</p>
                    <p>{formatMinutesCompact(day.totalMinutes)}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="xl:w-[22rem] xl:shrink-0">
          <div className="rounded-[1.75rem] border border-border/60 bg-background/70 p-4 shadow-sm h-full">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Mais estudadas</p>
                <h4 className="mt-1 text-lg font-display font-black text-foreground">Top materias</h4>
              </div>
              <div className="rounded-full border border-border/60 bg-muted/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                Top {Math.min(10, topActivities.length)}
              </div>
            </div>

            <div className="mt-4 space-y-2">
              {topActivities.length > 0 ? (
                topActivities.map((item, index) => (
                  <div key={item.subjectId} className="flex items-center justify-between gap-3 rounded-2xl border border-border/60 bg-card/70 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.subject?.color || '#5B8C7E' }} />
                        <p className="truncate text-sm font-semibold text-foreground">{item.subject?.name || 'Materia'}</p>
                      </div>
                      <p className="mt-1 truncate text-[11px] text-muted-foreground">
                        {item.plan?.name || item.subject?.category || 'Sem plano vinculado'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-foreground">{formatMinutesCompact(item.minutes)}</p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">#{index + 1}</p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-border/60 bg-muted/20 px-3 py-8 text-center text-sm text-muted-foreground">
                  Sem sessoes recentes para analisar.
                </div>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <Button className="flex-1 rounded-full" onClick={() => navigate('/schedule')}>
                <LayoutList className="mr-2 h-4 w-4" />
                Ver cronograma
              </Button>
              <Button variant="outline" className="rounded-full" onClick={() => navigate('/stats')}>
                <TrendingUp className="mr-2 h-4 w-4" />
                Estatisticas
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

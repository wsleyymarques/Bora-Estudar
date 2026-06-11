import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useStudy } from '@/contexts/StudyContext';
import { useStudyPlans } from '@/hooks/useStudyPlans';
import { toDateKey } from '@/lib/date-utils';
import { cn } from '@/lib/utils';

import { BookOpen, Calendar, CheckCircle2, Flame, Home, LayoutDashboard, Layers, Play, Target, Timer, TrendingUp, User, BarChart3, Trophy, Brain, Lightbulb } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

import { QuickMetricsCard } from '@/components/dashboard/QuickMetricsCard';
import { QuickPlanTimerCard } from '@/components/dashboard/QuickPlanTimerCard';
import { DailySubjectsCard } from '@/components/dashboard/DailySubjectsCard';
import { DashboardPlansCard } from '@/components/dashboard/DashboardPlansCard';
import { DashboardInsightsCard } from '@/components/dashboard/DashboardInsightsCard';
import { StreakHeaderCard } from '@/components/dashboard/StreakHeaderCard';
import { CircularTimer, CircularProgress } from '@/components/dashboard/CircularProgress';

function HomeContent() {
  const { user } = useAuth();
  const { data, loading, getTotalMinutesForDate } = useStudy();
  const { plans: storedPlans } = useStudyPlans();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const plans = data?.studyPlans || storedPlans || [];
  const activePlans = plans.filter((p: any) => p.status === 'active');
  const subjects = data?.subjects || [];
  const sessions = data?.sessions || [];

  const todayStr = toDateKey(new Date());
  const dailyGoalMinutes = data?.profile?.daily_goal_minutes ?? 60;
  const todayMinutes = getTotalMinutesForDate(todayStr);
  const dailyPercent = Math.min(Math.round((todayMinutes / Math.max(dailyGoalMinutes, 1)) * 100), 100) || 0;

  const streak = data?.profile?.streak_current ?? 0;

  return (
    <div className="flex h-full w-full flex-col overflow-hidden animate-in fade-in duration-500">
      <main className="flex-1 overflow-y-auto p-2 md:p-4">
        <div className="mx-auto w-full max-w-6xl space-y-6">
          {/* Welcome / Hero Section */}
          <section className="rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-secondary/10 border border-primary/20 p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h2 className="text-lg md:text-xl font-bold text-foreground">
                  Olá, {user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Estudante'}! 👋
                </h2>
                <p className="text-muted-foreground text-sm mt-1">
                  {activePlans.length > 0
                    ? `Você tem ${activePlans.length} plano${activePlans.length > 1 ? 's' : ''} ativo${activePlans.length > 1 ? 's' : ''} e ${subjects.length} matéria${subjects.length !== 1 ? 's' : ''} cadastrada${subjects.length !== 1 ? 's' : ''}.`
                    : 'Comece criando seu primeiro plano de estudos ou cronograma.'}
                </p>
              </div>
              <div className="flex gap-2 md:ml-4">
                <Button asChild size="default">
                  <a href="/plans/new">
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Plano
                  </a>
                </Button>
                <Button variant="outline" asChild size="default">
                  <a href="/schedules">
                    <Calendar className="h-4 w-4 mr-2" />
                    Cronograma
                  </a>
                </Button>
              </div>
            </div>
          </section>

          {/* Desktop Grid Layout */}
          <div className="hidden lg:grid lg:grid-cols-[1fr_380px] gap-6">
            {/* Left Column - Main Content */}
            <div className="space-y-6">
              {/* Meta Diária + Conectar matéria do plano */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
                {/* Meta Diária - Large Circular Timer */}
                <Card className="relative overflow-hidden rounded-[1.5rem] border border-border/50 bg-card p-4 text-card-foreground shadow-sm">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.26em] text-primary">
                        <Timer className="h-3.5 w-3.5" />
                        Meta Diária
                      </div>
                      <h3 className="text-base font-black tracking-tight text-foreground">
                        Seu objetivo de hoje
                      </h3>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full border-border/60 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                      onClick={() => navigate('/timer')}
                      title="Abrir timer"
                    >
                      <TrendingUp className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <div className="flex flex-col items-center justify-center py-4">
                    <CircularTimer
                      minutes={todayMinutes}
                      totalMinutes={dailyGoalMinutes}
                      size={180}
                      label="Foco Total"
                      subLabel={`${todayMinutes} / ${dailyGoalMinutes} min • ${dailyPercent}%`}
                      progressColor="hsl(var(--primary))"
                    />
                  </div>

                  <div className="mt-4 pt-4 border-t border-border/40">
                    <div className="flex items-center justify-between text-xs font-bold text-muted-foreground mb-2">
                      <span>{todayMinutes} / {dailyGoalMinutes} min</span>
                      <span>{dailyPercent}%</span>
                    </div>
                    <Progress value={dailyPercent} className="h-2 rounded-full" />
                  </div>
                </Card>

                {/* Conectar matéria do plano */}
                <Card className="rounded-[1.5rem] border border-border/50 bg-card p-4 text-card-foreground shadow-sm h-full">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.26em] text-primary">
                        <BookOpen className="h-3.5 w-3.5" />
                        Plano Ativo
                      </div>
                      <h3 className="text-base font-black tracking-tight text-foreground">
                        Conectar matéria do plano
                      </h3>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full border-border/60 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-primary"
                      onClick={() => navigate('/plans')}
                      title="Ver planos"
                    >
                      <Layers className="h-3.5 w-3.5" />
                    </Button>
                  </div>

                  <QuickPlanTimerCard plans={activePlans} className="h-full" />
                </Card>
              </div>

              {/* Progress Bar + Cronograma do Dia */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-4">
                {/* Progress / Small metrics */}
                <Card className="rounded-[1.5rem] border border-border/50 bg-card p-4 text-card-foreground shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <div className="space-y-1">
                      <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                        <TrendingUp className="h-3.5 w-3.5 text-primary" />
                        Progresso da semana
                      </div>
                      <h3 className="text-base font-black tracking-tight text-foreground">
                        1 / 2 min
                      </h3>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {[1, 2].map((day) => (
                      <div key={day} className="flex items-center gap-3">
                        <div className="w-10 text-center text-sm font-medium text-muted-foreground">Dia {day}</div>
                        <Progress value={day === 1 ? 50 : 0} className="flex-1 h-2 rounded-full" />
                        <div className="w-16 text-right text-sm text-muted-foreground">
                          {day === 1 ? '50%' : '0%'}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>

                {/* Cronograma do Dia */}
                <Card className="rounded-[1.5rem] border border-border/50 bg-card p-4 text-card-foreground shadow-sm h-full">
                  <DailySubjectsCard />
                </Card>
              </div>

              {/* Pontos / Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="rounded-[1.5rem] border border-border/50 bg-card p-4 text-card-foreground shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <Target className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-muted-foreground">Pontos Hoje</p>
                      <p className="text-2xl font-bold text-foreground">{todayMinutes * 2}</p>
                    </div>
                  </div>
                </Card>
                <Card className="rounded-[1.5rem] border border-border/50 bg-card p-4 text-card-foreground shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                      <Flame className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-muted-foreground">Streak Atual</p>
                      <p className="text-2xl font-bold text-foreground">{streak} dias</p>
                    </div>
                  </div>
                </Card>
                <Card className="rounded-[1.5rem] border border-border/50 bg-card p-4 text-card-foreground shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warning/10 text-warning">
                      <TrendingUp className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.26em] text-muted-foreground">Total Sessões</p>
                      <p className="text-2xl font-bold text-foreground">{sessions.length}</p>
                    </div>
                  </div>
                </Card>
              </div>
            </div>

            {/* Right Column - Stats & Insights */}
            <div className="space-y-6 hidden lg:block">
              {/* Streak Header Card */}
              <StreakHeaderCard compact />

              {/* Dashboard Insights Card */}
              <DashboardInsightsCard />

              {/* Meus Planos */}
              <DashboardPlansCard plans={activePlans} />
            </div>
          </div>

          {/* Mobile Layout - Stacked */}
          <div className="lg:hidden space-y-6">
            {/* Streak / Consistência */}
            <StreakHeaderCard compact />

            {/* Meta Diária - Circular Timer */}
            <Card className="relative overflow-hidden rounded-[1.5rem] border border-border/50 bg-card p-4 text-card-foreground shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-[0.26em] text-primary">
                    <Timer className="h-3.5 w-3.5" />
                    Meta Diária
                  </div>
                  <h3 className="text-base font-black tracking-tight text-foreground mt-1">
                    Seu objetivo de hoje
                  </h3>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center py-6">
                <CircularTimer
                  minutes={todayMinutes}
                  totalMinutes={dailyGoalMinutes}
                  size={200}
                  label="Foco Total"
                  subLabel={`${todayMinutes} / ${dailyGoalMinutes} min • ${dailyPercent}%`}
                  progressColor="hsl(var(--primary))"
                />
              </div>

              <div className="mt-4 pt-4 border-t border-border/40">
                <div className="flex items-center justify-between text-xs font-bold text-muted-foreground mb-2">
                  <span>{todayMinutes} / {dailyGoalMinutes} min</span>
                  <span>{dailyPercent}%</span>
                </div>
                <Progress value={dailyPercent} className="h-2 rounded-full" />
              </div>
            </Card>

            {/* Conectar matéria do plano / Quick Plan Timer */}
            <QuickPlanTimerCard plans={activePlans} />

            {/* Cronograma do Dia */}
            <DailySubjectsCard />

            {/* Meus Planos */}
            <DashboardPlansCard plans={activePlans} />

            {/* Dashboard Insights */}
            <DashboardInsightsCard />
          </div>
        </div>
      </main>

      <footer className="shrink-0 px-4 pb-2 pt-1 text-center">
        <p className="text-[10px] text-muted-foreground">
          Bora Estudar - Organize seus estudos de forma simples e eficiente
        </p>
      </footer>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="flex h-full w-full flex-col">
      <HomeContent />
    </div>
  );
}
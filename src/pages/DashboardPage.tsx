import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search, 
  ArrowUpRight, 
  Calendar,
  Sparkles,
  Play,
  Pause,
  Square,
  ChevronRight,
  TrendingUp,
  Inbox,
  User,
  MoreHorizontal
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStudy } from '@/contexts/StudyContext';
import { useStudyPlans } from '@/hooks/useStudyPlans';
import { toDateKey } from '@/lib/date-utils';
import { formatMinutesCompact } from '@/lib/duration-utils';
import { getSessionActualMinutes } from '@/features/tracker/session-metrics';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { data, getSubject, getScheduleForDate, getTotalMinutesForDate } = useStudy();
  const { plans } = useStudyPlans();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Search input state (Donezo style search in header)
  const [searchQuery, setSearchQuery] = useState('');

  // Interactive local timer state
  const [timerSeconds, setTimerSeconds] = useState(5048); // 01:24:08
  const [timerRunning, setTimerRunning] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const formatTimer = (totalSeconds: number) => {
    const hrs = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
    const mins = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (totalSeconds % 60).toString().padStart(2, '0');
    return `${hrs}:${mins}:${secs}`;
  };

  const today = toDateKey(new Date());
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - index));
    return toDateKey(d);
  }), []);

  const weekMinutes = weekDates.reduce((acc, date) => acc + getTotalMinutesForDate(date), 0);
  const todaySchedule = getScheduleForDate(today);
  
  const completedToday = useMemo(() => {
    return todaySchedule.filter((entry) => entry.completed).length;
  }, [todaySchedule]);

  const totalToday = todaySchedule.length;
  const progressPercent = useMemo(() => {
    if (totalToday === 0) return 60; // Default mockup percent if empty
    return Math.round((completedToday / totalToday) * 100);
  }, [completedToday, totalToday]);

  // Activity Data for Custom Capsules Bar Chart
  const activityData = useMemo(() => {
    const raw = weekDates.map((dateStr) => {
      const dateObj = new Date(`${dateStr}T12:00:00`);
      return {
        dayName: dateObj.toLocaleDateString('pt-BR', { weekday: 'narrow' }), // S, M, T...
        minutes: getTotalMinutesForDate(dateStr),
      };
    });
    
    const maxMinutes = Math.max(...raw.map(d => d.minutes), 1);
    return raw.map(d => ({
      ...d,
      percent: Math.max(Math.round((d.minutes / maxMinutes) * 100), 0),
    }));
  }, [weekDates, data]);

  const activePlans = plans.filter(p => p.status === 'active').slice(0, 4);
  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Estudante';
  const displayEmail = user?.email || 'estudante@studyflow.com';

  const pendingToday = todaySchedule.filter((entry) => !entry.completed).slice(0, 5);

  return (
    <div className="space-y-8 w-full max-w-full mx-auto pb-12 animate-in fade-in duration-500 bg-background text-foreground p-1 md:p-6 rounded-[2.5rem] min-h-screen">


      {/* BENTO GRID: ROW 1 - 4 COMPACT METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* CARD 1 (SOLID PRIMARY BG) */}
        <div className="bg-primary text-primary-foreground rounded-3xl p-6 shadow-xl shadow-primary/10 relative overflow-hidden flex flex-col justify-between h-44 group">
          <div className="flex items-start justify-between relative z-10">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/80">Total Estudado</span>
            <button className="w-8 h-8 rounded-full bg-primary-foreground/10 flex items-center justify-center text-primary-foreground hover:bg-primary-foreground/20 transition-colors">
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="relative z-10 space-y-2">
            <h2 className="text-4xl font-display font-black tracking-tight">{formatMinutesCompact(weekMinutes)}</h2>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-primary-foreground/10 text-primary-foreground text-[9px] font-black uppercase tracking-wider">
              <TrendingUp className="w-3 h-3" /> +5% esta semana
            </div>
          </div>
          {/* subtle decorative wave */}
          <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* CARD 2 */}
        <div className="bg-card border border-border/50 text-card-foreground rounded-3xl p-6 shadow-sm flex flex-col justify-between h-44 group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Planos Ativos</span>
            <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors border border-border/50">
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-display font-black tracking-tight text-foreground">
              {plans.filter(p => p.status === 'active').length}
            </h2>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-muted text-muted-foreground text-[9px] font-black uppercase tracking-wider border border-border/50">
              Foco Atual
            </div>
          </div>
        </div>

        {/* CARD 3 */}
        <div className="bg-card border border-border/50 text-card-foreground rounded-3xl p-6 shadow-sm flex flex-col justify-between h-44 group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Pendentes Hoje</span>
            <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors border border-border/50">
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-display font-black tracking-tight text-foreground">
              {pendingToday.length}
            </h2>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-muted text-muted-foreground text-[9px] font-black uppercase tracking-wider border border-border/50">
              Sessões agendadas
            </div>
          </div>
        </div>

        {/* CARD 4 */}
        <div className="bg-card border border-border/50 text-card-foreground rounded-3xl p-6 shadow-sm flex flex-col justify-between h-44 group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Concluído Hoje</span>
            <button className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-foreground hover:bg-muted/80 transition-colors border border-border/50">
              <ArrowUpRight className="w-4 h-4" />
            </button>
          </div>
          <div className="space-y-2">
            <h2 className="text-4xl font-display font-black tracking-tight text-foreground">
              {completedToday}
            </h2>
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-success/10 text-success-foreground text-[9px] font-black uppercase tracking-wider">
              {totalToday > 0 ? `${Math.round((completedToday / totalToday) * 100)}% da meta` : 'Sem tarefas'}
            </div>
          </div>
        </div>
      </div>

      {/* BENTO GRID: ROW 2 - ANALYTICS, REMINDERS, PROJECTS LIST */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1. PROJECT ANALYTICS BAR CHART */}
        <div className="lg:col-span-5 bg-card border border-border/50 text-card-foreground rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-black text-lg text-foreground tracking-tight">Análise de Estudo</h3>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Progresso nos últimos 7 dias</p>
            </div>
            <button className="text-muted-foreground hover:text-foreground">
              <MoreHorizontal className="w-5 h-5" />
            </button>
          </div>

          {/* Custom Capsule Bars Chart matching the exact visual style */}
          <div className="flex items-end justify-between h-48 px-2 relative">
            {activityData.map((d, i) => {
              const isActive = d.minutes > 0;
              // Show speech bubble tooltip over the current day or max day
              const isHighlight = i === 6 || (d.minutes > 0 && d.percent === 100);

              return (
                <div key={i} className="flex flex-col items-center gap-3 flex-1 group/bar relative">
                  {/* Floating percent pill on highlight */}
                  {isHighlight && (
                    <div className="absolute -top-8 px-2 py-0.5 bg-success/10 text-success-foreground text-[9px] font-black rounded-lg border border-success/20 shadow-sm animate-bounce">
                      {d.minutes}m
                    </div>
                  )}

                  <div className="w-8 h-36 bg-muted/30 rounded-full flex flex-col justify-end overflow-hidden border border-border/30 relative group-hover/bar:bg-muted/50 transition-colors">
                    {isActive ? (
                      <div 
                        className="w-full rounded-full transition-all duration-1000 bg-gradient-to-t from-primary to-primary/60"
                        style={{ height: `${Math.max(d.percent, 10)}%` }}
                      />
                    ) : (
                      <div className="w-full h-full bg-striped opacity-50" />
                    )}
                  </div>
                  <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{d.dayName}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. REMINDERS */}
        <div className="lg:col-span-3 bg-card border border-border/50 text-card-foreground rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
          <div>
            <h3 className="font-display font-black text-lg text-foreground tracking-tight mb-1">Lembretes</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Próxima Atividade</p>
          </div>

          <div className="bg-muted/30 rounded-2xl p-4 border border-border/30 my-4 space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span className="text-[9px] font-black text-primary uppercase tracking-wider">Sessão Agendada</span>
            </div>
            
            {pendingToday.length > 0 ? (
              <div>
                <h4 className="text-sm font-black text-foreground tracking-tight leading-tight">
                  {getSubject(pendingToday[0].subjectId)?.name || 'Estudo Focado'}
                </h4>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
                  Time: {pendingToday[0].startTime || 'Flexível'} ({pendingToday[0].plannedMinutes} min)
                </p>
              </div>
            ) : (
              <div>
                <h4 className="text-sm font-black text-foreground tracking-tight leading-tight">
                  Nenhuma pendência hoje!
                </h4>
                <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-1">
                  Tudo completo por hoje.
                </p>
              </div>
            )}
          </div>

          <button 
            onClick={() => navigate('/schedule')}
            className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 shadow-md shadow-primary/10"
          >
            <Play className="w-3.5 h-3.5 fill-primary-foreground text-primary-foreground" /> Iniciar Estudo
          </button>
        </div>

        {/* 3. ACTIVE PROJECTS LIST */}
        <div className="lg:col-span-4 bg-card border border-border/50 text-card-foreground rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-black text-lg text-foreground tracking-tight">Planos</h3>
            <button 
              onClick={() => navigate('/plans/new')}
              className="px-3 py-1 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary text-[10px] font-black uppercase tracking-wider transition-colors"
            >
              + Novo
            </button>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[200px] pr-1 custom-scrollbar">
            {activePlans.length > 0 ? (
              activePlans.map((plan, idx) => {
                // Donezo colorful icon colors
                const colors = [
                  'bg-blue-100 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400',
                  'bg-teal-100 dark:bg-teal-950/40 text-teal-600 dark:text-teal-400',
                  'bg-amber-100 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400',
                  'bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400'
                ];
                const colorClass = colors[idx % colors.length];

                return (
                  <div 
                    key={plan.id}
                    onClick={() => navigate(`/plans/${plan.id}`)}
                    className="flex items-center gap-3 p-2 rounded-2xl hover:bg-muted/50 cursor-pointer transition-colors border border-transparent hover:border-border/30"
                  >
                    <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center font-bold shrink-0", colorClass)}>
                      {plan.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-black text-foreground truncate tracking-tight">{plan.name}</h4>
                      <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">
                        Prazo: {plan.exam_name || 'Geral'}
                      </p>
                    </div>
                    <ChevronRight className="w-4 h-4 text-muted-foreground/50" />
                  </div>
                );
              })
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center py-8 opacity-40">
                <Inbox className="w-8 h-8 text-muted-foreground mb-2" />
                <p className="text-[10px] font-black uppercase tracking-widest">Nenhum plano ativo</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* BENTO GRID: ROW 3 - TEAM COLLABORATION, PROGRESS GAUGE, TIME TRACKER */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1. TEAM COLLABORATION (STUDY PROGRESS / SUBJECTS) */}
        <div className="lg:col-span-5 bg-card border border-border/50 text-card-foreground rounded-[2rem] p-6 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-display font-black text-lg text-foreground tracking-tight">Estudo por Matéria</h3>
              <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest mt-0.5">Matérias catalogadas</p>
            </div>
            <button 
              onClick={() => navigate('/schedule')}
              className="text-[10px] font-black uppercase tracking-widest text-primary hover:underline"
            >
              Ver Todas
            </button>
          </div>

          <div className="space-y-4 flex-1">
            {data.subjects.slice(0, 4).map((subject, idx) => {
              // Map states to Donezo pill styles: Completed, In Progress, Pending
              const states = [
                { label: 'Completed', class: 'bg-success/15 text-success-foreground' },
                { label: 'In Progress', class: 'bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400' },
                { label: 'Pending', class: 'bg-muted text-muted-foreground' }
              ];
              const state = states[idx % states.length];

              return (
                <div key={subject.id} className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg shadow-sm border border-border shrink-0" style={{ backgroundColor: `${subject.color}15` }}>
                      {subject.icon || '📚'}
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-foreground tracking-tight">{subject.name}</h4>
                      <p className="text-[9px] text-muted-foreground font-semibold tracking-wide uppercase mt-0.5">Focus Flow</p>
                    </div>
                  </div>
                  <span className={cn("px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider", state.class)}>
                    {state.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. PROJECT PROGRESS (SEMI-CIRCLE GAUGE) */}
        <div className="lg:col-span-3 bg-card border border-border/50 text-card-foreground rounded-[2rem] p-6 shadow-sm flex flex-col justify-between items-center text-center">
          <div className="w-full text-left mb-2">
            <h3 className="font-display font-black text-lg text-foreground tracking-tight">Progresso Geral</h3>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Cronograma de Hoje</p>
          </div>

          {/* Gorgeous exact Semi-circle gauge */}
          <div className="relative w-44 h-24 flex items-end justify-center overflow-hidden mt-4">
            <svg className="w-40 h-40 transform translate-y-8" viewBox="0 0 100 100">
              {/* Back track */}
              <path 
                d="M 10 50 A 40 40 0 0 1 90 50" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="10" 
                strokeLinecap="round" 
                className="text-muted"
              />
              {/* Colored active fill */}
              <path 
                d="M 10 50 A 40 40 0 0 1 90 50" 
                fill="none" 
                stroke="currentColor" 
                strokeWidth="10" 
                strokeLinecap="round" 
                strokeDasharray={`${progressPercent * 1.25} 125`}
                className="text-primary transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
              <span className="text-3xl font-display font-black text-foreground tracking-tight leading-none">{progressPercent}%</span>
              <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest mt-1">Concluído</span>
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 mt-6 w-full text-[9px] font-black uppercase tracking-wider text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <span className="text-muted-foreground">Completo</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-accent" />
              <span className="text-muted-foreground">Estudando</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-muted" />
              <span className="text-muted-foreground">Pendente</span>
            </div>
          </div>
        </div>

        {/* 3. DYNAMIC TIME TRACKER CARD (SOLID BG WITH WAVY PATTERNS) */}
        <div className="lg:col-span-4 bg-primary text-primary-foreground rounded-[2rem] p-6 shadow-xl relative overflow-hidden flex flex-col justify-between h-64 group">
          {/* Waves background overlay */}
          <div className="absolute inset-0 opacity-10 mix-blend-overlay pointer-events-none">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" preserveAspectRatio="none">
              <path d="M 0 300 Q 200 150 400 300 T 800 300 L 800 600 L 0 600 Z" fill="#ffffff" />
            </svg>
          </div>
          
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/80">Cronômetro de Foco</span>
            <span className="w-2.5 h-2.5 rounded-full bg-primary-foreground animate-ping" />
          </div>

          <div className="relative z-10 flex flex-col items-center my-2">
            <h2 className="text-4xl font-display font-black tracking-widest font-mono text-primary-foreground">
              {formatTimer(timerSeconds)}
            </h2>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-primary-foreground/80 mt-1.5">Tempo da Sessão</p>
          </div>

          {/* Interactive Control Buttons */}
          <div className="relative z-10 flex items-center justify-center gap-4">
            <button 
              onClick={() => setTimerRunning(!timerRunning)}
              className="w-12 h-12 rounded-full bg-primary-foreground hover:bg-primary-foreground/90 flex items-center justify-center text-primary transition-all hover:scale-105 active:scale-95 shadow-md"
            >
              {timerRunning ? <Pause className="w-5 h-5 fill-primary text-primary" /> : <Play className="w-5 h-5 fill-primary text-primary ml-0.5" />}
            </button>
            <button 
              onClick={() => {
                setTimerRunning(false);
                setTimerSeconds(0);
              }}
              className="w-12 h-12 rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/20 flex items-center justify-center text-primary-foreground border border-primary-foreground/20 transition-all hover:scale-105 active:scale-95"
            >
              <Square className="w-4 h-4 fill-primary-foreground text-primary-foreground" />
            </button>
          </div>
        </div>
      </div>

      {/* STYLES FOR THE INACTIVE CHART STRIPES AND SCROLLBAR */}
      <style dangerouslySetInnerHTML={{ __html: `
        .bg-striped {
          background-image: repeating-linear-gradient(
            45deg, 
            transparent, 
            transparent 6px, 
            hsl(var(--border)) 6px, 
            hsl(var(--border)) 12px
          );
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 10px;
        }
      `}} />
    </div>
  );
}

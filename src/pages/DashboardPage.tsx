import React, { useMemo, useState } from 'react';
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
import { QuickPlanTimerCard } from '@/components/dashboard/QuickPlanTimerCard';

export default function DashboardPage() {
  const { data, getSubject, getScheduleForDate, getTotalMinutesForDate } = useStudy();
  const { plans } = useStudyPlans();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Search input state (Donezo style search in header)
  const [searchQuery, setSearchQuery] = useState('');

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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <QuickPlanTimerCard plans={plans} className="lg:col-span-12" />
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

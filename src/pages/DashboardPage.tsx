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
    <div className="space-y-5 sm:space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Olá, {displayName} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard icon={<Clock className="w-5 h-5" />} label="Hoje" value={formatMin(todayMinutes)} color="primary" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Semana" value={formatMin(weekMinutes)} color="info" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Concluídas hoje" value={`${completedToday}/${todaySchedule.length}`} color="success" />
        <StatCard icon={<BookOpen className="w-5 h-5" />} label="Mais estudada" value={topSubject?.name || '—'} color="accent" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <div className="glass-card p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Tempo por dia da semana</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekChartData}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(v: number) => formatMin(v)} />
              <Bar dataKey="minutos" fill="hsl(158, 28%, 42%)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Distribuição por matéria</h3>
          {pieData.length > 0 ? (
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3}>
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 flex-1 min-w-0">
                {pieData.map(p => (
                  <div key={p.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: p.color }} />
                    <span className="truncate text-foreground">{p.name}</span>
                    <span className="text-muted-foreground ml-auto">{formatMin(p.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">Pendentes hoje</h3>
            <button onClick={() => navigate('/schedule')} className="text-xs text-primary hover:underline">Ver cronograma</button>
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

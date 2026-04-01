import React, { useMemo } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { Clock, BookOpen, CheckCircle2, TrendingUp, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

function formatMin(m: number) {
  const h = Math.floor(m / 60);
  const min = m % 60;
  return h > 0 ? `${h}h ${min}m` : `${min}m`;
}

export default function DashboardPage() {
  const { data, getSubject, getScheduleForDate, getTotalMinutesForDate } = useStudy();
  const { user } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toISOString().split('T')[0];
  const dayOfWeek = new Date().getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

  const weekDates = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + mondayOffset + i);
      return d.toISOString().split('T')[0];
    });
  }, [mondayOffset]);

  const todayMinutes = getTotalMinutesForDate(today);
  const weekMinutes = weekDates.reduce((acc, d) => acc + getTotalMinutesForDate(d), 0);
  const todaySchedule = getScheduleForDate(today);
  const completedToday = todaySchedule.filter(s => s.completed).length;
  const pendingToday = todaySchedule.filter(s => !s.completed && !s.optional);

  const subjectMinutes = useMemo(() => {
    const map: Record<string, number> = {};
    data.sessions.forEach(s => {
      map[s.subjectId] = (map[s.subjectId] || 0) + s.durationMinutes;
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [data.sessions]);
  const topSubject = subjectMinutes[0] ? getSubject(subjectMinutes[0][0]) : null;

  const weekChartData = weekDates.map(d => ({
    day: new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short' }),
    minutos: getTotalMinutesForDate(d),
  }));

  const pieData = subjectMinutes.slice(0, 6).map(([id, min]) => {
    const s = getSubject(id);
    return { name: s?.name || 'Outro', value: min, color: s?.color || '#ccc' };
  });

  const recentNotes = data.notes.slice(0, 3);
  const displayName = user?.email?.split('@')[0] || 'Estudante';

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">
          Olá, {displayName} 👋
        </h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<Clock className="w-5 h-5" />} label="Hoje" value={formatMin(todayMinutes)} color="primary" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Semana" value={formatMin(weekMinutes)} color="info" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Concluídas hoje" value={`${completedToday}/${todaySchedule.length}`} color="success" />
        <StatCard icon={<BookOpen className="w-5 h-5" />} label="Mais estudada" value={topSubject?.name || '—'} color="accent" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
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
            <div className="flex items-center gap-4">
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
          ) : (
            <p className="text-muted-foreground text-sm">Nenhuma sessão registrada ainda.</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">Pendentes hoje</h3>
            <button onClick={() => navigate('/schedule')} className="text-xs text-primary hover:underline">Ver cronograma</button>
          </div>
          {pendingToday.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma pendência! 🎉</p>
          ) : (
            <div className="space-y-2">
              {pendingToday.map(entry => {
                const subj = getSubject(entry.subjectId);
                return (
                  <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg bg-background">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: subj?.color }} />
                    <span className="text-sm text-foreground">{subj?.name}</span>
                    {entry.optional && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">opcional</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">Observações recentes</h3>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </div>
          {recentNotes.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma observação ainda.</p>
          ) : (
            <div className="space-y-2">
              {recentNotes.map(n => (
                <div key={n.id} className="p-2 rounded-lg bg-background text-sm text-foreground">
                  <p className="line-clamp-2">{n.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{n.referenceDate}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    info: 'bg-info/10 text-info',
    success: 'bg-success/10 text-success',
    accent: 'bg-accent/10 text-accent',
  };
  return (
    <div className="glass-card p-4 space-y-2">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>
        {icon}
      </div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-display font-bold text-foreground truncate">{value}</p>
    </div>
  );
}

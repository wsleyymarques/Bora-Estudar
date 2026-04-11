import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BookOpen, CheckCircle2, Clock, FileText, PauseCircle, TrendingUp } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStudy } from '@/contexts/StudyContext';
import { addDays, getMonday, toDateKey } from '@/lib/date-utils';
import { formatMinutesCompact } from '@/lib/duration-utils';
import { getSessionActualMinutes } from '@/features/tracker/session-metrics';

export default function DashboardPage() {
  const { data, getSubject, getScheduleForDate, getTotalMinutesForDate } = useStudy();
  const { user } = useAuth();
  const navigate = useNavigate();

  const today = toDateKey(new Date());
  const monday = getMonday(new Date());
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => toDateKey(addDays(monday, index))), [monday]);

  const todayMinutes = getTotalMinutesForDate(today);
  const todayPauseMinutes = getTotalPauseMinutesForDate(today);
  const weekMinutes = weekDates.reduce((acc, date) => acc + getTotalMinutesForDate(date), 0);
  const weekPauseMinutes = weekDates.reduce((acc, date) => acc + getTotalPauseMinutesForDate(date), 0);
  const todaySchedule = getScheduleForDate(today);
  const completedToday = todaySchedule.filter((entry) => entry.completed).length;
  const pendingToday = todaySchedule.filter((entry) => !entry.completed && !entry.optional);

  const subjectMinutes = useMemo(() => {
    const map: Record<string, number> = {};
    for (const session of data.sessions) {
      if (session.isFocusSession === false) continue;
      map[session.subjectId] = (map[session.subjectId] || 0) + getSessionActualMinutes(session);
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]);
  }, [data.sessions]);

  const topSubject = subjectMinutes[0] ? getSubject(subjectMinutes[0][0]) : null;

  const weekChartData = weekDates.map((date) => ({
    day: new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'short' }),
    minutos: getTotalMinutesForDate(date),
    pausas: getTotalPauseMinutesForDate(date),
  }));

  const pieData = subjectMinutes.slice(0, 6).map(([subjectId, minutes]) => {
    const subject = getSubject(subjectId);
    return {
      name: subject?.name || 'Outro',
      value: minutes,
      color: subject?.color || 'hsl(var(--muted-foreground))',
    };
  });

  const recentNotes = data.notes.slice(0, 3);
  const displayName = user?.email?.split('@')[0] || 'Estudante';

  return (
    <div className="space-y-6 w-full max-w-none">
      <div>
        <h1 className="text-2xl font-display font-bold text-foreground">Ola, {displayName}</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard icon={<Clock className="w-5 h-5" />} label="Hoje" value={formatMinutesCompact(todayMinutes)} color="primary" />
        <StatCard icon={<PauseCircle className="w-5 h-5" />} label="Pausa hoje" value={formatMinutesCompact(todayPauseMinutes)} color="warning" />
        <StatCard icon={<TrendingUp className="w-5 h-5" />} label="Semana" value={formatMinutesCompact(weekMinutes)} color="info" />
        <StatCard icon={<CheckCircle2 className="w-5 h-5" />} label="Concluidas hoje" value={`${completedToday}/${todaySchedule.length}`} color="success" />
        <StatCard icon={<BookOpen className="w-5 h-5" />} label="Mais estudada" value={topSubject?.name || '-'} color="accent" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Tempo por dia da semana</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={weekChartData}>
              <XAxis dataKey="day" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip formatter={(value: number) => formatMinutesCompact(value)} />
              <Bar dataKey="minutos" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-muted-foreground mt-2">Pausas na semana: {formatMinutesCompact(weekPauseMinutes)}</p>
        </div>

        <div className="glass-card p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Distribuicao por materia</h3>
          {pieData.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width={140} height={140}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={3}>
                    {pieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 flex-1 min-w-0">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center gap-2 text-xs">
                    <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                    <span className="truncate text-foreground">{item.name}</span>
                    <span className="text-muted-foreground ml-auto">{formatMinutesCompact(item.value)}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Nenhuma sessao registrada ainda.</p>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">Pendentes hoje</h3>
            <button onClick={() => navigate('/schedule')} className="text-xs text-primary hover:underline">
              Ver cronograma
            </button>
          </div>
          {pendingToday.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma pendencia para hoje.</p>
          ) : (
            <div className="space-y-2">
              {pendingToday.map((entry) => {
                const subject = getSubject(entry.subjectId);
                return (
                  <div key={entry.id} className="flex items-center gap-3 p-2 rounded-lg bg-background">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: subject?.color }} />
                    <span className="text-sm text-foreground">{subject?.name}</span>
                    {entry.optional && <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground">opcional</span>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-display font-semibold text-sm">Observacoes recentes</h3>
            <FileText className="w-4 h-4 text-muted-foreground" />
          </div>
          {recentNotes.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma observacao ainda.</p>
          ) : (
            <div className="space-y-2">
              {recentNotes.map((note) => (
                <div key={note.id} className="p-2 rounded-lg bg-background text-sm text-foreground">
                  <p className="line-clamp-2">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-1">{note.referenceDate}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: 'primary' | 'info' | 'success' | 'accent' | 'warning';
}) {
  const colorMap: Record<string, string> = {
    primary: 'bg-primary/10 text-primary',
    info: 'bg-info/10 text-info',
    success: 'bg-success/10 text-success',
    accent: 'bg-accent/10 text-accent',
    warning: 'bg-warning/10 text-warning',
  };

  return (
    <div className="glass-card p-4 space-y-2">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${colorMap[color]}`}>{icon}</div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-lg font-display font-bold text-foreground truncate">{value}</p>
    </div>
  );
}


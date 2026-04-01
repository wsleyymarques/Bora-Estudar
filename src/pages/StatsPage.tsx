import React, { useMemo } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';

function formatMin(m: number) { const h = Math.floor(m / 60); return h > 0 ? `${h}h ${m % 60}m` : `${m}m`; }
function fmt(d: Date) { return d.toISOString().split('T')[0]; }

export default function StatsPage() {
  const { data, getSubject, getTotalMinutesForDate } = useStudy();

  // Hours per subject
  const subjectHours = useMemo(() => {
    const map: Record<string, number> = {};
    data.sessions.forEach(s => { map[s.subjectId] = (map[s.subjectId] || 0) + s.durationMinutes; });
    return Object.entries(map)
      .map(([id, min]) => ({ name: getSubject(id)?.name || '?', minutes: min, color: getSubject(id)?.color || '#ccc' }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [data.sessions]);

  // Weekly trend (last 8 weeks)
  const weeklyTrend = useMemo(() => {
    const weeks: { label: string; minutes: number }[] = [];
    for (let w = 7; w >= 0; w--) {
      let total = 0;
      const monday = new Date();
      monday.setDate(monday.getDate() - monday.getDay() + 1 - w * 7);
      for (let d = 0; d < 7; d++) {
        const date = new Date(monday);
        date.setDate(date.getDate() + d);
        total += getTotalMinutesForDate(fmt(date));
      }
      weeks.push({ label: `S${8 - w}`, minutes: total });
    }
    return weeks;
  }, [data.sessions]);

  // Daily average
  const activeDays = new Set(data.sessions.map(s => s.date)).size;
  const totalMinutes = data.sessions.reduce((acc, s) => acc + s.durationMinutes, 0);
  const dailyAvg = activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0;

  // Schedule compliance
  const totalScheduled = data.schedule.length;
  const totalCompleted = data.schedule.filter(e => e.completed).length;
  const complianceRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

  // Consistency heatmap (last 90 days)
  const heatmap = useMemo(() => {
    const days: { date: string; minutes: number }[] = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const date = fmt(d);
      days.push({ date, minutes: getTotalMinutesForDate(date) });
    }
    return days;
  }, [data.sessions]);
  const maxHeatMin = Math.max(...heatmap.map(d => d.minutes), 1);

  return (
    <div className="space-y-6 max-w-5xl">
      <h1 className="text-2xl font-display font-bold text-foreground">Estatísticas</h1>

      {/* Top stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{formatMin(totalMinutes)}</p>
          <p className="text-xs text-muted-foreground">Total acumulado</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{formatMin(dailyAvg)}</p>
          <p className="text-xs text-muted-foreground">Média diária</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{data.sessions.length}</p>
          <p className="text-xs text-muted-foreground">Total sessões</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{complianceRate}%</p>
          <p className="text-xs text-muted-foreground">Cumprimento</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:gap-6">
        {/* Hours per subject */}
        <div className="glass-card p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Horas por matéria</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={subjectHours} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v: number) => formatMin(v)} />
              <Bar dataKey="minutes" radius={[0, 6, 6, 0]}>
                {subjectHours.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribution pie */}
        <div className="glass-card p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Distribuição</h3>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={subjectHours} dataKey="minutes" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                  {subjectHours.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 flex-1 min-w-0">
              {subjectHours.map(s => (
                <div key={s.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
                  <span className="truncate text-foreground">{s.name}</span>
                  <span className="text-muted-foreground ml-auto">{formatMin(s.minutes)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Weekly trend */}
      <div className="glass-card p-5">
        <h3 className="font-display font-semibold text-sm mb-4">Evolução semanal</h3>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={weeklyTrend}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(v: number) => formatMin(v)} />
            <Line type="monotone" dataKey="minutes" stroke="hsl(158, 28%, 42%)" strokeWidth={2} dot={{ fill: 'hsl(158, 28%, 42%)', r: 4 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Consistency heatmap */}
      <div className="glass-card p-5">
        <h3 className="font-display font-semibold text-sm mb-4">Consistência (últimos 90 dias)</h3>
        <div className="flex flex-wrap gap-[3px]">
          {heatmap.map(d => {
            const intensity = d.minutes > 0 ? Math.max(0.15, d.minutes / maxHeatMin) : 0;
            return (
              <div key={d.date} title={`${d.date}: ${formatMin(d.minutes)}`}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: intensity > 0 ? `hsla(158, 28%, 42%, ${intensity})` : 'hsl(var(--muted))' }} />
            );
          })}
        </div>
      </div>
    </div>
  );
}

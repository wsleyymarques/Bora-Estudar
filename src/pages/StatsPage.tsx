import React, { useMemo } from 'react';
import { Bar, BarChart, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useStudy } from '@/contexts/StudyContext';
import { addDays, getMonday, toDateKey } from '@/lib/date-utils';
import { formatMinutesCompact } from '@/lib/duration-utils';
import { getSessionActualMinutes, getSessionPauseSeconds } from '@/features/tracker/session-metrics';

export default function StatsPage() {
  const { data, getSubject, getTotalMinutesForDate, getTotalPauseMinutesForDate } = useStudy();

  const focusSessions = useMemo(
    () => data.sessions.filter((session) => session.isFocusSession !== false),
    [data.sessions],
  );

  const subjectHours = useMemo(() => {
    const map: Record<string, number> = {};
    for (const session of focusSessions) {
      map[session.subjectId] = (map[session.subjectId] || 0) + getSessionActualMinutes(session);
    }

    return Object.entries(map)
      .map(([subjectId, minutes]) => ({
        name: getSubject(subjectId)?.name || '?',
        minutes,
        color: getSubject(subjectId)?.color || 'hsl(var(--muted-foreground))',
      }))
      .sort((a, b) => b.minutes - a.minutes);
  }, [focusSessions, getSubject]);

  const weeklyTrend = useMemo(() => {
    const currentMonday = getMonday(new Date());
    const weeks: { label: string; minutes: number; pauses: number }[] = [];

    for (let weekOffset = 7; weekOffset >= 0; weekOffset--) {
      const weekStart = addDays(currentMonday, -weekOffset * 7);
      let totalMinutes = 0;
      let totalPauseMinutes = 0;

      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const date = toDateKey(addDays(weekStart, dayIndex));
        totalMinutes += getTotalMinutesForDate(date);
        totalPauseMinutes += getTotalPauseMinutesForDate(date);
      }

      weeks.push({
        label: `S${8 - weekOffset}`,
        minutes: totalMinutes,
        pauses: totalPauseMinutes,
      });
    }

    return weeks;
  }, [getTotalMinutesForDate, getTotalPauseMinutesForDate]);

  const activeDays = new Set(focusSessions.map((session) => session.date)).size;
  const totalMinutes = focusSessions.reduce((acc, session) => acc + getSessionActualMinutes(session), 0);
  const totalPauseMinutes = Math.round(
    focusSessions.reduce((acc, session) => acc + getSessionPauseSeconds(session, data.sessionPauses), 0) / 60,
  );
  const dailyAvg = activeDays > 0 ? Math.round(totalMinutes / activeDays) : 0;

  const totalScheduled = data.schedule.length;
  const totalCompleted = data.schedule.filter((entry) => entry.completed).length;
  const complianceRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0;

  const heatmap = useMemo(() => {
    const days: { date: string; minutes: number }[] = [];
    for (let i = 89; i >= 0; i--) {
      const date = toDateKey(addDays(new Date(), -i));
      days.push({ date, minutes: getTotalMinutesForDate(date) });
    }
    return days;
  }, [getTotalMinutesForDate]);

  const maxHeatMin = Math.max(...heatmap.map((day) => day.minutes), 1);

  return (
    <div className="space-y-6 w-full max-w-none">
      <h1 className="text-2xl font-display font-bold text-foreground">Estatisticas</h1>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{formatMinutesCompact(totalMinutes)}</p>
          <p className="text-xs text-muted-foreground">Total acumulado</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{formatMinutesCompact(totalPauseMinutes)}</p>
          <p className="text-xs text-muted-foreground">Total pausado</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{formatMinutesCompact(dailyAvg)}</p>
          <p className="text-xs text-muted-foreground">Media diaria</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{focusSessions.length}</p>
          <p className="text-xs text-muted-foreground">Sessoes de foco</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{complianceRate}%</p>
          <p className="text-xs text-muted-foreground">Checklist concluido</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-card p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Horas por materia</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={subjectHours} layout="vertical">
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} axisLine={false} tickLine={false} />
              <Tooltip formatter={(value: number) => formatMinutesCompact(value)} />
              <Bar dataKey="minutes" radius={[0, 6, 6, 0]}>
                {subjectHours.map((entry, index) => (
                  <Cell key={index} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="glass-card p-5">
          <h3 className="font-display font-semibold text-sm mb-4">Distribuicao</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={subjectHours} dataKey="minutes" cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={2}>
                  {subjectHours.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-1.5 flex-1 min-w-0">
              {subjectHours.map((subject) => (
                <div key={subject.name} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: subject.color }} />
                  <span className="truncate text-foreground">{subject.name}</span>
                  <span className="text-muted-foreground ml-auto">{formatMinutesCompact(subject.minutes)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="glass-card p-5">
        <h3 className="font-display font-semibold text-sm mb-4">Evolucao semanal</h3>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={weeklyTrend}>
            <XAxis dataKey="label" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip formatter={(value: number, name: string) => `${name === 'minutes' ? 'Estudo' : 'Pausa'}: ${formatMinutesCompact(value)}`} />
            <Line type="monotone" dataKey="minutes" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: 'hsl(var(--primary))', r: 4 }} />
            <Line type="monotone" dataKey="pauses" stroke="hsl(var(--warning))" strokeWidth={2} dot={{ fill: 'hsl(var(--warning))', r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="glass-card p-5">
        <h3 className="font-display font-semibold text-sm mb-4">Consistencia (ultimos 90 dias)</h3>
        <div className="flex flex-wrap gap-[3px]">
          {heatmap.map((day) => {
            const intensity = day.minutes > 0 ? Math.max(0.15, day.minutes / maxHeatMin) : 0;
            return (
              <div
                key={day.date}
                title={`${day.date}: ${formatMinutesCompact(day.minutes)}`}
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: intensity > 0 ? `hsl(var(--primary) / ${intensity})` : 'hsl(var(--muted))' }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}


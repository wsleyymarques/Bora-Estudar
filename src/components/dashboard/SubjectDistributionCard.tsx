import React, { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useStudy } from '@/contexts/StudyContext';
import { toDateKey } from '@/lib/date-utils';
import { formatMinutesCompact } from '@/lib/duration-utils';
import { cn } from '@/lib/utils';

export function SubjectDistributionCard({ className }: { className?: string }) {
  const { data, getSubject } = useStudy();

  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - index));
    return toDateKey(d);
  }), []);

  const chartData = useMemo(() => {
    const subjectMinutes: Record<string, number> = {};
    let total = 0;

    data.sessions.forEach(session => {
      if (weekDates.includes(session.date)) {
        const mins = session.durationMinutes || Math.round((session.actualDurationSeconds || 0) / 60) || 0;
        if (mins > 0 && session.status === 'completed') {
          subjectMinutes[session.subjectId] = (subjectMinutes[session.subjectId] || 0) + mins;
          total += mins;
        }
      }
    });

    const result = Object.entries(subjectMinutes).map(([subjectId, mins]) => {
      const subject = getSubject(subjectId);
      return {
        name: subject?.name || 'Desconhecido',
        value: mins,
        color: subject?.color || '#ccc',
      };
    }).sort((a, b) => b.value - a.value);

    return { data: result, total };
  }, [data.sessions, weekDates, getSubject]);

  return (
    <div className={cn("bg-card border border-border/50 text-card-foreground rounded-3xl p-6 shadow-sm flex flex-col relative", className)}>
      <div className="flex justify-between items-start mb-4 z-10">
        <div>
          <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Distribuição</span>
          <h3 className="text-lg font-black tracking-tight mt-1">Participação por matéria</h3>
        </div>
        <div className="px-3 py-1 bg-muted rounded-full text-xs font-black text-muted-foreground uppercase tracking-wider">
          {formatMinutesCompact(chartData.total)}
        </div>
      </div>

      <div className="flex-1 relative mt-2 min-h-[220px]">
        {chartData.data.length > 0 ? (
          <>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.data}
                  cx="50%"
                  cy="50%"
                  innerRadius="75%"
                  outerRadius="100%"
                  paddingAngle={3}
                  dataKey="value"
                  stroke="none"
                >
                  {chartData.data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => formatMinutesCompact(value)}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                  itemStyle={{ fontWeight: 800 }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-4">Total</span>
              <span className="text-2xl font-black text-foreground">{formatMinutesCompact(chartData.total)}</span>
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center">
            <div className="w-32 h-32 rounded-full border-4 border-muted border-dashed mb-4 opacity-50" />
            <span className="text-sm font-bold text-muted-foreground">Nenhum estudo na semana</span>
          </div>
        )}
      </div>
    </div>
  );
}

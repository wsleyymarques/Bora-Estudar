import React, { useState, useMemo } from 'react';
import { useStudy } from '@/contexts/StudyContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

function formatMin(m: number) { const h = Math.floor(m / 60); return h > 0 ? `${h}h ${m % 60}m` : `${m}m`; }
function fmt(d: Date) { return d.toISOString().split('T')[0]; }

type FilterPeriod = 'week' | 'month' | 'year' | 'all';

export default function HistoryPage() {
  const { data, getSubject } = useStudy();
  const [period, setPeriod] = useState<FilterPeriod>('month');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    let sessions = [...data.sessions];
    const now = new Date();

    if (period === 'week') {
      const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
      sessions = sessions.filter(s => s.date >= fmt(weekAgo));
    } else if (period === 'month') {
      const monthAgo = new Date(now); monthAgo.setMonth(monthAgo.getMonth() - 1);
      sessions = sessions.filter(s => s.date >= fmt(monthAgo));
    } else if (period === 'year') {
      const yearAgo = new Date(now); yearAgo.setFullYear(yearAgo.getFullYear() - 1);
      sessions = sessions.filter(s => s.date >= fmt(yearAgo));
    }

    if (subjectFilter !== 'all') {
      sessions = sessions.filter(s => s.subjectId === subjectFilter);
    }

    return sessions.sort((a, b) => b.date.localeCompare(a.date) || (b.startTime || '').localeCompare(a.startTime || ''));
  }, [data.sessions, period, subjectFilter]);

  const totalMinutes = filtered.reduce((acc, s) => acc + s.durationMinutes, 0);
  const uniqueDays = new Set(filtered.map(s => s.date)).size;

  // Group by date
  const grouped = useMemo(() => {
    const map: Record<string, typeof filtered> = {};
    filtered.forEach(s => {
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <div className="space-y-5 sm:space-y-6 max-w-3xl">
      <h1 className="text-2xl font-display font-bold text-foreground">Histórico</h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {(['week', 'month', 'year', 'all'] as FilterPeriod[]).map(p => (
            <button key={p} onClick={() => setPeriod(p)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${period === p ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'}`}>
              {{ week: 'Semana', month: 'Mês', year: 'Ano', all: 'Tudo' }[p]}
            </button>
          ))}
        </div>
        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-full sm:w-[220px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as matérias</SelectItem>
            {data.subjects.map(s => (
              <SelectItem key={s.id} value={s.id}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                  {s.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{formatMin(totalMinutes)}</p>
          <p className="text-xs text-muted-foreground">Total estudado</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{filtered.length}</p>
          <p className="text-xs text-muted-foreground">Sessões</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{uniqueDays}</p>
          <p className="text-xs text-muted-foreground">Dias ativos</p>
        </div>
      </div>

      {/* Sessions list */}
      {grouped.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">Nenhuma sessão encontrada nesse período.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {grouped.map(([date, sessions]) => (
            <div key={date}>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <div className="space-y-1">
                {sessions.map(s => {
                  const subj = getSubject(s.subjectId);
                  return (
                    <div key={s.id} className="glass-card p-3 flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: subj?.color }} />
                      <span className="text-sm text-foreground flex-1">{subj?.name}</span>
                      <span className="text-xs text-muted-foreground">{s.startTime}{s.endTime ? ` - ${s.endTime}` : ''}</span>
                      <span className="text-xs font-medium text-foreground">{formatMin(s.durationMinutes)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

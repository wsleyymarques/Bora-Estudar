import React, { useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useStudy } from '@/contexts/StudyContext';
import { getSessionActualMinutes, getSessionPauseSeconds, getSessionStartLabel, getSessionEndLabel } from '@/features/tracker/session-metrics';
import { toDateKey } from '@/lib/date-utils';
import { formatMinutesCompact } from '@/lib/duration-utils';

type FilterPeriod = 'week' | 'month' | 'year' | 'all';

function getFromDateByPeriod(period: FilterPeriod): string | undefined {
  if (period === 'all') return undefined;
  const now = new Date();

  if (period === 'week') now.setDate(now.getDate() - 7);
  if (period === 'month') now.setMonth(now.getMonth() - 1);
  if (period === 'year') now.setFullYear(now.getFullYear() - 1);

  return toDateKey(now);
}

export default function HistoryPage() {
  const { data, getSubject, getSessionPauses } = useStudy();
  const [period, setPeriod] = useState<FilterPeriod>('month');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');

  const filtered = useMemo(() => {
    const fromDate = getFromDateByPeriod(period);
    let sessions = data.sessions.filter((session) => session.isFocusSession !== false);

    if (fromDate) {
      sessions = sessions.filter((session) => session.date >= fromDate);
    }

    if (subjectFilter !== 'all') {
      sessions = sessions.filter((session) => session.subjectId === subjectFilter);
    }

    return sessions.sort((a, b) => {
      const aStart = a.startedAt || `${a.date}T${a.startTime || '00:00'}:00`;
      const bStart = b.startedAt || `${b.date}T${b.startTime || '00:00'}:00`;
      return bStart.localeCompare(aStart);
    });
  }, [data.sessions, period, subjectFilter]);

  const summary = useMemo(() => {
    const totalMinutes = filtered.reduce((acc, session) => acc + getSessionActualMinutes(session), 0);
    const pauseMinutes = Math.round(
      filtered.reduce((acc, session) => acc + getSessionPauseSeconds(session, data.sessionPauses), 0) / 60,
    );
    const uniqueDays = new Set(filtered.map((session) => session.date)).size;
    return {
      totalMinutes,
      pauseMinutes,
      uniqueDays,
      sessionCount: filtered.length,
    };
  }, [filtered, data.sessionPauses]);

  const groupedByDate = useMemo(() => {
    const groups: Record<string, typeof filtered> = {};
    for (const session of filtered) {
      if (!groups[session.date]) groups[session.date] = [];
      groups[session.date].push(session);
    }
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  return (
    <div className="space-y-6 w-full max-w-none">
      <h1 className="text-2xl font-display font-bold text-foreground">Historico</h1>

      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-1 bg-muted rounded-lg p-0.5">
          {(['week', 'month', 'year', 'all'] as FilterPeriod[]).map((value) => (
            <button
              key={value}
              onClick={() => setPeriod(value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                period === value ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground'
              }`}
            >
              {{ week: 'Semana', month: 'Mes', year: 'Ano', all: 'Tudo' }[value]}
            </button>
          ))}
        </div>

        <Select value={subjectFilter} onValueChange={setSubjectFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as materias</SelectItem>
            {data.subjects.map((subject) => (
              <SelectItem key={subject.id} value={subject.id}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: subject.color }} />
                  {subject.name}
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{formatMinutesCompact(summary.totalMinutes)}</p>
          <p className="text-xs text-muted-foreground">Total estudado</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{formatMinutesCompact(summary.pauseMinutes)}</p>
          <p className="text-xs text-muted-foreground">Total pausado</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{summary.sessionCount}</p>
          <p className="text-xs text-muted-foreground">Sessoes</p>
        </div>
        <div className="glass-card p-4 text-center">
          <p className="text-2xl font-display font-bold text-foreground">{summary.uniqueDays}</p>
          <p className="text-xs text-muted-foreground">Dias ativos</p>
        </div>
      </div>

      {groupedByDate.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p className="text-muted-foreground">Nenhuma sessao encontrada nesse periodo.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByDate.map(([date, sessions]) => (
            <div key={date}>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {new Date(`${date}T12:00:00`).toLocaleDateString('pt-BR', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </p>

              <div className="space-y-2">
                {sessions.map((session) => {
                  const subject = getSubject(session.subjectId);
                  const pauses = getSessionPauses(session.id);
                  const actual = formatMinutesCompact(getSessionActualMinutes(session));
                  const paused = formatMinutesCompact(Math.round(getSessionPauseSeconds(session, pauses) / 60));
                  const startLabel = getSessionStartLabel(session);
                  const endLabel = getSessionEndLabel(session);

                  return (
                    <div key={session.id} className="glass-card p-3 space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: subject?.color }} />
                        <span className="text-sm text-foreground flex-1 truncate">{subject?.name || 'Materia'}</span>
                        <span className="text-xs text-muted-foreground">{session.sessionMode || 'manual'}</span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                        <span className="rounded bg-muted px-1.5 py-0.5">
                          {startLabel}
                          {endLabel ? ` -> ${endLabel}` : ''}
                        </span>
                        <span className="rounded bg-muted px-1.5 py-0.5">feito {actual}</span>
                        <span className="rounded bg-muted px-1.5 py-0.5">pausa {paused}</span>
                        {session.scheduleDate && <span className="rounded bg-muted px-1.5 py-0.5">cronograma {session.scheduleDate}</span>}
                      </div>

                      {pauses.length > 0 && (
                        <div className="rounded-md bg-muted/40 px-2 py-1.5 space-y-1">
                          <p className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Pausas</p>
                          {pauses.map((pause) => (
                            <p key={pause.id} className="text-[11px] text-foreground">
                              {new Date(pause.pauseStartedAt).toLocaleTimeString('pt-BR', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: false,
                              })}
                              {' -> '}
                              {pause.pauseEndedAt
                                ? new Date(pause.pauseEndedAt).toLocaleTimeString('pt-BR', {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                    hour12: false,
                                  })
                                : '--:--'}
                            </p>
                          ))}
                        </div>
                      )}
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


import { DateRange } from 'react-day-picker';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { StatsFilters, type StatsPeriod, type StatsScope } from '@/components/stats/StatsFilters';
import { useStudy } from '@/contexts/StudyContext';
import { addDays, addMonths, eachDayInclusive, getMonday, toDateKey } from '@/lib/date-utils';
import { formatMinutesCompact } from '@/lib/duration-utils';
import { getSessionActualMinutes, getSessionDateKey } from '@/features/tracker/session-metrics';
import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, ChevronLeft, ChevronRight, Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/generic/PageHeader';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import SessionDialog from '@/components/history/SessionDialog';
import { StudySession } from '@/types/study';
import { toast } from 'sonner';

const MONTHS_FULL_PT = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const MONTHS_SHORT_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const WEEKDAYS_SHORT_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const WEEKDAYS_FULL_PT = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];

type SubjectSummary = { id: string; name: string; color: string; totalMinutes: number };
type BucketSubjectSummary = { id: string; name: string; color: string; minutes: number };
type ChartDatum = { 
  key: string; 
  label: string; 
  description: string; 
  totalMinutes: number; 
  subjects: BucketSubjectSummary[]; 
  [subjectId: string]: number | string | BucketSubjectSummary[] 
};
type RangeBucket = { key: string; label: string; description: string; date: Date };

function pad2(value: number) { return String(value).padStart(2, '0'); }
function capitalizeText(value: string) { return value.charAt(0).toUpperCase() + value.slice(1); }
function formatShortDate(date: Date) { return `${pad2(date.getDate())}/${MONTHS_SHORT_PT[date.getMonth()]}`; }
function formatFullDate(date: Date) { 
  return capitalizeText(new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(date)); 
}
function startOfToday() { const d = new Date(); d.setHours(12,0,0,0); return d; }
function rangeToLabel(from?: Date, to?: Date) { 
  if (!from) return 'Selecionar período'; 
  const start = from.toLocaleDateString('pt-BR'); 
  const end = to ? to.toLocaleDateString('pt-BR') : start; 
  return start === end ? start : `${start} - ${end}`; 
}
function addPeriod(date: Date, period: StatsPeriod, direction: -1 | 1) { 
  if (period === 'weekly') return addDays(date, 7 * direction); 
  if (period === 'monthly') return addMonths(date, direction); 
  return addMonths(date, 12 * direction); 
}

function getMonthBuckets(start: Date, end: Date): RangeBucket[] { 
  const buckets: RangeBucket[] = []; 
  const cursor = new Date(start.getFullYear(), start.getMonth(), 15, 12, 0, 0, 0); 
  const lastMonth = new Date(end.getFullYear(), end.getMonth(), 15, 12, 0, 0, 0); 
  while (cursor <= lastMonth) { 
    buckets.push({ 
      key: `${cursor.getFullYear()}-${pad2(cursor.getMonth() + 1)}`, 
      label: MONTHS_SHORT_PT[cursor.getMonth()], 
      description: `${MONTHS_FULL_PT[cursor.getMonth()]}, ${cursor.getFullYear()}`, 
      date: new Date(cursor) 
    }); 
    cursor.setMonth(cursor.getMonth() + 1); 
  } 
  return buckets; 
}

function buildRange(period: StatsPeriod, anchor: Date, customRange?: DateRange) { 
  const baseStart = customRange?.from || anchor; 
  const baseEnd = customRange?.to || anchor; 
  if (period === 'weekly') { 
    const start = customRange?.from ? new Date(customRange.from) : getMonday(anchor); 
    const end = customRange?.to ? new Date(customRange.to) : addDays(start, 6); 
    const days = eachDayInclusive(start, end); 
    return { 
      start, 
      end, 
      navLabel: `Semana de ${formatShortDate(start)} - ${formatShortDate(end)}`, 
      shortLabel: 'Semanal', 
      buckets: days.map((day) => ({ 
        key: toDateKey(day), 
        label: `${WEEKDAYS_SHORT_PT[day.getDay()]} ${pad2(day.getDate())}`, 
        description: formatFullDate(day), 
        date: day 
      })) 
    }; 
  } 
  if (period === 'monthly') { 
    const start = customRange?.from ? new Date(customRange.from) : new Date(anchor.getFullYear(), anchor.getMonth(), 1, 12, 0, 0, 0); 
    const end = customRange?.to ? new Date(customRange.to) : new Date(start.getFullYear(), start.getMonth() + 1, 0, 12, 0, 0, 0); 
    const days = eachDayInclusive(start, end); 
    return { 
      start, 
      end, 
      navLabel: `${MONTHS_FULL_PT[start.getMonth()]}, ${start.getFullYear()}`, 
      shortLabel: 'Mensal', 
      buckets: days.map((day) => ({ 
        key: toDateKey(day), 
        label: pad2(day.getDate()), 
        description: formatFullDate(day), 
        date: day 
      })) 
    }; 
  } 
  const start = customRange?.from ? new Date(customRange.from.getFullYear(), customRange.from.getMonth(), 1, 12, 0, 0, 0) : new Date(anchor.getFullYear(), 0, 1, 12, 0, 0, 0); 
  const end = customRange?.to ? new Date(customRange.to.getFullYear(), customRange.to.getMonth(), 1, 12, 0, 0, 0) : new Date(anchor.getFullYear(), 11, 1, 12, 0, 0, 0); 
  return { 
    start, 
    end, 
    navLabel: `${start.getFullYear()}${customRange?.to && customRange.to.getFullYear() !== start.getFullYear() ? ` - ${customRange.to.getFullYear()}` : ''}`, 
    shortLabel: 'Anual', 
    buckets: getMonthBuckets(start, customRange?.to || new Date(anchor.getFullYear(), 11, 31, 12, 0, 0, 0)) 
  }; 
}

function DetailedTooltip({ active, payload }: { active?: boolean; payload?: Array<{ dataKey?: string; name?: string; value?: number; fill?: string }> }) { 
  if (!active || !payload?.length) return null; 
  const row = payload[0]?.payload as ChartDatum | undefined; 
  if (!row) return null; 
  const subjectLines = payload.map((entry) => ({ 
    id: String(entry.dataKey || entry.name || ''), 
    name: entry.name || String(entry.dataKey || 'Matéria'), 
    minutes: Number(entry.value || 0), 
    color: entry.fill || 'hsl(var(--muted-foreground))' 
  })).filter((item) => item.minutes > 0).sort((a, b) => b.minutes - a.minutes); 
  
  return (
    <div className="min-w-[16rem] rounded-2xl border border-border/60 bg-popover/95 p-4 text-popover-foreground shadow-2xl backdrop-blur-md">
      <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Detalhe do período</p>
          <h4 className="mt-1 text-sm font-black text-foreground">{row.description}</h4>
        </div>
        <div className="rounded-full border border-border/60 bg-muted/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {formatMinutesCompact(row.totalMinutes)}
        </div>
      </div>
      {subjectLines.length > 0 ? (
        <div className="mt-3 space-y-2">
          {subjectLines.map((subject) => (
            <div key={`${row.key}-${subject.id}`} className="flex items-center gap-2 text-xs">
              <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
              <span className="min-w-0 flex-1 truncate text-foreground">{subject.name}</span>
              <span className="font-mono font-semibold text-muted-foreground">{formatMinutesCompact(subject.minutes)}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-xs text-muted-foreground">Nenhum estudo registrado neste período.</p>
      )}
    </div>
  ); 
}

export function DetailedStatsChart() { 
  const { data, getSubject, deleteSession } = useStudy(); 
  const [scope, setScope] = useState<StatsScope>('all'); 
  const [planId, setPlanId] = useState(''); 
  const [period, setPeriod] = useState<StatsPeriod>('weekly'); 
  const [anchorDate, setAnchorDate] = useState(() => startOfToday()); 
  const [customRange, setCustomRange] = useState<DateRange | undefined>(undefined); 
  const [selectedBucketIndex, setSelectedBucketIndex] = useState<number | null>(null); 
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  
  // Dialog state for adding/editing sessions
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<StudySession | undefined>(undefined);
  const [deleteConfirmSessionId, setDeleteConfirmSessionId] = useState<string | null>(null);

  const plans = data.studyPlans || []; 
  
  useEffect(() => { 
    if (scope !== 'plan') return; 
    if (!planId || !plans.some((plan) => plan.id === planId)) { 
      setPlanId(data.activeStudyPlanId || plans[0]?.id || ''); 
    } 
  }, [data.activeStudyPlanId, planId, plans, scope]); 

  const activePlan = plans.find((plan) => plan.id === planId); 
  const range = useMemo(() => buildRange(period, anchorDate, customRange), [anchorDate, customRange, period]); 
  const focusSessions = useMemo(() => data.sessions.filter((session) => session.isFocusSession !== false), [data.sessions]); 

  const filteredSessions = useMemo(() => { 
    const startKey = toDateKey(range.start); 
    const endKey = toDateKey(range.end); 
    return focusSessions.filter((session) => { 
      if (scope === 'plan' && planId && session.planId !== planId) return false; 
      if (subjectFilter !== 'all' && session.subjectId !== subjectFilter) return false;
      const dateKey = getSessionDateKey(session); 
      return dateKey >= startKey && dateKey <= endKey; 
    }); 
  }, [focusSessions, planId, range.end, range.start, scope, subjectFilter]); 

  const availableSubjects = useMemo(() => {
    if (scope === 'all') return data.subjects;
    const planSubjectIds = new Set<string>();
    for (const session of focusSessions) {
      if (session.planId === planId) {
        planSubjectIds.add(session.subjectId);
      }
    }
    return data.subjects.filter(s => s.planId === planId || planSubjectIds.has(s.id));
  }, [data.subjects, focusSessions, scope, planId]);

  const { chartData, subjects, totalMinutesPeriod, periodCount } = useMemo(() => { 
    const subjectMinutes = new Map<string, number>(); 
    const bucketMinutes = new Map<string, Map<string, number>>(); 
    for (const bucket of range.buckets) bucketMinutes.set(bucket.key, new Map()); 
    const startKey = toDateKey(range.start); 
    const endKey = toDateKey(range.end); 
    
    for (const session of filteredSessions) { 
      const dateKey = getSessionDateKey(session); 
      if (dateKey < startKey || dateKey > endKey) continue; 
      const minutes = getSessionActualMinutes(session); 
      if (minutes <= 0) continue; 
      subjectMinutes.set(session.subjectId, (subjectMinutes.get(session.subjectId) || 0) + minutes); 
      let bucketKey = dateKey; 
      if (period === 'yearly') { 
        const sessionDate = new Date(`${dateKey}T12:00:00`); 
        bucketKey = `${sessionDate.getFullYear()}-${pad2(sessionDate.getMonth() + 1)}`; 
      } 
      const bucketMap = bucketMinutes.get(bucketKey); 
      if (!bucketMap) continue; 
      bucketMap.set(session.subjectId, (bucketMap.get(session.subjectId) || 0) + minutes); 
    } 
    
    const subjects = Array.from(subjectMinutes.entries()).map(([id, totalMinutes]) => ({ 
      id, 
      name: getSubject(id)?.name || 'Matéria', 
      color: getSubject(id)?.color || 'hsl(var(--muted-foreground))', 
      totalMinutes 
    })).sort((a, b) => b.totalMinutes - a.totalMinutes); 
    
    const chartData = range.buckets.map((bucket) => { 
      const subjectMap = bucketMinutes.get(bucket.key) || new Map<string, number>(); 
      const datum: ChartDatum = { 
        key: bucket.key, 
        label: bucket.label, 
        description: bucket.description, 
        totalMinutes: 0, 
        subjects: [] 
      } as ChartDatum; 
      const list: BucketSubjectSummary[] = []; 
      for (const subject of subjects) { 
        const minutes = subjectMap.get(subject.id) || 0; 
        if (minutes <= 0) continue; 
        datum[subject.id] = minutes; 
        datum.totalMinutes += minutes; 
        list.push({ id: subject.id, name: subject.name, color: subject.color, minutes }); 
      } 
      datum.subjects = list.sort((a, b) => b.minutes - a.minutes); 
      return datum; 
    }); 
    
    const totalMinutesPeriod = chartData.reduce((acc, item) => acc + item.totalMinutes, 0); 
    return { chartData, subjects, totalMinutesPeriod, periodCount: range.buckets.length }; 
  }, [filteredSessions, getSubject, period, range.buckets, range.end, range.start]); 

  const averageMinutes = periodCount > 0 ? Math.round(totalMinutesPeriod / periodCount) : 0; 
  const topSubject = subjects[0]; 
  const subjectShares = useMemo(() => subjects.map((subject) => ({ 
    ...subject, 
    percentage: totalMinutesPeriod > 0 ? Math.round((subject.totalMinutes / totalMinutesPeriod) * 10000) / 100 : 0 
  })).sort((a, b) => b.totalMinutes - a.totalMinutes), [subjects, totalMinutesPeriod]); 

  const handlePrev = () => { 
    setCustomRange(undefined); 
    setAnchorDate((current) => addPeriod(current, period, -1)); 
    setSelectedBucketIndex(null);
  }; 
  const handleNext = () => { 
    setCustomRange(undefined); 
    setAnchorDate((current) => addPeriod(current, period, 1)); 
    setSelectedBucketIndex(null);
  }; 
  const handlePeriodChange = (nextPeriod: StatsPeriod) => { 
    setPeriod(nextPeriod); 
    setCustomRange(undefined); 
    setSelectedBucketIndex(null); 
  }; 

  const selectedRangeLabel = customRange?.from ? rangeToLabel(customRange.from, customRange.to) : range.navLabel; 

  // Filter study sessions for list view below
  const listSessions = useMemo(() => {
    let list = [...filteredSessions];
    if (selectedBucketIndex !== null) {
      const bucket = chartData[selectedBucketIndex];
      list = list.filter((session) => {
        const dateKey = getSessionDateKey(session);
        if (period === 'yearly') {
          const sessionDate = new Date(`${dateKey}T12:00:00`); 
          const bucketKey = `${sessionDate.getFullYear()}-${pad2(sessionDate.getMonth() + 1)}`;
          return bucketKey === bucket.key;
        }
        return dateKey === bucket.key;
      });
    }
    return list.sort((a, b) => {
      const aStart = a.startedAt || `${a.date}T${a.startTime || '00:00'}:00`;
      const bStart = b.startedAt || `${b.date}T${b.startTime || '00:00'}:00`;
      return bStart.localeCompare(aStart);
    });
  }, [filteredSessions, selectedBucketIndex, chartData, period]);

  const displayStats = useMemo(() => {
    const subjectMinutes = new Map<string, number>();
    for (const session of listSessions) {
      const minutes = getSessionActualMinutes(session);
      if (minutes <= 0) continue;
      subjectMinutes.set(session.subjectId, (subjectMinutes.get(session.subjectId) || 0) + minutes);
    }
    
    const displaySubjects = Array.from(subjectMinutes.entries()).map(([id, totalMinutes]) => ({
      id,
      name: getSubject(id)?.name || 'Matéria',
      color: getSubject(id)?.color || 'hsl(var(--muted-foreground))',
      totalMinutes
    })).sort((a, b) => b.totalMinutes - a.totalMinutes);

    const displayTotalMinutes = displaySubjects.reduce((acc, item) => acc + item.totalMinutes, 0);
    
    const displaySubjectShares = displaySubjects.map((subject) => ({
      ...subject,
      percentage: displayTotalMinutes > 0 ? Math.round((subject.totalMinutes / displayTotalMinutes) * 10000) / 100 : 0
    }));

    return { displaySubjects, displayTotalMinutes, displaySubjectShares };
  }, [listSessions, getSubject]);

  const handleAddSession = () => {
    setSelectedSession(undefined);
    setDialogOpen(true);
  };

  const handleEditSession = (session: StudySession) => {
    setSelectedSession(session);
    setDialogOpen(true);
  };

  const handleDeleteSession = (id: string) => {
    setDeleteConfirmSessionId(id);
  };

  const confirmDeleteSession = async () => {
    if (!deleteConfirmSessionId) return;
    try {
      await deleteSession(deleteConfirmSessionId);
      toast.success('Sessão excluída com sucesso!');
    } catch (err) {
      console.error(err);
      toast.error('Erro ao excluir sessão.');
    } finally {
      setDeleteConfirmSessionId(null);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-full">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-72 bg-[radial-gradient(circle_at_top_left,_rgba(255,255,255,0.9),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(255,255,255,0.75),_transparent_30%),linear-gradient(180deg,_rgba(255,255,255,0.6),_transparent)]" />

      <PageHeader 
        title="Horas por matéria no período"
        description="Acompanhe o tempo estudado por matéria em visão semanal, mensal ou anual, filtrando por plano ou visão geral e escolhendo o intervalo no calendário."
        badgeText="Estatísticas detalhadas"
        badgeIcon={BarChart3}
      />

      <div className="space-y-6 mt-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <StatsFilters 
            scope={scope} 
            planId={planId} 
            period={period} 
            dateRange={customRange} 
            plans={plans} 
            subjectId={subjectFilter}
            subjects={availableSubjects}
            onSubjectChange={setSubjectFilter}
            onScopeChange={setScope} 
            onPlanChange={setPlanId} 
            onPeriodChange={handlePeriodChange} 
            onDateRangeChange={(range) => { 
              setCustomRange(range); 
              if (range?.from) setAnchorDate(range.from); 
              setSelectedBucketIndex(null); 
            }} 
          />
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl" onClick={handlePrev}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="min-w-[12rem] rounded-2xl border border-border/60 bg-muted/20 px-4 py-2 text-center">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-primary">{scope === 'plan' && activePlan ? activePlan.name : 'Visão geral'}</p>
              <p className="text-sm font-black text-foreground">{selectedRangeLabel}</p>
            </div>
            <Button variant="outline" size="icon" className="h-10 w-10 rounded-2xl" onClick={handleNext}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          </div>
      <div className="rounded-[1.5rem] border border-border/60 bg-background/70 px-5 py-3 shadow-sm">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="text-center md:text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Total no período</p>
            <p className="mt-0.5 text-xl font-display font-black text-foreground">{formatMinutesCompact(totalMinutesPeriod)}</p>
          </div>
          <div className="text-center md:text-left">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Matéria líder</p>
            <p className="mt-0.5 truncate text-xl font-display font-black text-foreground">{topSubject?.name || 'Sem dados'}</p>
          </div>
          <div className="text-center md:text-right">
            <p className="text-[10px] font-black uppercase tracking-[0.14em] text-muted-foreground">Média por período</p>
            <p className="mt-0.5 text-xl font-display font-black text-foreground">{formatMinutesCompact(averageMinutes)}</p>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {totalMinutesPeriod > 0 ? (
          <div className="rounded-[1.5rem] border border-border/60 bg-background/70 p-4 shadow-sm">
            <div className="h-[320px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={chartData} 
                  margin={{ top: 10, right: 12, left: -18, bottom: 0 }} 
                  onClick={(data) => { 
                    if (data && data.activeTooltipIndex !== undefined) { 
                      const index = data.activeTooltipIndex;
                      setSelectedBucketIndex((current) => (current === index ? null : index)); 
                    } 
                  }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border) / 0.35)" />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fontSize: 11, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10, fontWeight: 700, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(value) => formatMinutesCompact(Number(value))} />
                  <Tooltip content={<DetailedTooltip />} cursor={{ fill: 'hsl(var(--muted) / 0.15)' }} />
                  {subjects.map((subject) => (
                    <Bar key={subject.id} dataKey={subject.id} name={subject.name} stackId="study-hours" fill={subject.color} radius={[4, 4, 0, 0]}>
                      {chartData.map((_, index) => (
                        <Cell 
                          key={`${subject.id}-${index}`} 
                          fill={subject.color} 
                          fillOpacity={selectedBucketIndex === null || selectedBucketIndex === index ? 1 : 0.25} 
                          stroke={selectedBucketIndex === index ? 'hsl(var(--primary))' : 'transparent'} 
                          strokeWidth={selectedBucketIndex === index ? 1.5 : 0} 
                        />
                      ))}
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            {selectedBucketIndex !== null && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Gráfico filtrado por: <strong>{chartData[selectedBucketIndex].description}</strong>. Clique fora ou na barra novamente para limpar.
              </p>
            )}
          </div>
        ) : (
          <div className="rounded-[1.5rem] border border-dashed border-border/60 bg-muted/10 px-4 py-12 text-center text-sm text-muted-foreground">
            Nenhuma sessão encontrada para o período selecionado.
          </div>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-[1.5rem] border border-border/60 bg-background/70 p-4 shadow-sm">
          <div className="flex flex-col gap-2 border-b border-border/50 pb-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Resumo por matéria</p>
              <h4 className="mt-1 text-sm font-black text-foreground">
                {selectedBucketIndex !== null ? `Tempo distribuído em: ${chartData[selectedBucketIndex].label}` : 'Tempo total distribuído no período'}
              </h4>
            </div>
            <div className="rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {displayStats.displaySubjects.length} {displayStats.displaySubjects.length === 1 ? 'matéria' : 'matérias'}
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] gap-3 px-3 pb-2 text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">
              <span>Matéria</span>
              <span>Duração</span>
              <span>%</span>
            </div>
            {displayStats.displaySubjectShares.length > 0 ? (
              displayStats.displaySubjectShares.map((subject) => (
                <div key={subject.id} className="rounded-2xl border border-border/50 bg-card/60 px-3 py-3 transition-colors hover:border-border/80">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                        <span className="truncate text-sm font-semibold text-foreground">{subject.name}</span>
                      </div>
                      <div className="mt-2 h-1.5 w-full rounded-full bg-muted/60">
                        <div className="h-full rounded-full" style={{ width: `${subject.percentage}%`, backgroundColor: subject.color }} />
                      </div>
                    </div>
                    <div className="text-right text-sm font-bold text-foreground">{formatMinutesCompact(subject.totalMinutes)}</div>
                    <div className="text-right text-sm font-bold text-muted-foreground">{subject.percentage}%</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
                Sem matérias estudadas.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-[1.5rem] border border-border/60 bg-background/70 p-4 shadow-sm">
          <div className="flex items-start justify-between gap-3 border-b border-border/50 pb-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-muted-foreground">Distribuição</p>
              <h4 className="mt-1 text-sm font-black text-foreground">Participação por matéria</h4>
            </div>
            <div className="rounded-full border border-border/60 bg-muted/30 px-3 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
              {formatMinutesCompact(displayStats.displayTotalMinutes)}
            </div>
          </div>
          <div className="mt-4 flex items-center justify-center">
            {displayStats.displaySubjectShares.length > 0 ? (
              <ResponsiveContainer width={260} height={260}>
                <PieChart>
                  <Pie data={displayStats.displaySubjectShares} dataKey="totalMinutes" nameKey="name" cx="50%" cy="50%" innerRadius={70} outerRadius={108} paddingAngle={3}>
                    {displayStats.displaySubjectShares.map((subject) => (
                      <Cell key={subject.id} fill={subject.color} />
                    ))}
                  </Pie>
                  <Tooltip content={({ active, payload }) => { 
                    if (!active || !payload?.length) return null; 
                    const item = payload[0]?.payload as SubjectSummary | undefined; 
                    if (!item) return null; 
                    return (
                      <div className="rounded-2xl border border-border/60 bg-popover/95 px-3 py-2 text-xs shadow-2xl backdrop-blur-md">
                        <p className="font-black text-foreground">{item.name}</p>
                        <p className="text-muted-foreground">{formatMinutesCompact(item.totalMinutes)}</p>
                      </div>
                    ); 
                  }} />
                  <text x="50%" y="48%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground">
                    <tspan x="50%" className="text-[10px] font-black uppercase tracking-[0.18em] fill-muted-foreground">Total</tspan>
                    <tspan x="50%" dy="1.5rem" className="text-lg font-black fill-foreground">{formatMinutesCompact(displayStats.displayTotalMinutes)}</tspan>
                  </text>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="rounded-2xl border border-dashed border-border/60 bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
                Sem dados de distribuição para exibir.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sessions Management List in Statistics - satisfies request */}
      <div className="rounded-[1.5rem] border border-border/60 bg-background/70 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/50 pb-4">
          <div>
            <h4 className="font-display text-sm font-black text-foreground">
              {selectedBucketIndex !== null 
                ? `Sessões de: ${chartData[selectedBucketIndex].description}` 
                : 'Sessões do Período Selecionado'}
            </h4>
            <p className="text-xs text-muted-foreground">
              {selectedBucketIndex !== null 
                ? 'Exibindo apenas as sessões do dia selecionado no gráfico. Clique no gráfico novamente para limpar.' 
                : 'Exibindo todas as sessões do período filtrado.'}
            </p>
          </div>
          <Button onClick={handleAddSession} className="flex items-center gap-1.5 self-start sm:self-auto shadow-sm">
            <Plus className="w-4 h-4" />
            Registrar Sessão
          </Button>
        </div>

        {listSessions.length > 0 ? (
          <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1 custom-sidebar-scroll">
            {listSessions.map((session) => {
              const subject = getSubject(session.subjectId);
              const duration = formatMinutesCompact(getSessionActualMinutes(session));
              
              return (
                <div key={session.id} className="group border border-border/50 bg-card/45 hover:bg-card hover:border-border/80 px-4 py-3 rounded-2xl transition-all flex items-center justify-between gap-3 shadow-sm">
                  <div className="min-w-0 flex-1 flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: subject?.color || 'hsl(var(--muted-foreground))' }} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{subject?.name || 'Matéria'}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5 text-[11px] text-muted-foreground">
                        <span className="capitalize font-semibold">{session.sessionMode || 'manual'}</span>
                        <span>•</span>
                        <span>
                          {new Date(`${session.date}T12:00:00`).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        </span>
                        {session.startTime && (
                          <>
                            <span>•</span>
                            <span>{session.startTime}</span>
                          </>
                        )}
                        {session.note && (
                          <>
                            <span>•</span>
                            <span className="truncate italic max-w-[150px]">{session.note}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3.5 shrink-0">
                    <span className="text-sm font-black text-foreground bg-muted/40 px-2.5 py-1 rounded-xl">
                      {duration}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted/50"
                        onClick={() => handleEditSession(session)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-xl text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDeleteSession(session.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8 border border-dashed border-border/60 rounded-2xl bg-muted/5 text-sm text-muted-foreground">
            Nenhuma sessão de estudo encontrada.
          </div>
        )}
      </div>

      {/* Session Add/Edit Dialog */}
      <SessionDialog 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
        session={selectedSession} 
      />

      <AlertDialog open={!!deleteConfirmSessionId} onOpenChange={(open) => {
        if (!open) setDeleteConfirmSessionId(null);
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você tem certeza?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso excluirá permanentemente esta sessão de estudo e todos os seus dados.
              <br />
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDeleteSession}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
    </div>
  ); 
}

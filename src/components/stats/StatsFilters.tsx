import { DateRange } from 'react-day-picker';
import { CalendarDays, Filter } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export type StatsScope = 'all' | 'plan';
export type StatsPeriod = 'weekly' | 'monthly' | 'yearly';

interface StatsFiltersProps {
  scope: StatsScope;
  planId: string;
  period: StatsPeriod;
  dateRange?: DateRange;
  plans: Array<{ id: string; name: string }>;
  onScopeChange: (scope: StatsScope) => void;
  onPlanChange: (planId: string) => void;
  onPeriodChange: (period: StatsPeriod) => void;
  onDateRangeChange: (range?: DateRange) => void;
  subjectId?: string;
  subjects?: Array<{ id: string; name: string }>;
  onSubjectChange?: (subjectId: string) => void;
}

function formatRangeLabel(range?: DateRange) {
  if (!range?.from) return 'Selecionar período';
  const from = range.from.toLocaleDateString('pt-BR');
  const to = range.to ? range.to.toLocaleDateString('pt-BR') : from;
  return from === to ? from : `${from} - ${to}`;
}

export function StatsFilters({
  scope,
  planId,
  period,
  dateRange,
  plans,
  onScopeChange,
  onPlanChange,
  onPeriodChange,
  onDateRangeChange,
  subjectId = 'all',
  subjects = [],
  onSubjectChange,
}: StatsFiltersProps) {
  const planOptions = plans.length > 0 ? plans : [{ id: '', name: 'Sem planos' }];

  return (
    <div className="rounded-[1.5rem] border border-border/60 bg-background/75 px-4 py-2.5 shadow-sm backdrop-blur-md">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="min-w-[14rem]">
              <Select 
                value={scope === 'all' ? 'all' : planId} 
                onValueChange={(value) => {
                  if (value === 'all') {
                    onScopeChange('all');
                  } else {
                    onScopeChange('plan');
                    onPlanChange(value);
                  }
                }}
              >
                <SelectTrigger className="rounded-2xl border-border/60 bg-background/80">
                  <SelectValue placeholder="Geral" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Geral</SelectItem>
                  {plans.map((plan) => (
                    <SelectItem key={plan.id} value={plan.id}>
                      {plan.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {onSubjectChange && (
              <div className="min-w-[12rem]">
                <Select value={subjectId} onValueChange={onSubjectChange}>
                  <SelectTrigger className="rounded-2xl border-border/60 bg-background/80">
                    <SelectValue placeholder="Todas as matérias" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as matérias</SelectItem>
                    {subjects.map((subj) => (
                      <SelectItem key={subj.id} value={subj.id}>
                        {subj.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="inline-flex items-center gap-1 rounded-2xl border border-border/60 bg-muted/30 p-1 shadow-inner">
            {([
              { key: 'weekly', label: 'Semanal' },
              { key: 'monthly', label: 'Mensal' },
              { key: 'yearly', label: 'Anual' },
            ] as const).map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => onPeriodChange(item.key)}
                className={cn(
                  'rounded-xl px-3 py-1.5 text-xs font-black transition-colors',
                  period === item.key ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="h-11 rounded-2xl border-border/60 bg-background/80 px-4 justify-start gap-2">
                <CalendarDays className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">{formatRangeLabel(dateRange)}</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="flex flex-col gap-4 p-4 lg:flex-row">
                <div className="flex min-w-[9rem] flex-col gap-2 border-b border-border/50 pb-3 lg:border-b-0 lg:border-r lg:pb-0 lg:pr-4">
                  <button type="button" className="rounded-xl px-3 py-2 text-left text-sm hover:bg-muted/60" onClick={() => onDateRangeChange({ from: new Date(), to: new Date() })}>
                    Hoje
                  </button>
                  <button type="button" className="rounded-xl px-3 py-2 text-left text-sm hover:bg-muted/60" onClick={() => {
                    const end = new Date();
                    const start = new Date();
                    start.setDate(end.getDate() - 6);
                    onDateRangeChange({ from: start, to: end });
                  }}>
                    Últimos 7 dias
                  </button>
                  <button type="button" className="rounded-xl px-3 py-2 text-left text-sm hover:bg-muted/60" onClick={() => {
                    const today = new Date();
                    const start = new Date(today.getFullYear(), today.getMonth(), 1);
                    const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
                    onDateRangeChange({ from: start, to: end });
                  }}>
                    Este mês
                  </button>
                  <button type="button" className="rounded-xl px-3 py-2 text-left text-sm hover:bg-muted/60" onClick={() => {
                    const today = new Date();
                    const start = new Date(today.getFullYear(), 0, 1);
                    const end = new Date(today.getFullYear(), 11, 31);
                    onDateRangeChange({ from: start, to: end });
                  }}>
                    Este ano
                  </button>
                  <button type="button" className="rounded-xl px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted/60" onClick={() => onDateRangeChange(undefined)}>
                    Limpar
                  </button>
                </div>

                <div className="rounded-2xl border border-border/60 bg-background/80 p-2">
                  <Calendar
                    mode="range"
                    numberOfMonths={2}
                    selected={dateRange}
                    onSelect={onDateRangeChange}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { CalendarDays, Repeat, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { DAY_NAMES_SHORT } from '@/types/study';
import { cn } from '@/lib/utils';

export type RecurrenceMode = 'single' | 'weekly';

export interface RecurrenceOptionsValue {
  mode: RecurrenceMode;
  weekdays: number[];
  endDate: string;
}

interface RecurrenceOptionsProps {
  value: RecurrenceOptionsValue;
  onChange: (next: Partial<RecurrenceOptionsValue>) => void;
  referenceDate?: string;
  subjectName?: string;
  className?: string;
}

function formatDateLabel(dateKey: string) {
  if (!dateKey) return '';
  return new Date(`${dateKey}T12:00:00`).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function joinDays(days: number[]) {
  return days
    .slice()
    .sort((left, right) => left - right)
    .map((day) => DAY_NAMES_SHORT[day] || '')
    .filter(Boolean)
    .join(', ');
}

export function RecurrenceOptions({
  value,
  onChange,
  referenceDate,
  subjectName,
  className,
}: RecurrenceOptionsProps) {
  const referenceWeekday = referenceDate
    ? new Date(`${referenceDate}T12:00:00`).toLocaleDateString('pt-BR', { weekday: 'long' })
    : '';

  const summary = value.mode === 'weekly' && value.endDate
    ? `${subjectName || 'Este item'} será repetido(a) ${value.weekdays.length > 0 ? `em ${joinDays(value.weekdays)}` : referenceWeekday ? `toda ${referenceWeekday}` : 'semanalmente'} até ${formatDateLabel(value.endDate)}.`
    : '';

  return (
    <div className={cn('space-y-4 rounded-2xl border border-border/60 bg-background/65 p-4', className)}>
      <div className="flex items-center gap-2">
        <Repeat className="h-4 w-4 text-primary" />
        <h4 className="text-sm font-semibold">Repetição</h4>
      </div>

      <RadioGroup
        value={value.mode}
        onValueChange={(mode) => onChange({ mode: mode as RecurrenceMode })}
        className="gap-2"
      >
        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-3">
          <RadioGroupItem value="single" className="mt-1" />
          <span className="min-w-0">
            <span className="block text-sm font-medium">Somente este dia</span>
            <span className="block text-xs text-muted-foreground">Cria apenas uma entrada no cronograma.</span>
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-3">
          <RadioGroupItem value="weekly" className="mt-1" />
          <span className="min-w-0">
            <span className="block text-sm font-medium">Repetir semanalmente</span>
            <span className="block text-xs text-muted-foreground">Gera itens futuros até a data final.</span>
          </span>
        </label>
      </RadioGroup>

      {value.mode === 'weekly' ? (
        <div className="space-y-4 rounded-2xl border border-dashed border-border/70 p-3">
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Dias da semana</Label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {DAY_NAMES_SHORT.map((dayLabel, index) => {
                const selected = value.weekdays.includes(index);
                return (
                  <button
                    key={dayLabel}
                    type="button"
                    onClick={() => {
                      const next = selected
                        ? value.weekdays.filter((day) => day !== index)
                        : [...value.weekdays, index];
                      onChange({ weekdays: next });
                    }}
                    className={cn(
                      'flex items-center gap-2 rounded-xl border px-3 py-2 text-sm transition',
                      selected
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border/60 bg-background/80 text-foreground hover:bg-muted/50',
                    )}
                  >
                    <Checkbox checked={selected} className="pointer-events-none" />
                    {dayLabel}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recurrence-end-date">Repetir até</Label>
            <Input
              id="recurrence-end-date"
              type="date"
              value={value.endDate}
              onChange={(event) => onChange({ endDate: event.target.value })}
            />
          </div>

          {summary ? (
            <p className="rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">{summary}</p>
          ) : null}
        </div>
      ) : null}

      <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <Calendar className="h-3.5 w-3.5" />
        {value.mode === 'single' ? 'Sem recorrência ativa.' : summary || 'Configure os dias e a data final.'}
      </div>
    </div>
  );
}

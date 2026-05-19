import React, { useMemo, useState } from 'react';
import { Copy, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { ClockTimePickerField, DurationPickerField } from '@/components/generic/time-picker-fields';
import { cn } from '@/lib/utils';

export interface TemplateQuickBuilderSubject {
  id: string;
  name: string;
  color?: string;
}

export interface TemplateQuickGeneratePayload {
  selectedDays: number[];
  selectedSubjectIds: string[];
  startTime?: string;
  intervalMinutes: number;
  plannedMinutes?: number;
  replaceDays: boolean;
  setDayTargetFromPlan: boolean;
}

interface TemplateQuickBuilderProps {
  dayNames: string[];
  subjects: TemplateQuickBuilderSubject[];
  onGenerate: (payload: TemplateQuickGeneratePayload) => Promise<void>;
  onDuplicateDay?: (sourceDay: number, targetDay: number) => Promise<void>;
  className?: string;
  disabled?: boolean;
}

const DEFAULT_DAYS = [0, 1, 2, 3, 4];

export function TemplateQuickBuilder({
  dayNames,
  subjects,
  onGenerate,
  onDuplicateDay,
  className,
  disabled = false,
}: TemplateQuickBuilderProps) {
  const [selectedDays, setSelectedDays] = useState<number[]>(DEFAULT_DAYS);
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>([]);
  const [startTime, setStartTime] = useState<string | undefined>('08:00');
  const [intervalMinutes, setIntervalMinutes] = useState(90);
  const [plannedMinutes, setPlannedMinutes] = useState<number | undefined>(60);
  const [replaceDays, setReplaceDays] = useState(true);
  const [setDayTargetFromPlan, setSetDayTargetFromPlan] = useState(true);
  const [sourceDay, setSourceDay] = useState('0');
  const [targetDay, setTargetDay] = useState('1');
  const [saving, setSaving] = useState(false);

  const canGenerate = selectedDays.length > 0 && selectedSubjectIds.length > 0 && !saving && !disabled;
  const quickSummary = useMemo(() => {
    const daysLabel = `${selectedDays.length} ${selectedDays.length === 1 ? 'dia' : 'dias'}`;
    const subjectsLabel = `${selectedSubjectIds.length} ${selectedSubjectIds.length === 1 ? 'materia' : 'materias'}`;
    return `${daysLabel} • ${subjectsLabel}`;
  }, [selectedDays.length, selectedSubjectIds.length]);

  const toggleDay = (dayIndex: number) => {
    setSelectedDays((previous) =>
      previous.includes(dayIndex) ? previous.filter((value) => value !== dayIndex) : [...previous, dayIndex].sort((a, b) => a - b),
    );
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjectIds((previous) =>
      previous.includes(subjectId) ? previous.filter((value) => value !== subjectId) : [...previous, subjectId],
    );
  };

  const handleGenerate = async () => {
    if (!canGenerate) {
      toast.error('Selecione pelo menos 1 dia e 1 materia.');
      return;
    }
    setSaving(true);
    try {
      await onGenerate({
        selectedDays,
        selectedSubjectIds,
        startTime,
        intervalMinutes: Math.max(1, intervalMinutes),
        plannedMinutes,
        replaceDays,
        setDayTargetFromPlan,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    if (!onDuplicateDay) return;
    if (sourceDay === targetDay) {
      toast.error('Escolha dias diferentes para duplicar.');
      return;
    }
    setSaving(true);
    try {
      await onDuplicateDay(Number(sourceDay), Number(targetDay));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={cn('glass-card p-3 md:p-4 space-y-3', className)}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.11em] text-muted-foreground">Modo rapido</p>
          <p className="text-[11px] text-muted-foreground">
            Gere a semana em poucos passos: {quickSummary}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="h-8 rounded-full px-3 text-xs"
          onClick={() => {
            setSelectedDays(DEFAULT_DAYS);
            setSelectedSubjectIds([]);
            setStartTime('08:00');
            setIntervalMinutes(90);
            setPlannedMinutes(60);
            setReplaceDays(true);
            setSetDayTargetFromPlan(true);
          }}
          variant="outline"
          disabled={saving || disabled}
        >
          Reset
        </Button>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Dias da semana</Label>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
          {dayNames.map((dayName, index) => {
            const active = selectedDays.includes(index);
            return (
              <button
                key={`${dayName}-${index}`}
                type="button"
                onClick={() => toggleDay(index)}
                disabled={saving || disabled}
                className={cn(
                  'h-8 rounded-lg border text-[11px] font-semibold transition-colors',
                  active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border/70 text-muted-foreground hover:text-foreground',
                )}
              >
                {dayName.slice(0, 3)}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Materias base</Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
          {subjects.map((subject) => {
            const active = selectedSubjectIds.includes(subject.id);
            return (
              <button
                key={subject.id}
                type="button"
                onClick={() => toggleSubject(subject.id)}
                disabled={saving || disabled}
                className={cn(
                  'h-8 rounded-lg border px-2 text-left text-xs flex items-center gap-2 transition-colors',
                  active ? 'bg-primary/10 border-primary/50 text-foreground' : 'bg-card border-border/70 text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: subject.color }} />
                <span className="truncate">{subject.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Inicio</Label>
          <ClockTimePickerField value={startTime} onChange={setStartTime} placeholder="--:--" disabled={saving || disabled} />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Intervalo (min)</Label>
          <Input
            type="number"
            min={1}
            inputMode="numeric"
            value={intervalMinutes}
            onChange={(event) => setIntervalMinutes(Math.max(1, Number(event.target.value || 1)))}
            disabled={saving || disabled}
            className="h-10"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">Meta por materia</Label>
          <DurationPickerField
            valueMinutes={plannedMinutes}
            onChangeMinutes={setPlannedMinutes}
            placeholder="Meta"
            includeSeconds
            disabled={saving || disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <label className="flex items-center justify-between rounded-lg border border-border/70 bg-card px-2.5 py-2 text-xs">
          <span className="text-foreground">Substituir dias selecionados</span>
          <Switch checked={replaceDays} disabled={saving || disabled} onCheckedChange={setReplaceDays} />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-border/70 bg-card px-2.5 py-2 text-xs">
          <span className="text-foreground">Definir meta diaria pelo plano</span>
          <Switch checked={setDayTargetFromPlan} disabled={saving || disabled} onCheckedChange={setSetDayTargetFromPlan} />
        </label>
      </div>

      <Button
        type="button"
        onClick={() => void handleGenerate()}
        disabled={!canGenerate}
        className="w-full h-9 text-sm font-medium"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Gerar semana rapidamente
      </Button>

      {onDuplicateDay && (
        <div className="rounded-lg border border-border/70 bg-card p-2.5 space-y-2">
          <p className="text-[11px] uppercase tracking-[0.1em] text-muted-foreground">Duplicar dia</p>
          <div className="grid grid-cols-[1fr_auto_1fr_auto] gap-1.5 items-center">
            <Select value={sourceDay} onValueChange={setSourceDay} disabled={saving || disabled}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Origem" />
              </SelectTrigger>
              <SelectContent>
                {dayNames.map((dayName, index) => (
                  <SelectItem key={`source-${index}`} value={String(index)}>{dayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <span className="text-muted-foreground text-xs">para</span>

            <Select value={targetDay} onValueChange={setTargetDay} disabled={saving || disabled}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue placeholder="Destino" />
              </SelectTrigger>
              <SelectContent>
                {dayNames.map((dayName, index) => (
                  <SelectItem key={`target-${index}`} value={String(index)}>{dayName}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 px-2.5"
              onClick={() => void handleDuplicate()}
              disabled={saving || disabled}
            >
              <Copy className="w-3.5 h-3.5 mr-1" />
              Duplicar
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}


import React, { useEffect, useMemo, useState } from 'react';
import { Clock3, TimerReset } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatMinutesCompact } from '@/lib/duration-utils';

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MIN_OR_SEC = Array.from({ length: 60 }, (_, i) => i);
const DURATION_PRESETS_MIN = [15, 30, 45, 60, 90, 120, 180];

function pad2(n: number) {
  return n.toString().padStart(2, '0');
}

function parseClockValue(value?: string) {
  if (!value) return { hour: 0, minute: 0, second: 0 };
  const parts = value.split(':').map(Number);
  return {
    hour: Number.isFinite(parts[0]) ? parts[0] : 0,
    minute: Number.isFinite(parts[1]) ? parts[1] : 0,
    second: Number.isFinite(parts[2]) ? parts[2] : 0,
  };
}

function clockToString(hour: number, minute: number, second: number, includeSeconds: boolean) {
  if (includeSeconds) return `${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
  return `${pad2(hour)}:${pad2(minute)}`;
}

function parseDurationMinutes(valueMinutes?: number) {
  if (valueMinutes === undefined || valueMinutes === null) return { hour: 0, minute: 0, second: 0 };
  const totalSeconds = Math.max(0, Math.round(valueMinutes * 60));
  const hour = Math.floor(totalSeconds / 3600);
  const minute = Math.floor((totalSeconds % 3600) / 60);
  const second = totalSeconds % 60;
  return { hour, minute, second };
}

interface BaseTriggerProps {
  className?: string;
  disabled?: boolean;
}

interface ClockTimePickerFieldProps extends BaseTriggerProps {
  value?: string;
  onChange: (value?: string) => void;
  placeholder?: string;
  includeSeconds?: boolean;
}

export function ClockTimePickerField({
  value,
  onChange,
  placeholder = '--:--',
  includeSeconds = false,
  className,
  disabled,
}: ClockTimePickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState('00');
  const [minute, setMinute] = useState('00');
  const [second, setSecond] = useState('00');

  useEffect(() => {
    if (!open) return;
    const parsed = parseClockValue(value);
    setHour(pad2(parsed.hour));
    setMinute(pad2(parsed.minute));
    setSecond(pad2(parsed.second));
  }, [open, value]);

  const display = value || placeholder;

  const apply = () => {
    onChange(clockToString(Number(hour), Number(minute), Number(second), includeSeconds));
    setOpen(false);
  };

  const clear = () => {
    onChange(undefined);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          'h-10 w-full rounded-md border border-input bg-background px-3 text-sm flex items-center justify-between hover:bg-muted/50 transition-colors disabled:opacity-50',
          className,
        )}
      >
        <span className={cn('tabular-nums', value ? 'text-foreground' : 'text-muted-foreground')}>{display}</span>
        <Clock3 className="w-4 h-4 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Selecionar Horario</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2">
            <PartSelect label="Hora" value={hour} onValueChange={setHour} values={HOURS} />
            <PartSelect label="Min" value={minute} onValueChange={setMinute} values={MIN_OR_SEC} />
            {includeSeconds ? (
              <PartSelect label="Seg" value={second} onValueChange={setSecond} values={MIN_OR_SEC} />
            ) : (
              <div />
            )}
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={clear}>Limpar</Button>
            <Button type="button" onClick={apply}>Aplicar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

interface DurationPickerFieldProps extends BaseTriggerProps {
  valueMinutes?: number;
  onChangeMinutes: (valueMinutes?: number) => void;
  placeholder?: string;
  includeSeconds?: boolean;
}

export function DurationPickerField({
  valueMinutes,
  onChangeMinutes,
  placeholder = 'Meta',
  includeSeconds = true,
  className,
  disabled,
}: DurationPickerFieldProps) {
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState('00');
  const [minute, setMinute] = useState('00');
  const [second, setSecond] = useState('00');

  useEffect(() => {
    if (!open) return;
    const parsed = parseDurationMinutes(valueMinutes);
    setHour(pad2(parsed.hour));
    setMinute(pad2(parsed.minute));
    setSecond(pad2(parsed.second));
  }, [open, valueMinutes]);

  const display = useMemo(() => {
    if (valueMinutes === undefined) return placeholder;
    return formatMinutesCompact(valueMinutes);
  }, [placeholder, valueMinutes]);

  const apply = () => {
    const totalSeconds =
      Number(hour) * 3600 +
      Number(minute) * 60 +
      (includeSeconds ? Number(second) : 0);
    const minutes = Math.round(totalSeconds / 60);
    onChangeMinutes(minutes > 0 ? minutes : undefined);
    setOpen(false);
  };

  const clear = () => {
    onChangeMinutes(undefined);
    setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(true)}
        className={cn(
          'h-10 w-full rounded-md border border-input bg-background px-3 text-sm flex items-center justify-between hover:bg-muted/50 transition-colors disabled:opacity-50',
          className,
        )}
      >
        <span className={cn('tabular-nums', valueMinutes !== undefined ? 'text-foreground' : 'text-muted-foreground')}>
          {display}
        </span>
        <TimerReset className="w-4 h-4 text-muted-foreground" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="w-[calc(100vw-1.5rem)] max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Selecionar Duracao</DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-3 gap-2">
            <PartSelect label="Hora" value={hour} onValueChange={setHour} values={HOURS} />
            <PartSelect label="Min" value={minute} onValueChange={setMinute} values={MIN_OR_SEC} />
            {includeSeconds ? (
              <PartSelect label="Seg" value={second} onValueChange={setSecond} values={MIN_OR_SEC} />
            ) : (
              <div />
            )}
          </div>

          <div>
            <p className="text-xs text-muted-foreground mb-2">Atalhos</p>
            <div className="flex flex-wrap gap-2">
              {DURATION_PRESETS_MIN.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => {
                    const parsed = parseDurationMinutes(preset);
                    setHour(pad2(parsed.hour));
                    setMinute(pad2(parsed.minute));
                    setSecond('00');
                  }}
                  className="px-2.5 py-1 rounded-full text-xs bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                >
                  {formatMinutesCompact(preset)}
                </button>
              ))}
            </div>
          </div>

          <p className="text-[11px] text-muted-foreground">
            Segundos sao opcionais e convertidos para minutos ao salvar.
          </p>

          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="ghost" onClick={clear}>Limpar</Button>
            <Button type="button" onClick={apply}>Aplicar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PartSelect({
  label,
  value,
  onValueChange,
  values,
}: {
  label: string;
  value: string;
  onValueChange: (v: string) => void;
  values: number[];
}) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className="h-10">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="max-h-64">
          {values.map((v) => {
            const vv = pad2(v);
            return <SelectItem key={vv} value={vv}>{vv}</SelectItem>;
          })}
        </SelectContent>
      </Select>
    </div>
  );
}


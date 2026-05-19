import React from 'react';
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { PomodoroSettings } from '@/features/tracker/runtime';
import { DEFAULT_POMODORO_SETTINGS } from '@/features/tracker/storage';
import { cn } from '@/lib/utils';

interface PomodoroQuickSettingsProps {
  settings: PomodoroSettings;
  onChange: React.Dispatch<React.SetStateAction<PomodoroSettings>>;
  className?: string;
  compact?: boolean;
  disabled?: boolean;
  showHeader?: boolean;
}

const PRESETS: Array<{
  key: string;
  label: string;
  focusMinutes: number;
  shortBreakMinutes: number;
  longBreakMinutes: number;
  longBreakEvery: number;
}> = [
  { key: 'classic', label: 'Classico 25/5', focusMinutes: 25, shortBreakMinutes: 5, longBreakMinutes: 15, longBreakEvery: 4 },
  { key: 'deep', label: 'Foco 50/10', focusMinutes: 50, shortBreakMinutes: 10, longBreakMinutes: 20, longBreakEvery: 2 },
  { key: 'light', label: 'Leve 15/3', focusMinutes: 15, shortBreakMinutes: 3, longBreakMinutes: 10, longBreakEvery: 4 },
];

export function PomodoroQuickSettings({
  settings,
  onChange,
  className,
  compact = false,
  disabled = false,
  showHeader = true,
}: PomodoroQuickSettingsProps) {
  const updateNumberField = (
    field: 'focusMinutes' | 'shortBreakMinutes' | 'longBreakMinutes' | 'longBreakEvery',
    value: string,
  ) => {
    const parsed = Math.max(1, Number(value || 1));
    onChange((previous) => ({
      ...previous,
      [field]: parsed,
    }));
  };

  const applyPreset = (presetKey: string) => {
    const preset = PRESETS.find((item) => item.key === presetKey);
    if (!preset) return;

    onChange((previous) => ({
      ...previous,
      focusMinutes: preset.focusMinutes,
      shortBreakMinutes: preset.shortBreakMinutes,
      longBreakMinutes: preset.longBreakMinutes,
      longBreakEvery: preset.longBreakEvery,
    }));
  };

  const inputClassName = compact ? 'h-8 px-2.5 text-xs' : 'h-9';
  const labelClassName = compact ? 'text-[11px] uppercase tracking-[0.08em] text-muted-foreground' : 'text-xs';

  return (
    <div className={cn('rounded-lg border border-border/70 bg-muted/30 p-3 space-y-3', className)}>
      {showHeader && (
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.11em] text-muted-foreground">Ajustes pomodoro</p>
            <p className="text-[11px] text-muted-foreground">
              Foco {settings.focusMinutes}m | Curta {settings.shortBreakMinutes}m | Longa {settings.longBreakMinutes}m
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-[11px]"
            disabled={disabled}
            onClick={() => onChange(DEFAULT_POMODORO_SETTINGS)}
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Padrao
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <Button
            key={preset.key}
            type="button"
            variant="outline"
            size="sm"
            className="h-7 px-2 text-[11px]"
            disabled={disabled}
            onClick={() => applyPreset(preset.key)}
          >
            {preset.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="pomodoro-focus-minutes" className={labelClassName}>Foco (min)</Label>
          <Input
            id="pomodoro-focus-minutes"
            className={inputClassName}
            type="number"
            min={1}
            inputMode="numeric"
            value={settings.focusMinutes}
            disabled={disabled}
            onChange={(event) => updateNumberField('focusMinutes', event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pomodoro-short-break-minutes" className={labelClassName}>Pausa curta</Label>
          <Input
            id="pomodoro-short-break-minutes"
            className={inputClassName}
            type="number"
            min={1}
            inputMode="numeric"
            value={settings.shortBreakMinutes}
            disabled={disabled}
            onChange={(event) => updateNumberField('shortBreakMinutes', event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pomodoro-long-break-minutes" className={labelClassName}>Pausa longa</Label>
          <Input
            id="pomodoro-long-break-minutes"
            className={inputClassName}
            type="number"
            min={1}
            inputMode="numeric"
            value={settings.longBreakMinutes}
            disabled={disabled}
            onChange={(event) => updateNumberField('longBreakMinutes', event.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pomodoro-long-break-every" className={labelClassName}>Longa a cada</Label>
          <Input
            id="pomodoro-long-break-every"
            className={inputClassName}
            type="number"
            min={1}
            inputMode="numeric"
            value={settings.longBreakEvery}
            disabled={disabled}
            onChange={(event) => updateNumberField('longBreakEvery', event.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="flex items-center justify-between gap-2 text-xs text-foreground">
          <span>Auto iniciar pausas</span>
          <Switch
            checked={settings.autoStartBreak}
            disabled={disabled}
            onCheckedChange={(checked) => {
              onChange((previous) => ({ ...previous, autoStartBreak: checked }));
            }}
          />
        </label>
        <label className="flex items-center justify-between gap-2 text-xs text-foreground">
          <span>Auto iniciar foco</span>
          <Switch
            checked={settings.autoStartFocus}
            disabled={disabled}
            onCheckedChange={(checked) => {
              onChange((previous) => ({ ...previous, autoStartFocus: checked }));
            }}
          />
        </label>
      </div>
    </div>
  );
}


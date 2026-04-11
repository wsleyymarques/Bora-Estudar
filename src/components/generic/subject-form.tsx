import React from 'react';
import { SubjectCreateInput } from '@/contexts/StudyContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export interface SubjectFormProps {
  value: SubjectCreateInput;
  onChange: (value: SubjectCreateInput) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function SubjectForm({ value, onChange, onSubmit, onCancel, submitLabel = 'Salvar materia', disabled = false, className }: SubjectFormProps) {
  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input value={value.name || ''} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Ex: Direito Constitucional" disabled={disabled} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Input value={value.category || ''} onChange={(e) => onChange({ ...value, category: e.target.value })} placeholder="Ex: Jurídico" disabled={disabled} />
        </div>
        <div className="space-y-1.5">
          <Label>Cor</Label>
          <div className="flex items-center gap-2 rounded-xl border border-border px-2 py-2">
            <Input type="color" value={value.color || '#5B8C7E'} onChange={(e) => onChange({ ...value, color: e.target.value })} className="h-9 w-12 border-0 p-0" disabled={disabled} />
            <span className="text-xs text-muted-foreground">{value.color || '#5B8C7E'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Meta semanal (h)</Label>
          <Input type="number" min={0} value={value.weeklyGoalHours ?? 0} onChange={(e) => onChange({ ...value, weeklyGoalHours: Number(e.target.value) })} disabled={disabled} />
        </div>
        <div className="space-y-1.5">
          <Label>Meta mensal (h)</Label>
          <Input type="number" min={0} value={value.monthlyGoalHours ?? 0} onChange={(e) => onChange({ ...value, monthlyGoalHours: Number(e.target.value) })} disabled={disabled} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
          <span className="text-sm text-foreground">Materia opcional</span>
          <Switch checked={Boolean(value.optional)} onCheckedChange={(c) => onChange({ ...value, optional: c })} disabled={disabled} />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
          <span className="text-sm text-foreground">Materia ativa</span>
          <Switch checked={value.active !== false} onCheckedChange={(c) => onChange({ ...value, active: c })} disabled={disabled} />
        </label>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? <Button variant="outline" onClick={onCancel} disabled={disabled}>Cancelar</Button> : null}
        <Button onClick={onSubmit} disabled={disabled || !value.name?.trim()}>{submitLabel}</Button>
      </div>
    </div>
  );
}

import React, { useMemo } from 'react';
import { SubjectArea, SubjectCategory } from '@/types/study';
import { SubjectCreateInput } from '@/contexts/StudyContext';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

export interface SubjectFormProps {
  value: SubjectCreateInput;
  areas: SubjectArea[];
  categories: SubjectCategory[];
  onChange: (value: SubjectCreateInput) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  disabled?: boolean;
  className?: string;
}

export function SubjectForm({
  value,
  areas,
  categories,
  onChange,
  onSubmit,
  onCancel,
  submitLabel = 'Salvar materia',
  disabled = false,
  className,
}: SubjectFormProps) {
  const filteredCategories = useMemo(() => {
    if (!value.areaId) return categories;
    return categories.filter((category) => category.areaId === value.areaId);
  }, [categories, value.areaId]);

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input
          value={value.name || ''}
          onChange={(event) => onChange({ ...value, name: event.target.value })}
          placeholder="Ex: Direito Constitucional"
          disabled={disabled}
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Area</Label>
          <Select
            value={value.areaId || '__none__'}
            onValueChange={(nextValue) =>
              onChange({
                ...value,
                areaId: nextValue === '__none__' ? undefined : nextValue,
                categoryId: undefined,
                subcategoryId: undefined,
              })
            }
          >
            <SelectTrigger disabled={disabled}>
              <SelectValue placeholder="Selecione area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sem area</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label>Categoria</Label>
          <Select
            value={value.categoryId || '__none__'}
            onValueChange={(nextValue) =>
              onChange({
                ...value,
                categoryId: nextValue === '__none__' ? undefined : nextValue,
              })
            }
          >
            <SelectTrigger disabled={disabled}>
              <SelectValue placeholder="Selecione categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">Sem categoria</SelectItem>
              {filteredCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5 sm:col-span-2">
          <Label>Descricao</Label>
          <Textarea
            value={value.description || ''}
            onChange={(event) => onChange({ ...value, description: event.target.value })}
            rows={3}
            placeholder="Descricao curta para facilitar buscas."
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Cor</Label>
          <div className="flex items-center gap-2 rounded-xl border border-border px-2 py-2">
            <Input
              type="color"
              value={value.color || '#5B8C7E'}
              onChange={(event) => onChange({ ...value, color: event.target.value })}
              className="h-9 w-12 border-0 p-0"
              disabled={disabled}
            />
            <span className="text-xs text-muted-foreground">{value.color || '#5B8C7E'}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Meta semanal (h)</Label>
          <Input
            type="number"
            min={0}
            value={value.weeklyGoalHours ?? 0}
            onChange={(event) => onChange({ ...value, weeklyGoalHours: Number(event.target.value) })}
            disabled={disabled}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Meta mensal (h)</Label>
          <Input
            type="number"
            min={0}
            value={value.monthlyGoalHours ?? 0}
            onChange={(event) => onChange({ ...value, monthlyGoalHours: Number(event.target.value) })}
            disabled={disabled}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
          <span className="text-sm text-foreground">Materia opcional</span>
          <Switch
            checked={Boolean(value.optional)}
            onCheckedChange={(checked) => onChange({ ...value, optional: checked })}
            disabled={disabled}
          />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
          <span className="text-sm text-foreground">Materia ativa</span>
          <Switch
            checked={value.active !== false}
            onCheckedChange={(checked) => onChange({ ...value, active: checked })}
            disabled={disabled}
          />
        </label>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? (
          <Button variant="outline" onClick={onCancel} disabled={disabled}>
            Cancelar
          </Button>
        ) : null}
        <Button onClick={onSubmit} disabled={disabled || !value.name?.trim()}>
          {submitLabel}
        </Button>
      </div>
    </div>
  );
}

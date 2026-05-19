import React from 'react';
import { SubjectCreateInput } from '@/contexts/StudyContext';
import { SubjectArea, SubjectCategory, SubjectSubcategory } from '@/types/study';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

export interface SubjectFormProps {
  value: SubjectCreateInput;
  onChange: (value: SubjectCreateInput) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  submitLabel?: string;
  disabled?: boolean;
  className?: string;
  areas?: SubjectArea[];
  categories?: SubjectCategory[];
  subcategories?: SubjectSubcategory[];
}

export function SubjectForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  submitLabel = 'Salvar matéria',
  disabled = false,
  className,
  areas = [],
  categories = [],
  subcategories = [],
}: SubjectFormProps) {
  const visibleCategories = value.areaId ? categories.filter((category) => category.areaId === value.areaId) : categories;
  const visibleSubcategories = value.categoryId ? subcategories.filter((subcategory) => subcategory.categoryId === value.categoryId) : subcategories;

  return (
    <div className={cn('space-y-4', className)}>
      <div className="space-y-1.5">
        <Label>Nome</Label>
        <Input value={value.name || ''} onChange={(e) => onChange({ ...value, name: e.target.value })} placeholder="Ex: Direito Constitucional" disabled={disabled} />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Categoria livre</Label>
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

      {(areas.length > 0 || categories.length > 0) && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {areas.length > 0 && (
            <div className="space-y-1.5">
              <Label>Área</Label>
              <Select
                value={value.areaId || '__none__'}
                onValueChange={(next) => onChange({ ...value, areaId: next === '__none__' ? undefined : next, categoryId: undefined, subcategoryId: undefined })}
                disabled={disabled}
              >
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Área" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem área</SelectItem>
                  {areas.map((area) => <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {categories.length > 0 && (
            <div className="space-y-1.5">
              <Label>Categoria</Label>
              <Select
                value={value.categoryId || '__none__'}
                onValueChange={(next) => onChange({ ...value, categoryId: next === '__none__' ? undefined : next, subcategoryId: undefined })}
                disabled={disabled}
              >
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Categoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem categoria</SelectItem>
                  {visibleCategories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {subcategories.length > 0 && (
            <div className="space-y-1.5">
              <Label>Subcategoria</Label>
              <Select
                value={value.subcategoryId || '__none__'}
                onValueChange={(next) => onChange({ ...value, subcategoryId: next === '__none__' ? undefined : next })}
                disabled={disabled}
              >
                <SelectTrigger className="rounded-xl"><SelectValue placeholder="Subcategoria" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">Sem subcategoria</SelectItem>
                  {visibleSubcategories.map((subcategory) => <SelectItem key={subcategory.id} value={subcategory.id}>{subcategory.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}

      <div className="space-y-1.5">
        <Label>Descrição</Label>
        <Textarea value={value.description || ''} onChange={(e) => onChange({ ...value, description: e.target.value })} placeholder="Observações sobre a matéria" disabled={disabled} />
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
          <span className="text-sm text-foreground">Matéria opcional</span>
          <Switch checked={Boolean(value.optional)} onCheckedChange={(checked) => onChange({ ...value, optional: checked })} disabled={disabled} />
        </label>
        <label className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5">
          <span className="text-sm text-foreground">Matéria ativa</span>
          <Switch checked={value.active !== false} onCheckedChange={(checked) => onChange({ ...value, active: checked, status: checked ? 'active' : 'inactive' })} disabled={disabled} />
        </label>
      </div>

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        {onCancel ? <Button variant="outline" onClick={onCancel} disabled={disabled}>Cancelar</Button> : null}
        <Button onClick={onSubmit} disabled={disabled || !value.name?.trim()}>{submitLabel}</Button>
      </div>
    </div>
  );
}

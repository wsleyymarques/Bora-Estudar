import React, { useMemo, useState } from 'react';
import { Check, Search, Sparkles } from 'lucide-react';
import { Subject, SubjectArea, SubjectCategory } from '@/types/study';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface SubjectFinderProps {
  subjects: Subject[];
  areas?: SubjectArea[];
  categories?: SubjectCategory[];
  value?: string;
  onChange: (subjectId: string) => void;
  origin?: 'all' | 'global' | 'user';
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onCreateSubject?: () => void;
}

export function SubjectFinder({
  subjects,
  areas = [],
  categories = [],
  value,
  onChange,
  origin = 'all',
  placeholder = 'Selecionar materia',
  className,
  disabled = false,
  onCreateSubject,
}: SubjectFinderProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [areaId, setAreaId] = useState('__all__');
  const [categoryId, setCategoryId] = useState('__all__');

  const selected = useMemo(() => subjects.find((subject) => subject.id === value), [subjects, value]);

  const visibleCategories = useMemo(() => {
    if (areaId === '__all__') return categories;
    return categories.filter((category) => category.areaId === areaId);
  }, [areaId, categories]);

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return subjects
      .filter((subject) => subject.status !== 'archived' && subject.active)
      .filter((subject) => origin === 'all' || subject.origin === origin)
      .filter((subject) => areaId === '__all__' || subject.areaId === areaId)
      .filter((subject) => categoryId === '__all__' || subject.categoryId === categoryId)
      .filter((subject) => {
        if (!normalizedQuery) return true;
        const areaName = areas.find((area) => area.id === subject.areaId)?.name || '';
        const categoryName = categories.find((category) => category.id === subject.categoryId)?.name || '';
        const searchText = `${subject.name} ${subject.category || ''} ${subject.description || ''} ${areaName} ${categoryName}`.toLowerCase();
        return searchText.includes(normalizedQuery);
      })
      .sort((left, right) => {
        const leftScore = left.origin === 'global' ? 0 : 1;
        const rightScore = right.origin === 'global' ? 0 : 1;
        if (leftScore !== rightScore) return leftScore - rightScore;
        return left.name.localeCompare(right.name, 'pt-BR');
      });
  }, [subjects, query, areaId, categoryId, origin, areas, categories]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn('h-10 w-full justify-start rounded-xl text-left font-normal', className)}
          disabled={disabled}
        >
          {selected ? (
            <span className="flex min-w-0 items-center gap-2">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: selected.color }} />
              <span className="truncate">{selected.name}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[min(92vw,420px)] space-y-3 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar materia"
            className="border-0 px-0 shadow-none focus-visible:ring-0"
          />
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Select value={areaId} onValueChange={(next) => { setAreaId(next); setCategoryId('__all__'); }}>
            <SelectTrigger className="h-9 rounded-lg">
              <SelectValue placeholder="Area" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas areas</SelectItem>
              {areas.map((area) => (
                <SelectItem key={area.id} value={area.id}>
                  {area.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={categoryId} onValueChange={setCategoryId}>
            <SelectTrigger className="h-9 rounded-lg">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todas categorias</SelectItem>
              {visibleCategories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border/70 p-1.5">
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Nenhuma materia encontrada.
            </p>
          ) : (
            filtered.map((subject) => {
              const isSelected = value === subject.id;
              return (
                <button
                  key={subject.id}
                  type="button"
                  onClick={() => {
                    onChange(subject.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors',
                    isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/70',
                  )}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: subject.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{subject.name}</span>
                    <span className="block text-[11px] text-muted-foreground">
                      {subject.origin === 'global' ? 'Global' : 'Sua materia'}
                    </span>
                  </span>
                  {isSelected ? <Check className="h-4 w-4" /> : null}
                </button>
              );
            })
          )}
        </div>

        {onCreateSubject ? (
          <Button variant="outline" className="h-9 w-full rounded-xl" onClick={onCreateSubject}>
            <Sparkles className="mr-1.5 h-4 w-4" />
            Criar nova materia
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

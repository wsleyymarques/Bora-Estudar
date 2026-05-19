import React, { useMemo, useState } from 'react';
import { Check, Search, Sparkles } from 'lucide-react';
import { Subject } from '@/types/study';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface SubjectFinderProps {
  subjects: Subject[];
  value?: string;
  onChange: (subjectId: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  onCreateSubject?: () => void;
}

export function SubjectFinder({
  subjects,
  value,
  onChange,
  placeholder = 'Selecionar materia',
  className,
  disabled = false,
  onCreateSubject,
}: SubjectFinderProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const selected = useMemo(() => subjects.find((s) => s.id === value), [subjects, value]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return subjects
      .filter((s) => s.active)
      .filter((s) => {
        if (!q) return true;
        return `${s.name} ${s.category || ''}`.toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  }, [subjects, query]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button type="button" variant="outline" className={cn('h-10 w-full justify-start rounded-xl text-left font-normal', className)} disabled={disabled}>
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
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar materia" className="border-0 px-0 shadow-none focus-visible:ring-0" />
        </div>
        <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-border/70 p-1.5">
          {filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">Nenhuma materia encontrada.</p>
          ) : (
            filtered.map((subject) => {
              const isSelected = value === subject.id;
              return (
                <button key={subject.id} type="button" onClick={() => { onChange(subject.id); setOpen(false); }}
                  className={cn('flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left transition-colors', isSelected ? 'bg-accent text-accent-foreground' : 'hover:bg-muted/70')}>
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: subject.color }} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm">{subject.name}</span>
                    {subject.category && <span className="block text-[11px] text-muted-foreground">{subject.category}</span>}
                  </span>
                  {isSelected ? <Check className="h-4 w-4" /> : null}
                </button>
              );
            })
          )}
        </div>
        {onCreateSubject ? (
          <Button variant="outline" className="h-9 w-full rounded-xl" onClick={onCreateSubject}>
            <Sparkles className="mr-1.5 h-4 w-4" />Criar nova materia
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}

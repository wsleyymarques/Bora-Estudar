import React, { useMemo, useState } from 'react';
import { BookOpen, CheckCircle2, Loader2, Plus, Search, Sparkles, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePlanSubjects } from '@/hooks/usePlanSubjects';
import { SUBJECT_CATALOG, getAllSeedSubjects } from '@/data/subject-catalog';
import { cn } from '@/lib/utils';

interface SubjectSelectorProps {
  planId: string;
  onFinish?: () => void;
  showFinishButton?: boolean;
}

export function SubjectSelector({ planId, onFinish, showFinishButton = false }: SubjectSelectorProps) {
  const { 
    loading, 
    planSubjects, 
    allSubjects, 
    addExistingSubjectToPlan, 
    createAndLinkSubject, 
    removeSubjectFromPlan 
  } = usePlanSubjects(planId);

  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);
  const [newSubject, setNewSubject] = useState({ name: '', category: '', color: '#5B8C7E' });
  const [seeding, setSeeding] = useState(false);

  // Seed subjects from catalog that the user doesn't have yet
  const handleSeedSubjects = async () => {
    setSeeding(true);
    const allSeeds = getAllSeedSubjects();
    const existingNames = new Set(allSubjects.map(s => s.name.toLowerCase().trim()));
    const toCreate = allSeeds.filter(s => !existingNames.has(s.name.toLowerCase().trim()));

    let count = 0;
    for (const seed of toCreate) {
      const ok = await createAndLinkSubject({ name: seed.name, category: seed.category, color: seed.color });
      if (ok) count++;
    }

    if (count > 0) toast.success(`${count} matérias criadas e vinculadas!`);
    else toast.info('Todas as matérias do catálogo já existem.');
    setSeeding(false);
  };

  // Group available subjects by category
  const linkedIds = useMemo(() => new Set(planSubjects.map(s => s.id)), [planSubjects]);
  
  const catalogWithStatus = useMemo(() => {
    const searchLower = search.toLowerCase().trim();
    
    return SUBJECT_CATALOG.map(cat => {
      const subjectsWithState = cat.subjects.map(seed => {
        const userSubject = allSubjects.find(
          s => s.name.toLowerCase().trim() === seed.name.toLowerCase().trim()
        );
        return {
          ...seed,
          userSubjectId: userSubject?.id || null,
          isLinked: userSubject ? linkedIds.has(userSubject.id) : false,
        };
      }).filter(s => {
        if (!searchLower) return true;
        return s.name.toLowerCase().includes(searchLower) || s.category.toLowerCase().includes(searchLower);
      });

      return {
        ...cat,
        subjects: subjectsWithState,
      };
    }).filter(cat => cat.subjects.length > 0);
  }, [allSubjects, linkedIds, search]);

  // Group linked subjects by category  
  const linkedByCategory = useMemo(() => {
    const map = new Map<string, typeof planSubjects>();
    for (const s of planSubjects) {
      const cat = s.category || 'Sem categoria';
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(s);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [planSubjects]);

  const handleToggleSubject = async (seed: { name: string; category: string; color: string; userSubjectId: string | null; isLinked: boolean }) => {
    setSaving(seed.name);
    try {
      if (seed.isLinked && seed.userSubjectId) {
        await removeSubjectFromPlan(seed.userSubjectId);
      } else if (seed.userSubjectId) {
        await addExistingSubjectToPlan(seed.userSubjectId);
      } else {
        await createAndLinkSubject({ name: seed.name, category: seed.category, color: seed.color });
      }
    } finally {
      setSaving(null);
    }
  };

  const handleCreateNew = async () => {
    if (!newSubject.name.trim()) {
      toast.error('Informe o nome da matéria.');
      return;
    }
    setSaving('__new__');
    const ok = await createAndLinkSubject(newSubject);
    if (ok) {
      setNewSubject({ name: '', category: '', color: '#5B8C7E' });
      setShowNewForm(false);
    }
    setSaving(null);
  };

  return (
    <div className="flex flex-col gap-6 max-w-3xl mx-auto pb-24">
      {/* HEADER & SEARCH */}
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar matéria no catálogo..."
            className="h-12 rounded-xl border-2 pl-10 text-sm bg-background"
          />
        </div>

        {/* CREATE NEW QUICK ACCESS */}
        {!showNewForm ? (
          <Button
            onClick={() => setShowNewForm(true)}
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-black text-sm shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all hover:-translate-y-0.5 active:scale-[0.98]"
          >
            <Plus className="h-5 w-5 mr-2" />
            Adicionar nova matéria
          </Button>
        ) : (
          <div className="space-y-3 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-2">
            <div className="flex items-center justify-between">
              <Label className="font-bold text-sm">Nova matéria</Label>
              <Button variant="ghost" size="sm" onClick={() => setShowNewForm(false)} className="text-xs h-7">Cancelar</Button>
            </div>
            <Input
              value={newSubject.name}
              onChange={(e) => setNewSubject(c => ({ ...c, name: e.target.value }))}
              placeholder="Nome da matéria *"
              className="h-11 rounded-xl border-2 bg-background"
            />
            <div className="flex gap-3">
              <Input
                value={newSubject.category}
                onChange={(e) => setNewSubject(c => ({ ...c, category: e.target.value }))}
                placeholder="Categoria (ex: Direito)"
                className="h-11 rounded-xl border-2 flex-1 bg-background"
              />
              <div className="flex items-center gap-2">
                <Input
                  type="color"
                  value={newSubject.color}
                  onChange={(e) => setNewSubject(c => ({ ...c, color: e.target.value }))}
                  className="h-11 w-14 rounded-xl border-2 cursor-pointer p-1 bg-background"
                />
              </div>
            </div>
            <Button
              onClick={handleCreateNew}
              disabled={saving === '__new__' || !newSubject.name.trim()}
              className="w-full h-11 rounded-xl font-bold text-xs"
            >
              {saving === '__new__' ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar e adicionar ao plano
            </Button>
          </div>
        )}
      </div>

      {/* LINKED SUBJECTS (QUICK VIEW) */}
      {planSubjects.length > 0 && !search && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No seu plano ({planSubjects.length})</h3>
          </div>
          <div className="flex flex-wrap gap-2">
            {planSubjects.map(subject => (
              <button
                key={subject.id}
                onClick={() => removeSubjectFromPlan(subject.id)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-[11px] font-bold hover:bg-destructive/10 hover:border-destructive/20 hover:text-destructive transition-all group"
              >
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subject.color || '#5B8C7E' }} />
                {subject.name}
                <Trash2 className="h-3 w-3 opacity-50 group-hover:opacity-100" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* CATALOG SECTION */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Catálogo Geral</h3>
          {allSubjects.length === 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSeedSubjects}
              disabled={seeding}
              className="h-7 text-[10px] font-bold text-primary hover:bg-primary/5"
            >
              {seeding ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Sparkles className="h-3 w-3 mr-1.5" />}
              Importar Catálogo Completo
            </Button>
          )}
        </div>

        <div className="space-y-8 pb-10">
          {catalogWithStatus.map((cat) => (
            <div key={cat.name} className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">{cat.emoji}</span>
                <h4 className="text-xs font-black text-foreground/80 uppercase tracking-wider">{cat.name}</h4>
                <div className="flex-1 border-t border-border/40" />
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                {cat.subjects.map((subject) => {
                  const isLoading = saving === subject.name;
                  return (
                    <button
                      key={subject.name}
                      type="button"
                      disabled={isLoading}
                      onClick={() => handleToggleSubject(subject)}
                      className={cn(
                        "flex items-center justify-between gap-3 px-4 py-3 rounded-2xl text-[11px] font-bold transition-all duration-200 border-2 text-left",
                        subject.isLinked
                          ? "bg-primary/10 border-primary/40 text-primary shadow-sm hover:border-destructive/40 hover:bg-destructive/5 hover:text-destructive"
                          : "bg-background border-border/50 text-foreground/70 hover:border-primary/40 hover:bg-primary/5 hover:text-primary",
                        isLoading && "opacity-50 cursor-wait"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className="h-2 w-2 rounded-full shrink-0"
                          style={{ backgroundColor: subject.color }}
                        />
                        <span className="truncate">{subject.name}</span>
                      </div>
                      
                      {isLoading ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : subject.isLinked ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      ) : (
                        <Plus className="h-4 w-4 shrink-0 opacity-40" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          
          {catalogWithStatus.length === 0 && (
            <div className="text-center py-12 glass-card border-dashed">
              <BookOpen className="h-8 w-8 text-muted-foreground/20 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">Nenhuma matéria encontrada no catálogo.</p>
            </div>
          )}
        </div>
      </div>

      {showFinishButton && (
        <div className="fixed bottom-0 right-0 left-0 md:left-[var(--sidebar-width,16rem)] p-4 bg-background/90 backdrop-blur-md border-t shadow-2xl z-50 flex justify-center">
          <div className="w-full max-w-3xl px-4 lg:px-0">
            <Button
              onClick={onFinish}
              disabled={planSubjects.length === 0}
              className="w-full h-14 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all active:scale-[0.98]"
            >
              <CheckCircle2 className="mr-2 h-5 w-5" />
              Finalizar Seleção
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

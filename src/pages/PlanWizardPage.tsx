import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Clock, Loader2, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { ImageUpload } from '@/components/generic/image-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePlanSubjects } from '@/hooks/usePlanSubjects';
import { StudyPlan, StudyPlanInput, useStudyPlans } from '@/hooks/useStudyPlans';
import { useTemplates } from '@/hooks/useTemplates';

const STEPS = [
  {
    title: 'Dados do plano',
    description: 'Defina o guarda-chuva do estudo: concurso, banca, cargo, capa e revisão automática.',
  },
  {
    title: 'Matérias',
    description: 'Vincule matérias existentes ou crie novas matérias já conectadas ao plano.',
  },
  {
    title: 'Modelo semanal',
    description: 'Monte o template do plano com matérias por dia da semana, tempo e horário planejado.',
  },
  {
    title: 'Cronograma',
    description: 'Aplique o template no cronograma vinculado e finalize o plano pronto para estudar.',
  },
];

const DAYS = [
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
  { value: 0, label: 'Domingo' },
];

const INITIAL_FORM: StudyPlanInput = {
  name: '',
  exam_name: '',
  board_name: '',
  role_name: '',
  description: '',
  cover_image_url: '',
  review_interval_days: 7,
};

function addDays(date: Date, amount: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + amount);
  return next;
}

function formatDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function PlanWizardPage() {
  const navigate = useNavigate();
  const { createPlan } = useStudyPlans();
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [form, setForm] = useState<StudyPlanInput>(INITIAL_FORM);
  const [savingPlan, setSavingPlan] = useState(false);

  const updateForm = <K extends keyof StudyPlanInput>(key: K, value: StudyPlanInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleCreatePlan = async () => {
    const name = form.name.trim();
    if (!name) {
      toast.error('Informe o nome do plano de estudos.');
      return;
    }

    setSavingPlan(true);
    try {
      const created = await createPlan({
        ...form,
        name,
        exam_name: form.exam_name?.trim(),
        board_name: form.board_name?.trim(),
        role_name: form.role_name?.trim(),
        description: form.description?.trim(),
        cover_image_url: form.cover_image_url?.trim(),
        review_interval_days: Number(form.review_interval_days) || 7,
      });

      if (created) {
        setPlan(created);
        setStep(1);
        toast.success('Plano e cronograma vinculado criados com sucesso.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível criar o plano de estudos.');
    } finally {
      setSavingPlan(false);
    }
  };

  return (
    <div className="space-y-5 pb-8">
      <section className="workspace-panel overflow-hidden p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-primary">Criação guiada</p>
            <h1 className="mt-1 text-2xl font-display font-bold text-foreground sm:text-3xl">Criar Plano de Estudos</h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
              Siga as etapas para sair com um plano funcional: dados do concurso, matérias, modelo semanal e cronograma vinculado.
            </p>
          </div>
          <Button variant="outline" onClick={() => (plan ? navigate(`/plans/${plan.id}`) : navigate('/plans'))}>
            {plan ? 'Abrir plano' : 'Voltar'}
          </Button>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-4">
          {STEPS.map((item, index) => {
            const active = index === step;
            const done = index < step;
            return (
              <button
                key={item.title}
                type="button"
                disabled={!plan && index > 0}
                onClick={() => plan && setStep(index)}
                className={`rounded-2xl border p-4 text-left transition ${
                  active
                    ? 'border-primary bg-primary/10 text-foreground shadow-sm'
                    : done
                      ? 'border-primary/30 bg-background text-foreground'
                      : 'border-border/70 bg-background/70 text-muted-foreground'
                } disabled:cursor-not-allowed disabled:opacity-60`}
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-primary">
                    {done ? <CheckCircle2 className="h-4 w-4" /> : index + 1}
                  </span>
                  {item.title}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.description}</p>
              </button>
            );
          })}
        </div>
      </section>

      {step === 0 ? (
        <PlanDataStep form={form} saving={savingPlan} updateForm={updateForm} onCreate={handleCreatePlan} />
      ) : null}

      {plan && step === 1 ? <PlanSubjectsStep plan={plan} onNext={() => setStep(2)} /> : null}
      {plan && step === 2 ? <PlanTemplateStep plan={plan} onNext={() => setStep(3)} onBack={() => setStep(1)} /> : null}
      {plan && step === 3 ? <PlanScheduleStep plan={plan} onBack={() => setStep(2)} /> : null}
    </div>
  );
}

function PlanDataStep({
  form,
  saving,
  updateForm,
  onCreate,
}: {
  form: StudyPlanInput;
  saving: boolean;
  updateForm: <K extends keyof StudyPlanInput>(key: K, value: StudyPlanInput[K]) => void;
  onCreate: () => Promise<void>;
}) {
  return (
    <section className="workspace-panel p-5 sm:p-6">
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">1. Cadastre o plano geral</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              O plano é o guarda-chuva do estudo, como “Soldado PMDF 2026”. Depois, as matérias, templates e cronograma ficarão dentro dele.
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="plan-name">Nome do plano *</Label>
            <Input id="plan-name" value={form.name} onChange={(event) => updateForm('name', event.target.value)} placeholder="Ex.: Soldado PMDF 2026" />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="grid gap-2">
              <Label htmlFor="exam-name">Concurso</Label>
              <Input id="exam-name" value={form.exam_name} onChange={(event) => updateForm('exam_name', event.target.value)} placeholder="Ex.: PMDF" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="board-name">Banca</Label>
              <Input id="board-name" value={form.board_name} onChange={(event) => updateForm('board_name', event.target.value)} placeholder="Ex.: Cebraspe" />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="role-name">Cargo</Label>
              <Input id="role-name" value={form.role_name} onChange={(event) => updateForm('role_name', event.target.value)} placeholder="Ex.: Soldado" />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="review-days">Revisão automática em dias</Label>
            <Input
              id="review-days"
              type="number"
              min={1}
              value={form.review_interval_days}
              onChange={(event) => updateForm('review_interval_days', Number(event.target.value))}
            />
            <p className="text-xs text-muted-foreground">Esse intervalo será usado pelo fluxo de revisões do plano.</p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="plan-description">Descrição</Label>
            <Textarea
              id="plan-description"
              value={form.description}
              onChange={(event) => updateForm('description', event.target.value)}
              placeholder="Objetivo, edital, observações e estratégia inicial do plano."
              rows={5}
            />
          </div>
        </div>

        <div className="space-y-4 rounded-2xl border border-border/70 bg-background/70 p-4">
          <ImageUpload
            value={form.cover_image_url}
            onChange={(url) => updateForm('cover_image_url', url)}
            folder="study-plans"
            label="Imagem/capa do plano"
            helperText="Use upload ou URL externa para deixar o plano visual e fácil de identificar."
            disabled={saving}
          />
          <div className="rounded-xl bg-primary/5 p-4 text-sm text-muted-foreground">
            <strong className="text-foreground">O que será criado agora?</strong>
            <p className="mt-1">Um plano de estudos e um cronograma vinculado. As próximas etapas usarão esse vínculo para não misturar dados globais.</p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end">
        <Button onClick={onCreate} disabled={saving} className="rounded-xl">
          {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ChevronRight className="mr-2 h-4 w-4" />}
          Criar plano e continuar
        </Button>
      </div>
    </section>
  );
}

function PlanSubjectsStep({ plan, onNext }: { plan: StudyPlan; onNext: () => void }) {
  const { loading, planSubjects, availableSubjects, addExistingSubjectToPlan, createAndLinkSubject, removeSubjectFromPlan } = usePlanSubjects(plan.id);
  const [subjectId, setSubjectId] = useState('');
  const [newSubject, setNewSubject] = useState({ name: '', category: '', color: '#5B8C7E', weekly_goal_hours: 4, monthly_goal_hours: 16 });
  const [saving, setSaving] = useState(false);

  const handleAddExisting = async () => {
    if (!subjectId) return;
    setSaving(true);
    await addExistingSubjectToPlan(subjectId);
    setSubjectId('');
    setSaving(false);
  };

  const handleCreate = async () => {
    if (!newSubject.name.trim()) {
      toast.error('Informe o nome da matéria.');
      return;
    }
    setSaving(true);
    const ok = await createAndLinkSubject(newSubject);
    if (ok) setNewSubject({ name: '', category: '', color: '#5B8C7E', weekly_goal_hours: 4, monthly_goal_hours: 16 });
    setSaving(false);
  };

  return (
    <section className="workspace-panel p-5 sm:p-6">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">2. Adicione matérias ao plano</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Escolha matérias já cadastradas ou crie uma nova matéria. Elas serão usadas no template semanal e no cronograma vinculado ao plano.
          </p>
        </div>
        <Button variant="outline" onClick={onNext} disabled={planSubjects.length === 0}>Continuar para template</Button>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
        <div className="space-y-4 rounded-2xl border border-border/70 bg-background/70 p-4">
          <div>
            <h3 className="font-semibold text-foreground">Vincular matéria existente</h3>
            <p className="text-sm text-muted-foreground">Use matérias do cadastro global sem duplicar dados desnecessariamente.</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto]">
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma matéria" />
              </SelectTrigger>
              <SelectContent>
                {availableSubjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleAddExisting} disabled={!subjectId || saving}>Adicionar</Button>
          </div>

          <div className="border-t border-border/70 pt-4">
            <h3 className="font-semibold text-foreground">Criar nova matéria neste plano</h3>
            <div className="mt-3 grid gap-3">
              <Input value={newSubject.name} onChange={(event) => setNewSubject((current) => ({ ...current, name: event.target.value }))} placeholder="Nome da matéria" />
              <div className="grid gap-3 sm:grid-cols-2">
                <Input value={newSubject.category} onChange={(event) => setNewSubject((current) => ({ ...current, category: event.target.value }))} placeholder="Categoria" />
                <Input type="color" value={newSubject.color} onChange={(event) => setNewSubject((current) => ({ ...current, color: event.target.value }))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input type="number" min={0} value={newSubject.weekly_goal_hours} onChange={(event) => setNewSubject((current) => ({ ...current, weekly_goal_hours: Number(event.target.value) }))} placeholder="Meta semanal" />
                <Input type="number" min={0} value={newSubject.monthly_goal_hours} onChange={(event) => setNewSubject((current) => ({ ...current, monthly_goal_hours: Number(event.target.value) }))} placeholder="Meta mensal" />
              </div>
              <Button onClick={handleCreate} disabled={saving}>{saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}Criar e vincular</Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-semibold text-foreground">Matérias do plano</h3>
            <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">{planSubjects.length} vinculadas</span>
          </div>
          {loading ? (
            <div className="mt-4 text-sm text-muted-foreground">Carregando matérias...</div>
          ) : planSubjects.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Adicione pelo menos uma matéria para avançar.</div>
          ) : (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {planSubjects.map((subject) => (
                <div key={subject.id} className="rounded-xl border border-border/70 bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: subject.color || '#5B8C7E' }} />
                        <h4 className="truncate font-semibold text-foreground">{subject.name}</h4>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">{subject.category || 'Sem categoria'}</p>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => removeSubjectFromPlan(subject.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function PlanTemplateStep({ plan, onBack, onNext }: { plan: StudyPlan; onBack: () => void; onNext: () => void }) {
  const { planSubjects } = usePlanSubjects(plan.id);
  const { templates, createTemplate, addTemplateItem, removeTemplateItem, applyTemplate } = useTemplates({ planId: plan.id, scheduleId: plan.schedule_id, includeGlobal: false });
  const [templateName, setTemplateName] = useState('Modelo semanal do plano');
  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [itemForm, setItemForm] = useState({ dayOfWeek: 1, subjectId: '', plannedMinutes: 60, startTime: '' });
  const selectedTemplate = useMemo(() => templates.find((template) => template.id === selectedTemplateId) || templates[0], [selectedTemplateId, templates]);

  const handleSelectDayToAdd = (dayOfWeek: number) => {
    if (!selectedTemplate) {
      toast.error('Crie um template antes de adicionar matérias.');
      return;
    }

    setItemForm((current) => ({ ...current, dayOfWeek }));
    document.getElementById('plan-template-add-item-form')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  const handleCreateTemplate = async () => {
    const id = await createTemplate({ name: templateName, planId: plan.id, scheduleId: plan.schedule_id || undefined, type: 'weekly', status: 'active' });
    if (id) {
      setSelectedTemplateId(id);
      toast.success('Template vinculado ao plano criado.');
    }
  };

  const handleAddItem = async () => {
    const targetTemplate = selectedTemplate?.id;
    if (!targetTemplate) {
      toast.error('Crie um template antes de adicionar matérias.');
      return;
    }
    if (!itemForm.subjectId) {
      toast.error('Selecione uma matéria.');
      return;
    }
    await addTemplateItem(targetTemplate, Number(itemForm.dayOfWeek), itemForm.subjectId, false, {
      plannedMinutes: Number(itemForm.plannedMinutes) || 60,
      startTime: itemForm.startTime || undefined,
    });
    setItemForm((current) => ({ ...current, subjectId: '', startTime: '' }));
  };

  const handleQuickApply = async () => {
    if (!selectedTemplate) return;
    const start = new Date();
    await applyTemplate(selectedTemplate.id, start, addDays(start, 6));
    toast.success('Modelo aplicado na semana atual do cronograma.');
    onNext();
  };

  return (
    <section className="workspace-panel p-5 sm:p-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div>
          <h2 className="text-xl font-display font-bold text-foreground">3. Monte o modelo semanal do plano</h2>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            Este fluxo usa a mesma lógica dos templates globais, mas salva o template com o plano e o cronograma vinculados.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onBack}><ChevronLeft className="mr-2 h-4 w-4" />Matérias</Button>
          <Button variant="outline" onClick={onNext}>Pular para cronograma</Button>
          <Button onClick={handleQuickApply} disabled={!selectedTemplate || selectedTemplate.items.length === 0}>Aplicar semana atual</Button>
        </div>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-[340px_1fr]">
        <div className="space-y-4 rounded-2xl border border-border/70 bg-background/70 p-4">
          <div>
            <h3 className="font-semibold text-foreground">Criar template</h3>
            <p className="text-sm text-muted-foreground">Crie um modelo semanal exclusivo deste plano.</p>
          </div>
          <div className="grid gap-2">
            <Input value={templateName} onChange={(event) => setTemplateName(event.target.value)} placeholder="Nome do template" />
            <Button onClick={handleCreateTemplate}><Plus className="mr-2 h-4 w-4" />Criar template</Button>
          </div>

          <div id="plan-template-add-item-form" className="border-t border-border/70 pt-4">
            <h3 className="font-semibold text-foreground">Adicionar item no template</h3>
            <p className="mt-1 text-xs text-muted-foreground">Clique no + de um dia para preencher automaticamente o dia da semana.</p>
            <div className="mt-3 grid gap-3">
              <Select value={selectedTemplate?.id || ''} onValueChange={setSelectedTemplateId}>
                <SelectTrigger><SelectValue placeholder="Template do plano" /></SelectTrigger>
                <SelectContent>
                  {templates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={String(itemForm.dayOfWeek)} onValueChange={(value) => setItemForm((current) => ({ ...current, dayOfWeek: Number(value) }))}>
                <SelectTrigger><SelectValue placeholder="Dia da semana" /></SelectTrigger>
                <SelectContent>{DAYS.map((day) => <SelectItem key={day.value} value={String(day.value)}>{day.label}</SelectItem>)}</SelectContent>
              </Select>
              <Select value={itemForm.subjectId} onValueChange={(value) => setItemForm((current) => ({ ...current, subjectId: value }))}>
                <SelectTrigger><SelectValue placeholder="Matéria" /></SelectTrigger>
                <SelectContent>{planSubjects.map((subject) => <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input type="time" value={itemForm.startTime} onChange={(event) => setItemForm((current) => ({ ...current, startTime: event.target.value }))} />
                <Input type="number" min={1} value={itemForm.plannedMinutes} onChange={(event) => setItemForm((current) => ({ ...current, plannedMinutes: Number(event.target.value) }))} placeholder="Minutos" />
              </div>
              <Button onClick={handleAddItem}>Adicionar matéria ao dia</Button>
            </div>
          </div>
        </div>

        <TemplateWeekBoard template={selectedTemplate} subjects={planSubjects} onRemove={removeTemplateItem} onSelectDayToAdd={handleSelectDayToAdd} />
      </div>
    </section>
  );
}

function TemplateWeekBoard({
  template,
  subjects,
  onRemove,
  onSelectDayToAdd,
}: {
  template: any;
  subjects: any[];
  onRemove: (itemId: string) => Promise<void>;
  onSelectDayToAdd: (dayOfWeek: number) => void;
}) {
  const subjectById = useMemo(() => new Map(subjects.map((subject) => [subject.id, subject])), [subjects]);

  return (
    <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-foreground">{template?.name || 'Nenhum template criado'}</h3>
          <p className="text-sm text-muted-foreground">Visualização semanal do modelo do plano.</p>
        </div>
        <span className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">{template?.items?.length || 0} itens</span>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        {DAYS.map((day) => {
          const items = template?.items?.filter((item: any) => item.dayOfWeek === day.value) || [];
          return (
            <div key={day.value} className="min-h-44 rounded-2xl border border-border/70 bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h4 className="font-semibold text-foreground">{day.label}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{items.length} itens</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="outline"
                    className="h-7 w-7 rounded-full"
                    onClick={() => onSelectDayToAdd(day.value)}
                    title={`Adicionar matéria em ${day.label}`}
                    disabled={!template}
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="mt-4 space-y-2">
                {items.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Vazio</p>
                ) : (
                  items.map((item: any) => {
                    const subject = subjectById.get(item.subjectId);
                    return (
                      <div key={item.id} className="rounded-xl border border-border/70 bg-background p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full" style={{ backgroundColor: subject?.color || '#5B8C7E' }} />
                              <p className="truncate text-sm font-medium text-foreground">{subject?.name || 'Matéria'}</p>
                            </div>
                            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {item.startTime || 'Sem horário'} • {item.plannedMinutes || 60} min
                            </p>
                          </div>
                          <Button size="icon" variant="ghost" onClick={() => onRemove(item.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function PlanScheduleStep({ plan, onBack }: { plan: StudyPlan; onBack: () => void }) {
  const navigate = useNavigate();
  const { templates, applyTemplate } = useTemplates({ planId: plan.id, scheduleId: plan.schedule_id, includeGlobal: false });
  const [templateId, setTemplateId] = useState('');
  const [startDate, setStartDate] = useState(formatDateInput(new Date()));
  const [endDate, setEndDate] = useState(formatDateInput(addDays(new Date(), 6)));
  const selectedTemplateId = templateId || templates[0]?.id || '';

  const handleApply = async () => {
    if (!selectedTemplateId) {
      toast.error('Crie ou selecione um template antes de aplicar.');
      return;
    }
    await applyTemplate(selectedTemplateId, new Date(`${startDate}T00:00:00`), new Date(`${endDate}T23:59:59`));
    toast.success('Cronograma do plano gerado com sucesso.');
  };

  return (
    <section className="workspace-panel p-5 sm:p-6">
      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-display font-bold text-foreground">4. Gere o cronograma vinculado</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Aplique o template em um período. As entradas serão criadas no cronograma exclusivo deste plano.
            </p>
          </div>

          <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
            <div className="grid gap-3">
              <Label>Template do plano</Label>
              <Select value={selectedTemplateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue placeholder="Selecione o template" /></SelectTrigger>
                <SelectContent>{templates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent>
              </Select>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Data inicial</Label>
                  <Input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
                </div>
                <div className="grid gap-2">
                  <Label>Data final</Label>
                  <Input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
                </div>
              </div>
              <Button onClick={handleApply}><CalendarDays className="mr-2 h-4 w-4" />Aplicar template no cronograma</Button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
          <h3 className="font-semibold text-foreground">Plano pronto para uso</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Depois de aplicar o template, abra a tela do plano. Ela será o centro do estudo, com o cronograma como foco principal e atalhos para matérias, templates, revisões e estatísticas.
          </p>
          <div className="mt-5 flex flex-col gap-2 sm:flex-row">
            <Button variant="outline" onClick={onBack}><ChevronLeft className="mr-2 h-4 w-4" />Voltar ao template</Button>
            <Button onClick={() => navigate(`/plans/${plan.id}`)}>Finalizar e abrir plano</Button>
          </div>
        </div>
      </div>
    </section>
  );
}

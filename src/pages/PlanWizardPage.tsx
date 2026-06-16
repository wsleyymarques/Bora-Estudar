import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen, CheckCircle2, ChevronRight, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

import { ImageUpload } from '@/components/generic/image-upload';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { StudyPlan, StudyPlanInput, useStudyPlans } from '@/hooks/useStudyPlans';
import { SubjectSelector } from '@/components/subjects/SubjectSelector';
import { cn } from '@/lib/utils';

const STEPS = [
  {
    number: 1,
    title: 'Dados do plano',
    subtitle: 'Informações gerais',
    description: 'Defina o nome, tipo e imagem do seu plano de estudos. Esse será o ponto central da sua preparação.',
  },
  {
    number: 2,
    title: 'Matérias',
    subtitle: 'Monte seu conteúdo',
    description: 'Adicione as matérias que você vai estudar neste plano. Você poderá gerenciá-las depois.',
  },
];

const INITIAL_FORM: StudyPlanInput & { plan_type: string } = {
  name: '',
  exam_name: '',
  board_name: '',
  role_name: '',
  description: '',
  cover_image_url: '',
  review_interval_days: 7,
  plan_type: 'concurso',
};

export default function PlanWizardPage() {
  const navigate = useNavigate();
  const { createPlan } = useStudyPlans();
  const [step, setStep] = useState(0);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [savingPlan, setSavingPlan] = useState(false);

  const updateForm = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleCreatePlan = async () => {
    const name = form.plan_type === 'concurso'
      ? (form.exam_name || '').trim()
      : form.name.trim();

    if (!name) {
      toast.error(form.plan_type === 'concurso' ? 'Informe o nome do concurso.' : 'Informe o nome do plano.');
      return;
    }

    setSavingPlan(true);
    try {
      const created = await createPlan({
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
        toast.success('Plano criado com sucesso! Agora adicione suas matérias.');
      }
    } catch (error) {
      console.error(error);
      toast.error('Não foi possível criar o plano de estudos.');
    } finally {
      setSavingPlan(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-6rem)] flex flex-col">
      {/* HEADER */}
      <div className="sticky top-0 z-40 shrink-0 px-4 md:px-1 pb-4 pt-4 md:pt-2 -mx-4 md:mx-0 bg-background border-b border-border/50 mb-6 shadow-sm">
        {/* Fill the gap above the sticky header (caused by main's padding) to prevent scrolling content from bleeding through */}
        <div className="absolute left-0 right-0 bottom-full h-[200px] bg-background pointer-events-none" />
        
        <div className="flex items-center gap-3 mb-4 relative">
          <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-display font-black tracking-tight">Novo Plano de Estudos</h1>
            <p className="text-xs text-muted-foreground font-medium">Siga os passos abaixo para começar sua preparação.</p>
          </div>
        </div>

        {/* STEP INDICATORS */}
        <div className="flex items-start justify-center pt-4 pb-6">
          <div className="flex items-start gap-2 md:gap-4">
            {STEPS.map((s, i) => {
              const active = i === step;
              const done = i < step;
              return (
                <div key={s.number} className="flex items-start gap-2 md:gap-4">
                  <div className="flex flex-col items-center gap-2">
                    <button
                      type="button"
                      disabled={!plan && i > 0}
                      onClick={() => plan && setStep(i)}
                      className={cn(
                        "h-12 w-12 rounded-full flex items-center justify-center font-black text-base transition-all",
                        (!plan && i > 0) && "cursor-not-allowed opacity-60",
                        active ? "bg-primary text-white shadow-lg shadow-primary/30 scale-105" 
                          : done ? "bg-primary/20 text-primary hover:bg-primary/30" 
                          : "bg-secondary text-muted-foreground border border-border/50"
                      )}
                    >
                      {done ? <CheckCircle2 className="h-6 w-6" /> : s.number}
                    </button>
                    <p className={cn("font-bold text-[11px] md:text-xs text-center w-24 leading-tight", active ? "text-foreground" : "text-muted-foreground")}>
                      {s.title}
                    </p>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div className={cn(
                      "h-1 w-12 md:w-24 rounded-full transition-colors mt-[22px]",
                      done ? "bg-primary" : "bg-secondary border border-border/50"
                    )} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* STEP CONTENT */}
      <div className="flex-1">
        {step === 0 && (
          <PlanDataStep
            form={form}
            saving={savingPlan}
            updateForm={updateForm}
            onCreate={handleCreatePlan}
          />
        )}

        {plan && step === 1 && (
          <PlanSubjectsStep
            plan={plan}
            onFinish={() => navigate(`/plans/${plan.id}`)}
          />
        )}
      </div>
    </div>
  );
}

/* ─────────── STEP 1: DADOS DO PLANO ─────────── */

function PlanDataStep({
  form,
  saving,
  updateForm,
  onCreate,
}: {
  form: typeof INITIAL_FORM;
  saving: boolean;
  updateForm: <K extends keyof typeof INITIAL_FORM>(key: K, value: (typeof INITIAL_FORM)[K]) => void;
  onCreate: () => Promise<void>;
}) {
  return (
    <div className="pb-56 md:pb-4">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        {/* LEFT: FORM */}
      <div className="glass-card p-5 space-y-4">
        <div>
          <h2 className="text-xl font-display font-black tracking-tight">Informações do Plano</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Preencha os dados abaixo. Se for um concurso, o nome do concurso será o nome do plano automaticamente.
          </p>
        </div>

        {/* TIPO DO PLANO */}
        <div className="grid gap-1">
          <Label className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground">Tipo do plano *</Label>
          <Select
            value={form.plan_type}
            onValueChange={(val) => {
              updateForm('plan_type', val as any);
              if (val === 'concurso') {
                updateForm('name', form.exam_name || form.name);
              }
            }}
          >
            <SelectTrigger className="h-12 rounded-xl border-2 text-base font-medium">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="concurso">🎯 Concurso Público</SelectItem>
              <SelectItem value="faculdade">📚 Faculdade / Acadêmico</SelectItem>
              <SelectItem value="outro">✨ Outro / Personalizado</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-[10px] text-muted-foreground ml-1">
            O tipo define quais campos extras aparecerão abaixo.
          </p>
        </div>

        {/* CAMPOS CONDICIONAIS */}
        {form.plan_type === 'concurso' ? (
          <div className="space-y-4">
            <div className="grid gap-1">
              <Label className="font-bold text-xs">Concurso *</Label>
              <Input
                value={form.exam_name}
                onChange={(e) => {
                  updateForm('exam_name', e.target.value);
                  updateForm('name', e.target.value);
                }}
                className="h-12 rounded-xl border-2 text-base"
                placeholder="Ex: PMDF, Receita Federal, TRT-3"
              />
              <p className="text-[10px] text-muted-foreground ml-1">
                Este será o nome principal do seu plano.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-1">
                <Label className="font-bold text-xs">Banca</Label>
                <Input
                  value={form.board_name}
                  onChange={(e) => updateForm('board_name', e.target.value)}
                  className="h-12 rounded-xl border-2"
                  placeholder="Ex: CEBRASPE, FGV, VUNESP"
                />
                <p className="text-[10px] text-muted-foreground ml-1">
                  Saber a banca ajuda a personalizar a estratégia.
                </p>
              </div>
              <div className="grid gap-1">
                <Label className="font-bold text-xs">Cargo</Label>
                <Input
                  value={form.role_name}
                  onChange={(e) => updateForm('role_name', e.target.value)}
                  className="h-12 rounded-xl border-2"
                  placeholder="Ex: Soldado, Analista, Auditor"
                />
                <p className="text-[10px] text-muted-foreground ml-1">
                  O cargo aparecerá como subtítulo no seu dashboard.
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="grid gap-2">
            <Label className="font-bold">Nome do plano *</Label>
            <Input
              value={form.name}
              onChange={(e) => updateForm('name', e.target.value)}
              className="h-12 rounded-xl border-2 text-base"
              placeholder="Ex: Semestre 2026.1, Preparação OAB"
            />
            <p className="text-[10px] text-muted-foreground ml-1">
              Escolha um nome que identifique facilmente seus objetivos de estudo.
            </p>
          </div>
        )}


        {/* DESCRIÇÃO */}
        <div className="grid gap-1">
          <Label className="font-bold text-xs">Descrição <span className="text-muted-foreground font-normal">(opcional)</span></Label>
          <Textarea
            value={form.description}
            onChange={(e) => updateForm('description', e.target.value)}
            className="rounded-xl border-2 resize-none min-h-[60px]"
            placeholder="Descreva seus objetivos, estratégias ou observações sobre este plano..."
          />
        </div>
      </div>

      {/* RIGHT: IMAGE + INFO */}
      <div className="space-y-4">
        <div className="glass-card p-5 space-y-3">
          <Label className="font-bold text-xs">Imagem de Capa</Label>
          <ImageUpload
            value={form.cover_image_url}
            onChange={(url) => updateForm('cover_image_url', url)}
            folder="study-plans"
            label="Imagem do plano"
            helperText="Use uma imagem que represente seu concurso ou objetivo. Ela aparecerá no banner do dashboard."
            disabled={saving}
          />
        </div>

        <div className="glass-card p-5 bg-primary/5 border-primary/10">
          <div className="flex items-start gap-3">
            <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-foreground">O que acontece ao criar?</h3>
              <ul className="mt-2 space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>
                    Um <strong className="text-foreground">plano de estudos</strong> será criado com as informações acima
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>
                    Um <strong className="text-foreground">cronograma exclusivo</strong> será vinculado automaticamente
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span>
                    Na próxima etapa, você adicionará as <strong className="text-foreground">matérias</strong> que vai estudar
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>

        </div>
      </div>

      <div className="fixed bottom-24 md:bottom-8 left-0 md:left-[var(--sidebar-width,16rem)] right-0 z-50 flex justify-center pointer-events-none">
        <div className="w-full max-w-xl px-4 lg:px-0 pointer-events-auto">
          <Button
            onClick={onCreate}
            disabled={saving}
            className="w-full h-14 rounded-3xl font-black text-sm uppercase tracking-widest shadow-xl shadow-primary/25 transition-all hover:shadow-2xl hover:shadow-primary/40 active:scale-[0.98] bg-primary hover:bg-primary/90 text-primary-foreground"
            size="lg"
          >
            {saving ? (
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            ) : (
              <ChevronRight className="mr-2 h-5 w-5" />
            )}
            {saving ? 'Criando plano...' : 'Criar plano e continuar'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ... (STEPS and INITIAL_FORM remain the same)

/* ─────────── STEP 2: MATÉRIAS ─────────── */

function PlanSubjectsStep({ plan, onFinish }: { plan: StudyPlan; onFinish: () => void }) {
  return (
    <SubjectSelector 
      planId={plan.id} 
      onFinish={onFinish} 
      showFinishButton={true} 
    />
  );
}

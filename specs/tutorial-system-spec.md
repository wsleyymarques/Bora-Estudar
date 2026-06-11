# Specify: Sistema de Tutorial Step-by-Step "Bora Estudar"

> **Versão:** 1.0.0  
> **Data:** 2026-06-08  
> **Status:** Baseline Specification

---

## 1. Visão Geral

Sistema de tutorial **genérico, data-driven e versionado** que guia usuários recém-cadastrados em dois fluxos distintos:

| Fluxo | Trigger | Objetivo | Duração Estimada |
|-------|---------|----------|------------------|
| **Criar Plano** | Botão "Criar Plano" no dashboard | Onboarding completo: definir metas, matérias, rotina, preferências | 5-8 min |
| **Criar Cronograma Avulso** | Botão "Cronograma Avulso" | Criação rápida de uma agenda única (prova, concurso, evento) | 2-3 min |

**Princípio norteador:** Uma única engine (`tutorial-engine`) executa *recipes* declarativas. Adicionar fluxo novo = novo arquivo YAML, **zero código**.

---

## 2. Personas & Jornada

### Persona Primária: "Estudante Organizado(a)"
- Idade: 16-35 anos
- Objetivo: Passar em concurso/vestibular/certificação
- Dor: "Não sei por onde começar", "Me perco na organização"
- Tech comfort: Médio (usa apps, mas não é dev)

### Jornada Pós-Cadastro

```
Cadastro Concluído
       │
       ▼
┌──────────────────┐
│  Modal Boas-vindas  │  (1 screen: "Bem-vindo! Como quer começar?")
│  [Criar Plano]      │
│  [Cronograma Avulso]│
└────────┬─────────┘
         │
    ┌────┴────┐
    ▼         ▼
CRIAR PLANO  CRONOGRAMA
  (recipe)    AVULSO (recipe)
    │         │
    ▼         ▼
Fluxo 5-8    Fluxo 2-3
 steps       steps
    │         │
    └────┬────┘
         ▼
  Dashboard Principal
  (tutorial completo = badge "Onboarding ✓")
```

---

## 3. Especificação Funcional

### 3.1 Engine Core (`tutorial-engine`)

#### State Machine

```typescript
type TutorialState =
  | { status: 'idle' }
  | { status: 'running'; recipeId: string; currentStepIndex: number; stepData: Record<string, unknown>; completedSteps: string[] }
  | { status: 'paused'; recipeId: string; currentStepIndex: number; stepData: Record<string, unknown> }
  | { status: 'completed'; recipeId: string; completedAt: string; finalData: Record<string, unknown> }
  | { status: 'aborted'; recipeId: string; reason: 'user' | 'error'; atStep: number }
```

#### API Pública

```typescript
interface TutorialEngine {
  // Inicia recipe pelo ID
  start(recipeId: string, initialData?: Record<string, unknown>): Promise<void>
  
  // Avança para próximo step (valida step atual)
  next(): Promise<void>
  
  // Volta step anterior
  previous(): Promise<void>
  
  // Pula step atual (se opcional)
  skip(): Promise<void>
  
  // Aborta tutorial
  abort(reason?: string): Promise<void>
  
  // Retorna estado atual (reativo)
  getState(): TutorialState
  
  // Subscrição reativa (observer pattern)
  subscribe(listener: (state: TutorialState) => void): () => void
  
  // Persiste/restaura progresso
  persist(): Promise<void>
  restore(): Promise<void>
}
```

#### Eventos Emitidos

```typescript
type TutorialEvent =
  | { type: 'tutorial:start'; recipeId: string; timestamp: string }
  | { type: 'tutorial:step:start'; recipeId: string; stepId: string; index: number; timestamp: string }
  | { type: 'tutorial:step:complete'; recipeId: string; stepId: string; index: number; data: unknown; timestamp: string }
  | { type: 'tutorial:step:skip'; recipeId: string; stepId: string; index: number; timestamp: string }
  | { type: 'tutorial:complete'; recipeId: string; finalData: Record<string, unknown>; timestamp: string }
  | { type: 'tutorial:abort'; recipeId: string; reason: string; atStep: number; timestamp: string }
  | { type: 'tutorial:error'; recipeId: string; stepId: string; error: Error; timestamp: string }
```

---

### 3.2 Recipe Schema (YAML)

```yaml
# recipes/criar-plano.yaml
schemaVersion: 1
id: criar-plano
title: "Criar seu Plano de Estudos"
description: "Vamos montar seu plano personalizado passo a passo"
estimatedMinutes: 7

# Metadados para UI
metadata:
  category: onboarding
  icon: "📋"
  color: "#6366f1"
  requiredForBadge: true

# Configuração global
settings:
  allowSkip: true           # Usuário pode pular steps opcionais
  allowBack: true           # Navegação livre
  persistProgress: true     # Salva no localStorage/IndexedDB
  autoAdvance: false        # Não avança sozinho
  showProgressBar: true
  showStepNumbers: true

# Dados iniciais (merge com initialData do start())
initialData:
  userName: ""              # Será preenchido via auth context
  goals: []
  subjects: []
  weeklyHours: 10
  preferredTimes: []

# Definição dos Steps
steps:
  - id: welcome
    type: info
    title: "Bem-vindo ao Bora Estudar! 🎓"
    content: |
      Olá, {{userName}}! Vamos criar seu plano de estudos personalizado.
      São só alguns passos rápidos — uns 7 minutinhos.
    cta:
      label: "Vamos lá!"
      action: next
    validation: null
    optional: false

  - id: goal-selection
    type: multi-select
    title: "Qual seu objetivo principal?"
    content: "Pode escolher mais de um — isso ajuda a gente sugerir as matérias certas."
    options:
      - id: concurso
        label: "Concurso Público"
        icon: "🏛️"
        description: "Preparação para editais federais, estaduais, municipais"
      - id: vestibular
        label: "Vestibular / ENEM"
        icon: "🎓"
        description: "Ensino médio, ENEM, vestibulares tradicionais"
      - id: certificacao
        label: "Certificação Profissional"
        icon: "📜"
        description: "AWS, PMP, CFA, CPA, idiomas, etc."
      - id: rotina
        label: "Criar Rotina de Estudos"
        icon: "📅"
        description: "Organizar horários, revisar conteúdo, manter constância"
      - id: outro
        label: "Outro"
        icon: "✨"
        description: "Objetivo personalizado"
    validation:
      minSelections: 1
      maxSelections: 3
    mapsTo: goals
    optional: false

  - id: subject-selection
    type: multi-select
    title: "Quais matérias você quer estudar?"
    content: "Baseado no seu objetivo ({{goals}}), sugerimos algumas. Adicione ou remova à vontade."
    options: # Populado dinamicamente via subjectRegistry
      - id: portugues
        label: "Português"
        icon: "📝"
      - id: matematica
        label: "Matemática"
        icon: "🔢"
      - id: direito
        label: "Direito"
        icon: "⚖️"
      # ... mais opções
    validation:
      minSelections: 1
    mapsTo: subjects
    optional: false
    dependsOn: [goal-selection] # Re-render quando goals muda

  - id: routine-config
    type: form
    title: "Como é sua rotina semanal?"
    content: "Quanto tempo você tem? Quais horários funcionam?"
    fields:
      - name: weeklyHours
        type: number
        label: "Horas por semana"
        min: 1
        max: 80
        step: 1
        default: 10
        help: "Some todos os dias. Ex: 2h/dia × 5 dias = 10h"
      - name: preferredTimes
        type: multi-select
        label: "Melhores horários"
        options:
          - id: manha
            label: "Manhã (6h-12h)"
          - id: tarde
            label: "Tarde (12h-18h)"
          - id: noite
            label: "Noite (18h-23h)"
          - id: madrugada
            label: "Madrugada (23h-6h)"
        validation:
          minSelections: 1
    validation:
      required: [weeklyHours, preferredTimes]
    mapsTo: [weeklyHours, preferredTimes]
    optional: false

  - id: study-method
    type: single-select
    title: "Como você prefere estudar?"
    content: "Isso define como vamos estruturar seus ciclos."
    options:
      - id: pomodoro
        label: "Pomodoro (25min foco + 5min pausa)"
        icon: "🍅"
      - id: deep-work
        label: "Deep Work (90min blocos longos)"
        icon: "🧠"
      - id: intercalado
        label: "Intercalado (matérias diferentes por dia)"
        icon: "🔄"
      - id: revisao-ativa
        label: "Revisão Ativa (flashcards, questões)"
        icon: "🃏"
    mapsTo: studyMethod
    optional: true # Skipável

  - id: confirm-summary
    type: confirmation
    title: "Tudo certo? Bora gerar seu plano! 🚀"
    content: |
      **Resumo do seu plano:**
      - Objetivos: {{goals}}
      - Matérias: {{subjects}}
      - Carga semanal: {{weeklyHours}}h
      - Horários: {{preferredTimes}}
      - Método: {{studyMethod || 'Padrão (Pomodoro)')}}
    cta:
      label: "Gerar Plano ✨"
      action: complete
      variant: primary
    optional: false

  - id: success
    type: success
    title: "Plano criado com sucesso! 🎉"
    content: |
      Seu plano está pronto no dashboard. A gente te avisa quando for hora de estudar.
    cta:
      label: "Ir para o Dashboard"
      action: complete
      variant: primary
    optional: false
    onComplete: # Actions após completar
      - action: emit
        event: plan:created
        payload: { recipeId: 'criar-plano', ...finalData }
      - action: navigate
        path: /dashboard
```

```yaml
# recipes/cronograma-avulso.yaml
schemaVersion: 1
id: cronograma-avulso
title: "Criar Cronograma Avulso"
description: "Agenda rápida para prova, concurso ou evento específico"
estimatedMinutes: 3

metadata:
  category: quick-action
  icon: "📅"
  color: "#10b981"
  requiredForBadge: false

settings:
  allowSkip: true
  allowBack: true
  persistProgress: true
  autoAdvance: false
  showProgressBar: true
  showStepNumbers: false # Mais clean para fluxo curto

initialData:
  eventDate: null
  eventName: ""
  subjects: []
  dailyHours: 2

steps:
  - id: event-info
    type: form
    title: "Sobre o evento/prova"
    content: "Quando é? Como se chama?"
    fields:
      - name: eventName
        type: text
        label: "Nome do evento/prova"
        placeholder: "Ex: Concurso TRF 2024, Prova OAB, ENEM"
        validation:
          required: true
          minLength: 3
          maxLength: 100
      - name: eventDate
        type: date
        label: "Data da prova/evento"
        validation:
          required: true
          min: "{{today}}" # Não pode ser no passado
    mapsTo: [eventName, eventDate]
    optional: false

  - id: subject-priority
    type: multi-select
    title: "Quais matérias caem na prova?"
    content: "Ordene por prioridade (arraste) — a gente foca nas mais importantes."
    options: # Dinâmico via subjectRegistry
      - id: portugues
        label: "Português"
      - id: matematica
        label: "Matemática"
      - id: direito-constitucional
        label: "Direito Constitucional"
      # ...
    validation:
      minSelections: 1
    mapsTo: subjects
    optional: false
    ui:
      draggable: true # Permite reordenar

  - id: intensity
    type: single-select
    title: "Quanto tempo você tem por dia?"
    content: "Seja realista — consistência > intensidade."
    options:
      - id: light
        label: "Leve (1-2h/dia)"
        value: 1.5
      - id: moderate
        label: "Moderado (3-4h/dia)"
        value: 3.5
      - id: intense
        label: "Intenso (5-6h/dia)"
        value: 5.5
      - id: custom
        label: "Personalizado"
        value: null
        showsField: dailyHoursCustom
    mapsTo: dailyHours
    optional: false

  - id: dailyHoursCustom
    type: form
    title: "Horas por dia"
    content: "Quantas horas reais você consegue?"
    fields:
      - name: dailyHours
        type: number
        label: "Horas/dia"
        min: 0.5
        max: 12
        step: 0.5
    dependsOn:
      - step: intensity
        condition: "value === 'custom'"
    mapsTo: dailyHours
    optional: false

  - id: generate-schedule
    type: confirmation
    title: "Pronto para gerar! 📋"
    content: |
      **Seu cronograma:**
      - Evento: {{eventName}} ({{eventDate}})
      - Matérias: {{subjects.length}} selecionadas
      - Tempo/dia: {{dailyHours}}h
      - Dias até a prova: {{daysUntilEvent}}
    cta:
      label: "Gerar Cronograma 🚀"
      action: complete
      variant: primary
    optional: false

  - id: success
    type: success
    title: "Cronograma pronto! 🎯"
    content: |
      Seu cronograma semanal está no dashboard. Boa sorte na {{eventName}}!
    cta:
      label: "Ver Cronograma"
      action: complete
      variant: primary
    onComplete:
      - action: emit
        event: schedule:created
        payload: { recipeId: 'cronograma-avulso', ...finalData }
      - action: navigate
        path: /dashboard?tab=schedule
```

---

### 3.3 Step Types (Tipos de Step Suportados)

| Type | Descrição | Props Principais | Validação |
|------|-----------|------------------|-----------|
| `info` | Texto informativo + CTA | `content`, `cta` | Nenhuma |
| `single-select` | Escolha única (radio/cards) | `options`, `mapsTo` | `required` |
| `multi-select` | Múltipla escolha (checkbox/cards) | `options`, `validation.min/max`, `mapsTo` | `minSelections`, `maxSelections` |
| `form` | Formulário multi-campo | `fields[]`, `validation` | Por field + form-level |
| `confirmation` | Resumo + confirmação final | `content` (template), `cta` | `required: true` implícito |
| `success` | Tela final de sucesso | `content`, `cta`, `onComplete[]` | Nenhuma |
| `custom` | Componente customizado (React/Vue) | `component`, `props` | Definido pelo componente |

---

### 3.4 Persistence Schema

```typescript
// localStorage key: `tutorial:progress:${recipeId}`
interface PersistedProgress {
  schemaVersion: number
  recipeId: string
  currentStepIndex: number
  stepData: Record<string, unknown>
  completedSteps: string[]
  startedAt: string // ISO 8601
  lastActiveAt: string
  version: number // Recipe version at start
}
```

**Migração automática:**
- Se `schemaVersion` mudou → reset progress (breaking)
- Se `version` (recipe) mudou → tentar mapear steps por ID; steps novos = não completados; steps removidos = ignorados

---

### 3.5 Integração com Auth/Context

```typescript
// Hook para React (exemplo)
function useTutorial(recipeId: string) {
  const { user } = useAuth()
  const engine = useMemo(() => createEngine({
    recipes: recipeRegistry,
    persistence: createLocalStorageAdapter(`tutorial:progress:${recipeId}`),
    analytics: createAnalyticsAdapter(),
    context: { userName: user?.name, userId: user?.id, today: new Date().toISOString() }
  }), [recipeId])
  
  return engine
}
```

**Variáveis de template disponíveis nos YAMLs:**
- `{{userName}}`, `{{userId}}`, `{{userEmail}}`
- `{{today}}` (YYYY-MM-DD)
- `{{now}}` (ISO 8601)
- Qualquer campo de `initialData` ou `stepData` já preenchido

---

### 3.6 Acessibilidade (A11y) - Requisitos Mínimos

| Requisito | Implementação |
|-----------|---------------|
| Navegação teclado | `Tab`/`Shift+Tab` entre elementos, `Enter`/`Space` em botões, `Esc` = fechar/voltar |
| ARIA | `role="dialog"` no modal, `aria-label` nos steps, `aria-live="polite"` no progresso |
| Focus management | Focus trap no modal; foco vai para primeiro elemento interativo ao abrir step |
| Contraste | 4.5:1 mínimo (text), 3:1 (UI components) |
| Motion reduction | `prefers-reduced-motion` → desativa animações de transição |
| Screen readers | Step announcements: "Passo 3 de 7: Quais matérias..." |

---

### 3.7 Analytics Events (Padrão)

```typescript
// Enviados via analytics adapter (GA4, Mixpanel, Amplitude, custom)
interface AnalyticsEvent {
  event: string // 'tutorial_start', 'tutorial_step_complete', etc.
  properties: {
    recipe_id: string
    recipe_version: number
    step_id: string
    step_index: number
    step_type: string
    time_in_step_ms: number
    is_skipped: boolean
    // Dados do step (sanitizados - sem PII)
    step_data_keys: string[]
  }
  user_id: string
  timestamp: string
}
```

---

## 4. Non-Functional Requirements

| Categoria | Requisito |
|-----------|-----------|
| **Performance** | Engine core < 5KB gzipped; init < 10ms; step transition < 50ms |
| **Bundle** | Tree-shakable; só carrega step types usados |
| **Compatibilidade** | Evergreen browsers (últimas 2 versões); React 18+, Vue 3+, Svelte 4+ |
| **Offline** | Funciona 100% offline (localStorage); sync quando online |
| **Segurança** | Zero XSS (template sanitization); CSP compatible |
| **Internacionalização** | i18n-ready: strings em arquivos separados, `intl` template syntax |

---

## 5. Fora de Escopo (v1)

- ❌ Tutorial em vídeo/áudio
- ❌ IA generativa para criar recipes
- ❌ Multi-dispositivo sync (requer backend)
- ❌ A/B testing built-in (usa analytics externo)
- ❌ Gamificação (badges, streaks) — separado

---

## 6. Critérios de Aceite (Definition of Done)

1. [ ] Engine core passa todos os unit tests (>95% coverage)
2. [ ] Recipe `criar-plano` roda E2E no Cypress/Playwright
3. [ ] Recipe `cronograma-avulso` roda E2E
4. [ ] React adapter tem Storybook stories para todos step types
5. [ ] Axe-core audit passa (zero violations)
6. [ ] Bundle size < 8KB gzipped (core + react adapter)
7. [ ] Migração de progresso testada (v1 → v2 recipe)
8. [ ] Documentação completa: README, API docs, recipe authoring guide
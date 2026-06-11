# Plano de Implementação: Sistema de Tutorial Step-by-Step

> **Para Hermes:** Use subagent-driven-development skill para implementar task-by-task.
>
> **Goal:** Implementar engine genérico de tutorial + 2 recipes (criar-plano, cronograma-avulso) + React adapter + persistência + analytics.
>
> **Architecture:** Monorepo TypeScript (pnpm workspaces) com packages: `tutorial-engine`, `tutorial-recipes`, `tutorial-react`, `tutorial-persistence`, `tutorial-analytics`. Engine pura (zero deps), adapters opcionais.
>
> **Tech Stack:** TypeScript 5.5+, Zod 3.23 (validação), pnpm 9, Vitest, React 18, Storybook 8, ESLint 9, Prettier, conventional commits + semantic-release.

---

## Estrutura do Monorepo

```
bora-estudar/
├── .speckit/constitution.md
├── specs/tutorial-system-spec.md
├── plans/2026-06-08_tutorial-system-plan.md    ← ESTE ARQUIVO
├── tasks/                                      ← tarefas granulares (próximo passo)
├── package.json                                # root: pnpm workspaces
├── pnpm-workspace.yaml
├── tsconfig.base.json
├── .eslintrc.json
├── .prettierrc
├── packages/
│   ├── tutorial-engine/        # Core: state machine, registry, events, types
│   ├── tutorial-recipes/       # YAML recipes + schema validation + registry
│   ├── tutorial-react/         # React hooks, components, providers
│   ├── tutorial-persistence/   # Adapters: localStorage, IndexedDB, memory
│   └── tutorial-analytics/     # Event collector + providers (GA4, Mixpanel, custom)
├── apps/
│   └── web/                    # App Next.js/React (consumidor de exemplo)
└── tools/
    └── recipe-validator/       # CLI para validar recipes YAML
```

---

## Fase 1: Fundação & Core Engine (Packages: engine, recipes, persistence)

### Task 1.1: Setup Monorepo & Tooling

**Objective:** Configurar workspace pnpm, TypeScript, ESLint, Prettier, Vitest base.

**Files:**
- Create: `package.json` (root)
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.eslintrc.json`
- Create: `.prettierrc`
- Create: `vitest.config.ts` (root)
- Create: `.github/workflows/ci.yml`

**Step 1: Write root package.json**
```json
{
  "name": "bora-estudar",
  "version": "0.0.0",
  "private": true,
  "scripts": {
    "build": "pnpm -r run build",
    "test": "pnpm -r run test",
    "lint": "pnpm -r run lint",
    "format": "prettier --write \"**/*.{ts,tsx,json,md,yaml,yml}\"",
    "validate:recipes": "pnpm --filter tutorial-recipes run validate",
    "changeset": "changeset",
    "version": "changeset version",
    "release": "pnpm build && changeset publish"
  },
  "devDependencies": {
    "@changesets/cli": "^2.27.1",
    "@types/node": "^20.12.0",
    "eslint": "^9.0.0",
    "prettier": "^3.2.5",
    "typescript": "^5.4.0",
    "vitest": "^1.4.0"
  },
  "engines": { "node": ">=20.0.0" },
  "packageManager": "pnpm@9.0.0"
}
```

**Step 2: Write pnpm-workspace.yaml**
```yaml
packages:
  - packages/*
  - apps/*
  - tools/*
```

**Step 3: Write tsconfig.base.json**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "baseUrl": ".",
    "paths": {
      "@bora-estudar/*": ["packages/*/src"]
    }
  },
  "exclude": ["node_modules", "dist", "build"]
}
```

**Step 4: Run verification**
```bash
pnpm install
pnpm lint
pnpm format
```
Expected: Sem erros.

**Commit:** `chore: setup monorepo with pnpm, typescript, eslint, prettier, vitest`

---

### Task 1.2: tutorial-engine - Types & State Machine

**Objective:** Implementar types centrais, state machine, event emitter, engine API.

**Files:**
- Create: `packages/tutorial-engine/package.json`
- Create: `packages/tutorial-engine/tsconfig.json`
- Create: `packages/tutorial-engine/src/types.ts`
- Create: `packages/tutorial-engine/src/state-machine.ts`
- Create: `packages/tutorial-engine/src/event-emitter.ts`
- Create: `packages/tutorial-engine/src/engine.ts`
- Create: `packages/tutorial-engine/src/index.ts`
- Create: `packages/tutorial-engine/src/__tests__/state-machine.test.ts`
- Create: `packages/tutorial-engine/src/__tests__/engine.test.ts`

**Step 1: Write package.json**
```json
{
  "name": "@bora-estudar/tutorial-engine",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "module": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist/index.js"
    }
  },
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "lint": "eslint src --ext ts"
  },
  "dependencies": {
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@bora-estudar/tsconfig": "workspace:*",
    "vitest": "^1.4.0"
  }
}
```

**Step 2: Write types.ts (complete)**
```typescript
// packages/tutorial-engine/src/types.ts
import { z } from 'zod'

// ===== Recipe Schema (Zod para validação runtime) =====

export const StepTypeSchema = z.enum([
  'info', 'single-select', 'multi-select', 'form', 'confirmation', 'success', 'custom'
])

export const StepBaseSchema = z.object({
  id: z.string().min(1),
  type: StepTypeSchema,
  title: z.string().min(1),
  content: z.string().optional(),
  optional: z.boolean().default(false),
  validation: z.unknown().optional(), // Schema específico por tipo
  mapsTo: z.union([z.string(), z.array(z.string())]).optional(),
  dependsOn: z.array(z.string()).optional(),
  ui: z.record(z.unknown()).optional(),
  cta: z.object({
    label: z.string(),
    action: z.enum(['next', 'complete', 'custom']),
    variant: z.enum(['primary', 'secondary', 'ghost']).default('primary'),
    customAction: z.string().optional()
  }).optional(),
  onComplete: z.array(z.object({
    action: z.enum(['emit', 'navigate', 'custom']),
    event: z.string().optional(),
    payload: z.record(z.unknown()).optional(),
    path: z.string().optional()
  })).optional()
})

export const InfoStepSchema = StepBaseSchema.extend({ type: z.literal('info') })
export const SelectStepSchema = StepBaseSchema.extend({
  type: z.union([z.literal('single-select'), z.literal('multi-select')]),
  options: z.array(z.object({
    id: z.string(),
    label: z.string(),
    icon: z.string().optional(),
    description: z.string().optional(),
    value: z.unknown().optional(),
    showsField: z.string().optional()
  })).min(1),
  validation: z.object({
    minSelections: z.number().int().min(0).optional(),
    maxSelections: z.number().int().min(1).optional(),
    required: z.boolean().default(true)
  }).optional()
})

export const FormFieldSchema = z.object({
  name: z.string(),
  type: z.enum(['text', 'number', 'date', 'select', 'multi-select', 'textarea', 'checkbox']),
  label: z.string(),
  placeholder: z.string().optional(),
  default: z.unknown().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  validation: z.object({
    required: z.boolean().default(false),
    minLength: z.number().int().optional(),
    maxLength: z.number().int().optional(),
    pattern: z.string().optional(),
    custom: z.string().optional() // Reference to validator function name
  }).optional(),
  options: z.array(z.object({
    id: z.string(),
    label: z.string(),
    value: z.unknown()
  })).optional(),
  help: z.string().optional(),
  dependsOn: z.object({
    step: z.string(),
    condition: z.string() // Expression como "value === 'custom'"
  }).optional()
})

export const FormStepSchema = StepBaseSchema.extend({
  type: z.literal('form'),
  fields: z.array(FormFieldSchema).min(1),
  validation: z.object({
    required: z.array(z.string()).optional()
  }).optional()
})

export const ConfirmationStepSchema = StepBaseSchema.extend({
  type: z.literal('confirmation'),
  cta: z.object({
    label: z.string(),
    action: z.literal('complete'),
    variant: z.enum(['primary', 'secondary']).default('primary')
  }).required()
})

export const SuccessStepSchema = StepBaseSchema.extend({
  type: z.literal('success'),
  onComplete: z.array(z.object({
    action: z.enum(['emit', 'navigate', 'custom']),
    event: z.string().optional(),
    payload: z.record(z.unknown()).optional(),
    path: z.string().optional()
  })).min(1)
})

export const CustomStepSchema = StepBaseSchema.extend({
  type: z.literal('custom'),
  component: z.string(), // Component name registered in adapter
  props: z.record(z.unknown()).optional()
})

export const StepSchema = z.discriminatedUnion('type', [
  InfoStepSchema, SelectStepSchema, FormStepSchema,
  ConfirmationStepSchema, SuccessStepSchema, CustomStepSchema
])

export type Step = z.infer<typeof StepSchema>
export type InfoStep = z.infer<typeof InfoStepSchema>
export type SelectStep = z.infer<typeof SelectStepSchema>
export type FormStep = z.infer<typeof FormStepSchema>
export type ConfirmationStep = z.infer<typeof ConfirmationStepSchema>
export type SuccessStep = z.infer<typeof SuccessStepSchema>
export type CustomStep = z.infer<typeof CustomStepSchema>

// ===== Recipe Schema =====

export const RecipeSettingsSchema = z.object({
  allowSkip: z.boolean().default(true),
  allowBack: z.boolean().default(true),
  persistProgress: z.boolean().default(true),
  autoAdvance: z.boolean().default(false),
  showProgressBar: z.boolean().default(true),
  showStepNumbers: z.boolean().default(true)
})

export const RecipeMetadataSchema = z.object({
  category: z.enum(['onboarding', 'quick-action', 'feature', 'custom']),
  icon: z.string().optional(),
  color: z.string().optional(),
  requiredForBadge: z.boolean().default(false)
})

export const RecipeSchema = z.object({
  schemaVersion: z.number().int().positive().default(1),
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  estimatedMinutes: z.number().int().positive().optional(),
  metadata: RecipeMetadataSchema,
  settings: RecipeSettingsSchema.default({}),
  initialData: z.record(z.unknown()).default({}),
  steps: z.array(StepSchema).min(1)
})

export type Recipe = z.infer<typeof RecipeSchema>
export type RecipeSettings = z.infer<typeof RecipeSettingsSchema>
export type RecipeMetadata = z.infer<typeof RecipeMetadataSchema>

// ===== Engine Types =====

export type TutorialState =
  | { status: 'idle' }
  | { status: 'running'; recipeId: string; currentStepIndex: number; stepData: Record<string, unknown>; completedSteps: string[] }
  | { status: 'paused'; recipeId: string; currentStepIndex: number; stepData: Record<string, unknown> }
  | { status: 'completed'; recipeId: string; completedAt: string; finalData: Record<string, unknown> }
  | { status: 'aborted'; recipeId: string; reason: 'user' | 'error'; atStep: number }

export type TutorialEvent =
  | { type: 'tutorial:start'; recipeId: string; timestamp: string }
  | { type: 'tutorial:step:start'; recipeId: string; stepId: string; index: number; timestamp: string }
  | { type: 'tutorial:step:complete'; recipeId: string; stepId: string; index: number; data: unknown; timestamp: string }
  | { type: 'tutorial:step:skip'; recipeId: string; stepId: string; index: number; timestamp: string }
  | { type: 'tutorial:complete'; recipeId: string; finalData: Record<string, unknown>; timestamp: string }
  | { type: 'tutorial:abort'; recipeId: string; reason: string; atStep: number; timestamp: string }
  | { type: 'tutorial:error'; recipeId: string; stepId: string; error: Error; timestamp: string }

export type TutorialListener = (state: TutorialState) => void

export interface PersistenceAdapter {
  save(key: string, data: unknown): Promise<void>
  load(key: string): Promise<unknown | null>
  delete(key: string): Promise<void>
}

export interface AnalyticsAdapter {
  track(event: string, properties: Record<string, unknown>): Promise<void>
  identify(userId: string, traits?: Record<string, unknown>): Promise<void>
}

export interface EngineContext {
  [key: string]: unknown
  userName?: string
  userId?: string
  userEmail?: string
  today: string // YYYY-MM-DD
  now: string   // ISO 8601
}

export interface TutorialEngine {
  start(recipeId: string, initialData?: Record<string, unknown>): Promise<void>
  next(): Promise<void>
  previous(): Promise<void>
  skip(): Promise<void>
  abort(reason?: string): Promise<void>
  getState(): TutorialState
  subscribe(listener: TutorialListener): () => void
  persist(): Promise<void>
  restore(): Promise<void>
  destroy(): void
}

export interface EngineConfig {
  recipes: Map<string, Recipe>
  persistence?: PersistenceAdapter
  analytics?: AnalyticsAdapter
  context: EngineContext
  onError?: (error: Error, event: TutorialEvent) => void
}
```

**Step 3: Write state-machine.ts (core logic)**
```typescript
// packages/tutorial-engine/src/state-machine.ts
import type { TutorialState, TutorialEvent, Step, Recipe, EngineContext } from './types'

export function createInitialState(): TutorialState {
  return { status: 'idle' }
}

export function getCurrentStep(state: TutorialState, recipes: Map<string, Recipe>): Step | null {
  if (state.status !== 'running' && state.status !== 'paused') return null
  const recipe = recipes.get(state.recipeId)
  if (!recipe) return null
  return recipe.steps[state.currentStepIndex] ?? null
}

export function canGoNext(state: TutorialState, recipes: Map<string, Recipe>): boolean {
  if (state.status !== 'running') return false
  const recipe = recipes.get(state.recipeId)
  if (!recipe) return false
  return state.currentStepIndex < recipe.steps.length - 1
}

export function canGoPrevious(state: TutorialState): boolean {
  return (state.status === 'running' || state.status === 'paused') && state.currentStepIndex > 0
}

export function transitionNext(state: TutorialState, recipes: Map<string, Recipe>): TutorialState {
  if (!canGoNext(state, recipes)) return state
  const recipe = recipes.get(state.recipeId)!
  const nextIndex = state.currentStepIndex + 1
  return {
    ...state,
    currentStepIndex: nextIndex,
    completedSteps: [...state.completedSteps, recipe.steps[state.currentStepIndex].id]
  }
}

export function transitionPrevious(state: TutorialState): TutorialState {
  if (!canGoPrevious(state)) return state
  const recipe = recipes.get(state.recipeId)!
  const prevIndex = state.currentStepIndex - 1
  const completedSteps = state.completedSteps.filter(
    (_, i) => i < prevIndex
  )
  return { ...state, currentStepIndex: prevIndex, completedSteps }
}

export function transitionSkip(state: TutorialState, recipes: Map<string, Recipe>): TutorialState {
  if (!canGoNext(state, recipes)) return state
  const recipe = recipes.get(state.recipeId)!
  const currentStep = recipe.steps[state.currentStepIndex]
  if (!currentStep.optional) return state // Não pode pular step obrigatório
  return transitionNext(state, recipes)
}

export function transitionComplete(
  state: TutorialState,
  recipes: Map<string, Recipe>,
  finalData: Record<string, unknown>
): TutorialState {
  if (state.status !== 'running') return state
  return {
    status: 'completed',
    recipeId: state.recipeId,
    completedAt: new Date().toISOString(),
    finalData
  }
}

export function transitionAbort(
  state: TutorialState,
  reason: 'user' | 'error'
): TutorialState {
  if (state.status !== 'running' && state.status !== 'paused') return state
  return {
    status: 'aborted',
    recipeId: state.recipeId,
    reason,
    atStep: state.currentStepIndex
  }
}

export function transitionStart(
  recipeId: string,
  initialData: Record<string, unknown>
): TutorialState {
  return {
    status: 'running',
    recipeId,
    currentStepIndex: 0,
    stepData: { ...initialData },
    completedSteps: []
  }
}

// ===== Template Resolution =====

const TEMPLATE_REGEX = /\{\{(\w+)\}\}/g

export function resolveTemplates(
  str: string,
  context: EngineContext,
  stepData: Record<string, unknown>
): string {
  return str.replace(TEMPLATE_REGEX, (_, key) => {
    // Priority: stepData > context > empty
    if (key in stepData) return String(stepData[key])
    if (key in context) return String(context[key])
    return `{{${key}}}` // Mantém se não encontrado
  })
}

export function resolveStepContent(
  step: Step,
  context: EngineContext,
  stepData: Record<string, unknown>
): Step {
  const resolved = { ...step }
  
  if (step.title) resolved.title = resolveTemplates(step.title, context, stepData)
  if (step.content) resolved.content = resolveTemplates(step.content, context, stepData)
  if (step.cta?.label) resolved.cta = { ...step.cta, label: resolveTemplates(step.cta.label, context, stepData) }
  
  // Resolve options labels/descriptions
  if ('options' in step && Array.isArray(step.options)) {
    resolved.options = step.options.map(opt => ({
      ...opt,
      label: resolveTemplates(opt.label, context, stepData),
      description: opt.description ? resolveTemplates(opt.description, context, stepData) : undefined
    }))
  }
  
  // Resolve form fields
  if ('fields' in step && Array.isArray(step.fields)) {
    resolved.fields = step.fields.map(field => ({
      ...field,
      label: resolveTemplates(field.label, context, stepData),
      placeholder: field.placeholder ? resolveTemplates(field.placeholder, context, stepData) : undefined,
      help: field.help ? resolveTemplates(field.help, context, stepData) : undefined
    }))
  }
  
  return resolved
}
```

**Step 4: Write event-emitter.ts**
```typescript
// packages/tutorial-engine/src/event-emitter.ts
import type { TutorialEvent, TutorialListener } from './types'

export function createEventEmitter() {
  const listeners = new Set<TutorialListener>()
  const eventLog: TutorialEvent[] = []
  
  return {
    emit(event: TutorialEvent) {
      eventLog.push(event)
      listeners.forEach(fn => fn(event))
    },
    subscribe(listener: TutorialListener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    getEventLog() {
      return [...eventLog]
    },
    clear() {
      eventLog.length = 0
    }
  }
}

export type EventEmitter = ReturnType<typeof createEventEmitter>
```

**Step 5: Write engine.ts (main API)**
```typescript
// packages/tutorial-engine/src/engine.ts
import { createEventEmitter } from './event-emitter'
import { createInitialState, transitionStart, transitionNext, transitionPrevious, transitionSkip, transitionComplete, transitionAbort, getCurrentStep, resolveStepContent, resolveTemplates } from './state-machine'
import type { TutorialEngine, TutorialState, TutorialEvent, Recipe, EngineConfig, PersistenceAdapter, AnalyticsAdapter, EngineContext } from './types'

const PERSISTENCE_KEY_PREFIX = 'tutorial:progress:'

export function createEngine(config: EngineConfig): TutorialEngine {
  const { recipes, persistence, analytics, context, onError } = config
  const emitter = createEventEmitter()
  let state = createInitialState()
  let destroyCallbacks: (() => void)[] = []
  
  // Hydrate context com valores dinâmicos
  function getFullContext(): EngineContext {
    return {
      ...context,
      today: new Date().toISOString().split('T')[0],
      now: new Date().toISOString()
    }
  }
  
  // Persistence
  async function persistState() {
    if (!persistence || state.status !== 'running' && state.status !== 'paused') return
    const key = `${PERSISTENCE_KEY_PREFIX}${state.recipeId}`
    const data = {
      schemaVersion: 1,
      recipeId: state.recipeId,
      currentStepIndex: state.currentStepIndex,
      stepData: state.stepData,
      completedSteps: state.completedSteps,
      startedAt: state.status === 'running' ? new Date().toISOString() : 'unknown',
      lastActiveAt: new Date().toISOString(),
      version: recipes.get(state.recipeId)?.schemaVersion ?? 1
    }
    await persistence.save(key, data)
  }
  
  async function restoreState(recipeId: string) {
    if (!persistence) return null
    const key = `${PERSISTENCE_KEY_PREFIX}${recipeId}`
    const data = await persistence.load(key)
    return data as any // TODO: validar com Zod
  }
  
  // Analytics
  async function trackAnalytics(event: TutorialEvent) {
    if (!analytics) return
    try {
      const step = getCurrentStep(state, recipes)
      await analytics.track(event.type, {
        recipe_id: event.recipeId,
        recipe_version: recipes.get(event.recipeId)?.schemaVersion ?? 1,
        step_id: 'stepId' in event ? event.stepId : undefined,
        step_index: 'index' in event ? event.index : undefined,
        step_type: step?.type,
        timestamp: event.timestamp
      })
    } catch (err) {
      console.warn('[tutorial-engine] Analytics error:', err)
    }
  }
  
  // Core Actions
  async function start(recipeId: string, initialData: Record<string, unknown> = {}) {
    const recipe = recipes.get(recipeId)
    if (!recipe) throw new Error(`Recipe not found: ${recipeId}`)
    
    // Merge: recipe.initialData < persisted < initialData param
    let mergedData = { ...recipe.initialData }
    const persisted = await restoreState(recipeId)
    if (persisted && persisted.version === recipe.schemaVersion) {
      mergedData = { ...mergedData, ...persisted.stepData }
      state = {
        status: 'running',
        recipeId,
        currentStepIndex: persisted.currentStepIndex,
        stepData: mergedData,
        completedSteps: persisted.completedSteps
      }
    } else {
      state = transitionStart(recipeId, { ...mergedData, ...initialData })
    }
    
    const event: TutorialEvent = { type: 'tutorial:start', recipeId, timestamp: new Date().toISOString() }
    emitter.emit(event)
    await trackAnalytics(event)
    await persistState()
  }
  
  async function next() {
    if (state.status !== 'running') return
    const recipe = recipes.get(state.recipeId)!
    const currentStep = recipe.steps[state.currentStepIndex]
    
    // Validar step atual antes de avançar
    const validationError = validateStep(currentStep, state.stepData)
    if (validationError) {
      const errorEvent: TutorialEvent = {
        type: 'tutorial:error',
        recipeId: state.recipeId,
        stepId: currentStep.id,
        error: new Error(validationError),
        timestamp: new Date().toISOString()
      }
      emitter.emit(errorEvent)
      if (onError) onError(errorEvent.error, errorEvent)
      return
    }
    
    const stepData = { ...state.stepData }
    // Extrair dados do step atual
    if (currentStep.mapsTo) {
      const keys = Array.isArray(currentStep.mapsTo) ? currentStep.mapsTo : [currentStep.mapsTo]
      // Dados já estão em stepData via UI binding
    }
    
    state = transitionNext(state, recipes)
    
    const event: TutorialEvent = {
      type: 'tutorial:step:complete',
      recipeId: state.recipeId,
      stepId: currentStep.id,
      index: state.currentStepIndex - 1,
      data: stepData,
      timestamp: new Date().toISOString()
    }
    emitter.emit(event)
    await trackAnalytics(event)
    await persistState()
    
    // Check if completed
    if (state.currentStepIndex >= recipe.steps.length) {
      await complete()
    }
  }
  
  async function previous() {
    if (state.status !== 'running' && state.status !== 'paused') return
    const recipe = recipes.get(state.recipeId)!
    const currentStep = recipe.steps[state.currentStepIndex]
    
    state = transitionPrevious(state)
    
    const event: TutorialEvent = {
      type: 'tutorial:step:start',
      recipeId: state.recipeId,
      stepId: recipe.steps[state.currentStepIndex].id,
      index: state.currentStepIndex,
      timestamp: new Date().toISOString()
    }
    emitter.emit(event)
    await trackAnalytics(event)
    await persistState()
  }
  
  async function skip() {
    if (state.status !== 'running') return
    const recipe = recipes.get(state.recipeId)!
    const currentStep = recipe.steps[state.currentStepIndex]
    
    if (!currentStep.optional) return // Não permite pular obrigatório
    
    state = transitionSkip(state, recipes)
    
    const event: TutorialEvent = {
      type: 'tutorial:step:skip',
      recipeId: state.recipeId,
      stepId: currentStep.id,
      index: state.currentStepIndex - 1,
      timestamp: new Date().toISOString()
    }
    emitter.emit(event)
    await trackAnalytics(event)
    await persistState()
  }
  
  async function abort(reason: 'user' | 'error' = 'user') {
    if (state.status !== 'running' && state.status !== 'paused') return
    const atStep = state.currentStepIndex
    const recipeId = state.recipeId
    
    state = transitionAbort(state, reason)
    
    const event: TutorialEvent = {
      type: 'tutorial:abort',
      recipeId,
      reason,
      atStep,
      timestamp: new Date().toISOString()
    }
    emitter.emit(event)
    await trackAnalytics(event)
    
    if (persistence) {
      await persistence.delete(`${PERSISTENCE_KEY_PREFIX}${recipeId}`)
    }
  }
  
  async function complete() {
    if (state.status !== 'running') return
    const recipe = recipes.get(state.recipeId)!
    const finalData = { ...state.stepData }
    
    state = transitionComplete(state, recipes, finalData)
    
    const event: TutorialEvent = {
      type: 'tutorial:complete',
      recipeId: state.recipeId,
      finalData,
      timestamp: new Date().toISOString()
    }
    emitter.emit(event)
    await trackAnalytics(event)
    
    // Execute onComplete actions
    const lastStep = recipe.steps[recipe.steps.length - 1]
    if (lastStep.onComplete) {
      for (const action of lastStep.onComplete) {
        if (action.action === 'emit' && action.event) {
          emitter.emit({ type: action.event, ...action.payload, timestamp: new Date().toISOString() } as TutorialEvent)
        }
        // navigate: handled by adapter
      }
    }
    
    if (persistence) {
      await persistence.delete(`${PERSISTENCE_KEY_PREFIX}${state.recipeId}`)
    }
  }
  
  function getState(): TutorialState {
    return state
  }
  
  function subscribe(listener: TutorialListener) {
    return emitter.subscribe(listener)
  }
  
  async function persist() {
    await persistState()
  }
  
  async function restore() {
    // Already done in start()
  }
  
  function destroy() {
    destroyCallbacks.forEach(fn => fn())
    destroyCallbacks = []
  }
  
  // Expor estado resolvido (com templates) para UI
  function getResolvedStep() {
    const step = getCurrentStep(state, recipes)
    if (!step) return null
    return resolveStepContent(step, getFullContext(), state.stepData)
  }
  
  return {
    start,
    next,
    previous,
    skip,
    abort,
    getState,
    subscribe,
    persist,
    restore,
    destroy,
    // Internal helper for adapter
    _internal: { getResolvedStep, getFullContext }
  }
}

// ===== Validation Helpers =====

function validateStep(step: any, stepData: Record<string, unknown>): string | null {
  if (!step.validation) return null
  
  if (step.type === 'single-select' || step.type === 'multi-select') {
    const { minSelections = 1, maxSelections, required = true } = step.validation
    const mapsTo = step.mapsTo ? (Array.isArray(step.mapsTo) ? step.mapsTo[0] : step.mapsTo) : null
    const value = mapsTo ? stepData[mapsTo] : undefined
    const selections = Array.isArray(value) ? value.length : (value ? 1 : 0)
    
    if (required && selections === 0) return 'Selection is required'
    if (minSelections && selections < minSelections) return `Minimum ${minSelections} selections required`
    if (maxSelections && selections > maxSelections) return `Maximum ${maxSelections} selections allowed`
  }
  
  if (step.type === 'form') {
    const { required = [] } = step.validation
    for (const fieldName of required) {
      const field = step.fields.find((f: any) => f.name === fieldName)
      const value = stepData[fieldName]
      if (!value && value !== 0 && value !== false) {
        return `Field "${field?.label || fieldName}" is required`
      }
      if (field?.validation) {
        const val = field.validation
        if (val.minLength && String(value).length < val.minLength) {
          return `Minimum ${val.minLength} characters`
        }
        if (val.maxLength && String(value).length > val.maxLength) {
          return `Maximum ${val.maxLength} characters`
        }
        if (val.pattern && !new RegExp(val.pattern).test(String(value))) {
          return 'Invalid format'
        }
      }
    }
  }
  
  return null
}
```

**Step 6: Write index.ts (barrel export)**
```typescript
// packages/tutorial-engine/src/index.ts
export * from './types'
export * from './engine'
export * from './state-machine'
export * from './event-emitter'
export { createEngine } from './engine'
```

**Step 7: Write tests**
```typescript
// packages/tutorial-engine/src/__tests__/state-machine.test.ts
import { describe, it, expect } from 'vitest'
import { createInitialState, transitionStart, transitionNext, transitionPrevious, transitionSkip, transitionComplete, transitionAbort, canGoNext, canGoPrevious, resolveTemplates } from '../state-machine'
import type { Recipe, Step } from '../types'

const mockRecipe: Recipe = {
  schemaVersion: 1,
  id: 'test-recipe',
  title: 'Test',
  description: '',
  estimatedMinutes: 5,
  metadata: { category: 'onboarding', requiredForBadge: false },
  settings: {},
  initialData: {},
  steps: [
    { id: 'step1', type: 'info', title: 'Step 1', content: 'Hello {{name}}', optional: false },
    { id: 'step2', type: 'single-select', title: 'Step 2', options: [{ id: 'a', label: 'A' }], mapsTo: 'choice', optional: false },
    { id: 'step3', type: 'success', title: 'Done', onComplete: [] }
  ]
}

const recipes = new Map([[mockRecipe.id, mockRecipe]])

describe('state-machine', () => {
  it('createInitialState returns idle', () => {
    expect(createInitialState()).toEqual({ status: 'idle' })
  })

  it('transitionStart creates running state', () => {
    const state = transitionStart('test-recipe', { name: 'John' })
    expect(state.status).toBe('running')
    expect(state.recipeId).toBe('test-recipe')
    expect(state.currentStepIndex).toBe(0)
    expect(state.stepData.name).toBe('John')
  })

  it('transitionNext advances index', () => {
    let state = transitionStart('test-recipe', {})
    state = transitionNext(state, recipes)
    expect(state.currentStepIndex).toBe(1)
    expect(state.completedSteps).toEqual(['step1'])
  })

  it('transitionPrevious goes back', () => {
    let state = transitionStart('test-recipe', {})
    state = transitionNext(state, recipes)
    state = transitionPrevious(state)
    expect(state.currentStepIndex).toBe(0)
    expect(state.completedSteps).toEqual([])
  })

  it('transitionSkip only works on optional steps', () => {
    let state = transitionStart('test-recipe', {})
    // step1 is not optional
    state = transitionSkip(state, recipes)
    expect(state.currentStepIndex).toBe(0) // unchanged
    
    // advance to step2 (optional: false by default, but let's test)
    state = transitionNext(state, recipes)
    state = transitionSkip(state, recipes)
    expect(state.currentStepIndex).toBe(0) // step2 not optional
  })

  it('transitionComplete creates completed state', () => {
    let state = transitionStart('test-recipe', { choice: 'a' })
    state = transitionNext(state, recipes) // step1 -> step2
    state = transitionNext(state, recipes) // step2 -> step3
    state = transitionComplete(state, recipes, { choice: 'a' })
    expect(state.status).toBe('completed')
    expect(state.finalData.choice).toBe('a')
  })

  it('transitionAbort creates aborted state', () => {
    const state = transitionStart('test-recipe', {})
    const aborted = transitionAbort(state, 'user')
    expect(aborted.status).toBe('aborted')
    expect(aborted.reason).toBe('user')
    expect(aborted.atStep).toBe(0)
  })

  it('canGoNext/previous work correctly', () => {
    let state = transitionStart('test-recipe', {})
    expect(canGoNext(state, recipes)).toBe(true)
    expect(canGoPrevious(state)).toBe(false)
    
    state = transitionNext(state, recipes)
    expect(canGoNext(state, recipes)).toBe(true)
    expect(canGoPrevious(state)).toBe(true)
    
    state = transitionNext(state, recipes)
    expect(canGoNext(state, recipes)).toBe(false) // last step
  })

  it('resolveTemplates replaces variables', () => {
    const result = resolveTemplates('Hello {{name}}, today is {{today}}', { today: '2024-01-15', now: '' }, { name: 'John' })
    expect(result).toBe('Hello John, today is 2024-01-15')
  })

  it('resolveTemplates keeps unknown vars', () => {
    const result = resolveTemplates('Hello {{unknown}}', { today: '', now: '' }, {})
    expect(result).toBe('Hello {{unknown}}')
  })
})
```

```typescript
// packages/tutorial-engine/src/__tests__/engine.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createEngine } from '../engine'
import type { Recipe, PersistenceAdapter, AnalyticsAdapter } from '../types'

const mockRecipe: Recipe = {
  schemaVersion: 1,
  id: 'test-recipe',
  title: 'Test Recipe',
  description: 'Test',
  estimatedMinutes: 5,
  metadata: { category: 'onboarding', requiredForBadge: true },
  settings: { allowSkip: true, allowBack: true, persistProgress: true },
  initialData: { userName: 'Test User' },
  steps: [
    { id: 'welcome', type: 'info', title: 'Welcome {{userName}}', content: 'Let\'s start!', cta: { label: 'Start', action: 'next' }, optional: false },
    { id: 'goal', type: 'single-select', title: 'Goal?', options: [{ id: 'exam', label: 'Exam' }, { id: 'cert', label: 'Certification' }], mapsTo: 'goal', optional: false },
    { id: 'done', type: 'success', title: 'Done!', onComplete: [{ action: 'emit', event: 'recipe:complete' }] }
  ]
}

const recipes = new Map([[mockRecipe.id, mockRecipe]])

const mockPersistence: PersistenceAdapter = {
  save: vi.fn().mockResolvedValue(undefined),
  load: vi.fn().mockResolvedValue(null),
  delete: vi.fn().mockResolvedValue(undefined)
}

const mockAnalytics: AnalyticsAdapter = {
  track: vi.fn().mockResolvedValue(undefined),
  identify: vi.fn().mockResolvedValue(undefined)
}

describe('engine', () => {
  let engine: ReturnType<typeof createEngine>
  
  beforeEach(() => {
    vi.clearAllMocks()
    engine = createEngine({
      recipes,
      persistence: mockPersistence,
      analytics: mockAnalytics,
      context: { userName: 'Test User', userId: '123', today: '2024-01-15', now: '2024-01-15T10:00:00Z' }
    })
  })
  
  it('starts recipe and emits start event', async () => {
    const events: any[] = []
    engine.subscribe(e => events.push(e))
    
    await engine.start('test-recipe')
    
    expect(events).toHaveLength(1)
    expect(events[0].type).toBe('tutorial:start')
    expect(engine.getState().status).toBe('running')
    expect(engine.getState().currentStepIndex).toBe(0)
  })
  
  it('advances through steps', async () => {
    await engine.start('test-recipe')
    
    // Step 0: welcome (info) - auto advance via next()
    await engine.next()
    expect(engine.getState().currentStepIndex).toBe(1)
    expect(engine.getState().completedSteps).toContain('welcome')
    
    // Step 1: goal (single-select) - need to set data first
    // Simulate user selection by updating stepData directly (adapter would do this)
    const state = engine.getState()
    if (state.status === 'running') {
      state.stepData.goal = 'exam'
    }
    
    await engine.next()
    expect(engine.getState().status).toBe('completed')
  })
  
  it('skip works on optional steps', async () => {
    const optionalRecipe: Recipe = {
      ...mockRecipe,
      id: 'optional-recipe',
      steps: [
        { id: 'step1', type: 'info', title: 'Required', optional: false, cta: { label: 'Next', action: 'next' } },
        { id: 'step2', type: 'info', title: 'Optional', optional: true, cta: { label: 'Skip', action: 'next' } },
        { id: 'step3', type: 'success', title: 'Done', onComplete: [] }
      ]
    }
    const recipesWithOptional = new Map([[optionalRecipe.id, optionalRecipe]])
    const eng = createEngine({ recipes: recipesWithOptional, context: { userName: '', userId: '', today: '', now: '' } })
    
    await eng.start('optional-recipe')
    await eng.next() // step1 -> step2
    await eng.skip() // skip step2
    expect(eng.getState().currentStepIndex).toBe(2) // jumped to step3
  })
  
  it('abort clears persistence', async () => {
    await engine.start('test-recipe')
    await engine.abort('user')
    expect(mockPersistence.delete).toHaveBeenCalled()
    expect(engine.getState().status).toBe('aborted')
  })
  
  it('persists progress', async () => {
    await engine.start('test-recipe')
    await engine.next()
    expect(mockPersistence.save).toHaveBeenCalled()
  })
  
  it('restores from persistence', async () => {
    const persistedData = {
      schemaVersion: 1,
      recipeId: 'test-recipe',
      currentStepIndex: 1,
      stepData: { userName: 'Restored', goal: 'exam' },
      completedSteps: ['welcome'],
      lastActiveAt: '2024-01-15T10:00:00Z',
      version: 1
    }
    mockPersistence.load.mockResolvedValueOnce(persistedData)
    
    const eng = createEngine({ recipes, persistence: mockPersistence, context: { userName: '', userId: '', today: '', now: '' } })
    await eng.start('test-recipe')
    
    expect(eng.getState().currentStepIndex).toBe(1)
    expect(eng.getState().stepData.goal).toBe('exam')
  })
})
```

**Step 8: Run tests & build**
```bash
pnpm --filter @bora-estudar/tutorial-engine test
pnpm --filter @bora-estudar/tutorial-engine build
```
Expected: All tests pass, dist/ generated.

**Commit:** `feat(engine): core state machine, event emitter, engine API with tests`

---

### Task 1.3: tutorial-engine - Persistence Adapters

**Objective:** Implementar adapters localStorage, IndexedDB, Memory.

**Files:**
- Create: `packages/tutorial-engine/src/persistence/localStorage.ts`
- Create: `packages/tutorial-engine/src/persistence/indexedDB.ts`
- Create: `packages/tutorial-engine/src/persistence/memory.ts`
- Create: `packages/tutorial-engine/src/persistence/index.ts`
- Update: `packages/tutorial-engine/src/index.ts` (export)
- Create: `packages/tutorial-engine/src/__tests__/persistence.test.ts`

**Step 1: Write localStorage.ts**
```typescript
// packages/tutorial-engine/src/persistence/localStorage.ts
import type { PersistenceAdapter } from '../types'

export function createLocalStorageAdapter(prefix = 'tutorial:'): PersistenceAdapter {
  const isAvailable = typeof localStorage !== 'undefined'
  
  return {
    async save(key: string, data: unknown) {
      if (!isAvailable) return
      try {
        localStorage.setItem(`${prefix}${key}`, JSON.stringify(data))
      } catch (e) {
        console.warn('[localStorage] Save failed:', e)
      }
    },
    async load(key: string) {
      if (!isAvailable) return null
      try {
        const item = localStorage.getItem(`${prefix}${key}`)
        return item ? JSON.parse(item) : null
      } catch (e) {
        console.warn('[localStorage] Load failed:', e)
        return null
      }
    },
    async delete(key: string) {
      if (!isAvailable) return
      localStorage.removeItem(`${prefix}${key}`)
    }
  }
}
```

**Step 2: Write indexedDB.ts**
```typescript
// packages/tutorial-engine/src/persistence/indexedDB.ts
import type { PersistenceAdapter } from '../types'

const DB_NAME = 'TutorialProgressDB'
const STORE_NAME = 'progress'
let dbPromise: Promise<IDBDatabase> | null = null

function getDB(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') {
        reject(new Error('IndexedDB not available'))
        return
      }
      const request = indexedDB.open(DB_NAME, 1)
      request.onerror = () => reject(request.error)
      request.onsuccess = () => resolve(request.result)
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME)
        }
      }
    })
  }
  return dbPromise
}

export function createIndexedDBAdapter(): PersistenceAdapter {
  return {
    async save(key: string, data: unknown) {
      try {
        const db = await getDB()
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).put(data, key)
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        })
      } catch (e) {
        console.warn('[IndexedDB] Save failed:', e)
      }
    },
    async load(key: string) {
      try {
        const db = await getDB()
        const tx = db.transaction(STORE_NAME, 'readonly')
        const request = tx.objectStore(STORE_NAME).get(key)
        return new Promise<unknown | null>((resolve, reject) => {
          request.onsuccess = () => resolve(request.result ?? null)
          request.onerror = () => reject(request.error)
        })
      } catch (e) {
        console.warn('[IndexedDB] Load failed:', e)
        return null
      }
    },
    async delete(key: string) {
      try {
        const db = await getDB()
        const tx = db.transaction(STORE_NAME, 'readwrite')
        tx.objectStore(STORE_NAME).delete(key)
        await new Promise<void>((resolve, reject) => {
          tx.oncomplete = () => resolve()
          tx.onerror = () => reject(tx.error)
        })
      } catch (e) {
        console.warn('[IndexedDB] Delete failed:', e)
      }
    }
  }
}
```

**Step 3: Write memory.ts (para SSR/testing)**
```typescript
// packages/tutorial-engine/src/persistence/memory.ts
import type { PersistenceAdapter } from '../types'

export function createMemoryAdapter(): PersistenceAdapter {
  const store = new Map<string, unknown>()
  return {
    async save(key: string, data: unknown) { store.set(key, data) },
    async load(key: string) { return store.get(key) ?? null },
    async delete(key: string) { store.delete(key) }
  }
}
```

**Step 4: Write index.ts + tests + build**

**Commit:** `feat(engine): persistence adapters (localStorage, IndexedDB, memory)`

---

### Task 1.4: tutorial-recipes - Schema Validation & Registry

**Objective:** Carregar recipes YAML, validar com Zod, registry tipado, CLI validator.

**Files:**
- Create: `packages/tutorial-recipes/package.json`
- Create: `packages/tutorial-recipes/tsconfig.json`
- Create: `packages/tutorial-recipes/src/schema.ts` (re-export Zod schemas from engine)
- Create: `packages/tutorial-recipes/src/loader.ts`
- Create: `packages/tutorial-recipes/src/registry.ts`
- Create: `packages/tutorial-recipes/src/validator.ts` (CLI)
- Create: `packages/tutorial-recipes/recipes/criar-plano.yaml`
- Create: `packages/tutorial-recipes/recipes/cronograma-avulso.yaml`
- Create: `packages/tutorial-recipes/src/index.ts`
- Create: `packages/tutorial-recipes/src/__tests__/loader.test.ts`

**Step 1: Write package.json**
```json
{
  "name": "@bora-estudar/tutorial-recipes",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./recipes/*": "./recipes/*.yaml"
  },
  "scripts": {
    "build": "tsc && cp -r recipes dist/",
    "test": "vitest run",
    "validate": "tsx src/validator.ts",
    "lint": "eslint src --ext ts"
  },
  "dependencies": {
    "@bora-estudar/tutorial-engine": "workspace:*",
    "js-yaml": "^4.1.0",
    "zod": "^3.22.4"
  },
  "devDependencies": {
    "@bora-estudar/tsconfig": "workspace:*",
    "@types/js-yaml": "^4.0.9",
    "tsx": "^4.7.0",
    "vitest": "^1.4.0"
  }
}
```

**Step 2: Write loader.ts**
```typescript
// packages/tutorial-recipes/src/loader.ts
import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import yaml from 'js-yaml'
import type { Recipe, RecipeSchema } from '@bora-estudar/tutorial-engine'
import { RecipeSchema as EngineRecipeSchema } from '@bora-estudar/tutorial-engine'

const __dirname = dirname(fileURLToPath(import.meta.url))
const RECIPES_DIR = resolve(__dirname, '../recipes')

export function loadRecipeFile(recipeId: string): Recipe {
  const filePath = resolve(RECIPES_DIR, `${recipeId}.yaml`)
  const content = readFileSync(filePath, 'utf-8')
  const parsed = yaml.load(content)
  
  const result = EngineRecipeSchema.safeParse(parsed)
  if (!result.success) {
    const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n')
    throw new Error(`Invalid recipe "${recipeId}":\n${errors}`)
  }
  
  return result.data
}

export function loadAllRecipes(): Map<string, Recipe> {
  const registry = new Map<string, Recipe>()
  // Em build time, recipes são copiados para dist/recipes
  // Em dev, lê de src/recipes
  const fs = await import('fs')
  const path = await import('path')
  const dir = fs.existsSync(RECIPES_DIR) ? RECIPES_DIR : resolve(__dirname, '../../recipes')
  
  if (!fs.existsSync(dir)) return registry
  
  for (const file of fs.readdirSync(dir)) {
    if (file.endsWith('.yaml') || file.endsWith('.yml')) {
      const recipeId = file.replace(/\.ya?ml$/, '')
      try {
        const recipe = loadRecipeFile(recipeId)
        registry.set(recipe.id, recipe)
      } catch (e) {
        console.error(`Failed to load recipe ${recipeId}:`, e)
      }
    }
  }
  return registry
}
```

**Step 3: Write registry.ts**
```typescript
// packages/tutorial-recipes/src/registry.ts
import type { Recipe } from '@bora-estudar/tutorial-engine'
import { loadAllRecipes } from './loader'

let registryCache: Map<string, Recipe> | null = null

export function getRecipeRegistry(): Map<string, Recipe> {
  if (!registryCache) {
    registryCache = loadAllRecipes()
  }
  return registryCache
}

export function getRecipe(recipeId: string): Recipe | undefined {
  return getRecipeRegistry().get(recipeId)
}

export function registerRecipe(recipe: Recipe): void {
  getRecipeRegistry().set(recipe.id, recipe)
}

export function clearRegistry(): void {
  registryCache = null
}
```

**Step 4: Copy YAML recipes from spec (criar-plano.yaml, cronograma-avulso.yaml)**

**Step 5: Write validator.ts (CLI)**
```typescript
// packages/tutorial-recipes/src/validator.ts
import { loadAllRecipes } from './loader'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))

async function main() {
  console.log('🔍 Validating recipes...')
  const registry = loadAllRecipes()
  
  if (registry.size === 0) {
    console.log('⚠️  No recipes found')
    process.exit(1)
  }
  
  let hasErrors = false
  for (const [id, recipe] of registry) {
    try {
      // Validation already done in loader
      console.log(`✅ ${id} (v${recipe.schemaVersion}) - ${recipe.steps.length} steps`)
    } catch (e) {
      console.error(`❌ ${id}: ${e}`)
      hasErrors = true
    }
  }
  
  if (hasErrors) {
    console.log('\n❌ Validation failed')
    process.exit(1)
  }
  
  console.log(`\n✅ All ${registry.size} recipes valid!`)
}

main().catch(console.error)
```

**Step 6: Tests + build**

**Commit:** `feat(recipes): YAML loader, registry, validator CLI, 2 base recipes`

---

## Fase 2: React Adapter (Package: tutorial-react)

### Task 2.1: tutorial-react - Core Hooks & Provider

**Objective:** React context, hooks (useTutorial, useStep), step components base.

**Files:**
- Create: `packages/tutorial-react/package.json`
- Create: `packages/tutorial-react/tsconfig.json`
- Create: `packages/tutorial-react/src/context.tsx`
- Create: `packages/tutorial-react/src/hooks.ts`
- Create: `packages/tutorial-react/src/components/StepRenderer.tsx`
- Create: `packages/tutorial-react/src/components/steps/*.tsx` (InfoStep, SelectStep, FormStep, ConfirmationStep, SuccessStep)
- Create: `packages/tutorial-react/src/components/TutorialModal.tsx`
- Create: `packages/tutorial-react/src/components/ProgressBar.tsx`
- Create: `packages/tutorial-react/src/index.ts`
- Create: `packages/tutorial-react/src/__tests__/hooks.test.tsx`

**Step 1: Write package.json**
```json
{
  "name": "@bora-estudar/tutorial-react",
  "version": "0.0.0",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": "./dist/index.js",
    "./styles.css": "./dist/styles.css"
  },
  "scripts": {
    "build": "tsc && cp src/styles.css dist/",
    "test": "vitest run",
    "lint": "eslint src --ext ts,tsx",
    "storybook": "storybook dev -p 6006",
    "build-storybook": "storybook build"
  },
  "peerDependencies": {
    "react": ">=18.2.0",
    "react-dom": ">=18.2.0"
  },
  "dependencies": {
    "@bora-estudar/tutorial-engine": "workspace:*",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "@bora-estudar/tsconfig": "workspace:*",
    "@storybook/react": "^8.0.0",
    "@storybook/react-vite": "^8.0.0",
    "@testing-library/react": "^14.2.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "storybook": "^8.0.0",
    "vitest": "^1.4.0"
  }
}
```

**Step 2: Write context.tsx**
```tsx
// packages/tutorial-react/src/context.tsx
import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react'
import type { TutorialEngine, TutorialState, Recipe, Step } from '@bora-estudar/tutorial-engine'
import { createEngine } from '@bora-estudar/tutorial-engine'

interface TutorialContextValue {
  engine: TutorialEngine | null
  state: TutorialState
  currentStep: Step | null
  start: (recipeId: string, initialData?: Record<string, unknown>) => Promise<void>
  next: () => Promise<void>
  previous: () => Promise<void>
  skip: () => Promise<void>
  abort: (reason?: string) => Promise<void>
  updateStepData: (data: Record<string, unknown>) => void
  isLoading: boolean
}

const TutorialContext = createContext<TutorialContextValue | null>(null)

interface TutorialProviderProps {
  children: ReactNode
  recipes: Map<string, Recipe>
  persistence?: TutorialContextValue['engine']['_internal'] extends { getResolvedStep: any } ? any : any // Simplified
  analytics?: any
  context?: Record<string, unknown>
}

export function TutorialProvider({
  children,
  recipes,
  persistence,
  analytics,
  context = {}
}: TutorialProviderProps) {
  const [engine, setEngine] = useState<TutorialEngine | null>(null)
  const [state, setState] = useState<TutorialState>({ status: 'idle' })
  const [isLoading, setIsLoading] = useState(false)
  
  // Initialize engine
  useEffect(() => {
    const e = createEngine({
      recipes,
      persistence,
      analytics,
      context: { today: new Date().toISOString().split('T')[0], now: new Date().toISOString(), ...context }
    })
    setEngine(e)
    
    const unsubscribe = e.subscribe(newState => setState(newState))
    return () => {
      unsubscribe()
      e.destroy()
    }
  }, [recipes, persistence, analytics, context])
  
  // Get resolved current step
  const currentStep = useMemo(() => {
    if (!engine || state.status !== 'running' && state.status !== 'paused') return null
    return engine._internal.getResolvedStep()
  }, [engine, state])
  
  const start = useCallback(async (recipeId: string, initialData?: Record<string, unknown>) => {
    if (!engine) return
    setIsLoading(true)
    try {
      await engine.start(recipeId, initialData)
    } finally {
      setIsLoading(false)
    }
  }, [engine])
  
  const next = useCallback(async () => {
    if (!engine) return
    await engine.next()
  }, [engine])
  
  const previous = useCallback(async () => {
    if (!engine) return
    await engine.previous()
  }, [engine])
  
  const skip = useCallback(async () => {
    if (!engine) return
    await engine.skip()
  }, [engine])
  
  const abort = useCallback(async (reason?: string) => {
    if (!engine) return
    await engine.abort(reason as any)
  }, [engine])
  
  const updateStepData = useCallback((data: Record<string, unknown>) => {
    if (!engine) return
    const current = engine.getState()
    if (current.status === 'running' || current.status === 'paused') {
      // Direct mutation for reactivity - engine will pick up on next()
      Object.assign(current.stepData, data)
      // Force re-render by triggering state update
      setState({ ...current })
    }
  }, [engine])
  
  return (
    <TutorialContext.Provider value={{
      engine, state, currentStep,
      start, next, previous, skip, abort,
      updateStepData, isLoading
    }}>
      {children}
    </TutorialContext.Provider>
  )
}

export function useTutorial() {
  const ctx = useContext(TutorialContext)
  if (!ctx) throw new Error('useTutorial must be used within TutorialProvider')
  return ctx
}
```

**Step 3: Write hooks.ts (convenience hooks)**
```tsx
// packages/tutorial-react/src/hooks.ts
import { useCallback, useMemo } from 'react'
import { useTutorial } from './context'
import type { Step } from '@bora-estudar/tutorial-engine'

export function useStep() {
  const { currentStep, state, updateStepData, next, previous, skip, abort } = useTutorial()
  
  const handleFieldChange = useCallback((name: string, value: unknown) => {
    updateStepData({ [name]: value })
  }, [updateStepData])
  
  const handleMultiSelectChange = useCallback((name: string, optionId: string, selected: boolean) => {
    updateStepData(prev => {
      const current = prev[name] as string[] || []
      if (selected) return { ...prev, [name]: [...current, optionId] }
      return { ...prev, [name]: current.filter(id => id !== optionId) }
    })
  }, [updateStepData])
  
  const canGoNext = useMemo(() => {
    if (state.status !== 'running') return false
    if (!currentStep) return false
    if (currentStep.type === 'confirmation' || currentStep.type === 'success') return true
    if (currentStep.type === 'info') return true
    if (currentStep.type === 'single-select') {
      const mapsTo = currentStep.mapsTo ? (Array.isArray(currentStep.mapsTo) ? currentStep.mapsTo[0] : currentStep.mapsTo) : null
      return mapsTo && currentStep.optional === false ? !!currentStep.mapsTo : true
    }
    return true
  }, [state, currentStep])
  
  const canGoPrevious = useMemo(() => {
    return state.status === 'running' || state.status === 'paused'
  }, [state])
  
  const canSkip = useMemo(() => {
    return currentStep?.optional === true
  }, [currentStep])
  
  return {
    step: currentStep,
    state,
    handleFieldChange,
    handleMultiSelectChange,
    next,
    previous,
    skip,
    abort,
    canGoNext,
    canGoPrevious,
    canSkip
  }
}

export function useTutorialProgress() {
  const { state } = useTutorial()
  
  return useMemo(() => {
    if (state.status !== 'running' && state.status !== 'paused' && state.status !== 'completed') {
      return { current: 0, total: 0, percentage: 0 }
    }
    // We need recipe to know total steps - simplified
    return {
      current: state.status === 'completed' ? 100 : state.currentStepIndex + 1,
      total: 100, // placeholder
      percentage: state.status === 'completed' ? 100 : ((state.currentStepIndex + 1) / 100) * 100
    }
  }, [state])
}
```

**Step 4: Write step components (simplified examples)**

```tsx
// packages/tutorial-react/src/components/steps/InfoStep.tsx
import { forwardRef } from 'react'
import { clsx } from 'clsx'
import type { Step } from '@bora-estudar/tutorial-engine'
import styles from './Step.module.css'

interface InfoStepProps {
  step: Step
  onNext: () => void
  isLoading?: boolean
}

export const InfoStep = forwardRef<HTMLDivElement, InfoStepProps>(
  ({ step, onNext, isLoading }, ref) => {
    const content = step as any // InfoStep type
    return (
      <div ref={ref} className={clsx(styles.step, styles.infoStep)} role="dialog" aria-labelledby="step-title">
        <h2 id="step-title" className={styles.title}>{content.title}</h2>
        <div className={styles.content}>{content.content}</div>
        <button
          className={clsx(styles.cta, styles.primary)}
          onClick={onNext}
          disabled={isLoading}
        >
          {content.cta?.label || 'Continuar'}
        </button>
      </div>
    )
  }
)

InfoStep.displayName = 'InfoStep'
```

```tsx
// packages/tutorial-react/src/components/steps/SelectStep.tsx
import { forwardRef } from 'react'
import { clsx } from 'clsx'
import type { Step } from '@bora-estudar/tutorial-engine'
import { useStep } from '../hooks'
import styles from './Step.module.css'

interface SelectStepProps {
  step: Step
  isLoading?: boolean
}

export const SelectStep = forwardRef<HTMLDivElement, SelectStepProps>(
  ({ step, isLoading }, ref) => {
    const { handleMultiSelectChange, next, canGoNext, canSkip, skip } = useStep()
    const selectStep = step as any // SelectStep type
    const mapsTo = selectStep.mapsTo ? (Array.isArray(selectStep.mapsTo) ? selectStep.mapsTo[0] : selectStep.mapsTo) : null
    const isMulti = selectStep.type === 'multi-select'
    const selected = (mapsTo ? selectStep.mapsTo : null) ? [] : [] // Get from state via hook context
    
    // Simplified - real implementation uses useTutorial state
    return (
      <div ref={ref} className={clsx(styles.step, styles.selectStep)} role="dialog" aria-labelledby="step-title">
        <h2 id="step-title" className={styles.title}>{selectStep.title}</h2>
        <p className={styles.content}>{selectStep.content}</p>
        
        <div className={styles.options} role="group" aria-label={selectStep.title}>
          {selectStep.options.map((option: any) => (
            <button
              key={option.id}
              className={clsx(styles.option, selected.includes(option.id) && styles.selected)}
              onClick={() => isMulti 
                ? handleMultiSelectChange(mapsTo!, option.id, !selected.includes(option.id))
                : handleMultiSelectChange(mapsTo!, option.id, true) // single: select and go
              }
              type="button"
            >
              {option.icon && <span className={styles.icon} aria-hidden="true">{option.icon}</span>}
              <span className={styles.label}>{option.label}</span>
              {option.description && <span className={styles.description}>{option.description}</span>}
            </button>
          ))}
        </div>
        
        <div className={styles.actions}>
          {canSkip && (
            <button className={clsx(styles.cta, styles.ghost)} onClick={skip} disabled={isLoading}>
              Pular
            </button>
          )}
          <button
            className={clsx(styles.cta, styles.primary, !canGoNext && styles.disabled)}
            onClick={next}
            disabled={isLoading || !canGoNext}
          >
            {selectStep.cta?.label || (isMulti ? 'Continuar' : 'Selecionar')}
          </button>
        </div>
      </div>
    )
  }
)

SelectStep.displayName = 'SelectStep'
```

```tsx
// packages/tutorial-react/src/components/steps/FormStep.tsx
import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { useStep } from '../hooks'
import styles from './Step.module.css'

export const FormStep = forwardRef<HTMLDivElement, { step: any; isLoading?: boolean }>(
  ({ step, isLoading }, ref) => {
    const { handleFieldChange, next, canGoNext, canSkip, skip } = useStep()
    
    return (
      <div ref={ref} className={clsx(styles.step, styles.formStep)} role="dialog" aria-labelledby="step-title">
        <h2 id="step-title" className={styles.title}>{step.title}</h2>
        <p className={styles.content}>{step.content}</p>
        
        <form className={styles.form} onSubmit={e => { e.preventDefault(); next() }}>
          {step.fields.map((field: any) => (
            <div key={field.name} className={styles.field}>
              <label htmlFor={field.name} className={styles.label}>
                {field.label}
                {field.validation?.required && <span className={styles.required} aria-hidden="true">*</span>}
              </label>
              {field.help && <p className={styles.help} id={`${field.name}-help`}>{field.help}</p>}
              
              {field.type === 'text' && (
                <input
                  id={field.name}
                  type="text"
                  className={styles.input}
                  placeholder={field.placeholder}
                  defaultValue={field.default}
                  onChange={e => handleFieldChange(field.name, e.target.value)}
                  aria-describedby={field.help ? `${field.name}-help` : undefined}
                />
              )}
              {field.type === 'number' && (
                <input
                  id={field.name}
                  type="number"
                  className={styles.input}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  defaultValue={field.default}
                  onChange={e => handleFieldChange(field.name, Number(e.target.value))}
                />
              )}
              {field.type === 'date' && (
                <input
                  id={field.name}
                  type="date"
                  className={styles.input}
                  defaultValue={field.default}
                  onChange={e => handleFieldChange(field.name, e.target.value)}
                />
              )}
              {field.type === 'select' && (
                <select
                  id={field.name}
                  className={styles.select}
                  defaultValue={field.default}
                  onChange={e => handleFieldChange(field.name, e.target.value)}
                >
                  {field.options?.map((opt: any) => (
                    <option key={opt.id} value={opt.value ?? opt.id}>{opt.label}</option>
                  ))}
                </select>
              )}
            </div>
          ))}
          
          <div className={styles.actions}>
            {canSkip && <button type="button" className={clsx(styles.cta, styles.ghost)} onClick={skip}>Pular</button>}
            <button type="submit" className={clsx(styles.cta, styles.primary, !canGoNext && styles.disabled)} disabled={isLoading || !canGoNext}>
              {step.cta?.label || 'Continuar'}
            </button>
          </div>
        </form>
      </div>
    )
  }
)

FormStep.displayName = 'FormStep'
```

```tsx
// packages/tutorial-react/src/components/steps/ConfirmationStep.tsx
import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { useTutorial } from '../context'
import styles from './Step.module.css'

export const ConfirmationStep = forwardRef<HTMLDivElement, { step: any; isLoading?: boolean }>(
  ({ step, isLoading }, ref) => {
    const { state, next } = useTutorial()
    
    // Resolve template variables in content
    const content = step.content
      .replace(/\{\{(\w+)\}\}/g, (_, key) => String(state.stepData[key] ?? `{{${key}}}`))
    
    return (
      <div ref={ref} className={clsx(styles.step, styles.confirmationStep)} role="dialog" aria-labelledby="step-title">
        <h2 id="step-title" className={styles.title}>{step.title}</h2>
        <div className={styles.content} dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />
        
        <div className={styles.actions}>
          <button
            className={clsx(styles.cta, styles.primary)}
            onClick={next}
            disabled={isLoading}
          >
            {step.cta?.label || 'Confirmar'}
          </button>
        </div>
      </div>
    )
  }
)

ConfirmationStep.displayName = 'ConfirmationStep'
```

```tsx
// packages/tutorial-react/src/components/steps/SuccessStep.tsx
import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { useTutorial } from '../context'
import styles from './Step.module.css'

export const SuccessStep = forwardRef<HTMLDivElement, { step: any; isLoading?: boolean }>(
  ({ step, isLoading }, ref) => {
    const { state } = useTutorial()
    
    return (
      <div ref={ref} className={clsx(styles.step, styles.successStep)} role="dialog" aria-labelledby="step-title">
        <div className={styles.successIcon} aria-hidden="true">✨</div>
        <h2 id="step-title" className={styles.title}>{step.title}</h2>
        <div className={styles.content}>{step.content}</div>
        
        <div className={styles.actions}>
          <button
            className={clsx(styles.cta, styles.primary)}
            onClick={() => { /* Navigation handled by onComplete */ }}
            disabled={isLoading}
          >
            {step.cta?.label || 'Finalizar'}
          </button>
        </div>
      </div>
    )
  }
)

SuccessStep.displayName = 'SuccessStep'
```

**Step 5: Write StepRenderer (dispatcher)**
```tsx
// packages/tutorial-react/src/components/StepRenderer.tsx
import { useMemo } from 'react'
import { InfoStep } from './steps/InfoStep'
import { SelectStep } from './steps/SelectStep'
import { FormStep } from './steps/FormStep'
import { ConfirmationStep } from './steps/ConfirmationStep'
import { SuccessStep } from './steps/SuccessStep'
import type { Step } from '@bora-estudar/tutorial-engine'

const stepComponents: Record<string, React.ComponentType<any>> = {
  info: InfoStep,
  'single-select': SelectStep,
  'multi-select': SelectStep,
  form: FormStep,
  confirmation: ConfirmationStep,
  success: SuccessStep
}

interface StepRendererProps {
  step: Step | null
  isLoading?: boolean
  customComponents?: Record<string, React.ComponentType<any>>
}

export function StepRenderer({ step, isLoading, customComponents = {} }: StepRendererProps) {
  const components = useMemo(() => ({ ...stepComponents, ...customComponents }), [customComponents])
  
  if (!step) return null
  
  const Component = components[step.type]
  if (!Component) {
    console.warn(`No component for step type: ${step.type}`)
    return <div className="tutorial-unknown-step">Unknown step type: {step.type}</div>
  }
  
  return <Component step={step} isLoading={isLoading} />
}
```

**Step 6: Write ProgressBar**
```tsx
// packages/tutorial-react/src/components/ProgressBar.tsx
import { clsx } from 'clsx'
import styles from './ProgressBar.module.css'

interface ProgressBarProps {
  current: number
  total: number
  showNumbers?: boolean
  stepLabels?: string[]
}

export function ProgressBar({ current, total, showNumbers = true, stepLabels }: ProgressBarProps) {
  const percentage = total > 0 ? (current / total) * 100 : 0
  
  return (
    <div className={styles.container} role="progressbar" aria-valuenow={current} aria-valuemin={0} aria-valuemax={total} aria-label={`Progresso: ${current} de ${total} passos`}>
      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${percentage}%` }} />
      </div>
      {showNumbers && (
        <div className={styles.labels}>
          {stepLabels?.map((label, i) => (
            <span key={i} className={clsx(styles.label, i < current && styles.completed, i === current && styles.current)}>
              {label}
            </span>
          ))}
        </div>
      )}
      <span className={styles.percentage} aria-hidden="true">{Math.round(percentage)}%</span>
    </div>
  )
}
```

**Step 7: Write TutorialModal (main UI)**
```tsx
// packages/tutorial-react/src/components/TutorialModal.tsx
import { useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import { AnimatePresence, motion } from 'framer-motion' // optional dep
import { StepRenderer } from './StepRenderer'
import { ProgressBar } from './ProgressBar'
import { useTutorial, useStep } from '../hooks'
import styles from './TutorialModal.module.css'

interface TutorialModalProps {
  isOpen: boolean
  onClose: () => void
  onComplete?: (recipeId: string, data: Record<string, unknown>) => void
  customComponents?: Record<string, React.ComponentType<any>>
}

export function TutorialModal({ isOpen, onClose, onComplete, customComponents }: TutorialModalProps) {
  const { state, engine, next, previous, skip, abort } = useTutorial()
  const { step, canGoNext, canGoPrevious, canSkip } = useStep()
  const previousStepRef = useRef(step?.id)
  
  // Focus management
  const dialogRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus()
    }
  }, [isOpen])
  
  // Handle completion
  useEffect(() => {
    if (state.status === 'completed' && engine && onComplete) {
      onComplete(state.recipeId, state.finalData)
    }
  }, [state.status, engine, onComplete])
  
  // Track step changes for analytics
  useEffect(() => {
    if (step?.id !== previousStepRef.current && previousStepRef.current) {
      console.log('[Tutorial] Step changed:', previousStepRef.current, '->', step?.id)
    }
    previousStepRef.current = step?.id
  }, [step?.id])
  
  if (!isOpen) return null
  
  const totalSteps = engine?._internal.getResolvedStep?.() // Simplified
  
  return (
    <AnimatePresence>
      <div className={styles.overlay} onClick={onClose} role="presentation">
        <motion.div
          ref={dialogRef}
          className={styles.modal}
          role="dialog"
          aria-modal="true"
          aria-labelledby="tutorial-title"
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          transition={{ duration: 0.2 }}
          onClick={e => e.stopPropagation()}
          tabIndex={-1}
        >
          <div className={styles.header}>
            <h1 id="tutorial-title" className={styles.title}>
              {step?.title || 'Tutorial'}
            </h1>
            <button className={styles.close} onClick={() => abort('user')} aria-label="Fechar tutorial">
              ×
            </button>
          </div>
          
          {step && step.type !== 'success' && (
            <ProgressBar
              current={state.currentStepIndex + 1}
              total={totalSteps || 5}
              showNumbers={true}
              stepLabels={step?.id ? [step.id] : []} // Simplified
            />
          )}
          
          <div className={styles.content}>
            <StepRenderer step={step} isLoading={false} customComponents={customComponents} />
          </div>
          
          <div className={styles.footer}>
            {canGoPrevious && (
              <button className={clsx(styles.btn, styles.secondary)} onClick={previous}>
                Voltar
              </button>
            )}
            {canSkip && (
              <button className={clsx(styles.btn, styles.ghost)} onClick={skip}>
                Pular
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
```

**Step 8: Write index.ts + styles.css + Storybook stories + tests**

**Commit:** `feat(react): provider, hooks, step components, modal, progress bar`

---

### Task 2.2: tutorial-react - A11y & Polish

**Objective:** Focus trap, keyboard nav, ARIA live regions, reduced motion, contrast.

**Files:**
- Update: `packages/tutorial-react/src/components/TutorialModal.tsx`
- Create: `packages/tutorial-react/src/hooks/useFocusTrap.ts`
- Create: `packages/tutorial-react/src/hooks/useReducedMotion.ts`
- Update: Storybook stories for a11y testing

**Step 1: Write useFocusTrap.ts**
```tsx
// packages/tutorial-react/src/hooks/useFocusTrap.ts
import { useEffect, useRef } from 'react'

export function useFocusTrap(enabled: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)
  
  useEffect(() => {
    if (!enabled || !containerRef.current) return
    
    const container = containerRef.current
    previousActiveElement.current = document.activeElement as HTMLElement
    
    const focusableElements = container.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    const firstElement = focusableElements[0]
    const lastElement = focusableElements[focusableElements.length - 1]
    
    firstElement?.focus()
    
    function handleTab(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      
      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement?.focus()
        }
      } else {
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement?.focus()
        }
      }
    }
    
    document.addEventListener('keydown', handleTab)
    return () => {
      document.removeEventListener('keydown', handleTab)
      previousActiveElement.current?.focus()
    }
  }, [enabled])
  
  return containerRef
}
```

**Step 2: Write useReducedMotion.ts**
```tsx
// packages/tutorial-react/src/hooks/useReducedMotion.ts
import { useMediaQuery } from 'react-responsive' // or custom implementation

export function useReducedMotion(): boolean {
  // Simple implementation
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}
```

**Step 3: Integrate in TutorialModal**

**Commit:** `feat(react): a11y - focus trap, reduced motion, keyboard nav, ARIA`

---

### Task 2.3: tutorial-react - Storybook Stories & Tests

**Objective:** Stories para todos step types + states (loading, error, empty, complete). Vitest + Testing Library tests.

**Files:**
- Create: `packages/tutorial-react/.storybook/main.ts`
- Create: `packages/tutorial-react/.storybook/preview.ts`
- Create: `packages/tutorial-react/src/components/steps/*.stories.tsx`
- Create: `packages/tutorial-react/src/components/TutorialModal.stories.tsx`
- Create: `packages/tutorial-react/src/__tests__/TutorialModal.test.tsx`

**Commit:** `feat(react): storybook stories, unit tests`

---

## Fase 3: Analytics & Persistence Packages

### Task 3.1: tutorial-analytics - Event Collector & Providers

**Objective:** Adapter pattern para GA4, Mixpanel, Amplitude, Custom.

**Files:**
- Create: `packages/tutorial-analytics/package.json`
- Create: `packages/tutorial-analytics/src/types.ts`
- Create: `packages/tutorial-analytics/src/collector.ts`
- Create: `packages/tutorial-analytics/src/providers/ga4.ts`
- Create: `packages/tutorial-analytics/src/providers/mixpanel.ts`
- Create: `packages/tutorial-analytics/src/providers/custom.ts`
- Create: `packages/tutorial-analytics/src/index.ts`

**Commit:** `feat(analytics): event collector, GA4/Mixpanel/Custom providers`

### Task 3.2: tutorial-persistence - Adapters (already done in engine)

**Note:** Persistence adapters já incluídos no tutorial-engine. Este package pode ser opcional ou merged.

---

## Fase 4: Integração & App Exemplo

### Task 4.1: App Web (Next.js) - Integração Completa

**Objective:** App exemplo consumindo todos packages, demonstrando os 2 fluxos.

**Files:**
- Create: `apps/web/package.json`
- Create: `apps/web/next.config.js`
- Create: `apps/web/src/app/layout.tsx` (TutorialProvider)
- Create: `apps/web/src/app/page.tsx` (Dashboard com botões)
- Create: `apps/web/src/app/dashboard/page.tsx`
- Create: `apps/web/src/components/AuthContext.tsx`
- Create: `apps/web/src/components/TutorialTriggers.tsx`

**Commit:** `feat(web): example app with full integration`

---

## Fase 5: Qualidade, Docs & Release

### Task 5.1: E2E Tests (Playwright)

**Objective:** Testes end-to-end dos 2 fluxos completos.

**Files:**
- Create: `apps/web/playwright.config.ts`
- Create: `apps/web/e2e/criar-plano.spec.ts`
- Create: `apps/web/e2e/cronograma-avulso.spec.ts`

**Commit:** `test(e2e): playwright tests for both tutorial flows`

### Task 5.2: Documentation

**Objective:** READMEs, API docs, recipe authoring guide, migration guide.

**Files:**
- Create: `packages/tutorial-engine/README.md`
- Create: `packages/tutorial-recipes/README.md`
- Create: `packages/tutorial-react/README.md`
- Create: `docs/recipe-authoring.md`
- Create: `docs/migration-guide.md`
- Create: `docs/architecture.md`

**Commit:** `docs: comprehensive documentation for all packages`

### Task 5.3: CI/CD & Release

**Objective:** Pipeline completa com changesets, semantic release, npm publish.

**Files:**
- Update: `.github/workflows/ci.yml` (lint, test, build, e2e)
- Create: `.github/workflows/release.yml`
- Create: `.changeset/config.json`

**Commit:** `ci: complete pipeline with changesets and semantic release`

---

## Riscos & Mitigação

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Zod validation performance em runtime | Baixa | Médio | Compile-time types + runtime validation apenas em dev |
| Recipe YAML loading no browser (SSR) | Média | Alto | Build-time copy to dist, dynamic import fallback |
| Focus trap conflicts com modais aninhados | Média | Médio | useFocusTrap com prioridade, portal rendering |
| Bundle size do React adapter | Baixa | Médio | Tree-shaking, dynamic imports para step components |
| Migração de progresso entre versões | Média | Alto | Testes automatizados de migração v1→v2 no CI |

---

## Estimativa de Esforço

| Fase | Tasks | Dias Estimados |
|------|-------|----------------|
| 1. Fundação & Core | 1.1 - 1.4 | 4-5 |
| 2. React Adapter | 2.1 - 2.3 | 5-6 |
| 3. Analytics | 3.1 | 1-2 |
| 4. App Exemplo | 4.1 | 2-3 |
| 5. Qualidade & Release | 5.1 - 5.3 | 2-3 |
| **Total** | **14 tasks** | **14-19 dias** |

---

## Próximo Passo Imediato

**Gerar arquivo `tasks/` com breakdown granular (2-5 min por task) para execução via subagent-driven-development.**

Cada task no arquivo `tasks/` terá:
- Objetivo único
- Files exatos (create/modify/test)
- Código completo copy-pasteable
- Comando de verificação exato
- Commit message padronizado

---

*Plano salvo em: `plans/2026-06-08_tutorial-system-plan.md`*
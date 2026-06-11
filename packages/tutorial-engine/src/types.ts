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
  validation: z.unknown().optional(),
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
    custom: z.string().optional()
  }).optional(),
  options: z.array(z.object({
    id: z.string(),
    label: z.string(),
    value: z.unknown()
  })).optional(),
  help: z.string().optional(),
  dependsOn: z.object({
    step: z.string(),
    condition: z.string()
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
  component: z.string(),
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
  | { status: 'paused'; recipeId: string; currentStepIndex: number; stepData: Record<string, unknown>; completedSteps: string[] }
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

export type TutorialEventListener = (event: TutorialEvent) => void
export type TutorialStateListener = (state: TutorialState) => void

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
  today: string
  now: string
}

export interface TutorialEngine {
  start(recipeId: string, initialData?: Record<string, unknown>): Promise<void>
  next(): Promise<void>
  previous(): Promise<void>
  skip(): Promise<void>
  abort(reason?: string): Promise<void>
  getState(): TutorialState
  subscribe(listener: TutorialStateListener): () => void
  persist(): Promise<void>
  restore(): Promise<void>
  destroy(): void
  _internal: {
    getResolvedStep(): Step | null
    getFullContext(): EngineContext
  }
}

export interface EngineConfig {
  recipes: Map<string, Recipe>
  persistence?: PersistenceAdapter
  analytics?: AnalyticsAdapter
  context: EngineContext
  onError?: (error: Error, event: TutorialEvent) => void
  onStateChange?: TutorialStateListener
}
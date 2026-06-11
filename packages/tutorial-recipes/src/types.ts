// packages/tutorial-recipes/src/types.ts
export interface Recipe {
  schemaVersion: number
  id: string
  title: string
  description?: string
  estimatedMinutes?: number
  metadata: {
    category: 'onboarding' | 'quick-action' | 'feature' | 'custom'
    icon?: string
    color?: string
    requiredForBadge?: boolean
  }
  settings: {
    allowSkip?: boolean
    allowBack?: boolean
    persistProgress?: boolean
    autoAdvance?: boolean
    showProgressBar?: boolean
    showStepNumbers?: boolean
  }
  initialData: Record<string, unknown>
  steps: Step[]
}

export interface Step {
  id: string
  type: 'info' | 'single-select' | 'multi-select' | 'form' | 'confirmation' | 'success' | 'custom'
  title: string
  content?: string
  optional?: boolean
  validation?: Record<string, unknown>
  mapsTo?: string | string[]
  dependsOn?: string[]
  ui?: Record<string, unknown>
  cta?: {
    label: string
    action: 'next' | 'complete' | 'custom'
    variant?: 'primary' | 'secondary' | 'ghost'
    customAction?: string
  }
  onComplete?: Array<{
    action: 'emit' | 'navigate' | 'custom'
    event?: string
    payload?: Record<string, unknown>
    path?: string
  }>
  options?: Array<{
    id: string
    label: string
    icon?: string
    description?: string
    value?: unknown
    showsField?: string
  }>
  fields?: Array<{
    name: string
    type: 'text' | 'number' | 'date' | 'select' | 'multi-select' | 'textarea' | 'checkbox'
    label: string
    placeholder?: string
    default?: unknown
    min?: number
    max?: number
    step?: number
    validation?: Record<string, unknown>
    options?: Array<{ id: string; label: string; value: unknown }>
    help?: string
    dependsOn?: { step: string; condition: string }
  }>
  component?: string
  props?: Record<string, unknown>
}
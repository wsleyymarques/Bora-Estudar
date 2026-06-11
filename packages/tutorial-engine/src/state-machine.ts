// packages/tutorial-engine/src/state-machine.ts
import type { TutorialState, TutorialEvent, Step, Recipe, EngineContext, SelectStep, FormStep, InfoStep, ConfirmationStep, SuccessStep, CustomStep } from './types'

export function createInitialState(): TutorialState {
  return { status: 'idle' }
}

export function isRunningOrPaused(state: TutorialState): state is Extract<TutorialState, { status: 'running' | 'paused' }> {
  return state.status === 'running' || state.status === 'paused'
}

export function getCurrentStep(state: TutorialState, recipes: Map<string, Recipe>): Step | null {
  if (!isRunningOrPaused(state)) return null
  const recipe = recipes.get(state.recipeId)
  if (!recipe) return null
  return recipe.steps[state.currentStepIndex] ?? null
}

export function canGoNext(state: TutorialState, recipes: Map<string, Recipe>): boolean {
  if (!isRunningOrPaused(state)) return false
  const recipe = recipes.get(state.recipeId)
  if (!recipe) return false
  return state.currentStepIndex < recipe.steps.length - 1
}

export function canGoPrevious(state: TutorialState): boolean {
  return isRunningOrPaused(state) && state.currentStepIndex > 0
}

export function transitionNext(state: TutorialState, recipes: Map<string, Recipe>): TutorialState {
  if (!canGoNext(state, recipes)) return state
  if (!isRunningOrPaused(state)) return state
  const recipe = recipes.get(state.recipeId)!
  const nextIndex = state.currentStepIndex + 1
  return {
    ...state,
    currentStepIndex: nextIndex,
    completedSteps: [...state.completedSteps, recipe.steps[state.currentStepIndex].id]
  }
}

export function transitionPrevious(state: TutorialState, recipes: Map<string, Recipe>): TutorialState {
  if (!canGoPrevious(state)) return state
  if (!isRunningOrPaused(state)) return state
  const recipe = recipes.get(state.recipeId)!
  const prevIndex = state.currentStepIndex - 1
  const completedSteps = state.completedSteps.filter(
    (_, i) => i < prevIndex
  )
  return { ...state, currentStepIndex: prevIndex, completedSteps }
}

export function transitionSkip(state: TutorialState, recipes: Map<string, Recipe>): TutorialState {
  if (!canGoNext(state, recipes)) return state
  if (!isRunningOrPaused(state)) return state
  const recipe = recipes.get(state.recipeId)!
  const currentStep = recipe.steps[state.currentStepIndex]
  if (!currentStep.optional) return state
  return transitionNext(state, recipes)
}

export function transitionComplete(
  state: TutorialState,
  recipes: Map<string, Recipe>,
  finalData: Record<string, unknown>
): TutorialState {
  if (!isRunningOrPaused(state)) return state
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
  if (!isRunningOrPaused(state)) return state
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
    if (key in stepData) return String(stepData[key])
    if (key in context) return String(context[key])
    return `{{${key}}}`
  })
}

function mapOptions(
  options: SelectStep['options'],
  context: EngineContext,
  stepData: Record<string, unknown>
) {
  return options.map(opt => ({
    ...opt,
    label: resolveTemplates(opt.label, context, stepData),
    description: opt.description ? resolveTemplates(opt.description, context, stepData) : undefined
  }))
}

function mapFields(
  fields: FormStep['fields'],
  context: EngineContext,
  stepData: Record<string, unknown>
) {
  return fields.map(field => ({
    ...field,
    label: resolveTemplates(field.label, context, stepData),
    placeholder: field.placeholder ? resolveTemplates(field.placeholder, context, stepData) : undefined,
    help: field.help ? resolveTemplates(field.help, context, stepData) : undefined
  }))
}

export function resolveStepContent(
  step: Step,
  context: EngineContext,
  stepData: Record<string, unknown>
): Step {
  const base = {
    id: step.id,
    type: step.type,
    title: step.title ? resolveTemplates(step.title, context, stepData) : step.title,
    content: step.content ? resolveTemplates(step.content, context, stepData) : step.content,
    optional: step.optional,
    validation: step.validation,
    mapsTo: step.mapsTo,
    dependsOn: step.dependsOn,
    ui: step.ui,
    cta: step.cta ? { ...step.cta, label: resolveTemplates(step.cta.label, context, stepData) } : step.cta,
    onComplete: step.onComplete
  }
  
  // Use type assertions since Zod validates at runtime and we're just transforming
  if (step.type === 'single-select' || step.type === 'multi-select') {
    const selectStep = step as SelectStep
    return { ...base, options: mapOptions(selectStep.options, context, stepData) } as Step
  }
  
  if (step.type === 'form') {
    const formStep = step as FormStep
    return { ...base, fields: mapFields(formStep.fields, context, stepData) } as Step
  }
  
  if (step.type === 'custom') {
    const customStep = step as CustomStep
    return { ...base, component: customStep.component, props: customStep.props } as Step
  }
  
  return base as Step
}
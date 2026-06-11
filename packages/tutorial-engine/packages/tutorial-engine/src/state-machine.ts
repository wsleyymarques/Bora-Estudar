// packages/tutorial-engine/src/state-machine.ts
import type { TutorialState, TutorialEvent, Step, Recipe, EngineContext } from './types'

export function createInitialState(): TutorialState {
  return { status: 'idle' }
}

function isRunningOrPaused(state: TutorialState): state is Extract<TutorialState, { status: 'running' | 'paused' }> {
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

function isSelectStep(step: Step): step is Step & { options: Array<{ label: string; description?: string }> } {
  return 'options' in step && Array.isArray(step.options)
}

function isFormStep(step: Step): step is Step & { fields: Array<{ label: string; placeholder?: string; help?: string }> } {
  return 'fields' in step && Array.isArray(step.fields)
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
  
  if (isSelectStep(step)) {
    resolved.options = step.options.map(opt => ({
      ...opt,
      label: resolveTemplates(opt.label, context, stepData),
      description: opt.description ? resolveTemplates(opt.description, context, stepData) : undefined
    }))
  }
  
  if (isFormStep(step)) {
    resolved.fields = step.fields.map(field => ({
      ...field,
      label: resolveTemplates(field.label, context, stepData),
      placeholder: field.placeholder ? resolveTemplates(field.placeholder, context, stepData) : undefined,
      help: field.help ? resolveTemplates(field.help, context, stepData) : undefined
    }))
  }
  
  return resolved
}
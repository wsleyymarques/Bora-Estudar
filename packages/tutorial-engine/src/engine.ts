// packages/tutorial-engine/src/engine.ts
import { createEventEmitter } from './event-emitter'
import { createInitialState, transitionStart, transitionNext, transitionPrevious, transitionSkip, transitionComplete, transitionAbort, getCurrentStep, resolveStepContent, isRunningOrPaused } from './state-machine'
import type { TutorialEngine, TutorialState, TutorialEvent, Recipe, EngineConfig, PersistenceAdapter, AnalyticsAdapter, EngineContext, TutorialStateListener, Step } from './types'

const PERSISTENCE_KEY_PREFIX = 'tutorial:progress:'

function getRunningState(state: TutorialState): Extract<TutorialState, { status: 'running' }> | null {
  if (state.status === 'running') return state
  return null
}

function getRunningOrPausedState(state: TutorialState): Extract<TutorialState, { status: 'running' | 'paused' }> | null {
  if (isRunningOrPaused(state)) return state
  return null
}

export function createEngine(config: EngineConfig): TutorialEngine {
  const { recipes, persistence, analytics, context, onError, onStateChange } = config
  const emitter = createEventEmitter()
  let state = createInitialState()
  let isDestroyed = false
  
  function getFullContext(): EngineContext {
    return {
      ...context,
      today: new Date().toISOString().split('T')[0],
      now: new Date().toISOString()
    }
  }
  
  async function persistState() {
    if (!persistence || isDestroyed) return
    const runningState = getRunningOrPausedState(state)
    if (!runningState) return
    const key = `${PERSISTENCE_KEY_PREFIX}${runningState.recipeId}`
    const data = {
      schemaVersion: 1,
      recipeId: runningState.recipeId,
      currentStepIndex: runningState.currentStepIndex,
      stepData: runningState.stepData,
      completedSteps: runningState.completedSteps,
      startedAt: runningState.status === 'running' ? new Date().toISOString() : 'unknown',
      lastActiveAt: new Date().toISOString(),
      version: recipes.get(runningState.recipeId)?.schemaVersion ?? 1
    }
    await persistence.save(key, data)
  }
  
  async function restoreState(recipeId: string) {
    if (!persistence) return null
    const key = `${PERSISTENCE_KEY_PREFIX}${recipeId}`
    const data = await persistence.load(key)
    return data as any
  }
  
  async function trackAnalytics(event: TutorialEvent) {
    if (!analytics) return
    try {
      const runningState = getRunningState(state)
      const step = runningState ? getCurrentStep(state, recipes) : null
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
  
  function notifyStateChange() {
    if (onStateChange) onStateChange(state)
  }
  
  async function start(recipeId: string, initialData: Record<string, unknown> = {}) {
    if (isDestroyed) return
    const recipe = recipes.get(recipeId)
    if (!recipe) throw new Error(`Recipe not found: ${recipeId}`)
    
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
    notifyStateChange()
  }
  
  async function next() {
    if (isDestroyed) return
    const runningState = getRunningState(state)
    if (!runningState) return
    const recipe = recipes.get(runningState.recipeId)!
    const currentStep = recipe.steps[runningState.currentStepIndex]
    
    const validationError = validateStep(currentStep, runningState.stepData)
    if (validationError) {
      const errorEvent: TutorialEvent = {
        type: 'tutorial:error',
        recipeId: runningState.recipeId,
        stepId: currentStep.id,
        error: new Error(validationError),
        timestamp: new Date().toISOString()
      }
      emitter.emit(errorEvent)
      if (onError) onError(errorEvent.error, errorEvent)
      return
    }
    
    state = transitionNext(runningState, recipes)
    
    const event: TutorialEvent = {
      type: 'tutorial:step:complete',
      recipeId: runningState.recipeId,
      stepId: currentStep.id,
      index: runningState.currentStepIndex,
      data: runningState.stepData,
      timestamp: new Date().toISOString()
    }
    emitter.emit(event)
    await trackAnalytics(event)
    await persistState()
    notifyStateChange()
    
    // Check if completed by checking new state
    const newRunningState = getRunningState(state)
    if (newRunningState && newRunningState.currentStepIndex >= recipe.steps.length) {
      await complete()
    }
  }
  
  async function previous() {
    if (isDestroyed) return
    const runningState = getRunningOrPausedState(state)
    if (!runningState) return
    const recipe = recipes.get(runningState.recipeId)!
    
    state = transitionPrevious(runningState, recipes)
    
    const event: TutorialEvent = {
      type: 'tutorial:step:start',
      recipeId: runningState.recipeId,
      stepId: recipe.steps[runningState.currentStepIndex].id,
      index: runningState.currentStepIndex - 1,
      timestamp: new Date().toISOString()
    }
    emitter.emit(event)
    await trackAnalytics(event)
    await persistState()
    notifyStateChange()
  }
  
  async function skip() {
    if (isDestroyed) return
    const runningState = getRunningState(state)
    if (!runningState) return
    const recipe = recipes.get(runningState.recipeId)!
    const currentStep = recipe.steps[runningState.currentStepIndex]
    
    if (!currentStep.optional) return
    
    state = transitionSkip(runningState, recipes)
    
    const event: TutorialEvent = {
      type: 'tutorial:step:skip',
      recipeId: runningState.recipeId,
      stepId: currentStep.id,
      index: runningState.currentStepIndex,
      timestamp: new Date().toISOString()
    }
    emitter.emit(event)
    await trackAnalytics(event)
    await persistState()
    notifyStateChange()
  }
  
  async function abort(reason: 'user' | 'error' = 'user') {
    if (isDestroyed) return
    const runningState = getRunningOrPausedState(state)
    if (!runningState) return
    const atStep = runningState.currentStepIndex
    const recipeId = runningState.recipeId
    
    state = transitionAbort(runningState, reason)
    
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
    notifyStateChange()
  }
  
  async function complete() {
    if (isDestroyed) return
    const runningState = getRunningState(state)
    if (!runningState) return
    const recipe = recipes.get(runningState.recipeId)!
    const finalData = { ...runningState.stepData }
    
    state = transitionComplete(state, recipes, finalData)
    
    const event: TutorialEvent = {
      type: 'tutorial:complete',
      recipeId: runningState.recipeId,
      finalData,
      timestamp: new Date().toISOString()
    }
    emitter.emit(event)
    await trackAnalytics(event)
    
    const lastStep = recipe.steps[recipe.steps.length - 1]
    if (lastStep.onComplete) {
      for (const action of lastStep.onComplete) {
        if (action.action === 'emit' && action.event) {
          emitter.emit({ type: action.event, ...action.payload, timestamp: new Date().toISOString() } as TutorialEvent)
        }
      }
    }
    
    if (persistence) {
      await persistence.delete(`${PERSISTENCE_KEY_PREFIX}${runningState.recipeId}`)
    }
    notifyStateChange()
  }
  
  function getState(): TutorialState {
    return state
  }
  
  function subscribe(listener: TutorialStateListener) {
    listener(state)
    return emitter.subscribe(listener as any)
  }
  
  async function persist() {
    await persistState()
  }
  
  async function restore() {
  }
  
  function destroy() {
    isDestroyed = true
  }
  
  function getResolvedStep(): Step | null {
    const runningState = getRunningOrPausedState(state)
    if (!runningState) return null
    const step = getCurrentStep(state, recipes)
    if (!step) return null
    return resolveStepContent(step, getFullContext(), runningState.stepData)
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
    _internal: { getResolvedStep, getFullContext }
  }
}

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
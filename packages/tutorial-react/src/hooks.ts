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
      const current = (prev[name] as string[]) || []
      if (selected) return { ...prev, [name]: [...current, optionId] }
      return { ...prev, [name]: current.filter(id => id !== optionId) }
    })
  }, [updateStepData])
  
  const canGoNext = useMemo(() => {
    if (state.status !== 'running') return false
    if (!currentStep) return false
    if (currentStep.type === 'confirmation' || currentStep.type === 'success') return true
    if (currentStep.type === 'info') return true
    if (currentStep.type === 'single-select' || currentStep.type === 'multi-select') {
      const mapsTo = currentStep.mapsTo ? (Array.isArray(currentStep.mapsTo) ? currentStep.mapsTo[0] : currentStep.mapsTo) : null
      if (!mapsTo) return true
      const value = state.stepData[mapsTo] as string[] | undefined
      const selections = Array.isArray(value) ? value.length : (value ? 1 : 0)
      return currentStep.optional !== false || selections > 0
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
  const { state, engine } = useTutorial()
  
  return useMemo(() => {
    if (state.status !== 'running' && state.status !== 'paused' && state.status !== 'completed') {
      return { current: 0, total: 0, percentage: 0 }
    }
    
    let total = 0
    if (engine) {
      const recipe = engine._internal.getFullContext()
      // We can't easily get total steps here without exposing it
      // This is a simplified version
    }
    
    return {
      current: state.status === 'completed' ? 100 : (state as any).currentStepIndex + 1,
      total: 100,
      percentage: state.status === 'completed' ? 100 : Math.round((((state as any).currentStepIndex + 1) / 100) * 100)
    }
  }, [state, engine])
}
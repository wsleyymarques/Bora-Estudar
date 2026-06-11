// packages/tutorial-react/src/context.tsx
import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useMemo } from 'react'
import type { TutorialEngine, TutorialState, Recipe, Step } from '@bora-estudar/tutorial-engine'
import { createEngine } from '@bora-estudar/tutorial-engine'
import { createLocalStorageAdapter } from '@bora-estudar/tutorial-engine/persistence'

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
  analytics?: any
  context?: Record<string, unknown>
}

export function TutorialProvider({
  children,
  recipes,
  analytics,
  context = {}
}: TutorialProviderProps) {
  const [engine, setEngine] = useState<TutorialEngine | null>(null)
  const [state, setState] = useState<TutorialState>({ status: 'idle' })
  const [isLoading, setIsLoading] = useState(false)
  
  useEffect(() => {
    const persistence = createLocalStorageAdapter()
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
  }, [recipes, analytics, context])
  
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
      Object.assign(current.stepData, data)
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
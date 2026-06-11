// packages/tutorial-react/src/engine.ts
// Minimal engine interface for the app - will use the real engine when packages are linked

export interface TutorialEngine {
  start(recipeId: string, initialData?: Record<string, unknown>): Promise<void>
  next(): Promise<void>
  previous(): Promise<void>
  skip(): Promise<void>
  abort(reason?: string): Promise<void>
  getState(): any
  subscribe(listener: (state: any) => void): () => void
  destroy(): void
  _internal: {
    getResolvedStep(): any
    getFullContext(): any
  }
}

export interface Recipe {
  id: string
  title: string
  steps: any[]
}

export interface TutorialState {
  status: 'idle' | 'running' | 'paused' | 'completed' | 'aborted'
  recipeId?: string
  currentStepIndex?: number
  stepData?: Record<string, unknown>
  completedSteps?: string[]
  finalData?: Record<string, unknown>
  reason?: string
  atStep?: number
}
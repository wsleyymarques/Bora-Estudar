// src/components/tutorial/TutorialModal.tsx
import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, SkipForward, ExternalLink, Loader2 } from 'lucide-react'
import { useTutorial } from '@/contexts/TutorialContext'
import { StepRenderer } from './step-renderers'
import { cn } from '@/lib/utils'

export function TutorialModal({ onComplete }: { onComplete?: (recipeId: string, data: Record<string, unknown>) => void }) {
  const { 
    state, 
    currentStep, 
    next, 
    previous, 
    skip, 
    abort, 
    canGoNext, 
    canGoPrevious, 
    canSkip,
    isLoading,
    tutorialProgress
  } = useTutorial()
  
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousStepRef = useRef(currentStep?.id)
  
  useEffect(() => {
    if (dialogRef.current) {
      dialogRef.current.focus()
    }
  }, [])
  
  useEffect(() => {
    if (state.status === 'completed' && onComplete && state.recipeId) {
      onComplete(state.recipeId, state.stepData)
    }
  }, [state.status, state.recipeId, state.stepData, onComplete])
  
  useEffect(() => {
    if (currentStep?.id !== previousStepRef.current && previousStepRef.current) {
      console.log('[Tutorial] Step changed:', previousStepRef.current, '->', currentStep?.id)
    }
    previousStepRef.current = currentStep?.id
  }, [currentStep?.id])
  
  const showProgress = currentStep && currentStep.type !== 'success'
  const totalSteps = state.recipeId === 'criar-plano' ? 6 : 4
  
  if (state.status === 'idle' || state.status === 'aborted' || !currentStep) {
    return null
  }
  
  // Debug log
  console.log('[TutorialModal] currentStep:', currentStep?.id, 'type:', currentStep?.type, 'canGoNext:', canGoNext, 'isLoading:', isLoading, 'state:', state)
  
  const handleClose = () => abort('user')
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) abort('user')
  }
  
  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 overflow-y-auto" role="presentation" style={{ pointerEvents: 'auto' }}>
        <div className="flex min-h-full items-center justify-center p-4" style={{ pointerEvents: 'auto' }}>
          <motion.div
            className="fixed inset-0 bg-black/50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => {
              if (e.target === e.currentTarget) abort('user')
            }}
            aria-hidden="true"
          />
          
          <motion.div
            ref={dialogRef}
            className={cn(
              "relative w-full max-w-4xl rounded-2xl shadow-xl",
              "bg-background border border-border"
            )}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="tutorial-title"
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            style={{ pointerEvents: 'auto' }}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h1 id="tutorial-title" className="text-xl font-semibold text-foreground">
                {currentStep?.title}
              </h1>
              <button
                onClick={() => abort('user')}
                className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-accent cursor-pointer"
                aria-label="Fechar tutorial"
                style={{ pointerEvents: 'auto' }}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {currentStep.type !== 'success' && (
              <div className="border-b border-border px-6 py-3">
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                  <span>Passo {state.currentStepIndex + 1} de {totalSteps}</span>
                  <span>{tutorialProgress.percentage}%</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-primary"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(100, tutorialProgress.percentage)}%` }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  />
                </div>
              </div>
            )}
            
            <div className="p-6 max-h-[60vh] overflow-y-auto" style={{ pointerEvents: 'auto' }}>
              <StepRenderer step={currentStep} isLoading={isLoading} />
            </div>
            
            {/* Footer com pointer-events explícito */}
            <div className="flex items-center justify-between gap-3 border-t border-border px-6 py-4 bg-card" style={{ pointerEvents: 'auto', zIndex: 10 }}>
              {canGoPrevious && (
                <button
                  onClick={previous}
                  disabled={isLoading}
                  className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg bg-background border border-border hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </button>
              )}
              
              <div className="flex-1" />
              
              {canSkip && (
                <button
                  onClick={skip}
                  disabled={isLoading}
                  className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground px-4 py-2 rounded-lg hover:bg-accent transition-colors disabled:opacity-50 cursor-pointer"
                  style={{ pointerEvents: 'auto' }}
                >
                  <ExternalLink className="h-4 w-4" />
                  Pular
                </button>
              )}
              
              <button
                onClick={(e) => {
                  console.log('[TutorialModal] Next button clicked', { canGoNext, isLoading })
                  next()
                }}
                disabled={isLoading || !canGoNext}
                className={cn(
                  "px-6 py-2.5 rounded-lg font-medium transition-all cursor-pointer flex items-center justify-center gap-1",
                  canGoNext
                    ? "bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg"
                    : "bg-muted text-muted-foreground cursor-not-allowed",
                  "disabled:opacity-50"
                )}
                style={{ pointerEvents: 'auto' }}
              >
                {currentStep.type === 'success' || currentStep.type === 'confirmation'
                  ? (currentStep.cta?.label || 'Finalizar')
                  : currentStep.cta?.label || 'Continuar'}
                {currentStep.type !== 'confirmation' && currentStep.type !== 'success' && (
                  <ChevronLeft className="-rotate-180 h-4 w-4" />
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  )
}
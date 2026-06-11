// packages/tutorial-react/src/components/TutorialModal.tsx
import { useEffect, useRef } from 'react'
import { clsx } from 'clsx'
import { AnimatePresence, motion } from 'framer-motion'
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
  const dialogRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus()
    }
  }, [isOpen])
  
  useEffect(() => {
    if (state.status === 'completed' && engine && onComplete) {
      onComplete(state.recipeId, state.finalData)
    }
  }, [state.status, engine, onComplete])
  
  useEffect(() => {
    if (step?.id !== previousStepRef.current && previousStepRef.current) {
      console.log('[Tutorial] Step changed:', previousStepRef.current, '->', step?.id)
    }
    previousStepRef.current = step?.id
  }, [step?.id])
  
  if (!isOpen) return null
  
  // Calculate total steps from the recipe
  const totalSteps = engine ? Array.from(engine._internal.getFullContext ? engine._internal.getFullContext() : {}).length : 5
  
  return (
    <AnimatePresence>
      <div className={styles.overlay} onClick={onClose} role="presentation" aria-hidden="true">
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
              stepLabels={step?.id ? [step.id] : []}
            />
          )}
          
          <div className={styles.content}>
            <StepRenderer step={step} isLoading={false} customComponents={customComponents} />
          </div>
          
          <div className={styles.footer}>
            {canGoPrevious && (
              <button className={clsx(styles.btn, styles.secondary)} onClick={previous} disabled={!canGoPrevious}>
                Voltar
              </button>
            )}
            {canSkip && (
              <button className={clsx(styles.btn, styles.ghost)} onClick={skip} disabled={isLoading}>
                Pular
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
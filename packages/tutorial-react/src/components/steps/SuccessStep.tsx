// packages/tutorial-react/src/components/steps/SuccessStep.tsx
import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { useTutorial } from '../../context'
import styles from './Step.module.css'

interface SuccessStepProps {
  step: any
  isLoading?: boolean
}

export const SuccessStep = forwardRef<HTMLDivElement, SuccessStepProps>(
  ({ step, isLoading }, ref) => {
    const { state, engine } = useTutorial()
    
    // Handle onComplete actions - navigation would typically be handled by parent
    const handleComplete = () => {
      if (engine && step.onComplete) {
        for (const action of step.onComplete) {
          if (action.action === 'navigate' && action.path) {
            // Navigation would be handled by the app router
            console.log('Navigate to:', action.path)
          }
        }
      }
    }
    
    return (
      <div ref={ref} className={clsx(styles.step, styles.successStep)} role="dialog" aria-labelledby="step-title">
        <div className={styles.successIcon} aria-hidden="true">✨</div>
        <h2 id="step-title" className={styles.title}>{step.title}</h2>
        <div className={styles.content}>{step.content}</div>
        
        <div className={styles.actions}>
          <button
            className={clsx(styles.cta, styles.primary)}
            onClick={handleComplete}
            disabled={isLoading}
          >
            {step.cta?.label || 'Finalizar'}
          </button>
        </div>
      </div>
    )
  }
)

SuccessStep.displayName = 'SuccessStep'
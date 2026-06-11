// packages/tutorial-react/src/components/steps/ConfirmationStep.tsx
import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { useTutorial } from '../../context'
import styles from './Step.module.css'

interface ConfirmationStepProps {
  step: any
  isLoading?: boolean
}

export const ConfirmationStep = forwardRef<HTMLDivElement, ConfirmationStepProps>(
  ({ step, isLoading }, ref) => {
    const { state, next } = useTutorial()
    
    // Resolve template variables from stepData
    const content = step.content
      .replace(/\{\{(\w+)\}\}/g, (_, key) => String(state.stepData[key] ?? `{{${key}}}`))
    
    return (
      <div ref={ref} className={clsx(styles.step, styles.confirmationStep)} role="dialog" aria-labelledby="step-title">
        <h2 id="step-title" className={styles.title}>{step.title}</h2>
        <div className={styles.content} dangerouslySetInnerHTML={{ __html: content.replace(/\n/g, '<br/>') }} />
        
        <div className={styles.actions}>
          <button
            className={clsx(styles.cta, styles.primary)}
            onClick={next}
            disabled={isLoading}
          >
            {step.cta?.label || 'Confirmar'}
          </button>
        </div>
      </div>
    )
  }
)

ConfirmationStep.displayName = 'ConfirmationStep'
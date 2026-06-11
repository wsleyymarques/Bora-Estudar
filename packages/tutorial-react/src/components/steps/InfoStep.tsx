// packages/tutorial-react/src/components/steps/InfoStep.tsx
import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { useStep } from '../../hooks'
import styles from './Step.module.css'

interface InfoStepProps {
  step: any
  isLoading?: boolean
}

export const InfoStep = forwardRef<HTMLDivElement, InfoStepProps>(
  ({ step, isLoading }, ref) => {
    const { next, canGoNext } = useStep()
    
    return (
      <div ref={ref} className={clsx(styles.step, styles.infoStep)} role="dialog" aria-labelledby="step-title">
        <h2 id="step-title" className={styles.title}>{step.title}</h2>
        <div className={styles.content}>{step.content}</div>
        <div className={styles.actions}>
          <button
            className={clsx(styles.cta, styles.primary, !canGoNext && styles.disabled)}
            onClick={next}
            disabled={isLoading || !canGoNext}
          >
            {step.cta?.label || 'Continuar'}
          </button>
        </div>
      </div>
    )
  }
)

InfoStep.displayName = 'InfoStep'
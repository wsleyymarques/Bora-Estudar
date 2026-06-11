// packages/tutorial-react/src/components/steps/SelectStep.tsx
import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { useStep } from '../../hooks'
import styles from './Step.module.css'

interface SelectStepProps {
  step: any
  isLoading?: boolean
}

export const SelectStep = forwardRef<HTMLDivElement, SelectStepProps>(
  ({ step, isLoading }, ref) => {
    const { handleMultiSelectChange, next, previous, skip, abort, canGoNext, canGoPrevious, canSkip } = useStep()
    const selectStep = step
    const isMulti = selectStep.type === 'multi-select'
    const mapsTo = selectStep.mapsTo ? (Array.isArray(selectStep.mapsTo) ? selectStep.mapsTo[0] : selectStep.mapsTo) : null
    const selected = (mapsTo ? selectStep.stepData?.[mapsTo] as string[] ?? [] : []) ?? []
    
    const handleOptionClick = (optionId: string) => {
      if (isMulti) {
        handleMultiSelectChange(mapsTo!, optionId, !selected.includes(optionId))
      } else {
        handleMultiSelectChange(mapsTo!, optionId, true)
        next()
      }
    }
    
    return (
      <div ref={ref} className={clsx(styles.step, styles.selectStep)} role="dialog" aria-labelledby="step-title">
        <h2 id="step-title" className={styles.title}>{selectStep.title}</h2>
        <p className={styles.content}>{selectStep.content}</p>
        
        <div className={styles.options} role="group" aria-label={selectStep.title}>
          {selectStep.options.map((option: any) => (
            <button
              key={option.id}
              className={clsx(styles.option, selected.includes(option.id) && styles.selected)}
              onClick={() => handleOptionClick(option.id)}
              type="button"
              disabled={isLoading}
            >
              {option.icon && <span className={styles.icon} aria-hidden="true">{option.icon}</span>}
              <div className={styles.optionContent}>
                <span className={styles.label}>{option.label}</span>
                {option.description && <span className={styles.description}>{option.description}</span>}
              </div>
              {selected.includes(option.id) && <span className="material-icons" style={{color: '#6366f1'}}>check_circle</span>}
            </button>
          ))}
        </div>
        
        <div className={styles.actions}>
          {canGoPrevious && (
            <button className={clsx(styles.cta, styles.secondary)} onClick={previous} disabled={isLoading}>
              Voltar
            </button>
          )}
          {canSkip && (
            <button className={clsx(styles.cta, styles.ghost)} onClick={skip} disabled={isLoading}>
              Pular
            </button>
          )}
          <button
            className={clsx(styles.cta, styles.primary, !canGoNext && styles.disabled)}
            onClick={isMulti ? next : undefined}
            disabled={isLoading || !canGoNext}
          >
            {selectStep.cta?.label || (isMulti ? 'Continuar' : 'Selecionar')}
          </button>
        </div>
      </div>
    )
  }
)

SelectStep.displayName = 'SelectStep'
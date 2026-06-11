// packages/tutorial-react/src/components/steps/FormStep.tsx
import { forwardRef } from 'react'
import { clsx } from 'clsx'
import { useStep } from '../../hooks'
import styles from './Step.module.css'

interface FormStepProps {
  step: any
  isLoading?: boolean
}

export const FormStep = forwardRef<HTMLDivElement, FormStepProps>(
  ({ step, isLoading }, ref) => {
    const { handleFieldChange, next, previous, skip, abort, canGoNext, canGoPrevious, canSkip } = useStep()
    
    return (
      <div ref={ref} className={clsx(styles.step, styles.formStep)} role="dialog" aria-labelledby="step-title">
        <h2 id="step-title" className={styles.title}>{step.title}</h2>
        <p className={styles.content}>{step.content}</p>
        
        <form className={styles.form} onSubmit={e => { e.preventDefault(); next() }}>
          {step.fields.map((field: any) => (
            <div key={field.name} className={styles.field}>
              <label htmlFor={field.name} className={styles.label}>
                {field.label}
                {field.validation?.required && <span className={styles.required} aria-hidden="true">*</span>}
              </label>
              {field.help && <p className={styles.help} id={`${field.name}-help`}>{field.help}</p>}
              
              {field.type === 'text' && (
                <input
                  id={field.name}
                  type="text"
                  className={styles.input}
                  placeholder={field.placeholder}
                  defaultValue={field.default}
                  onChange={e => handleFieldChange(field.name, e.target.value)}
                  aria-describedby={field.help ? `${field.name}-help` : undefined}
                  disabled={isLoading}
                />
              )}
              {field.type === 'number' && (
                <input
                  id={field.name}
                  type="number"
                  className={styles.input}
                  min={field.min}
                  max={field.max}
                  step={field.step}
                  defaultValue={field.default}
                  onChange={e => handleFieldChange(field.name, Number(e.target.value))}
                  disabled={isLoading}
                />
              )}
              {field.type === 'date' && (
                <input
                  id={field.name}
                  type="date"
                  className={styles.input}
                  defaultValue={field.default}
                  onChange={e => handleFieldChange(field.name, e.target.value)}
                  disabled={isLoading}
                />
              )}
              {field.type === 'select' && (
                <select
                  id={field.name}
                  className={styles.select}
                  defaultValue={field.default}
                  onChange={e => handleFieldChange(field.name, e.target.value)}
                  disabled={isLoading}
                >
                  {field.options?.map((opt: any) => (
                    <option key={opt.id} value={opt.value ?? opt.id}>{opt.label}</option>
                  ))}
                </select>
              )}
              {field.type === 'textarea' && (
                <textarea
                  id={field.name}
                  className={clsx(styles.input, 'min-h-[100px] resize-y')}
                  placeholder={field.placeholder}
                  defaultValue={field.default}
                  onChange={e => handleFieldChange(field.name, e.target.value)}
                  disabled={isLoading}
                />
              )}
              {field.type === 'checkbox' && (
                <input
                  id={field.name}
                  type="checkbox"
                  className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  defaultChecked={field.default}
                  onChange={e => handleFieldChange(field.name, e.target.checked)}
                  disabled={isLoading}
                />
              )}
            </div>
          ))}
          
          <div className={styles.actions}>
            {canGoPrevious && (
              <button type="button" className={clsx(styles.cta, styles.secondary)} onClick={previous} disabled={isLoading}>
                Voltar
              </button>
            )}
            {canSkip && (
              <button type="button" className={clsx(styles.cta, styles.ghost)} onClick={skip} disabled={isLoading}>
                Pular
              </button>
            )}
            <button
              type="submit"
              className={clsx(styles.cta, styles.primary, !canGoNext && styles.disabled)}
              disabled={isLoading || !canGoNext}
            >
              {step.cta?.label || 'Continuar'}
            </button>
          </div>
        </form>
      </div>
    )
  }
)

FormStep.displayName = 'FormStep'
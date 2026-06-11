// packages/tutorial-react/src/components/StepRenderer.tsx
import { useMemo } from 'react'
import { InfoStep } from './steps/InfoStep'
import { SelectStep } from './steps/SelectStep'
import { FormStep } from './steps/FormStep'
import { ConfirmationStep } from './steps/ConfirmationStep'
import { SuccessStep } from './steps/SuccessStep'
import type { Step } from '@bora-estudar/tutorial-engine'

const stepComponents: Record<string, React.ComponentType<any>> = {
  info: InfoStep,
  'single-select': SelectStep,
  'multi-select': SelectStep,
  form: FormStep,
  confirmation: ConfirmationStep,
  success: SuccessStep
}

interface StepRendererProps {
  step: Step | null
  isLoading?: boolean
  customComponents?: Record<string, React.ComponentType<any>>
}

export function StepRenderer({ step, isLoading, customComponents = {} }: StepRendererProps) {
  const components = useMemo(() => ({ ...stepComponents, ...customComponents }), [customComponents])
  
  if (!step) return null
  
  const Component = components[step.type]
  if (!Component) {
    console.warn(`No component for step type: ${step.type}`)
    return (
      <div className="tutorial-unknown-step" style={{ padding: '2rem', textAlign: 'center' }}>
        Unknown step type: {step.type}
      </div>
    )
  }
  
  return <Component step={step} isLoading={isLoading} />
}
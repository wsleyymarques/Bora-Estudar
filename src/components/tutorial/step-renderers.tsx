// src/components/tutorial/step-renderers.tsx
import React from 'react'
import { Check, ChevronRight, ExternalLink, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useTutorial } from '@/contexts/TutorialContext'

interface StepRendererProps {
  step: any
  isLoading?: boolean
}

export function StepRenderer({ step, isLoading }: StepRendererProps) {
  if (!step) return null
  
  switch (step.type) {
    case 'info':
      return <InfoStep step={step} isLoading={isLoading} />
    case 'single-select':
    case 'multi-select':
      return <SelectStep step={step} isLoading={isLoading} />
    case 'form':
      return <FormStep step={step} isLoading={isLoading} />
    case 'confirmation':
      return <ConfirmationStep step={step} isLoading={isLoading} />
    case 'success':
      return <SuccessStep step={step} isLoading={isLoading} />
    default:
      return <div className="text-center py-8 text-muted-foreground">Tipo de passo desconhecido: {step.type}</div>
  }
}

function InfoStep({ step, isLoading }: any) {
  const { next, canGoNext } = useTutorial()
  
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-3xl">🎓</span>
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-4">{step.title}</h2>
      <p className="text-lg text-muted-foreground mb-8 whitespace-pre-line">{step.content}</p>
      {/* Removed CTA button here - modal footer handles navigation */}
    </div>
  )
}

function SelectStep({ step, isLoading }: any) {
  const { state, handleMultiSelectChange, updateStepData, next, previous, skip, canGoNext, canGoPrevious, canSkip } = useTutorial()
  const [searchQuery, setSearchQuery] = React.useState('')
  const [showNewForm, setShowNewForm] = React.useState(false)
  const [newSubject, setNewSubject] = React.useState({ name: '', category: '', color: '#5B8C7E' })
  const isMulti = step.type === 'multi-select'
  const mapsTo = step.mapsTo ? (Array.isArray(step.mapsTo) ? step.mapsTo[0] : step.mapsTo) : null
  const value = mapsTo ? state.stepData[mapsTo] : undefined
  const selected = (Array.isArray(value) ? value : (value ? [value] : [])) as string[]
  
  if (!mapsTo) return <div>Erro: mapsTo não configurado</div>

  const handleAddCustom = () => {
    if (!newSubject.name.trim()) return
    const newId = newSubject.name.trim()
    
    const currentCustoms = Array.isArray(state.stepData.customSubjects) ? state.stepData.customSubjects : []
    updateStepData({
      customSubjects: [...currentCustoms, { id: newId, ...newSubject }]
    })
    
    handleMultiSelectChange(mapsTo, newId, true)
    setShowNewForm(false)
    setNewSubject({ name: '', category: '', color: '#5B8C7E' })
    setSearchQuery('')
  }
  
  const defaultOptionIds = new Set(step.options.map((o: any) => o.id))
  const customSubjects = Array.isArray(state.stepData.customSubjects) ? state.stepData.customSubjects : []
  const customSubjectsMap = new Map(customSubjects.map((s: any) => [s.id, s]))

  const customOptions = selected
    .filter(id => !defaultOptionIds.has(id))
    .map(id => {
      const customData = customSubjectsMap.get(id)
      return { 
        id, 
        label: customData?.name || id, 
        icon: '✨', 
        description: customData?.category || 'Matéria Personalizada',
        color: customData?.color 
      }
    })
    
  const allOptions = [...step.options, ...customOptions]
  
  const filteredOptions = allOptions.filter(option => 
    option.label.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (option.description && option.description.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const exactMatchExists = allOptions.some(o => o.label.toLowerCase() === searchQuery.trim().toLowerCase())
  
  return (
    <div className="flex flex-col">
      {/* Sticky Header */}
      <div className="sticky -top-6 bg-background z-20 pt-6 pb-4 -mt-6 -mx-6 px-6 border-b border-border mb-4 shadow-sm">
        <h2 className="text-2xl font-bold text-foreground mb-2">{step.title}</h2>
        <p className="text-muted-foreground mb-4">{step.content}</p>
        
        {/* Search Input or Create Form - Only show if allowCustom is true */}
        {step.allowCustom && (
          !showNewForm ? (
            <div className="flex gap-2 relative">
              <div className="relative flex-1">
                <input
                  id="search-subject-input"
                  type="text"
                  placeholder="Buscar ou criar matéria..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && step.allowCustom && searchQuery.trim() !== '' && !exactMatchExists) {
                      e.preventDefault()
                      setShowNewForm(true)
                      setNewSubject(c => ({ ...c, name: searchQuery.trim() }))
                    }
                  }}
                  className="w-full px-4 py-3 pl-11 rounded-xl border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  disabled={isLoading}
                />
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                </div>
              </div>
              <button 
                type="button" 
                onClick={() => {
                  setShowNewForm(true)
                  setNewSubject(c => ({ ...c, name: searchQuery.trim() }))
                }} 
                disabled={isLoading || exactMatchExists}
                className="px-4 py-3 shrink-0 rounded-xl font-medium bg-secondary text-secondary-foreground hover:bg-secondary/80 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
                title="Criar nova matéria"
              >
                <Plus className="h-5 w-5" />
                <span className="hidden sm:inline">Criar</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3 rounded-2xl border-2 border-primary/20 bg-primary/5 p-4 animate-in fade-in slide-in-from-top-2 w-full shadow-sm mt-2">
              <div className="flex items-center justify-between">
                <label className="font-bold text-sm">Nova matéria personalizada</label>
                <button type="button" onClick={() => setShowNewForm(false)} className="text-xs h-7 text-muted-foreground hover:text-foreground">Cancelar</button>
              </div>
              <input
                type="text"
                value={newSubject.name}
                onChange={(e) => setNewSubject(c => ({ ...c, name: e.target.value }))}
                placeholder="Nome da matéria *"
                className="w-full h-11 px-4 rounded-xl border-2 border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
              />
              <div className="flex gap-3">
                <input
                  type="text"
                  value={newSubject.category}
                  onChange={(e) => setNewSubject(c => ({ ...c, category: e.target.value }))}
                  placeholder="Categoria (ex: Direito)"
                  className="h-11 px-4 rounded-xl border-2 border-border flex-1 bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                />
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newSubject.color}
                    onChange={(e) => setNewSubject(c => ({ ...c, color: e.target.value }))}
                    className="h-11 w-14 rounded-xl border-2 border-border cursor-pointer p-1 bg-background transition-all hover:border-primary"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={handleAddCustom}
                disabled={!newSubject.name.trim()}
                className="w-full h-11 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-colors disabled:opacity-50"
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Matéria
              </button>
            </div>
          )
        )}
      </div>

      <div className="space-y-3 pb-2" role="group" aria-label={step.title}>
        {filteredOptions.length === 0 && (
          <p className="text-center text-muted-foreground py-4">Nenhuma matéria encontrada.</p>
        )}

        {filteredOptions.map((option: any) => {
          const isSelected = selected.includes(option.id)
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => isMulti 
                ? handleMultiSelectChange(mapsTo, option.id, !isSelected)
                : handleMultiSelectChange(mapsTo, option.id, true)
              }
              className={cn(
                "w-full p-4 rounded-xl border-2 transition-all text-left",
                isSelected
                  ? "border-primary bg-primary/10 ring-2 ring-primary/20"
                  : "border-border hover:border-primary/50 hover:bg-accent/50"
              )}
              disabled={isLoading}
            >
              <div className="flex items-start gap-4">
                {option.color ? (
                  <span className="h-6 w-6 rounded-full shrink-0 mt-0.5 shadow-sm" style={{ backgroundColor: option.color }} />
                ) : option.icon ? (
                  <span className="text-2xl shrink-0 mt-0.5" aria-hidden="true">{option.icon}</span>
                ) : null}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-foreground">{option.label}</p>
                  {option.description && <p className="text-sm text-muted-foreground mt-0.5">{option.description}</p>}
                </div>
                {isSelected && <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function FormStep({ step, isLoading }: any) {
  const { state, handleFieldChange, next, canGoNext, canGoPrevious, previous, canSkip, skip } = useTutorial()
  
  // Build fields array outside JSX to avoid map issues
  const fieldComponents = (step.fields || []).map((field: any) => {
    const renderLabel = (
      <label key={`label-${field.name}`} htmlFor={field.name} className="block text-sm font-medium text-foreground">
        {field.label}
        {field.validation?.required && <span className="text-destructive ml-1">*</span>}
      </label>
    )
    
    const renderHelp = field.help ? (
      <p key={`help-${field.name}`} className="text-xs text-muted-foreground" id={`${field.name}-help`}>{field.help}</p>
    ) : null
    
    const renderInput = () => {
      if (field.type === 'text') {
        return (
          <input
            key={`input-${field.name}`}
            id={field.name}
            type="text"
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            placeholder={field.placeholder}
            defaultValue={field.default}
            onChange={e => handleFieldChange(field.name, e.target.value)}
            aria-describedby={field.help ? `${field.name}-help` : undefined}
            disabled={isLoading}
          />
        )
      }
      if (field.type === 'number') {
        return (
          <input
            key={`input-${field.name}`}
            id={field.name}
            type="number"
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            min={field.min}
            max={field.max}
            step={field.step}
            defaultValue={field.default}
            onChange={e => handleFieldChange(field.name, Number(e.target.value))}
            disabled={isLoading}
          />
        )
      }
      if (field.type === 'date') {
        return (
          <input
            key={`input-${field.name}`}
            id={field.name}
            type="date"
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            defaultValue={field.default}
            onChange={e => handleFieldChange(field.name, e.target.value)}
            disabled={isLoading}
          />
        )
      }
      if (field.type === 'select') {
        return (
          <select
            key={`input-${field.name}`}
            id={field.name}
            className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none transition-all"
            defaultValue={field.default}
            onChange={e => handleFieldChange(field.name, e.target.value)}
            disabled={isLoading}
          >
            {field.options?.map((opt: any) => (
              <option key={opt.id} value={opt.value ?? opt.id}>{opt.label}</option>
            ))}
          </select>
        )
      }
      if (field.type === 'multi-select') {
        const currentValue = (state.stepData[field.name] as string[]) || []
        return (
          <div key={`input-${field.name}`} className="grid grid-cols-2 gap-2 mt-2">
            {field.options?.map((opt: any) => {
              const isSelected = currentValue.includes(opt.id)
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    const newValue = isSelected
                      ? currentValue.filter(v => v !== opt.id)
                      : [...currentValue, opt.id]
                    handleFieldChange(field.name, newValue)
                  }}
                  className={cn(
                    "flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-left",
                    isSelected
                      ? "border-primary bg-primary/10 ring-2 ring-primary/20 text-foreground font-medium"
                      : "border-border hover:border-primary/50 hover:bg-accent/50 text-muted-foreground"
                  )}
                  disabled={isLoading}
                >
                  {opt.icon && <span aria-hidden="true">{opt.icon}</span>}
                  <span className="flex-1">{opt.label}</span>
                  {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                </button>
              )
            })}
          </div>
        )
      }
      return null
    }
    
    return (
      <div key={field.name} className="space-y-2">
        {renderLabel}
        {renderHelp}
        {renderInput()}
      </div>
    )
  })
  
  return (
    <form onSubmit={e => { e.preventDefault(); next() }} className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">{step.title}</h2>
      {step.content && <p className="text-muted-foreground">{step.content}</p>}
      
      {fieldComponents}
    </form>
  )
}

function ConfirmationStep({ step, isLoading }: any) {
  const { state, next } = useTutorial()
  
  const content = step.content
    .replace(/\{\{(\w+)\}\}/g, (_, key) => String(state.stepData[key] ?? `{{${key}}}`))
  
  return (
    <div className="text-center">
      { step.icon && <div className="mx-auto mb-6 text-6xl" aria-hidden="true">{step.icon}</div> }
      <h2 className="text-2xl font-bold text-foreground mb-4">{step.title}</h2>
      <div className="prose prose-sm max-w-none text-left mx-auto mb-8 text-muted-foreground whitespace-pre-line">
        {content}
      </div>
    </div>
  )
}

function SuccessStep({ step, isLoading }: any) {
  const { state } = useTutorial()
  
  return (
    <div className="text-center">
      <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-bounce">
        <span className="text-4xl">✨</span>
      </div>
      <h2 className="text-2xl font-bold text-foreground mb-4">{step.title}</h2>
      <p className="text-lg text-muted-foreground mb-8">{step.content}</p>
    </div>
  )
}
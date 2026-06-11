// src/contexts/TutorialContext.tsx
import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, ReactNode } from 'react'
import { useAuth } from './AuthContext'
import { SUBJECT_CATALOG } from '../data/subject-catalog'

// Recipe definitions inline (matching the YAML recipes)
const RECIPES = {
  'criar-plano': {
    id: 'criar-plano',
    title: 'Criar seu Plano de Estudos',
    description: 'Vamos montar seu plano personalizado passo a passo',
    estimatedMinutes: 7,
    metadata: { category: 'onboarding' as const, icon: '📋', color: '#6366f1', requiredForBadge: true },
    settings: { allowSkip: true, allowBack: true, persistProgress: true, autoAdvance: false, showProgressBar: true, showStepNumbers: true },
    initialData: { userName: '', goals: [], subjects: [], weeklyHours: 10, preferredTimes: [], studyMethod: '' },
    steps: [
      { id: 'welcome', type: 'info', title: 'Bem-vindo ao Bora Estudar! 🎓', content: 'Olá, {{userName}}! Vamos criar seu plano de estudos personalizado. São só alguns passos rápidos — uns 7 minutinhos.', cta: { label: 'Vamos lá!', action: 'next' }, optional: false },
      { id: 'goal-selection', type: 'multi-select', title: 'Qual seu objetivo principal?', content: 'Pode escolher mais de um — isso ajuda a gente sugerir as matérias certas.', options: [
        { id: 'concurso', label: 'Concurso Público', icon: '🏛️', description: 'Preparação para editais federais, estaduais, municipais' },
        { id: 'vestibular', label: 'Vestibular / ENEM', icon: '🎓', description: 'Ensino médio, ENEM, vestibulares tradicionais' },
        { id: 'certificacao', label: 'Certificação Profissional', icon: '📜', description: 'AWS, PMP, CFA, CPA, idiomas, etc.' },
        { id: 'rotina', label: 'Criar Rotina de Estudos', icon: '📅', description: 'Organizar horários, revisar conteúdo, manter constância' },
        { id: 'outro', label: 'Outro', icon: '✨', description: 'Objetivo personalizado' }
      ], validation: { minSelections: 1, maxSelections: 3 }, mapsTo: 'goals', optional: false },
      { id: 'subject-selection', type: 'multi-select', title: 'Quais matérias você quer estudar?', content: 'Baseado no seu objetivo ({{goals}}), sugerimos algumas. Adicione ou remova à vontade. Você também pode criar novas matérias.', options: SUBJECT_CATALOG.flatMap(cat => cat.subjects.map(sub => ({
        id: sub.name.toLowerCase().replace(/ /g, '-').normalize("NFD").replace(/[\u0300-\u036f]/g, ""),
        label: sub.name,
        icon: cat.emoji,
        description: cat.name
      }))), validation: { minSelections: 1 }, mapsTo: 'subjects', optional: false, dependsOn: ['goal-selection'], allowCustom: true },
      { id: 'routine-config', type: 'form', title: 'Como é sua rotina semanal?', content: 'Quanto tempo você tem? Quais horários funcionam?', fields: [
        { name: 'weeklyHours', type: 'number', label: 'Horas por semana', min: 1, max: 80, step: 1, default: 10, help: 'Some todos os dias. Ex: 2h/dia × 5 dias = 10h. (Lembrando: você sempre pode estudar além dessa meta!)' },
        { name: 'preferredTimes', type: 'multi-select', label: 'Melhores horários', options: [
          { id: 'manha', label: 'Manhã (6h-12h)' },
          { id: 'tarde', label: 'Tarde (12h-18h)' },
          { id: 'noite', label: 'Noite (18h-23h)' },
          { id: 'madrugada', label: 'Madrugada (23h-6h)' }
        ], validation: { minSelections: 1 } }
      ], validation: { required: ['weeklyHours', 'preferredTimes'] }, mapsTo: ['weeklyHours', 'preferredTimes'], optional: false },
      { id: 'study-method', type: 'single-select', title: 'Como você prefere estudar?', content: 'Isso define como vamos estruturar seus ciclos.', options: [
        { id: 'pomodoro', label: 'Pomodoro (25min foco + 5min pausa)', icon: '🍅' },
        { id: 'deep-work', label: 'Deep Work (90min blocos longos)', icon: '🧠' },
        { id: 'intercalado', label: 'Intercalado (matérias diferentes por dia)', icon: '🔄' },
        { id: 'revisao-ativa', label: 'Revisão Ativa (flashcards, questões)', icon: '🃏' }
      ], mapsTo: 'studyMethod', optional: true },
      { id: 'confirm-summary', type: 'confirmation', title: 'Tudo certo? Bora gerar seu plano! 🚀', content: '**Resumo do seu plano:**\n- Objetivos: {{goals}}\n- Matérias: {{subjects}}\n- Carga semanal: {{weeklyHours}}h\n- Horários: {{preferredTimes}}\n- Método: {{studyMethod || \'Padrão (Pomodoro)\'}}', cta: { label: 'Gerar Plano ✨', action: 'complete', variant: 'primary' }, optional: false },
      { id: 'success', type: 'success', title: 'Plano criado com sucesso! 🎉', content: 'Seu plano está pronto no dashboard. A gente te avisa quando for hora de estudar.', cta: { label: 'Ir para o Dashboard', action: 'complete', variant: 'primary' }, optional: false, onComplete: [{ action: 'emit', event: 'plan:created' }, { action: 'navigate', path: '/dashboard' }] }
    ]
  },
  'cronograma-avulso': {
    id: 'cronograma-avulso',
    title: 'Criar Cronograma Avulso',
    description: 'Agenda rápida para prova, concurso ou evento específico',
    estimatedMinutes: 3,
    metadata: { category: 'quick-action' as const, icon: '📅', color: '#10b981', requiredForBadge: false },
    settings: { allowSkip: true, allowBack: true, persistProgress: true, autoAdvance: false, showProgressBar: true, showStepNumbers: false },
    initialData: { eventDate: null, eventName: '', subjects: [], dailyHours: 2 },
    steps: [
      { id: 'event-info', type: 'form', title: 'Sobre o evento/prova', content: 'Quando é? Como se chama?', fields: [
        { name: 'eventName', type: 'text', label: 'Nome do evento/prova', placeholder: 'Ex: Concurso TRF 2024, Prova OAB, ENEM', validation: { required: true, minLength: 3, maxLength: 100 } },
        { name: 'eventDate', type: 'date', label: 'Data da prova/evento', validation: { required: true } }
      ], mapsTo: ['eventName', 'eventDate'], optional: false },
      { id: 'subject-priority', type: 'multi-select', title: 'Quais matérias caem na prova?', content: 'Ordene por prioridade — a gente foca nas mais importantes.', options: [
        { id: 'portugues', label: 'Português' },
        { id: 'matematica', label: 'Matemática' },
        { id: 'direito-constitucional', label: 'Direito Constitucional' },
        { id: 'direito-administrativo', label: 'Direito Administrativo' },
        { id: 'informatica', label: 'Informática' },
        { id: 'raciocinio-logico', label: 'Raciocínio Lógico' },
        { id: 'ingles', label: 'Inglês' }
      ], validation: { minSelections: 1 }, mapsTo: 'subjects', optional: false, ui: { draggable: true } },
      { id: 'intensity', type: 'single-select', title: 'Quanto tempo você tem por dia?', content: 'Seja realista — consistência > intensidade.', options: [
        { id: 'light', label: 'Leve (1-2h/dia)', value: 1.5 },
        { id: 'moderate', label: 'Moderado (3-4h/dia)', value: 3.5 },
        { id: 'intense', label: 'Intenso (5-6h/dia)', value: 5.5 },
        { id: 'custom', label: 'Personalizado', value: null, showsField: 'dailyHoursCustom' }
      ], mapsTo: 'dailyHours', optional: false },
      { id: 'dailyHoursCustom', type: 'form', title: 'Horas por dia', content: 'Quantas horas reais você consegue?', fields: [
        { name: 'dailyHours', type: 'number', label: 'Horas/dia', min: 0.5, max: 12, step: 0.5 }
      ], dependsOn: [{ step: 'intensity', condition: 'value === \'custom\'' }], mapsTo: 'dailyHours', optional: false },
      { id: 'generate-schedule', type: 'confirmation', title: 'Pronto para gerar! 📋', content: '**Seu cronograma:**\n- Evento: {{eventName}} ({{eventDate}})\n- Matérias: {{subjects.length}} selecionadas\n- Tempo/dia: {{dailyHours}}h', cta: { label: 'Gerar Cronograma 🚀', action: 'complete', variant: 'primary' }, optional: false },
      { id: 'success', type: 'success', title: 'Cronograma pronto! 🎯', content: 'Seu cronograma semanal está no dashboard. Boa sorte na {{eventName}}!', cta: { label: 'Ver Cronograma', action: 'complete', variant: 'primary' }, optional: false, onComplete: [{ action: 'emit', event: 'schedule:created' }, { action: 'navigate', path: '/dashboard?tab=schedule' }] }
    ]
  }
} as const

type RecipeId = keyof typeof RECIPES
type Recipe = typeof RECIPES[RecipeId]

type Step = Recipe['steps'][0]
type TutorialStatus = 'idle' | 'running' | 'completed' | 'aborted'

const STORAGE_PREFIX = 'tutorial:progress:'

interface TutorialState {
  status: TutorialStatus
  recipeId?: RecipeId
  currentStepIndex: number
  stepData: Record<string, unknown>
  completedSteps: string[]
}

interface TutorialContextValue {
  state: TutorialState
  currentStep: Step | null
  start: (recipeId: RecipeId, initialData?: Record<string, unknown>) => Promise<void>
  next: () => Promise<void>
  previous: () => Promise<void>
  skip: () => Promise<void>
  abort: (reason?: string) => Promise<void>
  updateStepData: (data: Record<string, unknown>) => void
  isLoading: boolean
  tutorialProgress: { current: number; total: number; percentage: number }
}

const TutorialContext = createContext<TutorialContextValue | null>(null)

interface TutorialProviderProps {
  children: ReactNode
}

function resolveTemplates(str: string, context: Record<string, unknown>, stepData: Record<string, unknown>): string {
  return str.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    if (key in stepData) return String(stepData[key])
    if (key in context) return String(context[key])
    return `{{${key}}}`
  })
}

function resolveStepContent(step: Step, context: Record<string, unknown>, stepData: Record<string, unknown>): Step {
  const resolved = { ...step }
  if (step.title) resolved.title = resolveTemplates(step.title, context, stepData)
  if (step.content) resolved.content = resolveTemplates(step.content, context, stepData)
  if (step.cta?.label) resolved.cta = { ...step.cta, label: resolveTemplates(step.cta.label, context, stepData) }
  
  if ('options' in step && Array.isArray(step.options)) {
    resolved.options = step.options.map(opt => ({
      ...opt,
      label: resolveTemplates(opt.label, context, stepData),
      description: opt.description ? resolveTemplates(opt.description, context, stepData) : undefined
    }))
  }
  
  if ('fields' in step && Array.isArray(step.fields)) {
    resolved.fields = step.fields.map(field => ({
      ...field,
      label: resolveTemplates(field.label, context, stepData),
      placeholder: field.placeholder ? resolveTemplates(field.placeholder, context, stepData) : undefined,
      help: field.help ? resolveTemplates(field.help, context, stepData) : undefined
    }))
  }
  
  return resolved
}

function getPersistenceKey(recipeId: string) {
  return `${STORAGE_PREFIX}${recipeId}`
}

function loadProgress(recipeId: string): Partial<TutorialState> | null {
  if (typeof window === 'undefined') return null
  try {
    const item = localStorage.getItem(getPersistenceKey(recipeId))
    return item ? JSON.parse(item) : null
  } catch { return null }
}

function saveProgress(recipeId: string, state: TutorialState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(getPersistenceKey(recipeId), JSON.stringify({
      ...state,
      lastActiveAt: new Date().toISOString()
    }))
  } catch (e) {
    console.warn('[Tutorial] Save failed:', e)
  }
}

function clearProgress(recipeId: string) {
  if (typeof window === 'undefined') return
  localStorage.removeItem(getPersistenceKey(recipeId))
}

export function TutorialProvider({ children }: TutorialProviderProps) {
  const { user, profile } = useAuth()
  const [state, setState] = useState<TutorialState>({
    status: 'idle',
    currentStepIndex: 0,
    stepData: {},
    completedSteps: []
  })
  const [isLoading, setIsLoading] = useState(false)
  
  const recipesMap = useMemo(() => new Map(Object.entries(RECIPES)), [])
  
  // Build context for template resolution
  const fullContext = useMemo(() => ({
    userName: profile?.full_name || user?.email?.split('@')[0] || 'Estudante',
    userId: user?.id,
    userEmail: user?.email,
    today: new Date().toISOString().split('T')[0],
    now: new Date().toISOString()
  }), [user, profile])
  
  // Get current recipe
  const currentRecipe = state.recipeId ? RECIPES[state.recipeId] : null
  
  // Get resolved current step
  const currentStep = useMemo(() => {
    if (!currentRecipe || state.status !== 'running' && state.status !== 'paused') return null
    const step = currentRecipe.steps[state.currentStepIndex]
    if (!step) return null
    return resolveStepContent(step, fullContext, state.stepData)
  }, [currentRecipe, state.currentStepIndex, state.stepData, fullContext, state.status])
  
  // Persist progress
  useEffect(() => {
    if (state.recipeId && (state.status === 'running' || state.status === 'paused')) {
      saveProgress(state.recipeId, state)
    }
  }, [state])
  
  // Check for existing progress on mount
  const start = useCallback(async (recipeId: RecipeId, initialData: Record<string, unknown> = {}) => {
    setIsLoading(true)
    try {
      const recipe = RECIPES[recipeId]
      if (!recipe) throw new Error(`Recipe ${recipeId} not found`)
      
      let mergedData = { ...recipe.initialData }
      const persisted = loadProgress(recipeId)
      const recipeVersion = recipe.initialData // rough version check
      
      if (persisted && persisted.version === recipeVersion) {
        mergedData = { ...mergedData, ...persisted.stepData }
        setState({
          status: 'running',
          recipeId,
          currentStepIndex: persisted.currentStepIndex ?? 0,
          stepData: mergedData,
          completedSteps: persisted.completedSteps ?? []
        })
      } else {
        setState({
          status: 'running',
          recipeId,
          currentStepIndex: 0,
          stepData: { ...mergedData, ...initialData },
          completedSteps: []
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [])
  
  const next = useCallback(async () => {
    setState(prev => {
      if (prev.status !== 'running' || !prev.recipeId) return prev
      const recipe = RECIPES[prev.recipeId]
      if (!recipe) return prev
      
      const currentStep = recipe.steps[prev.currentStepIndex]
      if (!currentStep) return prev
      
      // Validate current step
      const validationError = validateStep(currentStep, prev.stepData)
      if (validationError) {
        // Would emit error event in full engine
        return prev
      }
      
      const nextIndex = prev.currentStepIndex + 1
      const completedSteps = [...prev.completedSteps, currentStep.id]
      
      if (nextIndex >= recipe.steps.length) {
        // Complete!
        const finalState = {
          status: 'completed' as const,
          recipeId: prev.recipeId,
          currentStepIndex: nextIndex,
          stepData: prev.stepData,
          completedSteps
        }
        if (prev.recipeId) clearProgress(prev.recipeId)
        return finalState
      }
      
      return {
        ...prev,
        currentStepIndex: nextIndex,
        completedSteps
      }
    })
  }, [])
  
  const previous = useCallback(async () => {
    setState(prev => {
      if ((prev.status !== 'running' && prev.status !== 'paused') || prev.currentStepIndex <= 0) return prev
      const recipe = prev.recipeId ? RECIPES[prev.recipeId] : null
      if (!recipe) return prev
      
      const newIndex = prev.currentStepIndex - 1
      return {
        ...prev,
        currentStepIndex: newIndex,
        completedSteps: prev.completedSteps.slice(0, newIndex)
      }
    })
  }, [])
  
  const skip = useCallback(async () => {
    setState(prev => {
      if (prev.status !== 'running' || !prev.recipeId) return prev
      const recipe = RECIPES[prev.recipeId]
      if (!recipe) return prev
      
      const currentStep = recipe.steps[prev.currentStepIndex]
      if (!currentStep.optional) return prev
      
      return next()
    })
  }, [])
  
  const abort = useCallback(async (reason: 'user' | 'error' = 'user') => {
    setState(prev => {
      if (prev.status !== 'running' && prev.status !== 'paused') return prev
      if (prev.recipeId) clearProgress(prev.recipeId)
      return {
        status: 'aborted' as const,
        recipeId: prev.recipeId,
        reason,
        atStep: prev.currentStepIndex
      }
    })
  }, [])
  
  const updateStepData = useCallback((data: Record<string, unknown>) => {
    setState(prev => ({ ...prev, stepData: { ...prev.stepData, ...data } }))
  }, [])
  
  // Progress calculation
  const tutorialProgress = useMemo(() => {
    if (!currentRecipe || state.status === 'idle') {
      return { current: 0, total: 0, percentage: 0 }
    }
    const total = currentRecipe.steps.filter(s => s.type !== 'success').length
    const current = state.status === 'completed' ? total : Math.min(state.currentStepIndex + 1, total)
    return {
      current,
      total,
      percentage: total > 0 ? Math.round((current / total) * 100) : 0
    }
  }, [currentRecipe, state.status, state.currentStepIndex])
  
  function validateStep(step: Step, stepData: Record<string, unknown>): string | null {
    if (!step.validation) return null
    
    if (step.type === 'single-select' || step.type === 'multi-select') {
      const { minSelections = 1, maxSelections, required = true } = step.validation as any || {}
      const mapsTo = step.mapsTo ? (Array.isArray(step.mapsTo) ? step.mapsTo[0] : step.mapsTo) : null
      const value = mapsTo ? stepData[mapsTo] : undefined
      
      if (step.type === 'multi-select') {
        const selections = Array.isArray(value) ? value.length : 0
        if (required && selections === 0) return 'Seleção obrigatória'
        if (minSelections && selections < minSelections) return `Mínimo ${minSelections} seleções`
        if (maxSelections && selections > maxSelections) return `Máximo ${maxSelections} seleções`
      } else {
        if (required && !value) return 'Seleção obrigatória'
      }
    }
    
    if (step.type === 'form') {
      const { required = [] } = step.validation as any || {}
      for (const fieldName of required) {
        const field = step.fields?.find((f: any) => f.name === fieldName)
        const value = stepData[fieldName]
        if (!value && value !== 0 && value !== false) {
          return `Campo "${field?.label || fieldName}" é obrigatório`
        }
        if (field?.validation) {
          const val = field.validation as any
          if (val.minLength && String(value).length < val.minLength) {
            return `Mínimo ${val.minLength} caracteres`
          }
          if (val.maxLength && String(value).length > val.maxLength) {
            return `Máximo ${val.maxLength} caracteres`
          }
        }
      }
    }
    
    return null
  }

  const canGoNext = useMemo(() => {
    if (!currentStep) return false
    return validateStep(currentStep, state.stepData) === null
  }, [currentStep, state.stepData])

  const canGoPrevious = state.currentStepIndex > 0
  const canSkip = currentStep?.optional === true

  const handleFieldChange = useCallback((name: string, value: any) => {
    updateStepData({ [name]: value })
  }, [updateStepData])

  const handleMultiSelectChange = useCallback((mapsTo: string, optionId: string, isSelected: boolean) => {
    setState(prev => {
      const step = prev.recipeId ? RECIPES[prev.recipeId]?.steps[prev.currentStepIndex] : null
      const isMulti = step?.type === 'multi-select'
      const currentVal = prev.stepData[mapsTo]

      if (isMulti) {
        const arr = Array.isArray(currentVal) ? currentVal : []
        if (isSelected) {
          return { ...prev, stepData: { ...prev.stepData, [mapsTo]: Array.from(new Set([...arr, optionId])) } }
        } else {
          return { ...prev, stepData: { ...prev.stepData, [mapsTo]: arr.filter(id => id !== optionId) } }
        }
      } else {
        return { ...prev, stepData: { ...prev.stepData, [mapsTo]: isSelected ? optionId : null } }
      }
    })
  }, [])
  
  return (
    <TutorialContext.Provider value={{
      state,
      currentStep,
      start,
      next,
      previous,
      skip,
      abort,
      updateStepData,
      isLoading,
      tutorialProgress,
      canGoNext,
      canGoPrevious,
      canSkip,
      handleFieldChange,
      handleMultiSelectChange
    } as any}>
      {children}
    </TutorialContext.Provider>
  )
}

export function useTutorial() {
  const ctx = useContext(TutorialContext)
  if (!ctx) throw new Error('useTutorial must be used within TutorialProvider')
  return ctx
}
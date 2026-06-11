// src/components/tutorial/TutorialTriggers.tsx
import { useState, useEffect } from 'react'
import { BookOpen, Calendar, Plus, Sparkles, Clock, Target, CheckCircle } from 'lucide-react'
import { useTutorial } from '@/contexts/TutorialContext'
import { cn } from '@/lib/utils'

function getCompletedTutorials() {
  if (typeof window === 'undefined') return { plano: false, cronograma: false }
  try {
    const stored = localStorage.getItem('tutorial:completed')
    return stored ? JSON.parse(stored) : { plano: false, cronograma: false }
  } catch { return { plano: false, cronograma: false } }
}

export function TutorialTriggers() {
  const { state, start } = useTutorial()
  const [completedTutorials, setCompletedTutorials] = useState(() => getCompletedTutorials())
  
  // Listen for completion events
  useEffect(() => {
    const handleComplete = (e: CustomEvent) => {
      const recipeId = e.detail?.recipeId
      if (!recipeId) return
      
      const current = getCompletedTutorials()
      const updated = { 
        ...current, 
        [recipeId === 'criar-plano' ? 'plano' : 'cronograma']: true 
      }
      localStorage.setItem('tutorial:completed', JSON.stringify(updated))
      setCompletedTutorials(updated)
    }
    
    window.addEventListener('tutorial:completed', handleComplete as EventListener)
    return () => window.removeEventListener('tutorial:completed', handleComplete as EventListener)
  }, [])
  
  const { plano, cronograma } = completedTutorials
  
  const handleStartPlano = async () => {
    await start('criar-plano')
  }
  
  const handleStartCronograma = async () => {
    await start('cronograma-avulso')
  }
  
  // Both completed - show success state
  if (plano && cronograma) {
    return (
      <div className="text-center py-12">
        <div className="mx-auto mb-6 w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center animate-bounce">
          <CheckCircle className="text-4xl text-primary" />
        </div>
        <h3 className="text-2xl font-bold text-foreground mb-2">Tudo pronto! 🎉</h3>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Você completou os tutoriais iniciais. Agora é só focar nos estudos!
        </p>
      </div>
    )
  }
  
  // Main welcome screen with two large centered cards
  return (
    <div className="w-full">
      {/* Header */}
      <div className="text-center mb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium mb-3">
          <Sparkles className="h-3 w-3" />
          Novo por aqui?
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1">
          Vamos organizar seus estudos?
        </h2>
        <p className="text-muted-foreground text-sm md:text-base max-w-2xl mx-auto mb-4">
          Escolha como quer começar: criar um plano completo de estudos ou um cronograma rápido para uma prova específica.
        </p>
      </div>
      
      {/* Two large centered cards - stacked on mobile, side by side on desktop */}
      <div className="grid gap-3 sm:grid-cols-2 max-w-5xl mx-auto px-2">
        {!plano && (
          <button
            onClick={handleStartPlano}
            className={cn(
              "relative overflow-hidden rounded-2xl border-2 p-4 text-center flex flex-col items-center transition-all hover:shadow-xl hover:-translate-y-1",
              "bg-card border-border hover:border-primary/40 focus:ring-2 focus:ring-primary/50"
            )}
          >
            {/* Decorative icon */}
            <div className="absolute top-2 right-2 opacity-15">
              <Target className="h-10 w-10 text-primary" />
            </div>
            
            <div className="relative z-10 w-full flex flex-col items-center">
              {/* Header com ícone e títulos */}
              <div className="flex flex-col items-center gap-2 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Plano completo</p>
                  <h3 className="text-lg font-bold text-foreground">Criar Plano</h3>
                </div>
              </div>
              
              {/* Features list */}
              <ul className="space-y-1.5 mb-3 w-full max-w-[320px]">
                <li className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
                    <BookOpen className="h-3 w-3" />
                  </div>
                  <span>Defina metas, matérias e rotina semanal</span>
                </li>
                <li className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
                    <Clock className="h-3 w-3" />
                  </div>
                  <span>Configure horários e método de estudo</span>
                </li>
                <li className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-primary/10 text-primary">
                    <Target className="h-3 w-3" />
                  </div>
                  <span>Escolha seu método preferido</span>
                </li>
              </ul>
              
              {/* CTA */}
              <div className="flex items-center justify-center gap-1 text-primary font-semibold text-sm mt-auto pt-2">
                <span>Vamos começar</span>
                <Plus className="h-4 w-4" />
              </div>
            </div>
          </button>
        )}
        
        {!cronograma && (
          <button
            onClick={handleStartCronograma}
            className={cn(
              "relative overflow-hidden rounded-2xl border-2 p-4 text-center flex flex-col items-center transition-all hover:shadow-xl hover:-translate-y-1",
              "bg-card border-border hover:border-emerald-500/40 focus:ring-2 focus:ring-emerald-500/50"
            )}
          >
            {/* Decorative icon */}
            <div className="absolute top-2 right-2 opacity-15">
              <Calendar className="h-10 w-10 text-success" />
            </div>
            
            <div className="relative z-10 w-full flex flex-col items-center">
              {/* Header com ícone e títulos */}
              <div className="flex flex-col items-center gap-2 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-success/10 text-success">
                  <Calendar className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">Rápido e direto</p>
                  <h3 className="text-lg font-bold text-foreground">Cronograma Avulso</h3>
                </div>
              </div>
              
              {/* Features list */}
              <ul className="space-y-1.5 mb-3 w-full max-w-[320px]">
                <li className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-success/10 text-success">
                    <Calendar className="h-3 w-3" />
                  </div>
                  <span>Defina a data da prova ou evento</span>
                </li>
                <li className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-success/10 text-success">
                    <Target className="h-3 w-3" />
                  </div>
                  <span>Selecione matérias por prioridade</span>
                </li>
                <li className="flex flex-col items-center gap-0.5 text-xs text-muted-foreground">
                  <div className="flex h-6 w-6 items-center justify-center rounded bg-success/10 text-success">
                    <Clock className="h-3 w-3" />
                  </div>
                  <span>Configure horas de estudo por dia</span>
                </li>
              </ul>
              
              {/* CTA */}
              <div className="flex items-center justify-center gap-1 text-success font-semibold text-sm mt-auto pt-2">
                <span>Criar agora</span>
                <Plus className="h-4 w-4" />
              </div>
            </div>
          </button>
        )}
        
        {/* Show completed state for individual cards */}
        {plano && !cronograma && (
          <div className="sm:col-span-2 rounded-2xl bg-primary/5 border border-primary/20 p-8 text-center">
            <CheckCircle className="mx-auto mb-4 w-12 h-12 text-primary" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Plano completo criado! ✓</h3>
            <p className="text-muted-foreground mb-6">Seu plano de estudos está pronto no dashboard.</p>
          </div>
        )}
        
        {cronograma && !plano && (
          <div className="sm:col-span-2 rounded-2xl bg-success/5 border border-success/20 p-8 text-center">
            <CheckCircle className="mx-auto mb-4 w-12 h-12 text-success" />
            <h3 className="text-xl font-semibold text-foreground mb-2">Cronograma avulso criado! ✓</h3>
            <p className="text-muted-foreground mb-6">Seu cronograma está pronto no dashboard.</p>
          </div>
        )}
      </div>
    
      {/* Footer note */}
      {!plano && !cronograma && (
        <p className="mt-8 text-center text-sm text-muted-foreground">
          Pode mudar de ideia depois — ambos ficam disponíveis no dashboard.
        </p>
      )}
    </div>
  )
}
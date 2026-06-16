import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { useStudy } from '@/contexts/StudyContext'
import { useTracker } from '@/contexts/TrackerContext'
import { usePlanSubjects } from '@/hooks/usePlanSubjects'
import { Clock, BookOpen, Calendar, Target, Flame, Play, ChevronRight, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { formatMinutesCompact } from '@/lib/duration-utils'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Drawer, DrawerContent } from '@/components/ui/drawer'
import { QuickPlanTimerCard } from '@/components/dashboard/QuickPlanTimerCard'

export default function DashboardPage() {
  const { user, profile } = useAuth()
  const { data, loading, getSubject } = useStudy()
  const { runtime, displayTimeLabel, phaseStateLabel, startWithBinding, setIsMaximized } = useTracker()
  const navigate = useNavigate()

  // --- MOCK/STATE FOR TIMER CARD ---
  const [activeTab, setActiveTab] = useState<string>('')
  const [isMobileTimerOpen, setIsMobileTimerOpen] = useState(false)
  const [isMobileScheduleOpen, setIsMobileScheduleOpen] = useState(false)

  const activePlans = data?.studyPlans || []
  const { planSubjects: activeTabSubjects } = usePlanSubjects(activeTab || undefined)
  
  React.useEffect(() => {
    if (activePlans.length > 0) {
      if (!activeTab) setActiveTab(activePlans[0].id)
    }
  }, [activePlans, activeTab])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const plans = data?.studyPlans || []
  const schedules = data?.schedule || []
  const subjects = data?.subjects || []
  const sessions = data?.sessions || []

  // Helper para pegar a data local em YYYY-MM-DD evitando bug de fuso horário
  const getLocalDateStr = (d: Date) => {
    return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().split('T')[0]
  }

  // Calculate Streak (Constância)
  const now = new Date()
  let currentStreak = 0
  const todayStr = getLocalDateStr(now)
  const yesterdayStr = getLocalDateStr(new Date(now.getTime() - 86400000))
  
  // Get today's scheduled entries
  const todayScheduleEntries = schedules.filter(entry => entry.date === todayStr)
  
  // Group today's entries by plan
  const entriesByPlan = todayScheduleEntries.reduce((acc, entry) => {
    const planId = entry.planId || 'sem-plano'
    if (!acc[planId]) acc[planId] = []
    acc[planId].push(entry)
    return acc
  }, {} as Record<string, typeof todayScheduleEntries>)
  
  const sessionDates = new Set(
    sessions?.map(s => {
      // Se já vier YYYY-MM-DD em date, usamos ele. Senão pegamos das timestamps.
      if (s.date && !s.date.includes('T')) return s.date;
      const d = s.completed_at || s.created_at || s.endedAt || s.startedAt
      if (!d) return null
      const dateObj = new Date(d)
      return isNaN(dateObj.getTime()) ? null : getLocalDateStr(dateObj)
    }).filter(Boolean) || []
  )
  
  let checkDate = new Date(now)
  while (true) {
    const dateStr = getLocalDateStr(checkDate)
    if (sessionDates.has(dateStr)) {
      currentStreak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else if (dateStr === todayStr || dateStr === yesterdayStr) {
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }

  // Calculate Daily Meta (Hardcoded 60 min for now)
  const dailyGoalMinutes = profile?.daily_goal_minutes || 120
  const weeklyGoalMinutes = profile?.weekly_goal_minutes || 1200
  
  const todaySessions = sessions?.filter(s => {
    if (s.date && !s.date.includes('T')) return s.date === todayStr;
    const d = s.completed_at || s.created_at || s.endedAt || s.startedAt
    if (!d) return false
    return getLocalDateStr(new Date(d)) === todayStr
  }) || []
  
  const studiedTodayMinutes = todaySessions.reduce((sum, s) => sum + (s.durationMinutes || Math.round((s.actualDurationSeconds || 0) / 60) || 0), 0)
  const dailyGoalPercentage = Math.min(Math.round((studiedTodayMinutes / dailyGoalMinutes) * 100), 100)

  // Weekdays for dots
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
  const currentDayOfWeek = now.getDay() === 0 ? 7 : now.getDay()
  const monday = new Date(now)
  monday.setDate(now.getDate() - (currentDayOfWeek - 1))

  const displayWeek = [1, 2, 3, 4, 5, 6, 7].map((d, index) => {
    const dayDate = new Date(monday)
    dayDate.setDate(monday.getDate() + index)
    return {
      label: weekDays[d === 7 ? 0 : d],
      isActive: sessionDates.has(getLocalDateStr(dayDate))
    }
  })


  return (
    <div className="flex h-full w-full flex-col overflow-hidden animate-in fade-in duration-500 bg-transparent md:bg-transparent">
      {/* Removemos o overflow do main no desktop, forçando a ser uma flex column */}
      <main className="flex-1 overflow-y-auto md:overflow-hidden p-4 md:p-6 pb-24 md:pb-6 flex flex-col min-h-0">
        <div className="mx-auto w-full max-w-[1600px] flex-1 flex flex-col min-h-0">
          
          {/* ================= MOBILE LAYOUT (< md) ================= */}
          <div className="md:hidden space-y-4">
            
            {/* 1 Col Cards */}
            <div className="grid grid-cols-1 gap-4">
              {/* Meta Diária Mobile */}
              <Card className="bg-white dark:bg-[#0f1b14] border-gray-200 dark:border-[#1e2e24] shadow-sm dark:shadow-none overflow-hidden relative transition-colors">
                <CardContent className="p-4 relative z-10">
                  <div className="flex justify-between items-start mb-1">
                    <p className="text-[10px] font-bold tracking-wider text-gray-500 dark:text-muted-foreground uppercase">Meta Diária</p>
                    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-500 text-[10px] font-bold border border-amber-500/20">
                      <Flame className="w-3 h-3" />
                      Constância: {currentStreak > 0 ? `${currentStreak} dias` : '0 dias'}
                    </div>
                  </div>
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className="text-3xl font-black text-gray-900 dark:text-white">{dailyGoalMinutes}</span>
                    <span className="text-sm font-medium text-gray-500 dark:text-white/50">min</span>
                  </div>
                  <p className="text-[10px] text-gray-500 dark:text-white/50 mb-3">{studiedTodayMinutes} estudados hoje</p>
                  
                  <div className="flex justify-between items-center text-[10px] text-gray-500 dark:text-white/50 mb-1.5">
                    <span>{studiedTodayMinutes} / {dailyGoalMinutes} min</span>
                    <span>{dailyGoalPercentage}%</span>
                  </div>
                  
                  {/* Custom Progress Bar */}
                  <div className="h-1.5 w-full bg-gray-200 dark:bg-[#1e2e24] rounded-full overflow-hidden transition-colors">
                    <div 
                      className="h-full bg-emerald-500 rounded-full" 
                      style={{ width: `${dailyGoalPercentage}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stacked Links Mobile */}
            <div className="space-y-3 mt-6">
              <button onClick={() => setIsMobileScheduleOpen(true)} className="w-full flex items-center p-4 rounded-2xl bg-white dark:bg-[#0f1b14] border border-gray-200 dark:border-[#1e2e24] shadow-sm dark:shadow-none active:scale-[0.98] transition-all text-left">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mr-4 shrink-0">
                  <BookOpen className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold tracking-wider text-[#10b981] uppercase mb-0.5 truncate">Cronograma</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">Ver matérias do dia</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-white/30 shrink-0" />
              </button>

              <button onClick={() => setIsMobileTimerOpen(true)} className="w-full flex items-center p-4 rounded-2xl bg-white dark:bg-[#0f1b14] border border-gray-200 dark:border-[#1e2e24] shadow-sm dark:shadow-none active:scale-[0.98] transition-all text-left">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center mr-4 shrink-0">
                  <Clock className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold tracking-wider text-[#10b981] uppercase mb-0.5 truncate">Timer Rápido</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">Iniciar matéria do plano</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-white/30 shrink-0" />
              </button>

              <button onClick={() => navigate('/plans')} className="w-full flex items-center p-4 rounded-2xl bg-white dark:bg-[#0f1b14] border border-gray-200 dark:border-[#1e2e24] shadow-sm dark:shadow-none active:scale-[0.98] transition-all text-left">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center mr-4 shrink-0">
                  <Target className="w-5 h-5 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold tracking-wider text-amber-500 uppercase mb-0.5 truncate">Planos Ativos</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white truncate">Seus planos de estudos</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400 dark:text-white/30 shrink-0" />
              </button>
            </div>
          </div>


          {/* ================= DESKTOP LAYOUT (>= md) ================= */}
          <div className="hidden md:flex flex-col flex-1 min-h-0 pt-4">

            <div className="grid grid-cols-12 gap-6 flex-1 min-h-0">
              
              {/* --- LEFT COLUMN (Span 7) --- */}
              <div className="col-span-7 flex flex-col gap-6 min-h-0">
                
                {/* Meta Diária Card */}
                <Card className="bg-white dark:bg-[#0f1b14] border-gray-200 dark:border-[#1e2e24] shadow-sm dark:shadow-none overflow-hidden relative min-h-[220px] transition-colors shrink-0">
                  <CardContent className="p-6 relative z-10">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <p className="text-[10px] font-bold tracking-wider text-gray-500 dark:text-muted-foreground uppercase mb-1">Meta Diária</p>
                        <div className="flex items-baseline gap-1">
                          <span className="text-5xl font-black text-gray-900 dark:text-white">{dailyGoalMinutes}</span>
                          <span className="text-lg font-medium text-gray-500 dark:text-white/50">min</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-white/50 mt-1">{studiedTodayMinutes} estudados hoje</p>
                      </div>
                      <div className="text-right flex flex-col items-end">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-500 text-xs font-bold border border-amber-500/20">
                          <Flame className="w-3.5 h-3.5" />
                          Constância: {currentStreak > 0 ? `${currentStreak} dias` : '0 dias'}
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-white/30 mt-2">meta semanal: {formatMinutesCompact(weeklyGoalMinutes)}</p>
                      </div>
                    </div>

                    {/* Progress Track */}
                    <div className="mt-8">
                      <div className="flex justify-between text-xs text-gray-500 dark:text-white/50 mb-2 font-medium">
                        <span>{studiedTodayMinutes} / {dailyGoalMinutes} min</span>
                        <span>{dailyGoalPercentage}%</span>
                      </div>
                      <div className="h-1 bg-gray-200 dark:bg-[#1e2e24] rounded-full relative mb-8 transition-colors">
                        <div 
                          className="absolute left-0 top-0 h-full bg-emerald-500 rounded-full" 
                          style={{ width: `${dailyGoalPercentage}%` }}
                        />
                      </div>

                      {/* Weekdays Dots */}
                      <div className="flex justify-between items-center px-4">
                        {displayWeek.map((day, i) => (
                          <div key={i} className="flex flex-col items-center gap-2">
                            <span className="text-[10px] font-bold text-gray-400 dark:text-white/30">{day.label}</span>
                            <div className={cn(
                              "w-3 h-3 rounded-full transition-colors",
                              day.isActive ? "bg-emerald-500" : "bg-gray-200 dark:bg-[#1e2e24]"
                            )} />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Cronograma do Dia (Matérias de Hoje) */}
                <Card className="bg-white dark:bg-[#0f1b14] border-gray-200 dark:border-[#1e2e24] shadow-sm dark:shadow-none flex-1 flex flex-col min-h-0 transition-colors">
                  <CardHeader className="p-6 pb-0 flex flex-row items-center justify-between shrink-0">
                    <div className="flex items-center gap-2">
                      <BookOpen className="w-5 h-5 text-emerald-600 dark:text-[#10b981]" />
                      <p className="text-[10px] font-bold tracking-wider text-emerald-600 dark:text-[#10b981] uppercase">Matérias de hoje</p>
                    </div>
                    <div className="flex items-center gap-2 text-gray-500 dark:text-white/50 text-xs font-medium">
                      <Calendar className="w-4 h-4" />
                      {now.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' }).replace('.', '')}
                    </div>
                  </CardHeader>
                  <CardContent className="p-6 pt-4 flex-1 flex flex-col min-h-0">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6 shrink-0">Cronograma do Dia</h3>

                    {/* Tabs Planos que têm aulas hoje */}
                    <div className="flex gap-4 border-b border-gray-200 dark:border-[#1e2e24] mb-6 pb-2 overflow-x-auto no-scrollbar shrink-0">
                      {Object.keys(entriesByPlan).length > 0 ? Object.keys(entriesByPlan).map(planId => {
                        const plan = activePlans.find(p => p.id === planId) || { id: planId, name: 'Sem Plano' }
                        return (
                          <button 
                            key={planId}
                            onClick={() => setActiveTab(planId)}
                            className={cn(
                              "text-[10px] font-bold tracking-wider uppercase pb-2 px-1 relative transition-colors whitespace-nowrap",
                              activeTab === planId ? "text-emerald-600 dark:text-emerald-500" : "text-gray-400 hover:text-gray-600 dark:text-white/30 dark:hover:text-white/50"
                            )}
                          >
                            {plan.name || plan.title}
                            {activeTab === planId && (
                              <div className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                            )}
                          </button>
                        )
                      }) : (
                        <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400 dark:text-white/30">Nenhuma aula agendada para hoje</span>
                      )}
                    </div>

                    {/* List Scheduled Entries */}
                    <div className="space-y-3 flex-1 overflow-y-auto no-scrollbar">
                      {Object.keys(entriesByPlan).length > 0 ? (
                        (() => {
                          const entriesToShow = activeTab && entriesByPlan[activeTab] 
                            ? entriesByPlan[activeTab] 
                            : Object.values(entriesByPlan).flat()
                          
                          return entriesToShow.length > 0 ? entriesToShow.map((entry, i) => {
                            const subject = getSubject(entry.subjectId)
                            const studiedMins = todaySessions
                              .filter(s => s.subjectId === entry.subjectId || s.subject_id === entry.subjectId)
                              .reduce((sum, s) => sum + (s.durationMinutes || Math.round((s.actualDurationSeconds || 0) / 60) || 0), 0)
                            const plannedMins = entry.plannedMinutes || 60
                            const isDone = entry.completed || studiedMins >= plannedMins
                            
                            return (
                              <div key={entry.id || i} className={cn(
                                "flex items-center justify-between p-3 rounded-xl transition-colors",
                                isDone 
                                  ? "bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20"
                                  : "bg-gray-50 dark:bg-[#0a120d] border border-gray-200 dark:border-[#1e2e24] hover:border-emerald-500/30"
                              )}>
                                <div className="flex items-center gap-3 min-w-0 flex-1">
                                  <div className={cn("w-3 h-3 rounded-full shrink-0")} style={{ backgroundColor: subject?.color || '#10b981' }} />
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className={cn('truncate text-sm font-bold', isDone ? 'text-gray-400 dark:text-white/40 line-through' : 'text-gray-900 dark:text-white')}>
                                        {subject?.name || 'Matéria'}
                                      </p>
                                      {entry.startTime ? (
                                        <span className="rounded-full bg-gray-200 dark:bg-[#1e2e24] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-gray-500 dark:text-white/40 shrink-0">
                                          {entry.startTime}
                                        </span>
                                      ) : null}
                                    </div>
                                    <p className="mt-0.5 text-[10px] text-gray-500 dark:text-white/40">
                                      Meta: {plannedMins}m • Estudado: {studiedMins}m
                                    </p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => navigate(`/timer?planId=${entry.planId || activeTab}&subjectId=${entry.subjectId}`)}
                                  className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#1e2e24] flex items-center justify-center text-gray-500 dark:text-white/50 group-hover:bg-emerald-500 group-hover:text-white dark:group-hover:text-[#0f1b14] transition-colors shrink-0"
                                >
                                  <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                                </button>
                              </div>
                            )
                          }) : (
                            <div className="text-center py-6 text-gray-400 dark:text-white/30 text-sm">
                              {activeTab ? 'Nenhuma aula agendada para hoje neste plano.' : 'Nenhuma aula agendada para hoje.'}
                            </div>
                          )
                        })()
                      ) : (
                        <div className="text-center py-6 text-gray-400 dark:text-white/30 text-sm">
                          Nenhuma aula agendada para hoje. Acesse o Cronograma para planejar.
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-2 border-t border-transparent shrink-0 text-right">
                      <button onClick={() => navigate('/schedules')} className="text-xs font-bold text-emerald-600 dark:text-emerald-500 hover:text-emerald-500 dark:hover:text-emerald-400 transition-colors">
                        Gerenciar Cronograma
                      </button>
                    </div>
                  </CardContent>
                </Card>

              </div>

              {/* --- RIGHT COLUMN (Span 5) --- */}
              <div className="col-span-5 flex flex-col gap-6 min-h-0">
                
                {/* Timer Rápido Card */}
                <QuickPlanTimerCard plans={activePlans} className="flex-1 hidden lg:flex shrink-0 border-gray-200 dark:border-[#1e2e24] bg-white dark:bg-[#0f1b14]" />

                {/* Planos Ativos Card */}
                <Card className="bg-white dark:bg-[#0f1b14] border-gray-200 dark:border-[#1e2e24] shadow-sm dark:shadow-none flex-1 flex flex-col min-h-0 transition-colors">
                  <CardHeader className="p-5 pb-3 shrink-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-5 h-5 text-emerald-600 dark:text-[#10b981]" />
                      <p className="text-[10px] font-bold tracking-wider text-emerald-600 dark:text-[#10b981] uppercase">Planos Ativos</p>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Seus Planos de Estudos</h3>
                  </CardHeader>
                  <CardContent className="p-5 pt-0 flex-1 flex flex-col min-h-0">
                    <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                      {activePlans.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 dark:text-white/30 text-sm">Nenhum plano ativo.</div>
                      ) : (
                        activePlans.map(plan => (
                          <div key={plan.id} className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-[#0a120d] border border-gray-200 dark:border-[#1e2e24] hover:border-emerald-500/30 transition-colors cursor-pointer" onClick={() => navigate(`/plans/${plan.id}`)}>
                            <div className="flex items-center gap-4">
                              {plan.imageUrl ? (
                                <img src={plan.imageUrl} alt={plan.name || plan.title} className="w-10 h-10 rounded-full object-cover shrink-0" />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                                  <Target className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                                </div>
                              )}
                              <div className="min-w-0">
                                <p className="font-bold text-gray-900 dark:text-white text-base truncate">{plan.name || plan.title}</p>
                                <p className="text-xs text-gray-500 dark:text-white/50 font-medium truncate">{plan.examName ? 'Concurso' : 'Plano'} - {plan.name || plan.title}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className="text-[10px] font-bold tracking-wider text-emerald-600 dark:text-emerald-500 uppercase">Ativo</span>
                              <ChevronRight className="w-4 h-4 text-gray-400 dark:text-white/30" />
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    
                    <div className="mt-4 text-right pt-2 border-t border-transparent shrink-0">
                      <button onClick={() => navigate('/plans')} className="text-xs font-bold text-emerald-600 dark:text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors">
                        Ver todos os planos ({plans.length})
                      </button>
                    </div>
                  </CardContent>
                </Card>

              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Mobile Drawer for Quick Timer */}
      <Drawer open={isMobileTimerOpen} onOpenChange={setIsMobileTimerOpen}>
        <DrawerContent className="bg-white dark:bg-[#0f1b14] p-0 border-gray-200 dark:border-[#1e2e24]">
          <QuickPlanTimerCard 
            plans={activePlans} 
            className="border-0 shadow-none bg-transparent dark:bg-transparent rounded-none p-6 pb-12" 
            onStart={() => setIsMobileTimerOpen(false)}
          />
        </DrawerContent>
      </Drawer>

      {/* Mobile Drawer for Day Schedule */}
      <Drawer open={isMobileScheduleOpen} onOpenChange={setIsMobileScheduleOpen}>
        <DrawerContent className="bg-white dark:bg-[#0f1b14] p-0 border-gray-200 dark:border-[#1e2e24]">
          <div className="p-6 pb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cronograma de Hoje</h2>
              <p className="text-sm text-gray-500 dark:text-white/50">
                {now.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            
            {Object.keys(entriesByPlan).length > 0 ? (
              Object.keys(entriesByPlan).map(planId => {
                const plan = activePlans.find(p => p.id === planId) || { id: planId, name: 'Sem Plano' }
                const entries = entriesByPlan[planId]
                return (
                  <div key={planId} className="mb-6">
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500" />
                      {plan.name || plan.title} ({entries.length} aulas)
                    </h3>
                    <div className="space-y-2">
                      {entries.map((entry, i) => {
                        const subject = getSubject(entry.subjectId)
                        const studiedMins = todaySessions
                          .filter(s => s.subjectId === entry.subjectId || s.subject_id === entry.subjectId)
                          .reduce((sum, s) => sum + (s.durationMinutes || Math.round((s.actualDurationSeconds || 0) / 60) || 0), 0)
                        const plannedMins = entry.plannedMinutes || 60
                        const isDone = entry.completed || studiedMins >= plannedMins
                        
                        return (
                          <button
                            key={entry.id || i}
                            onClick={() => {
                              navigate(`/timer?planId=${entry.planId || planId}&subjectId=${entry.subjectId}`)
                              setIsMobileScheduleOpen(false)
                            }}
                            className={cn(
                              "w-full flex items-center justify-between p-3 rounded-xl transition-colors text-left",
                              isDone
                                ? "bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20"
                                : "bg-gray-50 dark:bg-[#0a120d] border border-gray-200 dark:border-[#1e2e24] hover:border-emerald-500/30"
                            )}
                          >
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                              <div className={cn("w-3 h-3 rounded-full shrink-0")} style={{ backgroundColor: subject?.color || '#10b981' }} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className={cn('truncate text-sm font-bold', isDone ? 'text-gray-400 dark:text-white/40 line-through' : 'text-gray-900 dark:text-white')}>
                                    {subject?.name || 'Matéria'}
                                  </p>
                                  {entry.startTime ? (
                                    <span className="rounded-full bg-gray-200 dark:bg-[#1e2e24] px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.14em] text-gray-500 dark:text-white/40 shrink-0">
                                      {entry.startTime}
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-0.5 text-[10px] text-gray-500 dark:text-white/40">
                                  Meta: {plannedMins}m • Estudado: {studiedMins}m
                                </p>
                              </div>
                            </div>
                            <Play className="w-5 h-5 text-emerald-600 dark:text-emerald-500 shrink-0 ml-2" />
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-12 text-gray-400 dark:text-white/30">
                <BookOpen className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-sm">Nenhuma aula agendada para hoje</p>
                <p className="text-xs mt-1">Acesse o Cronograma para planejar seus estudos</p>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
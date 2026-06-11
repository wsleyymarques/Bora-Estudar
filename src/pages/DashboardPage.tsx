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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Drawer, DrawerContent } from '@/components/ui/drawer'

export default function DashboardPage() {
  const { user } = useAuth()
  const { data, loading, getSubject } = useStudy()
  const { runtime, displayTimeLabel, phaseStateLabel, startWithBinding, setIsMaximized } = useTracker()
  const navigate = useNavigate()

  // --- MOCK/STATE FOR TIMER CARD ---
  const [selectedPlanId, setSelectedPlanId] = useState<string>('')
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>('')
  const [timerMode, setTimerMode] = useState<'cronometro' | 'pomodoro'>('cronometro')
  const [activeTab, setActiveTab] = useState<string>('')
  const [isMobileTimerOpen, setIsMobileTimerOpen] = useState(false)

  const activePlans = data?.studyPlans || []
  const { planSubjects: activeTabSubjects } = usePlanSubjects(activeTab || undefined)
  const { planSubjects: selectedPlanSubjects } = usePlanSubjects(selectedPlanId || undefined)
  
  React.useEffect(() => {
    if (activePlans.length > 0) {
      if (!activeTab) setActiveTab(activePlans[0].id)
      if (!selectedPlanId) setSelectedPlanId(activePlans[0].id)
    }
  }, [activePlans, activeTab, selectedPlanId])

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

  // Calculate Streak (Constância)
  const now = new Date()
  let currentStreak = 0
  const todayStr = now.toISOString().split('T')[0]
  const yesterdayStr = new Date(now.getTime() - 86400000).toISOString().split('T')[0]
  
  const sessionDates = new Set(
    sessions?.map(s => {
      const d = s.completed_at || s.created_at || s.endedAt || s.startedAt
      if (!d) return null
      const dateObj = new Date(d)
      return isNaN(dateObj.getTime()) ? null : dateObj.toISOString().split('T')[0]
    }).filter(Boolean) || []
  )
  
  let checkDate = new Date(now)
  while (true) {
    const dateStr = checkDate.toISOString().split('T')[0]
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
  const dailyGoalMinutes = 60
  
  const todaySessions = sessions?.filter(s => {
    const d = s.completed_at || s.created_at || s.endedAt || s.startedAt
    if (!d) return false
    return new Date(d).toISOString().split('T')[0] === todayStr
  }) || []
  
  const studiedTodayMinutes = todaySessions.reduce((sum, s) => sum + (s.durationMinutes || Math.round((s.actualDurationSeconds || 0) / 60) || 0), 0)
  const dailyGoalPercentage = Math.min(Math.round((studiedTodayMinutes / dailyGoalMinutes) * 100), 100)

  // Weekdays for dots
  const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']
  const todayDayIndex = now.getDay()
  const displayWeek = [1, 2, 3, 4, 5, 6, 0].map(dayIndex => ({
    label: weekDays[dayIndex],
    isActive: sessionDates.has(
      new Date(now.getTime() - (todayDayIndex >= dayIndex ? todayDayIndex - dayIndex : 7 - dayIndex + todayDayIndex) * 86400000).toISOString().split('T')[0]
    )
  }))

  const handleStartTimer = async () => {
    if (!selectedPlanId || !selectedSubjectId) return
    const res = await startWithBinding(
      { planId: selectedPlanId, subjectId: selectedSubjectId },
      { mode: timerMode, forceSwitch: true }
    )
    if (res.ok) {
      setIsMaximized(true)
      setIsMobileTimerOpen(false)
    }
  }

  // Runtime info
  const runtimeSubject = runtime ? getSubject(runtime.subjectId) : null

  const quickTimerContent = (
    <div className="space-y-5">
      {/* Toggle Cronometro / Pomodoro */}
      <div className="flex bg-gray-50 dark:bg-[#0a120d] border border-gray-200 dark:border-[#1e2e24] p-1 rounded-full text-xs font-bold transition-colors w-fit">
        <button 
          onClick={() => setTimerMode('cronometro')}
          className={cn("px-4 py-2 rounded-full transition-colors", timerMode === 'cronometro' ? "bg-white dark:bg-[#1e2e24] text-gray-900 dark:text-white shadow-sm dark:shadow-none" : "text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70")}
        >
          Cronômetro
        </button>
        <button 
          onClick={() => setTimerMode('pomodoro')}
          className={cn("px-4 py-2 rounded-full transition-colors", timerMode === 'pomodoro' ? "bg-white dark:bg-[#1e2e24] text-gray-900 dark:text-white shadow-sm dark:shadow-none" : "text-gray-500 dark:text-white/40 hover:text-gray-700 dark:hover:text-white/70")}
        >
          Pomodoro
        </button>
      </div>

      <div>
        <p className="text-[10px] font-bold tracking-wider text-gray-500 dark:text-white/50 uppercase mb-2">Plano</p>
        <Select value={selectedPlanId} onValueChange={setSelectedPlanId}>
          <SelectTrigger className="w-full bg-gray-50 dark:bg-[#0a120d] border-gray-200 dark:border-[#1e2e24] text-gray-900 dark:text-white h-12 rounded-xl focus:ring-emerald-500/20 transition-colors">
            <SelectValue placeholder="Selecione um plano" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-[#0a120d] border-gray-200 dark:border-[#1e2e24] text-gray-900 dark:text-white">
            {activePlans.length > 0 ? activePlans.map(plan => (
              <SelectItem key={plan.id} value={plan.id}>{plan.name || plan.title}</SelectItem>
            )) : (
              <SelectItem value="none" disabled>Nenhum plano ativo</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div>
        <p className="text-[10px] font-bold tracking-wider text-gray-500 dark:text-white/50 uppercase mb-2">Matéria</p>
        <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
          <SelectTrigger className="w-full bg-gray-50 dark:bg-[#0a120d] border-gray-200 dark:border-[#1e2e24] text-gray-900 dark:text-white h-12 rounded-xl focus:ring-emerald-500/20 transition-colors">
            <SelectValue placeholder="Selecione uma matéria" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-[#0a120d] border-gray-200 dark:border-[#1e2e24] text-gray-900 dark:text-white">
            {selectedPlanSubjects.map(sub => (
              <SelectItem key={sub.id} value={sub.id}>
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sub.color || '#10b981' }} />
                  <span className="truncate">{sub.name}</span>
                </div>
              </SelectItem>
            ))}
            {selectedPlanSubjects.length === 0 && (
              <SelectItem value="none" disabled>Nenhuma matéria</SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="pt-2">
        <Button 
          onClick={handleStartTimer}
          disabled={!selectedPlanId || !selectedSubjectId}
          className="w-full rounded-full h-12 bg-emerald-500 hover:bg-emerald-600 dark:hover:bg-emerald-400 text-white dark:text-[#0f1b14] font-bold text-sm"
        >
          <Play className="w-5 h-5 mr-1.5" fill="currentColor" />
          Iniciar agora
        </Button>
      </div>

      {/* Sessão Atual */}
      {runtime && (
        <div className={cn("mt-4 p-4 rounded-xl border flex items-center justify-between transition-colors bg-emerald-500/10 border-emerald-500/20")}>
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
            <div>
              <p className="text-[10px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-500">Sessão Atual</p>
              <p className="text-sm font-bold text-gray-900 dark:text-white leading-tight">
                {runtimeSubject?.name || 'Matéria'} • {displayTimeLabel}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-bold tracking-wider uppercase text-emerald-600 dark:text-emerald-500">
            {phaseStateLabel}
          </span>
        </div>
      )}
    </div>
  )

  return (
    <div className="flex h-full w-full flex-col overflow-hidden animate-in fade-in duration-500 bg-transparent md:bg-transparent">
      {/* Removemos o overflow do main no desktop, forçando a ser uma flex column */}
      <main className="flex-1 overflow-y-auto md:overflow-hidden p-4 md:p-6 pb-24 md:pb-6 flex flex-col min-h-0">
        <div className="mx-auto w-full max-w-6xl flex-1 flex flex-col min-h-0">
          
          {/* ================= MOBILE LAYOUT (< md) ================= */}
          <div className="md:hidden space-y-4">
            
            {/* 2 Cols Cards */}
            <div className="grid grid-cols-2 gap-4">
              {/* Meta Diária Mobile */}
              <Card className="bg-white dark:bg-[#0f1b14] border-gray-200 dark:border-[#1e2e24] shadow-sm dark:shadow-none overflow-hidden relative transition-colors">
                <CardContent className="p-4 relative z-10">
                  <p className="text-[10px] font-bold tracking-wider text-gray-500 dark:text-muted-foreground uppercase mb-1">Meta Diária</p>
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

              {/* Constância Mobile */}
              <Card className="bg-white dark:bg-[#0f1b14] border-gray-200 dark:border-[#1e2e24] shadow-sm dark:shadow-none overflow-hidden transition-colors">
                <CardContent className="p-4 flex flex-col justify-between h-full">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Flame className="w-4 h-4 text-amber-500" />
                      <p className="text-[10px] font-bold tracking-wider text-[#10b981] uppercase">Constância</p>
                    </div>
                    <div className="flex items-baseline gap-1 mb-4">
                      <span className="text-3xl font-black text-gray-900 dark:text-white">{currentStreak}</span>
                      <span className="text-sm font-medium text-gray-500 dark:text-white/50">dias</span>
                    </div>
                  </div>
                  
                  {/* Dots */}
                  <div className="flex justify-between items-center gap-1 mt-auto pb-1">
                    {[1,2,3,4,5,6,7].map((i) => (
                      <div 
                        key={i} 
                        className={cn(
                          "h-1.5 flex-1 rounded-full transition-colors",
                          i <= Math.min(currentStreak, 7) ? "bg-amber-500" : "bg-gray-200 dark:bg-[#1e2e24]"
                        )}
                      />
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Stacked Links Mobile */}
            <div className="space-y-3 mt-6">
              <button onClick={() => navigate('/schedules')} className="w-full flex items-center p-4 rounded-2xl bg-white dark:bg-[#0f1b14] border border-gray-200 dark:border-[#1e2e24] shadow-sm dark:shadow-none active:scale-[0.98] transition-all text-left">
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
          <div className="hidden md:flex flex-col flex-1 min-h-0">
            {/* Top Right Floating Constância */}
            <div className="flex justify-end mb-4 shrink-0">
              <div className="inline-flex items-center gap-3 px-4 py-2 rounded-2xl bg-white dark:bg-[#0f1b14] border border-gray-200 dark:border-[#1e2e24] shadow-sm dark:shadow-none transition-colors">
                <Flame className="w-5 h-5 text-amber-500" />
                <div>
                  <p className="text-[10px] font-bold tracking-wider text-[#10b981] uppercase leading-none">Constância</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white leading-none mt-1">{currentStreak} dias</p>
                </div>
                <div className="flex gap-1.5 ml-2">
                  {[1,2,3,4,5,6,7].map((i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "w-2 h-2 rounded-full transition-colors",
                        i <= Math.min(currentStreak, 7) ? "bg-amber-500" : "bg-gray-200 dark:bg-[#1e2e24]"
                      )}
                    />
                  ))}
                </div>
              </div>
            </div>

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
                      <div className="text-right">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 text-xs font-medium border border-emerald-500/20">
                          <Clock className="w-3.5 h-3.5" />
                          {currentStreak > 0 ? `${currentStreak} dias` : '0 dias'}
                        </div>
                        <p className="text-[10px] text-gray-400 dark:text-white/30 mt-2">meta semanal: {Math.round((dailyGoalMinutes*7)/60)}h</p>
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

                    {/* Tabs Planos */}
                    <div className="flex gap-4 border-b border-gray-200 dark:border-[#1e2e24] mb-6 pb-2 overflow-x-auto no-scrollbar shrink-0">
                      {activePlans.length > 0 ? activePlans.map(plan => (
                        <button 
                          key={plan.id}
                          onClick={() => setActiveTab(plan.id)}
                          className={cn(
                            "text-[10px] font-bold tracking-wider uppercase pb-2 px-1 relative transition-colors whitespace-nowrap",
                            activeTab === plan.id ? "text-emerald-600 dark:text-emerald-500" : "text-gray-400 hover:text-gray-600 dark:text-white/30 dark:hover:text-white/50"
                          )}
                        >
                          {plan.name || plan.title}
                          {activeTab === plan.id && (
                            <div className="absolute bottom-[-9px] left-0 right-0 h-0.5 bg-emerald-500 rounded-full" />
                          )}
                        </button>
                      )) : (
                        <span className="text-[10px] font-bold tracking-wider uppercase text-gray-400 dark:text-white/30">Nenhum plano ativo</span>
                      )}
                    </div>

                    {/* List Subjects */}
                    <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                      {activePlans.length > 0 && activeTabSubjects.map((sub, i) => {
                        const targetMins = sub.target_hours_per_week ? Math.round(sub.target_hours_per_week*60/7) : 60;
                        const studiedMins = todaySessions
                          .filter(s => s.subjectId === sub.id || s.subject_id === sub.id)
                          .reduce((sum, s) => sum + (s.durationMinutes || Math.round((s.actualDurationSeconds || 0) / 60) || 0), 0);
                        
                        return (
                          <div key={i} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#0a120d] border border-gray-200 dark:border-[#1e2e24] group hover:border-emerald-500/30 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className={cn("w-3 h-3 rounded-full")} style={{ backgroundColor: sub.color || '#10b981' }} />
                              <div>
                                <p className="font-bold text-gray-900 dark:text-white text-sm">{sub.name}</p>
                                <p className="text-[10px] text-gray-500 dark:text-white/40 font-medium">Meta: {targetMins}m - Estudado: {studiedMins}m</p>
                              </div>
                            </div>
                            <button 
                              onClick={() => navigate(`/timer?planId=${activeTab}&subjectId=${sub.id}`)}
                              className="w-10 h-10 rounded-full bg-gray-200 dark:bg-[#1e2e24] flex items-center justify-center text-gray-500 dark:text-white/50 group-hover:bg-emerald-500 group-hover:text-white dark:group-hover:text-[#0f1b14] transition-colors shrink-0"
                            >
                              <Play className="w-4 h-4 ml-0.5" fill="currentColor" />
                            </button>
                          </div>
                        )
                      })}
                      
                      {activePlans.length > 0 && activeTabSubjects.length === 0 && (
                        <div className="text-center py-6 text-gray-400 dark:text-white/30 text-sm">Nenhuma matéria para hoje neste plano.</div>
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
                <Card className="bg-white dark:bg-[#0f1b14] border-gray-200 dark:border-[#1e2e24] shadow-sm dark:shadow-none transition-colors shrink-0">
                  <CardHeader className="p-6 pb-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock className="w-5 h-5 text-emerald-600 dark:text-[#10b981]" />
                      <p className="text-[10px] font-bold tracking-wider text-emerald-600 dark:text-[#10b981] uppercase">Timer Rápido</p>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Começar matéria do plano</h3>
                    <p className="text-xs text-gray-500 dark:text-white/50 font-medium mt-1">Escolha um plano, selecione a matéria e inicie em um toque.</p>
                  </CardHeader>
                  <CardContent className="p-6 pt-4">
                    {quickTimerContent}
                  </CardContent>
                </Card>

                {/* Planos Ativos Card */}
                <Card className="bg-white dark:bg-[#0f1b14] border-gray-200 dark:border-[#1e2e24] shadow-sm dark:shadow-none flex-1 flex flex-col min-h-0 transition-colors">
                  <CardHeader className="p-6 pb-4 shrink-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Target className="w-5 h-5 text-emerald-600 dark:text-[#10b981]" />
                      <p className="text-[10px] font-bold tracking-wider text-emerald-600 dark:text-[#10b981] uppercase">Planos Ativos</p>
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Seus Planos de Estudos</h3>
                    <p className="text-xs text-gray-500 dark:text-white/50 font-medium mt-1">Acompanhe seus cronogramas principais em poucos cliques.</p>
                  </CardHeader>
                  <CardContent className="p-6 pt-0 flex-1 flex flex-col min-h-0">
                    <div className="space-y-3 flex-1 overflow-y-auto pr-2">
                      {activePlans.length === 0 ? (
                        <div className="text-center py-6 text-gray-400 dark:text-white/30 text-sm">Nenhum plano ativo.</div>
                      ) : (
                        activePlans.map(plan => (
                          <div key={plan.id} className="flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-[#0a120d] border border-gray-200 dark:border-[#1e2e24] hover:border-emerald-500/30 transition-colors cursor-pointer" onClick={() => navigate(`/plans/${plan.id}`)}>
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 rounded-full bg-blue-500/10 dark:bg-blue-500/20 flex items-center justify-center shrink-0">
                                <Target className="w-5 h-5 text-blue-600 dark:text-blue-500" />
                              </div>
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
        <DrawerContent className="bg-white dark:bg-[#0f1b14] p-6 pb-12 border-gray-200 dark:border-[#1e2e24]">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-emerald-600 dark:text-[#10b981]" />
              <p className="text-[10px] font-bold tracking-wider text-emerald-600 dark:text-[#10b981] uppercase">Timer Rápido</p>
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Começar matéria do plano</h3>
          </div>
          {quickTimerContent}
        </DrawerContent>
      </Drawer>
    </div>
  )
}
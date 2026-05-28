import React, { useMemo, useState } from 'react';
import { Flame, Check, CalendarDays } from 'lucide-react';
import { startOfWeek, addDays, format, isToday, subDays, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useAuth } from '@/contexts/AuthContext';
import { useStudy } from '@/contexts/StudyContext';
import { toDateKey } from '@/lib/date-utils';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export function StreakCalendarCard({ className }: { className?: string }) {
  const { profile } = useAuth();
  const { getTotalMinutesForDate } = useStudy();

  const [activeTab, setActiveTab] = useState('mensal');

  const streakCurrent = profile?.streak_current ?? 0;
  const dailyGoal = profile?.daily_goal_minutes ?? 30;

  // Determine if a date hit the goal
  const hasHitGoal = (date: Date) => {
    const key = toDateKey(date);
    const minutes = getTotalMinutesForDate(key);
    return minutes >= dailyGoal;
  };

  const hasAnyStudy = (date: Date) => {
    const key = toDateKey(date);
    return getTotalMinutesForDate(key) > 0;
  };

  // Weekly View Data
  const today = new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 0 }); // Sunday

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const date = addDays(weekStart, i);
      return {
        date,
        label: format(date, 'EEEEE', { locale: ptBR }).toUpperCase(), // D, S, T, Q, Q, S, S
        isToday: isToday(date),
        isCompleted: hasHitGoal(date),
        hasStudied: hasAnyStudy(date)
      };
    });
  }, [weekStart, getTotalMinutesForDate, dailyGoal]);

  // Yearly View Data (Last 365 days)
  const yearlyDays = useMemo(() => {
    const end = today;
    const start = subDays(end, 364); // 365 days total
    const days = eachDayOfInterval({ start, end });
    return days.map(d => ({
      date: d,
      isCompleted: hasHitGoal(d),
      hasStudied: hasAnyStudy(d)
    }));
  }, [today, getTotalMinutesForDate, dailyGoal]);

  // Render Yearly Grid
  const renderYearlyGrid = () => {
    // Group into columns of 7 days (weeks)
    const firstDay = yearlyDays[0].date;
    const paddingStart = firstDay.getDay(); // 0 = Sunday
    
    const paddedDays: (typeof yearlyDays[0] | null)[] = [
      ...Array(paddingStart).fill(null),
      ...yearlyDays
    ];

    const weeks: (typeof yearlyDays[0] | null)[][] = [];
    for (let i = 0; i < paddedDays.length; i += 7) {
      weeks.push(paddedDays.slice(i, i + 7));
    }

    return (
      <div className="flex gap-1 overflow-x-auto pb-2 custom-scrollbar items-end">
        {weeks.map((week, wIndex) => (
          <div key={wIndex} className="flex flex-col gap-1">
            {week.map((day, dIndex) => (
              <div 
                key={dIndex} 
                className={cn(
                  "w-3 h-3 rounded-[2px]",
                  day === null 
                    ? "bg-transparent" 
                    : day.isCompleted 
                      ? "bg-amber-500" 
                      : day.hasStudied 
                        ? "bg-amber-300/60" 
                        : "bg-muted"
                )}
                title={day ? `${format(day.date, 'dd/MM/yyyy')}: ${day.isCompleted ? 'Meta atingida' : day.hasStudied ? 'Estudou um pouco' : 'Sem estudo'}` : undefined}
              />
            ))}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className={cn("bg-card text-card-foreground rounded-3xl p-5 shadow-sm border border-border/50 relative overflow-hidden flex flex-col gap-4 group", className)}>
      {/* Background Icon */}
      <Flame className="absolute -right-4 -top-4 w-40 h-40 text-amber-500/5 dark:text-amber-500/10 -rotate-12 pointer-events-none" />

      <div className="relative z-10 flex justify-between items-start">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-display font-black text-amber-500 tracking-tight">
              {streakCurrent} {streakCurrent === 1 ? 'dia' : 'dias'} de consistência
            </h2>
            
            <Dialog>
              <DialogTrigger asChild>
                <button 
                  className="px-2 py-1 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
                  title="Ver histórico completo"
                >
                  <CalendarDays className="w-3 h-3" />
                  Histórico
                </button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px] border-border/50 bg-background/95 backdrop-blur-md">
                <DialogHeader>
                  <DialogTitle className="text-xl font-black flex items-center gap-2 text-amber-500">
                    <Flame className="w-5 h-5" />
                    Histórico de Ofensiva
                  </DialogTitle>
                </DialogHeader>
                
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
                  <TabsList className="w-full h-10 bg-muted/50 border border-border/50 rounded-full mb-6 p-1">
                    <TabsTrigger value="mensal" className="w-full rounded-full text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-white">Mensal</TabsTrigger>
                    <TabsTrigger value="anual" className="w-full rounded-full text-xs data-[state=active]:bg-amber-500 data-[state=active]:text-white">Anual</TabsTrigger>
                  </TabsList>
                  
                  {/* MENSAL VIEW */}
                  <TabsContent value="mensal" className="flex justify-center mt-0 min-h-[300px]">
                    <div className="bg-card border border-border/50 rounded-2xl p-4 shadow-sm">
                      <Calendar
                        mode="single"
                        selected={today}
                        className="bg-transparent pointer-events-none"
                        modifiers={{
                          completed: (date) => hasHitGoal(date),
                          studied: (date) => !hasHitGoal(date) && hasAnyStudy(date),
                        }}
                        modifiersStyles={{
                          completed: { backgroundColor: 'hsl(var(--amber-500, 38 92% 50%))', color: 'white', fontWeight: 'bold' },
                          studied: { backgroundColor: 'hsl(var(--amber-500, 38 92% 50%) / 0.3)', color: 'inherit' },
                        }}
                        classNames={{
                          head_cell: "text-muted-foreground font-bold text-[0.8rem] w-10 font-normal uppercase",
                          cell: "h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                          day: "h-10 w-10 p-0 font-normal aria-selected:opacity-100 rounded-full",
                          day_selected: "bg-amber-500 text-white hover:bg-amber-500 hover:text-white focus:bg-amber-500 focus:text-white",
                          day_today: "bg-accent text-accent-foreground font-bold",
                        }}
                      />
                    </div>
                  </TabsContent>
                  
                  {/* ANUAL VIEW */}
                  <TabsContent value="anual" className="mt-0 min-h-[300px]">
                    <div className="bg-card border border-border/50 rounded-2xl p-5 shadow-sm">
                      <div className="flex items-center justify-between mb-6">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Últimos 365 dias</span>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          Menos
                          <div className="w-3 h-3 rounded-[2px] bg-muted" />
                          <div className="w-3 h-3 rounded-[2px] bg-amber-300/60" />
                          <div className="w-3 h-3 rounded-[2px] bg-amber-500" />
                          Mais
                        </div>
                      </div>
                      {renderYearlyGrid()}
                    </div>
                  </TabsContent>
                </Tabs>
              </DialogContent>
            </Dialog>
          </div>
          
          <p className="mt-1 text-xs font-medium text-muted-foreground max-w-[220px] leading-tight">
            {streakCurrent > 0 
              ? "Você está com uma ótima consistência! Continue assim para não perder o bônus." 
              : "Faça uma lição hoje pra começar uma nova consistência!"}
          </p>
        </div>
      </div>

      <div className="relative z-10 bg-background/50 dark:bg-black/20 backdrop-blur-sm rounded-2xl p-3 border border-border/50">
        <div className="flex justify-between items-center max-w-md mx-auto px-2">
          {weekDays.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-0.8">
              <span className={cn(
                "text-[10px] font-black",
                day.isToday 
                  ? "text-amber-500" 
                  : "text-muted-foreground/60 dark:text-muted-foreground"
              )}>
                {day.label}
              </span>
              
              <div className={cn(
                "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300",
                day.isCompleted 
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/30 scale-110" 
                  : day.hasStudied
                    ? "bg-amber-500/30 text-amber-700 border border-amber-500/50"
                    : "bg-muted/80 text-muted-foreground"
              )}>
                {day.isCompleted ? (
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3]" />
                ) : day.hasStudied ? (
                  <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : (
                  <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-muted-foreground/20" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

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
import { ResponsivePanel } from '@/components/generic/ResponsivePanel';

export function StreakCalendarCard({ className }: { className?: string }) {
  const { profile } = useAuth();
  const { getTotalMinutesForDate } = useStudy();

  const [activeTab, setActiveTab] = useState('mensal');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

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

  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (activeTab === 'anual' && scrollRef.current) {
      scrollRef.current.scrollLeft = scrollRef.current.scrollWidth;
    }
  }, [activeTab, isHistoryOpen]);

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
      <div 
        ref={scrollRef}
        className="w-full overflow-x-auto pb-4 custom-scrollbar"
      >
        <div className="flex gap-1 items-end min-w-max">
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
      </div>
    );
  };

  return (
    <div className={cn("bg-card text-card-foreground rounded-3xl p-4 sm:p-5 shadow-sm border border-border/50 relative overflow-hidden flex flex-col gap-4 sm:gap-5", className)}>
      <div className="relative z-10 flex justify-between items-start">
        <div className="flex flex-col">
          <h2 className="text-5xl sm:text-6xl font-display font-black text-[#facc15] tracking-tight leading-none">
            {streakCurrent}
          </h2>
          <p className="text-sm sm:text-base font-semibold text-muted-foreground mt-1">
            dias de consistência
          </p>
        </div>
        
        <button 
          className="mt-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          title="Ver histórico completo"
          onClick={() => setIsHistoryOpen(true)}
        >
          <CalendarDays className="w-3.5 h-3.5" />
          Histórico
        </button>

        <ResponsivePanel
          open={isHistoryOpen}
          onOpenChange={(open) => !open && setIsHistoryOpen(false)}
          title="Histórico de Ofensiva"
          size="xl"
          unstyled
          className="h-[100dvh] mt-0 sm:h-auto"
        >
          <div className="flex flex-col h-full bg-background relative overflow-hidden">
            <div className="p-5 sm:p-6 pb-2">
              <h3 className="text-xl font-black flex items-center gap-2 text-[#facc15] mb-2">
                <Flame className="w-5 h-5" />
                Histórico de Ofensiva
              </h3>
            
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mt-4">
              <TabsList className="w-full h-10 bg-muted/50 border border-border/50 rounded-full mb-6 p-1">
                <TabsTrigger value="mensal" className="w-full rounded-full text-xs data-[state=active]:bg-[#facc15] data-[state=active]:text-black">Mensal</TabsTrigger>
                <TabsTrigger value="anual" className="w-full rounded-full text-xs data-[state=active]:bg-[#facc15] data-[state=active]:text-black">Anual</TabsTrigger>
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
                      completed: { backgroundColor: '#facc15', color: 'black', fontWeight: 'bold' },
                      studied: { backgroundColor: 'rgba(250, 204, 21, 0.3)', color: 'inherit' },
                    }}
                    classNames={{
                      head_cell: "text-muted-foreground font-bold text-[0.8rem] w-10 font-normal uppercase",
                      cell: "h-10 w-10 text-center text-sm p-0 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-accent/50 [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md",
                      day: "h-10 w-10 p-0 font-normal aria-selected:opacity-100 rounded-full",
                      day_selected: "bg-[#facc15] text-black hover:bg-[#facc15] hover:text-black focus:bg-[#facc15] focus:text-black",
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
                      <div className="w-3 h-3 rounded-[2px] bg-[#facc15]/60" />
                      <div className="w-3 h-3 rounded-[2px] bg-[#facc15]" />
                      Mais
                    </div>
                  </div>
                  {renderYearlyGrid()}
                </div>
              </TabsContent>
            </Tabs>
            </div>
          </div>
        </ResponsivePanel>
      </div>

      <div className="relative z-10 w-full mt-1">
        <div className="flex justify-between items-center w-full px-1">
          {weekDays.map((day, i) => (
            <div key={i} className="flex flex-col items-center gap-1.5">
              <span className="text-[10px] font-bold text-muted-foreground/70 uppercase">
                {day.label}
              </span>
              
              <div className={cn(
                "w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300",
                day.isCompleted 
                  ? "bg-[#facc15] text-black shadow-md shadow-[#facc15]/20 scale-110" 
                  : day.isToday
                    ? "bg-transparent border-[2.5px] border-[#facc15]"
                    : day.hasStudied
                      ? "bg-[#facc15]/30 text-amber-600 border border-[#facc15]/50"
                      : "bg-black/20 sm:bg-muted/40"
              )}>
                {day.isCompleted ? (
                  <Check className="w-4 h-4 sm:w-5 sm:h-5 stroke-[3.5]" />
                ) : day.hasStudied ? (
                  <Flame className="w-4 h-4 sm:w-5 sm:h-5" />
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

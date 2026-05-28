import React, { useMemo, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  BookOpen, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Search, 
  ArrowUpRight, 
  Calendar,
  Sparkles,
  Play,
  ChevronRight,
  TrendingUp,
  Inbox,
  User,
  MoreHorizontal
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStudy } from '@/contexts/StudyContext';
import { useStudyPlans } from '@/hooks/useStudyPlans';
import { toDateKey } from '@/lib/date-utils';
import { formatMinutesCompact } from '@/lib/duration-utils';
import { getSessionActualMinutes } from '@/features/tracker/session-metrics';
import { cn } from '@/lib/utils';
import { QuickPlanTimerCard } from '@/components/dashboard/QuickPlanTimerCard';
import { DashboardPlansCard } from '@/components/dashboard/DashboardPlansCard';
import { DailySubjectsCard } from '@/components/dashboard/DailySubjectsCard';
import { StreakCalendarCard } from '@/components/dashboard/StreakCalendarCard';
import { QuickMetricsCard } from '@/components/dashboard/QuickMetricsCard';

export default function DashboardPage() {
  const { data, getSubject, getScheduleForDate, getTotalMinutesForDate } = useStudy();
  const { plans } = useStudyPlans();
  const { user } = useAuth();
  const navigate = useNavigate();

  // Search input state (Donezo style search in header)
  const [searchQuery, setSearchQuery] = useState('');

  const today = toDateKey(new Date());
  const weekDates = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - index));
    return toDateKey(d);
  }), []);

  const weekMinutes = weekDates.reduce((acc, date) => acc + getTotalMinutesForDate(date), 0);
  const todaySchedule = getScheduleForDate(today);
  
  const completedToday = useMemo(() => {
    return todaySchedule.filter((entry) => entry.completed).length;
  }, [todaySchedule]);

  const totalToday = todaySchedule.length;
  const progressPercent = useMemo(() => {
    if (totalToday === 0) return 60; // Default mockup percent if empty
    return Math.round((completedToday / totalToday) * 100);
  }, [completedToday, totalToday]);

  // Activity Data for Custom Capsules Bar Chart
  const activityData = useMemo(() => {
    const raw = weekDates.map((dateStr) => {
      const dateObj = new Date(`${dateStr}T12:00:00`);
      return {
        dayName: dateObj.toLocaleDateString('pt-BR', { weekday: 'narrow' }), // S, M, T...
        minutes: getTotalMinutesForDate(dateStr),
      };
    });
    
    const maxMinutes = Math.max(...raw.map(d => d.minutes), 1);
    return raw.map(d => ({
      ...d,
      percent: Math.max(Math.round((d.minutes / maxMinutes) * 100), 0),
    }));
  }, [weekDates, data]);

  const activePlans = plans.filter(p => p.status === 'active').slice(0, 4);
  const displayName = user?.user_metadata?.full_name?.split(' ')[0] || user?.email?.split('@')[0] || 'Estudante';
  const displayEmail = user?.email || 'estudante@studyflow.com';

  const pendingToday = todaySchedule.filter((entry) => !entry.completed).slice(0, 5);

  return (
    <div className="space-y-8 w-full max-w-full mx-auto pb-12 animate-in fade-in duration-500 bg-background text-foreground p-1 md:p-6 rounded-[2.5rem] min-h-screen">


      {/* BENTO GRID: ROW 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* QUICK METRICS CARD */}
        <QuickMetricsCard className="xl:col-span-8 xl:h-full" />
        {/* STREAK CALENDAR CARD */}
        <StreakCalendarCard className="xl:col-span-4 xl:h-full" />
      </div>

      {/* BENTO GRID: ROW 2 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 flex-col">
        <DailySubjectsCard className="order-2 xl:order-1 xl:col-span-4 h-full" />
        <QuickPlanTimerCard plans={plans} className="order-1 xl:order-2 xl:col-span-4 h-full" />
        <DashboardPlansCard plans={plans} className="order-3 xl:col-span-4 h-full" />
      </div>

      {/* STYLES FOR THE INACTIVE CHART STRIPES AND SCROLLBAR */}
      <style dangerouslySetInnerHTML={{ __html: `
        .bg-striped {
          background-image: repeating-linear-gradient(
            45deg, 
            transparent, 
            transparent 6px, 
            hsl(var(--border)) 6px, 
            hsl(var(--border)) 12px
          );
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: hsl(var(--border));
          border-radius: 10px;
        }
      `}} />
    </div>
  );
}

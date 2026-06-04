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
  MoreHorizontal,
  Bell,
  Flame
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
import { useNotifications } from '@/contexts/NotificationContext';
import { UserProfilePanel } from '@/components/UserProfilePanel';
import { UserNotificationsPanel } from '@/components/UserNotificationsPanel';
import { Drawer, DrawerContent } from '@/components/ui/drawer';

export default function DashboardPage() {
  const { data, getSubject, getScheduleForDate, getTotalMinutesForDate } = useStudy();
  const { plans } = useStudyPlans();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  // Panel states
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isStreakSheetOpen, setIsStreakSheetOpen] = useState(false);

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
  const profileLabel = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Perfil';
  const profileInitials =
    profileLabel
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'U';

  const pendingToday = todaySchedule.filter((entry) => !entry.completed).slice(0, 5);

  const currentDateFormatted = new Intl.DateTimeFormat('pt-BR', {
    weekday: 'long',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  // Capitalize first letter of the weekday
  const capitalizedDate = currentDateFormatted.charAt(0).toUpperCase() + currentDateFormatted.slice(1).replace('.', '');

  return (
    <div className="space-y-8 w-full max-w-full mx-auto pb-12 animate-in fade-in duration-500 bg-background text-foreground p-1 md:p-6 rounded-[2.5rem] min-h-screen">

      <div className="flex flex-col gap-5 md:hidden px-1 pt-2">
        <div className="flex items-center justify-between">
          <span className="font-display font-black text-xl tracking-tight text-primary uppercase">BoraEstudar</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setIsStreakSheetOpen(true)}
              className="relative p-2 rounded-2xl border border-border/70 bg-card hover:bg-muted/40 transition-colors shadow-sm"
              aria-label="Ofensiva"
            >
              <Flame className="w-5 h-5 text-amber-500" />
            </button>
            <button
              type="button"
              onClick={() => setIsNotificationsOpen(true)}
              className="relative p-2.5 rounded-2xl border border-border/70 bg-card hover:bg-muted/40 transition-colors shadow-sm"
              aria-label="Notificações"
            >
              <Bell className="w-4 h-4 text-muted-foreground hover:text-foreground transition-colors" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setIsProfileOpen(true)}
              className="flex h-10 w-10 ml-1 items-center justify-center rounded-full bg-primary text-xs font-black text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
            >
              {profileInitials}
            </button>
          </div>
        </div>
        
        <div className="flex flex-col gap-1.5">
          <p className="text-[13px] font-medium text-muted-foreground">{capitalizedDate}</p>
          <h1 className="text-2xl font-display font-black tracking-tight text-foreground flex items-center gap-2">
            Bora focar hoje? 🎯
          </h1>
        </div>
      </div>
      
      <UserProfilePanel isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <UserNotificationsPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />

      {/* Mobile Streak Sheet */}
      <Drawer open={isStreakSheetOpen} onOpenChange={setIsStreakSheetOpen}>
        <DrawerContent className="bg-background/95 backdrop-blur-xl border-border p-4 pb-12 h-[80vh]">
          <StreakCalendarCard className="border-0 shadow-none bg-transparent h-full" />
        </DrawerContent>
      </Drawer>


      {/* BENTO GRID: ROW 1 */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        {/* QUICK METRICS CARD */}
        <QuickMetricsCard className="xl:col-span-8 xl:h-full" />
        {/* STREAK CALENDAR CARD */}
        <StreakCalendarCard className="hidden md:flex xl:col-span-4 xl:h-full" />
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

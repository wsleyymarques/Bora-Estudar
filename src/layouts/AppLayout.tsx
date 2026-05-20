import React from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { BottomNavigator } from '@/components/BottomNavigator';
import { navigationItems } from '@/config/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfilePanel } from '@/components/UserProfilePanel';
import { BookOpen, Bell } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { CompactTimerPlayer } from '@/components/generic/compact-timer-player';
import { useNotifications } from '@/contexts/NotificationContext';
import { UserNotificationsPanel } from '@/components/UserNotificationsPanel';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const { resolvedTheme } = useTheme();
  const { templateKey } = useAppTheme();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const currentItem = navigationItems.find((item) => (item.url === '/' ? pathname === '/' : pathname.startsWith(item.url)));
  const profileLabel = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Perfil';
  const profileInitials =
    profileLabel
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'U';

  let logoSrc = '/logo-black.png';
  if (templateKey === 'cutie') {
    logoSrc = '/logo-pink.png';
  } else if (templateKey === 'padrao') {
    logoSrc = resolvedTheme === 'dark' ? '/logo-blue.png' : '/logo-navy.png';
  } else if (templateKey === 'minimalista') {
    logoSrc = resolvedTheme === 'dark' ? '/logo-white.png' : '/logo-black.png';
  } else {
    logoSrc = resolvedTheme === 'dark' ? '/logo-white.png' : '/logo-black.png';
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between border-b border-border px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <div className="hidden md:block">
                <SidebarTrigger />
              </div>
              <div className="flex items-center gap-2">
                <img src={logoSrc} alt="BoraEstudar Logo" className="h-10 w-10 object-contain" />
                <span className="font-display font-black text-sm tracking-tight text-foreground uppercase">BoraEstudar</span>
              </div>
              <div className="hidden sm:block h-4 w-px bg-border/80 mx-1" />
              <span className="hidden sm:inline text-xs font-bold text-muted-foreground uppercase tracking-widest">
                {currentItem?.title || 'Workspace'}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setIsNotificationsOpen(true)}
                className="relative p-2.5 rounded-full border border-border/70 bg-card hover:bg-muted/40 transition-colors shadow-sm"
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
                className="flex items-center gap-3 rounded-full border border-border/70 bg-card px-3 py-1.5 text-left shadow-sm transition-colors hover:bg-muted/40"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-[11px] font-black text-primary">
                  {profileInitials}
                </div>
                <div className="hidden sm:block">
                  <p className="text-xs font-semibold text-foreground">{profileLabel}</p>
                  <p className="max-w-[12rem] truncate text-[10px] text-muted-foreground">{user?.email}</p>
                </div>
              </button>
            </div>
          </header>
          <main className="flex-1 overflow-auto p-4 pb-24 md:p-6 lg:p-8 md:pb-6" style={{ overflowAnchor: 'none' }}>
            {children}
          </main>
        </div>
        <BottomNavigator />
      </div>

      <UserProfilePanel isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <UserNotificationsPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
      <CompactTimerPlayer variant="floating" />
    </SidebarProvider>
  );
}

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

  let logoSrc = '/assets/media__1779551687484.png'; // Blue
  if (templateKey === 'cutie') {
    logoSrc = '/assets/media__1779562329907.png'; // Pink
  } else if (templateKey === 'minimalista') {
    logoSrc = resolvedTheme === 'dark' 
      ? '/assets/media__1779562483004.png' // White
      : '/assets/media__1779562328484.png'; // Black
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar onOpenProfile={() => setIsProfileOpen(true)} onOpenNotifications={() => setIsNotificationsOpen(true)} />
        <div className="flex-1 flex flex-col min-w-0">

          <main className="flex-1 overflow-auto px-2 pt-1 pb-24 sm:p-4 sm:pb-24 md:p-6 lg:p-8 md:pb-6" style={{ overflowAnchor: 'none' }}>
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

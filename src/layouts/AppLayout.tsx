import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Bell, Menu } from 'lucide-react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useSidebar } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { BottomNavigator } from '@/components/BottomNavigator';
import { UserProfilePanel } from '@/components/UserProfilePanel';
import { UserNotificationsPanel } from '@/components/UserNotificationsPanel';
import { CompactTimerPlayer } from '@/components/generic/compact-timer-player';
import { FullscreenTimerPlayer } from '@/components/generic/fullscreen-timer-player';

function getMobileTitle(pathname: string) {
  if (pathname === '/') return 'Dashboard';
  if (pathname.startsWith('/plans')) return 'Planos';
  if (pathname.startsWith('/stats')) return 'Estatísticas';
  if (pathname.startsWith('/history')) return 'Histórico';
  if (pathname.startsWith('/schedule') || pathname.startsWith('/schedules')) return 'Cronograma';
  if (pathname.startsWith('/templates')) return 'Templates';
  if (pathname.startsWith('/timer')) return 'Timer';
  if (pathname.startsWith('/subjects')) return 'Matérias';
  if (pathname.startsWith('/settings')) return 'Configurações';
  if (pathname.startsWith('/profile')) return 'Perfil';
  return 'Bora-Estudar';
}

function MobileHeader({
  title,
  onOpenNotifications,
}: {
  title: string;
  onOpenNotifications: () => void;
}) {
  const { toggleSidebar } = useSidebar();

  return (
    <header className="fixed inset-x-0 top-0 z-40 grid h-16 grid-cols-[auto,1fr,auto] items-center border-b border-white/10 bg-[#0d1710] px-3 shadow-[0_12px_28px_rgba(0,0,0,0.12)] backdrop-blur md:hidden">
      <img
        src="/bora-estudar-mark-new.png"
        alt="Bora-Estudar"
        className="h-14 w-auto max-w-[176px] justify-self-start object-contain"
      />

      <div className="pointer-events-none justify-self-center text-sm font-black tracking-wide text-white">
        {title}
      </div>

      <div className="flex items-center gap-2 justify-self-end">
        <button
          type="button"
          onClick={onOpenNotifications}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/85 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Abrir notificações"
        >
          <Bell className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={toggleSidebar}
          className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white/85 transition-colors hover:bg-white/10 hover:text-white"
          aria-label="Abrir sidebar"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const { pathname } = useLocation();
  const isDashboard = pathname === '/';
  const mobileTitle = getMobileTitle(pathname);

  return (
    <SidebarProvider style={{ '--sidebar-width-icon': '5.5rem' } as React.CSSProperties}>
      <div className="workspace-shell h-screen w-screen overflow-hidden">
        <MobileHeader title={mobileTitle} onOpenNotifications={() => setIsNotificationsOpen(true)} />

        <div className="relative flex h-full w-full overflow-hidden bg-background md:bg-[#0d1710] md:p-3 transition-colors duration-500">
          {/* Efeitos de luz / glow no fundo */}
          <div className="absolute left-0 top-[15%] h-[350px] w-[350px] rounded-full bg-emerald-500/15 blur-[120px] pointer-events-none hidden md:block opacity-60 dark:opacity-100" />
          <div className="absolute left-[-5%] bottom-[10%] h-[250px] w-[250px] rounded-full bg-emerald-600/15 blur-[100px] pointer-events-none hidden md:block opacity-60 dark:opacity-100" />

          <AppSidebar onOpenNotifications={() => setIsNotificationsOpen(true)} />

          <div className="flex min-w-0 flex-1 flex-col md:pl-2 relative z-10">
            <main
              className={
                isDashboard
                  ? 'workspace-canvas flex-1 overflow-y-auto px-4 pb-24 pt-20 sm:px-6 sm:pb-4 sm:pt-20 md:bg-background md:rounded-[2rem] md:shadow-2xl md:ring-1 md:ring-white/5 md:overflow-hidden md:pb-4 md:pt-4 lg:px-8 lg:pt-6'
                  : 'workspace-canvas flex-1 overflow-auto px-4 pb-24 pt-20 sm:px-6 sm:pb-6 sm:pt-20 md:bg-background md:rounded-[2rem] md:shadow-2xl md:ring-1 md:ring-white/5 md:pt-4 lg:px-8 lg:pt-8'
              }
              style={{ overflowAnchor: 'none' }}
            >
              <div className="h-full min-h-0 w-full">{children}</div>
            </main>
          </div>
        </div>

      <BottomNavigator onOpenProfile={() => setIsProfileOpen(true)} isProfileOpen={isProfileOpen} />
      </div>

      <UserProfilePanel isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      <UserNotificationsPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
      <CompactTimerPlayer variant="floating" />
      <FullscreenTimerPlayer />
    </SidebarProvider>
  );
}

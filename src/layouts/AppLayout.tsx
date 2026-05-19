import React from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { BottomNavigator } from '@/components/BottomNavigator';
import { navigationItems } from '@/config/navigation';
import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { UserProfilePanel } from '@/components/UserProfilePanel';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const currentItem = navigationItems.find((item) => (item.url === '/' ? pathname === '/' : pathname.startsWith(item.url)));
  const profileLabel = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Perfil';
  const profileInitials =
    profileLabel
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('') || 'U';

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center border-b border-border px-4 bg-background/80 backdrop-blur-sm sticky top-0 z-30">
            <div className="hidden md:flex">
              <SidebarTrigger className="mr-4" />
            </div>
            <h1 className="text-sm font-semibold text-foreground md:hidden">{currentItem?.title ?? 'StudyTrack'}</h1>
            <div className="ml-auto">
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
          <main className="flex-1 overflow-auto p-4 pb-24 md:p-6 lg:p-8 md:pb-6">
            {children}
          </main>
        </div>
        <BottomNavigator />
      </div>

      <UserProfilePanel isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </SidebarProvider>
  );
}

import React from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { BottomNavigator } from '@/components/BottomNavigator';
import { navigationItems } from '@/config/navigation';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { pathname } = useLocation();
  const currentItem = navigationItems.find((item) => (item.url === '/' ? pathname === '/' : pathname.startsWith(item.url)));

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
          </header>
          <main className="flex-1 overflow-auto p-4 pb-24 md:p-6 lg:p-8 md:pb-6">
            {children}
          </main>
        </div>
        <BottomNavigator />
      </div>
    </SidebarProvider>
  );
}

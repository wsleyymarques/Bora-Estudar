import React from 'react';
import { useLocation } from 'react-router-dom';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { cn } from '@/lib/utils';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const isSchedulePage = location.pathname.startsWith('/schedule');

  return (
    <SidebarProvider>
      <div className={cn('h-svh min-h-screen w-full overflow-hidden')}>
        <div
          className={cn(
            'flex h-svh min-h-screen w-full max-w-full',
          )}
        >
          <AppSidebar />
          <div className="flex h-svh min-h-screen min-w-0 flex-1 flex-col">
            <header className="h-16 flex items-center gap-3 border-b border-border/60 px-3 md:px-5 bg-background/55 backdrop-blur sticky top-0 z-10">
              <SidebarTrigger className="rounded-full h-9 w-9 shrink-0 border border-border/60 bg-background/80" />
              <div className="workspace-panel hidden sm:flex items-center px-4 py-2 text-sm text-muted-foreground w-full max-w-lg">
                Pesquisar materias, sessoes, notas... para sessoes r 
              </div>
            </header>
            <main
              className={cn(
                'min-h-0 flex-1 overflow-y-auto overflow-x-hidden',
                isSchedulePage ? 'p-3' : 'p-3 md:p-5 lg:p-6',
              )}
            >
              {children}
            </main>
          </div>
        </div>
      </div>
    </SidebarProvider>
  );
}

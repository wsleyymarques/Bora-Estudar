import React from 'react';
import {
  LayoutDashboard, Calendar, BookOpen, Timer, History, BarChart3, Settings, LogOut
} from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';

const items = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Cronograma', url: '/schedule', icon: Calendar },
  { title: 'Materias', url: '/subjects', icon: BookOpen },
  { title: 'Timer', url: '/timer', icon: Timer },
  { title: 'Historico', url: '/history', icon: History },
  { title: 'Estatisticas', url: '/stats', icon: BarChart3 },
  { title: 'Configuracoes', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const { logout, user } = useAuth();

  if (!isMobile) {
    const desktopWidth = collapsed ? '5.75rem' : '16.25rem';

    return (
      <Sidebar
        collapsible="none"
        className="workspace-sidebar sticky top-0 h-svh shrink-0 border-r-0 transition-[width] duration-300 ease-in-out"
        style={{ '--sidebar-width': desktopWidth } as React.CSSProperties}
      >
        <SidebarContent className="h-svh  p-0 overflow-hidden">
          <div
            className={cn(
              'h-svh rounded-[2rem]  border-sidebar-border/70 bg-sidebar/95 backdrop-blur-md',
              'shadow-[0_20px_50px_hsl(var(--foreground)/0.20)] flex flex-col transition-all duration-300',
              collapsed ? 'items-center px-2 py-3' : 'items-stretch px-3 py-3',
            )}
          >
            <div className={cn('flex items-center w-full', collapsed ? 'justify-center' : 'justify-start gap-3 px-1')}>
              <div className="h-11 w-11 rounded-full border border-sidebar-border/70 bg-sidebar-accent/70 flex items-center justify-center shrink-0">
                <BookOpen className="w-4.5 h-4.5 text-sidebar-accent-foreground" />
              </div>
              {!collapsed && (
                <div className="min-w-0">
                  <p className="font-display font-bold text-sidebar-foreground text-base leading-none">StudyFlow</p>
                  <p className="text-[11px] text-sidebar-foreground/60 mt-1 truncate">Workspace</p>
                </div>
              )}
            </div>

            <nav
              className={cn(
                'mt-5 flex-1 flex w-full',
                collapsed ? 'flex-col items-center gap-2' : 'flex-col gap-1.5',
              )}
            >
              {items.map((item) => (
                <NavLink
                  key={item.title}
                  to={item.url}
                  end={item.url === '/'}
                  title={item.title}
                  aria-label={item.title}
                  className={cn(
                    'transition-colors',
                    collapsed
                      ? 'h-11 w-11 rounded-2xl flex items-center justify-center'
                      : 'h-11 w-full rounded-xl px-3 flex items-center gap-3',
                    'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent',
                  )}
                  activeClassName="bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
                >
                  <item.icon className={cn('h-4 w-4 shrink-0', !collapsed && 'h-4.5 w-4.5')} />
                  {!collapsed && <span className="text-sm font-medium truncate">{item.title}</span>}
                </NavLink>
              ))}
            </nav>

            <div className={cn('mt-auto pt-2 flex flex-col w-full', collapsed ? 'items-center gap-2' : 'items-stretch gap-2')}>
              {!collapsed && user && (
                <p
                  className="text-xs text-sidebar-foreground/55 truncate px-2"
                  title={user.user_metadata?.full_name || user.email || undefined}
                >
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </p>
              )}
              <button
                onClick={logout}
                title="Sair"
                aria-label="Sair"
                className={cn(
                  'text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors',
                  collapsed
                    ? 'h-11 w-11 rounded-2xl flex items-center justify-center'
                    : 'h-11 w-full rounded-xl px-3 flex items-center gap-3 text-sm',
                )}
              >
                <LogOut className="w-4 h-4" />
                {!collapsed && <span>Sair</span>}
              </button>
              {collapsed && user && (
                <span className="text-[10px] text-sidebar-foreground/40 max-w-[56px] truncate text-center px-1">
                  {user.user_metadata?.full_name || user.email?.split('@')[0]}
                </span>
              )}
            </div>
          </div>
        </SidebarContent>
      </Sidebar>
    );
  }

  return (
    <Sidebar collapsible="icon" className="workspace-sidebar">
      <SidebarContent className="flex flex-col justify-between h-full workspace-sidebar border-r border-sidebar-border/60">
        <div>
          <div className="p-4 md:p-5 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sidebar-accent/70 flex items-center justify-center flex-shrink-0 border border-sidebar-border/70">
              <BookOpen className="w-4.5 h-4.5 text-sidebar-accent-foreground" />
            </div>
            {!collapsed && (
              <div>
                <span className="font-display font-bold text-sidebar-foreground text-lg leading-none">StudyFlow</span>
                <p className="text-[11px] text-sidebar-foreground/60 mt-1">Workspace</p>
              </div>
            )}
          </div>

          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {items.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className="rounded-xl text-sidebar-foreground/80 hover:text-sidebar-foreground hover:bg-sidebar-accent"
                        activeClassName="rounded-xl bg-sidebar-accent text-sidebar-accent-foreground font-semibold"
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {!collapsed && <span>{item.title}</span>}
                      </NavLink>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        <div className="p-4 border-t border-sidebar-border/60">
          {!collapsed && user && (
            <p className="text-xs text-sidebar-foreground/60 mb-2 truncate">
              {user.user_metadata?.full_name || user.email?.split('@')[0]}
            </p>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-sidebar-foreground/80 hover:text-sidebar-foreground transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

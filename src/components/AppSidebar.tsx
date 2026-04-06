import React from 'react';
import {
  LayoutDashboard, Calendar, BookOpen, Timer, History, BarChart3, Settings, LogOut, Layers, CalendarClock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { AppSidebarHeader } from '@/components/generic/app-sidebar-header';
import { AppSidebarNavItem, AppSidebarNavSection } from '@/components/generic/app-sidebar-nav-section';
import { NavLink } from '@/components/NavLink';

const menuItems: AppSidebarNavItem[] = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Cronograma', url: '/schedule', icon: Calendar },
  { title: 'Cronogramas', url: '/schedules', icon: CalendarClock },
  { title: 'Templates', url: '/templates', icon: Layers },
  { title: 'Materias', url: '/subjects', icon: BookOpen },
  { title: 'Timer', url: '/timer', icon: Timer },
  { title: 'Historico', url: '/history', icon: History },
  { title: 'Estatisticas', url: '/stats', icon: BarChart3 },
];

const accountItems: AppSidebarNavItem[] = [
  { title: 'Configuracoes', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { state, isMobile } = useSidebar();
  const collapsed = state === 'collapsed';
  const { logout, user } = useAuth();

  if (!isMobile) {
    const desktopWidth = collapsed ? '6rem' : '17.25rem';

    return (
      <Sidebar
        collapsible="none"
        className="sticky top-0 h-svh shrink-0 border-r-0 bg-transparent text-sidebar-foreground transition-[width] duration-300 ease-in-out"
        style={{ '--sidebar-width': desktopWidth } as React.CSSProperties}
      >
        <SidebarContent className="h-svh overflow-hidden bg-transparent p-2.5">
          <div
            className={cn(
              'workspace-sidebar h-full rounded-[1.8rem] border border-sidebar-border/65 backdrop-blur-xl',
              'shadow-[0_20px_44px_hsl(var(--foreground)/0.20)] flex flex-col transition-all duration-300',
              collapsed ? 'items-center px-2 py-3' : 'items-stretch px-3 py-3.5',
            )}
          >
            <AppSidebarHeader
              collapsed={collapsed}
              title="StudyFlow"
              subtitle="Workspace"
              icon={<BookOpen className="h-4.5 w-4.5 text-sidebar-accent-foreground" />}
            />

            <AppSidebarNavSection collapsed={collapsed} label="Menu" items={menuItems} />
            <AppSidebarNavSection collapsed={collapsed} label="Conta" items={accountItems} />

            <div className={cn('mt-auto pt-2 flex flex-col w-full', collapsed ? 'items-center gap-2' : 'items-stretch gap-2')}>
              {!collapsed && user && (
                <p
                  className="text-xs text-sidebar-foreground/66 truncate px-2"
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
                  'text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors',
                  collapsed
                    ? 'h-11 w-11 rounded-2xl flex items-center justify-center'
                    : 'h-11 w-full rounded-xl px-3 flex items-center gap-3 text-sm',
                )}
              >
                <LogOut className="w-4 h-4" />
                {!collapsed && <span>Sair</span>}
              </button>
              {collapsed && user && (
                <span className="text-[10px] text-sidebar-foreground/66 max-w-[56px] truncate text-center px-1">
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
                {[...menuItems, ...accountItems].map((item) => (
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

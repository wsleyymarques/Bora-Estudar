import React from 'react';
import { BookOpen, LogOut } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { navigationItems } from '@/config/navigation';
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const { logout, user } = useAuth();

  return (
    <Sidebar collapsible="icon" className="hidden md:flex">
      <SidebarContent className="flex flex-col justify-between h-full">
        <div>
          <div className="p-4 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-primary" />
            </div>
            {!collapsed && <span className="font-display font-bold text-foreground">StudyTrack</span>}
          </div>
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton asChild>
                      <NavLink to={item.url} end={item.url === '/'} className="hover:bg-sidebar-accent/50" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
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
        <div className="p-4 border-t border-sidebar-border">
          {!collapsed && user && (
            <p className="text-xs text-muted-foreground mb-2 truncate">{user.user_metadata?.full_name || user.email?.split('@')[0]}</p>
          )}
          <button
            onClick={logout}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-full"
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>Sair</span>}
          </button>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}

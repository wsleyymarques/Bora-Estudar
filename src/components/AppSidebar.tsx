import React from 'react';
import { BookOpen, LogOut } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';
import { navigationItems } from '@/config/navigation';
import {
  Sidebar, 
  SidebarContent, 
  useSidebar,
} from '@/components/ui/sidebar';

export function AppSidebar() {
  const { state, isMobile, toggleSidebar } = useSidebar();
  const collapsed = state === 'collapsed';
  const { logout } = useAuth();
  const { plans } = useStudyPlans();
  const location = useLocation();

  const activePlansCount = plans.filter(p => p.status === 'active').length;

  const menuItems = [
    { title: 'Dashboard', url: '/', icon: LayoutDashboard },
    { title: 'Planos', url: '/plans', icon: Layers, badge: activePlansCount > 0 ? `${activePlansCount}+` : null },
    { title: 'Cronograma', url: '/schedule', icon: Calendar },
    { title: 'Estatísticas', url: '/stats', icon: BarChart3 },
    { title: 'Matérias', url: '/subjects', icon: BookOpen },
  ];

  const generalItems = [
    { title: 'Configurações', url: '/settings', icon: Settings },
    { title: 'Ajuda', url: '/help', icon: HelpCircle },
  ];

  if (!isMobile) {
    const desktopWidth = collapsed ? '5.5rem' : '16rem';

    return (
      <Sidebar
        collapsible="none"
        className="sticky top-0 h-svh shrink-0 border-r border-border/50 bg-card text-card-foreground transition-[width] duration-300 ease-in-out"
        style={{ '--sidebar-width': desktopWidth } as React.CSSProperties}
      >
        <SidebarContent className="h-svh overflow-hidden bg-transparent p-4 flex flex-col justify-between">


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
                    </div>
                  );
                })}

                {/* Logout Button */}
                <button
                  onClick={logout}
                  className="w-full flex items-center gap-3 h-11 rounded-2xl px-4 text-muted-foreground font-bold hover:text-destructive hover:bg-destructive/10 transition-all active:scale-[0.98]"
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  {!collapsed && <span className="text-sm tracking-tight">Sair</span>}
                </button>
              </nav>
            </div>
          </div>

          {/* Bottom Mobile Promo Card - Styled exactly like Donezo */}
          {!collapsed && (
            <div className="mt-auto p-4 rounded-3xl bg-primary text-primary-foreground relative overflow-hidden shadow-xl border border-primary/20 group">
              <div className="absolute -bottom-8 -right-8 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />
              
              <div className="w-7 h-7 rounded-lg bg-primary-foreground/10 flex items-center justify-center text-primary-foreground mb-3">
                <Sparkles className="w-4 h-4 text-primary-foreground" />
              </div>
              
              <h4 className="text-xs font-black leading-tight tracking-tight">Acesse no Celular</h4>
              <p className="text-[9px] font-bold text-primary-foreground/75 uppercase tracking-widest mt-1">Sincronize seu Foco</p>
              
              <button 
                onClick={() => alert("Baixe nosso aplicativo nas lojas oficiais!")}
                className="w-full py-2 bg-primary-foreground text-primary hover:bg-primary-foreground/90 active:scale-95 transition-all rounded-xl text-[10px] font-black uppercase tracking-widest mt-4 shadow-md"
              >
                Download
              </button>
            </div>
          )}
        </SidebarContent>
      </Sidebar>
    );
  }

  return null;
}

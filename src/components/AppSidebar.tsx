import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, 
  Calendar, 
  BookOpen, 
  Settings, 
  LogOut, 
  Layers, 
  BarChart3,
  HelpCircle,
  Sparkles
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStudyPlans } from '@/hooks/useStudyPlans';
import {
  Sidebar, 
  SidebarContent, 
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { NavLink } from '@/components/NavLink';

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


          {/* Navigation Items */}
          <div className="flex-1 space-y-6 overflow-y-auto pr-1 py-4 custom-sidebar-scroll">
            {/* MENU SECTION */}
            <div className="space-y-2">
              {!collapsed && (
                <p className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">Menu</p>
              )}
              <nav className="space-y-1">
                {menuItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <div key={item.title} className="relative">
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-r-full" />
                      )}
                      <NavLink
                        to={item.url}
                        end={item.url === '/'}
                        className={cn(
                          'flex items-center gap-3 h-11 transition-all rounded-2xl px-4 relative',
                          isActive 
                            ? 'text-foreground font-extrabold bg-primary/10' 
                            : 'text-muted-foreground font-bold hover:text-foreground hover:bg-muted/50'
                        )}
                        activeClassName="text-foreground font-extrabold bg-primary/10"
                      >
                        <item.icon className={cn('h-5 w-5 shrink-0 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground/80')} />
                        {!collapsed && (
                          <span className="text-sm tracking-tight flex-1 truncate">{item.title}</span>
                        )}
                        {!collapsed && item.badge && (
                          <span className="px-2 py-0.5 rounded-lg bg-primary text-primary-foreground text-[9px] font-black tracking-wider shadow-sm">
                            {item.badge}
                          </span>
                        )}
                      </NavLink>
                    </div>
                  );
                })}
              </nav>
            </div>

            {/* GENERAL SECTION */}
            <div className="space-y-2">
              {!collapsed && (
                <p className="px-3 text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">General</p>
              )}
              <nav className="space-y-1">
                {generalItems.map((item) => {
                  const isActive = location.pathname === item.url;
                  return (
                    <div key={item.title} className="relative">
                      {isActive && (
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 bg-primary rounded-r-full" />
                      )}
                      <NavLink
                        to={item.url}
                        className={cn(
                          'flex items-center gap-3 h-11 transition-all rounded-2xl px-4 relative',
                          isActive 
                            ? 'text-foreground font-extrabold bg-primary/10' 
                            : 'text-muted-foreground font-bold hover:text-foreground hover:bg-muted/50'
                        )}
                        activeClassName="text-foreground font-extrabold bg-primary/10"
                      >
                        <item.icon className={cn('h-5 w-5 shrink-0 transition-colors', isActive ? 'text-primary' : 'text-muted-foreground/80')} />
                        {!collapsed && (
                          <span className="text-sm tracking-tight flex-1 truncate">{item.title}</span>
                        )}
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

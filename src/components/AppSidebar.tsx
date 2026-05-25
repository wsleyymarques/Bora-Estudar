import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, 
  Layers, 
  BarChart3,
  History,
  MoreHorizontal,
  Bell,
  User
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStudyPlans } from '@/hooks/useStudyPlans';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { useTheme } from 'next-themes';
import {
  Sidebar, 
  SidebarContent, 
  useSidebar,
} from '@/components/ui/sidebar';
import { cn } from '@/lib/utils';
import { NavLink } from '@/components/NavLink';

interface AppSidebarProps {
  onOpenProfile?: () => void;
  onOpenNotifications?: () => void;
}

export function AppSidebar({ onOpenProfile, onOpenNotifications }: AppSidebarProps) {
  const state = useSidebar().state;
  const isMobile = useSidebar().isMobile;
  const collapsed = state === 'collapsed';
  const { plans } = useStudyPlans();
  const location = useLocation();
  const { unreadCount } = useNotifications();
  const { templateKey } = useAppTheme();
  const { resolvedTheme } = useTheme();

  const activePlansCount = plans.filter(p => p.status === 'active').length;

  let logoSrc = '/assets/media__1779551687484.png'; // Blue
  if (templateKey === 'cutie') {
    logoSrc = '/assets/media__1779562329907.png'; // Pink
  } else if (templateKey === 'minimalista') {
    logoSrc = resolvedTheme === 'dark' 
      ? '/assets/media__1779562483004.png' // White
      : '/assets/media__1779562328484.png'; // Black
  }

  const menuItems = [
    { title: 'APRENDER', url: '/', iconImage: '/assets/media__1779561373778.png', fallbackIcon: Home },
    { title: 'PLANOS', url: '/plans', iconImage: '/assets/media__1779561369461.png', fallbackIcon: Layers, badge: activePlansCount > 0 ? `${activePlansCount}` : null },
    { title: 'ESTATÍSTICAS', url: '/stats', iconImage: '/assets/media__1779561368073.png', fallbackIcon: BarChart3 },
    { title: 'HISTÓRICO', url: '/history', iconImage: '/icon-history.png', fallbackIcon: History },
  ];

  if (!isMobile) {
    // Duolingo has a fixed wide sidebar on desktop
    const desktopWidth = '16rem';

    return (
      <Sidebar
        collapsible="none"
        className="sticky top-0 h-svh shrink-0 border-r-2 border-border/20 bg-background text-foreground transition-[width] duration-300 ease-in-out hidden md:flex"
        style={{ '--sidebar-width': desktopWidth } as React.CSSProperties}
      >
        <SidebarContent className="h-svh overflow-hidden bg-transparent p-4 flex flex-col">
          
          {/* LOGO */}
          <div className="pt-8 pb-0 mb-4 flex justify-center items-center overflow-visible">
            <img 
              key={logoSrc}
              src={logoSrc} 
              alt="BoraEstudar" 
              className="w-[260px] max-w-none h-auto object-contain -mt-20 -mb-20 transition-all duration-300"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <h1 
              className="text-3xl font-black tracking-tight text-transparent bg-clip-text hidden"
              style={{
                backgroundImage: 'linear-gradient(to bottom, #4df, #08f)',
                WebkitTextStroke: '1px #05c',
                filter: 'drop-shadow(0px 3px 0px #05c)'
              }}
            >
              BORAESTUDAR
            </h1>
          </div>

          {/* Navigation Items */}
          <div className="flex-1 space-y-2 overflow-y-auto px-2 custom-sidebar-scroll">
            <nav className="space-y-1.5">
              {menuItems.map((item) => {
                const isActive = location.pathname === item.url;
                return (
                  <NavLink
                    key={item.title}
                    to={item.url}
                    end={item.url === '/'}
                    className={cn(
                      'flex items-center gap-4 h-14 transition-all rounded-2xl px-4 relative group border-2',
                      isActive 
                        ? 'border-sky-200/20 bg-sky-500/10 text-sky-400 font-black' 
                        : 'border-transparent text-muted-foreground font-black hover:bg-muted/30 hover:text-foreground'
                    )}
                    activeClassName="border-sky-200/20 bg-sky-500/10 text-sky-400 font-black"
                  >
                    <div className="w-10 h-10 flex items-center justify-center shrink-0">
                      {item.iconImage ? (
                        <img 
                          src={item.iconImage} 
                          alt={item.title} 
                          className={cn("w-10 h-10 object-contain transition-transform group-hover:scale-110", isActive ? "scale-110" : "opacity-80 grayscale-[30%]")} 
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                          }}
                        />
                      ) : null}
                      <item.fallbackIcon className={cn('h-7 w-7 shrink-0 transition-colors', item.iconImage ? 'hidden' : '', isActive ? 'text-sky-400' : 'text-muted-foreground/80 group-hover:text-foreground')} />
                    </div>
                    
                    <span className="text-[14px] tracking-widest uppercase flex-1 truncate">{item.title}</span>
                    
                    {item.badge && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-white text-[10px] font-black tracking-wider shadow-sm">
                        {item.badge}
                      </span>
                    )}
                  </NavLink>
                );
              })}

              {/* PERFIL (using Avatar image) */}
              <button
                onClick={onOpenProfile}
                className="w-full flex items-center gap-4 h-14 transition-all rounded-2xl px-4 relative group border-2 border-transparent text-muted-foreground font-black hover:bg-muted/30 hover:text-foreground text-left"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <img 
                    src="/assets/media__1779561375848.png" 
                    alt="Perfil" 
                    className="w-10 h-10 object-contain transition-transform group-hover:scale-110 opacity-80 grayscale-[30%]" 
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <User className="h-7 w-7 shrink-0 text-muted-foreground/80 group-hover:text-foreground hidden" />
                </div>
                <span className="text-[14px] tracking-widest uppercase flex-1 truncate">PERFIL</span>
              </button>

              {/* NOTIFICAÇÕES */}
              <button
                onClick={onOpenNotifications}
                className="w-full flex items-center gap-4 h-14 transition-all rounded-2xl px-4 relative group border-2 border-transparent text-muted-foreground font-black hover:bg-muted/30 hover:text-foreground text-left"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0 relative">
                  <img 
                    src="/icon-bell.png" 
                    alt="Notificações" 
                    className="w-10 h-10 object-contain transition-transform group-hover:scale-110 opacity-80 grayscale-[30%]" 
                    onError={(e) => {
                      e.currentTarget.style.display = 'none';
                      e.currentTarget.nextElementSibling?.classList.remove('hidden');
                    }}
                  />
                  <Bell className="h-7 w-7 shrink-0 text-muted-foreground/80 group-hover:text-foreground hidden" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-black text-white animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </div>
                <span className="text-[14px] tracking-widest uppercase flex-1 truncate">NOTIFICAÇÕES</span>
              </button>
              
              {/* MAIS */}
              <button
                className="w-full flex items-center gap-4 h-14 transition-all rounded-2xl px-4 relative group border-2 border-transparent text-muted-foreground font-black hover:bg-muted/30 hover:text-foreground text-left"
              >
                <div className="w-10 h-10 flex items-center justify-center shrink-0">
                  <MoreHorizontal className="h-7 w-7 shrink-0 text-muted-foreground/80 group-hover:text-foreground" />
                </div>
                <span className="text-[14px] tracking-widest uppercase flex-1 truncate">MAIS</span>
              </button>

            </nav>
          </div>

        </SidebarContent>
      </Sidebar>
    );
  }

  // Mobile sidebar can stay the same or simply use BottomNavigator. AppLayout already handles BottomNavigator for mobile.
  return null;
}

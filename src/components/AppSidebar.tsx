import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  FolderKanban,
  History,
  LayoutDashboard,
  User,
  Bell,
} from 'lucide-react';

import { useSidebar } from '@/components/ui/sidebar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/contexts/AuthContext';

interface AppSidebarProps {
  onOpenNotifications?: () => void;
}

const menuItems = [
  { title: 'Início', url: '/', icon: LayoutDashboard },
  { title: 'Planos', url: '/plans', icon: FolderKanban },
  { title: 'Estatísticas', url: '/stats', icon: BarChart3 },
  { title: 'Histórico', url: '/history', icon: History },
] as const;

function SidebarBody({
  collapsed,
  isMobile,
  onNavigate,
  onToggle,
  onOpenNotifications,
}: {
  collapsed: boolean;
  isMobile: boolean;
  onNavigate: () => void;
  onToggle: () => void;
  onOpenNotifications?: () => void;
}) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  
  const userName = profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Perfil';
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url;
  
  const logoSrc = isMobile ? '/bora-estudar-mark-new.png' : collapsed ? '/bora-estudar-icon.png' : '/bora-estudar-logo.png';

  return (
    <div className="flex h-full w-full flex-col px-4 pb-4 pt-3">
      <div className={cn('relative px-0.5 pt-0', collapsed && 'px-0 pt-1.5')}>
        <img
          src={logoSrc}
          alt="Bora-Estudar"
          className={cn(
            'block object-contain transition-all duration-200',
            isMobile
              ? 'mx-auto h-auto w-[9rem] max-w-[9rem] opacity-100'
              : collapsed
                ? 'mx-auto h-auto w-[4.25rem] max-w-[4.25rem] opacity-100'
                : 'w-full max-w-[220px]',
          )}
        />

        {isMobile ? null : collapsed ? (
          <button
            type="button"
            onClick={onToggle}
            className="mx-auto mt-3 flex h-[3.25rem] w-14 items-center justify-center rounded-2xl border border-transparent text-white/70 transition-all hover:border-white/8 hover:bg-white/5 hover:text-white"
            aria-label="Expandir sidebar"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/8 bg-white/5 transition-colors">
              <ChevronRight className="h-4.5 w-4.5" />
            </span>
          </button>
        ) : (
          <button
            type="button"
            onClick={onToggle}
            className="absolute right-0 top-4 flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/75 transition-colors hover:bg-white/10 hover:text-white"
            aria-label="Minimizar sidebar"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="mt-2 flex min-h-0 flex-1 flex-col justify-start">
        <p
          className={cn(
            'px-1 pb-3 pt-4 text-[0.65rem] font-black uppercase tracking-[0.35em] text-white/35 transition-opacity',
            collapsed && 'pointer-events-none opacity-0',
          )}
        >
          Visao geral
        </p>

        <nav className={cn('space-y-2 transition-all', collapsed && 'space-y-1')}>
          {menuItems.map((item) => {
            const isActive = location.pathname === item.url || (item.url !== '/' && location.pathname.startsWith(item.url));
            const Icon = item.icon;

            return (
              <NavLink
                key={item.title}
                to={item.url}
                end={item.url === '/'}
                onClick={onNavigate}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all',
                  collapsed && 'justify-center px-0 py-3',
                  isActive
                    ? 'border-emerald-400/20 bg-emerald-400/12 text-white shadow-[0_10px_30px_rgba(34,197,94,0.12)]'
                    : 'border-transparent text-white/60 hover:border-white/8 hover:bg-white/5 hover:text-white',
                )}
              >
                <span
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors',
                    isActive
                      ? 'border-emerald-400/20 bg-emerald-400/15 text-emerald-300'
                      : 'border-white/8 bg-white/5 text-white/70',
                  )}
                >
                  <Icon className="h-4.5 w-4.5" />
                </span>

                <span className={cn('flex-1 text-sm font-bold tracking-wide', collapsed && 'hidden')}>
                  {item.title}
                </span>
              </NavLink>
            );
          })}

          <button
            type="button"
            onClick={() => {
              if (onOpenNotifications) {
                onOpenNotifications();
                onNavigate();
              }
            }}
            className={cn(
              'w-full flex items-center gap-3 rounded-2xl border px-4 py-3 transition-all',
              collapsed && 'justify-center px-0 py-3',
              'border-transparent text-white/60 hover:border-white/8 hover:bg-white/5 hover:text-white',
            )}
          >
            <span
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl border transition-colors',
                'border-white/8 bg-white/5 text-white/70',
              )}
            >
              <Bell className="h-4.5 w-4.5" />
            </span>
            <span className={cn('flex-1 text-left text-sm font-bold tracking-wide', collapsed && 'hidden')}>
              Notificações
            </span>
          </button>
        </nav>

        <div className="mt-auto pt-6">
          <p
            className={cn(
              'px-1 pb-2 text-[0.65rem] font-black uppercase tracking-[0.35em] text-white/35 transition-opacity',
              collapsed && 'pointer-events-none opacity-0',
            )}
          >
            Conta
          </p>

          <button
            type="button"
            onClick={() => {
              onNavigate();
              navigate('/profile');
            }}
            className={cn(
              'flex w-full items-center gap-3 rounded-2xl border border-white/8 bg-white/5 px-4 py-3 text-left text-white/78 transition-all hover:border-white/12 hover:bg-white/8',
              collapsed && 'justify-center px-0',
            )}
          >
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={userName}
                className="h-9 w-9 rounded-xl object-cover border border-white/10 flex-shrink-0"
              />
            ) : (
              <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-white/8 text-white">
                <User className="h-4.5 w-4.5" />
              </span>
            )}
            <span className={cn('flex-1 overflow-hidden', collapsed && 'hidden')}>
              <span className="block text-sm font-bold text-white truncate">{userName}</span>
              <span className="block text-xs text-white/45">Ajustes e avatar</span>
            </span>
            <ArrowRight className={cn('h-4 w-4 flex-shrink-0 text-white/45', collapsed && 'hidden')} />
          </button>
        </div>
      </div>
    </div>
  );
}

export function AppSidebar({ onOpenNotifications }: AppSidebarProps) {
  const { isMobile, state, toggleSidebar, openMobile, setOpenMobile } = useSidebar();
  const isCollapsed = state === 'collapsed';

  if (isMobile) {
    return (
      <Sheet open={openMobile} onOpenChange={setOpenMobile}>
        <SheetContent
          side="right"
          className="w-[19rem] max-w-none border-r-0 bg-[#0d1710] p-0 text-white [&>button]:right-3 [&>button]:top-3 [&>button]:border [&>button]:border-white/10 [&>button]:bg-white/5 [&>button]:text-white/80"
        >
          <SidebarBody
            collapsed={false}
            isMobile
            onNavigate={() => setOpenMobile(false)}
            onToggle={() => setOpenMobile((value) => !value)}
            onOpenNotifications={onOpenNotifications}
          />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        'hidden md:flex h-full flex-none overflow-hidden bg-transparent text-white transition-[width] duration-200 ease-linear relative z-10',
        isCollapsed ? 'w-[5.5rem]' : 'w-[19rem]',
      )}
    >
      <SidebarBody
        collapsed={isCollapsed}
        isMobile={false}
        onNavigate={() => {}}
        onToggle={toggleSidebar}
        onOpenNotifications={onOpenNotifications}
      />
    </aside>
  );
}

import { NavLink, useLocation } from 'react-router-dom';
import { BarChart3, Home, FolderKanban, Play, UserRound } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export function BottomNavigator({
  onOpenProfile,
  isProfileOpen = false,
}: {
  onOpenProfile?: () => void;
  isProfileOpen?: boolean;
}) {
  const { pathname } = useLocation();

  const isActive = (url: string) => (url === '/' ? pathname === '/' : pathname.startsWith(url));

  const NavItem = ({ url, icon: Icon, label, onClick, isForcedActive }: any) => {
    const active = isForcedActive !== undefined ? isForcedActive : isActive(url);
    
    return (
      <NavLink 
        to={url} 
        end={url === '/'} 
        className="shrink-0 outline-none"
        onClick={(e) => { if(onClick) { e.preventDefault(); onClick(); } }}
        aria-label={label}
      >
        <motion.div 
          layout
          initial={false}
          animate={{
            backgroundColor: active ? 'hsl(var(--primary) / 0.1)' : 'transparent',
            borderColor: active ? 'hsl(var(--primary) / 0.2)' : 'transparent',
            width: active ? 'auto' : '48px',
            paddingLeft: active ? '4px' : '4px',
            paddingRight: active ? '16px' : '4px',
          }}
          transition={{ type: "spring", stiffness: 500, damping: 35 }}
          className="flex h-12 items-center rounded-[16px] border border-transparent overflow-hidden"
        >
          <motion.div layout className="flex items-center gap-3">
            <div 
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] transition-colors duration-300",
                active 
                  ? "bg-primary text-primary-foreground" 
                  : "border border-border/50 text-muted-foreground bg-background/50 hover:bg-secondary/50 hover:text-foreground"
              )}
            >
              <Icon strokeWidth={active ? 2.5 : 2} size={20} />
            </div>
            <AnimatePresence initial={false} mode="popLayout">
              {active && (
                <motion.span 
                  initial={{ opacity: 0, width: 0, scale: 0.8 }}
                  animate={{ opacity: 1, width: 'auto', scale: 1 }}
                  exit={{ opacity: 0, width: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  className="text-[13px] font-bold text-foreground tracking-tight whitespace-nowrap"
                >
                  {label}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.div>
        </motion.div>
      </NavLink>
    );
  };

  const isFullWidthMode = pathname === '/plans/new' || pathname === '/profile/goals' || pathname === '/profile/data';

  return (
    <nav className={cn(
      "fixed inset-x-0 z-40 md:hidden",
      isFullWidthMode 
        ? "bottom-0 bg-background/95 backdrop-blur-xl border-t border-border/50 shadow-[0_-4px_24px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]"
        : "bottom-6 flex justify-center px-4 pointer-events-none"
    )}>
      <div className={cn(
        "flex items-center",
        isFullWidthMode 
          ? "h-[72px] justify-around px-2"
          : "h-16 gap-1.5 rounded-2xl bg-card/95 backdrop-blur-xl border border-border/50 p-2 shadow-lg pointer-events-auto"
      )}>
        <NavItem url="/" icon={Home} label="Início" />
        <NavItem url="/plans" icon={FolderKanban} label="Planos" />
        <NavItem url="/timer" icon={Play} label="Timer" />
        <NavItem url="/stats" icon={BarChart3} label="Resumo" />
        <NavItem url="/profile" icon={UserRound} label="Perfil" />
      </div>
    </nav>
  );
}

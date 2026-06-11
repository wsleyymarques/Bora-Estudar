import { NavLink, useLocation } from 'react-router-dom';
import { BarChart3, Home, Layers, Play, UserRound } from 'lucide-react';
import { motion } from 'framer-motion';

const itemClass =
  'group relative flex h-full w-full min-w-0 flex-col items-center justify-center gap-1 text-[10px] font-bold tracking-wide transition-all';

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
        className={itemClass} 
        onClick={(e) => { if(onClick) { e.preventDefault(); onClick(); } }}
        aria-label={label}
      >
        <div className="relative flex items-center justify-center px-4 py-1.5">
          {active && (
            <motion.div
              layoutId="bottom-nav-active-pill"
              className="absolute inset-0 rounded-full bg-primary/15 dark:bg-primary/20"
              transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            />
          )}
          <Icon 
            className={`relative z-10 transition-transform duration-300 ${active ? 'text-primary scale-110' : 'text-muted-foreground group-hover:text-foreground group-hover:scale-105'}`} 
            strokeWidth={active ? 2.5 : 2.2} 
            size={24}
          />
        </div>
      </NavLink>
    );
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 md:hidden">
      {/* Container com máscara para fazer o 'cutout' (furo) no centro */}
      <div 
        className="absolute inset-x-0 bottom-0 h-[72px] bg-background/95 backdrop-blur-xl shadow-[0_-10px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_-10px_40px_rgba(0,0,0,0.3)]"
        style={{
          borderTopLeftRadius: '28px',
          borderTopRightRadius: '28px',
          maskImage: 'radial-gradient(circle at 50% -16px, transparent 44px, black 45px)',
          WebkitMaskImage: 'radial-gradient(circle at 50% -16px, transparent 44px, black 45px)'
        }}
      />

      {/* Grid dos itens */}
      <div className="relative grid h-[72px] w-full grid-cols-5 items-center px-2 pb-[env(safe-area-inset-bottom)]">
        <NavItem url="/" icon={Home} label="Início" />
        <NavItem url="/plans" icon={Layers} label="Planos" />

        {/* Botão Central Flutuante */}
        <div className="relative z-[80] flex items-start justify-center h-full">
          <NavLink
            to="/timer"
            className="group relative flex h-[60px] w-[60px] items-center justify-center rounded-full bg-primary shadow-[0_8px_24px_rgba(var(--primary),0.6)] transition-all active:scale-90 hover:scale-105"
            style={{ marginTop: -26 }}
            aria-label="Timer"
          >
             <div className="absolute inset-0 rounded-full bg-white/20 opacity-0 transition-opacity group-hover:opacity-100" />
            <Play
              className="translate-x-[2px] text-primary-foreground"
              size={28}
              strokeWidth={2.5}
              fill="currentColor"
            />
          </NavLink>
        </div>

        <NavItem url="/stats" icon={BarChart3} label="Resumo" />
        <NavItem url="/profile" icon={UserRound} label="Perfil" onClick={onOpenProfile} isForcedActive={isProfileOpen || isActive('/profile')} />
      </div>
    </nav>
  );
}

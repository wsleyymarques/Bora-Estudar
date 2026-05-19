import React from 'react';
import { BookOpen, Calendar, House, Settings, Timer } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { cn } from '@/lib/utils';

interface BottomBarItem {
  label: string;
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
  center?: boolean;
}

const ITEMS: BottomBarItem[] = [
  { label: 'Inicio', to: '/', icon: House, end: true },
  { label: 'Materias', to: '/subjects', icon: BookOpen },
  { label: 'Cronograma', to: '/schedule', icon: Calendar, center: true },
  { label: 'Timer', to: '/timer', icon: Timer },
  { label: 'Config', to: '/settings', icon: Settings },
];

export function MobileBottomBar() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 px-3 pt-2 pb-[calc(env(safe-area-inset-bottom)+0.5rem)] md:hidden"
      aria-label="Navegacao principal mobile"
    >
      <div className="mx-auto w-full max-w-lg rounded-3xl border border-border/70 bg-background/95 shadow-[0_16px_40px_hsl(var(--foreground)/0.18)] backdrop-blur-md">
        <div className="grid grid-cols-5 items-end gap-1 px-2 py-2">
          {ITEMS.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                title={item.label}
                aria-label={item.label}
                className={cn(
                  'relative flex min-w-0 flex-col items-center justify-end gap-1 rounded-xl py-1 text-[10px] font-medium text-muted-foreground transition-colors',
                  item.center && '-mt-6',
                )}
                activeClassName="text-foreground"
              >
                <span
                  className={cn(
                    'flex items-center justify-center rounded-full border border-border/70 bg-card/90',
                    item.center ? 'h-12 w-12' : 'h-9 w-9',
                  )}
                >
                  <Icon className={cn(item.center ? 'h-5 w-5' : 'h-4 w-4')} />
                </span>
                <span className="truncate text-[10px] leading-none">{item.label}</span>
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}


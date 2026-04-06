import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NavLink } from '@/components/NavLink';

export interface AppSidebarNavItem {
  title: string;
  url: string;
  icon: LucideIcon;
  end?: boolean;
}

interface AppSidebarNavSectionProps {
  label?: string;
  items: AppSidebarNavItem[];
  collapsed: boolean;
  className?: string;
}

export function AppSidebarNavSection({
  label,
  items,
  collapsed,
  className,
}: AppSidebarNavSectionProps) {
  return (
    <div className={cn(className)}>
      {!collapsed && label ? (
        <p className="mt-5 px-2 text-[11px] font-semibold uppercase tracking-[0.09em] text-sidebar-foreground/62">
          {label}
        </p>
      ) : null}

      <nav className={cn('mt-2 flex w-full flex-col', collapsed ? 'items-center gap-2' : 'gap-1.5')}>
        {items.map((item) => (
          <NavLink
            key={item.title}
            to={item.url}
            end={item.end ?? item.url === '/'}
            title={item.title}
            aria-label={item.title}
            className={cn(
              'transition-colors',
              collapsed
                ? 'h-11 w-11 rounded-2xl flex items-center justify-center'
                : 'h-11 w-full rounded-xl px-3 flex items-center gap-3',
              'text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent',
            )}
            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground shadow-sm"
          >
            <item.icon className={cn('h-4 w-4 shrink-0', !collapsed && 'h-4.5 w-4.5')} />
            {!collapsed && <span className="text-[15px] font-medium truncate">{item.title}</span>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}


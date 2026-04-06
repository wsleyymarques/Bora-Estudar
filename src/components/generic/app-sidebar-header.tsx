import React from 'react';
import { cn } from '@/lib/utils';

interface AppSidebarHeaderProps {
  collapsed: boolean;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  className?: string;
}

export function AppSidebarHeader({
  collapsed,
  title,
  subtitle,
  icon,
  className,
}: AppSidebarHeaderProps) {
  return (
    <div className={cn('flex items-center w-full', collapsed ? 'justify-center' : 'justify-start', className)}>
      <div className={cn('flex items-center min-w-0', collapsed ? 'justify-center' : 'gap-3 px-1')}>
        <div className="h-11 w-11 rounded-2xl border border-sidebar-border/75 bg-sidebar-accent/55 flex items-center justify-center shrink-0">
          {icon}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="font-display font-bold text-sidebar-foreground text-base leading-none">{title}</p>
            {subtitle ? <p className="text-[11px] text-sidebar-foreground/68 mt-1 truncate">{subtitle}</p> : null}
          </div>
        )}
      </div>
    </div>
  );
}


import React from 'react';

interface PageHeaderProps {
  title: string;
  description: string;
  badgeText: string;
  badgeIcon: React.ElementType;
  action?: React.ReactNode;
}

export function PageHeader({ title, description, badgeText, badgeIcon: BadgeIcon, action }: PageHeaderProps) {
  return (
    <section className="overflow-hidden rounded-3xl sm:rounded-[2rem] border border-border/60 bg-background/80 shadow-[0_18px_60px_-35px_rgba(0,0,0,0.35)] backdrop-blur-sm">
      <div className="flex flex-col gap-2.5 sm:gap-4 px-4 py-4 sm:px-6 sm:py-6 lg:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-2xl space-y-2.5">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-2.5 py-1 sm:px-3 sm:py-1 text-[10px] sm:text-[11px] font-medium text-muted-foreground shadow-sm">
            <BadgeIcon className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-primary" />
            {badgeText}
          </div>
          <div className="space-y-0.5 sm:space-y-1">
            <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground md:text-3xl">{title}</h1>
            <p className="max-w-2xl text-xs text-muted-foreground sm:text-sm">
              {description}
            </p>
          </div>
        </div>

        {action && (
          <div className="shrink-0">
            {action}
          </div>
        )}
      </div>
    </section>
  );
}

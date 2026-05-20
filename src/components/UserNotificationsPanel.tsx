import React from 'react';
import { Bell, X } from 'lucide-react';
import { ResponsivePanel } from '@/components/generic/ResponsivePanel';
import { useNotifications } from '@/contexts/NotificationContext';
import { cn } from '@/lib/utils';

interface UserNotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserNotificationsPanel({ isOpen, onClose }: UserNotificationsPanelProps) {
  const { 
    notifications, 
    unreadCount, 
    markAllAsRead, 
    clearNotifications 
  } = useNotifications();

  React.useEffect(() => {
    if (isOpen) {
      markAllAsRead();
    }
  }, [isOpen, markAllAsRead]);

  return (
    <ResponsivePanel 
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()}
      size="md"
      title="Notificações"
      unstyled
    >
      <div className="flex flex-col h-full bg-background relative overflow-hidden">
        {/* DECORATIVE BACKGROUND AURA */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent pointer-events-none" />

        {/* HEADER */}
        <div className="flex items-center gap-3 p-5 border-b border-border/80 bg-card z-10">
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none"
            aria-label="Fechar"
          >
            <X className="w-4 h-4 stroke-[2.5]" />
          </button>
          <h3 className="font-display font-black text-xs text-foreground uppercase tracking-widest">
            Notificações
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 pb-8 custom-scrollbar z-10">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-zinc-550">Suas Notificações</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <div className="h-5 px-2 rounded-full bg-primary/10 text-primary text-[9px] font-black flex items-center justify-center uppercase">
                  {unreadCount} Novas
                </div>
              )}
              {notifications.length > 0 && (
                <button 
                  onClick={clearNotifications}
                  className="text-[9px] font-black text-slate-400 hover:text-slate-650 dark:text-zinc-500 dark:hover:text-zinc-300 transition-colors uppercase tracking-wider"
                >
                  Limpar tudo
                </button>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center p-8 border-2 border-dashed border-slate-200/60 dark:border-zinc-800/80 rounded-[1.5rem] bg-white/50 dark:bg-zinc-900/50">
                <Bell className="w-8 h-8 mx-auto text-slate-350 dark:text-zinc-700 stroke-[1.5]" />
                <p className="text-xs font-semibold text-slate-400 dark:text-zinc-500 mt-2">Nenhuma notificação no momento.</p>
              </div>
            ) : (
              notifications.map((n) => {
                let colorClass = 'text-blue-500';
                let bgClass = 'bg-blue-500/10';
                if (n.type === 'success') {
                  colorClass = 'text-green-500';
                  bgClass = 'bg-green-500/10';
                } else if (n.type === 'warning') {
                  colorClass = 'text-amber-500';
                  bgClass = 'bg-amber-500/10';
                } else if (n.type === 'error') {
                  colorClass = 'text-rose-500';
                  bgClass = 'bg-rose-500/10';
                }

                return (
                  <div key={n.id} className="relative group overflow-hidden p-4 rounded-[1.5rem] bg-white dark:bg-zinc-900 border border-white dark:border-zinc-800 shadow-sm hover:shadow-md transition-all">
                    <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", bgClass.replace('/10', ''))} />
                    <div className="flex gap-4">
                      <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner", bgClass)}>
                        <Bell className={cn("w-5 h-5", colorClass)} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start">
                          <h4 className="text-sm font-black text-slate-800 dark:text-foreground leading-none">{n.title}</h4>
                          <span className="text-[9px] font-bold text-slate-450 dark:text-zinc-550 uppercase">{n.time}</span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-zinc-400 mt-1.5 leading-snug line-clamp-2">{n.description}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 0px;
        }
      `}} />
    </ResponsivePanel>
  );
}

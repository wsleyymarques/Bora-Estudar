import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { sendNotification as nativeSendNotification, getNotificationPermissionState, requestNotificationPermission as nativeRequestPermission } from '@/lib/notifications';
import { toast } from 'sonner';

export interface AppNotification {
  id: string;
  title: string;
  description: string;
  time: string;
  timestamp: number;
  read: boolean;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface NotificationContextType {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (title: string, description: string, type?: 'info' | 'success' | 'warning' | 'error') => void;
  markAllAsRead: () => void;
  clearNotifications: () => void;
  notificationPermission: NotificationPermission;
  requestPermission: () => Promise<boolean>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationPermission, setNotificationPermission] = useState<NotificationPermission>(() => 
    getNotificationPermissionState()
  );

  // Load from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('study_flow_notifications');
    if (saved) {
      try {
        setNotifications(JSON.parse(saved));
      } catch (e) {
        console.error('Error loading notifications', e);
      }
    }
  }, []);

  // Save to localStorage when notifications change
  const saveNotifications = (items: AppNotification[]) => {
    setNotifications(items);
    localStorage.setItem('study_flow_notifications', JSON.stringify(items));
  };

  const addNotification = useCallback((
    title: string, 
    description: string, 
    type: 'info' | 'success' | 'warning' | 'error' = 'info'
  ) => {
    const newNotif: AppNotification = {
      id: crypto.randomUUID(),
      title,
      description,
      time: 'Agora',
      timestamp: Date.now(),
      read: false,
      type,
    };

    setNotifications(prev => {
      const next = [newNotif, ...prev];
      localStorage.setItem('study_flow_notifications', JSON.stringify(next));
      return next;
    });

    // Send push notification
    nativeSendNotification(title, {
      body: description,
      icon: '/studei-icon-192.png',
    });

    // Also show toast
    if (type === 'success') {
      toast.success(`${title}: ${description}`);
    } else if (type === 'error') {
      toast.error(`${title}: ${description}`);
    } else {
      toast(`${title}: ${description}`);
    }
  }, []);

  const markAllAsRead = useCallback(() => {
    setNotifications(prev => {
      const next = prev.map(n => ({ ...n, read: true }));
      localStorage.setItem('study_flow_notifications', JSON.stringify(next));
      return next;
    });
  }, []);

  const clearNotifications = useCallback(() => {
    saveNotifications([]);
  }, []);

  const requestPermission = useCallback(async () => {
    const granted = await nativeRequestPermission();
    const state = granted ? 'granted' as const : 'denied' as const;
    setNotificationPermission(state);
    return granted;
  }, []);

  // Daemon check for scheduled reminders (e.g. entry-level alerts)
  useEffect(() => {
    const checkScheduledReminders = () => {
      const savedReminders = localStorage.getItem('scheduled_reminders');
      if (!savedReminders) return;

      try {
        const reminders = JSON.parse(savedReminders);
        const now = new Date();
        
        // Local YYYY-MM-DD
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const todayDate = `${year}-${month}-${day}`;

        // Local HH:MM
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const currentTime = `${hours}:${minutes}`;

        let changed = false;
        const updatedReminders = reminders.map((reminder: any) => {
          if (
            reminder.date === todayDate &&
            reminder.time <= currentTime &&
            !reminder.triggered
          ) {
            // Trigger!
            addNotification(
              reminder.title || 'Hora de Estudar! 📚',
              reminder.body || `Lembrete para estudar ${reminder.subjectName || ''}`,
              'info'
            );
            changed = true;
            return { ...reminder, triggered: true };
          }
          return reminder;
        });

        if (changed) {
          localStorage.setItem('scheduled_reminders', JSON.stringify(updatedReminders));
        }
      } catch (e) {
        console.error('Error checking scheduled reminders:', e);
      }
    };

    // Initial check and 30-sec loop
    checkScheduledReminders();
    const intervalId = setInterval(checkScheduledReminders, 30000);
    return () => clearInterval(intervalId);
  }, [addNotification]);

  // Helper to format/update time label (e.g. "Agora", "há 5m")
  useEffect(() => {
    const interval = setInterval(() => {
      setNotifications(prev => {
        let changed = false;
        const next = prev.map(n => {
          const diffMs = Date.now() - n.timestamp;
          const diffMin = Math.floor(diffMs / 60000);
          let newTime = n.time;
          if (diffMin < 1) {
            newTime = 'Agora';
          } else if (diffMin < 60) {
            newTime = `há ${diffMin}m`;
          } else {
            const diffHours = Math.floor(diffMin / 60);
            if (diffHours < 24) {
              newTime = `há ${diffHours}h`;
            } else {
              const diffDays = Math.floor(diffHours / 24);
              newTime = `há ${diffDays}d`;
            }
          }
          if (newTime !== n.time) {
            changed = true;
            return { ...n, time: newTime };
          }
          return n;
        });
        if (changed) {
          localStorage.setItem('study_flow_notifications', JSON.stringify(next));
          return next;
        }
        return prev;
      });
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        addNotification,
        markAllAsRead,
        clearNotifications,
        notificationPermission,
        requestPermission,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    return {
      notifications: [],
      unreadCount: 0,
      addNotification: (title: string, description: string, type?: 'info' | 'success' | 'warning' | 'error') => {
        console.log('Dummy Notification:', title, description, type);
      },
      markAllAsRead: () => {},
      clearNotifications: () => {},
      notificationPermission: 'default' as NotificationPermission,
      requestPermission: async () => false,
    };
  }
  return context;
}

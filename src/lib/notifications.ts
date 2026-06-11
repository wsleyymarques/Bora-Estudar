export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    console.warn('Este navegador não suporta notificações desktop.');
    return false;
  }
  
  if (Notification.permission === 'granted') {
    return true;
  }
  
  try {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  } catch (error) {
    console.error('Erro ao solicitar permissão para notificações:', error);
    return false;
  }
}

export function sendNotification(title: string, options?: NotificationOptions) {
  if (typeof window === 'undefined' || !('Notification' in window)) return null;
  
  if (Notification.permission === 'granted') {
    try {
      const iconUrl = `${window.location.origin}/bora-estudar-icon.png`;
      return new Notification(title, {
        icon: iconUrl,
        badge: iconUrl,
        ...options,
      });
    } catch (error) {
      console.error('Erro ao enviar notificação:', error);
      return null;
    }
  }
  
  return null;
}

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermissionState(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'default';
  }
  return Notification.permission;
}

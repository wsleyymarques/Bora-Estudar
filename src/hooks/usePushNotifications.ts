import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Fallback VAPID public key if VITE_VAPID_PUBLIC_KEY is not defined in env
const DEFAULT_VAPID_PUBLIC_KEY = 'BEl62OhAdrn1R958cb85OipWmqSmet57Ittm0Kz8m8RQD0pH7_C_Z3yC7v7z8x1k_KxYn2G6Z1bE2_G1vE8m1b4';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function usePushNotifications() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check support on mount
  useEffect(() => {
    const isSupported = 
      'serviceWorker' in navigator && 
      'PushManager' in window && 
      'Notification' in window;
    
    setSupported(isSupported);

    if (isSupported) {
      setPermission(Notification.permission);
      checkActiveSubscription();
    } else {
      setLoading(false);
    }
  }, []);

  const checkActiveSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setSubscribed(!!subscription);
    } catch (err) {
      console.warn('Erro ao verificar inscrição ativa:', err);
    } finally {
      setLoading(false);
    }
  };

  const subscribe = useCallback(async () => {
    if (!supported) {
      toast.error('Notificações Push não são suportadas neste navegador.');
      return false;
    }

    setLoading(true);
    try {
      // 1. Request permission
      const userPermission = await Notification.requestPermission();
      setPermission(userPermission);

      if (userPermission !== 'granted') {
        toast.error('Permissão de notificação negada pelo usuário.');
        setLoading(false);
        return false;
      }

      // 2. Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // 3. Subscribe to push manager
      const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY;
      const subscribeOptions = {
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      };

      const subscription = await registration.pushManager.subscribe(subscribeOptions);
      setSubscribed(true);

      // 4. Save to Supabase
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const subJson = subscription.toJSON();
        
        try {
          const { error } = await supabase
            .from('push_subscriptions')
            .upsert({
              user_id: user.id,
              endpoint: subJson.endpoint,
              p256dh: subJson.keys?.p256dh || '',
              auth: subJson.keys?.auth || '',
              device_info: {
                userAgent: navigator.userAgent,
                language: navigator.language,
                platform: (navigator as any).userAgentData?.platform || navigator.platform,
              },
              updated_at: new Date().toISOString()
            }, {
              onConflict: 'endpoint'
            });

          if (error) {
            // Check if table missing error code or message
            if (error.message?.includes('relation "public.push_subscriptions" does not exist') || error.code === '42P01') {
              console.warn('Tabela push_subscriptions não existe no banco de dados. Salvando inscrição localmente.');
              toast.warning('Aviso: As notificações foram ativadas localmente (tabela de push ausente no banco).');
            } else {
              throw error;
            }
          } else {
            toast.success('Dispositivo inscrito para notificações push!');
          }
        } catch (dbErr: any) {
          console.warn('Erro ao salvar no banco (Supabase fallback):', dbErr);
          toast.warning('Notificações ativadas localmente (modo demonstração).');
        }
      }

      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Erro ao inscrever usuário:', err);
      toast.error(`Falha ao ativar notificações: ${err.message || err}`);
      setLoading(false);
      return false;
    }
  }, [supported]);

  const unsubscribe = useCallback(async () => {
    if (!supported) return false;

    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        // Delete subscription from Supabase first
        const endpoint = subscription.endpoint;
        const { data: { user } } = await supabase.auth.getUser();

        if (user) {
          try {
            const { error } = await supabase
              .from('push_subscriptions')
              .delete()
              .eq('endpoint', endpoint)
              .eq('user_id', user.id);

            if (error && error.code !== '42P01') {
              throw error;
            }
          } catch (dbErr) {
            console.warn('Erro ao remover inscrição do banco:', dbErr);
          }
        }

        // Unsubscribe from browser push manager
        await subscription.unsubscribe();
      }

      setSubscribed(false);
      toast.success('Notificações desativadas para este aparelho.');
      setLoading(false);
      return true;
    } catch (err: any) {
      console.error('Erro ao desinscrever:', err);
      toast.error('Falha ao desativar notificações.');
      setLoading(false);
      return false;
    }
  }, [supported]);

  const triggerLocalTest = useCallback(async () => {
    if (!supported || permission !== 'granted') {
      toast.error('Por favor, ative as notificações primeiro.');
      return;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      // Delay it by 2 seconds so user can lock screen or switch apps to test
      toast.info('Disparando notificação de teste em 3 segundos...');
      
      setTimeout(() => {
        registration.showNotification('Teste de Notificação! ⚡', {
          body: 'Parabéns, seu sistema de notificações push está funcionando perfeitamente.',
          icon: '/studei-icon-192.png',
          badge: '/pwa-icon.svg',
          vibrate: [100, 50, 100],
          data: {
            url: window.location.pathname
          }
        });
      }, 3000);
    } catch (err) {
      console.error('Erro ao enviar notificação de teste:', err);
    }
  }, [supported, permission]);

  return {
    supported,
    permission,
    subscribed,
    loading,
    subscribe,
    unsubscribe,
    triggerLocalTest,
  };
}

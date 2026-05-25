import React, { useState, useEffect } from 'react';
import { Bell, BellOff, Clock, Loader2, Plus, Trash2, ShieldAlert, Sparkles, Check, Info } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePushNotifications } from '@/hooks/usePushNotifications';

interface NotificationSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  subjectName: string;
  subjectColor: string;
}

interface SubjectNotificationConfig {
  id?: string;
  enabled: boolean;
  has_fixed_schedule: boolean;
  custom_reminder_times: string[];
}

export function NotificationSettingsModal({
  open,
  onOpenChange,
  subjectId,
  subjectName,
  subjectColor,
}: NotificationSettingsModalProps) {
  const {
    supported: pushSupported,
    permission: pushPermission,
    subscribed: pushSubscribed,
    loading: pushLoading,
    subscribe: subscribePush,
    unsubscribe: unsubscribePush,
    triggerLocalTest,
  } = usePushNotifications();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState<SubjectNotificationConfig>({
    enabled: true,
    has_fixed_schedule: false,
    custom_reminder_times: [],
  });

  const [newTime, setNewTime] = useState('14:00');
  const [usingFallback, setUsingFallback] = useState(false);

  // Load subject notifications configuration on mount/open
  useEffect(() => {
    if (open && subjectId) {
      loadConfig();
    }
  }, [open, subjectId]);

  const loadConfig = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('subject_notifications')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        if (error.code === '42P01' || error.message?.includes('relation "public.subject_notifications" does not exist')) {
          setUsingFallback(true);
          loadLocalConfig();
          return;
        }
        throw error;
      }

      if (data) {
        setConfig({
          id: data.id,
          enabled: data.enabled,
          has_fixed_schedule: data.has_fixed_schedule,
          custom_reminder_times: data.custom_reminder_times || [],
        });
      } else {
        // Fallback default config
        setConfig({
          enabled: true,
          has_fixed_schedule: false,
          custom_reminder_times: [],
        });
      }
    } catch (err) {
      console.warn('Erro ao carregar configurações de alertas. Usando fallback local:', err);
      setUsingFallback(true);
      loadLocalConfig();
    } finally {
      setLoading(false);
    }
  };

  const loadLocalConfig = () => {
    const key = `local_subject_notification_${subjectId}`;
    const localData = localStorage.getItem(key);
    if (localData) {
      try {
        setConfig(JSON.parse(localData));
      } catch {
        // Clear corrupt item
        localStorage.removeItem(key);
      }
    } else {
      setConfig({
        enabled: true,
        has_fixed_schedule: false,
        custom_reminder_times: [],
      });
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Usuário não autenticado.');
        setSaving(false);
        return;
      }

      if (usingFallback) {
        const key = `local_subject_notification_${subjectId}`;
        localStorage.setItem(key, JSON.stringify(config));
        toast.success('Configurações salvas localmente.');
        onOpenChange(false);
        setSaving(false);
        return;
      }

      const { error } = await supabase
        .from('subject_notifications')
        .upsert({
          user_id: user.id,
          subject_id: subjectId,
          enabled: config.enabled,
          has_fixed_schedule: config.has_fixed_schedule,
          custom_reminder_times: config.custom_reminder_times,
          updated_at: new Date().toISOString(),
        }, {
          onConflict: 'user_id,subject_id'
        });

      if (error) {
        if (error.code === '42P01' || error.message?.includes('relation "public.subject_notifications" does not exist')) {
          setUsingFallback(true);
          const key = `local_subject_notification_${subjectId}`;
          localStorage.setItem(key, JSON.stringify(config));
          toast.success('Salvo localmente (tabela de alertas ausente).');
          onOpenChange(false);
        } else {
          throw error;
        }
      } else {
        toast.success('Configurações de alerta salvas com sucesso!');
        onOpenChange(false);
      }
    } catch (err: any) {
      console.error('Erro ao salvar configurações de alerta:', err);
      toast.error(`Falha ao salvar configurações: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  const addCustomTime = () => {
    if (!newTime) return;
    if (config.custom_reminder_times.includes(newTime)) {
      toast.info('Este horário já está adicionado.');
      return;
    }
    const updatedTimes = [...config.custom_reminder_times, newTime].sort();
    setConfig(prev => ({ ...prev, custom_reminder_times: updatedTimes }));
  };

  const removeCustomTime = (timeToRemove: string) => {
    const updatedTimes = config.custom_reminder_times.filter(t => t !== timeToRemove);
    setConfig(prev => ({ ...prev, custom_reminder_times: updatedTimes }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-3xl border border-border/40 bg-background/95 backdrop-blur-md max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: subjectColor }} />
            <DialogTitle className="text-xl font-bold tracking-tight">{subjectName}</DialogTitle>
          </div>
          <DialogDescription className="text-xs text-muted-foreground font-semibold">
            Configure regras personalizadas de notificação para esta matéria.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6 py-2 text-foreground">
            {/* DEVICE NOTIFICATION STATUS BAR */}
            <div className="rounded-2xl border border-border/60 bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-muted-foreground">Status do Aparelho:</span>
                {!pushSupported ? (
                  <span className="text-destructive flex items-center gap-1"><ShieldAlert className="h-3.5 w-3.5" /> Não suportado</span>
                ) : pushPermission === 'denied' ? (
                  <span className="text-destructive flex items-center gap-1"><BellOff className="h-3.5 w-3.5" /> Negado pelo browser</span>
                ) : pushSubscribed ? (
                  <span className="text-primary flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Ativo</span>
                ) : (
                  <span className="text-warning flex items-center gap-1"><Info className="h-3.5 w-3.5" /> Inativo</span>
                )}
              </div>

              {pushSupported && (
                <div className="flex flex-col sm:flex-row gap-2">
                  {!pushSubscribed ? (
                    <Button 
                      size="sm" 
                      onClick={subscribePush}
                      disabled={pushLoading}
                      className="w-full text-xs font-bold rounded-xl h-9"
                    >
                      {pushLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Bell className="h-3.5 w-3.5 mr-1.5" />}
                      Ativar Notificações no Dispositivo
                    </Button>
                  ) : (
                    <>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={triggerLocalTest}
                        className="w-full text-xs font-bold rounded-xl h-9"
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
                        Testar Notificação
                      </Button>
                      <Button 
                        size="sm" 
                        variant="ghost"
                        onClick={unsubscribePush}
                        disabled={pushLoading}
                        className="w-full text-xs font-bold rounded-xl h-9 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                      >
                        Desativar Notificação
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* MAIN ALERTS SWITCH */}
            <div className="flex items-center justify-between gap-4 p-4 border border-border/40 rounded-2xl bg-card">
              <div className="space-y-0.5">
                <Label htmlFor="subject-notifications-enabled" className="font-bold text-sm">Alertas para esta matéria</Label>
                <p className="text-xs text-muted-foreground">Habilitar ou desabilitar todos os lembretes desta disciplina.</p>
              </div>
              <Switch
                id="subject-notifications-enabled"
                checked={config.enabled}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
              />
            </div>

            {config.enabled && (
              <div className="space-y-4 animate-in fade-in duration-300">
                {/* ALERTS MODE: FIXED vs CUSTOM */}
                <div className="flex items-center justify-between gap-4 p-4 border border-border/40 rounded-2xl bg-card">
                  <div className="space-y-0.5">
                    <Label htmlFor="subject-schedule-mode" className="font-bold text-sm">Possui horário fixo?</Label>
                    <p className="text-xs text-muted-foreground">Ative se esta matéria possui horários específicos de estudo no seu cronograma.</p>
                  </div>
                  <Switch
                    id="subject-schedule-mode"
                    checked={config.has_fixed_schedule}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, has_fixed_schedule: checked }))}
                  />
                </div>

                {config.has_fixed_schedule ? (
                  /* FIXED SCHEDULE DETAILS */
                  <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 flex gap-3 text-xs text-primary font-medium">
                    <Clock className="h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-bold mb-0.5">Notificações automáticas inteligentes ativas!</p>
                      <p className="text-primary/80">O app enviará lembretes 10 minutos antes do início programado de cada aula e na hora exata em que ela deve começar.</p>
                    </div>
                  </div>
                ) : (
                  /* CUSTOM TIMES REMINDERS */
                  <div className="space-y-3 p-4 border border-border/40 rounded-2xl bg-card">
                    <div className="space-y-0.5 mb-2">
                      <Label className="font-bold text-sm">Horários de Lembrete Customizados</Label>
                      <p className="text-xs text-muted-foreground">Adicione horários para o sistema incentivar você a estudar.</p>
                    </div>

                    <div className="flex gap-2">
                      <Input
                        type="time"
                        value={newTime}
                        onChange={(e) => setNewTime(e.target.value)}
                        className="rounded-xl border-2 h-10 w-32 font-bold text-sm"
                      />
                      <Button
                        type="button"
                        onClick={addCustomTime}
                        className="rounded-xl h-10 text-xs font-bold flex-1"
                      >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Adicionar
                      </Button>
                    </div>

                    {config.custom_reminder_times.length > 0 ? (
                      <div className="flex flex-wrap gap-2 pt-2">
                        {config.custom_reminder_times.map((time) => (
                          <div
                            key={time}
                            className="inline-flex items-center gap-1.5 pl-3 pr-1.5 py-1 rounded-full bg-muted border border-border text-xs font-bold text-foreground"
                          >
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {time}
                            <button
                              type="button"
                              onClick={() => removeCustomTime(time)}
                              className="h-5 w-5 rounded-full hover:bg-destructive/10 hover:text-destructive flex items-center justify-center transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground text-center py-4 border border-dashed rounded-xl mt-2 bg-muted/10 font-medium">
                        Nenhum horário de lembrete adicionado ainda.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* BUTTON ACTION ROW */}
            <div className="flex justify-end gap-2.5 pt-4 border-t">
              <Button
                variant="outline"
                type="button"
                onClick={() => onOpenChange(false)}
                className="rounded-xl text-xs font-bold h-10"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                onClick={saveConfig}
                disabled={saving}
                className="rounded-xl text-xs font-bold h-10 min-w-[80px]"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Salvar'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

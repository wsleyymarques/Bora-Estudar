import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  User, 
  LogOut, 
  Sparkles,
  Zap,
  ChevronRight,
  ArrowLeft,
  Palette,
  Laptop,
  Sun,
  Moon,
  X
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStudy } from '@/contexts/StudyContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ResponsivePanel } from '@/components/generic/ResponsivePanel';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useNotifications } from '@/contexts/NotificationContext';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { THEME_MODE_LABELS, ThemeMode } from '@/theme/presets';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { ImageUpload } from '@/components/generic/image-upload';

interface UserProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfilePanel({ isOpen, onClose }: UserProfilePanelProps) {
  const { user, profile, logout, refreshProfile, updateProfile } = useAuth();
  const { data: studyData } = useStudy();
  const identities = user?.identities || [];
  const isGoogleLinked = identities.some(identity => identity.provider === 'google');
  const { 
    notificationPermission: systemPermission,
    requestPermission: systemRequestPermission
  } = useNotifications();

  const {
    templateKey,
    mode,
    templates,
    templatesLoading,
    setTemplateKey,
    setMode,
  } = useAppTheme();

  const [view, setView] = useState<'main' | 'account' | 'theme' | 'permissions'>('main');

  const [userName, setUserName] = useState('');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const userEmail = user?.email || '';

  // Calculate stats
  const sessionsCount = studyData?.sessions?.length || 0;
  const subjectsCount = studyData?.subjects?.length || 0;
  const totalSeconds = studyData?.sessions?.reduce((acc, s) => acc + s.actualDurationSeconds, 0) || 0;
  const totalHours = Math.round(totalSeconds / 3600);

  useEffect(() => {
    if (user) {
      setUserName(profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário');
      setAvatarUrlInput(profile?.avatar_url || user?.user_metadata?.avatar_url || '');
    }
  }, [profile?.avatar_url, profile?.full_name, user]);

  // Reset view when panel closes
  useEffect(() => {
    if (!isOpen) {
      setView('main');
    }
  }, [isOpen]);

  const handleRequestNotifications = async (checked: boolean) => {
    if (!checked) {
      toast.info('As notificações só podem ser desativadas nas configurações do seu navegador.');
      return;
    }
    const granted = await systemRequestPermission();
    if (granted) {
      toast.success('Notificações ativadas com sucesso!');
    } else {
      toast.error('Permissão para notificações não concedida ou bloqueada.');
    }
  };

  const handleSaveProfile = async () => {
    if (!userName.trim()) {
      toast.error('O nome não pode ficar vazio.');
      return;
    }
    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { 
          full_name: userName.trim(),
          avatar_url: avatarUrlInput.trim()
        }
      });
      if (error) throw error;
      const profileResult = await updateProfile({
        full_name: userName.trim(),
        avatar_url: avatarUrlInput.trim() || null,
      });
      if (profileResult.error) throw new Error(profileResult.error);
      await refreshProfile();
      toast.success('Perfil atualizado com sucesso!');
      setView('main');
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleRankingPrivacyChange = async (checked: boolean) => {
    const result = await updateProfile({ profile_private: checked });
    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(checked ? 'Modo privado ativado no ranking.' : 'Modo competitivo ativado no ranking.');
  };

  const hasTemplates = templates.length > 0;

  return (
    <ResponsivePanel 
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()}
      size="md"
      title={view === 'main' ? 'Perfil' : view === 'account' ? 'Configurações de Perfil' : view === 'theme' ? 'Tema & Visual' : 'Permissões'}
      unstyled
      className={view === 'main' ? 'bg-primary border-none' : 'border-none'}
    >
      <div className="flex flex-col h-full bg-background relative overflow-hidden">
        
        {view === 'main' ? (
          <>
            {/* BANNER WITH BACKDROP & AVATAR */}
            <div className="relative">
              <div className="h-32 bg-primary rounded-b-[2rem] relative flex items-start justify-between px-6 pt-2">
                <div className="flex items-center gap-3 z-10">
                  <button
                    onClick={onClose}
                    className="p-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white transition-all active:scale-90 focus:outline-none border border-white/10"
                    aria-label="Fechar"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                  </button>
                  <span className="text-primary-foreground font-black text-xs uppercase tracking-[0.25em]">Bora-Estudar</span>
                </div>
                <Sparkles className="w-4 h-4 text-primary-foreground/60 animate-pulse" />
              </div>
              
              {/* Avatar Container */}
              <div className="absolute top-16 left-1/2 -translate-x-1/2 flex flex-col items-center">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary to-primary/60 rounded-full blur-xl opacity-30 scale-110" />
                  <Avatar className="h-20 w-20 border-4 border-card shadow-2xl rounded-full">
                    <AvatarImage src={user?.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-gradient-to-br from-slate-800 to-black text-white text-xl font-black">
                      {userName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </div>
              </div>
            </div>

            {/* PROFILE INFO */}
            <div className="text-center px-6 mt-10 pb-6 border-b border-border/80">
              <h2 className="text-lg font-display font-black text-foreground tracking-tight">
                {userName}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 truncate">{userEmail}</p>
            </div>

            {/* MENU LIST */}
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5 custom-scrollbar">
              <button 
                onClick={() => setView('account')}
                className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-card border border-border/50 shadow-sm hover:shadow-md transition-all group active:scale-[0.99]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <User className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-foreground">Configurações de Perfil</h4>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter mt-0.5">Nome e Foto de Perfil</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </button>

              <button 
                onClick={() => setView('theme')}
                className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-card border border-border/50 shadow-sm hover:shadow-md transition-all group active:scale-[0.99]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Palette className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-foreground">Tema & Visual</h4>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter mt-0.5">Cores e Modo Claro/Escuro</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </button>

              <button 
                onClick={() => setView('permissions')}
                className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-card border border-border/50 shadow-sm hover:shadow-md transition-all group active:scale-[0.99]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <h4 className="text-xs font-black text-foreground">Permissões & Alertas</h4>
                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter mt-0.5">Notificações Desktop</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
              </button>
            </div>

            {/* LOGOUT FOOTER */}
            <div className="p-6 bg-card border-t border-border mt-auto">
              <Button 
                variant="outline" 
                className="w-full h-12 rounded-2xl text-red-500 border-red-200 bg-red-50 hover:bg-red-100 hover:text-red-600 dark:bg-red-500/10 dark:border-red-500/20 dark:hover:bg-red-500/20 font-black text-xs uppercase tracking-widest gap-2.5 transition-all active:scale-95 shadow-sm"
                onClick={() => logout()}
              >
                <LogOut className="w-4 h-4" />
                Encerrar Sessão
              </Button>
            </div>
          </>
        ) : (
          <div className="flex flex-col h-full bg-background">
            {/* SUB-VIEW HEADER */}
            <div className="flex items-center gap-3 p-5 border-b border-border/80 bg-card">
              <button 
                onClick={() => setView('main')} 
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Voltar"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h3 className="font-display font-black text-xs text-foreground uppercase tracking-widest">
                  {view === 'account' ? 'Configurações de Perfil' : view === 'theme' ? 'Tema & Visual' : 'Permissões'}
                </h3>
              </div>
            </div>

            {/* SUB-VIEW CONTENT */}
            <div className="flex-1 overflow-y-auto px-6 py-6 space-y-6">
              {view === 'account' && (
                <div className="space-y-4">
                  {/* Photo Preview & Edit */}
                  <div className="flex flex-col items-center space-y-3 pb-2">
                    <div className="relative">
                      <Avatar className="h-24 w-24 border-4 border-card shadow-xl rounded-full">
                        <AvatarImage src={avatarUrlInput} />
                        <AvatarFallback className="bg-gradient-to-br from-slate-800 to-black text-white text-2xl font-black">
                          {userName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <ImageUpload
                        value={avatarUrlInput}
                        onChange={(url) => setAvatarUrlInput(url)}
                        bucket="study-plan-images"
                        folder="avatars"
                        variant="icon"
                        className="absolute bottom-0 right-0 z-10"
                      />
                    </div>
                    <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                      Foto de perfil
                    </p>
                  </div>

                  <div className="space-y-5 p-5 rounded-[1.5rem] bg-card border border-border shadow-sm">
                    {/* Name Input */}
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Nome Completo</label>
                      <Input
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                        placeholder="Nome do perfil"
                        className="bg-muted/40 border-border"
                        maxLength={50}
                        disabled={isSaving}
                      />
                    </div>

                    {/* Account Information (Display-Only) */}
                    <div className="pt-4 border-t border-border/60 space-y-3 text-xs">
                      <h4 className="text-[10px] font-black uppercase tracking-[0.25em] text-muted-foreground mb-2">Detalhes da Conta</h4>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1">
                        <span className="font-bold text-muted-foreground">E-mail:</span>
                        <span className="font-semibold text-foreground/90 break-all sm:break-normal">{userEmail}</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-muted-foreground">Criada em:</span>
                        <span className="font-semibold text-foreground/90">
                          {user?.created_at ? new Date(user.created_at).toLocaleDateString('pt-BR') : 'N/A'}
                        </span>
                      </div>
                      <div className="border-t border-border/60 pt-3 flex justify-between items-center">
                        <span className="font-bold text-muted-foreground">Google:</span>
                        {isGoogleLinked ? (
                          <div className="flex items-center gap-1.5 text-green-500 font-bold bg-green-500/10 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-wider">
                            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                            </svg>
                            Vinculado
                          </div>
                        ) : (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] font-black uppercase tracking-wider px-3 border-border hover:bg-muted/50 flex items-center gap-1.5"
                            onClick={async () => {
                              try {
                                const { error } = await supabase.auth.linkIdentity({
                                  provider: 'google',
                                  options: {
                                    redirectTo: window.location.origin,
                                  }
                                });
                                if (error) throw error;
                                toast.success('Redirecionando para vincular com o Google...');
                              } catch (err: any) {
                                const errMsg = err.message || '';
                                if (errMsg.includes('manual_linking_disabled') || err.status === 404 || errMsg.includes('Not Found')) {
                                  toast.error(
                                    'Vínculo manual desativado no Supabase. Ative a opção "Manual Linking" em Authentication > Providers do seu painel do Supabase.',
                                    { duration: 8000 }
                                  );
                                } else {
                                  toast.error(`Erro ao vincular: ${err.message || err}`);
                                }
                              }
                            }}
                          >
                            <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                            </svg>
                            Vincular
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  <Button 
                    onClick={handleSaveProfile} 
                    disabled={isSaving} 
                    className="w-full h-11 rounded-2xl font-bold mt-2"
                  >
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                  </Button>
                </div>
              )}

              {view === 'theme' && (
                <div className="space-y-4">
                  <div className="space-y-4 p-5 rounded-[1.5rem] bg-card border border-border shadow-sm">
                    {/* Core Template */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Template de Cores</label>
                      <Select
                        value={templateKey}
                        onValueChange={(value) => void setTemplateKey(value)}
                        disabled={!hasTemplates || templatesLoading}
                      >
                        <SelectTrigger className="h-10 text-xs bg-muted/40 border-border">
                          <SelectValue placeholder={templatesLoading ? 'Carregando templates...' : 'Selecione um template'} />
                        </SelectTrigger>
                        <SelectContent>
                          {templates.map((template) => (
                            <SelectItem key={template.key} value={template.key}>
                              <div className="flex items-center gap-2">
                                <div className="flex items-center gap-0.5">
                                  {template.preview.slice(0, 3).map((color) => (
                                    <span
                                      key={`${template.key}-${color}`}
                                      className="w-2.5 h-2.5 rounded-full border border-border/70"
                                      style={{ backgroundColor: color }}
                                    />
                                  ))}
                                </div>
                                <span>{template.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Theme Mode Toggle (Light/Dark/System) */}
                    <div className="space-y-2.5 pt-2">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">Modo de Exibição</label>
                      <div className="grid grid-cols-3 gap-2 bg-muted p-1 rounded-xl">
                        {(Object.keys(THEME_MODE_LABELS) as ThemeMode[]).map((modeOption) => {
                          const isActive = mode === modeOption;
                          const Icon = modeOption === 'light' ? Sun : modeOption === 'dark' ? Moon : Laptop;
                          return (
                            <button
                              key={modeOption}
                              type="button"
                              onClick={() => void setMode(modeOption)}
                              className={cn(
                                "h-8 rounded-lg text-[11px] font-bold flex items-center justify-center gap-1.5 transition-all",
                                isActive 
                                  ? "bg-background text-foreground shadow-sm border border-border" 
                                  : "text-muted-foreground hover:text-foreground"
                              )}
                            >
                              <Icon className="w-3.5 h-3.5" />
                              {THEME_MODE_LABELS[modeOption]}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {view === 'permissions' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-[1.5rem] bg-card border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <h4 className="text-xs font-black text-foreground">Modo no Ranking</h4>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter mt-0.5">
                          {profile?.profile_private ? 'Privado' : 'Competitivo'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={profile?.profile_private ?? false}
                      onCheckedChange={handleRankingPrivacyChange}
                    />
                  </div>
                  <p className="px-1 text-[11px] leading-relaxed text-muted-foreground">
                    No modo privado, seu nome e avatar ficam ocultos no ranking semanal. Você continua ganhando XP, bônus e mantendo a ofensiva normalmente.
                  </p>

                  <div className="flex items-center justify-between p-4 rounded-[1.5rem] bg-card border border-border shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <h4 className="text-xs font-black text-foreground">Notificações Push</h4>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tighter mt-0.5">
                          {systemPermission === 'granted' 
                            ? 'Permitido no navegador' 
                            : systemPermission === 'denied' 
                              ? 'Bloqueado pelo usuário' 
                              : 'Perguntar ao iniciar'}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={systemPermission === 'granted'}
                      onCheckedChange={handleRequestNotifications}
                      disabled={systemPermission === 'denied'}
                    />
                  </div>
                  {systemPermission === 'denied' ? (
                    <div className="p-4 rounded-[1.5rem] bg-destructive/10 border border-destructive/20 text-xs text-destructive leading-relaxed space-y-1">
                      <p className="font-bold">⚠️ Notificações Bloqueadas</p>
                      <p>
                        Você recusou a permissionamento deste site. Para receber notificações de finalização de ciclos Pomodoro ou cronômetro, é necessário abrir as configurações do site no seu navegador e redefinir a permissão para "Permitir".
                      </p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
                      Ao ativar as notificações desktop, você receberá avisos sonoros e popups do sistema operacional ao terminar uma meta de estudos ou iniciar um intervalo, mesmo se estiver em outra aba.
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar {
          width: 0px;
        }
      `}} />
    </ResponsivePanel>
  );
}

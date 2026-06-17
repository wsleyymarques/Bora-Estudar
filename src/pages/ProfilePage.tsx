import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, LogOut, Palette, Save, User, Target, Clock, Calendar, FileText, Shield, Settings, Bell, LayoutDashboard, Lock, Edit2, Mail, UserCheck, Eye, EyeOff, AlertCircle, ChevronLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useStudy } from '@/contexts/StudyContext';
import { useAppTheme } from '@/contexts/AppThemeContext';
import { THEME_MODE_LABELS, ThemeMode } from '@/theme/presets';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/generic/PageHeader';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ImageUpload } from '@/components/generic/image-upload';
import { TimeSpinner } from '@/components/ui/time-spinner';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

type TabKey = 'perfil' | 'aparencia' | 'metas' | 'conta' | 'privacidade';

const tabs: { key: TabKey; label: string; icon: React.ReactNode; description: string }[] = [
  { key: 'perfil', label: 'Perfil', icon: <User className="w-5 h-5" />, description: 'Nome, avatar e e-mail' },
  { key: 'aparencia', label: 'Aparência', icon: <Palette className="w-5 h-5" />, description: 'Tema, modo e visualização' },
  { key: 'metas', label: 'Metas', icon: <Target className="w-5 h-5" />, description: 'Metas diárias e semanais de estudo' },
  { key: 'conta', label: 'Conta', icon: <Settings className="w-5 h-5" />, description: 'Estatísticas e segurança' },
  { key: 'privacidade', label: 'Privacidade', icon: <Shield className="w-5 h-5" />, description: 'Políticas e tratamento de dados' },
];

export default function ProfilePage() {
  const navigate = useNavigate();
  const { user, profile, logout, refreshProfile, updateProfile } = useAuth();
  const { data } = useStudy();
  const {
    templateKey,
    mode,
    templates,
    selectedTemplate,
    templatesLoading,
    setTemplateKey,
    setMode,
  } = useAppTheme();

  const [userName, setUserName] = useState('');
  const [avatarUrlInput, setAvatarUrlInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isEditingName, setIsEditingName] = useState(false);
  const [activeTab, setActiveTab] = useState<TabKey>('perfil');
  const [searchParams, setSearchParams] = useSearchParams();
  const urlTab = searchParams.get('tab') as TabKey | null;

  // Determine if we're showing a specific tab content on mobile
  const mobileTabContent = urlTab && tabs.some(t => t.key === urlTab) ? urlTab : null;

  // Sync activeTab with URL tab param
  useEffect(() => {
    if (mobileTabContent && activeTab !== mobileTabContent) {
      setActiveTab(mobileTabContent);
    }
  }, [mobileTabContent, activeTab]);

  // Update URL when activeTab changes (only on mobile)
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 768) {
      if (activeTab !== 'perfil') {
        setSearchParams({ tab: activeTab });
      } else {
        setSearchParams({});
      }
    }
  }, [activeTab, setSearchParams]);

  const hasTemplates = templates.length > 0;
  const [dailyGoalHours, setDailyGoalHours] = useState(2);
  const [dailyGoalMinutes, setDailyGoalMinutes] = useState(0);
  const [weeklyGoalHours, setWeeklyGoalHours] = useState(20);
  const [weeklyGoalMinutes, setWeeklyGoalMinutes] = useState(0);
  const [isSavingGoals, setIsSavingGoals] = useState(false);

  // Change password dialog state
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  // Delete account dialog state
    const [showDeleteAccount, setShowDeleteAccount] = useState(false);
    const [isDeletingAccount, setIsDeletingAccount] = useState(false);

    // Privacy document inline view state
  const [privacyDocView, setPrivacyDocView] = useState<'list' | 'privacy-policy' | 'terms-of-use'>('list');

  const userEmail = user?.email || '';
  const sessionsCount = data.sessions.length;
  const subjectsCount = data.subjects.length;
  const streak = profile?.streak_current ?? 0;
  const dailyGoal = profile?.daily_goal_minutes ?? 60;

  useEffect(() => {
    setUserName(profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario');
    setAvatarUrlInput(profile?.avatar_url || user?.user_metadata?.avatar_url || '');

    if (profile) {
      const dg = profile.daily_goal_minutes || 120;
      setDailyGoalHours(Math.floor(dg / 60));
      setDailyGoalMinutes(dg % 60);

      const wg = profile.weekly_goal_minutes || 1200;
      setWeeklyGoalHours(Math.floor(wg / 60));
      setWeeklyGoalMinutes(wg % 60);
    }
  }, [profile?.avatar_url, profile?.full_name, profile?.daily_goal_minutes, profile?.weekly_goal_minutes, user]);

  const handleSave = async (overrideName?: string, overrideAvatar?: string) => {
    const finalName = overrideName ?? userName;
    const finalAvatar = overrideAvatar ?? avatarUrlInput;

    if (!finalName.trim()) {
      toast.error('O nome nao pode ficar vazio.');
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: finalName.trim(),
          avatar_url: finalAvatar.trim(),
        },
      });
      if (error) throw error;

      const profileResult = await updateProfile({
        full_name: finalName.trim(),
        avatar_url: finalAvatar.trim() || null,
      });
      if (profileResult.error) throw new Error(profileResult.error);

      await refreshProfile();
      toast.success('Perfil atualizado com sucesso!');
      setIsEditingName(false);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar perfil.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGoals = async () => {
    const totalDaily = dailyGoalHours * 60 + dailyGoalMinutes;
    const totalWeekly = weeklyGoalHours * 60 + weeklyGoalMinutes;

    if (totalDaily <= 0 || totalWeekly <= 0) {
      toast.error('As metas devem ser maiores que zero.');
      return;
    }

    setIsSavingGoals(true);
    try {
      const { error } = await updateProfile({
        daily_goal_minutes: totalDaily,
        weekly_goal_minutes: totalWeekly,
      });
      if (error) throw new Error(error);

      toast.success('Metas atualizadas com sucesso!');
    } catch (err: any) {
      toast.error('Erro ao atualizar metas.');
    } finally {
      setIsSavingGoals(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmNewPassword) {
      toast.error('As senhas não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      toast.error('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) throw new Error(error);

      toast.success('Senha alterada com sucesso!');
      setShowChangePassword(false);
      setNewPassword('');
      setConfirmNewPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao alterar senha.');
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      // Note: Account deletion requires server-side admin API.
      // In production, call an Edge Function that uses supabase.auth.admin.deleteUser()
      // For now, we'll sign out and show success message.
      await supabase.auth.signOut();
      toast.success('Conta excluída com sucesso! (Demo: sessão encerrada)');
      setShowDeleteAccount(false);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao excluir conta.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'perfil':
        return (
          <div className="space-y-6 max-w-xl">
            {/* Stacked Profile Card - Vertical Layout */}
            <div className="dashboard-card p-6 sm:p-8 text-center">
              {/* Avatar Section */}
              <div className="relative inline-block mb-6">
                <Avatar className="h-28 w-28 border-4 border-card shadow-xl bg-card">
                  <AvatarImage src={avatarUrlInput || user?.user_metadata?.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-primary/10 text-primary font-black text-4xl">
                    {(userName || 'U').slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <ImageUpload
                  value={avatarUrlInput}
                  onChange={(url) => {
                    setAvatarUrlInput(url);
                    handleSave(userName, url);
                  }}
                  bucket="study-plan-images"
                  folder="avatars"
                  variant="icon"
                  className="absolute bottom-0 right-0 z-10"
                />
              </div>

              {/* Name Section with Edit */}
              <div className="mb-4">
                {isEditingName ? (
                  <div className="flex flex-col sm:flex-row items-center justify-center gap-2 max-w-md mx-auto">
                    <Input
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className="h-12 rounded-xl text-center sm:text-left font-bold text-lg"
                      autoFocus
                      onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                    />
                    <Button size="sm" variant="default" onClick={() => handleSave()} disabled={isSaving} className="h-12 rounded-xl px-5 w-full sm:w-auto">
                      Salvar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setUserName(profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario');
                        setIsEditingName(false);
                      }}
                      disabled={isSaving}
                      className="h-12 rounded-xl px-5 w-full sm:w-auto"
                    >
                      Cancelar
                    </Button>
                  </div>
                ) : (
                  <div className="group flex items-center justify-center gap-2 mb-2">
                    <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">{userName || 'Usuario'}</h2>
                    <button
                      onClick={() => setIsEditingName(true)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                      aria-label="Editar nome"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {/* Email - Read only with info icon */}
              <div className="mb-6">
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="break-all max-w-[300px]">{userEmail}</span>
                  <span className="text-[10px] text-muted-foreground/60">(não pode ser alterado)</span>
                </div>
              </div>

              {/* Stats Badges */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                <Badge variant="outline" className="rounded-full px-4 py-1.5 text-xs">
                  {streak} dias de streak
                </Badge>
                <Badge variant="outline" className="rounded-full px-4 py-1.5 text-xs">
                  {dailyGoal} min/dia
                </Badge>
              </div>

              {/* Action Buttons - Stacked */}
              <div className="space-y-3 max-w-md mx-auto">
                {/* Privacy Button */}
                <button
                  onClick={() => setActiveTab('privacidade')}
                  className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-background/50 border border-border/50 hover:border-primary/30 transition-colors text-left group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 text-purple-500 shrink-0">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-bold text-foreground group-hover:text-primary transition-colors">Privacidade e Termos</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Políticas e tratamento de dados (LGPD)</p>
                  </div>
                  <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                </button>

                {/* Change Password Button */}
                <button
                  onClick={() => setShowChangePassword(true)}
                  className="w-full flex items-center justify-center gap-3 p-4 rounded-2xl bg-background/50 border border-border/50 hover:border-primary/30 transition-colors text-left group"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <span className="font-bold text-foreground group-hover:text-primary transition-colors">Alterar Senha</span>
                    <p className="text-xs text-muted-foreground mt-0.5">Atualize sua senha de acesso</p>
                  </div>
                  <Lock className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                </button>
              </div>
            </div>

            {/* Change Password Dialog */}
            <AlertDialog open={showChangePassword} onOpenChange={setShowChangePassword}>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-primary" />
                    Alterar Senha
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Digite sua nova senha. A senha deve ter pelo menos 6 caracteres.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <label htmlFor="new-password" className="block text-sm font-medium text-foreground">
                      Nova Senha
                    </label>
                    <div className="relative">
                      <Input
                        id="new-password"
                        type={showNewPassword ? 'text' : 'password'}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Digite a nova senha"
                        className="h-12 rounded-xl bg-background border border-border/50 pl-4 pr-12 text-base w-full"
                        autoFocus
                        required
                        minLength={6}
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                      >
                        {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="confirm-password" className="block text-sm font-medium text-foreground">
                      Confirmar Nova Senha
                    </label>
                    <Input
                      id="confirm-password"
                      type={showNewPassword ? 'text' : 'password'}
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      placeholder="Confirme a nova senha"
                      className="h-12 rounded-xl bg-background border border-border/50 pl-4 pr-12 text-base w-full"
                      required
                      minLength={6}
                    />
                  </div>
                </div>
                <AlertDialogFooter className="flex-col space-y-2 sm:flex-row">
                  <AlertDialogCancel className="w-full sm:w-auto">
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleChangePassword} disabled={isChangingPassword} className="w-full sm:w-auto">
                    {isChangingPassword ? 'Salvando...' : 'Salvar Nova Senha'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>

            {/* Delete Account Dialog */}
            <AlertDialog open={showDeleteAccount} onOpenChange={setShowDeleteAccount}>
              <AlertDialogContent className="max-w-md">
                <AlertDialogHeader>
                  <AlertDialogTitle className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Excluir Conta
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    Esta ação é <strong>irreversível</strong>. Todos os seus dados, planos, sessões e histórico serão permanentemente removidos. Tem certeza que deseja continuar?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col space-y-2 sm:flex-row">
                  <AlertDialogCancel className="w-full sm:w-auto">
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteAccount} disabled={isDeletingAccount} className="w-full sm:w-auto bg-red-500 hover:bg-red-600 text-red-500-foreground">
                    {isDeletingAccount ? 'Excluindo...' : 'Sim, Excluir Minha Conta'}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );

      case 'aparencia':
        return (
          <div className="space-y-6 max-w-2xl">
            <div className="dashboard-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Palette className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground">Visual</p>
                  <h3 className="text-2xl font-black tracking-tight text-foreground">Tema e modo</h3>
                </div>
              </div>

              <div className="space-y-6">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground mb-3">Modo de cor</p>
                  <div className="grid grid-cols-3 gap-3">
                    {(Object.keys(THEME_MODE_LABELS) as ThemeMode[]).map((modeOption) => (
                      <button
                        key={modeOption}
                        type="button"
                        onClick={() => void setMode(modeOption)}
                        className={cn(
                          'h-14 rounded-2xl border text-sm font-bold transition-all',
                          mode === modeOption
                            ? 'border-primary bg-primary text-primary-foreground shadow-md'
                            : 'border-border bg-background text-muted-foreground hover:text-foreground hover:border-primary/30'
                        )}
                      >
                        {THEME_MODE_LABELS[modeOption]}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats preview */}
            <div className="dashboard-card p-6">
              <h3 className="text-lg font-bold mb-4">Suas estatísticas</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.5rem] border border-border/60 bg-background/80 p-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Sessões</p>
                  <p className="mt-2 text-3xl font-black">{sessionsCount}</p>
                </div>
                <div className="rounded-[1.5rem] border border-border/60 bg-background/80 p-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Matérias</p>
                  <p className="mt-2 text-3xl font-black">{subjectsCount}</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'metas':
        return (
          <div className="space-y-6 max-w-2xl">
            <div className="dashboard-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <Target className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground">Configurações</p>
                  <h3 className="text-2xl font-black tracking-tight text-foreground">Metas de Estudo</h3>
                </div>
              </div>

              <div className="grid gap-6 md:grid-cols-2 max-w-3xl mx-auto py-4">
                {/* Meta Diária */}
                <div className="bg-background/50 border border-border/50 rounded-3xl p-6 space-y-6 shadow-sm">
                  <div className="flex items-center gap-3 text-emerald-500 font-bold">
                    <Clock className="w-5 h-5" />
                    <h4 className="text-lg">Meta Diária</h4>
                  </div>
                  <div className="flex items-center gap-4 justify-center">
                    <div className="flex flex-col items-center">
                      <TimeSpinner 
                        value={dailyGoalHours}
                        onChange={setDailyGoalHours}
                        min={0} max={23}
                        activeColorClass="focus-within:border-emerald-500 focus-within:ring-emerald-500"
                      />
                      <span className="text-[10px] text-muted-foreground font-bold mt-2 uppercase tracking-widest">Horas</span>
                    </div>
                    <span className="text-3xl font-black text-muted-foreground/30 mb-6">:</span>
                    <div className="flex flex-col items-center">
                      <TimeSpinner 
                        value={dailyGoalMinutes}
                        onChange={setDailyGoalMinutes}
                        min={0} max={59} step={5}
                        activeColorClass="focus-within:border-emerald-500 focus-within:ring-emerald-500"
                      />
                      <span className="text-[10px] text-muted-foreground font-bold mt-2 uppercase tracking-widest">Min</span>
                    </div>
                  </div>
                </div>

                {/* Meta Semanal */}
                <div className="bg-background/50 border border-border/50 rounded-3xl p-6 space-y-6 shadow-sm">
                  <div className="flex items-center gap-3 text-blue-500 font-bold">
                    <Calendar className="w-5 h-5" />
                    <h4 className="text-lg">Meta Semanal</h4>
                  </div>
                  <div className="flex items-center gap-4 justify-center">
                    <div className="flex flex-col items-center">
                      <TimeSpinner 
                        value={weeklyGoalHours}
                        onChange={setWeeklyGoalHours}
                        min={0} max={168}
                        activeColorClass="focus-within:border-blue-500 focus-within:ring-blue-500"
                      />
                      <span className="text-[10px] text-muted-foreground font-bold mt-2 uppercase tracking-widest">Horas</span>
                    </div>
                    <span className="text-3xl font-black text-muted-foreground/30 mb-6">:</span>
                    <div className="flex flex-col items-center">
                      <TimeSpinner 
                        value={weeklyGoalMinutes}
                        onChange={setWeeklyGoalMinutes}
                        min={0} max={59} step={5}
                        activeColorClass="focus-within:border-blue-500 focus-within:ring-blue-500"
                      />
                      <span className="text-[10px] text-muted-foreground font-bold mt-2 uppercase tracking-widest">Min</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <Button 
                  onClick={handleSaveGoals} 
                  disabled={isSavingGoals}
                  className="rounded-xl font-bold px-6"
                >
                  {isSavingGoals ? 'Salvando...' : 'Salvar Metas'}
                </Button>
              </div>
            </div>

            {/* Progress preview */}
            <div className="dashboard-card p-6">
              <h3 className="text-lg font-bold mb-4">Progresso atual</h3>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Meta diária</span>
                    <span className="text-muted-foreground">{dailyGoal} min</span>
                  </div>
                  <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: Math.min(100, (sessionsCount * 15) / (dailyGoal / 60) * 100) + '%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">Streak atual</span>
                    <span className="text-muted-foreground">{streak} dias</span>
                  </div>
                  <div className="h-2 bg-background/50 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: Math.min(100, streak * 10) + '%' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'conta':
        return (
          <div className="space-y-6 max-w-2xl">
            <div className="dashboard-card p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500">
                  <LayoutDashboard className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground">Visão geral</p>
                  <h3 className="text-2xl font-black tracking-tight text-foreground">Sua conta</h3>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 mb-6">
                <div className="rounded-[1.5rem] border border-border/60 bg-background/80 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Sessões concluídas</p>
                  <p className="mt-2 text-3xl font-black">{sessionsCount}</p>
                </div>
                <div className="rounded-[1.5rem] border border-border/60 bg-background/80 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Matérias cadastradas</p>
                  <p className="mt-2 text-3xl font-black">{subjectsCount}</p>
                </div>
                <div className="rounded-[1.5rem] border border-border/60 bg-background/80 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Dias de streak</p>
                  <p className="mt-2 text-3xl font-black text-emerald-500">{streak}</p>
                </div>
                <div className="rounded-[1.5rem] border border-border/60 bg-background/80 p-5">
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Meta diária</p>
                  <p className="mt-2 text-3xl font-black">{dailyGoal} min</p>
                </div>
              </div>
            </div>

            {/* Danger zone */}
            <div className="dashboard-card p-6 border-red-500/20">
              <div className="flex items-center gap-3 text-red-500 mb-4">
                <Shield className="h-5 w-5" />
                <h3 className="text-lg font-bold">Zona de perigo</h3>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                Ações irreversíveis. Use com cautela.
              </p>
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteAccount(true)} 
                className="w-full sm:w-auto h-11 rounded-2xl"
              >
                <AlertCircle className="mr-2 h-4 w-4" />
                Excluir conta permanentemente
              </Button>
            </div>
          </div>
        );

      case 'privacidade':
        return (
          <div className="space-y-6 max-w-3xl">
            {/* Document View - Privacy Policy */}
            {privacyDocView === 'privacy-policy' && (
              <div className="space-y-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPrivacyDocView('list')}
                  className="mb-4"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <div className="dashboard-card p-6 sm:p-8 prose dark:prose-invert max-w-none">
                  <h1 className="text-3xl font-display font-black mb-2">Política de Privacidade</h1>
                  <p className="text-sm text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

                  <p>
                    Bem-vindo ao <strong>Bora-Estudar</strong>. A sua privacidade é muito importante para nós. Esta Política de
                    Privacidade descreve como coletamos, usamos, armazenamos e protegemos os seus dados pessoais, em
                    conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).
                  </p>

                  <h2>1. Dados que Coletamos</h2>
                  <p>Podemos coletar os seguintes dados pessoais fornecidos diretamente por você ou gerados pelo seu uso da plataforma:</p>
                  <ul>
                    <li><strong>Dados de Cadastro:</strong> Nome, endereço de e-mail e senha (criptografada).</li>
                    <li><strong>Dados de Perfil e Estudo:</strong> Seu objetivo de estudo, metas semanais, planos criados, matérias e cronogramas.</li>
                    <li><strong>Dados de Uso e Desempenho:</strong> Tempo gasto no aplicativo, sessões do cronômetro/pomodoro, interações com a interface e estatísticas de progresso.</li>
                    <li><strong>Dados Técnicos:</strong> Endereço IP, tipo de navegador, sistema operacional e identificadores de dispositivo, coletados automaticamente para fins de segurança e melhoria do serviço.</li>
                  </ul>

                  <h2>2. Como Usamos os Seus Dados</h2>
                  <p>Utilizamos seus dados para as seguintes finalidades (base legal aplicável):</p>
                  <ul>
                    <li><strong>Fornecimento do Serviço (Execução de Contrato):</strong> Criar sua conta, salvar seus cronogramas, registrar o tempo de estudo e gerar suas estatísticas.</li>
                    <li><strong>Melhoria Contínua (Legítimo Interesse):</strong> Analisar o comportamento no aplicativo para corrigir bugs, desenvolver novos recursos e melhorar a interface.</li>
                    <li><strong>Comunicações (Consentimento/Legítimo Interesse):</strong> Enviar avisos sobre a plataforma, atualizações do serviço ou comunicações promocionais (das quais você pode cancelar a assinatura a qualquer momento).</li>
                    <li><strong>Segurança e Cumprimento Legal (Obrigação Legal):</strong> Prevenir fraudes, garantir a segurança dos nossos sistemas e cumprir ordens judiciais.</li>
                  </ul>

                  <h2>3. Compartilhamento de Dados</h2>
                  <p>O Bora-Estudar não vende os seus dados pessoais. Podemos compartilhar suas informações estritamente com os seguintes tipos de prestadores de serviços, que também devem respeitar a LGPD:</p>
                  <ul>
                    <li><strong>Serviços de Hospedagem e Nuvem:</strong> Para armazenar seu banco de dados de forma segura (ex: provedores de nuvem).</li>
                    <li><strong>Ferramentas de Análise:</strong> Para monitorar métricas de uso gerais e anônimas (ex: Google Analytics).</li>
                    <li><strong>Serviços de Comunicação:</strong> Ferramentas utilizadas para enviar e-mails transacionais (como recuperação de senha).</li>
                  </ul>

                  <h2>4. Armazenamento e Segurança</h2>
                  <p>
                    Adotamos medidas técnicas e organizacionais adequadas para proteger seus dados contra acesso não autorizado,
                    alteração, divulgação ou destruição acidental. Os dados são armazenados em servidores seguros, e exigimos
                    boas práticas de segurança de nossos parceiros de tecnologia.
                  </p>

                  <h2>5. Retenção dos Dados</h2>
                  <p>
                    Reteremos os seus dados enquanto a sua conta estiver ativa ou conforme necessário para lhe fornecer os
                    serviços. Caso decida excluir a sua conta, os seus dados pessoais serão removidos dos nossos bancos de
                    dados ativos, exceto quando houver uma obrigação legal para retê-los.
                  </p>

                  <h2>6. Os Seus Direitos (Art. 18 da LGPD)</h2>
                  <p>Você tem o direito de:</p>
                  <ul>
                    <li>Confirmar a existência de tratamento de dados.</li>
                    <li>Acessar os seus dados pessoais.</li>
                    <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
                    <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários.</li>
                    <li>Solicitar a portabilidade dos dados.</li>
                    <li>Revogar o seu consentimento a qualquer momento.</li>
                  </ul>
                  <p>
                    Você pode exercer esses direitos diretamente no painel de configurações da sua conta ou entrando em
                    contato conosco.
                  </p>

                  <h2>7. Cookies e Tecnologias Semelhantes</h2>
                  <p>
                    Utilizamos cookies para manter sua sessão ativa, lembrar suas preferências de tema (claro/escuro) e entender
                    como você navega no site. Você pode gerenciar suas preferências de cookies no nosso banner de consentimento
                    ou através do seu navegador.
                  </p>

                  <h2>8. Contato</h2>
                  <p>
                    Se tiver dúvidas ou quiser exercer os seus direitos em relação à proteção de dados, entre em contato conosco
                    através do e-mail: <strong>privacidade@bora-estudar.com.br</strong> <em>(substituir pelo e-mail oficial)</em>.
                  </p>
                </div>
              </div>
            )}

            {/* Document View - Terms of Use */}
            {privacyDocView === 'terms-of-use' && (
              <div className="space-y-6">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPrivacyDocView('list')}
                  className="mb-4"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
                <div className="dashboard-card p-6 sm:p-8 prose dark:prose-invert max-w-none">
                  <h1 className="text-3xl font-display font-black mb-2">Termos de Uso</h1>
                  <p className="text-sm text-muted-foreground mb-8">Última atualização: {new Date().toLocaleDateString('pt-BR')}</p>

                  <p>
                    Estes Termos de Uso (\"Termos\") regulam o acesso e o uso da plataforma <strong>Bora-Estudar</strong> (\"Plataforma\" ou \"Serviço\"). 
                    Ao acessar ou usar a Plataforma, você (\"Usuário\") concorda com estes Termos em sua totalidade.
                  </p>

                  <h2>1. O Serviço</h2>
                  <p>
                    O Bora-Estudar é uma plataforma digital que auxilia os usuários no planejamento, controle e acompanhamento de rotinas de estudo,
                    fornecendo recursos como cronogramas automáticos, cronômetro, modo pomodoro e dashboard de métricas. O Serviço é fornecido \"no estado
                    em que se encontra\" (as is), sem garantias implícitas de adequação a um fim específico.
                  </p>

                  <h2>2. Cadastro e Segurança da Conta</h2>
                  <ul>
                    <li>Para utilizar o Serviço, é necessário criar uma conta informando dados válidos e precisos.</li>
                    <li>Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que ocorrerem sob a sua conta.</li>
                    <li>O Bora-Estudar não se responsabiliza por perdas causadas pelo uso não autorizado de sua conta.</li>
                  </ul>

                  <h2>3. Regras de Conduta</h2>
                  <p>Ao utilizar o Bora-Estudar, o Usuário concorda em <strong>não</strong>:</p>
                  <ul>
                    <li>Utilizar o Serviço para qualquer fim ilegal, fraudulento ou não autorizado.</li>
                    <li>Realizar engenharia reversa, descompilar, copiar ou tentar extrair o código-fonte da Plataforma.</li>
                    <li>Sobrecarregar a infraestrutura do Serviço com envios automatizados (bots, scrapers).</li>
                    <li>Inserir dados maliciosos, vírus ou código que possa prejudicar o funcionamento da Plataforma.</li>
                  </ul>

                  <h2>4. Propriedade Intelectual</h2>
                  <p>
                    Todos os direitos de propriedade intelectual da Plataforma, incluindo, mas não se limitando a software, design, logos, textos e 
                    gráficos, são de propriedade exclusiva do Bora-Estudar. O acesso ao Serviço não lhe confere nenhum direito de propriedade sobre a Plataforma.
                  </p>

                  <h2>5. Isenção de Garantias e Responsabilidade</h2>
                  <p>
                    Embora trabalhemos continuamente para manter a plataforma segura e funcional, não garantimos que o Serviço estará disponível de forma 
                    ininterrupta ou livre de erros. O Bora-Estudar não será responsável por perdas de dados de cronogramas, falhas no acompanhamento de tempo, 
                    lucros cessantes ou danos indiretos resultantes do uso ou da incapacidade de usar o Serviço.
                  </p>

                  <h2>6. Suspensão e Encerramento</h2>
                  <p>
                    Podemos suspender ou encerrar a sua conta a qualquer momento, com ou sem aviso prévio, caso seja identificado o descumprimento destes 
                    Termos de Uso ou o uso indevido da plataforma. Você também pode excluir sua conta a qualquer momento nas configurações do seu perfil.
                  </p>

                  <h2>7. Alterações nestes Termos</h2>
                  <p>
                    Podemos atualizar estes Termos periodicamente. Quando fizermos alterações materiais, notificaremos você através de um aviso na plataforma 
                    ou pelo e-mail cadastrado. O uso contínuo do Serviço após a atualização constitui a sua aceitação dos novos Termos.
                  </p>

                  <h2>8. Contato</h2>
                  <p>
                    Para esclarecer quaisquer dúvidas sobre estes Termos de Uso, entre em contato através do e-mail: <strong>suporte@bora-estudar.com.br</strong> <em>(substituir pelo e-mail oficial)</em>.
                  </p>
                </div>
              </div>
            )}

            {/* Document List View */}
            {privacyDocView === 'list' && (
              <div className="space-y-6 max-w-2xl">
                <div className="dashboard-card p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/10 text-purple-500">
                      <Shield className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground">Legal</p>
                      <h3 className="text-2xl font-black tracking-tight text-foreground">Privacidade e Termos</h3>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={() => setPrivacyDocView('privacy-policy')}
                      className="w-full p-5 rounded-2xl bg-background/50 border border-border/50 hover:border-primary/30 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">Política de Privacidade</h4>
                          <p className="text-sm text-muted-foreground mt-0.5">Como coletamos, usamos e protegemos seus dados pessoais em conformidade com a LGPD.</p>
                        </div>
                        <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                      </div>
                    </button>

                    <button
                      onClick={() => setPrivacyDocView('terms-of-use')}
                      className="w-full p-5 rounded-2xl bg-background/50 border border-border/50 hover:border-primary/30 transition-colors text-left group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 shrink-0">
                          <Shield className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="text-lg font-bold text-foreground group-hover:text-primary transition-colors">Termos de Uso</h4>
                          <p className="text-sm text-muted-foreground mt-0.5">Regras de conduta, responsabilidades e condições para uso da plataforma.</p>
                        </div>
                        <FileText className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors opacity-0 group-hover:opacity-100" />
                      </div>
                    </button>
                  </div>
                </div>

                {/* Rights info */}
                <div className="dashboard-card p-6 bg-purple-500/5 border-purple-500/20">
                  <h4 className="text-lg font-bold text-purple-500 mb-3 flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Seus Direitos (Art. 18 LGPD)
                  </h4>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">✓ Confirmar a existência de tratamento de dados</li>
                    <li className="flex items-center gap-2">✓ Acessar os seus dados pessoais</li>
                    <li className="flex items-center gap-2">✓ Corrigir dados incompletos, inexatos ou desatualizados</li>
                    <li className="flex items-center gap-2">✓ Solicitar a anonimização, bloqueio ou eliminação</li>
                    <li className="flex items-center gap-2">✓ Solicitar a portabilidade dos dados</li>
                    <li className="flex items-center gap-2">✓ Revogar o consentimento a qualquer momento</li>
                  </ul>
                  <p className="text-xs text-muted-foreground/70 mt-4">
                    Entre em contato: privacidade@bora-estudar.com.br
                  </p>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };
  return (
    <>
      {/* MOBILE VIEW - Menu or Tab Content */}
      <div className="md:hidden min-h-screen bg-background flex flex-col">
        {/* If mobileTabContent is set, show that tab's content full-screen */}
        {mobileTabContent && (
          <div className="flex flex-col min-h-screen">
            {/* Header with back button */}
            <header className="flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
              <button
                onClick={() => { window.location.href = '/profile'; }}
                className="flex items-center justify-center w-10 h-10 rounded-xl text-muted-foreground hover:bg-secondary/50 transition-colors"
                aria-label="Voltar ao menu"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <h1 className="text-lg font-black tracking-tight text-foreground flex-1">
                {tabs.find(t => t.key === mobileTabContent)?.label}
              </h1>
              <div className="w-10" />
            </header>

            {/* Tab Content - Full screen */}
            <main className="flex-1 overflow-y-auto p-4 pb-24">
              {renderTabContent()}
            </main>
          </div>
        )}

        {/* Otherwise show the menu */}
        {!mobileTabContent && (
          <div className="min-h-screen bg-background flex flex-col">
            {/* Header */}
            <header className="pt-1 pb-2 px-4 border-b border-border/50 bg-background/95 backdrop-blur-sm sticky top-0 z-10">
              <h1 className="text-lg font-black tracking-tight text-foreground">Configurações</h1>
              <p className="text-xs text-muted-foreground mt-1">Gerencie sua conta e preferências</p>
            </header>

            {/* User Profile */}
            <div className="p-3 border-b border-border/50">
              <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-card border border-border/50">
                <Avatar className="h-10 w-10 bg-primary/20 text-primary border-2 border-primary">
                  <AvatarImage src={avatarUrlInput || user?.user_metadata?.avatar_url || undefined} className="object-cover" />
                  <AvatarFallback className="bg-primary/20 text-primary flex items-center justify-center">
                    <User className="h-5 w-5" fill="currentColor" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-foreground truncate">{userName}</h3>
                  <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                </div>
              </div>
            </div>

            {/* Nav Sections - Full screen menu */}
            <nav className="flex-1 p-2 space-y-0.5 overflow-y-auto" role="navigation" aria-label="Configurações do perfil">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setSearchParams({ tab: tab.key })}
                  className={cn(
                    'w-full px-3 py-3 rounded-xl text-left transition-all',
                    activeTab === tab.key
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-colors',
                      activeTab === tab.key
                        ? 'bg-primary/20 text-primary-foreground'
                        : 'text-muted-foreground'
                    )}>
                      {tab.icon}
                    </span>
                    <div className="flex-1 min-w-0 text-sm">
                      <span className={cn('font-bold truncate block', activeTab === tab.key ? 'text-primary-foreground' : '')}>
                        {tab.label}
                      </span>
                      <span className={cn('text-[11px] font-medium truncate block', activeTab === tab.key ? 'text-primary-foreground/80' : 'text-muted-foreground/70')}>
                        {tab.description}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </nav>

            {/* Logout */}
            <button
              onClick={() => logout()}
              className="w-full p-3 border-t border-border/50 text-red-500 hover:bg-red-500/10 rounded-xl text-left transition-colors mx-2 mb-4"
            >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 shrink-0">
              <LogOut className="w-5 h-5" />
            </span>
            <div className="flex-1 min-w-0 text-sm">
              <span className="font-bold truncate block">Sair da conta</span>
              <span className="text-[11px] font-medium truncate block text-muted-foreground/70">Encerrar sessão atual</span>
            </div>
          </div>
        </button>
      </div>
    )}
    </div>

      {/* DESKTOP VIEW - NEW LAYOUT */}
      <div className="hidden md:flex h-screen w-full overflow-hidden">
        {/* LEFT SIDEBAR - FIXED, EXACT VIEWPORT HEIGHT */}
        <aside className="w-[280px] flex-none border-r border-border/50 bg-background/50 backdrop-blur-sm h-screen flex flex-col flex-shrink-0">
          {/* Header - fixed at top */}
          <div className="p-4 border-b border-border/50 flex-shrink-0">
            <h2 className="text-lg font-black tracking-tight text-foreground">Configurações</h2>
            <p className="text-xs text-muted-foreground mt-1">Gerencie sua conta e preferências</p>
          </div>
         
          {/* Nav - takes remaining space */}
          <nav className="flex-1 p-2 space-y-0.5 flex flex-col min-h-0 overflow-y-auto" role="navigation" aria-label="Configurações do perfil">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                  activeTab === tab.key
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50 group'
                )}
                role="tab"
                aria-selected={activeTab === tab.key}
              >
                <span className={cn(
                  'flex h-9 w-9 items-center justify-center rounded-lg shrink-0 transition-colors',
                  activeTab === tab.key
                    ? 'bg-primary/20 text-primary-foreground'
                    : 'text-muted-foreground group-hover:text-foreground bg-transparent'
                )}>
                  {tab.icon}
                </span>
                <div className="flex-1 min-w-0 text-sm">
                  <span className={cn('font-bold truncate block', activeTab === tab.key ? 'text-primary-foreground' : 'group-hover:text-foreground')}>
                    {tab.label}
                  </span>
                  <span className={cn('text-[11px] font-medium truncate block', activeTab === tab.key ? 'text-primary-foreground/80' : 'text-muted-foreground/70')}>
                    {tab.description}
                  </span>
                </div>
              </button>
            ))}
          </nav>
         
          {/* Logout - fixed at bottom */}
          <div className="p-3 border-t border-border/50 flex-shrink-0">
            <button
              onClick={() => logout()}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-colors text-red-500 hover:bg-red-500/10"
              role="tab"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-lg text-red-500 shrink-0">
                <LogOut className="w-5 h-5" />
              </span>
              <div className="flex-1 min-w-0 text-sm">
                <span className="font-bold truncate block">Sair da conta</span>
                <span className="text-[11px] font-medium truncate block text-muted-foreground/70">Encerrar sessão atual</span>
              </div>
            </button>
          </div>
        </aside>

        {/* RIGHT CONTENT - ONLY THIS SCROLLS */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto">
          {/* Tab Header */}
          <div className="mb-6 pb-4 border-b border-border/50">
            {tabs.find(t => t.key === activeTab) && (
              <>
                <div className="flex items-center gap-3 mb-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      {tabs.find(t => t.key === activeTab)!.icon}
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground">
                      {tabs.find(t => t.key === activeTab)!.label}
                    </p>
                    <h1 className="text-2xl font-black tracking-tight text-foreground">
                      {tabs.find(t => t.key === activeTab)!.label}
                    </h1>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground ml-11">
                  {tabs.find(t => t.key === activeTab)!.description}
                </p>
              </>
            )}
          </div>

          {/* Tab Content - full width, no max-w constraint */}
          {renderTabContent()}
        </main>
      </div>
    </>
  );
}

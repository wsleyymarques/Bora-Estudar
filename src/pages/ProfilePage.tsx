import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, LogOut, Palette, Save, User } from 'lucide-react';
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

  const hasTemplates = templates.length > 0;
  const userEmail = user?.email || '';
  const sessionsCount = data.sessions.length;
  const subjectsCount = data.subjects.length;
  const streak = profile?.streak_current ?? 0;
  const dailyGoal = profile?.daily_goal_minutes ?? 60;

  useEffect(() => {
    setUserName(profile?.full_name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario');
    setAvatarUrlInput(profile?.avatar_url || user?.user_metadata?.avatar_url || '');
  }, [profile?.avatar_url, profile?.full_name, user]);

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

  return (
    <div className="space-y-6">
      <PageHeader
        badgeText="Perfil"
        badgeIcon={User}
        title="Seu perfil"
        description="Ajuste nome, avatar, tema e modo de visualizacao em uma pagina dedicada."
        action={
          <Button variant="outline" onClick={() => navigate('/')} className="h-11 rounded-[1.25rem] px-5">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar ao dashboard
          </Button>
        }
      />

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-12">
        <article className="dashboard-card xl:col-span-5 p-5 md:p-6 flex flex-col items-center text-center">
          <div className="relative mb-6">
            <Avatar className="h-32 w-32 border-4 border-card shadow-xl bg-card">
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

          <div className="w-full flex flex-col items-center">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground mb-2">
              Conta ativa
            </p>
            
            {isEditingName ? (
              <div className="flex w-full max-w-sm items-center gap-2 mb-2">
                <Input 
                  value={userName} 
                  onChange={(e) => setUserName(e.target.value)} 
                  className="h-10 rounded-xl text-center font-bold" 
                  autoFocus 
                  onKeyDown={(e) => { if (e.key === 'Enter') handleSave(); }}
                />
                <Button size="sm" variant="default" onClick={() => handleSave()} disabled={isSaving} className="h-10 rounded-xl px-4">
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
                  className="h-10 rounded-xl px-4"
                >
                  Cancelar
                </Button>
              </div>
            ) : (
              <div className="group flex items-center justify-center gap-3 mb-2">
                <h2 className="text-3xl font-black tracking-tight text-foreground">{userName || 'Usuario'}</h2>
                <button 
                  onClick={() => setIsEditingName(true)} 
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-2 rounded-full bg-muted text-muted-foreground hover:text-foreground hover:bg-muted/80"
                  aria-label="Editar nome"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                </button>
              </div>
            )}
            
            <p className="text-sm text-muted-foreground break-all">{userEmail}</p>

            <div className="mt-6 flex flex-wrap justify-center gap-2">
              <Badge variant="outline" className="rounded-full px-4 py-1.5 text-xs">
                {streak} dias de streak
              </Badge>
              <Badge variant="outline" className="rounded-full px-4 py-1.5 text-xs">
                {dailyGoal} min/dia
              </Badge>
            </div>
          </div>
        </article>

        <article className="dashboard-card xl:col-span-7 p-5 md:p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-muted-foreground">
                Visual
              </p>
              <h3 className="text-2xl font-black tracking-tight text-foreground">Tema e modo</h3>
            </div>
          </div>

          <div className="mt-5">
            <div className="space-y-3 max-w-sm">
              <p className="text-xs font-bold uppercase tracking-[0.25em] text-muted-foreground">Modo</p>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(THEME_MODE_LABELS) as ThemeMode[]).map((modeOption) => (
                  <button
                    key={modeOption}
                    type="button"
                    onClick={() => void setMode(modeOption)}
                    className={`h-11 rounded-2xl border text-xs font-bold transition-colors ${
                      mode === modeOption
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-border bg-background text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    {THEME_MODE_LABELS[modeOption]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-border/60 bg-background/80 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Sessoes</p>
              <p className="mt-2 text-3xl font-black">{sessionsCount}</p>
            </div>
            <div className="rounded-[1.5rem] border border-border/60 bg-background/80 p-4">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">Materias</p>
              <p className="mt-2 text-3xl font-black">{subjectsCount}</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">

            <Button variant="destructive" onClick={() => void logout()} className="h-11 rounded-2xl">
              <LogOut className="mr-2 h-4 w-4" />
              Sair da conta
            </Button>
          </div>
        </article>
      </section>
    </div>
  );
}

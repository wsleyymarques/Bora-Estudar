import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { ChevronLeft, Camera, User, Mail, Edit, Save, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function ProfileDataPage() {
  const { user, profile, updateProfile, refreshProfile, resetPassword } = useAuth();
  const navigate = useNavigate();

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');

  useEffect(() => {
    const defaultName = profile?.name || user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
    setEditName(defaultName);
    setEditEmail(user?.email || '');
  }, [profile, user]);

  const handleSave = async () => {
    if (!editName.trim()) {
      toast.error('O nome não pode ficar vazio.');
      return;
    }

    setIsSaving(true);
    try {
      // Update Name
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: editName.trim() },
      });
      if (authError) throw authError;

      const profileResult = await updateProfile({
        full_name: editName.trim(),
      });
      if (profileResult.error) throw new Error(profileResult.error);

      // Update Email if changed
      if (editEmail.trim() !== user?.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: editEmail.trim(),
        });
        if (emailError) throw emailError;
        toast.info('Verifique a caixa de entrada do novo e-mail para confirmar a alteração.');
      }

      await refreshProfile();
      toast.success('Dados atualizados com sucesso!');
      setIsEditing(false);
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao atualizar dados.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    if (!user?.email) return;
    const { error } = await resetPassword(user.email);
    if (error) {
      toast.error('Erro ao enviar email de redefinição.');
    } else {
      toast.success('Link de alteração de senha enviado para o seu e-mail!');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background relative -mx-4 -mt-20 md:mx-auto md:max-w-md md:mt-0 md:bg-transparent">
      {/* Header */}
      <div className="flex items-center px-4 pt-6 pb-4">
        <button 
          onClick={() => navigate('/profile')} 
          className="flex items-center gap-2 text-foreground font-semibold"
        >
          <ChevronLeft className="w-5 h-5" />
          <span>Perfil</span>
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-24">
        {/* Avatar Section */}
        <div className="flex justify-center mt-6 mb-8">
          <div className="relative">
            <Avatar className="h-28 w-28 bg-primary text-primary-foreground border-[3px] border-primary shadow-lg">
              <AvatarImage src={user?.user_metadata?.avatar_url || undefined} className="object-cover" />
              <AvatarFallback className="bg-primary text-primary-foreground flex items-center justify-center">
                <User className="h-12 w-12" fill="currentColor" />
              </AvatarFallback>
            </Avatar>
            <button className="absolute bottom-0 right-0 p-2 rounded-full bg-card border border-border/50 text-foreground shadow-sm">
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Title Section */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-xl font-bold text-foreground">
              Seus <span className="text-primary">dados</span>
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">Consulte ou altere seus dados</p>
          </div>
          {!isEditing ? (
            <button 
              onClick={() => setIsEditing(true)}
              className="p-2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Edit className="w-5 h-5" />
            </button>
          ) : (
            <button 
              onClick={() => setIsEditing(false)}
              className="px-3 py-1.5 text-sm font-semibold text-muted-foreground hover:bg-secondary/40 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          )}
        </div>

        {/* Form Fields */}
        <div className="space-y-4 mb-8">
          <div>
            <label className="text-xs font-semibold text-muted-foreground ml-1 mb-1.5 block">Nome</label>
            <div className="flex items-center gap-3 bg-card border border-border/50 rounded-xl p-3 focus-within:border-primary transition-colors">
              <User className="w-5 h-5 text-muted-foreground shrink-0" />
              {isEditing ? (
                <Input 
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-sm font-medium"
                />
              ) : (
                <span className="text-sm font-medium text-foreground truncate">{editName}</span>
              )}
            </div>
          </div>
          
          <div>
            <label className="text-xs font-semibold text-muted-foreground ml-1 mb-1.5 block">E-mail</label>
            <div className="flex items-center gap-3 bg-card border border-border/50 rounded-xl p-3 focus-within:border-primary transition-colors">
              <Mail className="w-5 h-5 text-muted-foreground shrink-0" />
              {isEditing ? (
                <Input 
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-sm font-medium"
                />
              ) : (
                <span className="text-sm font-medium text-foreground truncate">{editEmail}</span>
              )}
            </div>
          </div>
        </div>

        {isEditing && (
          <Button 
            onClick={handleSave} 
            disabled={isSaving}
            className="w-full rounded-xl h-12 font-bold shadow-md transition-transform active:scale-95"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-5 h-5 mr-2" />
                Salvar Alterações
              </>
            )}
          </Button>
        )}

        {!isEditing && (
          <div className="mt-8 space-y-3">
            <button 
              onClick={handleResetPassword}
              className="w-full py-4 rounded-xl bg-card border border-border/50 text-sm font-semibold text-foreground hover:bg-secondary/40 transition-colors"
            >
              Alterar senha (via e-mail)
            </button>
            <button 
              onClick={() => navigate('/privacidade')}
              className="w-full py-4 rounded-xl bg-card border border-border/50 text-sm font-semibold text-foreground hover:bg-secondary/40 transition-colors"
            >
              Tratamento de dados pessoais
            </button>
          </div>
        )}

      </div>
    </div>
  );
}

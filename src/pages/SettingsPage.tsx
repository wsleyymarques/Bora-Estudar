import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { LogOut, User } from 'lucide-react';

export default function SettingsPage() {
  const { user, logout } = useAuth();

  return (
    <div className="space-y-6 max-w-lg">
      <h1 className="text-2xl font-display font-bold text-foreground">Configurações</h1>

      <div className="glass-card p-5 space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="w-6 h-6 text-primary" />
          </div>
          <div>
            <p className="font-medium text-foreground">{user?.email?.split('@')[0]}</p>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
      </div>

      <div className="glass-card p-5 space-y-4">
        <h3 className="font-display font-semibold text-sm">Sobre</h3>
        <p className="text-sm text-muted-foreground">
          StudyTrack é um sistema de planejamento e acompanhamento de estudos.
          Organize suas matérias, acompanhe seu progresso e alcance seus objetivos.
        </p>
        <p className="text-xs text-muted-foreground">Versão 1.0.0</p>
      </div>

      <Button variant="outline" onClick={logout} className="w-full">
        <LogOut className="w-4 h-4 mr-2" /> Sair da conta
      </Button>
    </div>
  );
}

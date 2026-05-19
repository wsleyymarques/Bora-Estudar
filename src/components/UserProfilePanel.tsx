import React from 'react';
import { 
  Bell, 
  User, 
  Settings, 
  LogOut, 
  Shield, 
  Moon, 
  ChevronRight,
  Clock,
  Sparkles,
  Zap,
  CreditCard
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ResponsivePanel } from '@/components/generic/ResponsivePanel';
import { cn } from '@/lib/utils';

interface UserProfilePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UserProfilePanel({ isOpen, onClose }: UserProfilePanelProps) {
  const { user, signOut } = useAuth();
  
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';
  const userEmail = user?.email || '';

  const notifications = [
    { id: 1, title: 'Meta Diária!', description: 'Você atingiu 100% do planejado.', time: '2h atrás', color: 'text-green-500', bg: 'bg-green-500/10' },
    { id: 2, title: 'Próxima Aula', description: 'Cálculo I começa em 15 minutos.', time: '30min atrás', color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { id: 3, title: 'Novo Badge', description: 'Você ganhou o badge "Foco de Elite".', time: 'Ontem', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  ];

  return (
    <ResponsivePanel 
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()}
      size="md"
    >
      <div className="flex flex-col h-full bg-[#F8FAFC] relative overflow-hidden">
        {/* DECORATIVE BACKGROUND AURA */}
        <div className="absolute top-0 left-0 right-0 h-64 bg-gradient-to-br from-primary/20 via-blue-500/10 to-transparent pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

        {/* PROFILE HEADER - ULTRA STYLIZED */}
        <div className="relative p-8 pt-12 flex flex-col items-center text-center">
          <div className="relative mb-6">
            <div className="absolute inset-0 bg-gradient-to-tr from-primary to-blue-400 rounded-[2rem] blur-2xl opacity-20 scale-125 animate-pulse" />
            <Avatar className="h-24 w-24 border-4 border-white shadow-2xl rounded-[2rem]">
              <AvatarImage src={user?.user_metadata?.avatar_url} />
              <AvatarFallback className="bg-gradient-to-br from-slate-800 to-black text-white text-2xl font-black">
                {userName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-white rounded-2xl shadow-xl flex items-center justify-center border border-slate-100">
               <Zap className="w-4 h-4 text-yellow-500 fill-yellow-500" />
            </div>
          </div>
          
          <div className="space-y-1">
            <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight">{userName}</h2>
            <p className="text-sm text-slate-400 font-medium">{userEmail}</p>
          </div>

          <div className="mt-6 flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md rounded-2xl border border-white shadow-sm">
             <Sparkles className="w-3.5 h-3.5 text-primary" />
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">Membro Premium</span>
          </div>
        </div>

        {/* CONTENT SECTION */}
        <div className="flex-1 overflow-y-auto px-6 space-y-8 pb-8 custom-scrollbar">
          {/* NOTIFICATIONS - GLASS STYLE */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Notificações</h3>
              <div className="h-5 px-2 rounded-full bg-primary/10 text-primary text-[9px] font-black flex items-center justify-center uppercase">3 Novas</div>
            </div>
            
            <div className="space-y-3">
              {notifications.map((n) => (
                <div key={n.id} className="relative group overflow-hidden p-4 rounded-[1.5rem] bg-white border border-white shadow-sm hover:shadow-md transition-all">
                  <div className={cn("absolute left-0 top-0 bottom-0 w-1.5", n.bg.replace('/10', ''))} />
                  <div className="flex gap-4">
                    <div className={cn("w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner", n.bg)}>
                      <Bell className={cn("w-5 h-5", n.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start">
                        <h4 className="text-sm font-black text-slate-800 leading-none">{n.title}</h4>
                        <span className="text-[9px] font-bold text-slate-400 uppercase">{n.time}</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1.5 leading-snug line-clamp-2">{n.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MENU SECTION */}
          <div className="space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 px-2">Conta e Preferências</h3>
             <div className="grid grid-cols-1 gap-2">
                <MenuCard icon={<User className="text-blue-500" />} label="Perfil" sub="Editar dados" />
                <MenuCard icon={<CreditCard className="text-emerald-500" />} label="Assinatura" sub="Gerenciar plano" />
                <MenuCard icon={<Shield className="text-amber-500" />} label="Segurança" sub="Senha e 2FA" />
                <MenuCard icon={<Moon className="text-indigo-500" />} label="Tema Escuro" sub="Modo noturno" toggle />
                <MenuCard icon={<Settings className="text-slate-500" />} label="Configurações" sub="Geral do app" />
             </div>
          </div>
        </div>

        {/* LOGOUT FOOTER */}
        <div className="p-6 bg-white border-t border-slate-100 mt-auto">
          <Button 
            variant="ghost" 
            className="w-full h-14 rounded-3xl text-red-500 hover:text-red-600 hover:bg-red-50 font-black text-xs uppercase tracking-widest gap-3 transition-all active:scale-95"
            onClick={() => signOut()}
          >
            <LogOut className="w-5 h-5" />
            Encerrar Sessão
          </Button>
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

function MenuCard({ icon, label, sub, toggle }: { icon: React.ReactNode, label: string, sub: string, toggle?: boolean }) {
  return (
    <button className="w-full flex items-center justify-between p-4 rounded-[1.5rem] bg-white border border-transparent hover:border-slate-100 hover:shadow-sm transition-all group active:scale-[0.98]">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-2xl bg-slate-50 flex items-center justify-center group-hover:scale-110 transition-transform">
          {React.cloneElement(icon as React.ReactElement, { className: "w-5 h-5" })}
        </div>
        <div className="text-left">
          <h4 className="text-xs font-black text-slate-800">{label}</h4>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter mt-0.5">{sub}</p>
        </div>
      </div>
      {toggle ? (
        <div className="w-10 h-5 rounded-full bg-slate-100 relative p-1">
          <div className="w-3 h-3 rounded-full bg-white shadow-sm" />
        </div>
      ) : (
        <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
      )}
    </button>
  );
}

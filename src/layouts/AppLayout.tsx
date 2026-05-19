import { useNavigate, useLocation } from 'react-router-dom';
import React, { useState } from 'react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { CompactTimerPlayer } from '@/components/generic/compact-timer-player';
import { MobileBottomBar } from '@/components/generic/mobile-bottom-bar';
import { useAuth } from '@/contexts/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ChevronLeft, Bell, Search, Mail } from 'lucide-react';
import { cn } from '@/lib/utils';
import { UserProfilePanel } from '@/components/UserProfilePanel';

const routeMetadata: Record<string, { title: string; description: string }> = {
  '/': { title: 'Dashboard', description: 'Planeje, priorize e complete seus estudos com facilidade.' },
  '/plans': { title: 'Meus Planos de Estudo', description: 'Organize concursos, provas e disciplinas em uma visão conectada.' },
  '/plans/new': { title: 'Novo Plano de Estudos', description: 'Crie um plano guiado passo a passo para seus objetivos.' },
  '/subjects': { title: 'Minhas Matérias', description: 'Explore seu catálogo de disciplinas e tópicos de estudo.' },
  '/schedule': { title: 'Meu Cronograma', description: 'Acompanhe e organize suas sessões de estudo diárias e semanais.' },
  '/schedules': { title: 'Gerenciar Rotinas', description: 'Ajuste seus horários de estudo semanais e carga horária.' },
  '/templates': { title: 'Modelos de Estudo', description: 'Gerencie e utilize templates de estudo de alta eficiência.' },
  '/timer': { title: 'Cronômetro de Foco', description: 'Treine sua concentração e registre sessões produtivas.' },
  '/history': { title: 'Histórico de Estudos', description: 'Monitore todo o seu progresso acumulado ao longo da jornada.' },
  '/stats': { title: 'Métricas & Análise', description: 'Avalie seu progresso, metas e rendimento de estudos.' },
  '/settings': { title: 'Configurações do Sistema', description: 'Gerencie suas preferências de conta, e-mail, segurança e temas.' },
};

const getHeaderMetadata = (pathname: string) => {
  if (pathname === '/') return routeMetadata['/'];
  if (pathname === '/plans') return routeMetadata['/plans'];
  if (pathname === '/plans/new') return routeMetadata['/plans/new'];
  if (pathname.startsWith('/plans/')) return { title: 'Detalhes do Plano', description: 'Acompanhe seu progresso e tópicos pendentes.' };
  
  const matched = routeMetadata[pathname];
  if (matched) return matched;
  
  const segment = pathname.split('/').filter(Boolean)[0] || '';
  const title = segment ? segment.charAt(0).toUpperCase() + segment.slice(1) : 'StudyFlow';
  return { title, description: 'Seu assistente de estudos inteligente.' };
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const isSchedulePage = location.pathname.startsWith('/schedule');
  
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuário';

  // Hub roots where a "back" button doesn't make logical sense
  const topLevelRoutes = ['/', '/plans', '/schedule', '/stats', '/subjects', '/settings'];
  const showBackButton = !topLevelRoutes.includes(location.pathname);
  
  // Resolve page header metadata
  const pageMeta = getHeaderMetadata(location.pathname);

  return (
    <SidebarProvider>
      <div className={cn('workspace-canvas h-svh min-h-screen w-full overflow-hidden')}>
        <div
          className={cn(
            'flex h-svh min-h-screen w-full max-w-full',
          )}
        >
          <AppSidebar />
          <div className="flex h-svh min-h-screen min-w-0 flex-1 flex-col">
            <header className="h-16 w-full bg-card/95 border-b border-border/30 px-6 md:px-8 flex items-center justify-between gap-4 sticky top-0 z-10 shadow-sm backdrop-blur-md transition-all">
              {/* Left side actions (Logo, Sidebar & Back) + Intelligent Title & Description */}
              <div className="flex items-center gap-3.5 flex-1 min-w-0">
                {/* StudyFlow Brand Logo & Name */}
                <div 
                  onClick={() => navigate('/')} 
                  className="flex items-center gap-2 cursor-pointer group/logo shrink-0 mr-1"
                  title="Estudos Home"
                >
                  <div className="w-8.5 h-8.5 rounded-xl bg-gradient-to-tr from-primary/15 via-primary/5 to-transparent flex items-center justify-center text-primary shrink-0 border border-primary/25 shadow-sm transition-all duration-300 relative overflow-hidden">
                    <svg className="w-5 h-5 drop-shadow-[0_1px_2px_rgba(var(--primary-rgb),0.2)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                      <path d="M2 12h20" />
                    </svg>
                  </div>
                  <span className="font-display font-black text-base tracking-tight select-none bg-gradient-to-r from-foreground via-foreground/90 to-foreground/80 bg-clip-text text-transparent group-hover/logo:translate-x-0.5 transition-transform duration-200 hidden sm:block">
                    Study<span className="text-primary font-black relative drop-shadow-[0_2px_8px_rgba(var(--primary-rgb),0.15)]">Flow</span>
                  </span>
                </div>

                {/* Vertical Divider */}
                <div className="h-5 w-[1px] bg-border/30 mx-1 shrink-0 hidden sm:block" />

                <SidebarTrigger className="md:hidden rounded-full h-10 w-10 shrink-0 border border-border/30 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all" />
                
                {/* Back button (Only if not a top-level route) */}
                {showBackButton && (
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="rounded-full h-10 w-10 shrink-0 border border-border/30 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all animate-in fade-in slide-in-from-left-2 duration-300"
                    onClick={() => navigate(-1)}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                )}

                {/* Intelligent Page Header Metadata */}
                <div className="flex flex-col text-left min-w-0">
                  <h1 className="text-sm md:text-base font-black text-foreground tracking-tight leading-tight truncate">
                    {pageMeta.title}
                  </h1>
                  <p className="text-[10px] md:text-xs text-muted-foreground font-semibold leading-tight hidden sm:block mt-0.5 truncate max-w-[200px] md:max-w-[320px]">
                    {pageMeta.description}
                  </p>
                </div>
              </div>

              {/* Right side actions (Search, Mail, Notifications, Profile) */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Donezo Style Search Bar - Relocated to the right and made slightly smaller */}
                <div className="relative w-48 xl:w-56 hidden md:block">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground/60" />
                  <input 
                    type="text"
                    placeholder="Buscar tarefa..."
                    className="w-full h-9 pl-8 pr-10 bg-muted/40 border border-border/30 rounded-full text-xs font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                  <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-1 py-0.5 bg-card text-[8px] font-black text-muted-foreground/60 rounded border border-border/30 select-none hidden lg:inline-block pointer-events-none">⌘F</kbd>
                </div>

                {/* Mail icon button */}
                <button className="w-10 h-10 rounded-full bg-muted/40 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors relative border-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary absolute top-2.5 right-2.5" />
                  <Mail className="w-4.5 h-4.5" />
                </button>

                {/* Bell notification button */}
                <button 
                  onClick={() => setIsProfileOpen(true)}
                  className="w-10 h-10 rounded-full bg-muted/40 hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer transition-colors relative border-0"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 absolute top-2.5 right-2.5 animate-pulse" />
                  <Bell className="w-4.5 h-4.5" />
                </button>

                <div className="h-6 w-[1px] bg-border/40 mx-1" />

                {/* User Profile */}
                <div 
                  onClick={() => setIsProfileOpen(true)}
                  className="flex items-center gap-3 cursor-pointer group pl-1 py-1"
                >
                  <Avatar className="h-10 w-10 border border-border/40 shadow-sm shrink-0 rounded-full">
                    <AvatarImage src={user?.user_metadata?.avatar_url} className="rounded-full" />
                    <AvatarFallback className="bg-primary/10 text-primary text-[10px] font-black uppercase rounded-full">
                      {userName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>

                  <div className="text-left hidden lg:block max-w-[150px]">
                    <p className="text-xs font-black text-foreground leading-tight group-hover:text-primary transition-colors tracking-tight truncate">
                      {userName}
                    </p>
                    <p className="text-[9px] text-muted-foreground mt-0.5 font-bold truncate">
                      {user?.email || 'estudante@studyflow.com'}
                    </p>
                  </div>
                </div>
              </div>
            </header>
            <main
              className={cn(
                'min-h-0 flex-1 overflow-y-auto overflow-x-hidden',
                isSchedulePage
                  ? 'p-2 md:p-3 pb-[calc(6.75rem+env(safe-area-inset-bottom))]'
                  : 'p-3 md:p-4 lg:px-4 lg:pt-1 lg:pb-2 pb-[calc(6.75rem+env(safe-area-inset-bottom))]',
              )}
            >
              {children}
            </main>
            <MobileBottomBar />
            <CompactTimerPlayer variant="floating" />
          </div>
        </div>
      </div>
      
      <UserProfilePanel 
        isOpen={isProfileOpen} 
        onClose={() => setIsProfileOpen(false)} 
      />
    </SidebarProvider>
  );
}

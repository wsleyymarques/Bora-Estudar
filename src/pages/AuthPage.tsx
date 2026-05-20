import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { useAppTheme } from '@/contexts/AppThemeContext';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, signup, loginWithGoogle } = useAuth();
  const { resolvedTheme } = useTheme();
  const { templateKey } = useAppTheme();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (mode === 'login') {
      const { error } = await login(email, password);
      if (error) toast.error(error);
    } else {
      const { error } = await signup(email, password, name);
      if (error) toast.error(error);
      else toast.success('Conta criada! Verifique seu email se necessário.');
    }
    setLoading(false);
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    const { error } = await loginWithGoogle();
    if (error) {
      toast.error(error);
      setLoading(false);
    }
  };

  let logoSrc = '/logo-black.png';
  if (templateKey === 'cutie') {
    logoSrc = '/logo-pink.png';
  } else if (templateKey === 'padrao') {
    logoSrc = resolvedTheme === 'dark' ? '/logo-blue.png' : '/logo-navy.png';
  } else if (templateKey === 'minimalista') {
    logoSrc = resolvedTheme === 'dark' ? '/logo-white.png' : '/logo-black.png';
  } else {
    logoSrc = resolvedTheme === 'dark' ? '/logo-white.png' : '/logo-black.png';
  }

  return (
    <div className="h-screen w-full flex flex-col md:flex-row bg-background text-foreground relative overflow-hidden">
      
      {/* Top Left Logo - Big Brand */}
      <div className="absolute top-6 left-6 md:top-10 md:left-12 z-20 flex items-center">
        <img src={logoSrc} alt="BoraEstudar Logo" className="h-10 md:h-12 object-contain" />
      </div>

      {/* Left Column: Form Panel (50% width, centered content, scrollable if height is very small) */}
      <div className="w-full md:w-1/2 h-full flex flex-col justify-center px-6 sm:px-12 md:px-16 lg:px-24 py-24 relative z-10 bg-background overflow-y-auto">
        <div className="w-full max-w-md mx-auto space-y-8">
          {/* Header */}
          <div className="text-left space-y-2">
            <h1 className="text-3xl lg:text-4xl font-display font-black text-foreground tracking-tight leading-tight pt-4">
              {mode === 'login' ? 'Comece seus estudos' : 'Crie seu perfil'}
            </h1>
          </div>

          {/* Social Logins Grouped at the Top (Only Apple & Google) */}
          <div className="flex flex-col items-start gap-4">
            <div className="inline-flex items-center gap-6 px-6 py-3 rounded-full bg-muted border border-border shadow-sm">
              {/* Apple OAuth */}
              <button
                type="button"
                onClick={() => toast.info('OAuth Apple não configurado.')}
                className="text-foreground hover:opacity-85 transition-opacity focus:outline-none flex items-center justify-center"
                aria-label="Entrar com Apple"
              >
                <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.57 2.95-1.39z" />
                </svg>
              </button>

              {/* Google OAuth */}
              <button
                type="button"
                onClick={handleGoogleLogin}
                className="hover:opacity-85 transition-opacity focus:outline-none flex items-center justify-center"
                aria-label="Entrar com Google"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                </svg>
              </button>
            </div>
            
            <div className="flex items-center justify-start px-2">
              <span className="text-[10px] text-muted-foreground font-black uppercase tracking-widest">ou</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4 w-full">
            {mode === 'signup' && (
              <div className="space-y-1.5">
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome Completo"
                  className="h-12 rounded-2xl bg-slate-50/50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800 px-5 text-sm focus-visible:ring-primary text-foreground placeholder:text-muted-foreground/60 w-full shadow-sm"
                  required
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                className="h-12 rounded-2xl bg-slate-50/50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800 px-5 text-sm focus-visible:ring-primary text-foreground placeholder:text-muted-foreground/60 w-full shadow-sm"
                required
              />
            </div>

            <div className="space-y-1.5">
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha"
                  className="h-12 rounded-2xl bg-slate-50/50 dark:bg-zinc-950/40 border border-slate-200 dark:border-zinc-800 pl-5 pr-12 text-sm focus-visible:ring-primary text-foreground placeholder:text-muted-foreground/60 w-full shadow-sm"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {mode === 'login' && (
              <div className="flex justify-end text-xs px-1">
                <button
                  type="button"
                  onClick={() => toast.info('Redefinição de senha em desenvolvimento.')}
                  className="text-primary font-bold hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            <Button 
              type="submit" 
              className="w-full h-12 rounded-full font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md active:scale-[0.98] transition-all text-sm uppercase tracking-wider mt-2" 
              disabled={loading}
            >
              {mode === 'login' ? 'Entrar' : 'Cadastrar'}
            </Button>
          </form>

          {/* Footer toggle */}
          <p className="text-left text-xs font-semibold text-muted-foreground">
            {mode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-foreground font-bold hover:underline"
            >
              {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
            </button>
          </p>
        </div>
      </div>

      {/* Right Column: Graphic Panel (with padding and rounded corners, matches full viewport height) */}
      <div className="hidden md:flex w-1/2 h-full p-6 items-stretch relative">
        <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative shadow-lg">
          <img
            src="/login-graphic.png"
            alt="Estudo Ilustração"
            className="w-full h-full object-cover select-none pointer-events-none"
          />
          {/* Soft overlay gradient that handles light and dark background seamlessly */}
          <div className="absolute inset-0 bg-gradient-to-r from-background/15 to-transparent pointer-events-none" />
        </div>
      </div>

    </div>
  );
}

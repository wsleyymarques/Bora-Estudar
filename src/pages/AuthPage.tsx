import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useTheme } from 'next-themes';
import { FALLBACK_THEME_TEMPLATES } from '@/theme/presets';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, signup, loginWithGoogle } = useAuth();
  const { resolvedTheme } = useTheme();

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

  // Force 'padrao' theme on this page regardless of user's saved preference
  const padraoTemplate = FALLBACK_THEME_TEMPLATES.find(t => t.key === 'padrao') || FALLBACK_THEME_TEMPLATES[0];
  const effectiveMode = resolvedTheme === 'dark' ? 'dark' : 'light';
  const forceTokens = effectiveMode === 'dark' ? padraoTemplate.darkTokens : padraoTemplate.lightTokens;
  
  const styleVars = Object.fromEntries(
    Object.entries(forceTokens).map(([key, value]) => [`--${key}`, value])
  ) as React.CSSProperties;

  const logoSrc = '/bora-estudar-logo.png';

  return (
    <div 
      className="h-screen w-full flex flex-col md:flex-row bg-background text-foreground relative overflow-hidden"
      style={styleVars}
    >
      
      {/* Left Column: Form Panel */}
      <div className="w-full md:w-4/12 h-full flex flex-col justify-center px-6 sm:px-12 md:px-16 lg:px-24 py-24 relative z-10 bg-background overflow-y-auto">
        <div className="w-full max-w-sm mx-auto space-y-6 text-card-foreground">
          <div className="text-center space-y-4">
            <img src={logoSrc} alt="Bora-Estudar Logo" className="w-40 md:w-48 mx-auto" />
            <div>
              <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight">{mode === 'login' ? 'Comece seus estudos' : 'Crie seu perfil'}</h1>
              <p className="text-emerald-300 font-semibold text-lg md:text-xl">{mode === 'login' ? 'e conquiste seus objetivos' : ''}</p>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="flex-1 h-14 rounded-xl bg-card/40 border border-border flex items-center justify-center gap-3 text-base text-card-foreground"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
              </svg>
            </button>

            <button
              type="button"
              onClick={() => toast.info('OAuth Apple não configurado.')}
              className="flex-1 h-14 rounded-xl bg-card/40 border border-border flex items-center justify-center text-base text-card-foreground"
            >
              <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 4.17c.66-.81 1.11-1.93.99-3.06-1 .04-2.21.67-2.93 1.49-.62.69-1.16 1.84-1.01 2.96 1.12.09 2.27-.57 2.95-1.39z" />
              </svg>
            </button>
          </div>

          <div className="text-center text-sm uppercase text-muted-foreground">ou</div>

          <form onSubmit={handleSubmit} className="space-y-4 w-full">
            {mode === 'signup' && (
              <div>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Nome Completo"
                  className="h-14 rounded-xl bg-transparent border border-border px-4 text-base text-card-foreground placeholder:text-muted-foreground w-full"
                  required
                />
              </div>
            )}

            <div>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="E-mail"
                className="h-14 rounded-xl bg-transparent border border-border px-4 text-base text-card-foreground placeholder:text-muted-foreground w-full"
                required
              />
            </div>

            <div>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Senha"
                  className="h-14 rounded-xl bg-transparent border border-border pl-4 pr-12 text-base text-card-foreground placeholder:text-muted-foreground w-full"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-card-foreground focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
            </div>

            {mode === 'login' && (
              <div className="flex justify-end text-sm">
                <button
                  type="button"
                  onClick={() => toast.info('Redefinição de senha em desenvolvimento.')}
                  className="text-emerald-400 font-semibold hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-14 rounded-full font-bold bg-gradient-to-r from-emerald-400 to-emerald-600 text-card-foreground shadow-md active:scale-[0.98] transition-all text-base uppercase tracking-wider mt-2"
              disabled={loading}
            >
              {mode === 'login' ? 'Entrar' : 'Cadastrar'}
            </Button>
          </form>

          <p className="text-center text-base text-muted-foreground">
            {mode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
            <button
              type="button"
              onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
              className="text-emerald-400 font-semibold"
            >
              {mode === 'login' ? 'Cadastre-se' : 'Entrar'}
            </button>
          </p>
        </div>
      </div>

      {/* Right Column: Graphic Panel (with padding and rounded corners, matches full viewport height) */}
      <div className="hidden md:flex md:w-8/12 h-full p-6 items-stretch relative">
        <div className="w-full h-full rounded-[2.5rem] overflow-hidden relative shadow-lg">
          <img
            src="/teste100.png"
            alt="Estudo Ilustração"
            className="h-full w-auto max-w-none object-contain object-left select-none pointer-events-none bg-transparent block transform -translate-x-12 md:-translate-x-28 lg:-translate-x-40 xl:-translate-x-56"
          />
          {/* Soft overlay gradient that handles light and dark background seamlessly */}
          <div className="absolute inset-0 bg-gradient-to-r from-background/15 to-transparent pointer-events-none" />
        </div>
      </div>

    </div>
  );
}

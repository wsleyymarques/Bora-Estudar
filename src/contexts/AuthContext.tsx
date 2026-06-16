import React, { createContext, useCallback, useContext, useEffect, ReactNode, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { Database } from '@/integrations/supabase/types';

export type UserProfile = Database['public']['Tables']['profiles']['Row'];

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (email: string, password: string, fullName?: string) => Promise<{ error: string | null }>;
  loginWithGoogle: () => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfile: (payload: Partial<Database['public']['Tables']['profiles']['Update']>) => Promise<{ error: string | null }>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (userId?: string | null) => {
    if (!userId) {
      setProfile(null);
      return;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Erro ao carregar perfil:', error);
      setProfile(null);
      return;
    }

    setProfile(data);
  }, []);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      void fetchProfile(session?.user?.id ?? null);
      setLoading(false);
    });

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      void fetchProfile(session?.user?.id ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  const login = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signup = async (email: string, password: string, fullName?: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName || '' } },
    });
    return { error: error?.message ?? null };
  };

  const loginWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin,
      },
    });
    return { error: error?.message ?? null };
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const refreshProfile = useCallback(async () => {
    await fetchProfile(user?.id ?? null);
  }, [fetchProfile, user?.id]);

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    return { error: error?.message ?? null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error: error?.message ?? null };
  };

  const updateProfile = useCallback(async (payload: Partial<Database['public']['Tables']['profiles']['Update']>) => {
    if (!user) return { error: 'Usuário não autenticado.' };

    const { data, error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...payload }, { onConflict: 'id' })
      .select('*')
      .single();

    if (error) {
      console.error('Erro ao atualizar perfil:', error);
      return { error: error.message ?? 'Erro ao atualizar perfil.' };
    }

    setProfile(data);
    return { error: null };
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, session, profile, loading, login, signup, loginWithGoogle, logout, refreshProfile, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

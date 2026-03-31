import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  name: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem('studytrack_user');
    if (stored) setUser(JSON.parse(stored));
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const users = JSON.parse(localStorage.getItem('studytrack_users') || '[]');
    const found = users.find((u: any) => u.email === email && u.password === password);
    if (found) {
      const u = { id: found.id, name: found.name, email: found.email };
      setUser(u);
      localStorage.setItem('studytrack_user', JSON.stringify(u));
      return true;
    }
    return false;
  };

  const signup = async (name: string, email: string, password: string) => {
    const users = JSON.parse(localStorage.getItem('studytrack_users') || '[]');
    if (users.find((u: any) => u.email === email)) return false;
    const newUser = { id: crypto.randomUUID(), name, email, password };
    users.push(newUser);
    localStorage.setItem('studytrack_users', JSON.stringify(users));
    const u = { id: newUser.id, name, email };
    setUser(u);
    localStorage.setItem('studytrack_user', JSON.stringify(u));
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('studytrack_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

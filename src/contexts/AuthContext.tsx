import { createContext, useState, useEffect, ReactNode } from 'react';
import { User, Session, AuthResponse } from '../types/auth';

// Em produção (Vercel), a API está na mesma URL. Em dev, usa localhost:3001
const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
const SESSION_KEY = 'chathub_session';

interface TwoFAResponse {
  success: boolean;
  message?: string;
}

interface Setup2FAResponse {
  success: boolean;
  secret?: string;
  qrCode?: string;
  backupCodes?: string[];
  message?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  continueAsGuest: () => Promise<AuthResponse>;
  register: (email: string, password: string) => Promise<AuthResponse>;
  login: (email: string, password: string) => Promise<AuthResponse>;
  verify2FA: (tempToken: string, code: string) => Promise<AuthResponse>;
  setup2FA: (email: string) => Promise<Setup2FAResponse | null>;
  enable2FA: (email: string, code: string) => Promise<TwoFAResponse>;
  disable2FA: (email: string) => Promise<TwoFAResponse>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  console.log('🔵 [AuthProvider] RENDER - user:', user);

  // Carregar sessão do localStorage (síncrono e rápido)
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem(SESSION_KEY);
      if (savedSession) {
        const parsed: Session = JSON.parse(savedSession);
        
        // Verificar se a sessão não expirou
        if (parsed.expiresAt > Date.now()) {
          setSession(parsed);
          setUser({
            id: parsed.userId,
            email: parsed.email,
            isGuest: parsed.isGuest,
            has2FAEnabled: parsed.has2FAEnabled,
            createdAt: Date.now(),
          });
        } else {
          localStorage.removeItem(SESSION_KEY);
        }
      }
    } catch (error) {
      console.error('Error loading session:', error);
      localStorage.removeItem(SESSION_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  // Salvar sessão no localStorage
  const saveSession = (newSession: Session) => {
    console.log('🔵 [AuthProvider] Salvando no localStorage:', newSession);
    localStorage.setItem(SESSION_KEY, JSON.stringify(newSession));
    setSession(newSession);
    const newUser = {
      id: newSession.userId,
      email: newSession.email,
      isGuest: newSession.isGuest,
      has2FAEnabled: newSession.has2FAEnabled,
      createdAt: Date.now(),
    };
    console.log('🔵 [AuthProvider] Atualizando user state:', newUser);
    setUser(newUser);
  };

  // Criar sessão guest
  const continueAsGuest = async (): Promise<AuthResponse> => {
    try {
      console.log('🔵 [AuthProvider] Fazendo requisição para:', `${API_URL}/api/auth/guest`);
      const response = await fetch(`${API_URL}/api/auth/guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('🔵 [AuthProvider] Status da resposta:', response.status);
      const result: AuthResponse = await response.json();
      console.log('🔵 [AuthProvider] Resultado recebido:', result);
      
      if (result.success && result.session) {
        console.log('🔵 [AuthProvider] Salvando sessão:', result.session);
        saveSession(result.session);
      }
      
      return result;
    } catch (error) {
      console.error('🔴 [AuthProvider] Erro na sessão guest:', error);
      return {
        success: false,
        message: 'Failed to create guest session',
      };
    }
  };

  // Registrar
  const register = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result: AuthResponse = await response.json();
      
      if (result.success && result.session) {
        saveSession(result.session);
      }
      
      return result;
    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        message: 'Registration failed',
      };
    }
  };

  // Login
  const login = async (email: string, password: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const result: AuthResponse = await response.json();
      
      if (result.success && result.session) {
        saveSession(result.session);
      }
      
      return result;
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: 'Login failed',
      };
    }
  };

  // Verificar código 2FA
  const verify2FA = async (tempToken: string, code: string): Promise<AuthResponse> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/verify-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tempToken, code }),
      });

      const result: AuthResponse = await response.json();
      
      if (result.success && result.session) {
        saveSession(result.session);
      }
      
      return result;
    } catch (error) {
      console.error('2FA verification error:', error);
      return {
        success: false,
        message: '2FA verification failed',
      };
    }
  };

  // Setup 2FA
  const setup2FA = async (email: string) => {
    try {
      const response = await fetch(`${API_URL}/api/auth/setup-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      return await response.json();
    } catch (error) {
      console.error('Setup 2FA error:', error);
      return null;
    }
  };

  // Enable 2FA
  const enable2FA = async (email: string, code: string): Promise<TwoFAResponse> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/enable-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });

      const result = await response.json();
      
      if (result.success && user) {
        setUser({ ...user, has2FAEnabled: true });
      }
      
      return result;
    } catch (error) {
      console.error('Enable 2FA error:', error);
      return { success: false, message: 'Enable 2FA failed' };
    }
  };

  // Disable 2FA
  const disable2FA = async (email: string): Promise<TwoFAResponse> => {
    try {
      const response = await fetch(`${API_URL}/api/auth/disable-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();
      
      if (result.success && user) {
        setUser({ ...user, has2FAEnabled: false });
      }
      
      return result;
    } catch (error) {
      console.error('Disable 2FA error:', error);
      return { success: false, message: 'Disable 2FA failed' };
    }
  };

  // Logout
  const logout = async () => {
    try {
      if (session) {
        await fetch(`${API_URL}/api/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ sessionId: session.userId }),
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem(SESSION_KEY);
      setSession(null);
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        continueAsGuest,
        register,
        login,
        verify2FA,
        setup2FA,
        enable2FA,
        disable2FA,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

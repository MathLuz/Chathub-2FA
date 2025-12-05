import React, { useState } from 'react';
import { Mail, Lock, Loader2, AlertCircle, UserCircle, Sun, Moon } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

interface AuthProps {
  onSuccess: () => void;
  on2FARequired?: (tempToken: string) => void;
}

export function Auth({ onSuccess, on2FARequired }: AuthProps) {
  const { continueAsGuest, register, login } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const result = await login(email, password);
        
        if (!result.success) {
          throw new Error(result.message);
        }
        
        if (result.requires2FA && result.tempToken && on2FARequired) {
          on2FARequired(result.tempToken);
        } else {
          onSuccess();
        }
      } else {
        const result = await register(email, password);
        
        if (!result.success) {
          throw new Error(result.message);
        }
        
        setEmail('');
        setPassword('');
        alert('Account created successfully! You can now login.');
        setIsLogin(true);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleGuest = async () => {
    setLoading(true);
    setError('');
    
    try {
      console.log('🔵 [Frontend] Iniciando sessão guest...');
      const result = await continueAsGuest();
      console.log('🔵 [Frontend] Resultado da sessão guest:', result);
      
      if (!result.success) {
        console.error('🔴 [Frontend] Falha ao criar sessão guest:', result.message);
        throw new Error(result.message);
      }
      
      console.log('✅ [Frontend] Sessão guest criada, chamando onSuccess()');
      onSuccess();
    } catch (err) {
      console.error('🔴 [Frontend] Erro no handleGuest:', err);
      setError(err instanceof Error ? err.message : 'Failed to continue as guest');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 via-zinc-100 to-zinc-50 dark:from-zinc-900 dark:via-zinc-800 dark:to-zinc-900 flex items-center justify-center p-4 transition-colors duration-300">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl p-8 border-2 border-transparent relative before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:p-[2px] before:bg-gradient-to-br before:from-purple-500 before:via-blue-500 before:to-cyan-500">
          <div className="flex justify-between items-start mb-6">
            <div className="flex-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-2">ChatHub</h1>
              <p className="text-zinc-600 dark:text-zinc-400">Plataforma de Chat Multi-IA</p>
            </div>
            <button
              onClick={toggleTheme}
              type="button"
              className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-all hover:shadow-lg hover:shadow-purple-500/20 border border-transparent hover:border-purple-500/30"
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-white" />
              ) : (
                <Moon className="w-5 h-5 text-zinc-700" />
              )}
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Email</label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 text-zinc-400 dark:text-zinc-500 w-5 h-5" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none border border-zinc-300 dark:border-zinc-600 focus:border-purple-400 transition-colors placeholder:text-zinc-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Senha</label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 text-zinc-400 dark:text-zinc-500 w-5 h-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none border border-zinc-300 dark:border-zinc-600 focus:border-cyan-400 transition-colors placeholder:text-zinc-500"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <div className="relative rounded-lg p-[2px] bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600">
                <button
                type="submit"
                disabled={loading}
                className="w-full bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-900 disabled:bg-zinc-100 dark:disabled:bg-zinc-800/50 text-zinc-900 dark:text-white font-semibold py-2 rounded-md transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/20"
                >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {isLogin ? 'Entrar' : 'Criar Conta'}
                </button>
            </div>
          </form>

          <div className="mt-6 space-y-4">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-zinc-300 dark:border-zinc-600"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">Ou</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGuest}
              disabled={loading}
              className="w-full bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 disabled:bg-zinc-200/50 dark:disabled:bg-zinc-700/50 text-zinc-900 dark:text-white font-semibold py-2 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 border border-zinc-300 dark:border-zinc-600 hover:border-purple-500/50"
            >
              <UserCircle className="w-5 h-5" />
              Continuar como Visitante
            </button>

            <p className="text-zinc-600 dark:text-zinc-400 text-sm text-center">
              {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-transparent bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text hover:from-purple-300 hover:to-cyan-300 font-medium transition-all"
              >
                {isLogin ? 'Criar Conta' : 'Entrar'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

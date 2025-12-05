import React, { useState } from 'react';
import { Shield, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface Verify2FAProps {
  tempToken: string;
  onSuccess: () => void;
  onBack: () => void;
}

export function Verify2FA({ tempToken, onSuccess, onBack }: Verify2FAProps) {
  const { verify2FA } = useAuth();
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const result = await verify2FA(tempToken, code);
      
      if (!result.success) {
        throw new Error(result.message);
      }
      
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-900 via-zinc-800 to-zinc-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-zinc-800 rounded-2xl shadow-2xl p-8 border-2 border-transparent relative before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:p-[2px] before:bg-gradient-to-br before:from-purple-500 before:via-blue-500 before:to-cyan-500">
          <button
            onClick={onBack}
            className="mb-4 flex items-center gap-2 text-zinc-400 hover:text-transparent hover:bg-gradient-to-r hover:from-purple-400 hover:to-cyan-400 hover:bg-clip-text transition-all"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>

          <div className="flex items-center justify-center mb-6">
            <div className="bg-gradient-to-br from-purple-600/20 via-blue-600/20 to-cyan-600/20 p-4 rounded-full border border-blue-500/30">
              <Shield className="w-12 h-12 text-blue-400" />
            </div>
          </div>

          <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent mb-2 text-center">Autenticação de Dois Fatores</h1>
          <p className="text-zinc-400 text-center mb-8">
            Digite o código de 6 dígitos do seu app autenticador
          </p>

          <form onSubmit={handleVerify} className="space-y-4">
            <input
              type="text"
              placeholder="000000"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="w-full bg-zinc-700 text-white px-4 py-3 rounded-lg focus:outline-none border border-zinc-600 focus:border-cyan-400 text-center text-2xl tracking-widest transition-colors"
              autoFocus
              required
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Verificar
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

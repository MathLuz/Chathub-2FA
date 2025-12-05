import { useState } from 'react';
import { Copy, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

interface TwoFASetupProps {
  userEmail: string;
  onComplete: () => void;
  onSkip: () => void;
}

export function TwoFASetup({ userEmail, onComplete, onSkip }: TwoFASetupProps) {
  const { setup2FA, enable2FA } = useAuth();
  const [step, setStep] = useState<'intro' | 'verify' | 'backup'>('intro');
  const [secret, setSecret] = useState('');
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [qrCode, setQrCode] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerateSecret = async () => {
    setLoading(true);
    setError('');
    
    try {
      const result = await setup2FA(userEmail);
      
      if (!result || !result.success) {
        throw new Error(result?.message || 'Failed to setup 2FA');
      }
      
      setSecret(result.secret || '');
      setBackupCodes(result.backupCodes || []);
      setQrCode(result.qrCode || '');
      setStep('verify');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate secret');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const result = await enable2FA(userEmail, verificationCode);
      
      if (!result.success) {
        throw new Error(result.message || 'Invalid verification code');
      }

      setStep('backup');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-zinc-800 rounded-2xl shadow-2xl p-8 max-w-md w-full border-2 border-transparent relative before:absolute before:inset-0 before:-z-10 before:rounded-2xl before:p-[2px] before:bg-gradient-to-br before:from-purple-500 before:via-blue-500 before:to-cyan-500">
        {step === 'intro' && (
          <>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4">Proteja sua Conta</h2>
            <p className="text-zinc-300 mb-6">
              Habilite a autenticação de dois fatores para adicionar uma camada extra de segurança à sua conta.
            </p>
            <div className="space-y-3">
              <div className="relative rounded-lg p-[2px] bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600">
                <button
                  onClick={handleGenerateSecret}
                  disabled={loading}
                  className="w-full bg-zinc-800 hover:bg-zinc-900 disabled:bg-zinc-800/50 text-white font-semibold py-2 rounded-md transition-all duration-300 flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-purple-500/20"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Habilitar 2FA
                </button>
              </div>
              <button
                onClick={onSkip}
                className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-2 rounded-lg transition-all duration-300 border border-zinc-600 hover:border-purple-500/50"
              >
                Pular por Enquanto
              </button>
            </div>
          </>
        )}

        {step === 'verify' && (
          <>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4">Verifique sua Configuração</h2>
            <p className="text-zinc-300 mb-4">
              Escaneie este QR code com Google Authenticator ou Authy:
            </p>

            {qrCode && (
              <div className="bg-white p-4 rounded-lg mb-4 flex justify-center">
                <img src={qrCode} alt="QR Code" className="w-40 h-40" />
              </div>
            )}

            <p className="text-zinc-400 text-sm mb-2">Ou digite este código manualmente:</p>
            <div className="flex gap-2 mb-6">
              <input
                type="text"
                value={secret}
                readOnly
                className="flex-1 bg-zinc-700 text-white px-4 py-2 rounded-lg border border-zinc-600"
              />
              <button
                onClick={() => copyToClipboard(secret)}
                className="bg-zinc-700 hover:bg-zinc-600 text-white p-2 rounded-lg transition-colors"
              >
                {copied ? <Check className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
              </button>
            </div>

            <input
              type="text"
              placeholder="Digite o código de 6 dígitos"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              maxLength={6}
              className="w-full bg-zinc-700 text-white px-4 py-2 rounded-lg focus:outline-none border border-zinc-600 focus:border-cyan-400 mb-4 text-center text-2xl tracking-widest transition-colors"
            />

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 flex gap-2 mb-4">
                <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-500">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleVerifyCode}
                disabled={loading || verificationCode.length !== 6}
                className="w-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-2 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Verificar e Continuar
              </button>
              <button
                onClick={onSkip}
                className="w-full bg-zinc-700 hover:bg-zinc-600 text-zinc-300 font-semibold py-2 rounded-lg transition-all duration-300 border border-zinc-600 hover:border-zinc-500"
              >
                Cancelar e Fazer Depois
              </button>
            </div>
          </>
        )}

        {step === 'backup' && (
          <>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 via-blue-400 to-cyan-400 bg-clip-text text-transparent mb-4">Salvar Códigos de Backup</h2>
            <p className="text-zinc-300 mb-4">
              Salve estes códigos de backup em um local seguro. Você pode usá-los para acessar sua conta se perder o acesso ao seu autenticador.
            </p>

            <div className="bg-zinc-900 rounded-lg p-4 mb-6 space-y-2 max-h-48 overflow-y-auto">
              {backupCodes.map((code, idx) => (
                <div key={idx} className="text-zinc-300 font-mono text-sm">
                  {code}
                </div>
              ))}
            </div>

            <button
              onClick={() => copyToClipboard(backupCodes.join('\n'))}
              className="w-full mb-3 bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-2 rounded-lg transition-all duration-300 flex items-center justify-center gap-2 border border-zinc-600 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/10"
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              Copiar Todos os Códigos
            </button>

            <button
              onClick={onComplete}
              className="w-full bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 hover:from-purple-700 hover:via-blue-700 hover:to-cyan-700 text-white font-semibold py-2 rounded-lg transition-all duration-300 shadow-lg shadow-blue-500/20"
            >
              Concluir
            </button>
          </>
        )}
      </div>
    </div>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { Auth } from './components/Auth';
import { Verify2FA } from './components/Verify2FA';
import { Chat } from './components/Chat';
import { TwoFASetup } from './components/TwoFASetup';
import { logger } from './utils/logger';

type AppState = 'auth' | 'verify2fa' | '2fa-setup' | 'chat';

function App() {
  const { user, loading, logout } = useAuth();
  const [appState, setAppState] = useState<AppState>('auth');
  const [tempToken, setTempToken] = useState('');
  const [show2FASetup, setShow2FASetup] = useState(false);

  logger.log('🔵 [App] RENDER - user:', user, 'appState:', appState);

  // Redirecionar para chat se já tem sessão
  useEffect(() => {
    logger.log('🔵 [App] useEffect - user:', user?.email, 'has2FA:', user?.has2FAEnabled, 'appState:', appState);
    if (user && appState === 'auth') {
      logger.log('🔵 [App] Redirecionando para chat');
      setAppState('chat');

      // Se o usuário não é guest e não tem 2FA, oferecer setup
      if (!user.isGuest && !user.has2FAEnabled) {
        logger.log('🔵 [App] Mostrando setup 2FA (user.has2FAEnabled =', user.has2FAEnabled, ')');
        setShow2FASetup(true);
      } else {
        logger.log('🔵 [App] NÃO mostrando setup 2FA - isGuest:', user.isGuest, 'has2FA:', user.has2FAEnabled);
      }
    }
  }, [user, appState]);

  const handleAuthSuccess = () => {
    logger.log('🔵 [App] handleAuthSuccess chamado, user:', user);
    // Não mudamos o appState aqui! O useEffect vai fazer isso quando o user for atualizado
    // Apenas configuramos o 2FA setup se necessário (isso será verificado depois)
    logger.log('🔵 [App] Aguardando user state atualizar...');
  };

  const handle2FARequired = (token: string) => {
    setTempToken(token);
    setAppState('verify2fa');
  };

  const handle2FAVerified = () => {
    setAppState('chat');
  };

  const handleLogout = async () => {
    await logout();
    setAppState('auth');
    setShow2FASetup(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-900 flex items-center justify-center">
        <div className="text-white text-xl">Carregando...</div>
      </div>
    );
  }

  // Renderizar telas baseado no estado
  let mainContent;

  switch (appState) {
    case 'verify2fa':
      mainContent = (
        <Verify2FA
          tempToken={tempToken}
          onSuccess={handle2FAVerified}
          onBack={() => setAppState('auth')}
        />
      );
      break;

    case 'chat':
      mainContent = user ? (
        <Chat
          onLogout={handleLogout}
          onShow2FASetup={() => setShow2FASetup(true)}
        />
      ) : null;
      break;

    case 'auth':
    default:
      mainContent = (
        <Auth
          onSuccess={handleAuthSuccess}
          on2FARequired={handle2FARequired}
        />
      );
  }

  return (
    <div className="animate-fadeIn min-h-screen bg-white dark:bg-zinc-900 transition-colors duration-300">
      {mainContent}
      {show2FASetup && user && !user.isGuest && (
        <TwoFASetup
          userEmail={user.email}
          onComplete={() => {
            logger.log('✅ 2FA Setup completo!');
            setShow2FASetup(false);
          }}
          onSkip={() => {
            setShow2FASetup(false);
          }}
        />
      )}
    </div>
  );
}

export default App;

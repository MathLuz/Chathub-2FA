import { useState, useEffect } from 'react';
import { useAuth } from './hooks/useAuth';
import { Auth } from './components/Auth';
import { Verify2FA } from './components/Verify2FA';
import { Chat } from './components/Chat';
import { TwoFASetup } from './components/TwoFASetup';

type AppState = 'auth' | 'verify2fa' | '2fa-setup' | 'chat';

function App() {
  const { user, loading, logout } = useAuth();
  const [appState, setAppState] = useState<AppState>('auth');
  const [tempToken, setTempToken] = useState('');
  const [show2FASetup, setShow2FASetup] = useState(false);

  // Redirecionar para chat se já tem sessão
  useEffect(() => {
    if (user && appState === 'auth') {
      setAppState('chat');
    }
  }, [user, appState]);

  const handleAuthSuccess = () => {
    // Se o usuário não é guest e não tem 2FA, oferecer setup
    if (user && !user.isGuest && !user.has2FAEnabled) {
      setShow2FASetup(true);
    }
    setAppState('chat');
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
    <div className="animate-fadeIn">
      {mainContent}
      {show2FASetup && user && !user.isGuest && !user.has2FAEnabled && (
        <TwoFASetup
          userEmail={user.email}
          onComplete={() => {
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

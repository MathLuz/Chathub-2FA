import React, { useState } from 'react';
import { Conversation } from '../lib/chatHistory';
import { Plus, Trash2, LogOut, Shield, ShieldCheck } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { User } from '../types/auth';

interface SidebarProps {
  conversations: Conversation[];
  currentConversation: Conversation | null;
  onSelectConversation: (conv: Conversation) => void;
  onNewChat: () => void;
  onLogout: () => void;
  user: User | null;
  onClose: () => void;
  onShow2FASetup?: () => void;
}

export function Sidebar({
  conversations,
  currentConversation,
  onSelectConversation,
  onNewChat,
  onLogout,
  user,
  onClose,
  onShow2FASetup,
}: SidebarProps) {
  const { disable2FA } = useAuth();
  const [loading, setLoading] = useState(false);

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const data = localStorage.getItem('chat_conversations');
    const convs = data ? JSON.parse(data) : [];
    const filtered = convs.filter((c: Conversation) => c.id !== id);
    localStorage.setItem('chat_conversations', JSON.stringify(filtered));
    window.location.reload();
  };

  const handleToggle2FA = async () => {
    if (!user || user.isGuest) return;

    if (user.has2FAEnabled) {
      if (confirm('Tem certeza que deseja desabilitar 2FA?')) {
        setLoading(true);
        const result = await disable2FA(user.email);
        setLoading(false);

        if (result.success) {
          alert('2FA desabilitado com sucesso');
          window.location.reload();
        } else {
          alert('Falha ao desabilitar 2FA');
        }
      }
    } else if (onShow2FASetup) {
      onShow2FASetup();
    }
  };

  return (
    <div className="h-full flex flex-col touch-manipulation">
      <div className="p-3 md:p-4 border-b-2 border-transparent relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-gradient-to-r after:from-purple-500 after:via-blue-500 after:to-cyan-500">
        <button
          onClick={onNewChat}
          className="w-full bg-zinc-200 dark:bg-zinc-700 active:bg-zinc-300 dark:active:bg-zinc-600 text-zinc-900 dark:text-white font-semibold py-2.5 md:py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border border-zinc-300 dark:border-zinc-600 active:border-cyan-500/50 text-sm md:text-base"
        >
          <Plus className="w-4 h-4" />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-2 overscroll-contain">
        {conversations.map((conv) => (
          <div
            key={conv.id}
            className={`w-full text-left px-3 md:px-4 py-2.5 md:py-3 rounded-lg transition-all duration-200 group flex items-center justify-between cursor-pointer touch-manipulation ${currentConversation?.id === conv.id
                ? 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white border-l-2 border-purple-500 shadow-lg shadow-purple-500/10'
                : 'text-zinc-700 dark:text-zinc-300 active:bg-zinc-200 dark:active:bg-zinc-700 active:text-zinc-900 dark:active:text-white active:border-l-2 active:border-cyan-500/50 border-l-2 border-transparent'
              }`}
          >
            <div
              className="flex-1 min-w-0"
              onClick={() => {
                onSelectConversation(conv);
                onClose();
              }}
            >
              <p className="font-medium truncate text-sm md:text-base">{conv.title}</p>
              <p className="text-xs text-zinc-500 truncate">{conv.messages.length} messages</p>
            </div>
            <button
              onClick={(e) => handleDelete(conv.id, e)}
              className="md:opacity-0 md:group-hover:opacity-100 transition-opacity p-1.5 md:p-1 active:bg-red-600/20 rounded flex-shrink-0 touch-manipulation"
            >
              <Trash2 className="w-4 h-4 text-red-400" />
            </button>
          </div>
        ))}
      </div>

      <div className="border-t-2 border-transparent p-3 md:p-4 space-y-2 relative before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-purple-500 before:via-blue-500 before:to-cyan-500">
        {user && (
          <>
            <div className="px-3 md:px-4 py-2.5 md:py-3 bg-zinc-200 dark:bg-zinc-700 rounded-lg space-y-1 border border-zinc-300 dark:border-zinc-600">
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {user.isGuest ? 'Modo Visitante' : 'Conectado como:'}
              </p>
              <p className="text-xs md:text-sm font-medium truncate text-zinc-900 dark:text-white">{user.email}</p>
              {!user.isGuest && (
                <div className="flex items-center gap-2 text-xs mt-2">
                  {user.has2FAEnabled ? (
                    <>
                      <ShieldCheck className="w-3 h-3 text-green-400" />
                      <span className="text-green-400">2FA Habilitado</span>
                    </>
                  ) : (
                    <>
                      <Shield className="w-3 h-3 text-zinc-400" />
                      <span className="text-zinc-400">2FA Desabilitado</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {!user.isGuest && (
              <button
                onClick={handleToggle2FA}
                disabled={loading}
                className="w-full bg-zinc-200 dark:bg-zinc-700 active:bg-zinc-300 dark:active:bg-zinc-600 disabled:bg-zinc-200/50 dark:disabled:bg-zinc-700/50 text-zinc-900 dark:text-white font-semibold py-2.5 md:py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border border-zinc-300 dark:border-zinc-600 active:border-cyan-500/50 text-sm md:text-base touch-manipulation"
              >
                <Shield className="w-4 h-4" />
                {loading ? 'Carregando...' : user.has2FAEnabled ? 'Desabilitar 2FA' : 'Habilitar 2FA'}
              </button>
            )}
          </>
        )}
        <a
          href="https://github.com/MathLuz"
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-zinc-200 dark:bg-zinc-700 hover:bg-zinc-300 dark:hover:bg-zinc-600 text-zinc-900 dark:text-white font-semibold py-2.5 md:py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border border-zinc-300 dark:border-zinc-600 hover:border-purple-500/50 text-sm md:text-base touch-manipulation"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
          </svg>
          GitHub MathLuz
        </a>

        <button
          onClick={onLogout}
          className="w-full bg-red-600/10 active:bg-red-600/20 text-red-500 dark:text-red-400 font-semibold py-2.5 md:py-2 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 border border-red-600/30 active:border-red-500/50 text-sm md:text-base touch-manipulation"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
        
      </div>
    </div>
  );
}

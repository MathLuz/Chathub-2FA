import React, { useState, useEffect, useRef } from 'react';
import { Message, Conversation, createConversation, updateConversationTitle, getConversations, saveConversation } from '../lib/chatHistory';
import { Send, Loader2, PanelLeftCloseIcon, PanelLeftOpenIcon, Sun, Moon } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

const MODELS = [
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', provider: 'groq' },
  { id: 'allam-2-7b', name: 'Allam 2 7B', provider: 'groq' },
  { id: 'qwen/qwen3-32b', name: 'Qwen 3 32B', provider: 'groq' },
  { id: 'meta-llama/llama-4-maverick-17b-128e-instruct', name: 'Llama 4 Maverick 17B', provider: 'groq' },
  { id: 'meta-llama/llama-4-scout-17b-16e-instruct', name: 'Llama 4 Scout 17B', provider: 'groq' },
  { id: 'gemini-2.5-flash-lite', name: 'Gemini 2.5 Flash-Lite', provider: 'gemini' },
];

interface ChatProps {
  onLogout: () => void;
  onShow2FASetup?: () => void;
}

export function Chat({ onLogout, onShow2FASetup }: ChatProps) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Inicia fechado no mobile
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detecta se é mobile e ajusta sidebar
  useEffect(() => {
    const checkMobile = () => {
      const isMobile = window.innerWidth < 768;
      if (!isMobile) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);

  }, []);

  const isGuest = user?.isGuest ?? false;

  useEffect(() => {
    const loadConversations = () => {
      const convs = getConversations(isGuest);
      setConversations(convs);
      if (convs.length === 0) {
        const newConv = createConversation(MODELS[0].id);
        saveConversation(newConv, isGuest); // Salva imediatamente
        setConversations([newConv]);
        setCurrentConversation(newConv);
      } else {
        setCurrentConversation(convs[0]);
      }
    };

    loadConversations();
  }, [isGuest]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages, currentConversation?.messages?.length]);

  // Sincroniza o modelo selecionado quando troca de conversa
  useEffect(() => {
    if (currentConversation && currentConversation.model) {
      setSelectedModel(currentConversation.model);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentConversation?.id]);

  const handleNewChat = () => {
    const newConv = createConversation(selectedModel);
    saveConversation(newConv, isGuest); // Salva imediatamente
    // Recarrega as conversas do storage para garantir sincronização
    const allConversations = getConversations(isGuest);
    setConversations(allConversations);
    setCurrentConversation(newConv);
    setInput('');
  };

  const handleModelChange = (newModel: string) => {
    setSelectedModel(newModel);
    // Se há conversa atual, atualiza o modelo dela
    if (currentConversation) {
      const updatedConv = { ...currentConversation, model: newModel, updatedAt: Date.now() };
      setCurrentConversation(updatedConv);
      saveConversation(updatedConv, isGuest);
      // Atualiza na lista de conversas
      setConversations(conversations.map(c => c.id === updatedConv.id ? updatedConv : c));
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !currentConversation || loading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    const updatedConv = {
      ...currentConversation,
      messages: [...currentConversation.messages, userMessage],
    };

    setCurrentConversation(updatedConv);
    setInput('');
    setLoading(true);

    // Força scroll após adicionar mensagem
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    try {
      if (currentConversation.title === 'Novo chat' && currentConversation.messages.length === 0) {
        const title = input.slice(0, 50);
        updateConversationTitle(currentConversation.id, title, isGuest);
        updatedConv.title = title;
      }

      // Usa o modelo selecionado no dropdown (sempre atualiza)
      const activeModel = selectedModel;
      const modelInfo = MODELS.find(m => m.id === activeModel);
      const endpoint = modelInfo?.provider === 'gemini' ? '/api/chat/gemini' : '/api/chat/groq';

      // Atualiza o modelo da conversa
      updatedConv.model = activeModel;

      // Em produção (Vercel), usa URL relativa. Em dev, usa localhost:3001
      const baseUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:3001' : '');
      const apiUrl = `${baseUrl}${endpoint}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: updatedConv.messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          model: activeModel,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.message || `Erro na API (${response.status})`);
      }

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: Date.now(),
      };

      const finalConv = {
        ...updatedConv,
        messages: [...updatedConv.messages, assistantMessage],
      };

      setCurrentConversation(finalConv);
      saveConversation(finalConv, isGuest); // Salva a conversa completa
      // Atualiza na lista de conversas
      const updatedConversations = conversations.map(c => c.id === finalConv.id ? finalConv : c);
      setConversations(updatedConversations);

      // Força scroll após resposta
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus(); // Retorna foco ao input
      }, 100);
    } catch (error) {
      console.error('Error:', error);
      let errorText = 'Falha ao obter resposta';

      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          errorText = 'Não foi possível conectar à API. Verifique se o servidor está rodando em http://localhost:3001';
        } else {
          errorText = error.message;
        }
      }

      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Erro: ${errorText}`,
        timestamp: Date.now(),
      };
      const errorConv = {
        ...updatedConv,
        messages: [...updatedConv.messages, errorMessage],
      };
      setCurrentConversation(errorConv);
      saveConversation(errorConv, isGuest); // Salva a conversa completa
      // Atualiza na lista de conversas
      const updatedConversations = conversations.map(c => c.id === errorConv.id ? errorConv : c);
      setConversations(updatedConversations);

      // Força scroll após erro
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        inputRef.current?.focus(); // Retorna foco ao input
      }, 100);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white overflow-hidden">
      {/* Overlay para mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        ${sidebarOpen ? 'w-64 md:w-64' : 'w-0 md:w-0'}
        fixed md:relative z-50 md:z-auto
        h-full
        transition-all duration-300 ease-in-out
        ${sidebarOpen ? 'border-r border-zinc-300 dark:border-zinc-700' : ''}
        bg-zinc-50 dark:bg-zinc-800 flex flex-col overflow-hidden
      `}>
        {sidebarOpen && (
          <Sidebar
            conversations={conversations}
            currentConversation={currentConversation}
            onSelectConversation={setCurrentConversation}
            onNewChat={handleNewChat}
            onLogout={onLogout}
            user={user}
            onClose={() => setSidebarOpen(false)}
            onShow2FASetup={onShow2FASetup}
          />
        )}
      </div>

      <div className="flex-1 flex flex-col min-w-0 w-full">
        <div className="border-b-2 border-transparent bg-zinc-100 dark:bg-zinc-800 p-3 md:p-4 flex items-center justify-between relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-gradient-to-r after:from-purple-500 after:via-blue-500 after:to-cyan-500">
          <div className="flex items-center gap-2 md:gap-4 min-w-0 flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-all hover:shadow-lg hover:shadow-purple-500/20 border border-transparent hover:border-purple-500/30 text-zinc-900 dark:text-white flex-shrink-0"
            >
              {sidebarOpen ? <PanelLeftCloseIcon className="w-5 h-5" /> : <PanelLeftOpenIcon className="w-5 h-5" />}
            </button>
            <h1 className="text-base md:text-xl font-bold text-zinc-900 dark:text-white truncate">ChatHub - 2FA</h1>
          </div>
          <div className="flex items-center gap-2 md:gap-3 flex-shrink-0">
            <span className="text-zinc-700 dark:text-zinc-300 hidden md:inline">Modelo:</span>
            <select
              value={selectedModel}
              onChange={(e) => handleModelChange(e.target.value)}
              className="bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white px-2 md:px-3 py-1.5 md:py-2 rounded-lg focus:outline-none border border-zinc-300 dark:border-zinc-600 focus:border-cyan-400 transition-colors text-sm md:text-base max-w-[120px] md:max-w-none"
            >
              {MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
            <button
              onClick={toggleTheme}
              className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-all hover:shadow-lg hover:shadow-purple-500/20 border border-transparent hover:border-purple-500/30 flex-shrink-0"
              title={theme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
            >
              {theme === 'dark' ? (
                <Sun className="w-5 h-5 text-white" />
              ) : (
                <Moon className="w-5 h-5 text-zinc-700" />
              )}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 md:p-4 space-y-3 md:space-y-4">
          {currentConversation?.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center px-4">
                <h2 className="text-xl md:text-2xl font-bold mb-2 text-zinc-900 dark:text-white">Inicie uma nova conversa</h2>
                <p className="text-sm md:text-base text-zinc-600 dark:text-zinc-400">Escolha um modelo acima e digite sua primeira mensagem</p>
              </div>
            </div>
          ) : (
            currentConversation?.messages.map((message, idx) => (
              <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[85%] md:max-w-2xl px-3 md:px-4 py-2.5 md:py-3 rounded-lg ${message.role === 'user'
                    ? 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-900 dark:text-white border border-cyan-300 dark:border-cyan-800/50'
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 border border-zinc-300 dark:border-zinc-600'
                    }`}
                >
                  <p className="whitespace-pre-wrap break-words text-sm md:text-base">{message.content}</p>
                </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white px-3 md:px-4 py-2.5 md:py-3 rounded-lg flex gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm md:text-base">Pensando...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t-2 border-transparent bg-zinc-100 dark:bg-zinc-800 p-3 md:p-4 relative before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-purple-500 before:via-blue-500 before:to-cyan-500 safe-area-bottom">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              disabled={loading}
              className="flex-1 bg-zinc-200 dark:bg-zinc-700 text-zinc-900 dark:text-white px-3 md:px-4 py-2.5 md:py-3 rounded-lg focus:outline-none border border-zinc-300 dark:border-zinc-600 focus:border-purple-400 disabled:opacity-50 transition-colors placeholder:text-zinc-500 dark:placeholder:text-zinc-400 text-sm md:text-base"
            />
            {loading || !input.trim() ? (
              <button
                type="submit"
                disabled={true}
                className="bg-zinc-700 text-zinc-400 cursor-not-allowed px-4 md:px-6 py-2.5 md:py-3 rounded-lg flex items-center gap-2 transition-all duration-300 h-[42px] md:h-[50px] flex-shrink-0"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            ) : (
              <div className="relative rounded-lg p-[2px] bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 h-[42px] md:h-[50px] flex-shrink-0">
                <button
                  type="submit"
                  className="bg-zinc-900 hover:bg-zinc-800 text-white px-[18px] md:px-[22px] py-[9px] md:py-[11px] rounded-md flex items-center gap-2 transition-all duration-300 h-full hover:shadow-lg hover:shadow-purple-500/20"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
}

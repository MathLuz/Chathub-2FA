import React, { useState, useEffect, useRef } from 'react';
import { Message, Conversation, addMessageToConversation, createConversation, updateConversationTitle } from '../lib/chatHistory';
import { Send, Loader2, PanelLeftCloseIcon, PanelLeftOpenIcon } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { useAuth } from '../hooks/useAuth';

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
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] = useState<Conversation | null>(null);
  const [input, setInput] = useState('');
  const [selectedModel, setSelectedModel] = useState(MODELS[0].id);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {

    const loadConversations = () => {
      const data = localStorage.getItem('chat_conversations');
      const convs = data ? JSON.parse(data) : [];
      setConversations(convs);
      if (convs.length === 0) {
        const newConv = createConversation(MODELS[0].id);
        setConversations([newConv]);
        setCurrentConversation(newConv);
      } else {
        setCurrentConversation(convs[0]);
      }
    };

    loadConversations();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  const handleNewChat = () => {
    const newConv = createConversation(selectedModel);
    setCurrentConversation(newConv);
    setInput('');
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
    addMessageToConversation(currentConversation.id, userMessage);
    setInput('');
    setLoading(true);

    try {
      if (currentConversation.title === 'New Chat' && currentConversation.messages.length === 0) {
        const title = input.slice(0, 50);
        updateConversationTitle(currentConversation.id, title);
        updatedConv.title = title;
      }

      // Determinar qual endpoint usar baseado no provider do modelo
      const modelInfo = MODELS.find(m => m.id === (currentConversation.model || selectedModel));
      const endpoint = modelInfo?.provider === 'gemini' ? '/api/chat/gemini' : '/api/chat/groq';
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${endpoint}`;
      
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
          model: currentConversation.model || selectedModel,
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
      addMessageToConversation(currentConversation.id, assistantMessage);
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
      addMessageToConversation(currentConversation.id, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-zinc-900 text-white">
      <div className={`${sidebarOpen ? 'w-64' : 'w-0'} transition-all duration-300 ${sidebarOpen ? 'border-r border-zinc-700' : ''} bg-zinc-800 flex flex-col overflow-hidden`}>
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

      <div className="flex-1 flex flex-col">
        <div className="border-b-2 border-transparent bg-gradient-to-r from-zinc-800 via-zinc-800 to-zinc-800 p-4 flex items-center justify-between relative after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-gradient-to-r after:from-purple-500 after:via-blue-500 after:to-cyan-500">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-zinc-700 rounded-lg transition-all hover:shadow-lg hover:shadow-purple-500/20 border border-transparent hover:border-purple-500/30"
            >
              {sidebarOpen ? <PanelLeftCloseIcon className="w-5 h-5" /> : <PanelLeftOpenIcon className="w-5 h-5" />}
            </button>
            <h1 className="text-xl font-bold text-white">ChatHub - 2FA</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-zinc-300">Modelo:</span>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="bg-zinc-700 text-white px-3 py-2 rounded-lg focus:outline-none border border-zinc-600 focus:border-cyan-400 transition-colors"
            >
              {MODELS.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {currentConversation?.messages.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
          <h2 className="text-2xl font-bold mb-2">Inicie uma nova conversa</h2>
          <p className="text-zinc-400">Escolha um modelo acima e digite sua primeira mensagem</p>
              </div>
            </div>
          ) : (
            currentConversation?.messages.map((message, idx) => (
              <div key={idx} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
          <div
            className={`max-w-2xl px-4 py-3 rounded-lg ${message.role === 'user'
                ? 'bg-cyan-900/40 text-white border border-cyan-800/50'
                : 'bg-zinc-700 text-zinc-100 border border-zinc-600'
              }`}
          >
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          </div>
              </div>
            ))
          )}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-zinc-700 px-4 py-3 rounded-lg flex gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Pensando...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t-2 border-transparent bg-zinc-800 p-4 relative before:absolute before:top-0 before:left-0 before:right-0 before:h-[2px] before:bg-gradient-to-r before:from-purple-500 before:via-blue-500 before:to-cyan-500">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua mensagem..."
              disabled={loading}
              className="flex-1 bg-zinc-700 text-white px-4 py-3 rounded-lg focus:outline-none border border-zinc-600 focus:border-purple-400 disabled:opacity-50 transition-colors"
            />
            {loading || !input.trim() ? (
              <button
                type="submit"
                disabled={true}
                className="bg-zinc-700 text-zinc-400 cursor-not-allowed px-6 py-3 rounded-lg flex items-center gap-2 transition-all duration-300 h-[50px]"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            ) : (
              <div className="relative rounded-lg p-[2px] bg-gradient-to-r from-purple-600 via-blue-600 to-cyan-600 h-[50px]">
                <button
                  type="submit"
                  className="bg-zinc-900 hover:bg-zinc-800 text-white px-[22px] py-[11px] rounded-md flex items-center gap-2 transition-all duration-300 h-full hover:shadow-lg hover:shadow-purple-500/20"
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

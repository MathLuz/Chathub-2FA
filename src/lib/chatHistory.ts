export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  model: string;
  personality?: string; // id em src/lib/personalities.ts (opcional: conversas antigas não têm)
  createdAt: number;
  updatedAt: number;
}

// Tudo fica no localStorage, então sobrevive a um F5.
// Visitantes usam uma chave separada, apagada quando o visitante sai (logout).
const STORAGE_KEY = 'chat_conversations';
const GUEST_STORAGE_KEY = 'chat_conversations_guest';

const keyFor = (isGuest: boolean) => (isGuest ? GUEST_STORAGE_KEY : STORAGE_KEY);

export function getConversations(isGuest = false): Conversation[] {
  try {
    const data = JSON.parse(localStorage.getItem(keyFor(isGuest)) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeConversations(conversations: Conversation[], isGuest: boolean): void {
  try {
    localStorage.setItem(keyFor(isGuest), JSON.stringify(conversations));
  } catch (error) {
    // Ex.: armazenamento cheio ou bloqueado (aba anônima de alguns navegadores)
    console.error('Não foi possível salvar o histórico:', error);
  }
}

export function getConversation(id: string, isGuest = false): Conversation | undefined {
  return getConversations(isGuest).find((c) => c.id === id);
}

export function saveConversation(conversation: Conversation, isGuest = false): void {
  const conversations = getConversations(isGuest);
  const index = conversations.findIndex((c) => c.id === conversation.id);

  if (index >= 0) {
    conversations[index] = conversation;
  } else {
    conversations.push(conversation);
  }

  writeConversations(conversations, isGuest);
}

export function createConversation(model: string, personality?: string): Conversation {
  // Gera ID único com timestamp + random para evitar colisões
  const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  return {
    id: uniqueId,
    title: 'Novo chat',
    messages: [],
    model,
    personality,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function deleteConversation(id: string, isGuest = false): void {
  writeConversations(getConversations(isGuest).filter((c) => c.id !== id), isGuest);
}

// Chamado no logout do visitante: o próximo visitante neste navegador começa do zero.
export function clearGuestConversations(): void {
  try {
    localStorage.removeItem(GUEST_STORAGE_KEY);
  } catch {
    // ignora
  }
}

export function updateConversationTitle(id: string, title: string, isGuest = false): void {
  const conversation = getConversation(id, isGuest);
  if (conversation) {
    conversation.title = title;
    conversation.updatedAt = Date.now();
    saveConversation(conversation, isGuest);
  }
}

export function addMessageToConversation(id: string, message: Message, isGuest = false): void {
  const conversation = getConversation(id, isGuest);
  if (conversation) {
    conversation.messages.push(message);
    conversation.updatedAt = Date.now();
    saveConversation(conversation, isGuest);
  }
}

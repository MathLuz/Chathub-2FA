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
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'chat_conversations';
let guestConversations: Conversation[] = []; // Armazenamento temporário para guests

export function getConversations(isGuest = false): Conversation[] {
  if (isGuest) {
    return guestConversations;
  }
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function getConversation(id: string, isGuest = false): Conversation | undefined {
  const conversations = getConversations(isGuest);
  return conversations.find((c) => c.id === id);
}

export function saveConversation(conversation: Conversation, isGuest = false): void {
  if (isGuest) {
    const index = guestConversations.findIndex((c) => c.id === conversation.id);
    if (index >= 0) {
      guestConversations[index] = conversation;
    } else {
      guestConversations.push(conversation);
    }
    return;
  }

  const conversations = getConversations();
  const index = conversations.findIndex((c) => c.id === conversation.id);

  if (index >= 0) {
    conversations[index] = conversation;
  } else {
    conversations.push(conversation);
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
}

export function createConversation(model: string): Conversation {
  return {
    id: Date.now().toString(),
    title: 'New Chat',
    messages: [],
    model,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

export function deleteConversation(id: string, isGuest = false): void {
  if (isGuest) {
    guestConversations = guestConversations.filter((c) => c.id !== id);
    return;
  }
  const conversations = getConversations();
  const filtered = conversations.filter((c) => c.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
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

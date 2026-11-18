// Personalidades do modelo: instruções de sistema (system prompt) enviadas
// junto com cada mensagem para definir como a IA deve responder.
import type { LucideIcon } from 'lucide-react';
import { Sparkles, Zap, GraduationCap, Smile, Palette, Target, PenLine } from 'lucide-react';

export interface Personality {
  id: string;
  name: string;
  description: string;
  icon: LucideIcon;
  instructions: string;
  custom?: boolean; // criada pelo usuário
}

// Limites das personalidades criadas pelo usuário.
export const CUSTOM_NAME_MAX = 40;
export const CUSTOM_DESCRIPTION_MAX = 80;
export const CUSTOM_INSTRUCTIONS_MAX = 2000;

// Regras comuns a todas as personalidades.
const BASE = 'Responda sempre em português do Brasil, a menos que o usuário escreva em outro idioma. Use Markdown quando ajudar na leitura.';

export const PERSONALITIES: Personality[] = [
  {
    id: 'padrao',
    name: 'Padrão',
    description: 'Equilibrado e prestativo, para o dia a dia.',
    icon: Sparkles,
    instructions: `Você é um assistente prestativo, claro e educado. Dê respostas completas, mas sem enrolação. ${BASE}`,
  },
  {
    id: 'direto',
    name: 'Direto ao ponto',
    description: 'Respostas curtas e objetivas, sem rodeios.',
    icon: Zap,
    instructions: `Você é um assistente extremamente objetivo. Responda da forma mais curta possível, indo direto à resposta. Evite introduções, repetições e conclusões. Use listas curtas quando houver vários itens. Só aprofunde se o usuário pedir. ${BASE}`,
  },
  {
    id: 'professor',
    name: 'Professor',
    description: 'Explica passo a passo, com exemplos simples.',
    icon: GraduationCap,
    instructions: `Você é um professor paciente e didático. Explique os assuntos passo a passo, partindo do básico, com linguagem simples, analogias do cotidiano e exemplos práticos. Ao final, faça um breve resumo dos pontos principais. ${BASE}`,
  },
  {
    id: 'amigavel',
    name: 'Amigável',
    description: 'Tom leve e descontraído, como um amigo.',
    icon: Smile,
    instructions: `Você é um assistente amigável e descontraído, que conversa como um bom amigo. Use um tom leve, caloroso e informal, com bom humor quando couber, sem perder a utilidade e a precisão das respostas. ${BASE}`,
  },
  {
    id: 'criativo',
    name: 'Criativo',
    description: 'Ideias originais, textos e brainstorms.',
    icon: Palette,
    instructions: `Você é um assistente criativo e imaginativo. Proponha ideias originais e variadas, explore ângulos inesperados e escreva com estilo envolvente. Em pedidos de ideias, ofereça várias opções diferentes entre si. ${BASE}`,
  },
  {
    id: 'critico',
    name: 'Crítico',
    description: 'Analisa com rigor e aponta falhas e riscos.',
    icon: Target,
    instructions: `Você é um revisor crítico e honesto. Analise ideias, textos e planos com rigor: aponte falhas, riscos, suposições frágeis e pontos de melhoria, sempre com sugestões concretas. Não elogie sem motivo e não concorde só para agradar. ${BASE}`,
  },
];

export const DEFAULT_PERSONALITY_ID = PERSONALITIES[0].id;

// Conversas antigas não têm personalidade salva (ou têm uma que foi removida/apagada).
export const resolvePersonality = (id: string | undefined, custom: Personality[] = []): Personality =>
  PERSONALITIES.find((p) => p.id === id) ?? custom.find((p) => p.id === id) ?? PERSONALITIES[0];

// ---- Personalidades personalizadas ----
// Mesmo esquema das conversas (chatHistory.ts): localStorage para usuários logados,
// memória para visitantes (some ao recarregar a página).

interface StoredCustomPersonality {
  id: string;
  name: string;
  description: string;
  instructions: string;
}

const STORAGE_KEY = 'custom_personalities';
let guestCustom: StoredCustomPersonality[] = [];

const toPersonality = (p: StoredCustomPersonality): Personality => ({ ...p, icon: PenLine, custom: true });

function readStored(isGuest: boolean): StoredCustomPersonality[] {
  if (isGuest) return guestCustom;
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeStored(list: StoredCustomPersonality[], isGuest: boolean) {
  if (isGuest) {
    guestCustom = list;
  } else {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }
}

export function getCustomPersonalities(isGuest = false): Personality[] {
  return readStored(isGuest).map(toPersonality);
}

export interface CustomPersonalityInput {
  id?: string; // presente ao editar
  name: string;
  description: string;
  instructions: string;
}

// Cria ou atualiza uma personalidade. Retorna o id salvo.
export function saveCustomPersonality(input: CustomPersonalityInput, isGuest = false): string {
  const item: StoredCustomPersonality = {
    id: input.id || `custom-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    name: input.name.trim().slice(0, CUSTOM_NAME_MAX),
    description: input.description.trim().slice(0, CUSTOM_DESCRIPTION_MAX),
    instructions: input.instructions.trim().slice(0, CUSTOM_INSTRUCTIONS_MAX),
  };
  const list = readStored(isGuest);
  const index = list.findIndex((p) => p.id === item.id);
  writeStored(index >= 0 ? list.map((p) => (p.id === item.id ? item : p)) : [...list, item], isGuest);
  return item.id;
}

export function deleteCustomPersonality(id: string, isGuest = false): void {
  writeStored(readStored(isGuest).filter((p) => p.id !== id), isGuest);
}

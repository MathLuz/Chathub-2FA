// Integração com os provedores de LLM (Groq e Gemini).
// Compartilhado entre api/server.ts (dev) e api/index.ts (Vercel).
import type { Request, Response } from 'express';

export type Provider = 'groq' | 'gemini';

interface ModelConfig {
  provider: Provider;
  maxOutputTokens: number;
  // Groq: modelos gpt-oss aceitam include_reasoning; Qwen aceita reasoning_format.
  groqReasoning?: 'gpt-oss' | 'qwen';
  // Gemini 3.x: nível de "thinking" (tokens de raciocínio contam no limite de saída).
  geminiThinkingLevel?: 'minimal' | 'low' | 'medium' | 'high';
}

// Modelos permitidos. Mantenha em sincronia com MODELS em src/components/Chat.tsx.
// Foco em custo baixo: modelos pequenos/Flash-Lite, raciocínio mínimo e limite de saída enxuto.
export const MODEL_CONFIG: Record<string, ModelConfig> = {
  'openai/gpt-oss-20b': { provider: 'groq', maxOutputTokens: 2048, groqReasoning: 'gpt-oss' },
  'qwen/qwen3.8-27b': { provider: 'groq', maxOutputTokens: 2048, groqReasoning: 'qwen' },
  'openai/gpt-oss-120b': { provider: 'groq', maxOutputTokens: 2048, groqReasoning: 'gpt-oss' },
  'gemini-3.1-flash-lite': { provider: 'gemini', maxOutputTokens: 2048, geminiThinkingLevel: 'minimal' },
  'gemini-3.5-flash-lite': { provider: 'gemini', maxOutputTokens: 2048, geminiThinkingLevel: 'minimal' },
};

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

class LLMError extends Error {
  constructor(message: string, public status = 502) {
    super(message);
  }
}

// Remove mensagens de erro salvas no histórico e mensagens vazias,
// e junta mensagens consecutivas do mesmo papel (Gemini exige alternância).
export function sanitizeMessages(raw: unknown): ChatMessage[] {
  if (!Array.isArray(raw)) throw new LLMError('Messages array is required', 400);

  const result: ChatMessage[] = [];
  for (const m of raw) {
    if (!m || typeof m.content !== 'string') continue;
    const role = m.role === 'assistant' ? 'assistant' : 'user';
    const content = m.content.trim();
    if (!content || (role === 'assistant' && content.startsWith('❌ Erro:'))) continue;

    const last = result[result.length - 1];
    if (last && last.role === role) {
      last.content += `\n\n${content}`;
    } else {
      result.push({ role, content });
    }
  }

  // A conversa precisa começar e terminar com o usuário.
  while (result.length && result[0].role !== 'user') result.shift();
  if (!result.length || result[result.length - 1].role !== 'user') {
    throw new LLMError('A última mensagem deve ser do usuário', 400);
  }
  // Limita o histórico para não estourar contexto/limites do free tier.
  return result.slice(-30);
}

// Extrai uma mensagem legível do corpo de erro do provedor.
async function readProviderError(res: globalThis.Response, provider: string): Promise<LLMError> {
  const text = await res.text();
  let message = text;
  try {
    const json = JSON.parse(text);
    message = json?.error?.message || json?.message || text;
  } catch {
    /* corpo não é JSON */
  }
  if (res.status === 429) message = `Limite de requisições do ${provider} atingido. Tente de novo em alguns segundos.`;
  if (res.status === 404) message = `Modelo não encontrado no ${provider} (pode ter sido descontinuado): ${message}`;
  return new LLMError(`${provider}: ${message}`, res.status === 429 ? 429 : 502);
}

const stripThinking = (text: string) => text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

async function chatGroq(model: string, cfg: ModelConfig, messages: ChatMessage[], systemPrompt?: string) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new LLMError('GROQ_API_KEY not configured', 500);

  const body: Record<string, unknown> = {
    model,
    messages: systemPrompt ? [{ role: 'system', content: systemPrompt }, ...messages] : messages,
    temperature: 0.7,
    max_completion_tokens: cfg.maxOutputTokens,
  };
  if (cfg.groqReasoning === 'gpt-oss') {
    body.include_reasoning = false;
    body.reasoning_effort = 'low';
  } else if (cfg.groqReasoning === 'qwen') {
    body.reasoning_format = 'hidden';
  }

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw await readProviderError(res, 'Groq');

  const data = await res.json();
  const choice = data?.choices?.[0];
  const text = stripThinking(choice?.message?.content ?? '');
  if (!text) {
    throw new LLMError(
      choice?.finish_reason === 'length'
        ? 'Groq: resposta cortada pelo limite de tokens antes de gerar texto'
        : 'Groq: resposta vazia',
    );
  }
  return text;
}

async function chatGemini(model: string, cfg: ModelConfig, messages: ChatMessage[], systemPrompt?: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new LLMError('GEMINI_API_KEY not configured', 500);

  const generationConfig: Record<string, unknown> = {
    temperature: 0.7,
    maxOutputTokens: cfg.maxOutputTokens,
  };
  if (cfg.geminiThinkingLevel) {
    generationConfig.thinkingConfig = { thinkingLevel: cfg.geminiThinkingLevel };
  }

  const body: Record<string, unknown> = {
    contents: messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    })),
    generationConfig,
  };
  if (systemPrompt) body.systemInstruction = { parts: [{ text: systemPrompt }] };

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
      body: JSON.stringify(body),
    },
  );
  if (!res.ok) throw await readProviderError(res, 'Gemini');

  const data = await res.json();
  if (data?.promptFeedback?.blockReason) {
    throw new LLMError(`Gemini bloqueou a mensagem (${data.promptFeedback.blockReason})`);
  }
  const candidate = data?.candidates?.[0];
  const text = (candidate?.content?.parts ?? [])
    .filter((p: { text?: string; thought?: boolean }) => p.text && !p.thought)
    .map((p: { text: string }) => p.text)
    .join('')
    .trim();
  if (!text) {
    throw new LLMError(`Gemini: resposta vazia (finishReason: ${candidate?.finishReason ?? 'desconhecido'})`);
  }
  return text;
}

export async function chat(model: string, rawMessages: unknown, systemPrompt?: string): Promise<string> {
  const cfg = MODEL_CONFIG[model];
  if (!cfg) throw new LLMError(`Modelo não suportado: ${model}`, 400);
  const messages = sanitizeMessages(rawMessages);
  return cfg.provider === 'groq'
    ? chatGroq(model, cfg, messages, systemPrompt)
    : chatGemini(model, cfg, messages, systemPrompt);
}

// Handler Express único para /api/chat/groq, /api/chat/gemini e /api/chat.
// O provedor é decidido pelo modelo, não pela URL.
export async function chatHandler(req: Request, res: Response) {
  const { messages, model, systemPrompt } = req.body ?? {};
  const started = Date.now();
  try {
    const response = await chat(model, messages, systemPrompt);
    console.log(`✅ [chat] ${model} respondeu em ${Date.now() - started}ms`);
    res.json({ response });
  } catch (error) {
    const status = error instanceof LLMError ? error.status : 500;
    const message = error instanceof Error ? error.message : 'Chat request failed';
    console.error(`❌ [chat] ${model}: ${message}`);
    res.status(status).json({ error: message });
  }
}

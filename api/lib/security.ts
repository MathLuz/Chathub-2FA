// Proteções simples da API: limite de requisições (rate limit) e CORS.
// Compartilhado entre api/server.ts (dev) e api/index.ts (Vercel).
//
// Os contadores ficam no Redis (Upstash) para valer entre todas as instâncias
// serverless da Vercel. Sem Redis configurado, contam em memória (só no dev).
import type { Request, Response, NextFunction, RequestHandler } from 'express';
import type { CorsOptions } from 'cors';
import { redis } from '../services/redis.js';

interface Limit {
  max: number; // requisições permitidas...
  windowSeconds: number; // ...nessa janela de tempo
  perIp: boolean; // true = cada IP tem seu contador; false = contador global
  message: string;
}

// ===== Ajuste os limites aqui =====
export const LIMITS = {
  // Chat: cada IP pode mandar até 10 mensagens por minuto e 100 por dia.
  chatPerMinute: { max: 10, windowSeconds: 60, perIp: true, message: 'Muitas mensagens em pouco tempo. Espere um minuto e tente de novo.' },
  chatPerDay: { max: 100, windowSeconds: 86400, perIp: true, message: 'Você atingiu o limite diário de mensagens. Volte amanhã.' },
  // Teto global: protege a cota gratuita dos provedores mesmo se muitos IPs abusarem.
  chatGlobalPerDay: { max: 1000, windowSeconds: 86400, perIp: false, message: 'O chat atingiu o limite diário de uso. Volte amanhã.' },
  // Login, cadastro, 2FA e visitante: dificulta força bruta de senha e de código 2FA.
  authPer15Min: { max: 20, windowSeconds: 900, perIp: true, message: 'Muitas tentativas. Espere 15 minutos e tente de novo.' },
} satisfies Record<string, Limit>;

// Tamanho máximo do que o cliente pode enviar ao chat (em caracteres).
export const MAX_CHAT_INPUT_CHARS = 20_000;

function clientIp(req: Request): string {
  // Na Vercel, x-real-ip é definido pela própria plataforma (o cliente não consegue falsificar).
  const realIp = req.headers['x-real-ip'];
  if (typeof realIp === 'string' && realIp) return realIp;
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded) return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress || 'unknown';
}

export function rateLimit(name: string, ...limits: Limit[]): RequestHandler {
  return async (req: Request, res: Response, next: NextFunction) => {
    const ip = clientIp(req);
    try {
      for (const limit of limits) {
        const key = `${name}:${limit.windowSeconds}:${limit.perIp ? ip : 'global'}`;
        const count = await redis.incrementCounter(key, limit.windowSeconds);
        if (count > limit.max) {
          console.warn(`⛔ [rate-limit] ${name} bloqueado (${limit.perIp ? ip : 'global'}, ${count}/${limit.max})`);
          res.setHeader('Retry-After', String(limit.windowSeconds));
          return res.status(429).json({ success: false, error: limit.message, message: limit.message });
        }
      }
    } catch (error) {
      // Se o contador falhar, deixa passar em vez de derrubar o app.
      console.error('[rate-limit] falha ao contar requisição:', error);
    }
    next();
  };
}

export const chatRateLimit = rateLimit('chat', LIMITS.chatPerMinute, LIMITS.chatPerDay, LIMITS.chatGlobalPerDay);
export const authRateLimit = rateLimit('auth', LIMITS.authPer15Min);

// Exige uma sessão de usuário logado (não visitante) via cabeçalho
// "Authorization: Bearer <token>". A sessão fica em res.locals.session e o
// token em res.locals.sessionToken. Rotas protegidas devem usar o email da
// sessão, nunca um email vindo do corpo da requisição.
export const requireSession: RequestHandler = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  const session = token ? await redis.getSession(token) : null;
  if (!session || session.email === 'guest') {
    return res.status(401).json({ success: false, message: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
  res.locals.session = session;
  res.locals.sessionToken = token;
  next();
};

// CORS: em produção o frontend e a API estão no mesmo domínio, então nenhum
// outro site precisa de acesso. ALLOWED_ORIGINS (separado por vírgula) libera
// domínios extras se um dia o frontend ficar em outro endereço.
// Obs.: CORS só bloqueia navegadores em outros sites; quem chama via curl/script
// é contido pelo rate limit acima.
const extraOrigins = (process.env.ALLOWED_ORIGINS || '')
  .split(',')
  .map((o) => o.trim())
  .filter(Boolean);

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    const allowed =
      !origin || // mesmo domínio (sem cabeçalho Origin) ou ferramentas fora do navegador
      extraOrigins.includes(origin) ||
      (process.env.NODE_ENV !== 'production' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin));
    callback(null, allowed);
  },
};

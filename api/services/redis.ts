import { UserData, Session } from '../types/auth.js';

class RedisService {
  private baseUrl: string;
  private token: string;
  private memoryStore: Map<string, { value: string; expiresAt?: number }>;
  private isNode: boolean;

  constructor() {
    this.memoryStore = new Map();
    
    // Detecta se está rodando no Node.js (backend) ou no browser (frontend)
    this.isNode = typeof process !== 'undefined' && typeof process.env !== 'undefined';
    
    if (this.isNode) {
      // Backend: usa process.env (Upstash usa KV_* sem VITE_ prefix)
      this.baseUrl = process.env.KV_REST_API_URL || process.env.VITE_KV_REST_API_URL || process.env.VITE_REDIS_URL || '';
      this.token = process.env.KV_REST_API_TOKEN || process.env.VITE_KV_REST_API_TOKEN || '';
    } else {
      // Frontend: usa import.meta.env
      this.baseUrl = import.meta.env?.VITE_KV_REST_API_URL || import.meta.env?.VITE_REDIS_URL || '';
      this.token = import.meta.env?.VITE_KV_REST_API_TOKEN || '';
    }

    if (!this.baseUrl) {
      console.warn('Redis/KV URL not configured. Running in local mode with in-memory storage.');
    }
  }

  private isConfigured(): boolean {
    return !!this.baseUrl;
  }

  private async request(command: string, args: unknown[]): Promise<unknown> {
    // Sempre usar fallback local se não estiver configurado
    if (!this.isConfigured()) {
      return this.localStorageFallback(command, args);
    }

    try {
      const response = await fetch(this.baseUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([command, ...args]),
      });

      if (!response.ok) {
        throw new Error(`Redis error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.result;
    } catch (error) {
      console.error('Redis request failed:', error);
      // Fallback para localStorage/memoryStore em caso de erro
      return this.localStorageFallback(command, args);
    }
  }

  private localStorageFallback(command: string, args: unknown[]): unknown {
    const key = `redis:${args[0]}`;
    
    // Se estiver no Node.js, usa Map em memória
    if (this.isNode) {
      switch (command.toLowerCase()) {
        case 'set': {
          this.memoryStore.set(key, { value: String(args[1]) });
          return 'OK';
        }
        
        case 'get': {
          const entry = this.memoryStore.get(key);
          if (!entry) return null;
          
          // Verifica se expirou
          if (entry.expiresAt && entry.expiresAt < Date.now()) {
            this.memoryStore.delete(key);
            return null;
          }
          
          return entry.value;
        }
        
        case 'del':
          this.memoryStore.delete(key);
          return 1;
        
        case 'exists': {
          const entry = this.memoryStore.get(key);
          if (!entry) return 0;
          
          // Verifica se expirou
          if (entry.expiresAt && entry.expiresAt < Date.now()) {
            this.memoryStore.delete(key);
            return 0;
          }
          
          return 1;
        }
        
        case 'expire': {
          const entry = this.memoryStore.get(key);
          if (entry) {
            entry.expiresAt = Date.now() + ((args[1] as number) * 1000);
            this.memoryStore.set(key, entry);
          }
          return 1;
        }
        
        default:
          console.warn(`Command ${command} not supported in memory fallback`);
          return null;
      }
    }
    
    // Se estiver no browser, usa localStorage
    switch (command.toLowerCase()) {
      case 'set':
        localStorage.setItem(key, String(args[1]));
        return 'OK';
      
      case 'get':
        return localStorage.getItem(key);
      
      case 'del':
        localStorage.removeItem(key);
        return 1;
      
      case 'exists':
        return localStorage.getItem(key) ? 1 : 0;
      
      case 'expire': {
        // localStorage não suporta expiração, mas podemos simular
        const expireKey = `${key}:expires`;
        const expiresAt = Date.now() + ((args[1] as number) * 1000);
        localStorage.setItem(expireKey, expiresAt.toString());
        return 1;
      }
      
      default:
        console.warn(`Command ${command} not supported in localStorage fallback`);
        return null;
    }
  }

  // Métodos específicos para usuários
  async saveUser(email: string, userData: UserData): Promise<boolean> {
    try {
      const key = `user:${email.toLowerCase()}`;
      await this.request('SET', [key, JSON.stringify(userData)]);
      return true;
    } catch (error) {
      console.error('Error saving user:', error);
      return false;
    }
  }

  async getUser(email: string): Promise<UserData | null> {
    try {
      const key = `user:${email.toLowerCase()}`;
      const data = await this.request('GET', [key]);
      return data ? JSON.parse(data as string) : null;
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async userExists(email: string): Promise<boolean> {
    try {
      const key = `user:${email.toLowerCase()}`;
      const exists = await this.request('EXISTS', [key]);
      return exists === 1;
    } catch (error) {
      console.error('Error checking user existence:', error);
      return false;
    }
  }

  // Métodos para sessões
  async saveSession(sessionId: string, session: Session, expiresInSeconds: number = 86400): Promise<boolean> {
    try {
      const key = `session:${sessionId}`;
      await this.request('SET', [key, JSON.stringify(session)]);
      await this.request('EXPIRE', [key, expiresInSeconds]);
      return true;
    } catch (error) {
      console.error('Error saving session:', error);
      return false;
    }
  }

  async getSession(sessionId: string): Promise<Session | null> {
    try {
      const key = `session:${sessionId}`;
      const data = await this.request('GET', [key]);
      
      if (!data) return null;
      
      const session: Session = JSON.parse(data as string);
      
      // Verificar se a sessão expirou
      if (session.expiresAt < Date.now()) {
        await this.deleteSession(sessionId);
        return null;
      }
      
      return session;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const key = `session:${sessionId}`;
      await this.request('DEL', [key]);
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }

  // Métodos para tokens temporários (2FA)
  async saveTempToken(token: string, data: unknown, expiresInSeconds: number = 300): Promise<boolean> {
    try {
      const key = `temp:${token}`;
      await this.request('SET', [key, JSON.stringify(data)]);
      await this.request('EXPIRE', [key, expiresInSeconds]);
      return true;
    } catch (error) {
      console.error('Error saving temp token:', error);
      return false;
    }
  }

  async getTempToken(token: string): Promise<unknown | null> {
    try {
      const key = `temp:${token}`;
      const data = await this.request('GET', [key]);
      return data ? JSON.parse(data as string) : null;
    } catch (error) {
      console.error('Error getting temp token:', error);
      return null;
    }
  }

  async deleteTempToken(token: string): Promise<boolean> {
    try {
      const key = `temp:${token}`;
      await this.request('DEL', [key]);
      return true;
    } catch (error) {
      console.error('Error deleting temp token:', error);
      return false;
    }
  }
}

export const redis = new RedisService();

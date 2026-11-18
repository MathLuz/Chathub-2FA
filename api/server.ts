import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { authService } from './services/auth.js';
import { chatHandler } from './lib/llm.js';
import { chatRateLimit, authRateLimit, corsOptions } from './lib/security.js';
import { registerSessionRoutes } from './lib/sessionRoutes.js';
import { LoginRequest, RegisterRequest } from './types/auth.js';
import { logger } from './utils/logger.js';

// Desabilitar verificação SSL apenas em desenvolvimento (se necessário para Redis local)
// Comentado para evitar warning de segurança - descomente apenas se tiver problemas com SSL local
// if (process.env.NODE_ENV !== 'production') {
//   process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
// }

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));

// Limite de requisições por IP nas rotas de autenticação (anti força bruta)
app.use('/api/auth', authRateLimit);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Criar sessão guest
app.post('/api/auth/guest', async (_req: Request, res: Response) => {
  try {
    const result = await authService.createGuestSession();
    res.json(result);
  } catch (error) {
    console.error('Guest session error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create guest session',
    });
  }
});

// Registrar usuário
app.post('/api/auth/register', async (req: Request, res: Response) => {
  try {
    const data: RegisterRequest = req.body;
    const result = await authService.register(data);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
    });
  }
});

// Login
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const data: LoginRequest = req.body;
    const result = await authService.login(data);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
});

// Verificar código 2FA
app.post('/api/auth/verify-2fa', async (req: Request, res: Response) => {
  try {
    const { tempToken, code } = req.body;
    
    if (!tempToken || !code) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }
    
    const result = await authService.verify2FA(tempToken, code);
    
    if (!result.success) {
      return res.status(400).json(result);
    }
    
    res.json(result);
  } catch (error) {
    console.error('2FA verification error:', error);
    res.status(500).json({
      success: false,
      message: '2FA verification failed',
    });
  }
});

// 2FA e logout (exigem sessão de usuário logado)
registerSessionRoutes(app);

// Chat endpoints (provedor escolhido pelo modelo)
app.post(['/api/chat', '/api/chat/groq', '/api/chat/gemini'], chatRateLimit, chatHandler);

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Server error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 API Server running on http://localhost:${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
});

export default app;

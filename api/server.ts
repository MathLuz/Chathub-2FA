import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { authService } from './services/auth.js';
import { chatHandler } from './lib/llm.js';
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
app.use(cors());
app.use(express.json());

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

// Setup 2FA
app.post('/api/auth/setup-2fa', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }
    
    const result = await authService.setup2FA(email);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('Setup 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup 2FA',
    });
  }
});

// Habilitar 2FA
app.post('/api/auth/enable-2fa', async (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }
    
    const result = await authService.enable2FA(email, code);
    
    if (!result) {
      return res.status(400).json({
        success: false,
        message: 'Invalid code or failed to enable 2FA',
      });
    }
    
    res.json({
      success: true,
      message: '2FA enabled successfully',
    });
  } catch (error) {
    console.error('Enable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enable 2FA',
    });
  }
});

// Desabilitar 2FA
app.post('/api/auth/disable-2fa', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }
    
    const result = await authService.disable2FA(email);
    
    if (!result) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    res.json({
      success: true,
      message: '2FA disabled successfully',
    });
  } catch (error) {
    console.error('Disable 2FA error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable 2FA',
    });
  }
});

// Logout
app.post('/api/auth/logout', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required',
      });
    }
    
    const result = await authService.logout(sessionId);
    
    res.json({
      success: result,
      message: result ? 'Logged out successfully' : 'Logout failed',
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
});

// Chat endpoints (provedor escolhido pelo modelo)
app.post(['/api/chat', '/api/chat/groq', '/api/chat/gemini'], chatHandler);

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

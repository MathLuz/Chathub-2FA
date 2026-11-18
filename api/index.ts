// Versão serverless do backend para Vercel
import express from 'express';
import cors from 'cors';
import { authService } from './services/auth.js';
import { chatHandler } from './lib/llm.js';
import { chatRateLimit, authRateLimit, corsOptions } from './lib/security.js';
import { registerSessionRoutes } from './lib/sessionRoutes.js';
import type { LoginRequest, RegisterRequest } from './types/auth.js';

const app = express();

// Middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '100kb' }));

// Limite de requisições por IP nas rotas de autenticação (anti força bruta)
app.use('/api/auth', authRateLimit);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Criar sessão guest
app.post('/api/auth/guest', async (_req, res) => {
  console.log('📝 [POST /api/auth/guest] Criando sessão guest...');
  try {
    const result = await authService.createGuestSession();
    console.log('✅ [POST /api/auth/guest] Sessão guest criada com sucesso:', result.success);
    res.json(result);
  } catch (error) {
    console.error('❌ [POST /api/auth/guest] Erro ao criar sessão guest:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create guest session',
    });
  }
});

// Registrar usuário
app.post('/api/auth/register', async (req, res) => {
  console.log('📝 [POST /api/auth/register] Registrando usuário:', req.body.email);
  try {
    const data: RegisterRequest = req.body;
    const result = await authService.register(data);
    
    if (!result.success) {
      console.log('⚠️ [POST /api/auth/register] Registro falhou:', result.message);
      return res.status(400).json(result);
    }
    
    console.log('✅ [POST /api/auth/register] Usuário registrado com sucesso');
    res.json(result);
  } catch (error) {
    console.error('❌ [POST /api/auth/register] Erro no registro:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
    });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  console.log('📝 [POST /api/auth/login] Login de usuário:', req.body.email);
  try {
    const data: LoginRequest = req.body;
    const result = await authService.login(data);
    
    if (!result.success) {
      console.log('⚠️ [POST /api/auth/login] Login falhou:', result.message);
      return res.status(400).json(result);
    }
    
    console.log('✅ [POST /api/auth/login] Login bem-sucedido, requires2FA:', result.requires2FA || false);
    res.json(result);
  } catch (error) {
    console.error('❌ [POST /api/auth/login] Erro no login:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
    });
  }
});

// Verificar código 2FA
app.post('/api/auth/verify-2fa', async (req, res) => {
  console.log('📝 [POST /api/auth/verify-2fa] Verificando código 2FA...');
  try {
    const { tempToken, code } = req.body;
    
    if (!tempToken || !code) {
      console.error('❌ [POST /api/auth/verify-2fa] Erro: tempToken ou code não fornecido');
      return res.status(400).json({
        success: false,
        message: 'Missing required fields',
      });
    }
    
    const result = await authService.verify2FA(tempToken, code);
    
    if (!result.success) {
      console.error('❌ [POST /api/auth/verify-2fa] Código 2FA inválido');
      return res.status(400).json(result);
    }
    
    console.log('✅ [POST /api/auth/verify-2fa] Código 2FA verificado com sucesso');
    res.json(result);
  } catch (error) {
    console.error('❌ [POST /api/auth/verify-2fa] Erro geral:', error);
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

// Export para Vercel Serverless
// A Vercel automaticamente converte o Express app em função serverless
export default app;

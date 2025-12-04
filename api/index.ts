// Versão serverless do backend para Vercel
import express from 'express';
import cors from 'cors';
import { authService } from './services/auth.js';
import type { LoginRequest, RegisterRequest } from './types/auth.js';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

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

// Configurar 2FA
app.post('/api/auth/setup-2fa', async (req, res) => {
  console.log('📝 [POST /api/auth/setup-2fa] Configurando 2FA para:', req.body.email);
  try {
    const { email } = req.body;
    
    if (!email) {
      console.error('❌ [POST /api/auth/setup-2fa] Erro: email não fornecido');
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }
    
    const result = await authService.setup2FA(email);
    
    if (!result) {
      console.error('❌ [POST /api/auth/setup-2fa] Usuário não encontrado:', email);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    console.log('✅ [POST /api/auth/setup-2fa] 2FA configurado com sucesso para:', email);
    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('❌ [POST /api/auth/setup-2fa] Erro geral:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to setup 2FA',
    });
  }
});

// Habilitar 2FA
app.post('/api/auth/enable-2fa', async (req, res) => {
  console.log('📝 [POST /api/auth/enable-2fa] Habilitando 2FA para:', req.body.email);
  try {
    const { email, code } = req.body;
    
    if (!email || !code) {
      console.error('❌ [POST /api/auth/enable-2fa] Erro: email ou code não fornecido');
      return res.status(400).json({
        success: false,
        message: 'Email and code are required',
      });
    }
    
    const result = await authService.enable2FA(email, code);
    
    if (!result) {
      console.error('❌ [POST /api/auth/enable-2fa] Código inválido ou falha ao habilitar para:', email);
      return res.status(400).json({
        success: false,
        message: 'Invalid code or failed to enable 2FA',
      });
    }
    
    console.log('✅ [POST /api/auth/enable-2fa] 2FA habilitado com sucesso para:', email);
    res.json({
      success: true,
      message: '2FA enabled successfully',
    });
  } catch (error) {
    console.error('❌ [POST /api/auth/enable-2fa] Erro geral:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to enable 2FA',
    });
  }
});

// Desabilitar 2FA
app.post('/api/auth/disable-2fa', async (req, res) => {
  console.log('📝 [POST /api/auth/disable-2fa] Desabilitando 2FA para:', req.body.email);
  try {
    const { email } = req.body;
    
    if (!email) {
      console.error('❌ [POST /api/auth/disable-2fa] Erro: email não fornecido');
      return res.status(400).json({
        success: false,
        message: 'Email is required',
      });
    }
    
    const result = await authService.disable2FA(email);
    
    if (!result) {
      console.error('❌ [POST /api/auth/disable-2fa] Usuário não encontrado:', email);
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }
    
    console.log('✅ [POST /api/auth/disable-2fa] 2FA desabilitado com sucesso para:', email);
    res.json({
      success: true,
      message: '2FA disabled successfully',
    });
  } catch (error) {
    console.error('❌ [POST /api/auth/disable-2fa] Erro geral:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to disable 2FA',
    });
  }
});

// Logout
app.post('/api/auth/logout', async (req, res) => {
  console.log('📝 [POST /api/auth/logout] Fazendo logout da sessão:', req.body.sessionId);
  try {
    const { sessionId } = req.body;
    
    if (!sessionId) {
      console.error('❌ [POST /api/auth/logout] Erro: sessionId não fornecido');
      return res.status(400).json({
        success: false,
        message: 'Session ID is required',
      });
    }
    
    const result = await authService.logout(sessionId);
    
    if (result) {
      console.log('✅ [POST /api/auth/logout] Logout realizado com sucesso');
    } else {
      console.error('❌ [POST /api/auth/logout] Falha ao fazer logout');
    }
    
    res.json({
      success: result,
      message: result ? 'Logged out successfully' : 'Logout failed',
    });
  } catch (error) {
    console.error('❌ [POST /api/auth/logout] Erro geral:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
    });
  }
});

// Groq Chat endpoint
app.post('/api/chat/groq', async (req, res) => {
  console.log('💬 [POST /api/chat/groq] Requisição de chat, modelo:', req.body.model);
  try {
    const { messages, model, systemPrompt } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      console.log('⚠️ [POST /api/chat/groq] Messages array não fornecido');
      return res.status(400).json({
        error: 'Messages array is required',
      });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      console.error('❌ [POST /api/chat/groq] GROQ_API_KEY não configurada');
      return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
    }

    const messagesWithSystem = systemPrompt
      ? [{ role: 'system', content: systemPrompt }, ...messages]
      : messages;

    const apiResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${groqApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: messagesWithSystem,
        temperature: 0.7,
        max_tokens: 1024,
      }),
    });

    if (!apiResponse.ok) {
      const error = await apiResponse.text();
      console.error('❌ [POST /api/chat/groq] Erro na API Groq:', error);
      throw new Error(`Groq API error: ${error}`);
    }

    const data = await apiResponse.json();
    const response = data.choices[0].message.content;
    console.log('✅ [POST /api/chat/groq] Resposta gerada com sucesso');

    res.json({ response });
  } catch (error) {
    console.error('❌ [POST /api/chat/groq] Erro geral:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Groq chat request failed',
    });
  }
});

// Gemini Chat endpoint
app.post('/api/chat/gemini', async (req, res) => {
  console.log('📝 [POST /api/chat/gemini] Nova requisição de chat com modelo:', req.body.model);
  try {
    const { messages, model, systemPrompt } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      console.error('❌ [POST /api/chat/gemini] Erro: messages não fornecido ou inválido');
      return res.status(400).json({
        error: 'Messages array is required',
      });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    const allMessages = systemPrompt
      ? [{ role: 'user', content: systemPrompt }, ...messages]
      : messages;

    const contents = allMessages.map((msg: { role: string; content: string }) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }));

    const apiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: contents,
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 1024,
          },
        }),
      }
    );

    if (!apiResponse.ok) {
      const error = await apiResponse.text();
      console.error('❌ [POST /api/chat/gemini] Erro na API Gemini:', error);
      throw new Error(`Gemini API error: ${error}`);
    }

    const data = await apiResponse.json();
    const response = data.candidates[0].content.parts[0].text;
    console.log('✅ [POST /api/chat/gemini] Resposta gerada com sucesso');

    res.json({ response });
  } catch (error) {
    console.error('❌ [POST /api/chat/gemini] Erro geral:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Gemini chat request failed',
    });
  }
});

// Export para Vercel Serverless
// A Vercel automaticamente converte o Express app em função serverless
export default app;

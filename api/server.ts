import 'dotenv/config';
import express, { Request, Response } from 'express';
import cors from 'cors';
import { authService } from './services/auth.js';
import { LoginRequest, RegisterRequest } from './types/auth.js';

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

// Groq Chat endpoint
app.post('/api/chat/groq', async (req: Request, res: Response) => {
  try {
    const { messages, model, systemPrompt } = req.body;
    
    console.log('🤖 [GROQ] Requisição recebida - Modelo:', model);
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Messages array is required',
      });
    }

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
    }

    // Adicionar mensagem de sistema se fornecida
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
      throw new Error(`Groq API error: ${error}`);
    }

    const data = await apiResponse.json();
    const response = data.choices[0].message.content;

    console.log('✅ [GROQ] Resposta gerada com sucesso - Modelo:', model);
    res.json({ response });
  } catch (error) {
    console.error('Groq chat error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Groq chat request failed',
    });
  }
});

// Gemini Chat endpoint
app.post('/api/chat/gemini', async (req: Request, res: Response) => {
  try {
    const { messages, model, systemPrompt } = req.body;
    
    console.log('🧠 [GEMINI] Requisição recebida - Modelo:', model);
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({
        error: 'Messages array is required',
      });
    }

    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (!geminiApiKey) {
      return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
    }

    // Para Gemini, adicionar systemPrompt como primeira mensagem do usuário
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
      throw new Error(`Gemini API error: ${error}`);
    }

    const data = await apiResponse.json();
    const response = data.candidates[0].content.parts[0].text;

    console.log('✅ [GEMINI] Resposta gerada com sucesso - Modelo:', model);
    res.json({ response });
  } catch (error) {
    console.error('Gemini chat error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Gemini chat request failed',
    });
  }
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint not found',
  });
});

// Error handler
app.use((err: Error, _req: Request, res: Response) => {
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

// Rotas que mexem na conta do usuário logado (2FA e logout).
// Compartilhado entre api/server.ts (dev) e api/index.ts (Vercel).
//
// Todas exigem o token da sessão (Authorization: Bearer <token>) e usam o
// email gravado na sessão. Assim ninguém consegue mexer no 2FA de outra conta
// só sabendo o email dela.
import type { Express, Request, Response } from 'express';
import { authService } from '../services/auth.js';
import { requireSession } from './security.js';
import type { Session } from '../types/auth.js';

const sessionEmail = (res: Response) => (res.locals.session as Session).email;

export function registerSessionRoutes(app: Express) {
  // Gerar segredo + QR code do 2FA (ainda não ativa)
  app.post('/api/auth/setup-2fa', requireSession, async (_req: Request, res: Response) => {
    const email = sessionEmail(res);
    try {
      const result = await authService.setup2FA(email);
      if (!result) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      console.log('✅ [setup-2fa] 2FA configurado para:', email);
      res.json({ success: true, ...result });
    } catch (error) {
      console.error('❌ [setup-2fa]', error);
      res.status(500).json({ success: false, message: 'Failed to setup 2FA' });
    }
  });

  // Ativar 2FA confirmando um código do app autenticador
  app.post('/api/auth/enable-2fa', requireSession, async (req: Request, res: Response) => {
    const email = sessionEmail(res);
    try {
      const { code } = req.body ?? {};
      if (!code) {
        return res.status(400).json({ success: false, message: 'Code is required' });
      }
      const ok = await authService.enable2FA(email, String(code));
      if (!ok) {
        return res.status(400).json({ success: false, message: 'Invalid code or failed to enable 2FA' });
      }
      console.log('✅ [enable-2fa] 2FA habilitado para:', email);
      res.json({ success: true, message: '2FA enabled successfully' });
    } catch (error) {
      console.error('❌ [enable-2fa]', error);
      res.status(500).json({ success: false, message: 'Failed to enable 2FA' });
    }
  });

  // Desativar 2FA
  app.post('/api/auth/disable-2fa', requireSession, async (_req: Request, res: Response) => {
    const email = sessionEmail(res);
    try {
      const ok = await authService.disable2FA(email);
      if (!ok) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      console.log('✅ [disable-2fa] 2FA desabilitado para:', email);
      res.json({ success: true, message: '2FA disabled successfully' });
    } catch (error) {
      console.error('❌ [disable-2fa]', error);
      res.status(500).json({ success: false, message: 'Failed to disable 2FA' });
    }
  });

  // Logout: apaga a sessão do Redis (o token deixa de valer)
  app.post('/api/auth/logout', requireSession, async (_req: Request, res: Response) => {
    try {
      const ok = await authService.logout(res.locals.sessionToken as string);
      res.json({ success: ok, message: ok ? 'Logged out successfully' : 'Logout failed' });
    } catch (error) {
      console.error('❌ [logout]', error);
      res.status(500).json({ success: false, message: 'Logout failed' });
    }
  });
}

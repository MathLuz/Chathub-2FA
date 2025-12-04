import { redis } from './redis.js';
import { generateSecret, generateBackupCodes, verifyTOTP } from '../utils/totp.js';
import { hash, compare } from '../utils/bcrypt.js';
import { 
  UserData, 
  Session, 
  AuthResponse, 
  LoginRequest, 
  RegisterRequest,
  Setup2FAResponse 
} from '../types/auth.js';

class AuthService {
  private readonly SESSION_EXPIRY = 86400; // 24 horas em segundos
  private readonly TEMP_TOKEN_EXPIRY = 300; // 5 minutos

  // Gerar ID único
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substring(2, 15)}`;
  }

  // Criar sessão guest
  async createGuestSession(): Promise<AuthResponse> {
    const guestId = `guest-${this.generateId()}`;
    const session: Session = {
      userId: guestId,
      email: 'guest',
      isGuest: true,
      has2FAEnabled: false,
      expiresAt: Date.now() + (this.SESSION_EXPIRY * 1000),
    };

    const sessionId = this.generateId();
    await redis.saveSession(sessionId, session, this.SESSION_EXPIRY);

    return {
      success: true,
      message: 'Guest session created',
      user: {
        id: guestId,
        email: 'guest',
        isGuest: true,
        has2FAEnabled: false,
        createdAt: Date.now(),
      },
      session: {
        ...session,
      },
    };
  }

  // Registrar novo usuário
  async register(data: RegisterRequest): Promise<AuthResponse> {
    try {
      // Validar email
      if (!data.email || !data.email.includes('@')) {
        return {
          success: false,
          message: 'Invalid email address',
        };
      }

      // Validar senha
      if (!data.password || data.password.length < 6) {
        return {
          success: false,
          message: 'Password must be at least 6 characters',
        };
      }

      // Verificar se usuário já existe
      const exists = await redis.userExists(data.email);
      if (exists) {
        return {
          success: false,
          message: 'User already exists',
        };
      }

      // Hash da senha
      const passwordHash = await hash(data.password);

      // Criar dados do usuário
      const userData: UserData = {
        email: data.email.toLowerCase(),
        passwordHash,
        has2FAEnabled: false,
        createdAt: Date.now(),
      };

      // Salvar no Redis
      const saved = await redis.saveUser(data.email, userData);
      if (!saved) {
        return {
          success: false,
          message: 'Failed to save user',
        };
      }

      // Criar sessão
      const userId = this.generateId();
      const session: Session = {
        userId,
        email: data.email.toLowerCase(),
        isGuest: false,
        has2FAEnabled: false,
        expiresAt: Date.now() + (this.SESSION_EXPIRY * 1000),
      };

      const sessionId = this.generateId();
      await redis.saveSession(sessionId, session, this.SESSION_EXPIRY);

      return {
        success: true,
        message: 'User registered successfully',
        user: {
          id: userId,
          email: data.email.toLowerCase(),
          isGuest: false,
          has2FAEnabled: false,
          createdAt: userData.createdAt,
        },
        session,
      };
    } catch (error) {
      console.error('Register error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed',
      };
    }
  }

  // Login
  async login(data: LoginRequest): Promise<AuthResponse> {
    try {
      // Buscar usuário
      const userData = await redis.getUser(data.email);
      if (!userData) {
        return {
          success: false,
          message: 'Invalid credentials',
        };
      }

      // Verificar senha
      const passwordMatch = await compare(data.password, userData.passwordHash);
      if (!passwordMatch) {
        return {
          success: false,
          message: 'Invalid credentials',
        };
      }

      // Atualizar último login
      userData.lastLogin = Date.now();
      await redis.saveUser(data.email, userData);

      // Se 2FA está habilitado, retornar token temporário
      if (userData.has2FAEnabled) {
        const tempToken = this.generateId();
        await redis.saveTempToken(tempToken, {
          email: data.email.toLowerCase(),
          userId: this.generateId(),
        }, this.TEMP_TOKEN_EXPIRY);

        return {
          success: true,
          requires2FA: true,
          tempToken,
          message: 'Enter 2FA code',
        };
      }

      // Criar sessão
      const userId = this.generateId();
      const session: Session = {
        userId,
        email: data.email.toLowerCase(),
        isGuest: false,
        has2FAEnabled: userData.has2FAEnabled,
        expiresAt: Date.now() + (this.SESSION_EXPIRY * 1000),
      };

      const sessionId = this.generateId();
      await redis.saveSession(sessionId, session, this.SESSION_EXPIRY);

      return {
        success: true,
        message: 'Login successful',
        user: {
          id: userId,
          email: data.email.toLowerCase(),
          isGuest: false,
          has2FAEnabled: userData.has2FAEnabled,
          createdAt: userData.createdAt,
        },
        session,
      };
    } catch (error) {
      console.error('Login error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Login failed',
      };
    }
  }

  // Verificar código 2FA
  async verify2FA(tempToken: string, code: string): Promise<AuthResponse> {
    try {
      // Buscar token temporário
      const tempData = await redis.getTempToken(tempToken) as { email: string; userId: string } | null;
      if (!tempData) {
        return {
          success: false,
          message: 'Invalid or expired token',
        };
      }

      // Buscar usuário
      const userData = await redis.getUser(tempData.email);
      if (!userData || !userData.secret2FA) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      // Verificar código TOTP
      const isValid = verifyTOTP(userData.secret2FA, code);
      if (!isValid) {
        return {
          success: false,
          message: 'Invalid 2FA code',
        };
      }

      // Deletar token temporário
      await redis.deleteTempToken(tempToken);

      // Criar sessão
      const userId = this.generateId();
      const session: Session = {
        userId,
        email: tempData.email,
        isGuest: false,
        has2FAEnabled: true,
        expiresAt: Date.now() + (this.SESSION_EXPIRY * 1000),
      };

      const sessionId = this.generateId();
      await redis.saveSession(sessionId, session, this.SESSION_EXPIRY);

      return {
        success: true,
        message: '2FA verification successful',
        user: {
          id: userId,
          email: tempData.email,
          isGuest: false,
          has2FAEnabled: true,
          createdAt: userData.createdAt,
        },
        session,
      };
    } catch (error) {
      console.error('2FA verification error:', error);
      return {
        success: false,
        message: error instanceof Error ? error.message : '2FA verification failed',
      };
    }
  }

  // Setup 2FA
  async setup2FA(email: string): Promise<Setup2FAResponse | null> {
    try {
      const userData = await redis.getUser(email);
      if (!userData) {
        return null;
      }

      const secret = await generateSecret();
      const backupCodes = generateBackupCodes();
      const qrCode = `https://api.qrserver.com/v1/create-qr-code/?size=300&data=otpauth://totp/ChatHub:${email}?secret=${secret}&issuer=ChatHub`;

      // Salvar secret (ainda não verificado)
      userData.secret2FA = secret;
      userData.backupCodes = backupCodes;
      await redis.saveUser(email, userData);

      return {
        secret,
        qrCode,
        backupCodes,
      };
    } catch (error) {
      console.error('Setup 2FA error:', error);
      return null;
    }
  }

  // Verificar e habilitar 2FA
  async enable2FA(email: string, code: string): Promise<boolean> {
    try {
      const userData = await redis.getUser(email);
      if (!userData || !userData.secret2FA) {
        return false;
      }

      const isValid = verifyTOTP(userData.secret2FA, code);
      if (!isValid) {
        return false;
      }

      userData.has2FAEnabled = true;
      await redis.saveUser(email, userData);
      return true;
    } catch (error) {
      console.error('Enable 2FA error:', error);
      return false;
    }
  }

  // Desabilitar 2FA
  async disable2FA(email: string): Promise<boolean> {
    try {
      const userData = await redis.getUser(email);
      if (!userData) {
        return false;
      }

      userData.has2FAEnabled = false;
      userData.secret2FA = undefined;
      userData.backupCodes = undefined;
      await redis.saveUser(email, userData);
      return true;
    } catch (error) {
      console.error('Disable 2FA error:', error);
      return false;
    }
  }

  // Logout
  async logout(sessionId: string): Promise<boolean> {
    try {
      await redis.deleteSession(sessionId);
      return true;
    } catch (error) {
      console.error('Logout error:', error);
      return false;
    }
  }
}

export const authService = new AuthService();

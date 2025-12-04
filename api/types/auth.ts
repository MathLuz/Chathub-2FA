export interface User {
  id: string;
  email: string;
  isGuest: boolean;
  has2FAEnabled: boolean;
  createdAt: number;
}

export interface UserData {
  email: string;
  passwordHash: string;
  secret2FA?: string;
  has2FAEnabled: boolean;
  backupCodes?: string[];
  createdAt: number;
  lastLogin?: number;
}

export interface Session {
  userId: string;
  email: string;
  isGuest: boolean;
  has2FAEnabled: boolean;
  expiresAt: number;
}

export interface AuthResponse {
  success: boolean;
  message?: string;
  user?: User;
  session?: Session;
  requires2FA?: boolean;
  tempToken?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface Verify2FARequest {
  tempToken: string;
  code: string;
}

export interface Setup2FARequest {
  userId: string;
}

export interface Setup2FAResponse {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

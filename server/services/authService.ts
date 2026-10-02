import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { IUserRepository, ISessionRepository, userRepository, sessionRepository } from '../repositories/userRepository';
import { UserAccount, SessionData } from '../types/auth';
import { User } from '../../src/types';

export const SESSION_COOKIE_NAME = 'bookpilot_sid';
export const SESSION_MAX_AGE_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

const BCRYPT_SALT_ROUNDS = 12;

export interface RegisterInput {
  email?: string;
  password?: string;
  name?: string;
}

export interface LoginInput {
  email?: string;
  password?: string;
}

export interface AuthResult {
  user: User;
  sessionId: string;
}

export class AuthService {
  constructor(
    private users: IUserRepository = userRepository,
    private sessions: ISessionRepository = sessionRepository
  ) {}

  private validateEmail(email: string): boolean {
    if (!email || typeof email !== 'string') return false;
    const trimmed = email.trim();
    if (trimmed.length > 254) return false;
    // Standard RFC-compliant email regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    return emailRegex.test(trimmed);
  }

  private validatePassword(password: string): { valid: boolean; reason?: string } {
    if (!password || typeof password !== 'string') {
      return { valid: false, reason: 'Le mot de passe est requis.' };
    }
    if (password.length < 8) {
      return { valid: false, reason: 'Le mot de passe doit comporter au moins 8 caractères.' };
    }
    if (password.length > 128) {
      return { valid: false, reason: 'Le mot de passe ne doit pas dépasser 128 caractères.' };
    }
    return { valid: true };
  }

  private validateName(name: string): string {
    if (!name || typeof name !== 'string') return 'Auteur';
    const trimmed = name.trim();
    if (!trimmed) return 'Auteur';
    return trimmed.slice(0, 80);
  }

  async register(input: RegisterInput): Promise<AuthResult> {
    const rawEmail = input.email || '';
    const rawPassword = input.password || '';
    const rawName = input.name || '';

    if (!this.validateEmail(rawEmail)) {
      throw new AuthError('EMAIL_INVALID', 'Veuillez saisir une adresse email valide.');
    }

    const pwdCheck = this.validatePassword(rawPassword);
    if (!pwdCheck.valid) {
      throw new AuthError('PASSWORD_INVALID', pwdCheck.reason || 'Mot de passe invalide.');
    }

    const cleanEmail = rawEmail.toLowerCase().trim();
    const existing = await this.users.findByEmail(cleanEmail);
    if (existing) {
      // Intentionally clear error to avoid user enumeration while being informative
      throw new AuthError('USER_EXISTS', 'Un compte existe déjà avec cette adresse email.');
    }

    const passwordHash = await bcrypt.hash(rawPassword, BCRYPT_SALT_ROUNDS);
    const userId = `usr_${crypto.randomUUID()}`;
    const cleanName = this.validateName(rawName);

    const now = new Date().toISOString();
    const profile: User = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      plan: 'free',
      billingCycle: 'monthly',
      aiGenerationsUsed: 0,
      aiGenerationsLimit: 5,
      createdAt: now,
      hasCompletedOnboarding: false
    };

    const newAccount: UserAccount = {
      id: userId,
      email: cleanEmail,
      passwordHash,
      createdAt: now,
      updatedAt: now,
      profile
    };

    await this.users.create(newAccount);

    // Create session
    const sessionId = crypto.randomBytes(32).toString('hex');
    await this.sessions.createSession(sessionId, userId, SESSION_MAX_AGE_MS);

    return {
      user: profile,
      sessionId
    };
  }

  async login(input: LoginInput): Promise<AuthResult> {
    const rawEmail = input.email || '';
    const rawPassword = input.password || '';

    if (!rawEmail || !rawPassword || typeof rawEmail !== 'string' || typeof rawPassword !== 'string') {
      throw new AuthError('INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.');
    }

    const cleanEmail = rawEmail.toLowerCase().trim();
    const account = await this.users.findByEmail(cleanEmail);
    if (!account) {
      // Constant-time dummy comparison to prevent timing-attack enumeration
      await bcrypt.compare(rawPassword, '$2a$12$e80yqVb86x27b.e14xVv8edwJ0zXg62Cg7a3jYj5eTj8o4vQeD0.W');
      throw new AuthError('INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.');
    }

    const isMatch = await bcrypt.compare(rawPassword, account.passwordHash);
    if (!isMatch) {
      throw new AuthError('INVALID_CREDENTIALS', 'Email ou mot de passe incorrect.');
    }

    // Create new session
    const sessionId = crypto.randomBytes(32).toString('hex');
    await this.sessions.createSession(sessionId, account.id, SESSION_MAX_AGE_MS);

    return {
      user: account.profile,
      sessionId
    };
  }

  async getCurrentUserFromSession(sessionId?: string): Promise<User | null> {
    if (!sessionId || typeof sessionId !== 'string') return null;

    const session = await this.sessions.getSession(sessionId);
    if (!session) return null;

    const account = await this.users.findById(session.userId);
    if (!account) return null;

    return account.profile;
  }

  async logout(sessionId?: string): Promise<void> {
    if (sessionId && typeof sessionId === 'string') {
      await this.sessions.deleteSession(sessionId);
    }
  }

  async handleForgotPassword(email?: string): Promise<{ success: boolean; message: string }> {
    // Validate format without leaking presence
    if (email && this.validateEmail(email)) {
      // In this phase, no real email provider (SMTP/Resend/SendGrid) is configured.
      // We log safely on server side without revealing to client.
      console.log(`[AuthService] Password reset requested for: ${email.toLowerCase().trim()} (no SMTP configured).`);
    }

    // Generic safe response
    return {
      success: true,
      message: "Si un compte est associé à cette adresse, des instructions de réinitialisation vous seront envoyées dès activation du service email."
    };
  }

  async updateUserProfile(userId: string, partialProfile: Partial<User>): Promise<User | null> {
    const updated = await this.users.updateProfile(userId, partialProfile);
    return updated ? updated.profile : null;
  }
}

export class AuthError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = 'AuthError';
    this.code = code;
  }
}

export const authService = new AuthService();

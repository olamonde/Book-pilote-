import { User } from '../types';

export interface RegisterCredentials {
  email: string;
  password: string;
  name?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  success: boolean;
  user?: User;
  error?: string;
  message?: string;
}

export interface MeResponse {
  authenticated: boolean;
  user: User | null;
}

export class AuthService {
  /**
   * Check currently active session via secure HttpOnly cookie
   */
  static async getCurrentUser(): Promise<User | null> {
    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'same-origin'
      });

      if (!response.ok) {
        return null;
      }

      const data: MeResponse = await response.json();
      return data.authenticated && data.user ? data.user : null;
    } catch (err) {
      console.warn('[AuthService] Network error checking /api/auth/me:', err);
      return null;
    }
  }

  /**
   * Register with email, password, and optional author name
   */
  static async register(credentials: RegisterCredentials): Promise<{ user: User }> {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify(credentials)
    });

    const data: AuthResponse = await response.json();

    if (!response.ok || !data.success || !data.user) {
      const errorMsg = data.message || 'Échec de la création du compte.';
      throw new Error(errorMsg);
    }

    return { user: data.user };
  }

  /**
   * Login with email and password
   */
  static async login(credentials: LoginCredentials): Promise<{ user: User }> {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify(credentials)
    });

    const data: AuthResponse = await response.json();

    if (!response.ok || !data.success || !data.user) {
      const errorMsg = data.message || 'Identifiants incorrects.';
      throw new Error(errorMsg);
    }

    return { user: data.user };
  }

  /**
   * Terminate current server session and clear cookie
   */
  static async logout(): Promise<void> {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Accept': 'application/json'
        },
        credentials: 'same-origin'
      });
    } catch (err) {
      console.warn('[AuthService] Error during logout request:', err);
    }
  }

  /**
   * Request password reset instructions
   */
  static async forgotPassword(email: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'same-origin',
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    return {
      success: !!data.success,
      message: data.message || 'Demande traitée.'
    };
  }

  /**
   * Update profile fields on server for logged in user
   */
  static async updateProfile(partial: Partial<User>): Promise<User | null> {
    try {
      const response = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'same-origin',
        body: JSON.stringify(partial)
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.user || null;
    } catch {
      return null;
    }
  }
}

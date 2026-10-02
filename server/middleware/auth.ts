import { Request, Response, NextFunction } from 'express';
import { authService, SESSION_COOKIE_NAME } from '../services/authService.ts';
import { User } from '../../src/types/index.ts';

// Extend Express Request interface to include authenticated user
declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
    }
  }
}

/**
 * Extract authenticated user from secure HttpOnly session cookie
 */
export async function getAuthenticatedUser(req: Request): Promise<User | null> {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
  if (!sessionId || typeof sessionId !== 'string') {
    return null;
  }

  try {
    const user = await authService.getCurrentUserFromSession(sessionId);
    return user;
  } catch (err) {
    console.error('[Auth Middleware] Error getting user from session:', err);
    return null;
  }
}

/**
 * Strict authentication middleware: rejects unauthenticated or expired requests with HTTP 401
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction) {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
  if (!sessionId || typeof sessionId !== 'string') {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Authentification requise. Veuillez vous connecter pour accéder à cette ressource.'
    });
  }

  const user = await getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'UNAUTHORIZED',
      message: 'Session expirée ou invalide. Veuillez vous reconnecter.'
    });
  }

  // Attach verified user and session to request
  req.user = user;
  req.sessionId = sessionId;
  next();
}

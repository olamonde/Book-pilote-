import { Router, Request, Response, NextFunction } from 'express';
import {
  authService,
  AuthError,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE_MS
} from '../services/authService';

export const authRouter = Router();

// Helper to set session cookie
function setSessionCookie(res: Response, sessionId: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie(SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: isProduction, // Secure in production HTTPS
    sameSite: 'lax', // Lax works well with top-level navigations while protecting CSRF
    maxAge: SESSION_MAX_AGE_MS,
    path: '/'
  });
}

// Helper to clear session cookie
function clearSessionCookie(res: Response) {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'lax',
    path: '/'
  });
}

// POST /api/auth/register
authRouter.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, name } = req.body || {};
    const result = await authService.register({ email, password, name });
    setSessionCookie(res, result.sessionId);
    return res.status(201).json({
      success: true,
      user: result.user
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      const statusCode = err.code === 'USER_EXISTS' ? 409 : 400;
      return res.status(statusCode).json({
        success: false,
        error: err.code,
        message: err.message
      });
    }
    next(err);
  }
});

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body || {};
    const result = await authService.login({ email, password });
    setSessionCookie(res, result.sessionId);
    return res.json({
      success: true,
      user: result.user
    });
  } catch (err: any) {
    if (err instanceof AuthError) {
      return res.status(401).json({
        success: false,
        error: err.code,
        message: err.message
      });
    }
    next(err);
  }
});

// POST /api/auth/logout
authRouter.post('/logout', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    if (sessionId) {
      await authService.logout(sessionId);
    }
    clearSessionCookie(res);
    return res.json({
      success: true,
      message: 'Déconnexion réussie.'
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
authRouter.get('/me', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    if (!sessionId) {
      return res.json({
        authenticated: false,
        user: null
      });
    }

    const user = await authService.getCurrentUserFromSession(sessionId);
    if (!user) {
      // Session has expired or is invalid
      clearSessionCookie(res);
      return res.json({
        authenticated: false,
        user: null
      });
    }

    return res.json({
      authenticated: true,
      user
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password
authRouter.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body || {};
    const result = await authService.handleForgotPassword(email);
    return res.json(result);
  } catch (err) {
    next(err);
  }
});

// Optional: Profile update (e.g. onboarding completion or settings) for authenticated session
authRouter.patch('/profile', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
    if (!sessionId) {
      return res.status(401).json({
        success: false,
        error: 'UNAUTHORIZED',
        message: 'Vous devez être connecté.'
      });
    }

    const currentUser = await authService.getCurrentUserFromSession(sessionId);
    if (!currentUser) {
      clearSessionCookie(res);
      return res.status(401).json({
        success: false,
        error: 'SESSION_EXPIRED',
        message: 'Session expirée. Veuillez vous reconnecter.'
      });
    }

    const allowedUpdates = ['name', 'avatar', 'hasCompletedOnboarding', 'interfaceLanguage', 'defaultContentLanguage'];
    const partial: Record<string, any> = {};
    for (const key of allowedUpdates) {
      if (req.body && req.body[key] !== undefined) {
        partial[key] = req.body[key];
      }
    }

    const updated = await authService.updateUserProfile(currentUser.id, partial);
    return res.json({
      success: true,
      user: updated
    });
  } catch (err) {
    next(err);
  }
});

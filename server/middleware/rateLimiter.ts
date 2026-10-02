import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Clean up expired buckets periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (value.resetAt <= now) {
      rateLimitMap.delete(key);
    }
  }
}, 60000);

export function createRateLimiter(options: { windowMs: number; max: number; message?: string }) {
  const { windowMs, max, message = 'Trop de requêtes. Veuillez patienter un instant.' } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Key by authenticated userId if available, else by client IP
    const identifier = req.user?.id || req.ip || req.socket.remoteAddress || 'unknown';
    const routeKey = `${req.baseUrl || ''}${req.path}:${identifier}`;
    const now = Date.now();

    let record = rateLimitMap.get(routeKey);
    if (!record || record.resetAt <= now) {
      record = { count: 1, resetAt: now + windowMs };
      rateLimitMap.set(routeKey, record);
      return next();
    }

    if (record.count >= max) {
      const retryAfterSeconds = Math.ceil((record.resetAt - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        success: false,
        error: 'RATE_LIMITED',
        message
      });
    }

    record.count++;
    next();
  };
}

// Pre-configured rate limiters
export const aiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 AI calls per minute max
  message: 'Le moteur de génération IA est fortement sollicité. Veuillez patienter quelques secondes.'
});

export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 attempts
  message: 'Trop de tentatives de connexion. Veuillez réessayer dans quelques minutes.'
});

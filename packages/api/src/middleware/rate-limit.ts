import { Request, Response, NextFunction } from 'express';

// Simple in-memory rate limiter keyed by IP
const attempts: Map<string, { count: number; windowStart: number }> = new Map();

export function loginRateLimit(req: Request, res: Response, next: NextFunction) {
  const ip = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;
  const key = ip || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute
  const maxAttempts = 10;

  const entry = attempts.get(key);
  if (!entry) {
    attempts.set(key, { count: 0, windowStart: now });
    return next();
  }

  if (now - entry.windowStart > windowMs) {
    // reset window
    attempts.set(key, { count: 0, windowStart: now });
    return next();
  }

  if (entry.count >= maxAttempts) {
    res.status(429).json({ error: 'TOO_MANY_REQUESTS', message: 'Too many login attempts. Try again later.' });
    return;
  }

  return next();
}

export function incrementFailedAttempt(ipRaw?: string) {
  const ip = ipRaw || 'unknown';
  const now = Date.now();
  const windowMs = 60 * 1000;
  const entry = attempts.get(ip);
  if (!entry) {
    attempts.set(ip, { count: 1, windowStart: now });
    return;
  }
  if (now - entry.windowStart > windowMs) {
    attempts.set(ip, { count: 1, windowStart: now });
    return;
  }
  entry.count += 1;
  attempts.set(ip, entry);
}

export function resetAttempts(ipRaw?: string) {
  const ip = ipRaw || 'unknown';
  attempts.delete(ip);
}

export default { loginRateLimit, incrementFailedAttempt, resetAttempts };
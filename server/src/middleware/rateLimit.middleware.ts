import { Request, Response, NextFunction } from 'express';

// Simple in-memory rate limiter (replace with Redis in production)
const requestCounts = new Map<string, { count: number; resetTime: number }>();

export function rateLimiter(maxRequests: number = 30, windowMs: number = 60000) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = requestCounts.get(ip);

    if (!record || now > record.resetTime) {
      requestCounts.set(ip, { count: 1, resetTime: now + windowMs });
      next();
      return;
    }

    if (record.count >= maxRequests) {
      res.status(429).json({ error: 'Too many requests. Please try again later.' });
      return;
    }

    record.count++;
    next();
  };
}

// Stricter rate limit for search to prevent enumeration
export const searchRateLimiter = rateLimiter(10, 60000); // 10 searches per minute

// Auth rate limiter
export const authRateLimiter = rateLimiter(10, 300000); // 10 auth attempts per 5 min

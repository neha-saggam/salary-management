import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { logger } from './logger.js';

export interface AuthToken {
  userId: string;
  email: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthToken;
    }
  }
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET environment variable is not set');
  return secret;
}

export function signToken(payload: AuthToken): string {
  const token = jwt.sign(payload, getJwtSecret(), { expiresIn: '8h' });
  logger.debug('Token created', {
    userId: payload.userId,
    email: payload.email,
    role: payload.role,
    expiresIn: '8h',
  });
  return token;
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    logger.warn('Auth: Missing or invalid Authorization header', {
      method: req.method,
      path: req.path,
      hasHeader: !!header,
    });
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }
  const token = header.slice(7);
  try {
    req.user = jwt.verify(token, getJwtSecret()) as AuthToken;
    logger.debug('Token validated', {
      userId: req.user.userId,
      email: req.user.email,
      role: req.user.role,
    });
    next();
  } catch (error) {
    logger.warn('Auth: Invalid or expired token', {
      error: error instanceof Error ? error.message : 'Unknown error',
      method: req.method,
      path: req.path,
    });
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user || !roles.includes(req.user.role)) {
      logger.warn('Auth: Insufficient permissions', {
        userId: req.user?.userId,
        email: req.user?.email,
        userRole: req.user?.role,
        requiredRoles: roles,
        method: req.method,
        path: req.path,
      });
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    logger.debug('Role check passed', {
      userId: req.user.userId,
      email: req.user.email,
      userRole: req.user.role,
      allowedRoles: roles,
    });
    next();
  };
}

import { Request, Response, NextFunction } from 'express';
import { AuthRequest } from './auth.js';
import { User } from '../models/index.js';

export async function verifyUserMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    res.status(401).json({ error: 'UNAUTHORIZED', message: 'Missing auth' });
    return;
  }

  const user = await User.findByPk(req.user.id);
  if (!user) {
    res.status(404).json({ error: 'NOT_FOUND', message: 'User not found' });
    return;
  }

  if (!user.verified) {
    res.status(403).json({ error: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email to access this resource' });
    return;
  }

  next();
}

export default verifyUserMiddleware;
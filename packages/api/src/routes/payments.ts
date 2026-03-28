import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// TODO: Implement payment routes
// GET /payments/me (protected)

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.json({ message: 'Payment endpoints to be implemented', user: req.user });
});

export default router;

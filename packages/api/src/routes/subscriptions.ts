import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// TODO: Implement subscription routes
// GET /subscriptions/me (protected)
// POST /subscriptions/me (protected)
// PATCH /subscriptions/me (protected)
// DELETE /subscriptions/me (protected)

router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  res.json({ message: 'Subscription endpoints to be implemented', user: req.user });
});

export default router;

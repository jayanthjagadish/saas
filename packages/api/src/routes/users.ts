import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

const router = Router();

// TODO: Implement user routes
// GET /users/me (protected)
// PUT /users/me (protected)

import verifyUserMiddleware from '../middleware/verify-user.js';

router.get('/me', authMiddleware, verifyUserMiddleware, async (req: AuthRequest, res: Response) => {
  res.json({ message: 'User endpoints to be implemented', user: req.user });
});

export default router;

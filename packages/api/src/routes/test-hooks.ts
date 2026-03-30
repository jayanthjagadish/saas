import { Router, Request, Response } from 'express';

const router = Router();

// In-memory storage for dev-only test hooks (NOT for production)
let lastVerificationToken: string | null = null;
let lastResetToken: string | null = null;

// Setter functions to be called from other routes
export function setLastVerificationToken(token: string): void {
  if (process.env.NODE_ENV !== 'production') {
    lastVerificationToken = token;
  }
}

export function setLastResetToken(token: string): void {
  if (process.env.NODE_ENV !== 'production') {
    lastResetToken = token;
  }
}

// GET /test-hooks/last-verification
router.get('/last-verification', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Endpoint not available in production' });
    return;
  }

  if (!lastVerificationToken) {
    res.status(404).json({ error: 'NO_TOKEN', message: 'No token recorded yet' });
    return;
  }

  res.json({ token: lastVerificationToken });
});

// GET /test-hooks/last-reset-token
router.get('/last-reset-token', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Endpoint not available in production' });
    return;
  }

  if (!lastResetToken) {
    res.status(404).json({ error: 'NO_TOKEN', message: 'No token recorded yet' });
    return;
  }

  res.json({ token: lastResetToken });
});

export default router;

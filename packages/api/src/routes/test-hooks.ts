import { Router, Request, Response } from 'express';

const router = Router();

// In-memory storage for dev-only test hooks (NOT for production)
let lastVerificationToken: string | null = null;
let lastResetToken: string | null = null;
// Per-email maps to avoid race conditions with parallel test workers
const verificationTokensByEmail = new Map<string, string>();
const resetTokensByEmail = new Map<string, string>();

// Setter functions to be called from other routes
export function setLastVerificationToken(token: string, email?: string): void {
  if (process.env.NODE_ENV !== 'production') {
    lastVerificationToken = token;
    if (email) {
      verificationTokensByEmail.set(email, token);
    }
  }
}

export function setLastResetToken(token: string, email?: string): void {
  if (process.env.NODE_ENV !== 'production') {
    lastResetToken = token;
    if (email) {
      resetTokensByEmail.set(email, token);
    }
  }
}

// GET /test-hooks/last-verification?email=...
router.get('/last-verification', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Endpoint not available in production' });
    return;
  }

  const email = req.query.email as string | undefined;
  const token = email ? verificationTokensByEmail.get(email) : lastVerificationToken;

  if (!token) {
    res.status(404).json({ error: 'NO_TOKEN', message: 'No token recorded yet' });
    return;
  }

  res.json({ token });
});

// GET /test-hooks/last-reset-token?email=...
router.get('/last-reset-token', (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    res.status(404).json({ error: 'NOT_FOUND', message: 'Endpoint not available in production' });
    return;
  }

  const email = req.query.email as string | undefined;
  const token = email ? resetTokensByEmail.get(email) : lastResetToken;

  if (!token) {
    res.status(404).json({ error: 'NO_TOKEN', message: 'No token recorded yet' });
    return;
  }

  res.json({ token });
});

export default router;

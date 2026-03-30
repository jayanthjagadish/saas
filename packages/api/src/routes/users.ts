import { Router, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { User } from '../models/User.js';
import { sendVerificationEmail } from '../services/email.js';

const router = Router();

const updateProfileSchema = z.object({
  name: z.string().max(100).optional(),
  email: z.string().email().optional(),
});

// GET /users/me — return current user profile
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });

    const user = await User.findByPk(userInfo.id, {
      attributes: ['id', 'email', 'name', 'avatarUrl', 'verified', 'createdAt'],
    });
    if (!user) return res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });

    return res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        avatarUrl: user.avatarUrl ?? null,
        verified: user.verified,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('Error fetching profile:', err);
    return res.status(500).json({ success: false, error: 'FETCH_FAILED' });
  }
});

// PUT /users/me — update name and/or email
router.put('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(422).json({ success: false, error: 'VALIDATION_ERROR', details: parsed.error.flatten() });
    }

    const { name, email } = parsed.data;
    if (name === undefined && email === undefined) {
      return res.status(422).json({ success: false, error: 'NO_FIELDS_PROVIDED' });
    }

    const user = await User.findByPk(userInfo.id);
    if (!user) return res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });

    const updates: Partial<{ name: string; email: string; verified: boolean; emailVerifiedToken: string | null; emailVerifiedTokenExpires: Date | null; emailVerifiedAt: Date | null }> = {};

    if (name !== undefined) {
      updates.name = name;
    }

    if (email !== undefined && email.toLowerCase() !== user.email.toLowerCase()) {
      const existing = await User.findOne({ where: { email: email.toLowerCase() } });
      if (existing) {
        return res.status(409).json({ success: false, error: 'EMAIL_TAKEN' });
      }
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);
      updates.email = email.toLowerCase();
      updates.verified = false;
      updates.emailVerifiedToken = token;
      updates.emailVerifiedTokenExpires = expires;
      updates.emailVerifiedAt = null;
      await sendVerificationEmail(email.toLowerCase(), token);
    }

    await user.update(updates as any);

    return res.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name ?? null,
        avatarUrl: user.avatarUrl ?? null,
        verified: user.verified,
        createdAt: user.createdAt,
      },
    });
  } catch (err) {
    console.error('Error updating profile:', err);
    return res.status(500).json({ success: false, error: 'UPDATE_FAILED' });
  }
});

// POST /users/me/avatar — avatar upload stub
router.post('/me/avatar', authMiddleware, (_req: AuthRequest, res: Response) => {
  return res.status(501).json({ success: false, error: 'AVATAR_UPLOAD_NOT_CONFIGURED' });
});

// POST /users/send-verification — resend verification email
router.post('/send-verification', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });

    const user = await User.findByPk(userInfo.id);
    if (!user) return res.status(404).json({ success: false, error: 'USER_NOT_FOUND' });

    if (user.verified) {
      return res.status(400).json({ success: false, error: 'ALREADY_VERIFIED' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    await user.update({ emailVerifiedToken: token });
    await sendVerificationEmail(user.email, token);

    return res.json({ success: true, data: { message: 'Verification email sent' } });
  } catch (err) {
    console.error('Error sending verification email:', err);
    return res.status(500).json({ success: false, error: 'SEND_FAILED' });
  }
});

export default router;

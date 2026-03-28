import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { User, Subscription } from '../models/index.js';
import { sendVerificationEmail } from '../services/email.js';
import { config } from '../config/index.js';

const router = Router();

function validatePassword(password: string): boolean {
  if (!password || password.length < 12) return false;
  if (!/[A-Z]/.test(password)) return false;
  if (!/[0-9]/.test(password)) return false;
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;
  return true;
}

router.post('/signup', async (req: Request, res: Response) => {
  const { email, password, company_name } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: 'INVALID_INPUT', message: 'Email and password required' });
    return;
  }

  if (!validatePassword(password)) {
    res.status(400).json({ error: 'WEAK_PASSWORD', message: 'Password does not meet strength requirements' });
    return;
  }

  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      res.status(409).json({ error: 'EMAIL_EXISTS', message: 'An account with that email already exists' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await User.create({
      email,
      password: passwordHash,
      name: company_name || null,
      verified: false,
      emailVerifiedToken: token,
      emailVerifiedTokenExpires: expires,
    });

    // Auto-enroll in free plan (local record)
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    await Subscription.create({
      userId: user.id,
      stripeSubscriptionId: `local-free-${uuidv4()}`,
      stripeProductId: 'free',
      status: 'active',
      pricePerMonth: 0.0,
      currentPeriodStart: now,
      currentPeriodEnd: thirtyDays,
    });

    // Send verification email
    await sendVerificationEmail(email, token);

    res.status(201).json({ user_id: user.id, email: user.email, message: 'Check your email to verify' });
  } catch (err) {
    console.error('Signup error', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to create user' });
  }
});

router.post('/verify-email', async (req: Request, res: Response) => {
  const token = req.query.token || req.body.token;
  if (!token || typeof token !== 'string') {
    res.status(400).json({ error: 'MISSING_TOKEN', message: 'Verification token required' });
    return;
  }

  try {
    const user = await User.findOne({ where: { emailVerifiedToken: token } });
    if (!user) {
      res.status(400).json({ error: 'INVALID_TOKEN', message: 'Token is invalid' });
      return;
    }

    if (!user.emailVerifiedTokenExpires || user.emailVerifiedTokenExpires.getTime() < Date.now()) {
      res.status(400).json({ error: 'EXPIRED_TOKEN', message: 'Token has expired' });
      return;
    }

    user.verified = true;
    user.emailVerifiedAt = new Date();
    user.emailVerifiedToken = null;
    user.emailVerifiedTokenExpires = null;
    await user.save();

    res.json({ success: true, user_id: user.id });
  } catch (err) {
    console.error('Verify email error', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to verify email' });
  }
});

export default router;

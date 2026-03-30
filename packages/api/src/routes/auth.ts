import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { User, Subscription, Team, TeamMember } from '../models/index.js';
import { sendVerificationEmail } from '../services/email.js';
import { config } from '../config/index.js';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, revokeSession, requestPasswordReset, resetPassword } from '../services/auth.js';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';

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
    res.status(400).json({ success: false, error: 'INVALID_INPUT', message: 'Email and password required' });
    return;
  }

  if (!validatePassword(password)) {
    res.status(400).json({ success: false, error: 'WEAK_PASSWORD', message: 'Password does not meet strength requirements' });
    return;
  }

  try {
    const existing = await User.findOne({ where: { email } });
    if (existing) {
      res.status(409).json({ success: false, error: 'EMAIL_EXISTS', message: 'An account with that email already exists' });
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
    } as any);

    // Auto-enroll in free plan (local record)
    const now = new Date();
    const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const freePlan = await (await import('../models/index.js')).Plan.findOne({
      where: { tier: 'free' }
    });
    if (!freePlan) {
      throw new Error('Free plan not found');
    }
    await Subscription.create({
      userId: user.id,
      planId: freePlan.id,
      stripeSubscriptionId: `local-free-${uuidv4()}`,
      status: 'active',
      pricePerMonth: 0.0,
      currentPeriodStart: now,
      currentPeriodEnd: thirtyDays,
    } as any);

    // Create default team for new user
    const teamName = company_name ? `${company_name} Team` : `${email.split('@')[0]}'s Team`;
    const team = await Team.create({ name: teamName, ownerId: user.id } as any);
    await TeamMember.create({ teamId: team.id, userId: user.id, role: 'owner', joinedAt: new Date() } as any);

    // Send verification email
    await sendVerificationEmail(email, token);

    res.status(201).json({ success: true, data: { user_id: user.id, email: user.email, message: 'Check your email to verify' } });
  } catch (err) {
    console.error('Signup error', err);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to create user' });
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


// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  const { email, password, remember } = req.body;
  const ip = (req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress) as string;

  if (!email || !password) {
    res.status(400).json({ success: false, error: 'INVALID_INPUT', message: 'Email and password required' });
    return;
  }

  try {
    // Rate limiting check
    const rateLimitModule = await import('../middleware/rate-limit.js');
    const { loginRateLimit, incrementFailedAttempt, resetAttempts } = rateLimitModule;
    // run quick check
    // @ts-ignore
    if (loginRateLimit) {
      // call middleware function to enforce simple window
      // it will short-circuit response if limit reached
      const called = await new Promise<void>((resolve) => { loginRateLimit(req, res, () => resolve()); });
    }

    const user = await User.findOne({ where: { email } });
    if (!user) {
      // log failed attempt
      incrementFailedAttempt(ip);
      console.warn(`Failed login attempt for unknown user ${email} from ${ip} at ${new Date().toISOString()}`);
      res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
      return;
    }

    if (!user.verified && !user.emailVerifiedAt) {
      res.status(403).json({ success: false, error: 'UNVERIFIED', message: 'Please verify your email before logging in' });
      return;
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      incrementFailedAttempt(ip);
      console.warn(`Failed login attempt for ${email} from ${ip} at ${new Date().toISOString()}`);
      res.status(401).json({ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' });
      return;
    }

    // success: reset attempts
    resetAttempts(ip);

    // create session and refresh token
    const sessionId = uuidv4();
    const now = Date.now();
    const refreshDays = remember ? 90 : 30;
    const expiresAt = new Date(now + refreshDays * 24 * 60 * 60 * 1000);
    await (await import('../models/index.js')).Session.create({ 
      id: sessionId, 
      userId: user.id, 
      expiresAt,
      revoked: false,
    } as any);

    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user, sessionId, `${refreshDays}d`);

    // set httpOnly cookie
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: config.app.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: refreshDays * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: { accessToken: accessToken, userId: user.id, email: user.email } });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ success: false, error: 'INTERNAL_ERROR', message: 'Failed to login' });
  }
});

// Refresh endpoint
router.post('/refresh', async (req: Request, res: Response) => {
  const token = req.cookies && req.cookies.refresh_token;
  if (!token) {
    res.status(401).json({ error: 'MISSING_TOKEN', message: 'Refresh token missing' });
    return;
  }

  try {
    const { verifyRefreshToken, generateRefreshToken, generateAccessToken } = await import('../services/auth.js');
    const payload = verifyRefreshToken(token);
    const SessionModel = (await import('../models/index.js')).Session;
    if (!payload.sid) {
      res.status(401).json({ error: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token' });
      return;
    }

    const session = await SessionModel.findByPk(payload.sid);
    if (!session || session.revoked || session.expiresAt.getTime() < Date.now()) {
      res.status(401).json({ error: 'INVALID_REFRESH', message: 'Refresh token invalid or expired' });
      return;
    }

    // rotate: revoke old and issue new
    session.revoked = true;
    await session.save();

    const user = await (await import('../models/index.js')).User.findByPk(payload.id);
    if (!user) {
      res.status(401).json({ error: 'INVALID_REFRESH', message: 'User not found' });
      return;
    }

    const newSessionId = uuidv4();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    await SessionModel.create({ 
      id: newSessionId, 
      userId: user.id, 
      expiresAt,
      revoked: false,
    } as any);

    const newAccess = generateAccessToken(user);
    const newRefresh = generateRefreshToken(user, newSessionId);

    res.cookie('refresh_token', newRefresh, {
      httpOnly: true,
      secure: config.app.nodeEnv === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ success: true, data: { accessToken: newAccess } });
  } catch (e) {
    console.error('Refresh error', e);
    res.status(401).json({ error: 'INVALID_REFRESH', message: 'Invalid refresh token' });
  }
});

// Logout endpoint
router.post('/logout', authMiddleware, async (req: AuthRequest, res: Response) => {
  const token = req.cookies && req.cookies.refresh_token;
  if (!token) {
    res.status(401).json({ error: 'MISSING_TOKEN', message: 'Refresh token missing' });
    return;
  }

  try {
    const payload = verifyRefreshToken(token);
    
    if (!payload.sid) {
      res.status(401).json({ error: 'INVALID_REFRESH_TOKEN', message: 'Invalid refresh token' });
      return;
    }

    await revokeSession(payload.sid);

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: config.app.nodeEnv === 'production',
      sameSite: 'lax',
    });

    res.json({ success: true, message: 'Logged out successfully' });
  } catch (err) {
    console.error('Logout error', err);
    if (err instanceof Error && err.message.includes('SESSION_REVOKED')) {
      res.status(401).json({ error: 'SESSION_REVOKED', message: 'Session already revoked' });
    } else {
      res.status(401).json({ error: 'LOGOUT_FAILED', message: 'Failed to logout' });
    }
  }
});

// Password reset request
const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email format'),
});

router.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);
    
    await requestPasswordReset(email);
    
    // Always return success to prevent user enumeration
    res.json({ 
      success: true, 
      message: 'If an account exists with that email, a password reset link has been sent.' 
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'VALIDATION_ERROR', 
        message: 'Invalid email format',
        details: err.errors 
      });
      return;
    }
    console.error('Forgot password error', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to process request' });
  }
});

// Password reset confirmation
const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

router.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const { token, password: newPassword } = resetPasswordSchema.parse(req.body);
    
    await resetPassword(token, newPassword);
    
    res.json({ 
      success: true, 
      message: 'Password has been reset successfully. All active sessions have been logged out.' 
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      res.status(400).json({ 
        error: 'VALIDATION_ERROR', 
        message: 'Invalid input',
        details: err.errors 
      });
      return;
    }
    
    if (err instanceof Error) {
      if (err.message.includes('INVALID_TOKEN') || err.message.includes('EXPIRED_TOKEN')) {
        res.status(400).json({ 
          error: err.message.includes('EXPIRED') ? 'EXPIRED_TOKEN' : 'INVALID_TOKEN',
          message: err.message.includes('EXPIRED') 
            ? 'Reset token has expired. Please request a new one.' 
            : 'Invalid reset token.'
        });
        return;
      }
    }
    
    console.error('Reset password error', err);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to reset password' });
  }
});

export default router;

import bcryptjs from 'bcryptjs';
import jwt, { SignOptions } from 'jsonwebtoken';
import crypto from 'crypto';
import { User } from '../models/User.js';
import { Session } from '../models/Session.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';
import { sendPasswordResetEmail } from './email.js';
import { setLastResetToken } from '../routes/test-hooks.js';

export async function registerUser(
  email: string,
  password: string,
  name?: string
): Promise<User> {
  const existingUser = await User.findOne({ where: { email } });
  if (existingUser) {
    throw new AppError(409, 'USER_EXISTS', 'User already exists');
  }

  const hashedPassword = await bcryptjs.hash(password, 12);
  const user = await User.create({
    email,
    password: hashedPassword,
    name: name || undefined,
    verified: false,
  } as any);

  return user;
}

export async function authenticateUser(
  email: string,
  password: string
): Promise<User> {
  const user = await User.findOne({ where: { email } });
  if (!user) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  const isPasswordValid = await bcryptjs.compare(password, user.password);
  if (!isPasswordValid) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');
  }

  return user;
}

export function generateAccessToken(user: User): string {
  return jwt.sign(
    { id: user.id, email: user.email },
    config.jwt.accessSecret as string,
    { expiresIn: config.jwt.accessExpiresIn } as SignOptions
  );
}

export function generateRefreshToken(user: User, sessionId: string, expiresIn?: string): string {
  const expires = expiresIn || config.jwt.refreshExpiresIn;
  return jwt.sign(
    { id: user.id, sid: sessionId },
    config.jwt.refreshSecret as string,
    { expiresIn: expires } as SignOptions
  );
}

export function verifyRefreshToken(token: string): { id: string; sid?: string } {
  try {
    return jwt.verify(token, config.jwt.refreshSecret) as { id: string; sid?: string };
  } catch {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
  }
}

export async function revokeSession(sessionId: string): Promise<void> {
  const session = await Session.findByPk(sessionId);
  if (!session) {
    throw new AppError(401, 'INVALID_SESSION', 'Session not found');
  }
  
  if (session.revoked) {
    throw new AppError(401, 'SESSION_REVOKED', 'Session already revoked');
  }
  
  session.revoked = true;
  await session.save();
}

export async function requestPasswordReset(email: string): Promise<void> {
  const user = await User.findOne({ where: { email } });
  
  // Don't reveal whether user exists (security)
  if (!user) {
    return;
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  user.resetPasswordToken = resetToken;
  user.resetPasswordExpires = expiresAt;
  await user.save();

  // Store token for test hooks (dev only)
  if (process.env.NODE_ENV !== 'production') {
    setLastResetToken(resetToken);
  }

  await sendPasswordResetEmail(email, resetToken);
}

export async function resetPassword(token: string, newPassword: string): Promise<void> {
  const user = await User.findOne({ 
    where: { resetPasswordToken: token } 
  });

  if (!user) {
    throw new AppError(400, 'INVALID_TOKEN', 'Invalid or expired reset token');
  }

  if (!user.resetPasswordExpires || user.resetPasswordExpires.getTime() < Date.now()) {
    throw new AppError(400, 'EXPIRED_TOKEN', 'Reset token has expired');
  }

  const hashedPassword = await bcryptjs.hash(newPassword, 12);
  
  user.password = hashedPassword;
  user.resetPasswordToken = null;
  user.resetPasswordExpires = null;
  await user.save();

  // Revoke all active sessions for this user
  await Session.update(
    { revoked: true },
    { where: { userId: user.id, revoked: false } }
  );
}

export default {
  registerUser,
  authenticateUser,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
  revokeSession,
  requestPasswordReset,
  resetPassword,
};

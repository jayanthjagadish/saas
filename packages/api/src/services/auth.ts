import bcryptjs from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { config } from '../config/index.js';
import { AppError } from '../middleware/errorHandler.js';

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
    name,
  });

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
    config.jwt.accessSecret,
    { expiresIn: config.jwt.accessExpiresIn }
  );
}

export function generateRefreshToken(user: User, sessionId: string, expiresIn?: string): string {
  const expires = expiresIn || config.jwt.refreshExpiresIn;
  return jwt.sign(
    { id: user.id, sid: sessionId },
    config.jwt.refreshSecret,
    { expiresIn: expires }
  );
}

export function verifyRefreshToken(token: string): { id: string; sid?: string } {
  try {
    return jwt.verify(token, config.jwt.refreshSecret) as { id: string; sid?: string };
  } catch {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
  }
}

export default {
  registerUser,
  authenticateUser,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
};

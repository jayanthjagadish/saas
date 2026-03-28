import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';

const JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'test-refresh-secret';

export const createMockUser = (overrides?: any) => ({
  id: 'user_test123',
  email: 'test@example.com',
  password_hash: '',
  stripe_customer_id: 'cus_test123',
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createAccessToken = (userId: string, email: string) => {
  return jwt.sign(
    { sub: userId, email },
    JWT_SECRET,
    { expiresIn: '15m' }
  );
};

export const createRefreshToken = (userId: string) => {
  return jwt.sign(
    { sub: userId },
    JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
};

export const verifyAccessToken = (token: string) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    throw new Error('Invalid token');
  }
};

export const hashPassword = async (password: string) => {
  return bcrypt.hash(password, 12);
};

export const verifyPassword = async (password: string, hash: string) => {
  return bcrypt.compare(password, hash);
};

export const createAuthHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
});

export const createAuthCookie = (refreshToken: string) => ({
  'Set-Cookie': `refreshToken=${refreshToken}; HttpOnly; Secure; SameSite=Strict; Max-Age=2592000`,
});

export const mockAuthContext = (overrides?: any) => ({
  userId: 'user_test123',
  email: 'test@example.com',
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
  ...overrides,
});

// Test fixtures for auth flows
import jwt from 'jsonwebtoken';

export const SAMPLE_USER = {
  email: 'test+user@example.com',
  password: 'Str0ng!Pass',
  companyName: 'TestCo'
};

export function makeVerificationToken(payload: object, opts: {expiresIn?: string | number} = {}){
  return jwt.sign(payload, 'test-verification-secret', { expiresIn: opts.expiresIn || '24h' });
}

export function makeAccessToken(payload: object, opts: {expiresIn?: string | number} = {}){
  return jwt.sign(payload, 'test-access-secret', { expiresIn: opts.expiresIn || '15m' });
}

export function makeRefreshToken(payload: object, opts: {expiresIn?: string | number} = {}){
  return jwt.sign(payload, 'test-refresh-secret', { expiresIn: opts.expiresIn || '30d' });
}

// Helpers for simulating clock skew / expiry in tests
export const advanceTime = (ms: number) => {
  // Tests should use fake timers (jest.useFakeTimers or vi.useFakeTimers) and call this helper
  // This function is a placeholder to document intent and shared usage.
  // Actual time control is done in the test using the test framework's fake timers.
};

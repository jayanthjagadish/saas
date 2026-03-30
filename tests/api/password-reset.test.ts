import { describe, it, expect } from '@jest/globals';

const API = 'http://localhost:3001';

describe('POST /auth/forgot-password', () => {
  it('should accept known email without revealing existence', async () => {
    const res = await fetch(`${API}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@fenster-test.com' }),
    });
    expect(res.status).toBe(200);
    const data = await res.json() as any;
    expect(data.success).toBe(true);
  });

  it('should accept unknown email without revealing non-existence (anti-enum)', async () => {
    const res = await fetch(`${API}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody-exists-12345@noreply.dev' }),
    });
    // Should return 200 (anti-enumeration) or 422 for invalid email format
    expect([200, 422]).toContain(res.status);
  });

  it('should reject missing email', async () => {
    const res = await fetch(`${API}/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect([400, 422]).toContain(res.status);
  });
});

describe('POST /auth/reset-password', () => {
  it('should reject invalid token', async () => {
    const res = await fetch(`${API}/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: 'invalid-token-abc', password: 'NewPassword123!' }),
    });
    const data = await res.json() as any;
    expect([400, 404, 422]).toContain(res.status);
    expect(data.success).toBe(false);
  });
});

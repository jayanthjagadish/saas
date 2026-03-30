import { describe, it, expect, beforeAll } from '@jest/globals';

const API = 'http://localhost:3001';
let authToken: string;

beforeAll(async () => {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@fenster-test.com', password: 'SecureTest123!@#' }),
  });
  const data = await res.json() as any;
  authToken = data?.data?.accessToken ?? '';
});

describe('GET /dashboard/me/dashboard', () => {
  it('should return aggregated dashboard data for authenticated user', async () => {
    const res = await fetch(`${API}/dashboard/me/dashboard`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('user');
    expect(data.data.user.email).toBe('test@fenster-test.com');
    expect(data.data).toHaveProperty('subscription');
    // team requires US-030 — assert structure if present
    expect(data.data).toHaveProperty('team');
  });

  it('should return 401 for unauthenticated request', async () => {
    const res = await fetch(`${API}/dashboard/me/dashboard`);
    expect(res.status).toBe(401);
  });
});

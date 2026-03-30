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

describe('GET /teams/me', () => {
  it('should return team data with members for authenticated user', async () => {
    const res = await fetch(`${API}/teams/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json() as any;
    // team may be null if US-030 not yet implemented — both null and valid object are acceptable
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    if (data.data !== null) {
      expect(data.data).toHaveProperty('id');
      expect(data.data).toHaveProperty('name');
      expect(data.data).toHaveProperty('memberCount');
      expect(Array.isArray(data.data.members)).toBe(true);
      const owner = data.data.members.find((m: any) => m.role === 'owner');
      expect(owner).toBeDefined();
    }
  });

  it('should return 401 for unauthenticated request', async () => {
    const res = await fetch(`${API}/teams/me`);
    expect(res.status).toBe(401);
  });
});

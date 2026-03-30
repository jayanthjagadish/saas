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

describe('GET /analytics/usage', () => {
  it('should return 401 when no auth token provided', async () => {
    const res = await fetch(`${API}/analytics/usage`);
    expect(res.status).toBe(401);
  });

  it('should return usage stats with memberCount, memberLimit, planName when authenticated', async () => {
    const res = await fetch(`${API}/analytics/usage`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('memberCount');
    expect(data.data).toHaveProperty('memberLimit');
    expect(data.data).toHaveProperty('planName');
  });

  it('should return memberCount that does not exceed memberLimit', async () => {
    const res = await fetch(`${API}/analytics/usage`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.data.memberCount).toBeLessThanOrEqual(data.data.memberLimit);
  });
});

describe('GET /analytics/members/growth', () => {
  it('should return 401 when no auth token provided', async () => {
    const res = await fetch(`${API}/analytics/members/growth`);
    expect(res.status).toBe(401);
  });

  it('should return a months array with exactly 6 entries when authenticated', async () => {
    const res = await fetch(`${API}/analytics/members/growth`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.months)).toBe(true);
    expect(data.data.months).toHaveLength(6);
  });

  it('should return each month entry with a month string and numeric count', async () => {
    const res = await fetch(`${API}/analytics/members/growth`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    for (const entry of data.data.months) {
      expect(typeof entry.month).toBe('string');
      expect(entry.month.length).toBeGreaterThan(0);
      expect(typeof entry.count).toBe('number');
    }
  });
});

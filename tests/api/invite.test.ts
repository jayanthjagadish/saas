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

describe('POST /teams/me/invites', () => {
  it('should require authentication', async () => {
    const res = await fetch(`${API}/teams/me/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'nobody@test.com' }),
    });
    expect(res.status).toBe(401);
  });

  it('should reject missing email', async () => {
    const res = await fetch(`${API}/teams/me/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(422);
    const data = await res.json() as any;
    expect(data.success).toBe(false);
    expect(data.error).toBe('EMAIL_REQUIRED');
  });

  it('should accept valid invite creation or return business error', async () => {
    const res = await fetch(`${API}/teams/me/invites`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
      body: JSON.stringify({ email: `invite-test-${Date.now()}@example.com` }),
    });
    const data = await res.json() as any;
    // Acceptable: 201 success OR 404 TEAM_NOT_FOUND (team may not exist for test user) OR 422 MEMBER_LIMIT_REACHED
    expect([201, 404, 409, 422]).toContain(res.status);
    if (res.status === 201) {
      expect(data.success).toBe(true);
      expect(data.data).toHaveProperty('email');
      expect(data.data).toHaveProperty('token');
    }
  });
});

describe('GET /teams/me/invites', () => {
  it('should require authentication', async () => {
    const res = await fetch(`${API}/teams/me/invites`);
    expect(res.status).toBe(401);
  });

  it('should return array of pending invites', async () => {
    const res = await fetch(`${API}/teams/me/invites`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });
});

describe('DELETE /teams/me/members/:id', () => {
  it('should require authentication', async () => {
    const res = await fetch(`${API}/teams/me/members/nonexistent-id`, { method: 'DELETE' });
    expect(res.status).toBe(401);
  });

  it('should return 404 for non-existent member', async () => {
    const res = await fetch(`${API}/teams/me/members/00000000-0000-0000-0000-000000000000`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json() as any;
    // 404 MEMBER_NOT_FOUND or 404 TEAM_NOT_FOUND
    expect([404]).toContain(res.status);
    expect(data.success).toBe(false);
  });
});

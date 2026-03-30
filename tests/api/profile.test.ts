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

describe('GET /users/me', () => {
  it('should return 401 when no auth token provided', async () => {
    const res = await fetch(`${API}/users/me`);
    expect(res.status).toBe(401);
  });

  it('should return user profile when authenticated', async () => {
    const res = await fetch(`${API}/users/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('id');
    expect(data.data).toHaveProperty('email');
    expect(data.data).toHaveProperty('name');
    expect(data.data).toHaveProperty('avatarUrl');
    expect(data.data).toHaveProperty('createdAt');
    expect(data.data.email).toBe('test@fenster-test.com');
  });
});

describe('PUT /users/me', () => {
  it('should return 401 when no auth token provided', async () => {
    const res = await fetch(`${API}/users/me`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Name' }),
    });
    expect(res.status).toBe(401);
  });

  it('should update name when authenticated', async () => {
    const newName = `Test User ${Date.now()}`;
    const res = await fetch(`${API}/users/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ name: newName }),
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data.name).toBe(newName);
  });

  it('should reject invalid email format', async () => {
    const res = await fetch(`${API}/users/me`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ email: 'not-a-valid-email' }),
    });
    const data = await res.json() as any;
    expect([400, 422]).toContain(res.status);
    expect(data.success).toBe(false);
  });
});

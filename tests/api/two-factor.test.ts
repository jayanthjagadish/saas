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

describe('POST /auth/2fa/setup', () => {
  it('should return 401 when no auth token provided', async () => {
    const res = await fetch(`${API}/auth/2fa/setup`, { method: 'POST' });
    expect(res.status).toBe(401);
  });

  it('should return 200 with qrCodeUrl, secret, and manualEntryKey when authenticated', async () => {
    const res = await fetch(`${API}/auth/2fa/setup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('qrCodeUrl');
    expect(data.data).toHaveProperty('secret');
    expect(data.data).toHaveProperty('manualEntryKey');
  });

  it('qrCodeUrl should be a base64-encoded PNG data URL', async () => {
    const res = await fetch(`${API}/auth/2fa/setup`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.data.qrCodeUrl).toMatch(/^data:image\/png;base64,/);
  });
});

describe('POST /auth/2fa/verify', () => {
  it('should return 401 when no auth token provided', async () => {
    const res = await fetch(`${API}/auth/2fa/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: '000000' }),
    });
    expect(res.status).toBe(401);
  });

  it('should return 400 with INVALID_TOKEN error for an invalid TOTP token', async () => {
    const res = await fetch(`${API}/auth/2fa/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ token: '000000' }),
    });
    const data = await res.json() as any;
    expect(res.status).toBe(400);
    expect(data.success).toBe(false);
    expect(data.error?.code).toBe('INVALID_TOKEN');
  });
});

describe('POST /auth/2fa/disable', () => {
  it('should return 401 when no auth token provided', async () => {
    const res = await fetch(`${API}/auth/2fa/disable`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: '000000' }),
    });
    expect(res.status).toBe(401);
  });
});

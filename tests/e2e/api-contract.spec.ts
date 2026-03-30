import { test, expect } from '@playwright/test';

const API = 'http://localhost:3001';

test.describe('API Contract — Route Existence', () => {
  test('GET /health returns 200', async ({ request }) => {
    const res = await request.get(`${API}/health`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.status).toBe('ok');
    expect(body).toHaveProperty('timestamp');
  });

  test('POST /auth/signup exists (not 404)', async ({ request }) => {
    const res = await request.post(`${API}/auth/signup`, { data: {} });
    expect(res.status()).not.toBe(404);
  });

  test('POST /auth/login exists (not 404)', async ({ request }) => {
    const res = await request.post(`${API}/auth/login`, { data: {} });
    expect(res.status()).not.toBe(404);
  });

  test('POST /auth/logout exists (not 404)', async ({ request }) => {
    const res = await request.post(`${API}/auth/logout`);
    expect(res.status()).not.toBe(404);
    // Without auth should be 401
    expect(res.status()).toBe(401);
  });

  test('POST /auth/refresh exists (not 404)', async ({ request }) => {
    const res = await request.post(`${API}/auth/refresh`);
    expect(res.status()).not.toBe(404);
    expect(res.status()).toBe(401);
  });

  test('POST /auth/verify-email exists (not 404)', async ({ request }) => {
    const res = await request.post(`${API}/auth/verify-email`, { data: {} });
    expect(res.status()).not.toBe(404);
    expect(res.status()).toBe(400);
  });

  test('POST /auth/forgot-password exists (not 404)', async ({ request }) => {
    const res = await request.post(`${API}/auth/forgot-password`, {
      data: { email: 'nobody@example.com' },
    });
    expect(res.status()).not.toBe(404);
    // Always 200 per contract
    expect(res.status()).toBe(200);
  });

  test('POST /auth/reset-password exists (not 404)', async ({ request }) => {
    const res = await request.post(`${API}/auth/reset-password`, {
      data: { token: 'invalid', password: 'NewPass123!@#' },
    });
    expect(res.status()).not.toBe(404);
    // Invalid token → 400
    expect(res.status()).toBe(400);
  });

  test('GET /plans returns 200 with plans array', async ({ request }) => {
    const res = await request.get(`${API}/plans`);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(Array.isArray(body.data)).toBe(true);
  });

  // Protected routes — should return 401, not 404

  test('GET /users/me returns 401 without auth (not 404)', async ({ request }) => {
    const res = await request.get(`${API}/users/me`);
    expect(res.status()).toBe(401);
  });

  test('PUT /users/me returns 401 without auth (not 404)', async ({ request }) => {
    const res = await request.put(`${API}/users/me`, { data: { name: 'Test' } });
    expect(res.status()).toBe(401);
  });

  test('GET /subscriptions/me returns 401 without auth (not 404)', async ({ request }) => {
    const res = await request.get(`${API}/subscriptions/me`);
    expect(res.status()).toBe(401);
  });

  test('GET /subscriptions/status returns 401 without auth (not 404)', async ({ request }) => {
    const res = await request.get(`${API}/subscriptions/status`);
    expect(res.status()).toBe(401);
  });

  test('GET /subscriptions/invoices returns 401 without auth (not 404)', async ({ request }) => {
    const res = await request.get(`${API}/subscriptions/invoices`);
    expect(res.status()).toBe(401);
  });

  test('GET /dashboard/me/dashboard returns 401 without auth (not 404)', async ({ request }) => {
    const res = await request.get(`${API}/dashboard/me/dashboard`);
    expect(res.status()).toBe(401);
  });

  test('GET /teams/me returns 401 without auth (not 404)', async ({ request }) => {
    const res = await request.get(`${API}/teams/me`);
    expect(res.status()).toBe(401);
  });

  test('GET /teams/me/invites returns 401 without auth (not 404)', async ({ request }) => {
    const res = await request.get(`${API}/teams/me/invites`);
    expect(res.status()).toBe(401);
  });

  test('GET /analytics/usage returns 401 without auth (not 404)', async ({ request }) => {
    const res = await request.get(`${API}/analytics/usage`);
    expect(res.status()).toBe(401);
  });

  test('GET /analytics/members/growth returns 401 without auth (not 404)', async ({ request }) => {
    const res = await request.get(`${API}/analytics/members/growth`);
    expect(res.status()).toBe(401);
  });

  test('GET /payments/me returns 401 without auth (not 404)', async ({ request }) => {
    const res = await request.get(`${API}/payments/me`);
    expect(res.status()).toBe(401);
  });

  // Dead route check — /auth/register should NOT exist
  test('POST /auth/register correctly returns 404 (dead route removed)', async ({ request }) => {
    const res = await request.post(`${API}/auth/register`, { data: {} });
    expect(res.status()).toBe(404);
  });
});

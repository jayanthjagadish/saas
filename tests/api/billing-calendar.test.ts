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

describe('GET /subscriptions/calendar', () => {
  it('should return 401 when no auth token provided', async () => {
    const res = await fetch(`${API}/subscriptions/calendar`);
    expect(res.status).toBe(401);
  });

  it('should return 200 for authenticated user', async () => {
    const res = await fetch(`${API}/subscriptions/calendar`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(200);
  });

  it('response should have events array and nextBillingDate field', async () => {
    const res = await fetch(`${API}/subscriptions/calendar`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data.events)).toBe(true);
    expect(data.data).toHaveProperty('nextBillingDate');
  });

  it('each event in events array should have date, type, and label string fields', async () => {
    const res = await fetch(`${API}/subscriptions/calendar`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);

    if (data.data.events.length === 0) {
      // Free plan may have no events — that is also valid
      return;
    }

    for (const event of data.data.events) {
      expect(typeof event.date).toBe('string');
      expect(typeof event.type).toBe('string');
      expect(typeof event.label).toBe('string');
    }
  });

  it('event type should be one of: renewal, trial_end, cancellation, invoice_due', async () => {
    const validTypes = ['renewal', 'trial_end', 'cancellation', 'invoice_due'];

    const res = await fetch(`${API}/subscriptions/calendar`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);

    if (data.data.events.length === 0) {
      // No events to validate types — skip assertion
      return;
    }

    for (const event of data.data.events) {
      expect(validTypes).toContain(event.type);
    }
  });
});

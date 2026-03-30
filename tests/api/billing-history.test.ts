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

describe('GET /subscriptions/invoices', () => {
  it('should return 401 when no auth token provided', async () => {
    const res = await fetch(`${API}/subscriptions/invoices`);
    expect(res.status).toBe(401);
  });

  it('should return 200 with invoices array for authenticated user', async () => {
    const res = await fetch(`${API}/subscriptions/invoices`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(Array.isArray(data.data)).toBe(true);
  });

  it('invoice objects should have expected shape when invoices exist', async () => {
    const res = await fetch(`${API}/subscriptions/invoices`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);

    if (data.data.length > 0) {
      const invoice = data.data[0];
      expect(invoice).toHaveProperty('id');
      expect(invoice).toHaveProperty('date');
      expect(invoice).toHaveProperty('amount');
      expect(invoice).toHaveProperty('status');
      expect(invoice).toHaveProperty('planName');
    }
    // Free users may have an empty array — that is also valid
    expect(Array.isArray(data.data)).toBe(true);
  });
});

describe('GET /subscriptions/invoices/:id/download', () => {
  it('should return 401 when no auth token provided', async () => {
    const res = await fetch(`${API}/subscriptions/invoices/any-id/download`);
    expect(res.status).toBe(401);
  });

  it('should return 404 for a non-existent invoice id', async () => {
    const res = await fetch(`${API}/subscriptions/invoices/nonexistent-invoice-id-000/download`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    expect(res.status).toBe(404);
  });

  it('should return 200 with pdfUrl for a valid invoice id', async () => {
    // Fetch invoices first to find a real id
    const listRes = await fetch(`${API}/subscriptions/invoices`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const listData = await listRes.json() as any;

    if (!listData.data || listData.data.length === 0) {
      // No invoices on free plan — skip download assertion
      return;
    }

    const invoiceId = listData.data[0].id;
    const res = await fetch(`${API}/subscriptions/invoices/${invoiceId}/download`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const data = await res.json() as any;
    expect(res.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.data).toHaveProperty('pdfUrl');
    expect(typeof data.data.pdfUrl).toBe('string');
  });
});

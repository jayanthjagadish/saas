import request from 'supertest';
import app from '../packages/api/src/app';
import fs from 'fs';

describe('Auth signup flow (smoke)', () => {
  it('rejects weak passwords', async () => {
    const res = await request(app).post('/auth/signup').send({ email: 'a@b.com', password: 'weakpass' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('WEAK_PASSWORD');
  });

  it('creates user and writes verification email', async () => {
    const email = `test+${Date.now()}@example.com`;
    const res = await request(app).post('/auth/signup').send({ email, password: 'StrongPass1!', company_name: 'Acme' });
    expect(res.status).toBe(201);
    expect(res.body.email).toBe(email);
    expect(res.body.user_id).toBeDefined();

    // Check dev-emails folder exists
    const files = fs.readdirSync('dev-emails');
    expect(files.length).toBeGreaterThan(0);
  });
});

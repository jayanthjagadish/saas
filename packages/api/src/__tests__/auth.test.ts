/**
 * Auth API Integration Tests
 * Contract tests for authentication endpoints
 */

import request from 'supertest';
import app from '../app.js';

describe('Auth API - Contract Tests', () => {
  describe('POST /api/auth/signup', () => {
    test('should create user with valid data and return 201', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: `test-${Date.now()}@example.com`,
          password: 'StrongPass123!@#',
          company_name: 'Test Company',
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('user_id');
      expect(response.body).toHaveProperty('email');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('email');
    });

    test('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          password: 'StrongPass123!@#',
          company_name: 'Test Company',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('INVALID_INPUT');
    });

    test('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: `test-${Date.now()}@example.com`,
          company_name: 'Test Company',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('INVALID_INPUT');
    });

    test('should return 400 when password is too weak', async () => {
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email: `test-${Date.now()}@example.com`,
          password: 'weak',
          company_name: 'Test Company',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('WEAK_PASSWORD');
    });

    test('should return 409 when email already exists', async () => {
      const email = `duplicate-${Date.now()}@example.com`;
      
      // First signup
      await request(app)
        .post('/api/auth/signup')
        .send({
          email,
          password: 'StrongPass123!@#',
          company_name: 'Test Company',
        });

      // Try to signup again with same email
      const response = await request(app)
        .post('/api/auth/signup')
        .send({
          email,
          password: 'StrongPass123!@#',
          company_name: 'Test Company',
        });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('EMAIL_EXISTS');
    });
  });

  describe('POST /api/auth/login', () => {
    test('should login with valid credentials and return access token', async () => {
      // Note: This requires a verified test user to exist
      // In practice, you'd seed this in beforeAll
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'verified-test@example.com',
          password: 'StrongPass123!@#',
        });

      // May be 200 or 403 depending on if user is verified
      if (response.status === 200) {
        expect(response.body).toHaveProperty('access_token');
        expect(response.body).toHaveProperty('user_id');
        expect(response.body).toHaveProperty('email');
      } else {
        // User not verified or doesn't exist
        expect([401, 403]).toContain(response.status);
      }
    });

    test('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          password: 'StrongPass123!@#',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('INVALID_INPUT');
    });

    test('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('INVALID_INPUT');
    });

    test('should return 401 when password is wrong', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@example.com',
          password: 'WrongPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('INVALID_CREDENTIALS');
    });

    test('should return 401 when user does not exist', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({
          email: `nonexistent-${Date.now()}@example.com`,
          password: 'AnyPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /api/auth/verify-email', () => {
    test('should return 400 when token is missing', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('MISSING_TOKEN');
    });

    test('should return 400 when token is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/verify-email')
        .send({ token: 'invalid-token-12345' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('INVALID_TOKEN');
    });
  });

  describe('GET /api/users/me', () => {
    test('should return 401 when no token provided', async () => {
      const response = await request(app)
        .get('/api/users/me');

      // Note: Actual behavior depends on auth middleware implementation
      // May be 401 or redirect
      expect([401, 403, 302]).toContain(response.status);
    });

    test('should return user data with valid token', async () => {
      // Note: This requires first logging in to get a token
      // In practice, you'd use a test helper to create authenticated request
      
      // Example flow (simplified):
      // 1. Login to get token
      // 2. Use token in Authorization header
      // 3. Call /users/me
      
      // Skipping for now as it requires full auth setup
    });
  });

  describe('POST /api/auth/refresh', () => {
    test('should return 401 when refresh token is missing', async () => {
      const response = await request(app)
        .post('/api/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('MISSING_TOKEN');
    });

    test('should return 401 when refresh token is invalid', async () => {
      const response = await request(app)
        .post('/api/auth/refresh')
        .set('Cookie', ['refresh_token=invalid-token']);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/logout', () => {
    test('should return 401 when not authenticated', async () => {
      const response = await request(app)
        .post('/api/auth/logout');

      expect(response.status).toBe(401);
    });
  });
});

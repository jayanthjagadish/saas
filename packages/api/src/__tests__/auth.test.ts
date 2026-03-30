/**
 * Auth API Integration Tests
 * Contract tests for authentication endpoints
 */

import request from 'supertest';
import app from '../app.js';

const TEST_EMAIL = 'test@fenster-test.com';
const TEST_PASSWORD = 'SecureTest123!@#';

describe('Auth API - Contract Tests', () => {
  describe('POST /auth/signup', () => {
    test('should create user with valid data and return 201', async () => {
      const response = await request(app)
        .post('/auth/signup')
        .send({
          email: `test-${Date.now()}@example.com`,
          password: 'StrongPass123!@#',
          company_name: 'Test Company',
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('user_id');
      expect(response.body.data).toHaveProperty('email');
      expect(response.body.data).toHaveProperty('message');
    });

    test('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/auth/signup')
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
        .post('/auth/signup')
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
        .post('/auth/signup')
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

      await request(app)
        .post('/auth/signup')
        .send({ email, password: 'StrongPass123!@#', company_name: 'Test Company' });

      const response = await request(app)
        .post('/auth/signup')
        .send({ email, password: 'StrongPass123!@#', company_name: 'Test Company' });

      expect(response.status).toBe(409);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('EMAIL_EXISTS');
    });
  });

  describe('POST /auth/login', () => {
    test('should login with verified test user and return accessToken', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('accessToken');
      expect(response.body.data).toHaveProperty('userId');
      expect(response.body.data).toHaveProperty('email');
    });

    test('should return 400 when email is missing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ password: 'StrongPass123!@#' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_INPUT');
    });

    test('should return 400 when password is missing', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: TEST_EMAIL });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_INPUT');
    });

    test('should return 401 when password is wrong', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: 'WrongPassword123!' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('INVALID_CREDENTIALS');
    });

    test('should return 401 when user does not exist', async () => {
      const response = await request(app)
        .post('/auth/login')
        .send({ email: `nonexistent-${Date.now()}@example.com`, password: 'AnyPassword123!' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('POST /auth/verify-email', () => {
    test('should return 400 when token is missing', async () => {
      const response = await request(app)
        .post('/auth/verify-email')
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('MISSING_TOKEN');
    });

    test('should return 400 when token is invalid', async () => {
      const response = await request(app)
        .post('/auth/verify-email')
        .send({ token: 'invalid-token-12345' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('INVALID_TOKEN');
    });
  });

  describe('GET /users/me', () => {
    test('should return 401 when no token provided', async () => {
      const response = await request(app).get('/users/me');
      expect(response.status).toBe(401);
    });

    test('should return user data with valid token', async () => {
      const loginRes = await request(app)
        .post('/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });

      expect(loginRes.status).toBe(200);
      const { accessToken } = loginRes.body.data;

      const response = await request(app)
        .get('/users/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('email', TEST_EMAIL);
    });
  });

  describe('POST /auth/refresh', () => {
    test('should return 401 when refresh token is missing', async () => {
      const response = await request(app).post('/auth/refresh');

      expect(response.status).toBe(401);
      expect(response.body.error).toBe('MISSING_TOKEN');
    });

    test('should return 401 when refresh token is invalid', async () => {
      const response = await request(app)
        .post('/auth/refresh')
        .set('Cookie', ['refresh_token=invalid-token']);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /auth/logout', () => {
    test('should return 401 when not authenticated', async () => {
      const response = await request(app).post('/auth/logout');
      expect(response.status).toBe(401);
    });
  });
});

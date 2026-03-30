/**
 * Plans API Integration Tests
 * Contract tests for plans endpoints
 */

import request from 'supertest';
import app from '../app.js';

describe('Plans API - Contract Tests', () => {
  describe('GET /api/plans', () => {
    test('should return 200 and array of plans', async () => {
      const response = await request(app)
        .get('/api/plans');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('plans');
      expect(Array.isArray(response.body.plans)).toBeTruthy();
    });

    test('should return plans with required fields', async () => {
      const response = await request(app)
        .get('/api/plans');

      expect(response.status).toBe(200);
      const plans = response.body.plans;
      
      expect(plans.length).toBeGreaterThan(0);
      
      // Check first plan has required fields
      const plan = plans[0];
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('tier');
      expect(plan).toHaveProperty('price_monthly');
    });

    test('should include price fields', async () => {
      const response = await request(app)
        .get('/api/plans');

      expect(response.status).toBe(200);
      const plans = response.body.plans;
      
      const plan = plans[0];
      expect(plan).toHaveProperty('price_monthly');
      expect(typeof plan.price_monthly).toBe('number');
      
      // Optional: check for price_annual if it exists
      if (plan.price_annual !== undefined) {
        expect(typeof plan.price_annual).toBe('number');
      }
    });

    test('should include features field', async () => {
      const response = await request(app)
        .get('/api/plans');

      expect(response.status).toBe(200);
      const plans = response.body.plans;
      
      const plan = plans[0];
      expect(plan).toHaveProperty('features');
    });

    test('should return annual discount percentage', async () => {
      const response = await request(app)
        .get('/api/plans');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('annual_discount_percent');
      expect(typeof response.body.annual_discount_percent).toBe('number');
    });

    test('should include Free tier plan', async () => {
      const response = await request(app)
        .get('/api/plans');

      expect(response.status).toBe(200);
      const plans = response.body.plans;
      
      const freePlan = plans.find((p: any) => p.tier === 'free' || p.name.toLowerCase() === 'free');
      expect(freePlan).toBeTruthy();
      expect(freePlan.price_monthly).toBe(0);
    });

    test('should include Pro tier plan', async () => {
      const response = await request(app)
        .get('/api/plans');

      expect(response.status).toBe(200);
      const plans = response.body.plans;
      
      const proPlan = plans.find((p: any) => p.tier === 'pro' || p.name.toLowerCase() === 'pro');
      expect(proPlan).toBeTruthy();
      expect(proPlan.price_monthly).toBeGreaterThan(0);
    });

    test('should include Enterprise tier plan', async () => {
      const response = await request(app)
        .get('/api/plans');

      expect(response.status).toBe(200);
      const plans = response.body.plans;
      
      const entPlan = plans.find((p: any) => 
        p.tier === 'enterprise' || p.name.toLowerCase() === 'enterprise'
      );
      expect(entPlan).toBeTruthy();
    });
  });

  describe('GET /api/plans/:id', () => {
    test('should return 404 for non-existent plan', async () => {
      const response = await request(app)
        .get('/api/plans/non-existent-id-12345');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('PLAN_NOT_FOUND');
    });

    test('should return plan details for valid ID', async () => {
      // First get all plans to find a valid ID
      const plansResponse = await request(app).get('/api/plans');
      const plans = plansResponse.body.plans;
      
      if (plans.length > 0) {
        const validId = plans[0].id;
        
        const response = await request(app)
          .get(`/api/plans/${validId}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('plan');
        expect(response.body.plan.id).toBe(validId);
      }
    });
  });
});

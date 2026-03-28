import request from 'supertest';
import app from '@api/app';
import Plan from '@api/models/Plan';

jest.mock('@api/models/Plan');

const mockedPlan = Plan as jest.Mocked<typeof Plan> & { findAll?: jest.Mock; findByPk?: jest.Mock };

describe('Plans API', () => {
  beforeAll(() => {
    // mock implementations
    mockedPlan.findAll = jest.fn().mockResolvedValue([
      {
        id: 'free-id',
        name: 'Free',
        tier: 'free',
        price_monthly: 0.0,
        price_annual: 0.0,
        max_members: 5,
        features: ['basic-dashboard', 'basic-support'],
      },
      {
        id: 'pro-id',
        name: 'Pro',
        tier: 'pro',
        price_monthly: 9.99,
        price_annual: 99.99,
        max_members: 50,
        features: ['advanced-dashboard', 'priority-support'],
      },
    ]);

    mockedPlan.findByPk = jest.fn().mockImplementation((id: string) => {
      if (id === 'pro-id')
        return Promise.resolve({
          id: 'pro-id',
          name: 'Pro',
          tier: 'pro',
          price_monthly: 9.99,
          price_annual: 99.99,
          max_members: 50,
          features: ['advanced-dashboard', 'priority-support'],
        });
      return Promise.resolve(null);
    });
  });

  it('GET /api/plans returns list with discount', async () => {
    const res = await request(app).get('/api/plans');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('plans');
    expect(res.body).toHaveProperty('annual_discount_percent', 20);
    expect(Array.isArray(res.body.plans)).toBe(true);
  });

  it('GET /api/plans/:id returns plan detail', async () => {
    const res = await request(app).get('/api/plans/pro-id');
    expect(res.status).toBe(200);
    expect(res.body.plan).toBeDefined();
    expect(res.body.plan.name).toBe('Pro');
    expect(res.body).toHaveProperty('annual_discount_percent', 20);
  });

  it('GET /api/plans/:id returns 404 for unknown', async () => {
    const res = await request(app).get('/api/plans/unknown');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('error', 'PLAN_NOT_FOUND');
  });
});

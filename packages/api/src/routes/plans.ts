import { Router, Request, Response } from 'express';
import Plan from '../models/Plan.js';

const router = Router();

const ANNUAL_DISCOUNT_PERCENT = 20;

// GET /api/plans
router.get('/', async (_req: Request, res: Response) => {
  const plans = await Plan.findAll({
    attributes: ['id', 'name', 'tier', 'price_monthly', 'price_annual', 'max_members', 'features'],
  });

  res.json({ plans, annual_discount_percent: ANNUAL_DISCOUNT_PERCENT });
});

// GET /api/plans/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const plan = await Plan.findByPk(id, {
    attributes: ['id', 'name', 'tier', 'price_monthly', 'price_annual', 'max_members', 'features'],
  });
  if (!plan) {
    return res.status(404).json({ error: 'PLAN_NOT_FOUND' });
  }
  res.json({ plan, annual_discount_percent: ANNUAL_DISCOUNT_PERCENT });
});

export default router;

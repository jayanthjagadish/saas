import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { stripe } from '../services/stripe.js';
import { cancelSubscription, reactivateSubscription } from '../services/subscription.js';
import User from '../models/User.js';
import Plan from '../models/Plan.js';
import Subscription from '../models/Subscription.js';

const router = Router();

// Get current user's subscriptions
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const subscriptions = await Subscription.findAll({
      where: { userId: userInfo.id },
      include: [{ model: Plan, as: 'plan' }]
    });

    res.json({ subscriptions });
  } catch (err) {
    console.error('Error fetching subscriptions:', err);
    res.status(500).json({ error: 'FETCH_FAILED' });
  }
});

// Create a subscription (start payment flow)
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { plan_id, payment_method_id } = req.body as { plan_id: string; payment_method_id: string };
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const user = await User.findByPk(userInfo.id);
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    const plan = await Plan.findByPk(plan_id);
    if (!plan) return res.status(404).json({ error: 'PLAN_NOT_FOUND' });

    // Ensure Stripe customer
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({ email: user.email });
      customerId = customer.id;
      user.stripeCustomerId = customerId;
      await user.save();
    }

    // Create PaymentIntent with idempotency key
    const amountDecimal = (plan.price_monthly ?? plan.price_annual ?? 0) as number;
    const amountCents = Math.round(Number(amountDecimal) * 100);
    const idempotencyKey = `${user.id}-${plan.id}-${Date.now()}`;

    const paymentIntent = await stripe.paymentIntents.create(
      {
        amount: amountCents,
        currency: 'usd',
        payment_method: payment_method_id,
        customer: customerId,
        metadata: {
          user_id: user.id,
          plan_id: plan.id,
        },
      },
      { idempotencyKey }
    );

    // Create local subscription record with status pending
    const subscription = await Subscription.create({
      userId: user.id,
      planId: plan.id,
      stripeSubscriptionId: null,
      stripeCustomerId: customerId,
      status: 'pending',
      currentPeriodEnd: null,
      pricePerMonth: plan.price_monthly ?? 0,
    } as any);

    res.json({ subscription_id: subscription.id, client_secret: paymentIntent.client_secret });
  } catch (err) {
    console.error('Error creating subscription:', err);
    res.status(500).json({ error: 'SUBSCRIPTION_CREATION_FAILED' });
  }
});

// Cancel subscription
router.post('/me/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const result = await cancelSubscription(userInfo.id);

    res.json({ 
      success: true,
      message: 'Subscription cancelled successfully',
      end_date: result.end_date,
      days_remaining: result.days_remaining
    });
  } catch (err: any) {
    console.error('Error cancelling subscription:', err);
    
    if (err.code === 'NO_ACTIVE_SUBSCRIPTION') {
      res.status(404).json({ error: err.code, message: err.message });
      return;
    }
    
    if (err.code === 'INVALID_SUBSCRIPTION') {
      res.status(400).json({ error: err.code, message: err.message });
      return;
    }
    
    res.status(500).json({ error: 'CANCELLATION_FAILED', message: 'Failed to cancel subscription' });
  }
});

// Reactivate subscription
router.post('/me/reactivate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ error: 'UNAUTHORIZED' });

    await reactivateSubscription(userInfo.id);

    res.json({ 
      success: true,
      message: 'Subscription reactivated successfully'
    });
  } catch (err: any) {
    console.error('Error reactivating subscription:', err);
    
    if (err.code === 'NO_PENDING_CANCELLATION') {
      res.status(404).json({ error: err.code, message: err.message });
      return;
    }
    
    if (err.code === 'INVALID_SUBSCRIPTION') {
      res.status(400).json({ error: err.code, message: err.message });
      return;
    }
    
    res.status(500).json({ error: 'REACTIVATION_FAILED', message: 'Failed to reactivate subscription' });
  }
});

export default router;

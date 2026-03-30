import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { stripe } from '../services/stripe.js';
import { cancelSubscription, reactivateSubscription } from '../services/subscription.js';
import User from '../models/User.js';
import Plan from '../models/Plan.js';
import Subscription from '../models/Subscription.js';

const router = Router();

// Priority order for picking the "best" subscription to surface
const STATUS_PRIORITY: Record<string, number> = {
  active: 0,
  cancellation_pending: 1,
  past_due: 2,
  unpaid: 3,
  pending: 4,
  canceled: 5,
};

/** Shape that formatSubscriptionResponse produces — satisfies both Dashboard and SubscriptionPage. */
function formatSubscriptionResponse(sub: Subscription & { plan?: InstanceType<typeof Plan> | null }) {
  const plan = sub.plan ?? null;
  const priceMonthly = Number(plan?.price_monthly ?? sub.pricePerMonth ?? 0);
  const priceDisplay = `$${priceMonthly.toFixed(2)}/month`;
  const periodEndDate = sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd) : null;
  // SubscriptionPage uses current_period_end * 1000 → keep as Unix seconds
  const currentPeriodEndUnix = periodEndDate ? Math.floor(periodEndDate.getTime() / 1000) : null;

  return {
    id: sub.id,
    status: sub.status,
    planId: sub.planId,
    // SubscriptionPage fields
    plan_name: plan?.name ?? null,
    price_display: priceDisplay,
    current_period_end: currentPeriodEndUnix,
    // Dashboard fields (ISO strings)
    currentPeriodStart: sub.currentPeriodStart ? new Date(sub.currentPeriodStart).toISOString() : null,
    currentPeriodEnd: periodEndDate ? periodEndDate.toISOString() : null,
    pricePerMonth: Number(sub.pricePerMonth),
    cancelAtPeriodEnd: sub.cancelAtPeriodEnd ?? false,
    // Full plan object for any page that needs it
    plan: plan
      ? {
          id: plan.id,
          name: plan.name,
          tier: plan.tier,
          price_monthly: plan.price_monthly,
        }
      : null,
  };
}

// Get current user's active (or most recent) subscription — returns a single object
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const subscriptions = await Subscription.findAll({
      where: { userId: userInfo.id },
      include: [{ model: Plan, as: 'plan' }],
      order: [['createdAt', 'DESC']],
    });

    if (!subscriptions.length) {
      return res.json({ success: true, data: null });
    }

    // Pick the highest-priority status; ties broken by most-recent (already ordered DESC)
    const sub = [...subscriptions].sort(
      (a, b) => (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99)
    )[0] as Subscription & { plan?: InstanceType<typeof Plan> | null };

    res.json({ success: true, data: formatSubscriptionResponse(sub) });
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

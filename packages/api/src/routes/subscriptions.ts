import { Router, Request, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { stripe } from '../services/stripe.js';
import { cancelSubscription, reactivateSubscription, cancelSubscriptionV2, reactivateSubscriptionV2 } from '../services/subscription.js';
import User from '../models/User.js';
import Plan from '../models/Plan.js';
import Subscription from '../models/Subscription.js';
import Team from '../models/Team.js';
import TeamMember from '../models/TeamMember.js';
import { sendDowngradeEmail } from '../services/email.js';
import { config } from '../config/index.js';

const router = Router();

/** Returns true when we're running with a test/mock Stripe key (not live). */
function isTestOrMockStripeKey(): boolean {
  const key = config.stripe.secretKey;
  return !key || key.startsWith('sk_test_') || key.startsWith('sk_mock_') || !key.startsWith('sk_live_');
}

const MOCK_INVOICES = [
  {
    id: 'in_mock_001',
    date: new Date('2024-03-01').getTime() / 1000,
    amount: 2900,
    currency: 'usd',
    status: 'paid',
    planName: 'Pro',
    invoicePdfUrl: 'https://invoice.stripe.com/mock/in_mock_001.pdf',
  },
  {
    id: 'in_mock_002',
    date: new Date('2024-02-01').getTime() / 1000,
    amount: 2900,
    currency: 'usd',
    status: 'paid',
    planName: 'Pro',
    invoicePdfUrl: 'https://invoice.stripe.com/mock/in_mock_002.pdf',
  },
  {
    id: 'in_mock_003',
    date: new Date('2024-01-01').getTime() / 1000,
    amount: 2900,
    currency: 'usd',
    status: 'paid',
    planName: 'Pro',
    invoicePdfUrl: 'https://invoice.stripe.com/mock/in_mock_003.pdf',
  },
];

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

// GET /subscriptions/status — subscription status with seat usage
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });

    const subscriptions = await Subscription.findAll({
      where: { userId: userInfo.id },
      include: [{ model: Plan, as: 'plan' }],
      order: [['createdAt', 'DESC']],
    });

    const sub = subscriptions.length
      ? ([...subscriptions].sort(
          (a, b) => (STATUS_PRIORITY[a.status] ?? 99) - (STATUS_PRIORITY[b.status] ?? 99)
        )[0] as Subscription & { plan?: InstanceType<typeof Plan> | null })
      : null;

    // Seat usage
    const team = await Team.findOne({ where: { ownerId: userInfo.id } });
    const memberCount = team ? await TeamMember.count({ where: { teamId: team.id } }) : 0;
    const plan = (sub as any)?.plan ?? null;
    const memberLimit: number = plan?.max_members ?? 1;

    const baseData = sub ? formatSubscriptionResponse(sub) : null;

    return res.json({
      success: true,
      data: {
        ...baseData,
        memberCount,
        memberLimit,
      },
    });
  } catch (err) {
    console.error('Error fetching subscription status:', err);
    return res.status(500).json({ success: false, error: 'FETCH_FAILED' });
  }
});

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

// US-025: Cancel subscription (access continues until period end)
router.post('/cancel', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { accessUntil } = await cancelSubscriptionV2(userInfo.id);
    const accessUntilISO = accessUntil.toISOString();
    const dateLabel = accessUntilISO.split('T')[0];

    res.json({
      success: true,
      data: {
        accessUntil: accessUntilISO,
        message: `Access continues until ${dateLabel}`,
      },
    });
  } catch (err: any) {
    console.error('Error cancelling subscription (US-025):', err);

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

// US-025: Reactivate subscription (undo cancel_at_period_end)
router.post('/reactivate', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ error: 'UNAUTHORIZED' });

    await reactivateSubscriptionV2(userInfo.id);

    res.json({ success: true });
  } catch (err: any) {
    console.error('Error reactivating subscription (US-025):', err);

    if (err.code === 'NO_PENDING_CANCELLATION') {
      res.status(404).json({ error: err.code, message: err.message });
      return;
    }

    if (err.code === 'INVALID_SUBSCRIPTION' || err.code === 'PERIOD_ENDED') {
      res.status(400).json({ error: err.code, message: err.message });
      return;
    }

    res.status(500).json({ error: 'REACTIVATION_FAILED', message: 'Failed to reactivate subscription' });
  }
});

// GET /subscriptions/invoices — list billing history
router.get('/invoices', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const user = await User.findByPk(userInfo.id);
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    // No Stripe customer → free plan, return empty list (or mock if test key)
    if (!user.stripeCustomerId) {
      if (isTestOrMockStripeKey()) {
        return res.json({
          success: true,
          data: { invoices: MOCK_INVOICES, hasMore: false },
        });
      }
      return res.json({ success: true, data: { invoices: [], hasMore: false } });
    }

    const stripeInvoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      limit: 20,
    });

    const invoices = stripeInvoices.data.map((inv) => ({
      id: inv.id,
      date: inv.created,
      amount: inv.amount_paid ?? inv.total ?? 0,
      currency: inv.currency,
      status: inv.status ?? 'unknown',
      planName: (inv.lines?.data?.[0]?.description ?? inv.metadata?.plan_name ?? null),
      invoicePdfUrl: inv.invoice_pdf ?? null,
    }));

    res.json({
      success: true,
      data: { invoices, hasMore: stripeInvoices.has_more },
    });
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ error: 'INVOICE_FETCH_FAILED' });
  }
});

// GET /subscriptions/invoices/:invoiceId/download — get PDF URL for a single invoice
router.get('/invoices/:invoiceId/download', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { invoiceId } = req.params;

    // Return mock PDF URL for mock invoice IDs when using test/mock key
    if (isTestOrMockStripeKey() && invoiceId.startsWith('in_mock_')) {
      const mock = MOCK_INVOICES.find((m) => m.id === invoiceId);
      if (!mock) return res.status(404).json({ error: 'INVOICE_NOT_FOUND' });
      return res.json({ success: true, data: { pdfUrl: mock.invoicePdfUrl } });
    }

    const invoice = await stripe.invoices.retrieve(invoiceId);

    if (!invoice.invoice_pdf) {
      return res.status(404).json({ error: 'PDF_NOT_AVAILABLE' });
    }

    res.json({ success: true, data: { pdfUrl: invoice.invoice_pdf } });
  } catch (err: any) {
    if (err?.statusCode === 404 || err?.code === 'resource_missing') {
      return res.status(404).json({ error: 'INVOICE_NOT_FOUND' });
    }
    console.error('Error fetching invoice PDF:', err);
    res.status(500).json({ error: 'INVOICE_FETCH_FAILED' });
  }
});

// GET /subscriptions/calendar — upcoming billing events for the next 90 days
router.get('/calendar', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });

    // Resolve subscription via TeamMember → Team → owner's Subscription, then fallback to own
    let subscription: (Subscription & { plan?: InstanceType<typeof Plan> | null }) | null = null;

    const membership = await TeamMember.findOne({ where: { userId: userInfo.id } });
    if (membership) {
      const team = await Team.findByPk(membership.teamId);
      if (team) {
        subscription = (await Subscription.findOne({
          where: { userId: team.ownerId, status: ['active', 'cancellation_pending', 'past_due'] as any },
          include: [{ model: Plan, as: 'plan' }],
          order: [['createdAt', 'DESC']],
        })) as (Subscription & { plan?: InstanceType<typeof Plan> | null }) | null;
      }
    }

    if (!subscription) {
      subscription = (await Subscription.findOne({
        where: { userId: userInfo.id, status: ['active', 'cancellation_pending', 'past_due'] as any },
        include: [{ model: Plan, as: 'plan' }],
        order: [['createdAt', 'DESC']],
      })) as (Subscription & { plan?: InstanceType<typeof Plan> | null }) | null;
    }

    if (!subscription) {
      return res.json({ success: true, data: { events: [], nextBillingDate: null } });
    }

    const plan = subscription.plan ?? null;
    const now = new Date();
    const horizon = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

    const priceMonthly = Number(plan?.price_monthly ?? 0);
    const priceAnnual = Number(plan?.price_annual ?? 0);
    const pricePerMonth = Number(subscription.pricePerMonth ?? 0);

    // Infer billing interval from how pricePerMonth relates to plan pricing
    let billingInterval: 'monthly' | 'annual' = 'monthly';
    if (
      priceAnnual > 0 &&
      Math.abs(pricePerMonth - priceAnnual / 12) < Math.abs(pricePerMonth - priceMonthly)
    ) {
      billingInterval = 'annual';
    }

    const planName = plan?.name ?? 'Subscription';
    const displayAmount = billingInterval === 'annual' ? priceAnnual : priceMonthly;
    const priceLabel =
      billingInterval === 'annual'
        ? `$${priceAnnual.toFixed(2)}/yr`
        : `$${priceMonthly.toFixed(2)}/mo`;

    type BillingEvent = {
      date: string;
      type: 'renewal' | 'trial_end' | 'cancellation' | 'invoice_due';
      label: string;
      amount?: number;
      currency: string;
    };

    const events: BillingEvent[] = [];

    if (subscription.currentPeriodEnd) {
      const periodEnd = new Date(subscription.currentPeriodEnd);

      if (subscription.cancelAtPeriodEnd) {
        if (periodEnd >= now && periodEnd <= horizon) {
          events.push({
            date: periodEnd.toISOString().split('T')[0],
            type: 'cancellation',
            label: `Subscription cancellation — ${planName}`,
            currency: 'usd',
          });
        }
      } else if (billingInterval === 'annual') {
        if (periodEnd >= now && periodEnd <= horizon) {
          events.push({
            date: periodEnd.toISOString().split('T')[0],
            type: 'renewal',
            label: `Subscription renewal — ${planName} ${priceLabel}`,
            amount: displayAmount,
            currency: 'usd',
          });
        }
      } else {
        // Monthly: generate up to 3 upcoming renewals within the 90-day window
        let d = new Date(periodEnd);
        for (let i = 0; i < 3; i++) {
          if (d >= now && d <= horizon) {
            events.push({
              date: d.toISOString().split('T')[0],
              type: 'renewal',
              label: `Subscription renewal — ${planName} ${priceLabel}`,
              amount: displayAmount,
              currency: 'usd',
            });
          }
          d = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate());
        }
      }
    }

    events.sort((a, b) => a.date.localeCompare(b.date));

    const nextBillingDate = subscription.currentPeriodEnd
      ? new Date(subscription.currentPeriodEnd).toISOString().split('T')[0]
      : null;

    return res.json({
      success: true,
      data: { events, nextBillingDate, billingInterval },
    });
  } catch (err) {
    console.error('Error fetching billing calendar:', err);
    res.status(500).json({ success: false, error: 'CALENDAR_FETCH_FAILED' });
  }
});

// US-024: Get subscription status (includes pastDue flag)
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const subscription = await Subscription.findOne({
      where: { userId: userInfo.id },
      order: [['createdAt', 'DESC']],
    });

    const pastDue =
      subscription?.status === 'past_due' || subscription?.status === 'unpaid';

    return res.json({
      success: true,
      data: {
        pastDue,
        status: subscription?.status ?? null,
      },
    });
  } catch (err) {
    console.error('Error fetching subscription status:', err);
    res.status(500).json({ error: 'STATUS_FETCH_FAILED' });
  }
});

// US-024: Retry payment for past-due subscription
router.post('/retry-payment', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const user = await User.findByPk(userInfo.id);
    if (!user) return res.status(404).json({ error: 'USER_NOT_FOUND' });

    const subscription = await Subscription.findOne({
      where: { userId: userInfo.id, status: ['past_due', 'unpaid'] as any },
      order: [['createdAt', 'DESC']],
    });

    if (!subscription) {
      return res.status(400).json({ error: 'NO_PAST_DUE_SUBSCRIPTION' });
    }

    if (!subscription.stripeSubscriptionId) {
      return res.status(400).json({ error: 'NO_STRIPE_SUBSCRIPTION' });
    }

    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: 'NO_STRIPE_CUSTOMER' });
    }

    const stripeInvoices = await stripe.invoices.list({
      customer: user.stripeCustomerId,
      subscription: subscription.stripeSubscriptionId,
      status: 'open',
      limit: 1,
    });

    if (!stripeInvoices.data.length) {
      return res.status(404).json({ error: 'NO_OPEN_INVOICE' });
    }

    const invoice = stripeInvoices.data[0];
    const paid = await stripe.invoices.pay(invoice.id);

    return res.json({
      success: true,
      data: {
        invoiceId: paid.id,
        status: paid.status,
      },
    });
  } catch (err: any) {
    console.error('Error retrying payment:', err);
    if (err?.type === 'StripeCardError' || err?.code === 'card_declined') {
      return res.status(400).json({ error: 'PAYMENT_FAILED', message: err.message });
    }
    res.status(500).json({ error: 'RETRY_FAILED' });
  }
});

// US-023: Downgrade subscription
router.post('/downgrade', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ error: 'UNAUTHORIZED' });

    const { planId, billingInterval } = req.body as { planId: string; billingInterval: 'monthly' | 'annual' };

    if (!planId || !['monthly', 'annual'].includes(billingInterval)) {
      return res.status(400).json({ success: false, error: 'INVALID_INPUT' });
    }

    const newPlan = await Plan.findByPk(planId);
    if (!newPlan) return res.status(404).json({ success: false, error: 'PLAN_NOT_FOUND' });

    const subscription = await Subscription.findOne({
      where: { userId: userInfo.id, status: ['active', 'cancellation_pending'] as any },
      order: [['createdAt', 'DESC']],
    });
    if (!subscription) return res.status(404).json({ success: false, error: 'NO_ACTIVE_SUBSCRIPTION' });

    // Member limit check: count members in the user's owned team
    if (newPlan.max_members !== null && newPlan.max_members !== undefined) {
      const team = await Team.findOne({ where: { ownerId: userInfo.id } });
      if (team) {
        const memberCount = await TeamMember.count({ where: { teamId: team.id } });
        if (memberCount > newPlan.max_members) {
          return res.status(400).json({
            success: false,
            error: 'MEMBER_LIMIT_EXCEEDED',
            currentMembers: memberCount,
            newLimit: newPlan.max_members,
          });
        }
      }
    }

    // Call Stripe if this subscription is managed via Stripe
    let creditApplied = 0;
    let effectiveDate = new Date();

    if (subscription.stripeSubscriptionId) {
      const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
      const existingItem = stripeSub.items.data[0];

      const updatedStripeSub = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        items: [{ id: existingItem.id, price: existingItem.price.id }],
        proration_behavior: 'credit_unused' as any,
        metadata: { plan_id: newPlan.id, billing_interval: billingInterval },
      });

      effectiveDate = new Date(updatedStripeSub.current_period_end * 1000);
    }

    const newPrice =
      billingInterval === 'annual'
        ? Number(newPlan.price_annual ?? newPlan.price_monthly ?? 0)
        : Number(newPlan.price_monthly ?? 0);

    const newPricePerMonth =
      billingInterval === 'annual'
        ? Number(newPlan.price_annual ?? 0) / 12
        : Number(newPlan.price_monthly ?? 0);

    await subscription.update({
      planId: newPlan.id,
      status: 'active',
      pricePerMonth: newPricePerMonth,
    } as any);

    const user = await User.findByPk(userInfo.id);
    if (user) {
      await sendDowngradeEmail(user.email, newPlan.name, newPrice, billingInterval, effectiveDate);
    }

    return res.json({
      success: true,
      data: {
        planName: newPlan.name,
        newPrice,
        effectiveDate: effectiveDate.toISOString(),
        creditApplied,
      },
    });
  } catch (err) {
    console.error('Error downgrading subscription:', err);
    res.status(500).json({ success: false, error: 'DOWNGRADE_FAILED' });
  }
});

// GET /subscriptions/status — payment status including past_due fields
router.get('/status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });

    const subscription = await Subscription.findOne({
      where: { userId: userInfo.id },
      order: [['createdAt', 'DESC']],
    });

    if (!subscription) {
      return res.json({
        success: true,
        data: { pastDue: false, lastPaymentFailedAt: null, paymentRetryCount: 0, status: null },
      });
    }

    return res.json({
      success: true,
      data: {
        status: subscription.status,
        pastDue: subscription.status === 'past_due',
        lastPaymentFailedAt: subscription.lastPaymentFailedAt ? subscription.lastPaymentFailedAt.toISOString() : null,
        paymentRetryCount: subscription.paymentRetryCount ?? 0,
      },
    });
  } catch (err) {
    console.error('Error fetching subscription status:', err);
    res.status(500).json({ success: false, error: 'STATUS_FETCH_FAILED' });
  }
});

// POST /subscriptions/retry-payment — manually trigger Stripe invoice retry
router.post('/retry-payment', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ success: false, error: 'UNAUTHORIZED' });

    const subscription = await Subscription.findOne({
      where: { userId: userInfo.id },
      order: [['createdAt', 'DESC']],
    });

    if (!subscription) {
      return res.status(404).json({ success: false, error: 'NO_SUBSCRIPTION' });
    }

    if (!subscription.stripeSubscriptionId) {
      return res.status(400).json({ success: false, error: 'NO_STRIPE_SUBSCRIPTION' });
    }

    // Retrieve the Stripe subscription to get the latest invoice
    const stripeSub = await stripe.subscriptions.retrieve(subscription.stripeSubscriptionId);
    const latestInvoiceId = stripeSub.latest_invoice ? String(stripeSub.latest_invoice) : null;

    if (!latestInvoiceId) {
      return res.status(400).json({ success: false, error: 'NO_INVOICE_FOUND' });
    }

    // Attempt to pay the latest invoice
    const paid = await stripe.invoices.pay(latestInvoiceId);

    return res.json({
      success: true,
      data: {
        invoiceId: paid.id,
        invoiceStatus: paid.status,
      },
    });
  } catch (err: any) {
    console.error('Error retrying payment:', err);
    // Stripe returns a specific error when invoice is already paid
    if (err?.code === 'invoice_payment_intent_requires_action' || err?.code === 'invoice_already_paid') {
      return res.status(400).json({ success: false, error: err.code.toUpperCase() });
    }
    res.status(500).json({ success: false, error: 'RETRY_FAILED' });
  }
});

export default router;

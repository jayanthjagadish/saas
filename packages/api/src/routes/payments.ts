import { Router, Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import { Payment } from '../models/Payment.js';
import Subscription from '../models/Subscription.js';

const router = Router();

/** Fetch all payment records for the authenticated user, most-recent first. */
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userInfo = req.user;
    if (!userInfo) return res.status(401).json({ error: 'UNAUTHORIZED' });

    // Join through subscriptions to scope payments to this user
    const payments = await Payment.findAll({
      include: [
        {
          model: Subscription,
          as: 'subscription',
          where: { userId: userInfo.id },
          attributes: [], // no subscription fields in response
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const data = payments.map((p) => ({
      id: p.id,
      amount: Number(p.amount),
      currency: p.currency,
      status: p.status,
      description: p.description ?? null,
      stripePaymentIntentId: p.stripePaymentIntentId,
      // SubscriptionPage expects `date` (not createdAt)
      date: p.createdAt ? new Date(p.createdAt).toISOString() : null,
      // Stripe invoice URL — not stored locally; surface as null (future enhancement)
      invoice_url: null,
    }));

    res.json({ success: true, data });
  } catch (err) {
    console.error('Error fetching payments:', err);
    res.status(500).json({ error: 'FETCH_FAILED' });
  }
});

export default router;

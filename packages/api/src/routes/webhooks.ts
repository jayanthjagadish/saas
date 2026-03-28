import { Router, Request, Response } from 'express';
import { handleWebhookEvent, verifyWebhookSignature } from '../services/stripe.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

router.post('/stripe', async (req: Request, res: Response, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      throw new AppError(400, 'INVALID_SIGNATURE', 'Missing Stripe signature');
    }

    const event = await verifyWebhookSignature(req.body, signature);
    await handleWebhookEvent(event);

    res.json({ received: true });
  } catch (error) {
    next(error);
  }
});

export default router;

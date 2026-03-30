import express, { Router, Request, Response } from 'express';
import { handleWebhookEvent, verifyWebhookSignature } from '../services/stripe.js';
import { AppError } from '../middleware/errorHandler.js';

const router = Router();

// Use raw body for Stripe signature verification
router.post('/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature || typeof signature !== 'string') {
      console.warn('Missing Stripe signature header');
      return res.status(400).send('Missing Stripe signature');
    }

    let event;
    try {
      // req.body is a Buffer because of express.raw middleware
      const rawBody = (req.body as Buffer).toString('utf8');
      event = await verifyWebhookSignature(rawBody, signature);
    } catch (err) {
      console.error('Stripe signature verification failed:', err);
      return res.status(400).send('Invalid signature');
    }

    try {
      await handleWebhookEvent(event);
    } catch (err) {
      // Log but still return 200 to acknowledge receipt per Stripe recommendations
      console.error('Error processing webhook event:', err);
    }

    // Always respond 200 quickly
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Unexpected webhook handler error:', error);
    res.status(500).send('Webhook handler error');
  }
});

// Dev/test mode: accept JSON webhook events without Stripe signature verification.
// Never enabled in production — use /webhooks/stripe for production traffic.
router.post('/', async (req: Request, res: Response) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: 'NOT_FOUND' });
  }

  try {
    const event = req.body;
    if (!event?.type) {
      return res.status(400).json({ error: 'INVALID_EVENT' });
    }

    try {
      await handleWebhookEvent(event);
    } catch (err) {
      console.error('Error processing dev webhook event:', err);
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Unexpected dev webhook handler error:', error);
    res.status(500).send('Webhook handler error');
  }
});

export default router;

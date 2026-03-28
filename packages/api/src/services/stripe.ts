import Stripe from 'stripe';
import { config } from '../config/index.js';

export const stripe = new Stripe(config.stripe.secretKey, {
  apiVersion: '2023-10-16',
});

export async function verifyWebhookSignature(
  body: string,
  signature: string
): Promise<Stripe.Event> {
  try {
    return stripe.webhooks.constructEvent(
      body,
      signature,
      config.stripe.webhookSecret
    );
  } catch (error) {
    throw new Error(`Webhook signature verification failed: ${error}`);
  }
}

export async function handleWebhookEvent(event: Stripe.Event): Promise<void> {
  console.log(`Processing webhook event: ${event.type}`);

  switch (event.type) {
    case 'customer.subscription.created':
      await handleSubscriptionCreated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.updated':
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;
    case 'customer.subscription.deleted':
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;
    case 'invoice.payment_succeeded':
      await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice);
      break;
    case 'invoice.payment_failed':
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;
    default:
      console.log(`Unhandled webhook event: ${event.type}`);
  }
}

async function handleSubscriptionCreated(_subscription: Stripe.Subscription): Promise<void> {
  // TODO: Update subscription in database
  console.log('Subscription created - to be implemented');
}

async function handleSubscriptionUpdated(_subscription: Stripe.Subscription): Promise<void> {
  // TODO: Update subscription in database
  console.log('Subscription updated - to be implemented');
}

async function handleSubscriptionDeleted(_subscription: Stripe.Subscription): Promise<void> {
  // TODO: Mark subscription as canceled in database
  console.log('Subscription deleted - to be implemented');
}

async function handleInvoicePaymentSucceeded(_invoice: Stripe.Invoice): Promise<void> {
  // TODO: Record payment in database
  console.log('Invoice payment succeeded - to be implemented');
}

async function handleInvoicePaymentFailed(_invoice: Stripe.Invoice): Promise<void> {
  // TODO: Mark payment as failed in database
  console.log('Invoice payment failed - to be implemented');
}

export default { stripe, verifyWebhookSignature, handleWebhookEvent };

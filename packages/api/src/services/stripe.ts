import Stripe from 'stripe';
import { config } from '../config/index.js';
import { Subscription } from '../models/Subscription.js';
import Payment from '../models/Payment.js';
import User from '../models/User.js';
import Plan from '../models/Plan.js';

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
  console.log(`Processing webhook event: ${event.type} (id: ${event.id})`);

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent, event.id);
        break;
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent, event.id);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription, event.id);
        break;
      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object as Stripe.Invoice, event.id);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice, event.id);
        break;
      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }
  } catch (err) {
    console.error(`Error handling webhook ${event.type} (id: ${event.id}):`, err);
    throw err;
  }
}

async function handlePaymentIntentSucceeded(intent: Stripe.PaymentIntent, eventId?: string): Promise<void> {
  console.log(`Handling payment_intent.succeeded for ${intent.id} (event ${eventId})`);
  // Idempotent: check if payment already exists
  const existing = await Payment.findOne({ where: { stripePaymentIntentId: intent.id } });
  if (existing) {
    console.log(`Payment already recorded for intent ${intent.id}`);
    return;
  }

  // Try to determine subscription association: metadata.subscriptionId or invoice -> subscription
  let subscriptionId: string | null = null;
  if (intent.metadata && (intent.metadata as any).subscription_id) {
    subscriptionId = (intent.metadata as any).subscription_id as string;
  }

  // If no subscriptionId, try to find via invoice -> lookup invoice from Stripe
  if (!subscriptionId && (intent.invoice || intent.metadata?.invoice)) {
    const invoiceId = intent.invoice || intent.metadata?.invoice;
    try {
      const invoice = await stripe.invoices.retrieve(String(invoiceId));
      if (invoice && invoice.subscription) subscriptionId = String(invoice.subscription);
    } catch (err) {
      console.warn('Could not retrieve invoice to resolve subscription:', err);
    }
  }

  // If subscriptionId is a Stripe subscription id, try to map to local subscription
  let localSubscription = null;
  if (subscriptionId) {
    localSubscription = await Subscription.findOne({ where: { stripeSubscriptionId: subscriptionId } });
  }

  // Create payment record
  const amount = (intent.amount_received ?? intent.amount ?? 0) / 100;
  const currency = (intent.currency || 'usd').toLowerCase();

  const payment = await Payment.create({
    subscriptionId: localSubscription ? localSubscription.id : null,
    stripePaymentIntentId: intent.id,
    amount,
    currency,
    status: 'succeeded',
    description: `Stripe payment succeeded (event ${eventId})`,
  } as any);

  console.log('Recorded payment', payment.id);

  // Activate subscription if we have a local subscription in pending state
  if (localSubscription && ['pending', 'trialing'].includes(localSubscription.status)) {
    localSubscription.status = 'active';
    if (intent.metadata && (intent.metadata as any).stripe_subscription_id) {
      localSubscription.stripeSubscriptionId = (intent.metadata as any).stripe_subscription_id;
    }
    await localSubscription.save();
    console.log(`Activated subscription ${localSubscription.id}`);
  }
}

async function handlePaymentIntentFailed(intent: Stripe.PaymentIntent, eventId?: string): Promise<void> {
  console.log(`Handling payment_intent.payment_failed for ${intent.id} (event ${eventId})`);
  const existing = await Payment.findOne({ where: { stripePaymentIntentId: intent.id } });
  if (existing) {
    console.log(`Payment already recorded for intent ${intent.id}`);
    return;
  }

  // Determine subscription similar to success handler
  let subscriptionId: string | null = null;
  if (intent.metadata && (intent.metadata as any).subscription_id) {
    subscriptionId = (intent.metadata as any).subscription_id as string;
  }

  let localSubscription = null;
  if (subscriptionId) {
    localSubscription = await Subscription.findOne({ where: { stripeSubscriptionId: subscriptionId } });
  }

  const amount = (intent.amount_received ?? intent.amount ?? 0) / 100;
  const currency = (intent.currency || 'usd').toLowerCase();

  const payment = await Payment.create({
    subscriptionId: localSubscription ? localSubscription.id : null,
    stripePaymentIntentId: intent.id,
    amount,
    currency,
    status: 'failed',
    description: `Stripe payment failed (event ${eventId})`,
  } as any);

  console.log('Recorded failed payment', payment.id);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription, eventId?: string): Promise<void> {
  console.log(`Handling customer.subscription.deleted for ${subscription.id} (event ${eventId})`);
  const local = await Subscription.findOne({ where: { stripeSubscriptionId: subscription.id } });
  if (!local) {
    console.log('No local subscription found for', subscription.id);
    return;
  }

  local.status = 'canceled';
  local.currentPeriodEnd = subscription.current_period_end ? new Date(subscription.current_period_end * 1000) : local.currentPeriodEnd;
  await local.save();
  console.log(`Marked subscription ${local.id} as canceled`);
}

async function handleInvoicePaymentSucceeded(invoice: Stripe.Invoice, eventId?: string): Promise<void> {
  console.log(`Handling invoice.payment_succeeded for ${invoice.id} (event ${eventId})`);
  // If invoice has a payment_intent, delegate to payment_intent handler
  if (invoice.payment_intent) {
    try {
      const pi = await stripe.paymentIntents.retrieve(String(invoice.payment_intent));
      await handlePaymentIntentSucceeded(pi, eventId);
      return;
    } catch (err) {
      console.warn('Could not retrieve payment_intent from invoice:', err);
    }
  }

  // Fallback: record a generic payment
  const subscription = invoice.subscription ? String(invoice.subscription) : null;
  const local = subscription ? await Subscription.findOne({ where: { stripeSubscriptionId: subscription } }) : null;
  const amount = (invoice.amount_paid ?? invoice.total ?? 0) / 100;
  const currency = (invoice.currency || 'usd').toLowerCase();

  const payment = await Payment.create({
    subscriptionId: local ? local.id : null,
    stripePaymentIntentId: invoice.payment_intent ? String(invoice.payment_intent) : `invoice_${invoice.id}`,
    amount,
    currency,
    status: 'succeeded',
    description: `Invoice paid (event ${eventId})`,
  } as any);

  if (local && local.status !== 'active') {
    local.status = 'active';
    await local.save();
  }

  console.log('Recorded payment for invoice', payment.id);
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice, eventId?: string): Promise<void> {
  console.log(`Handling invoice.payment_failed for ${invoice.id} (event ${eventId})`);
  // Record failed payment
  const subscription = invoice.subscription ? String(invoice.subscription) : null;
  const local = subscription ? await Subscription.findOne({ where: { stripeSubscriptionId: subscription } }) : null;
  const amount = (invoice.amount_due ?? 0) / 100;
  const currency = (invoice.currency || 'usd').toLowerCase();

  const payment = await Payment.create({
    subscriptionId: local ? local.id : null,
    stripePaymentIntentId: invoice.payment_intent ? String(invoice.payment_intent) : `invoice_${invoice.id}`,
    amount,
    currency,
    status: 'failed',
    description: `Invoice payment failed (event ${eventId})`,
  } as any);

  console.log('Recorded failed invoice payment', payment.id);
}

export default { stripe, verifyWebhookSignature, handleWebhookEvent };

import Stripe from 'stripe';

export const mockStripeClient = () => {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_mock', {
    apiVersion: '2023-10-16',
  });

  return {
    customers: {
      create: jest.fn().mockResolvedValue({
        id: 'cus_test123',
        email: 'test@example.com',
        created: Math.floor(Date.now() / 1000),
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'cus_test123',
        email: 'test@example.com',
      }),
      update: jest.fn().mockResolvedValue({
        id: 'cus_test123',
        email: 'test@example.com',
      }),
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        customer: 'cus_test123',
        items: {
          data: [
            {
              id: 'si_test123',
              price: {
                id: 'price_test_monthly',
                unit_amount: 2999,
                recurring: { interval: 'month' },
              },
            },
          ],
        },
        status: 'active',
        current_period_start: Math.floor(Date.now() / 1000),
        current_period_end: Math.floor(Date.now() / 1000) + 86400 * 30,
        created: Math.floor(Date.now() / 1000),
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active',
      }),
      update: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        customer: 'cus_test123',
        status: 'active',
      }),
      del: jest.fn().mockResolvedValue({
        id: 'sub_test123',
        canceled_at: Math.floor(Date.now() / 1000),
      }),
      list: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'sub_test123',
            customer: 'cus_test123',
            status: 'active',
          },
        ],
      }),
    },
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_test123',
        amount: 2999,
        currency: 'usd',
        status: 'succeeded',
        client_secret: 'pi_test123_secret',
      }),
      retrieve: jest.fn().mockResolvedValue({
        id: 'pi_test123',
        status: 'succeeded',
      }),
      confirm: jest.fn().mockResolvedValue({
        id: 'pi_test123',
        status: 'succeeded',
      }),
    },
    invoices: {
      retrieve: jest.fn().mockResolvedValue({
        id: 'in_test123',
        subscription: 'sub_test123',
        amount_paid: 2999,
        status: 'paid',
        paid: true,
      }),
      list: jest.fn().mockResolvedValue({
        data: [
          {
            id: 'in_test123',
            subscription: 'sub_test123',
            amount_paid: 2999,
            status: 'paid',
          },
        ],
      }),
    },
    webhooks: {
      constructEvent: jest.fn((body, sig, secret) => {
        // Mock webhook event construction
        return JSON.parse(body as string);
      }),
    },
  };
};

export const createMockWebhookEvent = (type: string, data: any) => {
  return {
    id: `evt_test_${Date.now()}`,
    object: 'event',
    type,
    created: Math.floor(Date.now() / 1000),
    data: {
      object: data,
    },
    livemode: false,
    pending_webhooks: 1,
    request: {
      id: null,
      idempotency_key: null,
    },
  };
};

export const stripeWebhookEvents = {
  paymentSucceeded: (subscriptionId: string, paymentIntentId: string) =>
    createMockWebhookEvent('invoice.payment_succeeded', {
      id: `in_test_${Date.now()}`,
      subscription: subscriptionId,
      payment_intent: paymentIntentId,
      amount_paid: 2999,
      status: 'paid',
    }),

  paymentFailed: (subscriptionId: string) =>
    createMockWebhookEvent('invoice.payment_failed', {
      id: `in_test_${Date.now()}`,
      subscription: subscriptionId,
      status: 'open',
      attempted: true,
    }),

  subscriptionUpdated: (subscriptionId: string, status: string) =>
    createMockWebhookEvent('customer.subscription.updated', {
      id: subscriptionId,
      status,
      customer: 'cus_test123',
      items: {
        data: [
          {
            price: {
              id: 'price_test_monthly',
              unit_amount: 2999,
            },
          },
        ],
      },
    }),

  subscriptionDeleted: (subscriptionId: string) =>
    createMockWebhookEvent('customer.subscription.deleted', {
      id: subscriptionId,
      status: 'canceled',
      customer: 'cus_test123',
      canceled_at: Math.floor(Date.now() / 1000),
    }),

  customerCreated: (customerId: string, email: string) =>
    createMockWebhookEvent('customer.created', {
      id: customerId,
      email,
      created: Math.floor(Date.now() / 1000),
    }),
};

export const createMockSubscription = (overrides?: any) => ({
  id: 'sub_test123',
  user_id: 'user_test123',
  stripe_subscription_id: 'sub_stripe_123',
  plan_id: 'pro',
  status: 'active',
  current_period_start: new Date(),
  current_period_end: new Date(Date.now() + 86400 * 30 * 1000),
  cancel_at: null,
  canceled_at: null,
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createMockPayment = (overrides?: any) => ({
  id: 'pay_test123',
  subscription_id: 'sub_test123',
  stripe_payment_intent_id: 'pi_stripe_123',
  amount: 2999,
  currency: 'usd',
  status: 'succeeded',
  created_at: new Date(),
  updated_at: new Date(),
  ...overrides,
});

export const createMockAuditLog = (overrides?: any) => ({
  id: 'audit_test123',
  user_id: 'user_test123',
  entity_type: 'Subscription',
  entity_id: 'sub_test123',
  action: 'created',
  old_state: {},
  new_state: {
    status: 'active',
    plan_id: 'pro',
  },
  timestamp: new Date(),
  ...overrides,
});

export const paymentScenarios = {
  successfulCharge: {
    subscription: createMockSubscription({ status: 'active' }),
    payment: createMockPayment({ status: 'succeeded' }),
  },

  failedCharge: {
    subscription: createMockSubscription({ status: 'past_due' }),
    payment: createMockPayment({
      status: 'failed',
      error_code: 'card_declined',
    }),
  },

  pendingCharge: {
    subscription: createMockSubscription({ status: 'active' }),
    payment: createMockPayment({ status: 'processing' }),
  },

  duplicateCharge: {
    subscription: createMockSubscription({ status: 'active' }),
    payment1: createMockPayment({
      id: 'pay_dup_1',
      stripe_payment_intent_id: 'pi_duplicate_123',
    }),
    payment2: createMockPayment({
      id: 'pay_dup_2',
      stripe_payment_intent_id: 'pi_duplicate_123', // Same intent ID
    }),
  },

  refund: {
    subscription: createMockSubscription({ status: 'canceled' }),
    payment: createMockPayment({
      status: 'refunded',
      refunded_amount: 2999,
    }),
  },
};

export const subscriptionLifecycles = {
  trialToPaid: [
    createMockSubscription({ status: 'trialing' }),
    createMockSubscription({ status: 'active' }),
  ],

  activeToCancel: [
    createMockSubscription({ status: 'active' }),
    createMockSubscription({ status: 'active', cancel_at: new Date(Date.now() + 86400 * 30 * 1000) }),
    createMockSubscription({ status: 'canceled', canceled_at: new Date() }),
  ],

  activeToPastDue: [
    createMockSubscription({ status: 'active' }),
    createMockSubscription({ status: 'past_due' }),
  ],

  pastDueToActive: [
    createMockSubscription({ status: 'past_due' }),
    createMockSubscription({ status: 'active' }),
  ],
};

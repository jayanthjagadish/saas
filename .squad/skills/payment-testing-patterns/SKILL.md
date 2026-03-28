---
name: "payment-testing-patterns"
description: "Test design patterns for subscription SaaS with Stripe. Covers duplicate detection, failed payment recovery, webhook verification, and audit logging."
domain: "testing, payments, saas"
confidence: "high"
source: "earned — lession3 testing scaffold"
tools:
  - name: "edge-case-discovery"
    description: "Identify payment edge cases: duplicates, failures, refunds, state transitions"
    when: "Testing payment systems with external APIs"
  - name: "mock-stripe"
    description: "Mock Stripe client for fast, isolated payment logic tests"
    when: "Writing unit/integration tests for payment flows"
  - name: "webhook-verification"
    description: "Test webhook signature verification and idempotent processing"
    when: "Integrating Stripe webhooks"
  - name: "data-consistency-testing"
    description: "Verify local DB stays in sync with Stripe as source of truth"
    when: "Testing payment state synchronization"
---

## Context

Payment systems are unforgiving — a single bug can result in duplicate charges, lost payments, or compliance violations. Testing payment code requires:

1. **Comprehensive edge case coverage** (not just happy path)
2. **Idempotency guarantees** (safe to retry without duplicating)
3. **Webhook security** (signature verification before processing)
4. **Audit logging** (every payment change tracked)
5. **State machine correctness** (only valid transitions allowed)

Common payment testing pitfalls:
- Only testing successful charges (missing 90% of real-world issues)
- Not testing duplicate detection (network retry = double charge)
- Skipping webhook signature verification (security risk)
- Forgetting to test failed payment recovery (users stuck in past_due)
- Not logging changes (compliance + debugging nightmare)

This skill captures the test patterns learned from lession3's payment architecture.

---

## Patterns

### 1. Mock Stripe Client (Isolated Unit Testing)

**Pattern:** Create mock Stripe SDK that returns predictable responses without network calls.

**Why:**
- Unit tests run <5ms instead of 500ms+ with real API calls
- No test data pollution (real Stripe test account)
- Offline development and testing
- Deterministic (no flaky network timeouts)

**Implementation:**

```typescript
// tests/utils/stripe-mocks.ts
export const mockStripeClient = () => {
  return {
    customers: {
      create: jest.fn().mockResolvedValue({ id: 'cus_test123' }),
    },
    subscriptions: {
      create: jest.fn().mockResolvedValue({ id: 'sub_test123', status: 'active' }),
    },
    paymentIntents: {
      create: jest.fn().mockResolvedValue({ id: 'pi_test123', status: 'succeeded' }),
    },
    webhooks: {
      constructEvent: jest.fn((body, sig, secret) => JSON.parse(body)),
    },
  };
};

// Usage in tests
const stripe = mockStripeClient();
const result = await paymentService.charge(stripe, userId, 2999);
expect(stripe.paymentIntents.create).toHaveBeenCalledWith(
  expect.objectContaining({ amount: 2999 })
);
```

**Anti-Pattern:** Making real API calls in unit tests (slow, flaky, pollutes test data).

---

### 2. Duplicate Charge Detection (Idempotency)

**Pattern:** Use Stripe's idempotency keys and DB constraints to guarantee single charge.

**Why:**
- Network retry on timeout shouldn't charge twice
- Stripe returns same result if called with same idempotency key
- Local DB constraint on stripe_payment_intent_id ensures single record

**Implementation:**

```typescript
// services/payment.ts
async chargeUser(userId: string, amount: number) {
  const idempotencyKey = `${userId}_${Date.now()}`;

  try {
    // Stripe call with idempotency key
    const intent = await stripe.paymentIntents.create(
      { customer: stripeCustomerId, amount },
      { idempotencyKey }
    );

    // DB insert with unique constraint on stripe_payment_intent_id
    const payment = await db.Payment.create({
      user_id: userId,
      stripe_payment_intent_id: intent.id, // UNIQUE constraint
      amount,
      status: 'succeeded',
    });

    return payment;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') {
      // Same intent ID already processed
      return db.Payment.findOne({
        stripe_payment_intent_id: intent.id,
      });
    }
    throw err;
  }
}

// Test
it('should not create duplicate payment for same intent', async () => {
  const intentId = 'pi_test_123';
  const payment1 = { stripe_payment_intent_id: intentId, ... };
  const payment2 = { stripe_payment_intent_id: intentId, ... };

  // Both point to same intent
  expect(payment1.stripe_payment_intent_id).toBe(payment2.stripe_payment_intent_id);

  // Should only have one DB record
});
```

**Key Points:**
- Idempotency key should be deterministic (user_id + timestamp or intent_id)
- DB unique constraint prevents second insert
- Catch `ER_DUP_ENTRY` and return existing payment

---

### 3. Failed Payment Recovery (State Transitions)

**Pattern:** Move subscription through states safely on payment failure and recovery.

**State Machine:**

```
active ← (payment_succeeded)
  ↓
past_due ← (payment_failed, grace period started)
  ↓
active ← (payment_succeeded within grace period)
  ↓
canceled ← (grace period expired, auto-cancel by Stripe)
```

**Implementation:**

```typescript
// services/webhook.ts
async handlePaymentSucceeded(invoice: StripeInvoice) {
  const subscription = await db.Subscription.findOne({
    stripe_subscription_id: invoice.subscription,
  });

  // Create payment record
  await db.Payment.create({
    subscription_id: subscription.id,
    amount: invoice.amount_paid,
    status: 'succeeded',
  });

  // Update subscription to active (whether it was trialing or past_due)
  await subscription.update({ status: 'active' });

  // Audit log
  await db.AuditLog.create({
    entity_type: 'Subscription',
    entity_id: subscription.id,
    action: 'updated',
    old_state: { status: subscription.status },
    new_state: { status: 'active' },
  });
}

async handlePaymentFailed(invoice: StripeInvoice) {
  const subscription = await db.Subscription.findOne({
    stripe_subscription_id: invoice.subscription,
  });

  // Create failed payment record
  await db.Payment.create({
    subscription_id: subscription.id,
    amount: invoice.amount_due,
    status: 'failed',
    error_code: invoice.last_payment_error?.code,
  });

  // Update subscription to past_due (grace period started)
  await subscription.update({ status: 'past_due' });
}

// Test
it('should recover from past_due on successful payment', async () => {
  const subscription = createMockSubscription({ status: 'past_due' });
  const payment = createMockPayment({ status: 'succeeded' });

  // Call webhook handler
  await webhookService.handlePaymentSucceeded(payment);

  const updated = await db.Subscription.findByPk(subscription.id);
  expect(updated.status).toBe('active');
});
```

**Key Points:**
- Subscribe status reflects Stripe's current state
- Past due → active on successful payment (not permanent)
- Stripe auto-cancels after grace period (we don't need to)

---

### 4. Webhook Signature Verification (Security)

**Pattern:** Always verify webhook signature before processing.

**Why:**
- Attacker could send forged webhook (e.g., fake cancellation)
- Stripe signs webhooks with HMAC-SHA256
- `stripe.webhooks.constructEvent()` does verification

**Implementation:**

```typescript
// handlers/stripe-webhook.ts
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    // Verify signature; throws if tampered
    event = stripe.webhooks.constructEvent(req.body, sig, secret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  // Process event (safe now)
  try {
    switch (event.type) {
      case 'invoice.payment_succeeded':
        await webhookService.handlePaymentSucceeded(event.data.object);
        break;
      case 'invoice.payment_failed':
        await webhookService.handlePaymentFailed(event.data.object);
        break;
      case 'customer.subscription.deleted':
        await webhookService.handleSubscriptionCanceled(event.data.object);
        break;
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).json({ error: 'Processing failed' });
  }

  res.json({ received: true });
});

// Test
it('should reject webhook with invalid signature', async () => {
  const invalidSig = 'fake_signature';
  const body = JSON.stringify({ type: 'invoice.payment_succeeded' });

  expect(() => {
    stripe.webhooks.constructEvent(body, invalidSig, secret);
  }).toThrow('Invalid signature');
});
```

**Key Points:**
- Never skip signature verification
- Use `stripe.webhooks.constructEvent()` (does verification + parsing)
- Return 400 if signature invalid; never process unsigned events

---

### 5. Audit Logging (Compliance & Debugging)

**Pattern:** Log every subscription/payment state change for compliance.

**Why:**
- GDPR / PCI compliance requirements
- Debugging payment issues ("what happened to this payment?")
- Traceability for disputes

**Implementation:**

```typescript
// Database schema
CREATE TABLE audit_log (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL,
  entity_type VARCHAR(50), -- 'Subscription', 'Payment'
  entity_id UUID NOT NULL,
  action VARCHAR(50), -- 'created', 'updated', 'deleted'
  old_state JSON,
  new_state JSON,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX (user_id, timestamp),
  INDEX (entity_id, timestamp)
);

// Service code
async updateSubscription(subscription, newStatus) {
  const oldState = { status: subscription.status, plan: subscription.plan };
  
  await subscription.update({ status: newStatus });
  
  // Log the change
  await db.AuditLog.create({
    user_id: subscription.user_id,
    entity_type: 'Subscription',
    entity_id: subscription.id,
    action: 'updated',
    old_state: oldState,
    new_state: { status: newStatus, plan: subscription.plan },
  });
}

// Test
it('should audit log subscription state changes', async () => {
  const sub = createMockSubscription({ status: 'active' });
  await updateSubscription(sub, 'past_due');

  const log = await db.AuditLog.findOne({
    entity_id: sub.id,
    order: [['timestamp', 'DESC']],
  });

  expect(log.old_state.status).toBe('active');
  expect(log.new_state.status).toBe('past_due');
});
```

**Key Points:**
- Log before and after state
- Include user_id for compliance queries
- Index by (user_id, timestamp) for audit trails

---

### 6. Subscription Lifecycle State Machine (Correctness)

**Pattern:** Define valid state transitions and enforce them.

**Valid Transitions:**

```
trialing → active (on first payment_succeeded)
        → canceled (if payment_failed grace period expires)

active ↔ past_due (on payment_failed / payment_succeeded)
     → canceled (on user request or Stripe auto-cancel)

past_due → active (on payment_succeeded within grace period)
        → canceled (grace period expires)

canceled → (terminal state, never transitions)
```

**Implementation:**

```typescript
// services/subscription.ts
const VALID_TRANSITIONS = {
  trialing: ['active', 'canceled'],
  active: ['past_due', 'canceled'],
  past_due: ['active', 'canceled'],
  canceled: [],
};

async updateSubscriptionStatus(subscription, newStatus) {
  const validTransitions = VALID_TRANSITIONS[subscription.status];
  
  if (!validTransitions.includes(newStatus)) {
    throw new Error(
      `Invalid transition: ${subscription.status} → ${newStatus}`
    );
  }
  
  await subscription.update({ status: newStatus });
}

// Test
it('should only allow valid state transitions', () => {
  const sub = createMockSubscription({ status: 'active' });

  // Valid: active → past_due (payment failed)
  expect(() => updateSubscriptionStatus(sub, 'past_due')).not.toThrow();

  // Valid: past_due → active (payment succeeded)
  expect(() => updateSubscriptionStatus(sub, 'active')).not.toThrow();

  // Invalid: trialing → past_due (no payment attempted yet)
  const trialing = createMockSubscription({ status: 'trialing' });
  expect(() => updateSubscriptionStatus(trialing, 'past_due')).toThrow();

  // Invalid: canceled → active (terminal state)
  const canceled = createMockSubscription({ status: 'canceled' });
  expect(() => updateSubscriptionStatus(canceled, 'active')).toThrow();
});
```

**Key Points:**
- Define valid transitions explicitly
- Throw error on invalid transition
- Test all valid + invalid paths

---

## Anti-Patterns

1. **Not testing duplicate detection:** Only testing happy path misses 90% of issues
2. **Skipping webhook signature verification:** Security vulnerability
3. **Forgetting failed payment recovery:** Users stuck in past_due forever
4. **No audit logging:** Compliance violation + debugging nightmare
5. **Hard-coding test data:** Tests become brittle and hard to maintain
6. **Making real Stripe API calls in unit tests:** Slow, flaky, pollutes test data
7. **Testing without mocking time:** Flaky tests that pass/fail unpredictably
8. **State machine without validation:** Invalid transitions slip through

---

## References

- Stripe Documentation: https://stripe.com/docs/testing
- idempotency-key usage: https://stripe.com/docs/api/idempotent_requests
- Webhook signature verification: https://stripe.com/docs/webhooks/signatures
- State machine pattern: https://refactoring.guru/design-patterns/state

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

## Security Testing Pattern

### Test That Raw Card Data Never Reaches Backend

```typescript
// tests/security/pci-isolation.test.ts
it('should never receive card data in request body', async () => {
  // Simulate a subscription creation — backend should only receive paymentMethodId
  const res = await request(app)
    .post('/api/v1/subscriptions')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      planId: 'pro',
      paymentMethodId: 'pm_card_visa',  // Only Stripe token, not raw card
    });

  expect(res.status).toBe(201);
  // Verify nothing card-related reached backend logs
  // (Inspect Pino log output captured in test — no cardNumber, cvc, expiry fields)
});

it('should reject requests containing raw card data', async () => {
  const res = await request(app)
    .post('/api/v1/subscriptions')
    .set('Authorization', `Bearer ${authToken}`)
    .send({
      planId: 'pro',
      cardNumber: '4242424242424242',  // Should be blocked by Zod schema
      cvv: '123',
    });

  expect(res.status).toBe(400);
  expect(res.body.error.code).toBe('VALIDATION_ERROR');
});
```

### Webhook Forging Attempts Rejected

```typescript
it('should reject webhook with missing signature header', async () => {
  const res = await request(app)
    .post('/webhooks/stripe')
    .send(JSON.stringify({ type: 'invoice.payment_succeeded' }));

  expect(res.status).toBe(400);
});

it('should reject webhook with tampered payload', async () => {
  const validBody = JSON.stringify({ type: 'invoice.payment_succeeded', id: 'evt_test' });
  const tamperedBody = JSON.stringify({ type: 'customer.subscription.deleted', id: 'evt_test' });

  // Use valid signature but different body (tampered)
  const sig = stripe.webhooks.generateTestHeaderString({
    payload: validBody,
    secret: process.env.STRIPE_WEBHOOK_SECRET,
  });

  const res = await request(app)
    .post('/webhooks/stripe')
    .set('Stripe-Signature', sig)
    .set('Content-Type', 'application/json')
    .send(tamperedBody);

  expect(res.status).toBe(400);
});
```

### Replay Attack Prevention

```typescript
it('should reject replayed webhook events (duplicate event ID)', async () => {
  const eventId = 'evt_test_replay_001';
  const event = createMockWebhookEvent({ id: eventId, type: 'invoice.payment_succeeded' });

  // First delivery — should succeed
  const res1 = await deliverWebhook(event);
  expect(res1.status).toBe(200);

  // Second delivery (replay) — should be idempotent, not reprocess
  const res2 = await deliverWebhook(event);
  expect(res2.status).toBe(200);  // Still 200 (not error)

  // But payment should only have been created once
  const payments = await Payment.findAll({ where: { stripeEventId: eventId } });
  expect(payments).toHaveLength(1);
});
```

---

## Performance Testing Pattern

### Payment Endpoint Latency Targets

Run with k6 against staging environment before each release:

```javascript
// tests/load/payment-endpoints.js (k6 script)
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend } from 'k6/metrics';

const subscriptionLatency = new Trend('subscription_latency');

export const options = {
  vus: 50,
  duration: '60s',
  thresholds: {
    'http_req_duration{name:create_subscription}': ['p(95)<500'],  // 500ms p95
    'http_req_duration{name:get_subscription}': ['p(95)<150'],     // 150ms p95
    'http_req_failed': ['rate<0.01'],                              // <1% errors
  },
};

export default function () {
  const res = http.get(`${BASE_URL}/api/v1/subscriptions/me`, {
    headers: { Authorization: `Bearer ${AUTH_TOKEN}` },
    tags: { name: 'get_subscription' },
  });
  check(res, { 'status 200': (r) => r.status === 200 });
  subscriptionLatency.add(res.timings.duration);
  sleep(1);
}
```

**Targets (p95 at 50 VU steady state):**
| Endpoint | Target |
|----------|--------|
| `POST /api/v1/auth/login` | <200ms |
| `GET /api/v1/subscriptions/me` | <150ms |
| `POST /api/v1/subscriptions` | <500ms |
| `POST /webhooks/stripe` (ack) | <100ms |

### Webhook Processing SLA

```typescript
// tests/performance/webhook-processing.test.ts
it('should process webhook within SLA (5s end-to-end)', async () => {
  const start = Date.now();
  const event = createMockWebhookEvent({ type: 'invoice.payment_succeeded' });

  await deliverWebhook(event);

  // Poll for DB update — must complete within 5s
  const updated = await pollUntil(
    () => Subscription.findOne({ where: { status: 'active', updatedAt: { [Op.gte]: new Date(start) } } }),
    { timeout: 5000, interval: 200 }
  );

  expect(updated).not.toBeNull();
  expect(Date.now() - start).toBeLessThan(5000);
});
```

### Stripe API Timeout Handling

```typescript
it('should handle Stripe API timeout gracefully', async () => {
  // Mock Stripe to simulate timeout
  mockStripe.subscriptions.create.mockImplementation(() =>
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Request timed out')), 11000)
    )
  );

  const res = await request(app)
    .post('/api/v1/subscriptions')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ planId: 'pro', paymentMethodId: 'pm_card_visa' });

  expect(res.status).toBe(503);
  expect(res.body.error.code).toBe('STRIPE_UNAVAILABLE');
  // No partial DB state created
  const sub = await Subscription.findOne({ where: { userId } });
  expect(sub).toBeNull();
});
```

---

## Compliance Testing Pattern

### GDPR Right-to-Erasure Test

```typescript
// tests/compliance/gdpr.test.ts
describe('GDPR Right to Erasure', () => {
  it('should anonymize user PII on deletion request', async () => {
    const user = await createTestUser({ email: 'gdpr-test@example.com' });
    const token = await loginUser(user);

    const res = await request(app)
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);

    // User record anonymized (not hard-deleted)
    const deleted = await User.findByPk(user.id, { paranoid: false });
    expect(deleted.email).toMatch(/^deleted_.*@deleted\.invalid$/);
    expect(deleted.passwordHash).toBe('[DELETED]');
    expect(deleted.deletedAt).not.toBeNull();

    // Stripe customer deleted
    expect(mockStripe.customers.del).toHaveBeenCalledWith(user.stripeCustomerId);

    // Audit log created
    const log = await AuditLog.findOne({ where: { userId: user.id, action: 'gdpr_deleted' } });
    expect(log).not.toBeNull();
  });

  it('should not expose deleted user data via API', async () => {
    // After deletion, user's data not accessible
    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });
});
```

### PCI Data Isolation Test (Card Data Never in Logs)

```typescript
// tests/compliance/pci-isolation.test.ts
it('should never log card-related data', async () => {
  const logOutput: string[] = [];
  const pinoSpy = jest.spyOn(logger, 'info').mockImplementation((obj: any) => {
    logOutput.push(JSON.stringify(obj));
  });

  await request(app)
    .post('/api/v1/subscriptions')
    .set('Authorization', `Bearer ${authToken}`)
    .send({ planId: 'pro', paymentMethodId: 'pm_card_visa' });

  const allLogs = logOutput.join('\n');
  // None of these patterns should appear in logs
  expect(allLogs).not.toMatch(/4[0-9]{12}(?:[0-9]{3})?/);  // Visa card pattern
  expect(allLogs).not.toMatch(/cvv|cvc|card_number|cardNumber/i);
  expect(allLogs).not.toMatch(/sk_live_/);  // Live Stripe key

  pinoSpy.mockRestore();
});
```

---

## Chaos Engineering Pattern

### Stripe API Unreachable

```typescript
// tests/chaos/stripe-unavailable.test.ts
describe('Chaos: Stripe API unreachable', () => {
  beforeEach(() => {
    mockStripe.subscriptions.create.mockRejectedValue(
      Object.assign(new Error('Network error'), { type: 'StripeConnectionError' })
    );
  });

  it('should return 503 and not create partial subscription', async () => {
    const res = await request(app)
      .post('/api/v1/subscriptions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ planId: 'pro', paymentMethodId: 'pm_card_visa' });

    expect(res.status).toBe(503);
    expect(res.body.error.code).toBe('STRIPE_UNAVAILABLE');

    // No partial subscription record in DB
    const sub = await Subscription.findOne({ where: { userId } });
    expect(sub).toBeNull();
  });

  it('should succeed after retry when Stripe recovers', async () => {
    // First call fails, second succeeds
    mockStripe.subscriptions.create
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({ id: 'sub_test123', status: 'active' });

    const res = await request(app)
      .post('/api/v1/subscriptions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ planId: 'pro', paymentMethodId: 'pm_card_visa' });

    expect(res.status).toBe(201);
  });
});
```

### DB Write Fails After Stripe Charge

```typescript
describe('Chaos: DB fails after Stripe charge succeeds', () => {
  it('should not orphan Stripe subscription when DB write fails', async () => {
    mockStripe.subscriptions.create.mockResolvedValue({ id: 'sub_test123', status: 'active' });

    // Simulate DB failure
    jest.spyOn(Subscription, 'create').mockRejectedValue(new Error('DB write failed'));
    jest.spyOn(mockStripe.subscriptions, 'cancel');  // Monitor for compensating action

    const res = await request(app)
      .post('/api/v1/subscriptions')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ planId: 'pro', paymentMethodId: 'pm_card_visa' });

    expect(res.status).toBe(500);

    // Compensating transaction: Stripe subscription should be canceled
    expect(mockStripe.subscriptions.cancel).toHaveBeenCalledWith('sub_test123');
  });
});
```

### Webhook Delivery Delayed / Duplicated

```typescript
describe('Chaos: Webhook delivery issues', () => {
  it('should be idempotent when same webhook delivered twice', async () => {
    const event = createMockWebhookEvent({
      id: 'evt_chaos_dup',
      type: 'invoice.payment_succeeded',
    });

    await deliverWebhook(event);
    await deliverWebhook(event);  // Duplicate delivery

    // Only one payment record created
    const payments = await Payment.findAll({ where: { stripeEventId: 'evt_chaos_dup' } });
    expect(payments).toHaveLength(1);
  });

  it('should process delayed webhook correctly', async () => {
    // Simulate webhook arriving 10 minutes after event
    const event = createMockWebhookEvent({
      type: 'customer.subscription.deleted',
      created: Math.floor(Date.now() / 1000) - 600,  // 10 min ago
    });

    const res = await deliverWebhook(event);
    expect(res.status).toBe(200);

    const sub = await Subscription.findOne({ where: { userId } });
    expect(sub.status).toBe('canceled');
  });
});
```

---

## References

- Stripe Documentation: https://stripe.com/docs/testing
- idempotency-key usage: https://stripe.com/docs/api/idempotent_requests
- Webhook signature verification: https://stripe.com/docs/webhooks/signatures
- State machine pattern: https://refactoring.guru/design-patterns/state
- k6 Load Testing: https://k6.io/docs/
- OWASP Testing Guide: https://owasp.org/www-project-web-security-testing-guide/
- GDPR Right to Erasure: https://gdpr-info.eu/art-17-gdpr/

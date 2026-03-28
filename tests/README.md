# Testing Strategy & Architecture

**Project:** lession3 SaaS (React frontend, Express backend, Stripe payments)  
**Version:** 1.0  
**Owner:** Hockney (Testing)

---

## Overview

This document defines the testing strategy for a subscription-based SaaS with payment processing. Our goal: **>90% code coverage with comprehensive edge-case coverage for payment flows.**

### Test Pyramid

```
        E2E (Playwright) - 10%
              ↑
         Integration (Vitest) - 30%
              ↑
           Unit (Jest) - 60%
```

- **Unit Tests (60%):** Service logic, auth, validation, mocking Stripe client
- **Integration Tests (30%):** Database interactions, webhook handling, service-to-service
- **E2E Tests (10%):** Full user journeys (auth → subscription → payment → cancellation)

---

## Directory Structure

```
tests/
├── unit/                         # Jest unit tests
│   ├── auth.spec.ts             # JWT, password hashing, token generation
│   ├── payments.spec.ts         # Payment edge cases, duplicate detection
│   ├── subscriptions.spec.ts    # Subscription state machine
│   └── validation.spec.ts       # Input validation, Zod schemas
├── integration/                  # Vitest integration tests
│   ├── subscription-lifecycle.spec.ts  # Trial → Paid → Renewal → Cancel
│   ├── webhook-handling.spec.ts       # Stripe webhook processing
│   ├── auth-service.spec.ts           # Full auth flow with DB
│   └── data-consistency.spec.ts       # Payment ↔ Subscription ↔ User sync
├── e2e/                          # Playwright end-to-end tests
│   ├── auth-flows.spec.ts       # Sign up, login, logout, token refresh
│   ├── subscription-flows.spec.ts # Plan selection → Payment → Cancellation
│   ├── payment-recovery.spec.ts  # Failed payments, retries, past due
│   └── billing-portal.spec.ts    # Invoice history, plan changes, PDF download
├── fixtures/                      # Test data generators
│   ├── users.json               # Sample user data
│   ├── subscriptions.json       # Sample subscription states
│   ├── payments.json            # Payment scenarios
│   └── stripe-events.json       # Webhook event samples
├── utils/                         # Test utilities
│   ├── auth-mocks.ts            # Mock users, tokens, credentials
│   ├── stripe-mocks.ts          # Mock Stripe client, webhook events
│   ├── subscription-mocks.ts    # Mock subscriptions, payments, audit logs
│   ├── db-reset.ts              # Test database cleanup/setup
│   └── test-helpers.ts          # Shared utilities (random data, etc.)
├── setup.ts                       # Jest/Vitest global setup
├── jest.config.js               # Jest configuration
└── README.md                     # This file

jest.config.js                    # Root level jest config
vitest.config.ts                 # Root level vitest config
playwright.config.ts             # Playwright configuration
```

---

## Test Configuration

### Unit & Integration Tests

**Framework:** Jest (unit) + Vitest (integration)  
**Speed:** <5ms per test average  
**Parallel:** Yes, Jest workers enabled

#### Jest Setup (jest.config.js)

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/?(*.)+(spec|test).ts?(x)'],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
};
```

**Run:**
```bash
npm run test:unit        # Unit tests only
npm run test:unit:watch # Watch mode
npm run test:unit:coverage # With coverage report
```

#### Vitest Setup (vitest.config.ts)

```typescript
export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/integration/**/*.test.ts'],
  },
});
```

**Run:**
```bash
npm run test:integration
npm run test:integration:watch
npm run test:integration:ui  # UI mode
```

---

### E2E Tests

**Framework:** Playwright  
**Browsers:** Chrome, Firefox, Safari (parallel)  
**Speed:** ~30-60s per test  
**Headless:** Yes (disable with `--headed` for debugging)

#### Playwright Setup (playwright.config.ts)

```typescript
export default defineConfig({
  testDir: './tests/e2e',
  workers: process.env.CI ? 1 : undefined, // Serial in CI, parallel locally
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
});
```

**Run:**
```bash
npm run test:e2e              # All browsers
npm run test:e2e -- --headed  # Visible browsers
npm run test:e2e:ui           # Interactive UI
npm run test:e2e:debug        # Step-through debugger
```

---

## Test Utilities & Mocks

### Stripe Mocking (utils/stripe-mocks.ts)

**Purpose:** Mock Stripe client without making real API calls.

```typescript
const stripe = mockStripeClient();

// Returns mock responses for:
stripe.customers.create()
stripe.subscriptions.create()
stripe.paymentIntents.create()
stripe.invoices.retrieve()
stripe.webhooks.constructEvent()
```

**Mock Webhook Events:**

```typescript
stripeWebhookEvents.paymentSucceeded(subscriptionId, intentId)
stripeWebhookEvents.paymentFailed(subscriptionId)
stripeWebhookEvents.subscriptionUpdated(subscriptionId, status)
stripeWebhookEvents.subscriptionDeleted(subscriptionId)
stripeWebhookEvents.customerCreated(customerId, email)
```

### Auth Mocking (utils/auth-mocks.ts)

**Purpose:** Generate test credentials, tokens, JWT verification.

```typescript
createAccessToken(userId, email)      // Returns valid JWT
createRefreshToken(userId)             // Returns refresh token
verifyAccessToken(token)               // Verify and decode JWT
hashPassword(password)                 // Bcrypt hash
verifyPassword(password, hash)         // Bcrypt verify
createAuthHeaders(token)               // Bearer auth header
```

### Subscription Mocking (utils/subscription-mocks.ts)

**Purpose:** Generate realistic subscription and payment states.

```typescript
createMockSubscription({ status: 'active', ... })
createMockPayment({ status: 'succeeded', amount: 2999, ... })
createMockAuditLog({ action: 'created', ... })

// Prebuilt scenarios:
paymentScenarios.successfulCharge
paymentScenarios.failedCharge
paymentScenarios.duplicateCharge
paymentScenarios.refund

subscriptionLifecycles.trialToPaid
subscriptionLifecycles.activeToCancel
subscriptionLifecycles.activeToPastDue
subscriptionLifecycles.pastDueToActive
```

---

## Payment Edge Case Coverage

**Goal:** Zero payment-related bugs in production.

### 1. Duplicate Charge Detection ✓

**Scenario:** Network retry causes same charge twice.

**Test:**
```typescript
it('should detect duplicate charges with same stripe_payment_intent_id', () => {
  const payment1 = createMockPayment({ stripe_payment_intent_id: 'pi_123' });
  const payment2 = createMockPayment({ stripe_payment_intent_id: 'pi_123' });
  
  // Service should idempotently return first payment, not create second
});
```

**Implementation:**
- Stripe API: Use idempotency keys
- Local DB: Check `stripe_payment_intent_id` before INSERT
- Webhook: Process each event only once (check event ID)

---

### 2. Failed Payment Recovery ✓

**Scenario:** Card declined → automatic retry → eventual success.

**Test:**
```typescript
it('should recover from past_due on successful payment', () => {
  const steps = subscriptionLifecycles.pastDueToActive;
  // active → past_due (failed) → active (recovered)
});
```

**Implementation:**
- Mark subscription as `past_due` on `invoice.payment_failed` webhook
- Stripe auto-retries 3 times over 3 days
- Handle `invoice.payment_succeeded` to move back to `active`
- Auto-cancel if grace period (5-7 days) expires

---

### 3. Refund Processing ✓

**Scenario:** User cancels mid-month; refund issued.

**Test:**
```typescript
it('should handle refund request for succeeded payment', () => {
  const { subscription, payment } = paymentScenarios.refund;
  
  expect(subscription.status).toBe('canceled');
  expect(payment.status).toBe('refunded');
});
```

**Implementation:**
- Call `stripe.refunds.create()` on Stripe
- Process `charge.refunded` webhook
- Update payment status to `refunded`

---

### 4. Currency & Amount Validation ✓

**Scenario:** Prevent float rounding errors (e.g., $29.99 = 2999 cents).

**Test:**
```typescript
it('should store amounts in cents to prevent float rounding', () => {
  const payment = createMockPayment({ amount: 2999 }); // $29.99 in cents
  expect(payment.amount === 2999).toBe(true);
});
```

**Implementation:**
- Always store amounts as integers (cents)
- Multiply user-facing prices by 100 before Stripe API call
- Divide by 100 when displaying to user

---

### 5. Subscription Lifecycle State Machine ✓

**Scenario:** Ensure valid state transitions only.

```
                        trial → (payment_succeeded)
                           ↓
                        active ← past_due (payment_succeeded)
                           ↓
                        cancel_at ← (end of period)
                           ↓
                        canceled
```

**Test:**
```typescript
it('should transition from trial to active on invoice.payment_succeeded', () => {
  const trial = subscriptionLifecycles.trialToPaid[0];
  const active = subscriptionLifecycles.trialToPaid[1];
  
  expect(trial.status).toBe('trialing');
  expect(active.status).toBe('active');
});
```

---

### 6. Webhook Signature Verification ✓

**Scenario:** Prevent forged webhook events (attacker sends fake cancellation).

**Test:**
```typescript
it('should verify webhook signature before processing', async () => {
  // Service must call stripe.webhooks.constructEvent()
  // This verifies the hmac-sha256 signature
});
```

**Implementation:**
- Always use `stripe.webhooks.constructEvent(body, sig, secret)`
- Never trust raw webhook JSON without signature verification
- Return 400 if signature invalid; never process

---

### 7. Audit Logging ✓

**Scenario:** Track all payment/subscription changes for compliance.

**Test:**
```typescript
it('should audit log all subscription state changes', () => {
  const auditLog = createMockAuditLog({
    entity_type: 'Subscription',
    action: 'updated',
    old_state: { status: 'active' },
    new_state: { status: 'past_due' },
  });
});
```

**Implementation:**
- Insert AuditLog row on every Subscription/Payment update
- Store old_state and new_state as JSON
- Index by (user_id, timestamp) for query performance

---

### 8. Data Consistency ✓

**Scenario:** Stripe is source of truth; local DB is mirror.

**Test:**
```typescript
it('should keep DB subscription state in sync with Stripe', () => {
  // Local DB record has stripe_subscription_id matching Stripe
  // Webhook updates trigger DB updates, not vice versa
});
```

**Implementation:**
- Never write to Stripe from local DB (one-way)
- Always read state from Stripe first (e.g., GET /subscriptions/:id)
- Use webhooks as the sole mechanism for DB updates

---

## Test Coverage Thresholds

| Category | Target | Metric |
|----------|--------|--------|
| **Statements** | 80% | All code lines executed |
| **Branches** | 80% | All if/else paths tested |
| **Functions** | 80% | All functions called |
| **Lines** | 80% | Non-comment lines covered |

**Exclude:**
- `dist/`, `build/`, `node_modules/`
- `.d.ts` type definition files
- Index re-exports

**Run coverage:**
```bash
npm run test:coverage
npm run test:coverage -- --watch
```

---

## Running Tests

### Local Development

```bash
# Run all tests
npm run test

# Unit tests only (fast)
npm run test:unit
npm run test:unit:watch

# Integration tests
npm run test:integration
npm run test:integration:watch

# E2E tests
npm run test:e2e
npm run test:e2e -- --headed

# Coverage report (opens HTML)
npm run test:coverage
```

### CI/CD Pipeline

```bash
# Run in sequence (all tests, all browsers)
npm run test:ci

# Fail fast on first error
npm run test:ci -- --bail

# Generate JUnit XML for GitHub Actions
npm run test:ci -- --reporters=junit
```

---

## Debugging Tests

### Jest / Vitest

```bash
# Verbose output
npm run test:unit -- --verbose

# Debug single test
npm run test:unit -- --testNamePattern="Duplicate Payment"

# Run tests matching pattern
npm run test:unit -- subscriptions
```

### Playwright

```bash
# Open inspector
npm run test:e2e:debug

# Run in headed mode (visible browser)
npm run test:e2e -- --headed

# Slow motion (helpful for watching clicks)
npm run test:e2e -- --headed --slowMo 1000

# Screenshot on failure
npm run test:e2e

# View traces
npx playwright show-trace trace.zip
```

---

## Test Templates

### Unit Test Template

```typescript
describe('Feature Name', () => {
  beforeEach(() => {
    // Setup mocks
  });

  afterEach(() => {
    // Cleanup
  });

  it('should do X given Y', () => {
    // Arrange
    const input = createMockData();

    // Act
    const result = service.method(input);

    // Assert
    expect(result).toEqual(expected);
  });
});
```

### Integration Test Template

```typescript
describe('Feature Integration', () => {
  beforeEach(async () => {
    // Reset DB
    await db.transaction(async (tx) => {
      await tx.users.truncate();
      await tx.subscriptions.truncate();
    });
  });

  it('should create subscription and charge payment', async () => {
    const user = createMockUser();
    await db.users.create(user);

    const sub = await subscriptionService.create(user.id, 'pro');

    expect(sub.status).toBe('active');
    const payment = await db.payments.findOne({ subscription_id: sub.id });
    expect(payment.status).toBe('succeeded');
  });
});
```

### E2E Test Template

```typescript
test('should complete user journey', async ({ page }) => {
  // Navigate
  await page.goto('/');

  // Interact
  await page.fill('input[name="email"]', 'test@example.com');
  await page.click('button[type="submit"]');

  // Assert
  await expect(page).toHaveURL(/.*dashboard/);
  await expect(page.locator('text=Welcome')).toBeVisible();
});
```

---

## Best Practices

### ✓ Do

- **Mock external APIs** (Stripe, email, SMS)
- **Test error cases** (invalid input, network failure, timeout)
- **Use descriptive test names** (should, given, when)
- **Keep tests isolated** (no test depends on another)
- **Use fixtures for complex data** (paymentScenarios, subscriptionLifecycles)
- **Verify both happy path and sad path**
- **Test async code properly** (use await, jest.runAllTimers())
- **Log audit trail** for payment changes
- **Verify webhook signatures** always

### ✗ Don't

- **Make real API calls** to Stripe (use mocks)
- **Hard-code test data** (use factory functions)
- **Test implementation details** (test behavior, not code)
- **Skip error cases** ("it works on my machine")
- **Have flaky tests** (use jest.useFakeTimers for time)
- **Store secrets in code** (use environment variables)
- **Trust webhooks without signature verification**
- **Make duplicate charges** (use idempotency)

---

## Continuous Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run test:unit
      - run: npm run test:integration
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30
```

---

## Payment Test Checklist

- [ ] Duplicate charge detection test written
- [ ] Failed payment recovery test written
- [ ] Refund handling test written
- [ ] Currency/amount validation test written
- [ ] Subscription state machine test written
- [ ] Webhook signature verification test written
- [ ] Audit logging test written
- [ ] Data consistency test written
- [ ] Integration: Trial → Paid transition E2E
- [ ] Integration: Renewal cycle E2E
- [ ] Integration: Past due recovery E2E
- [ ] Integration: Cancellation flow E2E
- [ ] Coverage report: >90% overall
- [ ] All tests passing locally
- [ ] All tests passing in CI

---

## Success Metrics

| Metric | Target | Status |
|--------|--------|--------|
| Code Coverage | >90% | 🟡 Pending |
| Payment Edge Cases | 100% coverage | 🟡 Pending |
| Subscription Lifecycle E2E | All states tested | 🟡 Pending |
| Test Performance | <5s (unit), <30s (e2e) | 🟡 Pending |
| Flaky Tests | 0% | ✓ 0 flaky |
| Test Maintainability | Clear naming, reusable mocks | ✓ High |

---

## Escalations

**Security Issues:** Report immediately to Keaton  
**Payment Bugs:** Production hotfix priority  
**Test Failures:** Investigation + root cause analysis  

---

## References

- [Jest Documentation](https://jestjs.io/)
- [Vitest Documentation](https://vitest.dev/)
- [Playwright Documentation](https://playwright.dev/)
- [Stripe Testing Guide](https://stripe.com/docs/testing)
- [TypeScript Testing Best Practices](https://www.typescriptlang.org/docs/handbook/testing.html)

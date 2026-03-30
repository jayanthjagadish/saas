---
name: "saas-stripe-architecture"
description: "Design patterns for subscription-based SaaS with Stripe, React, Express, MySQL. Covers monorepo structure, event-driven payment flows, JWT auth, and webhook handling."
domain: "architecture, payments, saas"
confidence: "high"
source: "earned — lession3 SaaS project"
tools:
  - name: "architecture-design"
    description: "Decide project layout, tech stack, database schema"
    when: "Starting a new SaaS project with subscriptions"
  - name: "stripe-integration"
    description: "Handle Stripe webhooks, subscription lifecycle, payment flows"
    when: "Integrating Stripe for subscriptions or billing"
  - name: "jwt-auth"
    description: "Implement stateless JWT + refresh token auth"
    when: "Building REST APIs with frontend/backend separation"
---

## Context

Building subscription-based SaaS requires careful coordination between frontend (user payment collection), backend (Stripe API calls), and database (subscription state). Common pitfalls:
- Treating Stripe as just a payment processor (not the source of truth)
- Syncing subscription state in both directions (causes inconsistencies)
- Not verifying webhook signatures (security risk)
- Storing card data (PCI violation)
- Not logging payment changes (compliance + debugging nightmare)

This skill captures the patterns learned from lession3's architecture design.

## Patterns

### 1. Monorepo with Workspaces (Project Structure)
**Pattern:** Single Git repo, npm workspaces, three packages:
```
packages/
  ├── api/        (Express backend)
  ├── web/        (React frontend)
  └── shared/     (Shared types, constants)
```

**Why:** 
- Shared types prevent frontend/backend contract drift
- Single CI/CD pipeline
- Atomic commits when auth, subscription, payment types change together
- E2E tests can verify all layers

**Implementation:**
- Root `package.json` defines workspaces and shared dependencies
- Each package has its own `package.json`, `tsconfig.json`, test config
- `.squad/decisions/inbox/` documents tech decisions (URL patterns, table names, etc.)

---

### 2. Stripe as Single Source of Truth (Payment State)
**Pattern:** Local DB mirrors Stripe state; webhooks are the update mechanism.

```
User subscribes → Backend calls Stripe API → Stripe returns subscription_id
                  Backend stores subscription_id in local DB
                  (only this, nothing else)
                  ↓
Stripe charges customer → Stripe emits invoice.payment_succeeded webhook
                          Backend verifies webhook signature
                          Backend updates Payment + Subscription status in DB
```

**Why:**
- Stripe state is always authoritative
- Prevents "out of sync" bugs
- Webhook retries ensure eventual consistency
- No complex sync logic to maintain

**Anti-Pattern:** Storing subscription status in both Stripe and local DB and syncing bidirectionally (breaks when either system is unreachable).

---

### 3. Event-Driven Subscription Lifecycle
**Pattern:** Stripe emits events; backend responds with DB updates.

**Webhook Events to Handle:**
```
invoice.payment_succeeded      → Update Payment status; mark Subscription active
invoice.payment_failed         → Update Payment status; mark Subscription past_due
customer.subscription.updated  → Update Subscription plan/status
customer.subscription.deleted  → Mark Subscription canceled
customer.created               → (rarely used; created on first subscription)
```

**Implementation:**
```
POST /webhooks/stripe
  1. Verify signature with Stripe SDK (never skip)
  2. Extract event.type + event.data
  3. Call appropriate handler (e.g., handlePaymentSucceeded)
  4. Return 200 OK only after DB write succeeds
  5. If error, return 500 or 4xx; Stripe retries
```

**Why Signatures Matter:**
- Webhook could be forged (attacker tries to cancel subscriptions)
- Stripe SDK's `constructEvent()` verifies the signature cryptographically

---

### 4. JWT + httpOnly Refresh Token Auth
**Pattern:** Stateless auth with two token types.

**Tokens:**
- **Access Token:** 15-minute expiry, Bearer auth, sent in Authorization header
  - Payload: `{ sub: user_id, email, iat, exp }`
  - Included in every API call
- **Refresh Token:** 30-day expiry, stored in httpOnly secure cookie
  - Frontend sends to `POST /auth/refresh` when access token expires
  - Backend issues new access token (no re-login needed)

**Why:**
- Stateless (no session store on backend)
- XSS-safe (refresh token in httpOnly cookie can't be accessed by JS)
- CSRF-safe (refresh token sent by browser; not JS)
- 15min access token limits damage if token is stolen

**Anti-Pattern:** Storing refresh token in localStorage (XSS exposes it).

---

### 5. Database Schema (Subscription SaaS)
**Pattern:** Five core tables with audit trail.

```sql
Users
  id (UUID PK)
  email (unique)
  password_hash (bcrypt)
  stripe_customer_id (Stripe's ID for this user)
  created_at

Subscriptions
  id (UUID PK)
  user_id (FK → Users)
  stripe_subscription_id (unique; Stripe's ID)
  plan_id (e.g., "pro", "enterprise")
  status (active, past_due, canceled, trialing)
  current_period_start
  current_period_end
  cancel_at (when cancellation takes effect)
  created_at

Payments
  id (UUID PK)
  subscription_id (FK → Subscriptions)
  stripe_payment_intent_id (unique)
  amount (in cents, not dollars; prevents float rounding)
  currency (e.g., "usd")
  status (succeeded, failed, requires_action)
  created_at

AuditLog
  id (UUID PK)
  user_id (FK → Users, nullable)
  entity_type (e.g., "Subscription")
  entity_id (UUID)
  action (created, updated, canceled)
  old_state (JSON; before change)
  new_state (JSON; after change)
  timestamp (timestamp)

RefreshTokens (optional; if you revoke tokens)
  id (UUID PK)
  user_id (FK → Users)
  token_hash (hash of refresh token; never store plain)
  expires_at
  revoked_at
```

**Indexes:**
- `Users(email)` for login
- `Subscriptions(user_id, status)` for active subs per user
- `Payments(subscription_id, created_at)` for payment history
- `AuditLog(user_id, timestamp)` for audit trails

---

### 6. API Endpoint Architecture
**Pattern:** RESTful CRUD with clear separation.

**Auth Endpoints (Public):**
```
POST /auth/register        → Create user, issue tokens
POST /auth/login           → Verify credentials, issue tokens
POST /auth/refresh         → Exchange refresh token for access token
POST /auth/logout          → Revoke refresh token (optional)
```

**User Endpoints (Authenticated):**
```
GET /users/me              → Current user details
PUT /users/me              → Update user (email, etc.)
DELETE /users/me           → Soft-delete user
```

**Subscription Endpoints (Authenticated):**
```
GET /subscriptions/me      → Current subscription or 404
POST /subscriptions        → Create subscription (send to Stripe first)
PATCH /subscriptions/me    → Change plan (update in Stripe)
DELETE /subscriptions/me   → Cancel subscription (call Stripe's cancel)
```

**Payment Endpoints (Authenticated):**
```
GET /payments/me           → List user's payments
POST /payments/setup-intent → Get setup intent for collecting payment method
```

**Webhook Endpoints (Public):**
```
POST /webhooks/stripe      → Receive Stripe events (verify signature)
```

**Error Format:**
```json
{
  "error": {
    "code": "INVALID_PLAN",
    "message": "Plan 'xyz' not found",
    "details": { "plan_id": "xyz" }
  }
}
```

---

### 7. Frontend Payment Collection (Stripe Elements)
**Pattern:** Use Stripe Elements React, never handle raw card data.

```typescript
// Frontend flow:
1. User clicks "Subscribe"
2. Frontend calls POST /subscriptions/me with plan_id
3. Backend creates Stripe subscription, returns client_secret
4. Frontend shows Stripe Payment Element (handles card collection)
5. User completes payment
6. Stripe redirects to success page or emits webhook
```

**Why Never Handle Raw Cards:**
- PCI DSS compliance is complex (use Elements instead)
- Stripe Elements is pre-built, tested, audited
- Reduces liability

---

### 8. Security Checklist
**Pattern:** Non-negotiable for payment systems.

```
☐ HTTPS enforced (no HTTP in production)
☐ Passwords hashed with bcrypt (12+ rounds, never plain)
☐ JWT expires in 15min; refresh tokens are httpOnly, secure, sameSite
☐ SQL injection prevented (ORM with parameterized queries)
☐ CORS configured (allow only your frontend origin)
☐ Rate limiting (5 failed logins → 15min lockout)
☐ Stripe webhook signatures verified before processing
☐ Audit logs for all subscription/payment changes
☐ Error responses never leak internal details
☐ Passwords and tokens never logged
☐ Database backups daily, encrypted in transit
☐ Environment variables (never in code): DB credentials, Stripe keys, JWT secrets
```

---

## Examples

### Example 1: Webhook Handler (Node.js/Express)
```typescript
// POST /webhooks/stripe
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    // Verify signature; throws if invalid
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'invoice.payment_succeeded': {
        const invoice = event.data.object;
        const subscription = await Subscription.findOne({
          where: { stripe_subscription_id: invoice.subscription }
        });
        await Payment.create({
          subscription_id: subscription.id,
          stripe_payment_intent_id: invoice.payment_intent,
          amount: invoice.amount_paid,
          currency: invoice.currency,
          status: 'succeeded'
        });
        await subscription.update({ status: 'active' });
        break;
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object;
        const subscription = await Subscription.findOne({
          where: { stripe_subscription_id: sub.id }
        });
        await subscription.update({ status: 'canceled' });
        break;
      }
    }
  } catch (err) {
    console.error('Webhook processing error:', err);
    return res.status(500).send('Webhook processing failed');
  }

  res.send({ received: true });
});
```

### Example 2: Frontend Auth Context
```typescript
// React: Wrap app with AuthProvider
// Provides { user, login, logout, isLoading }
// Automatically refreshes token when about to expire

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));

  const refreshToken = async () => {
    try {
      const res = await fetch('/auth/refresh', {
        method: 'POST',
        credentials: 'include' // Include httpOnly cookie
      });
      if (res.ok) {
        const { token: newToken } = await res.json();
        setToken(newToken);
        localStorage.setItem('token', newToken);
      }
    } catch (err) {
      setUser(null);
      setToken(null);
    }
  };

  // Refresh token every 10 minutes (before 15min expiry)
  useEffect(() => {
    const interval = setInterval(refreshToken, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
};
```

---

## Anti-Patterns

1. **Bidirectional sync with Stripe:** Don't write subscription changes to both Stripe and local DB. Use webhooks.
2. **Trusting webhooks without signature verification:** Always call `stripe.webhooks.constructEvent()`.
3. **Storing sensitive data in Redux/Context:** Tokens and passwords should only be in memory or httpOnly cookies.
4. **Handling card data on backend:** Use Stripe Elements; never collect raw card numbers server-side.
5. **Not logging payment changes:** Audit logs are non-negotiable for compliance + debugging.
6. **Long-lived access tokens:** 15min expiry is industry standard; 1hour is risky.
7. **Storing tokens in localStorage:** XSS can steal them; use httpOnly cookies for refresh tokens.
8. **Hard-coded Stripe keys:** Use environment variables; never commit live keys to Git.
9. **Ignoring rate limiting:** Brute force attacks target login endpoints; add 5-attempt + 15min lockout.
10. **Soft-delete without audit trail:** Track why a user was deleted (compliance, GDPR requests, fraud).

---

## Compliance Pattern

### PCI-DSS Scope Reduction

**Rule:** Fenster MUST never touch raw card data. Stripe Elements handles all card collection.

```
Frontend (Senthil):
  User → Stripe Elements (hosted iframe) → Stripe API
  ↓
  Stripe returns: payment_method_id or client_secret
  ↓
Backend (Karthi):
  POST /api/v1/subscriptions { planId, paymentMethodId }
  ↓
  stripe.subscriptions.create({ customer, items, default_payment_method })
  ↓
  Store only: stripe_subscription_id, stripe_customer_id (NOT card data)
```

**Verification Checklist (Auxi verifies per release):**
- `☐` No `card`, `cardNumber`, `cvv`, `cvc`, `expiry` fields anywhere in DB schema
- `☐` No card-related data in Pino logs (redact config enforced)
- `☐` No card data in API request/response bodies (Zod schema enforces no such fields)
- `☐` Stripe Elements iframe confirmed in frontend (not a custom form)
- `☐` Network tab in browser shows card data sent directly to `api.stripe.com`, not Fenster backend

### GDPR Data Deletion

Triggered by `DELETE /api/v1/users/me`:

```typescript
async deleteUser(userId: string) {
  const user = await User.findByPk(userId);

  // 1. Delete Stripe customer (removes payment methods, cancels subscriptions)
  if (user.stripeCustomerId) {
    await stripe.customers.del(user.stripeCustomerId);
  }

  // 2. Cancel and soft-delete local subscriptions
  await Subscription.update(
    { status: 'canceled', deletedAt: new Date() },
    { where: { userId } }
  );

  // 3. Anonymize user PII (don't hard-delete — retain for fraud/legal)
  await user.update({
    email: `deleted_${userId}@deleted.invalid`,
    passwordHash: '[DELETED]',
    deletedAt: new Date(),
  });

  // 4. Audit log
  await AuditLog.create({
    userId,
    entityType: 'User',
    entityId: userId,
    action: 'gdpr_deleted',
    newState: { reason: 'user_request' },
  });

  // 5. Scribe logs to gdpr-audit.md
}
```

**Data Retention Policy:**
- Payment records: retained 7 years (PCI-DSS requirement)
- User PII: anonymized on deletion request; anonymization complete within 30 days
- Audit logs: retained indefinitely (compliance record, never deleted)
- Refresh tokens: expire naturally (30 days); purged on user deletion

---

## Reliability Pattern

### Stripe API Retries with Exponential Backoff

Stripe SDK has built-in retry, but configure it explicitly:

```typescript
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
  maxNetworkRetries: 3,  // Auto-retry on network errors and 5xx responses
  timeout: 10000,        // 10s timeout per request
});
```

For critical operations, add application-level retry with jitter:
```typescript
async function stripeWithRetry<T>(fn: () => Promise<T>, maxAttempts = 3): Promise<T> {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === maxAttempts || err.type === 'StripeCardError') throw err;
      const backoffMs = Math.pow(2, attempt) * 100 + Math.random() * 100;
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }
  }
}
```

### Webhook Endpoint SLA

Stripe requires webhook responses within **30 seconds** — exceeding this causes retries.

```typescript
// /webhooks/stripe handler
// 1. Verify signature immediately (< 5ms)
// 2. Ack with 200 (< 100ms)
// 3. Process event asynchronously via job queue
app.post('/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const event = verifyWebhookSignature(req);  // throws on invalid
  res.json({ received: true });               // ack immediately
  setImmediate(() => processWebhookEvent(event)); // process async
});
```

Target: webhook handler responds in <500ms; processing completes in <5s.

### Event Deduplication with DB Idempotency Keys

Stripe retries webhooks on non-2xx or timeout. Process each event exactly once:

```typescript
// models/WebhookEvent.ts
// Table: webhook_events (stripeEventId: unique, processedAt)

async function processWebhookEvent(event: Stripe.Event) {
  const existing = await WebhookEvent.findByPk(event.id);
  if (existing) {
    logger.info({ eventId: event.id }, 'Duplicate webhook event, skipping');
    return;
  }

  await WebhookEvent.create({ stripeEventId: event.id, processedAt: new Date() });
  await dispatchEvent(event);
}
```

---

## Observability Pattern

### Payment Funnel Metrics

Track payment journey with structured log events:

```typescript
// Log at each funnel stage (Pino structured events)
logger.info({ event: 'payment.initiated',    userId, planId, amount });
logger.info({ event: 'payment.stripe_called', userId, planId, stripeCustomerId });
logger.info({ event: 'payment.succeeded',    userId, planId, amount, paymentIntentId });
logger.error({ event: 'payment.failed',      userId, planId, errorCode, stripeError });
```

**Funnel metrics to monitor (Ralph queries these):**
- Attempt → Succeeded rate (target: >95%)
- Attempt → Failed rate (alert if >5%)
- Mean time from `payment.initiated` to `payment.succeeded` (target: <3s)

### Webhook Processing Latency

```typescript
logger.info({
  event: 'webhook.processed',
  stripeEventType: event.type,
  stripeEventId: event.id,
  processingMs: Date.now() - startTime,
});
```

Alert Ralph if webhook processing latency p95 exceeds 2000ms.

### Subscription Churn Signals

Log subscription lifecycle transitions:
```typescript
logger.info({ event: 'subscription.created',  userId, planId });
logger.info({ event: 'subscription.upgraded', userId, fromPlan, toPlan });
logger.info({ event: 'subscription.canceled', userId, planId, reason });
logger.info({ event: 'subscription.past_due', userId, planId });
```

---

## Multi-Environment Pattern

### Stripe Test/Live Key Management

```
STRIPE_SECRET_KEY=sk_test_...     # development + staging
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...   # different per environment

# Production only (via secrets manager, never in .env file):
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...   # different webhook secret for prod
```

**Rules:**
- `sk_live_` keys NEVER in `.env` files, never committed, only in production secrets manager
- Each environment (dev, staging, prod) has its own webhook endpoint registered in Stripe Dashboard
- Test webhooks triggered via `stripe listen --forward-to localhost:3000/webhooks/stripe` for local dev
- Basher's release gate verifies no `sk_live_` keys appear in source code (`git grep sk_live_`)

### Webhook Endpoint Per Environment

| Environment | Webhook URL | Stripe Mode |
|-------------|-------------|-------------|
| Local dev   | Stripe CLI forward | test |
| Staging     | `https://staging.fenster.app/webhooks/stripe` | test |
| Production  | `https://fenster.app/webhooks/stripe` | live |

Each environment has its own `STRIPE_WEBHOOK_SECRET` — cross-environment webhook delivery is rejected automatically.

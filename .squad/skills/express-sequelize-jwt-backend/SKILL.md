# Backend Scaffolding with Express + Sequelize + JWT

**Pattern Type:** Backend Architecture  
**Tech Stack:** Express.js, TypeScript, Sequelize ORM, MySQL, JWT, Stripe

## Problem Solved

Setting up a production-ready Express backend with:
- Type-safe Sequelize ORM models & migrations
- Stateless JWT auth (access + refresh tokens)
- Stripe webhook integration (event-driven)
- Centralized error handling & request logging
- Monorepo-ready structure

## Solution Overview

### 1. Project Structure
```
packages/api/src/
├── config/           # Environment + database setup
├── models/           # Sequelize models with relationships
├── middleware/       # Auth, error handling, logging
├── services/         # Business logic (auth, Stripe)
├── routes/           # API endpoints (placeholder)
└── app.ts            # Express setup
```

### 2. Models & Relationships
```
User (1) ─→ (Many) Subscription
  ├─ email, password (bcrypt hashed), stripeCustomerId
  └─ Stripe is source of truth for subscriptions

User (1) ─→ (Many) Payment
  └─ Audit trail for all transactions
```

### 3. Auth Flow
```
User calls POST /auth/login
  ↓
Service hashes password, generates JWTs
  ↓
Access token (15min, Bearer) returned in response
Refresh token (30day) returned in httpOnly cookie
  ↓
Client sends: Authorization: Bearer <access_token>
  ↓
Middleware verifies token → attaches user to request
  ↓
When expired: POST /auth/refresh (auto-sends refresh token cookie)
```

### 4. Stripe Webhook Handler
```
Stripe Event → /webhooks/stripe (signature verified)
  ↓
handleWebhookEvent() dispatches to handler
  ↓
Switch on event type:
  - customer.subscription.created → insert in DB
  - customer.subscription.updated → update status
  - invoice.payment_succeeded → record payment
  ↓
Audit logged with timestamp
```

### 5. Error Handling
```
throw new AppError(statusCode, code, message)
  ↓
Caught by errorHandler middleware
  ↓
Response: { error: code, message: message }
```

## Key Files

| File | Purpose |
|------|---------|
| `src/config/index.ts` | Config loader (env vars) |
| `src/config/database.ts` | Sequelize initialization |
| `src/models/*.ts` | User, Subscription, Payment |
| `src/middleware/auth.ts` | JWT verification |
| `src/middleware/errorHandler.ts` | Centralized error handling |
| `src/services/auth.ts` | JWT generation, password hashing |
| `src/services/stripe.ts` | Stripe API, webhook handler |
| `src/app.ts` | Express app setup + routes |

## Dev Quick Start

```bash
# Clone + install
git clone <repo>
cd packages/api
npm install

# Setup env
cp .env.example .env
# Edit .env with DB credentials, JWT secrets, Stripe keys

# Start dev server
npm run dev

# Build
npm run build
npm start
```

## Security Considerations

✅ **Already Baked In:**
- JWT stateless (no session store)
- bcryptjs 12 rounds (password hashing)
- httpOnly refresh token (XSS-proof)
- CORS origin restriction
- Stripe webhook signature verification

⚠️ **To Add:**
- Rate limiting on auth endpoints
- Request size limits
- Zod/Joi input validation
- PII encryption fields

## Common Patterns

### Adding a New Endpoint
1. Create route in `src/routes/newFeature.ts`
2. Add service logic in `src/services/newFeatureService.ts`
3. Mount route in `src/app.ts`
4. Validate request with Zod

### Handling Stripe Events
1. Add case in `handleWebhookEvent()` switch
2. Implement handler function (e.g., `handleSubscriptionCreated()`)
3. Fetch user from DB, update Subscription model
4. Log action via Pino

### Adding Database Relationship
1. Add foreign key to model (e.g., `userId`)
2. Define relationship in model: `User.hasMany(Payment)`
3. Run migration: `npm run db:migrate`

## Team Handoff Checklist

- [ ] Jayanth reviews Stripe integration
- [ ] Senthil implements frontend JWT refresh flow
- [ ] Implement auth endpoints (`/login`, `/register`, `/refresh`)
- [ ] Add request validation with Zod
- [ ] Baskar tests auth flows + error cases / Auxi exploratory testing
- [ ] Deploy to staging + smoke test webhooks

## Observability Pattern

### Pino Structured Logging with Request IDs

Every request must carry a `requestId` (generated at entry) and `correlationId` (forwarded from upstream or generated if absent).

```typescript
// middleware/requestContext.ts
import pino from 'pino';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  redact: ['body.password', 'body.token', 'body.card', 'headers.authorization'],
});

export const requestContextMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const requestId = uuidv4();
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();

  req.requestId = requestId;
  req.correlationId = correlationId;
  res.setHeader('X-Request-ID', requestId);
  res.setHeader('X-Correlation-ID', correlationId);

  const startTime = Date.now();
  res.on('finish', () => {
    logger.info({
      requestId,
      correlationId,
      userId: req.user?.id,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: Date.now() - startTime,
    });
  });

  next();
};
```

**Rules:**
- Use `logger.warn` for non-critical errors (validation failures, rate limit hits)
- Use `logger.error` for 5xx errors — always include `err.message` and `err.stack`
- Use `logger.info` for business events (subscription created, payment succeeded)
- NEVER log: passwords, tokens, raw card data, full JWT payloads
- Log level by environment: `debug` (dev) → `info` (staging) → `warn` (prod)

---

## Input Validation Pattern

### Zod Schemas at Route Entry

Every route handler must validate its input via a Zod schema before any business logic executes.

```typescript
// routes/subscriptions.ts
import { z } from 'zod';
import { validateRequest } from '../middleware/validate';

const createSubscriptionSchema = z.object({
  body: z.object({
    planId: z.enum(['starter', 'pro', 'enterprise']),
    idempotencyKey: z.string().uuid().optional(),
  }),
});

router.post(
  '/api/v1/subscriptions',
  authenticate,
  validateRequest(createSubscriptionSchema),
  async (req, res) => { /* handler */ }
);

// middleware/validate.ts
export const validateRequest = (schema: z.ZodSchema) => (req, res, next) => {
  const result = schema.safeParse({ body: req.body, params: req.params, query: req.query });
  if (!result.success) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        fields: result.error.issues.map(i => ({ path: i.path.join('.'), message: i.message })),
      },
    });
  }
  next();
};
```

**Rules:**
- Zod schemas exported from route files — Baskar uses them for contract tests
- `body`, `params`, and `query` all validated (don't skip query params)
- Unknown fields stripped via `.strict()` on untrusted inputs
- Schemas versioned alongside routes — breaking schema changes require API version bump

---

## API Standards Pattern

### Consistent Response Envelope

All responses wrapped in `{ success, data, error, meta }` envelope:

```typescript
// Successful response
{
  "success": true,
  "data": { ... },
  "meta": { "requestId": "...", "timestamp": "2024-01-01T00:00:00Z" }
}

// Error response
{
  "success": false,
  "error": {
    "code": "SUBSCRIPTION_NOT_FOUND",
    "message": "No active subscription found for this user",
    "details": { "userId": "..." }
  },
  "meta": { "requestId": "...", "timestamp": "..." }
}
```

**Versioning Strategy:**
- `/api/v1/` prefix on all routes
- Breaking changes (removed fields, changed types, renamed endpoints) require `/api/v2/`
- Non-breaking additions (new optional response fields) allowed in same version
- `Deprecation: true` header added to deprecated v1 endpoints; include `Sunset: {date}` header

**Rate Limiting Patterns:**
```typescript
import rateLimit from 'express-rate-limit';

// Auth endpoints — strict
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 5,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many attempts' } },
  standardHeaders: true, // Return rate limit info in RateLimit-* headers
});

// General API — permissive
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 100,
  keyGenerator: (req) => req.user?.id || req.ip, // Per-user when authenticated
  standardHeaders: true,
});

// Subscription/payment — moderate
export const paymentLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  keyGenerator: (req) => req.user?.id,
  standardHeaders: true,
});
```

---

## Database Safety Pattern

### Migration Rollback Procedures

Every Sequelize migration MUST have a working `down()`:

```typescript
// migrations/YYYYMMDD-add-idempotency-keys.ts
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('IdempotencyKeys', {
      key: { type: Sequelize.STRING(255), primaryKey: true },
      response: { type: Sequelize.JSON },
      createdAt: { type: Sequelize.DATE, allowNull: false },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('IdempotencyKeys');
  },
};
```

**Rules:**
- All migrations peer-reviewed by Jayanth before merge
- Additive changes only in production (no column drops in same migration as adds)
- Column drops in separate migration after deploy confirms no usages
- Rollback tested in staging before merging to main

### Query Timeout SLA

- p99 query target: <50ms
- Apply `lock_timeout` and `statement_timeout` at connection level for long-running queries
- Sequelize hooks log slow queries:

```typescript
sequelize.addHook('afterQuery', (options: any) => {
  if (options._executionTime > 100) {
    logger.warn({ query: options.sql, durationMs: options._executionTime }, 'Slow query detected');
  }
});
```

### Connection Pool Sizing

```typescript
// config/database.ts
const sequelize = new Sequelize(DATABASE_URL, {
  dialect: 'mysql',
  pool: {
    min: 2,
    max: 10,
    acquire: 30000,  // ms to wait for connection before error
    idle: 10000,     // ms connection can be idle before release
  },
  logging: (sql, timing) => {
    if (typeof timing === 'number' && timing > 50) {
      logger.warn({ sql, durationMs: timing }, 'Query exceeded SLA');
    }
  },
  benchmark: true,  // enables timing
});
```

Pool exhaustion (all 10 connections in use) → Ralph's alerting threshold triggers.

---

## Enterprise Security Checklist

```
AUTHENTICATION & AUTHORIZATION
✅ JWT stateless (no session store)
✅ bcryptjs 12 rounds (password hashing)
✅ httpOnly refresh token (XSS-proof)
✅ Access token 15min expiry
✅ CORS origin restriction
⬜ JWT secret rotation every 90 days (dual-key validation window)
⬜ Refresh token revocation list (DB-backed)
⬜ Role-based access control (RBAC) enforced on all admin routes

INPUT & OUTPUT SAFETY
⬜ Zod validation on ALL route handlers (body, params, query)
⬜ Response envelope: { success, data, error, meta } on all endpoints
⬜ No internal stack traces or SQL in error responses (production)
⬜ HTML encoding for any user-supplied content in responses

TRANSPORT & NETWORK
✅ HTTPS enforced (no HTTP in production)
⬜ HSTS header: max-age=31536000; includeSubDomains
⬜ CSP header (coordinate with Senthil)
⬜ Rate limiting on ALL public endpoints (not just auth)

DATA SECURITY
✅ SQL injection prevented (Sequelize ORM + parameterized queries)
⬜ PII fields classified and documented in model comments
⬜ High-PII fields encrypted at rest (AES-256 application-level)
⬜ Secrets managed via environment variables (never in code)
⬜ Passwords and tokens never logged (Pino redact config)

PAYMENT SECURITY
✅ Stripe webhook signatures verified before processing
✅ Idempotency guards on payment endpoints
⬜ Stripe Elements only (card data never on backend)
⬜ PCI-DSS scope reduction verified by Auxi per release

COMPLIANCE
⬜ GDPR deletion endpoint tested by Auxi per release
⬜ Audit logs for all subscription/payment state changes
⬜ Data retention policy enforced (7 years payments, GDPR on users)
⬜ PCI evidence collected by Scribe per release

OPERATIONAL
✅ Database backups — daily, encrypted in transit
⬜ npm audit --audit-level=high passing (enforced by Basher gate)
⬜ Dependency review: no critical/high CVEs at release
⬜ Health check endpoints: /api/v1/health + /api/v1/health/ready
```

---

## References

- [Express.js Docs](https://expressjs.com/)
- [Sequelize ORM](https://sequelize.org/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
- [Stripe Webhook Events](https://stripe.com/docs/api/events)
- [Zod Validation](https://zod.dev/)
- [Pino Logger](https://getpino.io/)
- [OWASP Top-10](https://owasp.org/www-project-top-ten/)

---

**Created:** 2026-03-28  
**Last Updated:** By Karthi (Backend)

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

- [ ] Keaton reviews Stripe integration
- [ ] Dallas implements frontend JWT refresh flow
- [ ] Implement auth endpoints (`/login`, `/register`, `/refresh`)
- [ ] Add request validation with Zod
- [ ] Hockney tests auth flows + error cases
- [ ] Deploy to staging + smoke test webhooks

## References

- [Express.js Docs](https://expressjs.com/)
- [Sequelize ORM](https://sequelize.org/)
- [JWT Best Practices](https://tools.ietf.org/html/rfc7519)
- [Stripe Webhook Events](https://stripe.com/docs/api/events)

---

**Created:** 2026-03-28  
**Last Updated:** By Fenster (Backend)

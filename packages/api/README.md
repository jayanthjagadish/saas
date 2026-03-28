# Backend API (`@lession3/api`)

Express.js TypeScript backend for lession3 SaaS. Handles authentication, subscription management, payment processing with Stripe, and database operations via Sequelize ORM.

## Quick Start

```bash
# Install dependencies (from monorepo root)
npm install

# Set up environment
cp packages/api/.env.example packages/api/.env

# Start development server
npm run dev -w packages/api

# Build for production
npm run build -w packages/api
npm start -w packages/api
```

## Project Structure

```
src/
├── config/           # App configuration & database setup
│   ├── index.ts      # Environment config (ports, secrets, etc.)
│   └── database.ts   # Sequelize initialization & connection
├── models/           # Sequelize ORM models
│   ├── User.ts       # User account (email, password, Stripe ID)
│   ├── Subscription.ts # Stripe subscription state
│   ├── Payment.ts    # Payment/invoice tracking
│   └── index.ts      # Model relationships
├── middleware/       # Express middleware
│   ├── auth.ts       # JWT verification (Bearer token)
│   ├── errorHandler.ts # Centralized error handling
│   └── requestLogger.ts # Pino-based request logging
├── services/         # Business logic layer
│   ├── auth.ts       # JWT generation, password hashing (bcrypt)
│   └── stripe.ts     # Stripe API calls, webhook handlers
├── routes/           # API endpoints
│   ├── auth.ts       # /auth/* endpoints
│   ├── users.ts      # /users/* endpoints (protected)
│   ├── subscriptions.ts # /subscriptions/* endpoints (protected)
│   ├── payments.ts   # /payments/* endpoints (protected)
│   └── webhooks.ts   # /webhooks/* endpoints (public)
├── utils/            # Utility helpers (to be added)
├── app.ts            # Express app setup
└── index.ts          # Entry point
```

## Environment Variables

Create `.env` in `packages/api/`:

```
# Database (MySQL 8.0+)
DB_HOST=localhost
DB_PORT=3306
DB_NAME=lession3
DB_USER=root
DB_PASSWORD=password

# JWT secrets (generate: openssl rand -base64 32)
JWT_ACCESS_SECRET=your-secret-here
JWT_REFRESH_SECRET=your-refresh-secret-here

# Stripe (from dashboard.stripe.com)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# App
NODE_ENV=development
PORT=3000
API_URL=http://localhost:3000
WEB_URL=http://localhost:5173

# Logging
LOG_LEVEL=debug
```

## Database Models

### User
- `id` (UUID, PK)
- `email` (unique, indexed)
- `password` (bcrypt hashed)
- `name` (optional)
- `stripeCustomerId` (Stripe customer reference)
- `createdAt`, `updatedAt`

### Subscription
- `id` (UUID, PK)
- `userId` (FK → User)
- `stripeSubscriptionId` (unique, Stripe reference)
- `stripeProductId` (Stripe product)
- `status` (active | trialing | past_due | canceled | unpaid)
- `pricePerMonth` (decimal)
- `currentPeriodStart`, `currentPeriodEnd` (dates)
- `cancelAtPeriodEnd` (boolean)
- `createdAt`, `updatedAt`

### Payment
- `id` (UUID, PK)
- `userId` (FK → User)
- `stripePaymentIntentId` (unique, Stripe reference)
- `amount` (decimal, cents)
- `currency` (e.g., 'usd')
- `status` (succeeded | failed | pending)
- `description` (optional)
- `createdAt`, `updatedAt`

## API Routes (Scaffolding)

### Authentication
```
POST   /auth/register      # User signup
POST   /auth/login         # User login (returns access + refresh tokens)
POST   /auth/refresh       # Refresh access token
POST   /auth/logout        # Invalidate session
```

### Users (Protected)
```
GET    /users/me           # Fetch current user profile
PUT    /users/me           # Update profile
```

### Subscriptions (Protected)
```
GET    /subscriptions/me   # Fetch user's active subscription
POST   /subscriptions/me   # Create subscription (initiate payment)
PATCH  /subscriptions/me   # Update subscription (change plan, pause, etc.)
DELETE /subscriptions/me   # Cancel subscription
```

### Payments (Protected)
```
GET    /payments/me        # List user's payment history
```

### Webhooks (Public, Signature-Verified)
```
POST   /webhooks/stripe    # Stripe event handler
       Events: customer.subscription.created/updated/deleted
               invoice.payment_succeeded/failed
```

## Authentication Flow

1. User calls `POST /auth/register` or `POST /auth/login`
2. Backend validates credentials, generates JWT tokens
3. **Access Token** (15min): Returned in response, client stores in memory, sent via `Authorization: Bearer <token>`
4. **Refresh Token** (30day): Returned in httpOnly secure cookie, auto-sent by browser
5. Middleware `authMiddleware` validates Bearer token on protected routes
6. When access token expires, client calls `POST /auth/refresh` → backend validates refresh token → returns new access token

## Stripe Integration Points

### Event-Driven Architecture
- **Source of Truth:** Stripe (subscriptions, invoices, customers)
- **Local DB Role:** Reflects Stripe state via webhook events
- **Audit Trail:** All payment changes logged with timestamps

### Webhook Handler (`src/services/stripe.ts`)
Receives and processes Stripe events:
- `customer.subscription.created` → Store subscription in DB
- `customer.subscription.updated` → Update subscription status
- `customer.subscription.deleted` → Mark as canceled
- `invoice.payment_succeeded` → Record payment, update subscription
- `invoice.payment_failed` → Log failed payment, mark subscription past_due

All webhook payloads verified using HMAC signature (`STRIPE_WEBHOOK_SECRET`).

## Development

### Type Safety
- Full TypeScript strict mode
- Zod/Joi for request validation (to be added in endpoint implementation)
- Type-safe model definitions via Sequelize + interfaces

### Error Handling
```typescript
throw new AppError(statusCode, code, message);
// Example:
throw new AppError(409, 'USER_EXISTS', 'User already registered');
```

### Logging
Request/response logging via Pino:
```
[12:34:56] INFO: GET /users/me 200 (42ms)
```

## Security Practices

✅ **Implemented:**
- JWT stateless auth (no server session store)
- bcryptjs password hashing (12 rounds)
- httpOnly refresh token cookies
- CORS origin restriction
- Stripe webhook signature verification

✅ **To Implement (Keaton Review Required):**
- Rate limiting on auth endpoints
- Request size limits
- SQL injection prevention (Sequelize parameterized queries)
- CSRF protection if needed
- PII encryption fields (email backup, etc.)

## Scripts

```bash
# Development
npm run dev -w packages/api         # Watch + compile + run

# Production
npm run build -w packages/api       # TypeScript → JavaScript
npm start -w packages/api           # Run compiled code

# Quality
npm run lint -w packages/api        # ESLint TypeScript
npm run typecheck -w packages/api   # Type check only

# Database (placeholders, to be implemented)
npm run db:migrate -w packages/api  # Run migrations
npm run db:seed -w packages/api     # Seed test data
```

## Team Handoff Notes

- **Fenster (Backend):** Core API, auth, database models, middleware
- **Keaton (Lead):** Architecture decisions, payment security review
- **Dallas (Frontend):** Integrates auth flows, calls these endpoints
- **Hockney (QA):** Tests endpoints, Stripe webhook scenarios, error cases

**Next Steps:**
1. Implement auth endpoints (`POST /auth/login`, `/register`, `/refresh`)
2. Build user & subscription service layer
3. Integrate Stripe customer creation in signup
4. Implement webhook handlers for payment state sync
5. Add comprehensive request validation with Zod

---

**Status:** Scaffolding complete. Ready for endpoint implementation.

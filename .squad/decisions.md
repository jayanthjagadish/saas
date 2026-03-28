# Squad Decisions

## Active Decisions

### 1. Project Structure: Monorepo with npm Workspaces
**Status:** Approved  
**Owner:** Keaton  
**Rationale:** Single repo reduces friction; shared types prevent frontend/backend drift; single test suite enables E2E.  
**Packages:**
- `packages/api/` — Express backend (TypeScript)
- `packages/web/` — React frontend (TypeScript)  
- `packages/shared/` — Shared types, constants, validation

### 2. Database: MySQL 8.0+ with Sequelize ORM
**Status:** Approved  
**Owner:** Keaton  
**Rationale:** ACID compliance for payment data; Sequelize provides migrations & type safety.  
**Key principle:** Stripe is source of truth for subscriptions; local DB reflects state via webhooks.

### 3. Authentication: JWT + httpOnly Refresh Tokens
**Status:** Approved  
**Owner:** Keaton  
**Details:**
- Access token: 15min expiry, Authorization header
- Refresh token: 30day expiry, httpOnly + secure cookie
- Stateless auth; no server session store
- Password hashing: bcrypt (12 rounds)

### 4. Stripe Integration: Event-Driven
**Status:** Approved  
**Owner:** Keaton  
**Details:**
- Backend creates subscriptions; Stripe is source of truth
- Webhook events drive DB updates (invoice.payment_succeeded, customer.subscription.updated, etc.)
- All webhook signatures verified before processing
- Audit logs for all payment/subscription changes

### 5. API Design: REST with JSON
**Status:** Approved  
**Owner:** Keaton  
**Pattern:**
- `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`
- `GET/PUT/DELETE /users/me`, `GET/POST/PATCH/DELETE /subscriptions/me`
- `GET /payments/me`, `POST /webhooks/stripe` (no auth)
- Error responses include error code + message

### 6. Frontend Stack: React 18 + Vite + TailwindCSS
**Status:** Approved  
**Owner:** Keaton  
**Details:**
- TypeScript for type safety with Stripe data
- TailwindCSS + shadcn/ui for aesthetic UI
- Stripe Elements React for payment collection (no raw card data)
- React Query for server state + JWT refresh flow

### 7. Backend Stack: Express.js 4.x + TypeScript
**Status:** Approved  
**Owner:** Keaton  
**Details:**
- Middleware for auth, CORS, error handling
- Zod/Joi for input validation before Stripe calls
- Structured logging (pino/winston) for audit trail
- Services layer for Stripe, Auth, Subscriptions business logic

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
- Security & payment decisions escalated to Keaton for review

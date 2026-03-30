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

### 8. Password Reset Flow: Security Design (Sprint 2)
**Status:** Implemented  
**Owner:** Fenster  
**Date:** 2026-03-30  
**Details:**
- Token generation: crypto.randomBytes(32).toString('hex') for 256-bit entropy
- Token expiry: 1 hour (balances security with user convenience)
- User enumeration prevention: All forgot-password requests return 200 OK
- Session invalidation: All refresh tokens revoked on password reset
- One-time use: Tokens marked as used after first reset
- Input validation: Zod schemas (email format, password min 8 chars + uppercase + number)
- Email delivery: Dev-emails pattern (`reset-{timestamp}-{email}.txt`)

**Rationale:**
- Crypto random tokens are simpler and equally secure as JWT tokens for one-time use
- 1-hour expiry balances security with UX (users often check email after time passes)
- Session revocation ensures compromised passwords don't leave attacker sessions active
- No user enumeration prevents attackers from discovering valid email addresses

### 9. Subscription Cancellation: Stripe Integration Pattern (Sprint 2)
**Status:** Implemented  
**Owner:** Fenster  
**Date:** 2026-03-30  
**Details:**
- Cancellation pattern: `cancel_at_period_end: true` (user retains access until period end)
- Status model: New 'cancellation_pending' status (distinct from 'canceled')
- End date calculation: Returned to frontend as `end_date` and `days_remaining`
- Reactivation: Available before `end_date` via `POST /subscriptions/me/reactivate`
- Email notification: Sent on cancellation with end_date and reactivation instructions
- Stripe idempotency: Idempotency keys derived from user+plan+timestamp

**Rationale:**
- `cancel_at_period_end` reduces support requests about lost access after payment
- 'cancellation_pending' status provides clarity (not immediately canceled)
- Frontend display of days remaining improves UX and reduces churn
- Reactivation option before end date supports saved-subscription flows

### 10. Frontend API Contracts: User-Driven Design (Sprint 2)
**Status:** Implemented  
**Owner:** Dallas  
**Date:** 2026-03-30  
**Details:**
- Password reset: 2-step flow (forgot-password request → reset-password token+new password)
- Cancellation UI: Confirmation modal with end_date and days_remaining display
- Reactivation: Button shown after cancellation, reverses status before period end
- Form validation: Client-side (email format, password strength, confirmation match)
- Error recovery: Clear messaging for expired tokens, weak passwords, missing subscriptions
- Security messaging: No user enumeration indicators ("If that email is registered...")

**Rationale:**
- 2-step password reset improves UX (email retrieval step explicit, token validation separate)
- Modal confirmation prevents accidental cancellations
- Days remaining display increases user awareness of access timeline
- Reactivation button reduces churn on cancellation regret

### 11. Test Strategy: Comprehensive Coverage with Gaps Documented (Sprint 2)
**Status:** Implemented  
**Owner:** Hockney  
**Date:** 2026-03-30  
**Details:**
- Unit tests: 21 test cases (password reset + cancellation) with Jest and in-memory DB
- E2E tests: 7 test cases with Playwright (full user journeys)
- Frontend tests: 9 test cases with Vitest + React Testing Library
- Security verification: No user enumeration, token invalidation, session revocation
- Identified gaps: Rate limiting, concurrency, email verification, webhooks, refunds, templates, mobile

**Rationale:**
- In-memory DB provides fast test execution without external dependencies
- Comprehensive coverage catches security issues and edge cases early
- Gap documentation enables prioritization for future sprints
- Test patterns established for reuse in future features

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
- Security & payment decisions escalated to Keaton for review

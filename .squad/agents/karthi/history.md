# Karthi (Fenster)'s History

## Core Context

### Project
- **Stack:** React/Express/MySQL/Stripe, TypeScript SaaS (lession3)
- **Team:** Keaton (Lead), Senthil (Frontend), Karthi (Backend), Baskar (Tester)
- Backend: packages/api/, Express + Sequelize + MySQL, JWT auth, Stripe webhooks

### Historical Work (pre-2026-03-29)

**Architecture Decisions (Sprint 1):**
- Monorepo: packages/api/ with TypeScript, Express, Sequelize
- JWT: 15min access token (Bearer) + 30-day refresh token (httpOnly cookie)
- Stripe: event-driven via webhooks (HMAC verified), no sync polling
- Error handling: centralized AppError class (code + message)
- Logging: Pino structured logs

**Implementations (2026-03-28):**
- US-001: Signup + email verification (dev-emails/), auto-enroll Free plan, Session model
- US-002: Login + refresh token rotation, rate limiting (10/min per IP), "remember me" (90-day)
- US-010: Plans model, GET /api/plans, GET /api/plans/:id, upsert seeder (Free/Pro/Enterprise)
- US-020: Stripe webhook (payment_intent.succeeded/failed, subscription.deleted), Subscription + Payment models
- US-042: GET /subscriptions/calendar — up to 3 monthly or 1 annual renewal in 90-day window

**US-004 Password Reset (2026-03-28):**
- crypto.randomBytes(32) token, 1hr expiry; forgot-password always 200 (no enumeration)
- resetPassword: validates token, bcrypt(12), revokes ALL sessions, clears reset fields
- Routes: POST /auth/forgot-password, POST /auth/reset-password (Zod validation)

**US-025 Subscription Cancellation (2026-03-28):**
- cancelSubscription: Stripe cancel_at_period_end: true, local status → cancellation_pending
- reactivateSubscription: Stripe cancel_at_period_end: false, status → active
- Routes: POST /subscriptions/me/cancel, POST /subscriptions/me/reactivate

### Key Decisions & Patterns
- All routes use NO /api prefix at Express level (except plans which was later fixed to /plans)
- Vite proxy strips /api before forwarding: /api/auth/signup → http://localhost:3001/auth/signup
- Standard response envelope: `{ success: true, data }` or `{ success: false, error, message }`
- Cancelled spelled with double-l per team convention (cancelled not canceled)
- Test hooks guarded by NODE_ENV check; never execute in production
- API_CONTRACT.md is canonical route contract — update before frontend/testing begins

## Recent Entries

## Sprint 2 Update (2026-03-30)

Completed US-004 Password Reset and US-025 Subscription Cancellation backends.

**Key Decisions:**
- Token: crypto.randomBytes(32) with 1-hour expiry, user enumeration prevented
- Session invalidation on password reset (all refresh tokens revoked)
- Stripe cancel_at_period_end pattern; 'cancellation_pending' status (distinct from 'canceled'/'cancelled')
- Reactivation available before period end via dedicated endpoint

**Files Created/Modified:**
- packages/api/src/models/User.ts — added reset_password_token, reset_password_expires
- packages/api/src/models/Subscription.ts — added cancellation_pending status, cancelledAt
- packages/api/src/services/auth.ts — password reset functions
- packages/api/src/services/subscription.ts — NEW: cancelSubscriptionV2, reactivateSubscriptionV2
- packages/api/src/services/email.ts — sendPasswordResetEmail, sendCancellationEmail
- packages/api/src/routes/auth.ts — forgot-password + reset-password endpoints
- packages/api/src/routes/subscriptions.ts — cancel + reactivate endpoints
- Migrations: 20260328002000-add-password-reset-fields.ts, 20260328002100-add-cancellation-pending-status.ts

---

## Fixed Vite Proxy + Signup Blockers (2026-03-30)

**Vite Proxy Fix:**
- Problem: Proxy lacked rewrite; api.ts uses /api/* but Express has no /api prefix
- Fix: Added `rewrite: (path) => path.replace(/^\/api/, '')` to packages/web/vite.config.ts
- All frontend→backend requests now route correctly

**Critical Signup + Plans Blockers Fix:**
- Problem 1: plans table empty → signup 500 "Free plan not found"
- Problem 2: app.ts registered plans as `/api/plans` inconsistently
- Fix 1: Inserted 3 plans directly via MySQL (Free/Pro/Enterprise)
- Fix 2: Changed app.ts line 34: `app.use('/api/plans', ...)` → `app.use('/plans', ...)`
- All API routes now consistently use NO /api prefix at Express level

**SQL Used:**
```sql
INSERT INTO plans (id, name, tier, price_monthly, price_annual, max_members, features, createdAt, updatedAt) VALUES
(UUID(), 'Free', 'free', 0.0, 0.0, 5, '["basic-dashboard"]', NOW(), NOW()),
(UUID(), 'Pro', 'pro', 9.99, 99.99, 50, '["advanced-dashboard"]', NOW(), NOW()),
(UUID(), 'Enterprise', 'enterprise', NULL, NULL, NULL, '["all-features"]', NOW(), NOW());
```

---

## Auth Backend Bug Fixes (2026-03-30 16:40)

**Bugs Fixed (revealed by Baskar's E2E tests):**

1. **Login response format inconsistency** — Frontend expected `data.data.accessToken` but backend sent flat `access_token`
   - New login response: `{ success: true, data: { accessToken, userId, email, user: {...} } }`

2. **Error responses missing `success: false`** — Standardized all 4xx responses:
   - 401: `{ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }`
   - 403: `{ success: false, error: 'EMAIL_NOT_VERIFIED', message: 'Please verify your email address...' }` (changed status to 401 for consistency)
   - 409: `{ success: false, error: 'EMAIL_EXISTS', message: 'An account with that email already exists' }`

3. **Signup response format** — api.ts transforms non-standard signup response to ApiResponse format

**Files Modified:** packages/api/src/routes/auth.ts, packages/web/src/pages/LoginPage.tsx, SignupPage.tsx, context/AuthContext.tsx

---

## Additional 2026-03-30 Implementations

**US-030/US-040 Team + Dashboard:**
- Team model: owned by user (ownerId FK), owner added as TeamMember with role 'owner' on signup
- GET /dashboard/me/dashboard: aggregates user, subscription, team data in one call

**US-031/032/033 Team Invite Flow:**
- TeamInvite model (64-char hex token, 7-day expiry)
- POST /teams/me/invites — owner/admin only, enforces plan member limit
- POST /teams/invites/:token/accept — email match enforced (403 EMAIL_MISMATCH)
- POST /teams/invites/:token/decline, DELETE /teams/me/members/:memberId

**US-005 Profile Management:** GET/PUT /users/me, POST /users/me/avatar (stub 501)
**US-026 Billing History:** GET /subscriptions/invoices (mock invoices for test/dev Stripe key), GET /subscriptions/invoices/:id/download
**US-024 Payment Retry:** GET /subscriptions/status (pastDue, retryCount), POST /subscriptions/retry-payment; webhook raw body before express.json()
**US-035 Member Limits:** enforceSeats middleware (403 SEAT_LIMIT_REACHED), GET /subscriptions/status returns memberCount+memberLimit
**US-043 Dashboard Quick Actions:** POST /users/send-verification (400 ALREADY_VERIFIED if verified)

**Per-worker Playwright test DB isolation:**
- packages/api/src/config/database.ts reads TEST_DB_NAME when NODE_ENV=test
- tests/helpers/setup-worker-dbs.cjs: provisions N worker DBs, seeds test user + plan data
- Limitation: single Playwright webServer = all workers share fenster_test_worker_0

---

## Fixed E2E Backend Test Issues (2026-03-31)

**Issue 1: /auth/refresh returns 404 through frontend**
- Root cause: Vite proxy had no rule for /auth paths (only /api)
- Fix: Added `/auth` proxy entry to packages/web/vite.config.ts targeting http://localhost:3001

**Issue 2: Login response + E2E assertion**
- Added user object to login response: `{ success, data: { accessToken, user: { id, email, companyName, verified, role } } }`
- Added top-level `accessToken` field for E2E test assertions alongside `data.accessToken`

**Issue 3: Missing test users in create-test-user.js**
- Added unverified@fenster-test.com (verified=0) and passwordreset@example.com (verified=1) to test setup

**Issue 4: Password reset test hook 404**
- Root cause: passwordreset@example.com not in DB; requestPasswordReset() silently returned early
- Fix: Added user to create-test-user.js; test hooks now correctly capture and expose reset tokens

---

## Fixed 3 Backend Response Issues (2026-03-31)

**FIX 1: POST /auth/reset-password returns 500 for invalid token**
- Added `success: false` to all error responses in reset-password handler
- Message changed to "Reset token is invalid or expired" for consistency
- Returns: HTTP 400 + `{ success: false, error: 'INVALID_TOKEN', message: '...' }`

**FIX 2: GET /plans response shape**
- Changed data from `{ plans: [...], annual_discount_percent: 20 }` to `plans` array directly
- Returns: `{ success: true, data: [{ id, name, tier, price_monthly, price_annual, max_members, features }] }`

**FIX 3: Unverified user login error code**
- Changed error code from 'UNVERIFIED' to 'EMAIL_NOT_VERIFIED'
- Changed message to "Please verify your email address before logging in"
- HTTP status changed from 403 to 401

**Files:** packages/api/src/routes/auth.ts, packages/api/src/routes/plans.ts

---

## Fixed 17 Backend-Caused E2E Test Failures (2026-03-31)

**All 42 tests across 4 spec files now pass (auth.spec.ts, auth-flow.spec.ts, password-reset.spec.ts, plans.spec.ts).**

**Backend Fixes:**
1. **GET /plans response format** — Added `plans` key alongside `data` so API contract tests can access `body.plans`
2. **Unverified email login status** — Changed back to 403 (was incorrectly set to 401). Frontend LoginPage checks status 403 for verification errors. Message: "Please verify your email before logging in. Resend verification?"
3. **remember_me field** — Login handler now accepts both `remember` and `remember_me` from request body. Frontend sends `remember_me`, backend was only reading `remember`
4. **Test hooks per-email tokens** — `setLastVerificationToken` and `setLastResetToken` now store tokens in a per-email Map to avoid race conditions when parallel Playwright workers do signups simultaneously. Endpoints accept `?email=` query param
5. **Vite proxy for /auth** — Added `/auth` proxy to vite.config.ts with `bypass` for HTML GET requests. Without this, `POST /auth/refresh` through port 3000 returned 404

**Key Learnings:**
- Vite proxy was missing `/auth` entry — the fix from a previous session was lost
- Playwright's `text=` locator treats `|` as literal, not regex OR. Use `text=/regex/i` for alternation
- Parallel Playwright workers share global in-memory test hooks state → per-email keying required
- Tests that click form submit must wait for API response before reading test-hook tokens
- Frontend API service uses `/api` base URL (proxied), but E2E test helpers call backend directly at port 3001

**Files Modified:** packages/api/src/routes/auth.ts, plans.ts, test-hooks.ts, services/auth.ts, packages/web/vite.config.ts, tests/e2e/auth.spec.ts, auth-flow.spec.ts, password-reset.spec.ts

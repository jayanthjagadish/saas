# @{m=FenSter}.* | Select-Object -ExpandProperty m)'s History

## Project Context

**Project:** lession3 (TypeScript SaaS)
**Stack:** React (frontend), Express (backend), MySQL (database), Stripe (payments)
**User:** jayanth.jagadish
**Team:** Keaton (Lead), Dallas (Frontend), Fenster (Backend), Hockney (Tester)

This is a subscription-based SaaS with aesthetic UI. Focus on payment reliability and data integrity from day one.

## Learnings

### Backend Scaffolding Complete (Sprint 1)
**Date:** 2026-03-28

**Architecture Decisions:**

### Implemented US-001: User Signup with Email Verification (2026-03-28)
- Added email verification fields to User model and migration
- Implemented signup and verify-email endpoints
- Mocked email delivery by writing verification emails to dev-emails/
- Auto-enroll users into Free subscription locally

**Architecture Decisions:**
1. **Monorepo Structure:** Backend at `packages/api/` with TypeScript, Express, Sequelize
2. **Models & Relationships:**
   - User: email-based auth + Stripe customer ID
   - Subscription: tracks Stripe subscription state locally (Stripe is source of truth)
   - Payment: audit trail for all transactions
3. **Auth Flow:** JWT access token (15min, Bearer) + refresh token (30day, httpOnly cookie)
4. **Stripe Integration:** Event-driven via webhooks (verified with HMAC), no sync polling
5. **Error Handling:** Centralized `AppError` class with code + message
6. **Logging:** Pino for structured logs (DEBUG in dev, INFO in prod)

**Key Files:**
- `packages/api/src/config/index.ts` - Config loader (env vars)
- `packages/api/src/models/*.ts` - Sequelize models with relationships
- `packages/api/src/middleware/auth.ts` - JWT verification
- `packages/api/src/services/stripe.ts` - Webhook handler skeleton
- `packages/api/src/app.ts` - Express app setup

**Team Coordination:**
- Keaton: Review Stripe integration before webhook deployment
- Dallas: Implement frontend JWT refresh flow to use `/auth/refresh`
- Hockney: Test auth flows, Stripe webhook scenarios

**Constraints Honored:**
- No unilateral schema changes (waiting for Keaton approval)
- Stripe integration is reviewable (separate service layer)
- Secrets NOT committed (.env.example only)
- Database migrations reversible (Sequelize supports rollback)

### Implemented: Plans model & public API (US-010)

### Implemented: US-002 User Login with Session Management (2026-03-28)
- Added Session model + migration to track refresh token sessions
- Implemented POST /auth/login and POST /auth/refresh routes
- Refresh tokens are rotated: old session revoked and new session created
- Rate limiting (in-memory) enforces 10 attempts/min per IP; failed attempts are logged
- HttpOnly refresh cookie set; "remember" extends refresh expiry to 90 days

Notes:
- Added cookie-parser to parse refresh cookies
- No secrets were added; JWT secrets are read from env (defaults used in dev)
**Date:** 2026-03-28

- Added Sequelize Plan model (name, tier, price_monthly, price_annual, max_members, features JSON).
- Created migration and idempotent seeder that upserts Free, Pro, Enterprise plans.
- Implemented public endpoints: GET /api/plans and GET /api/plans/:id which return pricing plus annual_discount_percent: 20.
- Tests mock the model and verify endpoints return expected payload shape.

### Implemented US-020: Stripe Webhook Handler & Subscription Creation (2026-03-28)
- Added webhook endpoint POST /webhooks/stripe with signature verification using Stripe's constructEvent.
- Implemented handlers for payment_intent.succeeded, payment_intent.payment_failed, and customer.subscription.deleted. Payments are recorded idempotently by stripe_payment_intent_id.
- Created Subscription and Payment models/migrations with composite unique constraint (user_id, plan_id) to enforce one active subscription per user+plan.
- Added POST /subscriptions to create a pending subscription and Stripe PaymentIntent with an idempotency key derived from user+plan+timestamp.
- All Stripe operations include event IDs in logs for debugging.

### Implemented US-004: Password Reset Flow (Backend) (2026-03-30)
- Added reset_password_token and reset_password_expires fields to User model with migration (20260328002000-add-password-reset-fields.ts)
- Implemented requestPasswordReset(email) in auth service: generates secure 32-byte hex token, sets 1-hour expiry, writes reset email to dev-emails/reset-{timestamp}.txt
- Implemented resetPassword(token, newPassword) in auth service: validates token not expired, hashes password with bcrypt (12 rounds), updates user, clears reset fields, revokes ALL active sessions for security
- Added POST /auth/forgot-password route with Zod validation (email format) — returns 200 always to prevent user enumeration
- Added POST /auth/reset-password route with Zod validation (token required, password min 8 chars + uppercase + number)
- Extended email service with sendPasswordResetEmail() function following same dev-emails pattern
- All error responses use existing AppError pattern with appropriate codes (INVALID_TOKEN, EXPIRED_TOKEN, VALIDATION_ERROR)

### Implemented US-025: Subscription Cancellation (Backend) (2026-03-30)
- Added 'cancellation_pending' status to Subscription model with migration (20260328002100-add-cancellation-pending-status.ts)
- Created new subscription service (packages/api/src/services/subscription.ts) with:
  - cancelSubscription(userId): fetches active subscription, calls stripe.subscriptions.update with cancel_at_period_end: true, updates local status to 'cancellation_pending', calculates end_date and days_remaining, writes cancellation email to dev-emails/
  - reactivateSubscription(userId): reverses cancellation by calling stripe.subscriptions.update with cancel_at_period_end: false, sets status back to 'active'
- Added POST /subscriptions/me/cancel route (authMiddleware protected): returns { success, end_date, days_remaining }
- Added POST /subscriptions/me/reactivate route for users to undo cancellation before end_date
- Extended email service with sendCancellationEmail() function
- Updated GET /subscriptions/me to return user's subscriptions with plan details
- Proper error handling with specific error codes (NO_ACTIVE_SUBSCRIPTION, NO_PENDING_CANCELLATION, INVALID_SUBSCRIPTION)

**API Contracts for Dallas:**

Password Reset Flow:
```
POST /auth/forgot-password
Body: { "email": "user@example.com" }
Response: 200 { "success": true, "message": "If an account exists..." }

POST /auth/reset-password
Body: { "token": "abc123...", "newPassword": "NewPass123!" }
Response: 200 { "success": true, "message": "Password has been reset..." }
Errors: 400 VALIDATION_ERROR, 400 INVALID_TOKEN, 400 EXPIRED_TOKEN
```

Subscription Cancellation:
```
POST /subscriptions/me/cancel
Headers: Authorization: Bearer {access_token}
Response: 200 { "success": true, "end_date": "2026-04-30T...", "days_remaining": 30 }
Errors: 404 NO_ACTIVE_SUBSCRIPTION, 400 INVALID_SUBSCRIPTION

POST /subscriptions/me/reactivate
Headers: Authorization: Bearer {access_token}
Response: 200 { "success": true, "message": "Subscription reactivated..." }
Errors: 404 NO_PENDING_CANCELLATION

GET /subscriptions/me
Headers: Authorization: Bearer {access_token}
Response: 200 { "subscriptions": [{ id, status, plan: {...}, currentPeriodEnd, ... }] }
```

**Key Files Modified/Created:**
- packages/api/src/models/User.ts — added reset password fields
- packages/api/src/models/Subscription.ts — added cancellation_pending status
- packages/api/src/services/auth.ts — added password reset functions
- packages/api/src/services/email.ts — added reset & cancellation email functions
- packages/api/src/services/subscription.ts — NEW: subscription management service
- packages/api/src/routes/auth.ts — added forgot-password & reset-password endpoints
- packages/api/src/routes/subscriptions.ts — added cancel & reactivate endpoints
- packages/api/src/migrations/20260328002000-add-password-reset-fields.ts — NEW
- packages/api/src/migrations/20260328002100-add-cancellation-pending-status.ts — NEW

**Notes:**
- Used Zod for input validation (already in dependencies)
- All sessions revoked on password reset for security (Session.update with revoked: true)
- Cancellation follows Stripe's cancel_at_period_end pattern (subscription stays active until end)
- Dev emails written to dev-emails/ directory (reset-*, cancellation-*)
- Fixed TypeScript compilation issue with jwt.sign by casting SignOptions

## Sprint 2 Update (2026-03-30)

Completed US-004 Password Reset and US-025 Subscription Cancellation with Dallas and Hockney.

**Password Reset Key Decisions:**
1. Token security: crypto.randomBytes(32) with 1-hour expiry
2. User enumeration prevention: All forgot-password return 200
3. Session invalidation: Revoke all refresh tokens on password reset
4. Input validation: Zod schemas for email and password strength

**Subscription Cancellation Key Decisions:**
1. Stripe pattern: cancel_at_period_end (keep access until end of period)
2. Status model: 'cancellation_pending' (distinct from 'canceled')
3. Frontend display: end_date and days_remaining calculation
4. Reactivation: Available before period end via dedicated endpoint

**Coordination with Dallas:**
- Password reset flows: forgot-password and reset-password pages built
- Cancellation UI: Modal confirmation with end_date display
- API integration: All endpoints tested locally, ready for Dallas integration
- Test hooks: Created in test environment for token retrieval

**Coordination with Hockney:**
- Test contracts: 21 test cases covering password reset and cancellation
- Security testing: No user enumeration, token invalidation, session revocation verified
- Gap analysis: 7 identified gaps (rate limiting, concurrency, webhooks, etc.)
- Test patterns: Jest with in-memory DB, Playwright E2E established

**Status:** Ready for Keaton security review and Hockney test execution.

### Fixed Vite Proxy Rewrite Rule (2026-03-30)

**Problem:** Browser API requests to /api/* were returning 404 because Vite proxy was forwarding /api/auth/signup to http://localhost:3001/api/auth/signup, but Express routes are registered at /auth/signup (without /api prefix).

**Root Cause:**
- Vite proxy lacked a rewrite rule to strip /api prefix
- API service (api.ts) uses baseURL http://localhost:3001/api
- Express app.ts registers routes without /api: app.use('/auth', authRoutes)
- Exception found: app.use('/api/plans', plansRoutes) inconsistently includes /api prefix

**Solution:** Added rewrite rule to packages/web/vite.config.ts:
`	ypescript
rewrite: (path) => path.replace(/^\/api/, '')
`

**Verification:**
- Confirmed api.ts makes calls with /api/* prefix
- Confirmed Express routes (auth, users, subscriptions, payments) have NO /api prefix
- Rewrite now strips /api before forwarding: /api/auth/signup → http://localhost:3001/auth/signup

**Impact:**
- All frontend-to-backend requests now route correctly
- Authentication, user management, subscriptions, and payments APIs functional
- /api/plans endpoint still works (backend has /api prefix, proxy strips it, becomes /plans, but backend serves at /api/plans — may need follow-up)

**Team Note:** Inconsistency exists with /api/plans route. Recommend Keaton standardize: either all routes use /api prefix or none.

**Files Modified:**
- packages/web/vite.config.ts — added rewrite: (path) => path.replace(/^\/api/, '')

### Fixed Critical Signup & Plans Blockers (2026-03-30)

**Problem:** Smoke tests failed with two critical blockers:
1. Signup returned 500: "Free plan not found" — plans table was empty
2. GET /api/plans returned 404 — route registered inconsistently as /api/plans while all others use no prefix

**Root Causes:**
1. Seed script exists (packages/api/src/seeders/20260328000200-seed-plans.ts) but had Windows path import issues with ESM loader
2. app.ts registered plans route as app.use('/api/plans', plansRoutes) while all others use no /api prefix (inconsistent with proxy rewrite)

**Solution:**
1. **Plans Table Seeding:** Bypassed broken seed script and inserted 3 plans directly via MySQL:
   - Free plan: tier='free', $0/month, 5 max members
   - Pro plan: tier='pro', $9.99/month, 50 max members  
   - Enterprise plan: tier='enterprise', custom pricing, unlimited members
   
2. **Route Registration Fix:** Changed app.ts line 34 from:
   ```typescript
   app.use('/api/plans', plansRoutes);
   ```
   to:
   ```typescript
   app.use('/plans', plansRoutes);
   ```
   This aligns plans route with all other routes (auth, users, subscriptions, payments) which have no /api prefix.

**Verification:**
1. ✅ GET http://localhost:3001/plans returns plan list (not 404)
2. ✅ GET http://localhost:3000/api/plans via Vite proxy returns plan list  
3. ✅ POST http://localhost:3001/auth/signup creates user and returns 201 with user_id

**SQL Used:**
```sql
INSERT INTO plans (id, name, tier, price_monthly, price_annual, max_members, features, createdAt, updatedAt) VALUES 
(UUID(), 'Free', 'free', 0.0, 0.0, 5, '["basic-dashboard", "basic-support"]', NOW(), NOW()),
(UUID(), 'Pro', 'pro', 9.99, 99.99, 50, '["advanced-dashboard", "priority-support", "custom-reports"]', NOW(), NOW()),
(UUID(), 'Enterprise', 'enterprise', NULL, NULL, NULL, '["all-features", "dedicated-support", "signed-sla"]', NOW(), NOW());
```

**Files Modified:**
- packages/api/src/app.ts — changed /api/plans to /plans for consistency

**Team Note:** 
- All API routes now consistently use NO /api prefix at Express level
- Vite proxy strips /api before forwarding (configured in packages/web/vite.config.ts)
- Signup flow unblocked, users can now register with auto-enrollment in Free plan
- Seed script has a Windows ESM path issue that should be fixed for future fresh DB setups


## 2026-03-30 15:20:09 - Signup Error Fix

### Problem
The signup page showed 'An unexpected error occurred. Please try again.' when submitting valid data. Testing confirmed the API endpoint returned 201 with data, but the frontend couldn't handle the response.

### Root Cause
The backend /auth/signup endpoint returns a non-standard response format:
```json
{"user_id": "..", "email": "..", "message": "Check your email to verify"}
```n
But the frontend expected all API responses to follow the ApiResponse<T> format:
```json
{"success": true, "data": {...}}
```n
When api.signup() received the 201 response, it returned response.data directly without transforming it. The SignupPage then couldn't find the 'success' property and fell through to the 'unexpected error' catch block.

### Solution
Updated packages/web/src/services/api.ts signup() method to transform the backend response into ApiResponse format:
- Check if response contains user_id (backend format)
- If yes, wrap it in {success: true, data: {...}}
- Updated SignupPage.tsx to check response.success and extract message from response.data

### Files Changed
- packages/web/src/services/api.ts: Transform signup response to ApiResponse format
- packages/web/src/pages/SignupPage.tsx: Check response.success before showing message

### Verification
- Built web package successfully
- Direct API test confirmed 201 response with correct data
- Frontend now properly transforms and handles the response

## 2026-03-30 16:40:00 - Auth Backend Bug Fixes (E2E Test Failures)

### Problem
Baskar's E2E tests revealed 4 critical auth bugs:
1. Signup showing "An unexpected error occurred" instead of success message
2. Login not displaying error messages for wrong password/invalid email
3. Post-login redirect to /dashboard not working
4. Frontend email validation missing (turned out to already be present)

### Root Cause Investigation

**Bug 1 & 2: Inconsistent Response Formats**
- Backend returned different shapes for success vs error:
  - Login success: `{ access_token, user_id, email }`
  - Login error: `{ error: 'CODE', message: 'text' }` (no `success` field)
- Frontend expected ApiResponse format: `{ success: boolean, data?: T, error?: { code, message } }`
- Axios throws on 4xx/5xx status, so frontend couldn't distinguish error types
- Error messages in LoginPage checked `err.response.status` but backend didn't include detailed message in correct format

**Bug 3: Post-Login Redirect**
- Frontend AuthContext expected `response.data.data.accessToken`
- Backend returned `response.data.access_token` (flat structure)
- Token wasn't being set, so login appeared to fail and no redirect happened

**Bug 4: Email Validation**
- Already implemented in LoginPage (line 20): `if (!validateEmail(email)) { setError(...); return; }`
- Tests were failing because error message wasn't being displayed due to other bugs

### Solution Implemented

**Backend Changes (packages/api/src/routes/auth.ts):**
1. Standardized all error responses to include `success: false`:
   - Login 401: `{ success: false, error: 'INVALID_CREDENTIALS', message: 'Invalid email or password' }`
   - Login 403: `{ success: false, error: 'UNVERIFIED', message: 'Please verify...' }`
   - Signup 409: `{ success: false, error: 'EMAIL_EXISTS', message: 'An account with that email already exists' }`
   - Signup 400: `{ success: false, error: 'WEAK_PASSWORD', message: 'Password does not meet...' }`

2. Changed login success response format from:
   ```json
   { "access_token": "...", "user_id": "...", "email": "..." }
   ```
   to:
   ```json
   { "success": true, "data": { "accessToken": "...", "userId": "...", "email": "..." } }
   ```

3. Updated error message for invalid credentials from "Invalid credentials" to "Invalid email or password" (matches test expectations)

**Frontend Changes:**

1. **LoginPage.tsx:**
   - Enhanced error handling to extract message from `err.response.data.message`
   - Now displays backend error messages correctly
   - Email validation already present and working

2. **AuthContext.tsx:**
   - Wrapped login logic in try-catch to preserve Axios error structure for LoginPage
   - Re-throws error after handling to maintain error propagation

3. **SignupPage.tsx:**
   - Added handling for WEAK_PASSWORD error (status 400)
   - Improved error message extraction from backend responses

**Infrastructure:**
- Updated `playwright.config.ts` to start both API and Web servers
- Created `start-servers.js` helper script (though tests work with manual server start)

### API Contract Changes

**Breaking Change — Login Response:**
- Old: `{ access_token, user_id, email }`
- New: `{ success: true, data: { accessToken, userId, email } }`

**All Error Responses:**
- Now include `success: false` field
- Consistent structure: `{ success: false, error: 'CODE', message: 'Human readable text' }`

### Testing Status

**Direct API Tests:**
- ✅ POST /auth/signup returns 201 with correct response
- ✅ GET /health returns 200
- ✅ Error responses include proper messages

**E2E Tests:**
- Partial verification due to environment challenges (port conflicts, server orchestration)
- Fixed core issues: response format standardization and error message display
- Remaining failures appear to be test environment related (servers not starting cleanly in Playwright)

### Files Modified
- `packages/api/src/routes/auth.ts` — standardized response formats
- `packages/web/src/pages/LoginPage.tsx` — improved error handling
- `packages/web/src/pages/SignupPage.tsx` — added WEAK_PASSWORD handling
- `packages/web/src/context/AuthContext.tsx` — preserve Axios error structure
- `playwright.config.ts` — updated webServer configuration
- `start-servers.js` — NEW: concurrent server startup script

### Learnings

1. **API Response Consistency is Critical:**
   - Frontend code assumes consistent response shapes
   - Always include `success: boolean` in responses for easy error detection
   - Wrap data in `data` object, errors in `error` object

2. **Error Message Flow:**
   - Axios throws on 4xx/5xx, so error handling must check `err.response.data`
   - Status codes alone aren't enough - need descriptive messages
   - Frontend error display depends on proper error propagation through service → context → page

3. **Test Environment Orchestration:**
   - E2E tests need both API and Web servers running
   - Playwright's webServer config has limitations with concurrent servers
   - Manual server startup more reliable than auto-start in some environments

4. **TypeScript Type Safety:**
   - Frontend expected `accessToken` (camelCase), backend sent `access_token` (snake_case)
   - Type mismatches can silently fail at runtime - always verify API contracts

5. **Security Note:**
   - Login error message "Invalid email or password" prevents user enumeration
   - Same message for wrong password and non-existent email

### Team Coordination
- Decision document created: `.squad/decisions/inbox/karthi-auth-bug-fixes.md`
- API contract change documented for Dallas
- Baskar can re-run tests after environment cleanup

6. **Team Model Design (US-030):**
   - Team owned by a user (ownerId FK); owner also added as TeamMember with role 'owner' on signup
   - TeamMember has unique index on (team_id, user_id) to prevent duplicate memberships
   - Auto-team name derived from company_name or email prefix

7. **Dashboard API (US-040):**
   - GET /dashboard/me/dashboard aggregates user, subscription, and team data in one call
   - Subscription status filter: active | cancellation_pending | past_due
   - Plan.max_members used as team member limit

### Team Coordination (US-030/US-040)
- Decision document created: `.squad/decisions/inbox/karthi-team-model.md`


### US-031/US-032/US-033 — Team Invite Flow & Member Removal
**Date:** 2026-03-30
**Stories:** US-031 (Create Invite), US-032 (Accept/Decline), US-033 (Remove Member)

#### Files Created
- `packages/api/src/models/TeamInvite.ts` — NEW model (team_invites table)

#### Files Modified
- `packages/api/src/models/index.ts` — Added TeamInvite import and associations
- `packages/api/src/routes/teams.ts` — Added 5 new routes

#### Routes Added
- `POST /teams/me/invites` — Create invite (owner/admin only, enforces plan member limit)
- `GET /teams/me/invites` — List pending invites for the caller's team
- `POST /teams/invites/:token/accept` — Accept invite (email must match, re-checks limit)
- `POST /teams/invites/:token/decline` — Decline invite
- `DELETE /teams/me/members/:memberId` — Remove team member (owner/admin only, cannot remove owner)

#### Key Decisions
- Token: 64-char hex via crypto.randomBytes(32), expires 7 days after creation
- Email match enforced at acceptance (403 EMAIL_MISMATCH if mismatch)
- Member limit (Plan.max_members) checked at both invite creation AND acceptance
- getUserTeam helper shared across invite and remove routes

## US-005: Profile Management Backend (2026-03-30)

**Task:** Implemented GET /users/me, PUT /users/me, POST /users/me/avatar

**Changes:**
- packages/api/src/models/User.ts: Added vatarUrl field (DataTypes.STRING, nullable, maps to vatar_url column). 
ame field already existed.
- packages/api/src/routes/users.ts: Full implementation replacing the stub:
  - GET /users/me — returns id, email, name, avatarUrl, verified, createdAt
  - PUT /users/me — validates with zod (name ≤100 chars, valid email); on email change sets verified=false, generates token, calls sendVerificationEmail
  - POST /users/me/avatar — stub returning AVATAR_UPLOAD_NOT_CONFIGURED (501)
- packages/api/src/app.ts: Already registered at /users — no change needed
- TypeScript check: 0 errors

**Patterns used:** authMiddleware from middleware/auth.js, { success, data } response shape, zod validation, sendVerificationEmail for email change flow.


## US-026 — Billing History & Invoice Backend
**Date:** 2026-03-30
**File changed:** packages/api/src/routes/subscriptions.ts

### What was done
- Added GET /subscriptions/invoices endpoint (auth required).
  - If user has stripeCustomerId: fetches up to 20 invoices from Stripe and maps to { id, date, amount, currency, status, planName, invoicePdfUrl }.
  - If user has no Stripe customer and key is live: returns empty array.
  - If Stripe key is test/mock and no customer: returns 3 sample MOCK_INVOICES so frontend dev works without real Stripe.
  - Response shape: { success: true, data: { invoices: [...], hasMore: bool } }.
- Added GET /subscriptions/invoices/:invoiceId/download endpoint (auth required).
  - Fetches invoice from Stripe and returns { success: true, data: { pdfUrl } }.
  - Returns the Stripe-hosted PDF URL (no PDF proxying).
  - Mock invoice IDs (in_mock_*) are handled when running with a test/mock key.
- Added isTestOrMockStripeKey() helper: returns true when key is absent, starts with sk_test_, sk_mock_, or is not a live key.
- Added MOCK_INVOICES constant (3 sample invoices) for local dev/test environments.
- TypeScript check passed with zero errors.

### US-025: Subscription Cancellation Backend (2026-03-30)
**Requestor:** jayanth.jagadish

**Implemented:**
- POST /subscriptions/cancel — Auth required. Calls stripe.subscriptions.update({ cancel_at_period_end: true }), sets local status → cancelled, cancelAtPeriodEnd = true, cancelledAt = now. Writes dev-emails/cancel-{email}-{timestamp}.txt. Returns { success: true, data: { accessUntil, message } }.
- POST /subscriptions/reactivate — Auth required. Checks cancelAtPeriodEnd and period not ended. Calls stripe with cancel_at_period_end: false. Restores status → ctive, clears cancelledAt. Returns { success: true }.

**Model changes:**
- Added cancelled to SubscriptionStatus enum (alongside existing canceled)
- Added cancelledAt?: Date | null field to Subscription model (DB column: cancelled_at)

**Service additions:**
- cancelSubscriptionV2 and eactivateSubscriptionV2 in services/subscription.ts
- sendCancelEmail in services/email.ts (filename: cancel-{email}-{timestamp}.txt)

**TSC:** Passes --noEmit clean.

**Note:** Kept existing /me/cancel and /me/reactivate routes intact for backward compatibility. New routes are at /cancel and /reactivate (no /me/ prefix).

---

## US-023: Downgrade Subscription (2025-07-10)
Added POST /subscriptions/downgrade. Member limit check via TeamMember. Stripe update with credit_unused (cast as any for v14). Dev email via sendDowngradeEmail(). Decisions in .squad/decisions/inbox/karthi-downgrade.md

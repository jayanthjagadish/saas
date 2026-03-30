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

### 12. TypeScript Build Fix — packages/web (Sprint 1, Day 1)
**Status:** Implemented  
**Owner:** Dallas  
**Date:** 2026-03-30  
**Details:**
- Fixed all 23 TypeScript compilation errors blocking web build
- React Query v4 → v5 API migration: `useQuery(['key'], fn)` → `useQuery({ queryKey, queryFn })`
- Removed 6 unused React/Stripe imports across components
- Fixed AuthContext type safety: User | undefined → User | null coercion
- Added `remember_me?: boolean` to LoginRequest type definition
- Excluded test files (*.test.ts, *.spec.ts) from tsconfig.app.json build scope
- Fixed ApiResponse error shape in api.ts to match contract
- Replaced JSX.Element namespace with ReactElement in ProtectedRoute.tsx

**Rationale:**
- All fixes are type-level only — no behavior changes
- React Query v5 requires structured query config (breaking change from v4)
- Test files must be excluded from production build to avoid dependency failures
- Type strictness prevents runtime errors in payment/auth flows

**Files Modified:** 10 (PlanComparison, StripeCardElement, AuthContext, useStripe, ProtectedRoute, CheckoutPage, SubscriptionPage, api.ts, api types, tsconfig.app.json)

### 13. Release Engineer Onboarding — Basher (Sprint 1, Day 1)
**Status:** Implemented  
**Owner:** jayanth.jagadish (via Copilot)  
**Date:** 2026-03-30  
**Details:**
- New agent Basher added as Release Engineer
- Role: Gate pushes to remote only when all build and test gates pass
- Release gate rules:
  - Lint: Warn only (not blocking)
  - Build (API & Web): Hard gate — must exit 0
  - Unit tests: Hard gate — must pass (if configured)
  - E2E tests: Optional gate (skipped in CI unless requested)
- First release attempt: Web build failed (23 TypeScript errors)
- Second attempt (after Dallas fixes): All gates passed. Commit 37f4d45 created
- Push operation: Hanging on GitHub auth/network — requires manual user intervention

**Rationale:**
- Automated gating prevents broken code reaching remote
- Hard gates on build ensure stability
- Test gating deferred in bootstrap phase (no test scripts configured yet)
- Release gating enables safe multi-agent collaboration

### 14. User Directive — Indian Names for New Agents (Sprint 1, Day 1)
**Status:** Captured  
**Owner:** jayanth.jagadish  
**Date:** 2026-03-30T07:21:18Z  
**Details:**
- Going forward, use only Indian names when casting new agents
- Existing agents retain current names: Keaton, Dallas, Fenster, Hockney, Basher
- Applies to any new team members added after this date

**Rationale:**
- User preference — cultural representation in team naming

### 15. Vite Proxy Rewrite Fix — API Route Misconfiguration (Sprint 1, Day 2)
**Status:** Identified  
**Owner:** Karthi  
**Date:** 2026-03-30T09:26:45Z  
**Details:**
- **Issue:** Frontend requests to `/api/*` were failing with 404 due to Vite proxy misconfiguration
- **Root Cause:** Vite proxy was stripping `/api` prefix before forwarding to Express backend
- **Current (Wrong) Config:** `rewrite: (path) => path.replace(/^\/api/, '')` removes prefix
- **Fixed Config:** Remove rewrite rule; API already expects `/api` prefix
- **Route Inconsistency Found:** 
  - Most routes: `app.use('/auth', authRoutes)` → `/auth/signup` (no /api prefix)
  - Exception: `app.use('/api/plans', plansRoutes)` → `/api/plans` (with /api prefix)
  - Recommendation: Standardize — either all routes use /api prefix or none do

**Impact:**
- ❌ All frontend → backend communication broken via proxy
- ✅ Direct API calls work (bypassing proxy)
- ✅ Fix unblocks E2E testing

**Files Modified:**
- packages/web/vite.config.ts: Rewrite rule removed

**Rationale:**
- API endpoint structure must match proxy expectations
- Inconsistency between /auth and /api/plans routes suggests need for standardization
- Removing rewrite restores communication; routing standardization deferred to Sprint 2

### 16. Database Seed Data Missing — Plans Table (Sprint 1, Day 2)
**Status:** Identified  
**Owner:** Auxi (Tester)  
**Date:** 2026-03-30T09:26:45Z  
**Details:**
- **Issue:** User signup fails with 500 error; `GET /api/plans` returns empty array
- **Root Cause:** Database migrations ran successfully, but seed script was never executed
- **Evidence:** 7 migrations complete, tables created, but plans table empty
- **Blocker:** Signup endpoint requires a plan with `tier: 'free'` to exist
- **Fix:** Insert seed data or run seed script before application startup
- **Minimum Required:**
  ```sql
  INSERT INTO plans (id, name, tier, price_monthly, price_annual, features, created_at, updated_at)
  VALUES (UUID(), 'Free', 'free', 0, 0, '["Basic features"]', NOW(), NOW());
  ```

**Impact:**
- ❌ Application registration completely non-functional
- ❌ Cannot create test users
- ✅ All other endpoints functional

**Files Modified:**
- Database: plans table (requires INSERT)

**Rationale:**
- Seed data is a deployment requirement, not optional
- CI/CD must include seed verification step to prevent similar issues
- Free tier is fundamental to freemium SaaS model

## Governance

- All meaningful changes require team consensus
- Document architectural decisions here
- Keep history focused on work, decisions focused on direction
- Security & payment decisions escalated to Keaton for review

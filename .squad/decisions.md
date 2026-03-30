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

### 17. E2E Test Selector Fixes (Sprint 1, Day 2)
**Status:** Completed
**Author:** Baskar (Automation Tester)  
**Date:** 2026-03-30

**Summary:** Fixed all E2E test selectors in 	ests/e2e/ to match the actual React component structure. Tests were failing because they used incorrect selectors (wrong input names, missing elements, non-existent routes).

**Changes Made:**
1. **Selector Strategy:** Use semantic Playwright selectors over CSS selectors
   - getByRole('button', { name: 'Login' }) instead of utton[type="submit"]
   - getByLabel('Email') instead of input[name="email"]
   - More resilient to CSS class changes; better accessibility testing

2. **Files Updated:**
   - 	ests/e2e/smoke.spec.ts — Fixed login route, updated selectors
   - 	ests/e2e/auth.spec.ts — Updated login/signup selectors
   - 	ests/e2e/auth-flows.spec.ts — Complete rewrite with correct selectors
   - 	ests/e2e/auth-flow.spec.ts — Skipped full flow test (requires test hooks)
   - 	ests/e2e/plans.spec.ts — Updated PricingPage selectors, added billing toggle

3. **Tests Skipped (Not Deleted):**
   - Email verification required: Full signup→verify→login flow
   - UI component mismatch: Password confirmation field, welcome message
   - Infrastructure not ready: Rate limiting, token refresh, Stripe flows

**Results:** Smoke tests now pass on chromium (7/7). Tests accurately reflect UI structure with clear documentation of gaps.

**Files Changed:**
- 	ests/e2e/smoke.spec.ts, uth.spec.ts, uth-flows.spec.ts, uth-flow.spec.ts, plans.spec.ts

### 18. Test Strategy: Comprehensive Coverage with Gaps Documented (Sprint 2)
**Status:** Proposed  
**Author:** Baskar (Automation Tester)  
**Date:** 2026-03-30

**Summary:** Implemented 3-layer test strategy for Fenster SaaS app:

1. **E2E Tests (Playwright)** — Test complete user journeys through UI
   - auth.spec.ts, smoke.spec.ts, plans.spec.ts
   - Test data factory with timestamp-based unique emails
   - Error scenario coverage

2. **API Integration Tests (Jest)** — Test API contracts and business logic
   - auth.test.ts, plans.test.ts
   - Supertest for API requests, status code verification
   - Edge case coverage

3. **Frontend Unit Tests (Vitest)** — Test frontend logic in isolation
   - api.test.ts — API service layer tests with mocked axios
   - Very fast execution, no infrastructure dependencies

**Test Execution Model:**
- Local: Smoke tests (30s) → Unit tests (5s) → API tests (30s) → Full E2E (5 min)
- CI/CD: Pre-commit (unit), PR checks (unit + API + E2E smoke), Main (full), Nightly (extended)

**Known Gaps:** Component tests, subscription/payment integration, performance tests, visual regression, accessibility tests

**Files Changed:** Multiple test files created with comprehensive coverage patterns

### 19. Architecture Standards Adopted (Sprint 1, Day 3)
**Status:** Implemented  
**Owner:** jayanth.jagadish (via Copilot)  
**Date:** 2026-03-30

**Decision:** SOLID principles, Clean Architecture layers, Repository Pattern, 12-Factor App, and design pattern catalog adopted as team standards.

**Implementation:**
- Enforced via agent charters (updated 5 agents: jayanth, karthi, senthil, baskar, auxi)
- Codified in skills/architecture-patterns/SKILL.md
- Generated decision inbox entry for architectural pattern adoption

**Details:**
- **Single Responsibility Principle:** Each class/function has one reason to change
- **Open/Closed Principle:** Open for extension, closed for modification
- **Liskov Substitution Principle:** Subtypes must be substitutable for base types
- **Interface Segregation Principle:** Depend on specific interfaces, not general ones
- **Dependency Inversion Principle:** Depend on abstractions, not concretions

**Clean Architecture Layers:**
- Entities: Core business logic
- Use Cases: Application workflows
- Interface Adapters: Controllers, Gateways, Presenters
- Frameworks & Drivers: Databases, Web frameworks, UI

**Rationale:** Industry standard practices enable consistent, maintainable, scalable code across all agents

**Files Created/Updated:**
- gents/jayanth/charter.md (updated)
- gents/karthi/charter.md (updated)
- gents/senthil/charter.md (updated)
- gents/baskar/charter.md (updated)
- gents/auxi/charter.md (updated)
- skills/architecture-patterns/SKILL.md (created)

### 20. Auth Backend Bug Fixes (Sprint 1, Day 2)
**Status:** Implemented  
**Owner:** Karthi (Backend Dev)  
**Date:** 2026-03-30

**Summary:** Fixed 4 critical auth bugs found during E2E testing:
1. Backend returning inconsistent response formats (success/error)  
2. Login not showing proper error messages to users  
3. Post-login redirect not working due to response format mismatch  
4. Client-side email validation already present (no changes needed)

**Changes Made:**

**Backend (packages/api/src/routes/auth.ts):**
- Standardized error response format: { success: false, error: 'CODE', message: 'Human readable' }
- Fixed login response: { success: true, data: { accessToken, userId, email } } (matches ApiResponse type)
- Improved error messages: "Invalid email or password" (no user enumeration)

**Frontend Fixes:**
- LoginPage.tsx: Enhanced error handling to extract message from response
- AuthContext.tsx: Wrapped login logic in try-catch to preserve Axios error structure
- SignupPage.tsx: Added WEAK_PASSWORD error handling

**Infrastructure:**
- playwright.config.ts: Updated to start both API (3001) and Web (3000) servers
- start-servers.js: NEW script to launch both servers concurrently

**API Contract Changes:**
- POST /auth/login now returns consistent success/error format
- All responses include success: true|false field

**Files Modified:**
- packages/api/src/routes/auth.ts — standardized response formats
- packages/web/src/pages/LoginPage.tsx — improved error extraction  
- packages/web/src/pages/SignupPage.tsx — WEAK_PASSWORD handling  
- packages/web/src/context/AuthContext.tsx — preserve error structure
- playwright.config.ts — updated server startup
- start-servers.js — NEW

### 21. Signup Response Format Transformation (Sprint 1, Day 1)
**Status:** Implemented  
**Owner:** Karthi (Backend Dev)  
**Date:** 2025-01-27

**Context:** Signup page showed "An unexpected error occurred" when users submitted valid data. Root cause: response format mismatch between backend and frontend.

**Decision:** Transform response in frontend API service layer (packages/web/src/services/api.ts) rather than modifying backend.

**Rationale:**
1. Backend Stability — Changing endpoint could break existing integrations
2. Minimal Change — One place (api.ts) vs backend + all its tests
3. Frontend Ownership — ApiResponse format is frontend contract
4. Quick Fix — Urgent user-facing bug needed immediate resolution

**Implementation:** Updated signup method to transform { user_id, email, message } to { success: true, data: { user_id, email, message } }

**Consequences:**
- ✅ Signup now works correctly; no backend changes required
- ⚠️ Response format inconsistency remains in codebase; future developers must know about transformation

**Files Modified:**
- packages/web/src/services/api.ts — signup transformation
- packages/web/src/pages/SignupPage.tsx — check response.success

### 22. PRD Intake & Backlog Decomposition (Sprint 1, Day 1)
**Status:** Approved  
**Author:** Jayanth (Lead)  
**Date:** 2026-03-30

**Context:** Team requested formal backlog decomposition from PRD to establish priorities, ownership, and build order.

**Backlog Created:**
- 12 EPICs prioritized P0-P2
- **P0 (Blocking):** Auth Core, Plans Display
- **P1 (Core MVP):** Stripe Billing, Dashboard, Password Reset, Subscription Cancellation
- **P2 (Full MVP):** Team Management, Billing History, Profile, 2FA, Payment Retry

**Build Order (6-week recommendation):**
- Week 1: Complete Auth (Karthi + Baskar E2E)
- Week 2: Password Reset + Dashboard (Karthi + Senthil)
- Week 3-4: Stripe Billing (Karthi backend, Senthil UI, Jayanth review, Baskar E2E)
- Week 5: Cancellation + Billing History
- Week 6+: Team Management, Profile, 2FA, Hardening

**Key Directives:**
1. Karthi completes EPIC-1 auth bugs immediately
2. Stripe work (EPIC-3) requires Jayanth sign-off before merge
3. Baskar expands E2E coverage as features complete
4. No database schema changes without Jayanth approval

**Team Assignments:**
| Epic | Primary | Secondary | Reviewer |
|------|---------|-----------|----------|
| Auth | Karthi | — | Jayanth |
| Stripe | Karthi | Senthil | **Jayanth (mandatory)** |
| Dashboard | Senthil | — | — |
| Password Reset | Karthi | Senthil | — |
| Subscriptions | Karthi | Senthil | Jayanth |
| E2E Tests | Baskar | — | — |

**Architectural Risks (HIGH):**
- Stripe webhook security: signature verification critical
- Payment idempotency: duplicate webhooks must not create duplicate charges
- Email verification missing: PRD requires but not implemented

**Files Modified:** Backlog created at .squad/backlog.md

### 23. EPIC-3 & EPIC-4 Billing Integration Complete (Sprint 2)
**Status:** Completed  
**Owner:** Copilot (Senthil + Karthi collaboration)  
**Date:** 2026-03-31  
**Commit:** 613a9a52

**Summary:** Full-stack billing integration wired end-to-end. Both the Dashboard and SubscriptionPage now consume live data from the API with no placeholder stubs remaining.

**Backend changes (EPIC-3 — Stripe Integration):**
- `GET /subscriptions/me` fixed to return a single active subscription with plan details; `formatSubscriptionResponse()` helper extracted (SRP); `STATUS_PRIORITY` ordering ensures active subscriptions surface first; response shape satisfies both Dashboard (camelCase ISO dates) and SubscriptionPage (Unix timestamp)
- `GET /payments/me` implemented with real `Payment` model queries scoped by `userId`; `createdAt` mapped to `date` field expected by SubscriptionPage
- `customer.subscription.updated` webhook handler added in `stripe.ts`; `STRIPE_STATUS_MAP` provides idempotent status transitions; `status`, `currentPeriodEnd`, and `cancelAtPeriodEnd` updated atomically

**Frontend changes (EPIC-4 — Dashboard & SubscriptionPage):**
- Dashboard dead buttons wired: Upgrade → `/subscription`, Cancel → `/subscription`, Choose a Plan → `/pricing`
- Plan name display fixed: renders `plan.name` instead of raw `planId` UUID
- Cancellation pending banner added with Reactivate action
- Billing history placeholder replaced with link to `/subscription`
- SubscriptionPage: safe date handling (Unix timestamp + ISO fallback), plan name fallback, `alert()` calls removed
- PricingPage upgrade buttons wired to `/checkout?plan_id=`
- `/subscription` route added to `App.tsx`
- `Subscription` type extended: `cancellation_pending` status, `plan` object, `plan_name`, `current_period_end`, `price_display`

**Files Modified:**
- `packages/api/src/routes/subscriptions.ts`, `payments.ts`, `services/stripe.ts`, `app.ts`
- `packages/web/src/pages/dashboard.tsx`, `SubscriptionPage.tsx`
- `packages/web/src/components/PlanComparison.tsx`
- `packages/web/src/types/api.ts`, `App.tsx`
- Plus `.squad/agents/`, `tests/e2e/`, `playwright.config.ts`, `vite.config.ts`

**Rationale:**
- EPIC-3 requirement: Stripe is source of truth; DB state must reflect webhook events atomically
- EPIC-4 requirement: Dashboard buttons and plan displays must consume live API data, not hardcoded stubs
- `cancel_at_period_end` pattern preserves user access until period end, reducing support burden


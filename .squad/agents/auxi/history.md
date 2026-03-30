# Hockney's History

## Core Context

### Project
- **Stack:** React/Express/MySQL/Stripe, TypeScript SaaS (lession3)
- **Team:** Keaton (Lead), Dallas/Senthil (Frontend), Fenster/Karthi (Backend), Hockney/Auxi (Tester)
- Subscription-based SaaS; payment reliability and data integrity are priorities

### Historical Work (pre-2026-03-29)

**Testing Scaffold (Session 1):**
- Three-tier pyramid: 60% unit (Jest), 30% integration (Vitest), 10% E2E (Playwright)
- Key files: tests/unit/, tests/integration/, tests/e2e/, tests/utils/
- Configs: jest.config.js, vitest.config.ts, playwright.config.ts
- Coverage targets: >90% code coverage, 80% threshold on statements/branches/functions/lines
- Shared utils: auth-mocks.ts, stripe-mocks.ts, subscription-mocks.ts

**Auth Test Suite (Session 1):**
- tests/api/: signup, login, logout Jest specs
- tests/e2e/auth-flow.spec.ts: full E2E with test hooks for verification tokens
- Patterns: mocked email service, in-memory test DB

**US-004 Password Reset Tests (Session 2):**
- API: tests/api/auth.password-reset.test.ts — 8 cases (happy paths, expired/used/invalid tokens, no enumeration)
- E2E: packages/web/e2e/password-reset.spec.ts — 7 cases (full journey, form validation, error scenarios)
- Security enforced: no user enumeration (always 200), 1hr token expiry, one-time use, session revocation on reset

**US-025 Subscription Cancellation Tests (Session 2):**
- API: tests/api/subscription.cancellation.test.ts — 13 cases (cancel, already-cancelled, free plan, reactivation)
- Frontend: packages/web/src/pages/SubscriptionPage.test.tsx — 9 cases (modal, loading states, errors)
- Business logic: cancel_at_period_end pattern, cancellation_pending status, reactivation before end_date

**Sprint 2 Test Delivery (early 2026-03-30):**
- 37 total test cases: 21 API, 7 E2E, 9 frontend
- 7 gaps documented: rate limiting, concurrent resets, email delivery, webhook integration, prorated refunds, cancellation templates, mobile viewport
- Coordination with Fenster (API contracts) and Dallas (frontend contracts) complete
- Decision report: .squad/decisions/inbox/hockney-us004-us025.md

### Key Decisions & Patterns
- Mock Stripe via stripe-mocks.ts; mock email with jest.fn(); in-memory DB for fast execution
- E2E test hooks: direct API calls to http://localhost:3001/test-hooks/* (not via Vite proxy)
- No user enumeration: forgot-password always returns 200 regardless of email existence
- Token invalidation: new forgot-password request invalidates prior tokens
- All errors include: HTTP status + error code + user-facing message

## Recent Entries

## 2026-03-30: Full-Stack Smoke Test Suite

### Task
Comprehensive smoke test of full-stack SaaS application (API + Web) to verify basic functionality after recent infrastructure changes:
- Tailwind v4 CSS fix (index.css now uses `@import "tailwindcss"`)
- Vite proxy rewrite setup (`/api` prefix handling)
- API port changed to 3001 (was 3000)
- 7 DB migrations run successfully (MySQL on localhost:3306, db: lession3)

### Test Scope
**10 endpoint tests across three layers:**
1. Direct API calls to localhost:3001
2. Proxied calls through Vite dev server (localhost:3000)
3. Frontend page loads

**Endpoints Tested:**
- Health checks (root, /health)
- Plans API (GET /api/plans)
- Auth endpoints (signup, login, forgot-password)
- Proxy functionality (plans + signup via localhost:3000)
- Web pages (homepage, login page)

### Results Summary
**Score:** 4/10 PASS, 2/10 FAIL, 4/10 WARN

| Test | Endpoint | Status | Notes |
|------|----------|--------|-------|
| Health | GET / | ⚠️ 404 | Root undefined, but /health works (200) |
| Plans Direct | GET /api/plans | ⚠️ 200 | Works but returns empty array |
| Signup Direct | POST /auth/signup | ❌ 500 | Missing seed data (free plan) |
| Login | POST /auth/login | ⚠️ 403 | Works but returns 403 instead of 401 |
| Forgot Password | POST /auth/forgot-password | ✅ 200 | Security-conscious response |
| Invalid Login | POST /auth/login (bad creds) | ✅ 401 | Correctly rejects |
| Plans Proxy | GET /api/plans (via proxy) | ❌ 404 | Proxy rewrite error |
| Signup Proxy | POST /api/auth/signup (via proxy) | ❌ 500 | Proxy + seed data issues |
| Homepage | GET / | ✅ 200 | React app loads |
| Login Page | GET /login | ✅ 200 | React Router works |

### Critical Issues Discovered

#### 🔴 Issue #1: Database Missing Seed Data (CRITICAL - BLOCKING)
**Impact:** All user signups fail with 500 Internal Server Error

**Root Cause:**
- Plans table is empty: API returns `{"plans":[],"annual_discount_percent":20}`
- Signup endpoint requires a plan with `tier: 'free'` to exist (packages/api/src/routes/auth.ts lines 57-62)
- Without free plan, signup throws "Free plan not found" exception

**Fix Required:**
```sql
INSERT INTO plans (id, name, tier, price_monthly, price_annual, features, created_at, updated_at)
VALUES (UUID(), 'Free', 'free', 0, 0, '["Basic features"]', NOW(), NOW());
```

#### 🔴 Issue #2: Vite Proxy Rewrite Misconfigured (HIGH - BLOCKING)
**Impact:** Web app cannot communicate with API via proxy

**Root Cause:**
- Current config strips `/api` prefix before forwarding
- Request: `/api/plans` → forwards as `/plans` to localhost:3001
- But API expects `/api/plans`, not `/plans`

**Current (WRONG) Config:**
```typescript
rewrite: (path) => path.replace(/^\/api/, ''),  // ❌ Strips /api
```
**Fixed Config:** Remove the rewrite line — API already expects /api prefix

#### ⚠️ Issue #3: Root Endpoint Returns 404 (LOW)
- `GET http://localhost:3001/` returns 404; health check at `/health` works (200)
- Recommendation: Add root route for API discovery (optional)

### What Works ✅
- API server running on port 3001, Web server on port 3000
- Database connected, migrations complete
- Forgot-password (200, security-conscious), Invalid login rejection (401)
- Frontend routing (React Router + Vite dev server)
- Web pages load (homepage, login page)

### What's Broken ❌
- User signup (500 — missing seed data)
- Web → API proxy (404 — rewrite strips /api incorrectly)

### Additional Findings
**Password Validation:** Min 12 chars, uppercase, number, special char (auth.ts lines 14-20)
**API Endpoint Structure:** `/auth/*` for auth, `/api/*` for other APIs (mixed prefix)
**Port Listeners:** API: 0.0.0.0:3001 (PID 19892), Web: [::1]:3000 (PID 10760)

### Recommendations
**P0 - Blocking (Fix Immediately):**
1. Seed database with plans (minimum: one `tier: 'free'` plan)
2. Fix Vite proxy — remove `rewrite` line from vite.config.ts

**P1 - Optional:**
3. Add root route handler
4. Standardize endpoint prefixes (all `/api/*` or none)

### Deliverables
✅ Full test report: `.squad/decisions/inbox/hockney-smoke-test-results.md`
✅ Detailed issue analysis with code locations and fixes

### Smoke Test Statistics
- **Total:** 10 | **Passed:** 4 (40%) | **Failed:** 2 (20%) | **Warning:** 4 (40%)
- **Critical Issues:** 2 (both blocking) | **Date:** 2026-03-30

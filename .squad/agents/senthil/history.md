# Senthil (Dallas)'s History

## Core Context

### Project
- **Stack:** React/Express/MySQL/Stripe, TypeScript SaaS (lession3)
- **Team:** Keaton (Lead), Senthil (Frontend), Karthi (Backend), Baskar (Tester)
- Frontend: packages/web/, React 18 + Vite + TailwindCSS + React Router + React Query + Axios

### Historical Work (pre-2026-03-29)

**Frontend Setup (Sprint 1):**
- Monorepo at packages/web/, TypeScript strict mode
- Key files: src/services/api.ts (Axios singleton + JWT interceptor), src/types/api.ts, src/context/AuthContext.tsx
- Auth pattern: JWT access in localStorage, refresh token in httpOnly cookie, auto-refresh on 401
- Axios interceptor bypasses refresh for /auth/login, /auth/signup, /auth/refresh (avoid masking errors)
- ProtectedRoute: redirects to /login if no token; waits for auth.isInitialized before checking

**Implementations (2026-03-28):**
- US-001: SignupPage (email/password/company, password strength meter, client-side validation), verifyEmail flow, /verify page
- US-011: PlanComparison component, /pricing route, getPlans() with React Query, fallback pricing
- US-002: LoginPage (show/hide password, remember me), AuthContext + useAuth hook, ProtectedRoute, Logout button
- US-021: CheckoutPage, SubscriptionPage, Stripe card element, server-side client_secret pattern, billing toggle
- US-004: ForgotPasswordPage (always shows success — no enumeration), ResetPasswordPage (token via URL param, strength indicator)
- US-025: SubscriptionPage with cancel modal, end_date/days_remaining banner, Reactivate button; cancelSubscription() + reactivateSubscription()

**TypeScript Build Fix (2026-03-30):**
- Migrated React Query v4 → v5 syntax (`useQuery({ queryKey, queryFn, ...opts })`)
- ApiResponse<T>.data is T | undefined — coerce with `?? null`
- verbatimModuleSyntax: use `import type` for type-only imports
- Remove `import React` (not needed with react-jsx transform)
- Exclude test files from tsconfig.app.json (avoid vitest/testing-library in production)

### Key Decisions & Patterns
- VITE_API_BASE_URL must be `/api` (relative) — absolute localhost bypasses Vite proxy
- All API routes use NO /api prefix at Express; Vite proxy strips /api before forwarding
- Frontend owns user-facing error strings (not backend messages) for known HTTP error codes
- Auth endpoints bypass 401 interceptor (login/signup/refresh have no refresh token)
- IIFEs inside JSX cause white-screen crashes — extract to named functional components
- Contract-first: read packages/api/API_CONTRACT.md before adding any api.ts calls

**Route Map:**
- /signup, /login (primary); /auth/login, /auth/signup (legacy)
- /verify, /auth/forgot-password, /auth/reset-password
- /dashboard (protected), /dashboard/subscription, /pricing, /checkout
- /team (protected), /invite/:token (public), /profile (protected), /billing (protected), /analytics

## Recent Entries

## 2026-03-30 — Auth E2E Tests Fully Green (9/9 Passing)

**3 Fixes Applied (for Baskar's failing tests):**

1. **401 interceptor swallowed login errors** — Added early-exit guard in api.ts 401 interceptor to bypass refresh for /auth/login, /auth/signup, /auth/refresh. Wrong-password 401 was triggering token refresh, silently redirecting instead of showing error.

2. **LoginPage missing `noValidate`** — Without it, browser's native HTML5 validation prevented handleSubmit from running; custom React email error was never shown.

3. **Duplicate email error mismatch** — Backend returns "An account with that email already exists" (409) but test expects "Email already registered". SignupPage now always displays "Email already registered" for 409.

**Root Cause of Remaining Issues — .env Configuration:**
- VITE_API_BASE_URL was `http://localhost:3001/api` (absolute) — bypassed Vite proxy
- Changed to `/api` (relative) — routes correctly through proxy to /auth/* endpoints
- **Rule:** Never use absolute localhost URLs in .env when dev environment uses proxy

---

## 2026-03-30 — Key Feature Implementations

**US-043 Dashboard Overview Card + Quick Actions:**
- Added DashboardData type, getDashboard() → GET /dashboard/me/dashboard
- Overview Card: color-coded left border (red/yellow/green), team progress bar, renewal countdown, next billing
- Quick Actions card: Invite Team Member (/team), Manage Subscription (/subscription), View Analytics (/analytics), Resend Verification (conditional)
- Fixed white-screen crash: extracted IIFE into named DashboardOverviewCard component

**US-031/032 Team Management UI:**
- Types: TeamMember, Team, TeamInvite in api.ts
- TeamPage.tsx: member list (role badges, remove button), invite-by-email form, pending invites list
- AcceptInvitePage.tsx: spinner → success (auto-redirect to dashboard) / error state machine
- Routes: /team (ProtectedRoute), /invite/:token (public)
- SEAT_LIMIT_REACHED and MEMBER_LIMIT_REACHED both mapped to same user-facing message
- Disabled invite button at capacity; tooltip via wrapper div (browsers suppress title on disabled)

**US-025 Subscription Cancellation Fix:**
- Fixed cancelSubscription() endpoint: POST /subscriptions/cancel (not /me/cancel)
- Post-cancel banner: "Subscription cancelled. Access until {date}." with Reactivate button
- Dashboard DashboardOverviewCard: shows "Cancels on {date}" (yellow) when cancelAtPeriodEnd=true

**US-026 Billing History:**
- BillingHistoryPage.tsx: invoice table (Date/Plan/Amount/Status/Download), StatusBadge, Load More
- GET /subscriptions/invoices via React Query v5; amount in cents ÷ 100 via Intl.NumberFormat
- Route /billing added to App.tsx + Layout.tsx

**US-042 Billing Calendar:**
- UpcomingBillingSection component in BillingHistoryPage: emoji+color cards per event type
- GET /subscriptions/calendar via useQuery(['billingCalendar']), 5-min stale time
- Event colors: blue=renewal, orange=cancellation, gray=trial_end, yellow=invoice_due

**US-024 Payment Retry:**
- Past-Due banner in SubscriptionPage: retryPayment() → POST /subscriptions/retry-payment
- Dual check: `pastDue === true || status === 'past_due'` for resilience
- Dashboard compact red warning card when past_due → links to /subscription

**US-035 Member Limit Enforcement:**
- TeamPage: seat usage bar + amber warning at capacity + upgrade link
- SubscriptionPage: "X of Y seats used" in plan card
- getSubscriptionStatus() → GET /subscriptions/status; non-critical fetch (silently ignored)

---

## 2026-03-30 — E2E Test UI Compatibility Fixes

**Problem:** 72 of 151 E2E tests failed due to UI element mismatches.

**Root Cause:** Dashboard Quick Actions had wrong text/button types.

**Fix Applied (dashboard.tsx only):**
- Changed "Manage Subscription →" link to button "Manage Billing" (navigate('/subscription'))
- Added "Upgrade Plan" button (navigate('/pricing'))
- Both use onClick + navigate() (not Link) — E2E tests select by role

**All Other Pages Were Already Correct:**
- Analytics: h1 "Usage Analytics", "seats used", "Member Usage", h2 "Member Growth (Last 6 Months)"
- Billing: h2 "Upcoming Billing", "Next billing:", empty state "No upcoming billing events"
- Profile: email display, name input, Security section with "Enable 2FA" button
- Login: already redirects to /dashboard after success

**Lesson:** E2E tests prefer `getByRole('button')` over links; exact text matching matters ("Manage Billing" ≠ "Manage Subscription →").

---

## 2026-03-30 — Analytics Page Auth Race Condition Fix

**Problem:** E2E test timeout finding `h1 "Usage Analytics"` after navigation.

**Root Cause:**
1. AuthContext reads token from localStorage asynchronously
2. ProtectedRoute checked `auth?.token` synchronously — saw null before init completed
3. Navigation from /dashboard → /analytics triggered false redirect to /login

**Fix:**
- **AuthContext.tsx:** Added `isInitialized: boolean` state (false → true after initial token/user check)
- **ProtectedRoute.tsx:** Return `null` while `!isInitialized`; only redirect after init completes + no token

**Impact:** All protected routes fixed (/dashboard, /analytics, /billing, /profile, /team, /subscription, /checkout). Brief loading flash is acceptable tradeoff.

**Files:** packages/web/src/context/AuthContext.tsx, packages/web/src/middleware/ProtectedRoute.tsx

---

## 2026-03-31 — Additional Frontend Implementations

**US-005 Profile Management:**
- ProfilePage.tsx: avatar initials circle, member-since date, edit form (name + email), change-email warning
- useQuery for GET, useMutation for PUT with cache invalidation
- Route /profile (ProtectedRoute) + "Profile" nav link in Layout.tsx

**US-023 Downgrade Subscription:**
- SubscriptionPage: Plan Comparison section, billing interval toggle, tier-rank comparison
- Downgrade modal: current → new plan flow, "unused time credited" notice, member limit warning
- MEMBER_LIMIT_EXCEEDED: modal stays open with inline error

**US-043 Dashboard Quick Actions (update):**
- Resend Verification: POST /users/send-verification via resendVerification() in api.ts
- Shown only when dashboardData?.user?.emailVerified === false; hides after success

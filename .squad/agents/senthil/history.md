# @{m=DallaS}.* | Select-Object -ExpandProperty m)'s History

## Project Context

**Project:** lession3 (TypeScript SaaS)
**Stack:** React (frontend), Express (backend), MySQL (database), Stripe (payments)
**User:** jayanth.jagadish
**Team:** Keaton (Lead), Dallas (Frontend), Fenster (Backend), Hockney (Tester)

This is a subscription-based SaaS with aesthetic UI. Focus on payment reliability and data integrity from day one.

## Learnings

### Frontend Setup (Completed)

**Architecture Decision:** React 18 + Vite + TailwindCSS (per team decision)
- Monorepo at `packages/web/` with npm workspaces
- TypeScript strict mode for type safety with Stripe
- TailwindCSS via `@tailwindcss/postcss` for fast styling
- React Router for SPA navigation
- React Query for server state + JWT refresh flow
- Axios singleton with auto-refresh interceptor

**Key Files:**
- `src/services/api.ts` - API singleton with JWT management
- `src/types/api.ts` - Shared API types (import from backend's types/ when available)
- `src/components/Layout.tsx` - App shell with nav, footer
- `src/pages/auth/{login,signup}.tsx` - Auth flows (ready for backend integration)
- `src/pages/dashboard.tsx` - Protected user dashboard
- `tailwind.config.js` - Custom primary color (sky blue)

**Authentication Pattern:**
1. Email/password login → JWT access token in `localStorage`
2. Refresh token via httpOnly cookie (server-set)
3. Axios interceptor: attach token to all requests
4. Auto-refresh on 401 response
5. Redirect to `/auth/login` if refresh fails

**Directory Structure:**
```
packages/web/
├── src/
│   ├── components/     # Reusable UI components
│   ├── pages/          # Route pages
│   ├── services/       # API service layer
│   ├── types/          # TypeScript interfaces
│   ├── hooks/          # Custom hooks (placeholder)
│   ├── styles/         # Global styles (TailwindCSS)
│   ├── App.tsx         # Main router
│   └── main.tsx        # Entry point
├── tailwind.config.js  # Tailwind customization
├── postcss.config.js   # PostCSS for Tailwind
├── vite.config.ts      # Vite config (port 3000, /api proxy to backend)
├── tsconfig.json       # TypeScript config
└── package.json        # Dependencies
```

**Styling Philosophy:**
- TailwindCSS utility-first (no component library)
- Custom theme colors in `tailwind.config.js`
- All styles inline in JSX (no CSS files except index.css)
- Mobile-first responsive design
- Accessible color contrast (>4.5:1)

**Dependencies Installed:**
- `react-router-dom` - Client-side routing
- `@tanstack/react-query` - Server state + caching
- `axios` - HTTP client with interceptors
- `@stripe/react-stripe-js`, `stripe` - Stripe integration
- `tailwindcss`, `@tailwindcss/postcss` - Styling
- ESLint + TypeScript plugins - Linting

**Next Phase Tasks:**
1. Pricing page with plan selection
2. Stripe Elements integration for payment collection
3. Subscription management UI (upgrade/downgrade/cancel)
4. Payment history & invoices
5. User account settings
6. Email verification flow
7. Password reset flow
8. Unit & integration tests

**Deployment:**
- Build output: `npm run build` → `dist/`
- Ready for Vercel/Netlify deployment
- Environment vars: `VITE_API_BASE_URL`, `VITE_STRIPE_PUBLIC_KEY`

### Recent work: US-001 Signup & Email Verification

Added a responsive signup page with email, password, and company name fields, a password strength meter, and client-side validation. Implemented API service methods `signup` and `verifyEmail`, plus a `/verify` page that auto-verifies tokens and redirects on success. Tests added for signup UI and basic flows.

### Implemented US-011 — Plan Comparison Page
- Added PlanComparison component, Pricing page route, and API service method getPlans().
- Uses React Query to fetch plans and handles errors with fallback pricing.
- Responsive TailwindCSS layout and tests added.

Date: 2026-03-28

### Implemented US-002 — Login Form with Session Management

Added Login UI (email, password show/hide, remember me), an AuthContext and useAuth hook that keep the JWT in-memory and schedule token refresh via POST /auth/refresh. ProtectedRoute was added to guard dashboard routes and Layout now displays the logged-in user email and a Logout button which calls POST /auth/logout. Tests added for LoginPage (unit test mocking AuthContext) and responsive TailwindCSS styling applied.

### 2026-03-28 — Implemented US-021 Frontend

Added Checkout and Subscription management pages, Stripe card element component, Stripe wrapper hook, and API adjustments to support server-side payment confirmation. Implemented client-side billing toggle and responsive TailwindCSS layouts; added tests for checkout billing toggle. Learned to prefer backend-created client_secret for payment confirmation and to mock Stripe in unit tests.

### 2026-03-28 — Implemented US-004 Password Reset Flow

Built complete password reset flow with two pages:
- `forgot-password.tsx`: Email submission page with security-first design (always shows success message)
- `reset-password.tsx`: Password reset page with token validation, password strength indicator, show/hide toggles

Added API service methods `forgotPassword(email)` and `resetPassword(token, newPassword)`. Updated LoginPage with "Forgot password?" link. Added routes `/auth/forgot-password` and `/auth/reset-password` to App.tsx.

Key patterns:
- Security by obscurity: don't reveal if email exists
- Password strength indicator reused from signup
- Query param parsing with useSearchParams
- Redirect to login with success message on completion
- Graceful handling of expired/invalid tokens

### 2026-03-28 — Implemented US-025 Subscription Cancellation UI

Enhanced SubscriptionPage with:
- Confirmation modal with consequences listed
- Warning banner showing end_date and days_remaining after cancellation
- Reactivate button for cancelled-but-not-expired subscriptions
- Better error handling and loading states

Added API service methods `cancelSubscription()` returning `{end_date, days_remaining}` and `reactivateSubscription()`. Modal uses TailwindCSS with overlay and accessible design. Cancel flow: button → modal → API call → success state with reactivate option.

Documented expected backend API contracts in `.squad/decisions/inbox/dallas-us004-us025.md` for Fenster to implement.

## Sprint 2 Update (2026-03-30)

Completed US-004 Password Reset UI and US-025 Subscription Cancellation UI with Fenster and Hockney.

**Password Reset Implementation:**
- ForgotPasswordPage: Email submission with security-first messaging
- ResetPasswordPage: Token validation, password strength indicator, confirm password
- LoginPage: Added "Forgot password?" link
- API methods: forgotPassword() and resetPassword()
- Routes: /auth/forgot-password and /auth/reset-password

**Subscription Cancellation Implementation:**
- Cancel button for paid subscribers (hidden for free plan)
- Confirmation modal with warning banner about end_date
- Success state showing days_remaining countdown
- Reactivate button to undo cancellation before period end
- API methods: cancelSubscription() and reactivateSubscription()

**Coordination with Fenster:**
- Received API contracts with request/response examples
- Integrated endpoints for password reset and cancellation
- Used Axios JWT interceptor for all requests
- Verified error handling with specific error codes

**Coordination with Hockney:**
- E2E tests written for full user journeys
- Frontend tests for UI components (modal, buttons, loading states)
- Form validation tested (empty fields, weak passwords, mismatched confirmation)
- Error scenarios covered (expired token, no subscription, etc.)

**Status:** Ready for Keaton UX review and Hockney E2E test execution.

### TypeScript Build Fix (2026-03-30)

Fixed all 23 TypeScript compilation errors in `packages/web`. Build now exits 0.

**React Query v5 Migration Pattern:**
- Old v4 syntax: `useQuery(['key'], fn)` or `useQuery(['key'], fn, options)`
- New v5 syntax: `useQuery({ queryKey: ['key'], queryFn: fn, ...options })`
- Both positional-array-key and 3-arg forms are removed in v5; always use the options object form.

**Type Patterns Fixed:**
- `ApiResponse<T>.data` is `T | undefined` — always coerce to null with `?? null` before assigning to `State<T | null>`.
- `LoginRequest` missing `remember_me?: boolean` — added optional field to the shared type.
- `ApiResponse.error` shape is `{ code, message }` not a plain string — fallback objects must match the typed shape.
- `JSX.Element` namespace not available without explicit `@types/react` JSX namespace — use `ReactElement` from react instead.
- `verbatimModuleSyntax` requires type-only imports to use `import type` — remove or convert type-only re-exports.

**Unused Import Pattern:**
- Post-JSX-transform (`"jsx": "react-jsx"`), `import React from 'react'` is not needed in component files. Remove it.
- Unused variables from hook calls (`const stripe = useStripe()`) — either remove the call or remove the variable if the hook side-effect isn't needed.

**Test Files Exclusion:**
- `tsconfig.app.json` `include: ["src"]` picks up `*.test.tsx` files which import `vitest`/`@testing-library` not in production deps.
- Fix: add `exclude` for `**/*.test.{ts,tsx}` and `**/*.spec.{ts,tsx}` patterns.

**Files Changed:**
- `src/components/PlanComparison.tsx` — React Query v5 migration
- `src/components/StripeCardElement.tsx` — remove unused imports
- `src/context/AuthContext.tsx` — fix `User | undefined` → `User | null` coercion
- `src/hooks/useStripe.ts` — remove unused `Stripe` type import
- `src/middleware/ProtectedRoute.tsx` — remove unused React, fix JSX.Element → ReactElement
- `src/pages/CheckoutPage.tsx` — remove unused React import
- `src/pages/SubscriptionPage.tsx` — remove unused React/navigate, fix setCancelInfo type
- `src/services/api.ts` — fix error shape in fallback response
- `src/types/api.ts` — add `remember_me?: boolean` to LoginRequest
- `tsconfig.app.json` — exclude test files from production build

### Auth E2E Test Fixes (6 failing tests resolved)

**Problem 1 — 401 interceptor swallowed login errors:**
Added an early-exit guard in the Axios 401 interceptor (`api.ts`) to bypass refresh logic for `/auth/login`, `/auth/signup`, and `/auth/refresh` URLs. Without this, a wrong-password 401 triggered a token refresh attempt, which failed and redirected the user silently instead of showing the error.

**Problem 2 — LoginPage missing `noValidate`:**
Added `noValidate` to the `<form>` in `LoginPage.tsx`. Without it, the browser's native HTML5 email validation prevented `handleSubmit` from running, so the custom React error for invalid email format was never shown.

**Problem 3 — Duplicate email error message mismatch:**
The backend returns `'An account with that email already exists'` on 409, but the test expects `'Email already registered'`. Changed `SignupPage.tsx` to always display `'Email already registered'` for 409 errors.

**Key pattern to remember:**
- Axios interceptors must never catch errors from the same endpoint family that authenticates (login/signup) — they have no refresh token to work with and will always fail, masking the original error.
- Always align frontend error messages with E2E test expectations; never rely solely on backend messages passing through.

### 2026-03-30 — Auth E2E Tests Fully Green (9/9 Passing)

**Root Cause Found: .env Configuration**

The remaining issue after code fixes was environment configuration, not logic:
- VITE_API_BASE_URL in `packages/web/.env` was set to `http://localhost:3001/api` (absolute URL)
- This **bypassed Vite's proxy setup** defined in `vite.config.ts`
- All API calls went directly to `http://localhost:3001/api/auth/*` which doesn't exist
- Backend only exposes `/auth/*` endpoints; they are proxied at `/api` by Vite in dev

**Fix Applied:**
Changed VITE_API_BASE_URL from `http://localhost:3001/api` to `/api` (relative path)
- Respects Vite proxy configuration
- Routes through proxy to backend `/auth/*` endpoints correctly
- 9/9 non-skipped Chromium auth E2E tests now passing

**Critical Learning:**
Environment configuration can completely override application logic. Never use absolute localhost URLs in .env when the development environment uses a proxy. Always verify proxy setup when debugging API routing issues.

### 2026-03-30 — Implemented US-043 Dashboard Overview Card & Quick Actions

Added `DashboardData` type to `types/api.ts` and `getDashboard()` method to `services/api.ts` calling `GET /dashboard/me/dashboard`.

Updated `pages/dashboard.tsx`:
- Added `useQuery(['dashboard'])` fetching dashboard overview (retry: 1, staleTime: 30s)
- Added **Overview Card** below h1: colour-coded left border (red/yellow/green) based on subscription health, team member progress bar, renewal countdown, next billing amount
- Added **Quick Actions** bar: Upgrade Plan (disabled for enterprise), Invite Member (coming soon, disabled), Manage Billing

Page order: h1 → Overview Card → Quick Actions → Cancellation Banner → Account → Subscription → Billing History.
TypeScript: 0 errors.



### 2026-03-30 — Implemented US-031/032 Team Management UI + US-004 Password Reset Refresh

**Team Management (US-031/032):**
- Added `TeamMember`, `Team`, `TeamInvite` interfaces to `types/api.ts`
- Added team API methods to `services/api.ts`: `getTeam`, `getTeamInvites`, `createInvite`, `removeMember`, `acceptInvite`
- Created `pages/TeamPage.tsx`: full team management with member list (role badges, remove button), invite-by-email form (error codes mapped to user-friendly messages), pending invites list
- Created `pages/AcceptInvitePage.tsx`: spinner → success (auto-redirect to dashboard) / error (with specific error code messages) state machine
- Added routes: `/team` (ProtectedRoute) and `/invite/:token` (public) in `App.tsx`
- Dashboard Quick Actions: Invite Member button now navigates to `/team` (was disabled)

**Password Reset API refresh (US-004):**
- Updated `forgotPassword` to return `ApiResponse<{ message: string }>` (was `void`)
- Updated `resetPassword` to return `ApiResponse<{ message: string }>`, renamed param `newPassword` → `password` to match backend contract, request body updated accordingly
- Existing pages at `pages/auth/forgot-password.tsx` and `pages/auth/reset-password.tsx` already in place and wired; routes and LoginPage "Forgot password?" link were already present

**TypeScript:** 0 errors.


**Delivered:**
- DashboardData interface in packages/web/src/types/api.ts
- getDashboard() in packages/web/src/services/api.ts — calls GET /dashboard/me/dashboard
- pages/dashboard.tsx additions:
  - **Overview Card**: color-coded left border (red/yellow/green), team member progress bar, renewal countdown, next billing amount; IIFE pattern for self-contained sub/team vars
  - **Quick Actions**: Upgrade Plan (disabled for enterprise), Invite Member (disabled, coming soon), Manage Billing
  - Query: etry: 1, staleTime: 30_000; card renders only when data is present
- TypeScript: 0 errors

**Design rules established:**
- Frontend owns user-facing error strings for known HTTP error codes (not backend messages)
- Auth endpoints bypass 401 interceptor refresh logic entirely
- Absolute localhost URLs in .env bypass Vite proxy — always use relative /api

**Anticipatory E2E tests ready (Baskar):** 	ests/e2e/dashboard.spec.ts (5 tests, all fail as feature gap)

## 2026-03-30 — Fixed React white-screen crash (dashboard IIFE)

**Task:** Diagnose and fix blank-page crash reported by Playwright smoke tests.

**Root Cause:** packages/web/src/pages/dashboard.tsx used an IIFE (immediately invoked function expression) inside JSX for the Overview Card:

`	sx
{dashboardData && (
  (() => { /* logic */ return <div>...</div>; })()
)}
`

IIFEs inside JSX are not proper React components — they bypass React's reconciliation, have no error boundary isolation, and any throw inside propagates uncaught to the root, unmounting the entire tree (white screen).

**Fix:** Extracted the IIFE into a named DashboardOverviewCard functional component defined above DashboardPage. Replaced the IIFE call site with {dashboardData && <DashboardOverviewCard data={dashboardData} />}. Also added DashboardData to the type import.

**Verification:** 	sc --noEmit passes (exit 0); ite build succeeds (150 modules, no errors).

### 2026-03-31 — Implemented US-005 Profile Management UI

**Task:** Build ProfilePage where users can view and edit their name and email.

**Files changed:**
- `src/types/api.ts` — Added `UserProfile` interface `{ id, email, name, avatarUrl, createdAt }`
- `src/services/api.ts` — Added `getProfile()` (GET /users/me) and `updateProfile({ name?, email? })` (PUT /users/me); imported UserProfile type
- `src/pages/ProfilePage.tsx` — Created new page
- `src/App.tsx` — Added import and route `/profile` (ProtectedRoute)
- `src/components/Layout.tsx` — Added "Profile" nav link next to "Dashboard" for authenticated users

**ProfilePage features:**
- Avatar initials circle (no upload)
- Member since date display
- Edit form: name + email fields; email change warning
- useQuery for GET with loading spinner and error state
- useMutation for PUT with success/error banners + cache invalidation
- Matches existing Tailwind design (bg-white rounded-lg shadow-sm, primary-600 buttons)

**TypeScript:** 0 errors (tsc --noEmit exits 0).

### 2026-03-31 — Implemented US-023 Downgrade Subscription Frontend

**Task:** Add downgrade flow to `SubscriptionPage.tsx`.

**Files changed:**
- `packages/web/src/services/api.ts` — Added `downgradeSubscription(planId, billingInterval)` calling `POST /subscriptions/downgrade`
- `packages/web/src/pages/SubscriptionPage.tsx` — Full downgrade flow implementation

**SubscriptionPage additions:**
- Added `Plan` interface and `TIER_ORDER` / `getTierRank` / `deriveTier` helpers for tier comparison
- Added `fetchSubscription` helper (extracted from useEffect, reused on success)
- Plans fetched in initial `useEffect` alongside subscription + payments
- **Plan Comparison section**: billing interval toggle (Monthly/Annual) + 3-column plan cards. Button label is "Current Plan" (disabled), "Upgrade" (link to /pricing), or **"Downgrade"** (amber button) based on tier rank comparison
- **Downgrade confirmation modal**: shows current plan → new plan flow, "unused time will be credited" notice, member limit warning with new plan's max, inline `MEMBER_LIMIT_EXCEEDED` error (modal stays open with red box explaining N members vs M allowed)
- **Downgrade success banner**: "Downgraded to {planName}. Credit applied." in green, dismissible
- State: `selectedPlan`, `showDowngradeModal`, `downgrading`, `downgradeSuccess`, `memberLimitError`, `billingInterval`

**Error handling:**
- `MEMBER_LIMIT_EXCEEDED` 400: modal stays open, shows "You have N members, new plan allows M. Remove members first."
- Other errors: modal closes, `actionError` banner shown

**TypeScript:** 0 errors (tsc --noEmit exits 0).


## US-025: Subscription Cancellation Frontend — 2026-03-30

**Requested by:** jayanth.jagadish

### Changes Made
- **packages/web/src/services/api.ts**: Fixed cancelSubscription() endpoint to POST /subscriptions/cancel and eactivateSubscription() to POST /subscriptions/reactivate (were using /subscriptions/me/* variants).
- **packages/web/src/pages/SubscriptionPage.tsx**: Updated post-cancel banner to show "Subscription cancelled. Access until {date}." with a "Reactivate" button (spec-compliant wording).
- **packages/web/src/pages/dashboard.tsx** (DashboardOverviewCard): When cancelAtPeriodEnd = true, overview card now displays "Cancels on {date}" (yellow text) instead of "Renews in X days".

### TypeScript
- 	sc --noEmit exits 0 — no type errors.

## US-026: Billing History Frontend — 2026-03-31

**Requested by:** jayanth.jagadish

### Changes Made

- **packages/web/src/types/api.ts**: Added `Invoice` interface `{ id, date, amount, currency, status: 'paid'|'pending'|'failed', planName, invoicePdfUrl }`.
- **packages/web/src/services/api.ts**: Added `getInvoices()` method calling GET /subscriptions/invoices; returns `ApiResponse<{ invoices: Invoice[], hasMore: boolean }>`. Imported `Invoice` type.
- **packages/web/src/pages/BillingHistoryPage.tsx**: Created new page with:
  - Invoice table: Date | Plan | Amount | Status | Download columns
  - Color-coded `StatusBadge` (green=paid, yellow=pending, red=failed)
  - Download button opens Stripe PDF URL in new tab; shows "—" when null
  - Empty state: "No invoices yet" with icon for free plan users
  - "Load more" button when `hasMore: true` (page-based accumulation via `useState`)
  - Loading skeleton (5 skeleton rows) while fetching first page; inline "Loading more…" for subsequent pages
  - Currency formatted with `Intl.NumberFormat` (amount in cents ÷ 100)
  - React Query v5 object-form `useQuery({ queryKey, queryFn })`
- **packages/web/src/App.tsx**: Added import for `BillingHistoryPage`; added route `/billing` with `<ProtectedRoute>`.
- **packages/web/src/components/Layout.tsx**: Added "Billing" nav link for authenticated users (between Profile and Logout).

### TypeScript
- `tsc --noEmit` exits 0 — no type errors.

## US-042: Upcoming Billing Calendar Frontend — 2026-03-31

**Requested by:** jayanth.jagadish

### Changes Made

- **packages/web/src/types/api.ts**: Added `BillingEvent` interface `{ date, type: 'renewal'|'trial_end'|'cancellation'|'invoice_due', label, amount?, currency }` and `BillingCalendar` interface `{ events: BillingEvent[], nextBillingDate: string | null, billingInterval: 'monthly' | 'annual' }`.
- **packages/web/src/services/api.ts**: Added `getBillingCalendar()` method calling `GET /subscriptions/calendar`; returns `ApiResponse<BillingCalendar>`. Imported `BillingCalendar` type.
- **packages/web/src/pages/BillingHistoryPage.tsx**: Added `UpcomingBillingSection` component above the invoice table:
  - Fetches calendar via `useQuery(['billingCalendar'])` with 5-min stale time
  - Shows loading skeleton (`CalendarSkeleton`) while fetching
  - Empty state: "No upcoming billing events" when events array is empty
  - Event list: each event shows emoji icon + colored border card (blue=renewal, orange=cancellation, gray=trial_end, yellow=invoice_due)
  - Format: "Mar 1 — Subscription renewal · $49.00/mo"
  - `nextBillingDate` shown prominently: "Next billing: March 1, 2024"
  - Billing interval suffix applied to amounts (/mo or /yr)

### TypeScript
- `tsc --noEmit` exits 0 — no type errors.


## US-024: Payment Retry Logic Frontend — 2026-03-30

**Requested by:** Jayanth

### Changes Made

- **packages/web/src/types/api.ts**: Added pastDue?: boolean, lastPaymentFailedAt?: string, paymentRetryCount?: number to Subscription interface; added pastDue?, lastPaymentFailedAt?, paymentRetryCount? to the DashboardData.subscription nested type.
- **packages/web/src/services/api.ts**: Added etryPayment() calling POST /subscriptions/retry-payment (no body, auth via bearer token from interceptor). Returns ApiResponse<{ retried: boolean }>.
- **packages/web/src/pages/SubscriptionPage.tsx**:
  - Added state: etrying, etrySuccess, etryError
  - Added handleRetryPayment() handler with loading/success/error state management + etchSubscription() refresh on success
  - Added **Past-Due Payment Alert Banner** at top of page (above other banners): shown when sub?.pastDue === true || sub?.status === 'past_due'; displays formatted lastPaymentFailedAt date, paymentRetryCount ("Failed N times"), inline success/error feedback, and a "Retry Payment" button with loading state
- **packages/web/src/pages/dashboard.tsx**: Added compact red warning card when subscriptionData?.status === 'past_due' — shows "Payment Failed" message and "Manage Billing →" link to /subscription.

### Key Patterns Used
- Past-due check uses dual condition (pastDue === true || status === 'past_due') to handle both backend response shapes
- Retry button disables during in-flight request (loading state via etrying boolean)
- Dashboard banner is read-only, links to SubscriptionPage for the actual retry action
- Intl date formatting for lastPaymentFailedAt

### TypeScript
- 	sc --noEmit exits 0 — no type errors.

## Learnings
- When backend may send past-due state as either pastDue: boolean field OR status: 'past_due', check both conditions in UI for resilience
- Retry UI should refresh subscription state on success so banner disappears automatically
- Dashboard compact banner pattern: show minimal info + link to detail page rather than duplicating retry logic

## US-035: Member Limit Enforcement (Frontend) --- 2026-03-30

**Requested by:** Jayanth

### Changes Made

- packages/web/src/types/api.ts: Added SubscriptionStatus interface { memberCount, memberLimit, planName, planId? }.
- packages/web/src/services/api.ts: Added getSubscriptionStatus() calling GET /subscriptions/status; imported SubscriptionStatus type.
- packages/web/src/pages/TeamPage.tsx:
  - Added React Router Link import.
  - Added subscriptionStatus query (GET /subscriptions/status) via React Query.
  - Derived memberCount (from subStatus, fallback team.memberCount), memberLimit, and atCapacity boolean.
  - Members card: seat usage text (X / Y seats used) + indigo/red progress bar above member list.
  - Invite section: amber warning banner + Link to /subscription when atCapacity; input and button disabled at capacity; button wrapped in tooltip div.
  - Invite error: shows inline Upgrade Plan link when error text references member limit.
  - inviteMutation.onError: detects SEAT_LIMIT_REACHED code or 403 status and shows spec-compliant upgrade message.
  - Error map updated: SEAT_LIMIT_REACHED now maps alongside MEMBER_LIMIT_REACHED.
  - On successful invite: also invalidates subscriptionStatus cache to keep count fresh.
- packages/web/src/pages/SubscriptionPage.tsx:
  - Added subStatus state { memberCount, memberLimit } | null.
  - Fetches api.getSubscriptionStatus() in the main useEffect (non-critical; errors silently ignored).
  - Shows X of Y seats used below plan name/price in the current plan card.

### TypeScript
- tsc --noEmit exits 0 -- no type errors.

## Learnings
- SEAT_LIMIT_REACHED vs MEMBER_LIMIT_REACHED: The backend may return either code; always map both to the same user-facing message for resilience.
- Tooltip on disabled buttons: Wrap disabled button in a div with title attribute -- title on the button itself is suppressed by browsers when disabled.
- Non-critical fetches: Wrap optional data fetches (e.g., getSubscriptionStatus) in try/catch inside the main useEffect so they do not break page load if the endpoint is unavailable.

## US-043: Dashboard Quick Actions (Frontend) --- 2026-04-01

**Requested by:** Jayanth

### Changes Made
- packages/web/src/types/api.ts: Added mailVerified?: boolean to DashboardData.user.
- packages/web/src/services/api.ts: Added esendVerification() calling POST /users/send-verification; confirmed getTeam() → GET /teams/me already exists.
- packages/web/src/pages/dashboard.tsx:
  - Added Link import from react-router-dom.
  - Added erificationSent and erificationError state variables.
  - Added handleResendVerification() async handler.
  - Replaced old Quick Actions section (plain buttons with navigate()) with a proper card (white bg, rounded-lg, shadow-sm, p-6) containing:
    - Invite Team Member → <Link to="/team"> (indigo-600 button)
    - Manage Subscription → <Link to="/subscription"> (blue-600 button)
    - View Analytics → <Link to="/analytics"> (green-600 button)
    - Resend Verification Email → only shown when dashboardData?.user?.emailVerified === false && !verificationSent; hides after success; shows success/error inline.

### TypeScript
- tsc --noEmit exits 0 -- no type errors.

## Learnings
- Use <Link> (react-router-dom) for navigation buttons that are just routes — avoids useNavigate boilerplate and is more semantic.
- Check dashboardData?.user?.emailVerified for conditional UI from enriched backend data rather than the lighter User object from /users/me.
- When replacing existing Quick Action sections, match card style exactly (p-6 not p-4, font-semibold title not uppercase tracking-wide) per the spec.

## 2026-03-30: Contract-First API Calls

**Contract-first pipeline:** read packages/api/API_CONTRACT.md before adding any calls to api.ts. Never invent routes.

All API calls in the frontend must reference an existing route documented in packages/api/API_CONTRACT.md. If a route you need doesn't exist or isn't documented, raise it with Karthi and wait for the contract update before implementing the frontend feature.

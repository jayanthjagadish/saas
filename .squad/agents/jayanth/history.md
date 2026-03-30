# Keaton's History

## Project Context

**Project:** lession3 (TypeScript SaaS)
**Stack:** React (frontend), Express (backend), MySQL (database), Stripe (payments)
**User:** jayanth.jagadish
**Team:** Keaton (Lead), Dallas (Frontend), Fenster (Backend), Hockney (Tester)

This is a subscription-based SaaS with aesthetic UI. Focus on payment reliability and data integrity from day one.

## Learnings

### Architecture Phase (2024-01)
- **Monorepo structure chosen:** npm workspaces keep frontend, backend, shared types cohesive. Reduces breaking changes; enables single test suite.
- **Key file path:** `.squad/decisions/inbox/keaton-architecture.md` (source of truth for tech decisions)
- **Database design:** Stripe is source of truth for subscription state. Local DB reflects Stripe state via webhooks; never override Stripe.
- **JWT strategy:** 15min access token + 30day refresh token (httpOnly cookie). Stateless auth, secure against XSS.
- **Payment safety:** All Stripe webhook events verified with SDK before processing. Audit logs for all subscription/payment changes (compliance + debugging).
- **API contracts:** Shared types in `packages/shared/` prevent frontend/backend misalignment on auth, subscription, payment data.
- **High-stakes decisions requiring team review:**
  - Trial period duration (7 vs 30 days) — affects Subscription schema
  - Cancellation timing (immediate vs end-of-period)
  - Plan pricing source (hard-coded vs Stripe API)
  - Payment failure email cadence
- **Testing strategy:** Hockney focuses on Stripe webhook flows (payment_succeeded, payment_failed, subscription.updated/deleted). Use Stripe test cards.
- **Dev team focus:** Dallas (React + TypeScript UI), Fenster (Express + TypeScript API + Stripe), Hockney (E2E + Stripe webhook verification).

### Key Paths
- Architecture doc: `.squad/decisions/inbox/keaton-architecture.md`
- Decisions board: `.squad/decisions.md`
- Frontend: `packages/web/` (Dallas)
- Backend: `packages/api/` (Fenster)
- Shared contracts: `packages/shared/src/types/`

### Architecture Standards Adoption (2026-03-30)
- Architecture patterns skill created. All agent charters updated with SOLID, Clean Architecture, Repository Pattern, 12-Factor. Skill at .squad/skills/architecture-patterns/SKILL.md

### Test Infrastructure Consolidation (2026-04-01)
- **Problem identified:** Test suite had 500+ tests running chaotically due to duplicate test files across `tests/e2e/` and `packages/web/e2e/`, stale selectors, and no globalSetup for test user creation
- **Canonical location established:** `tests/e2e/` is the single source of truth for all E2E tests
- **Consolidation completed:**
  - Moved actively maintained `packages/web/e2e/auth-flow.spec.ts` (347 lines, comprehensive) → replaced stale `tests/e2e/auth-flow.spec.ts` (22 lines, skipped)
  - Moved `packages/web/e2e/password-reset.spec.ts` → `tests/e2e/password-reset.spec.ts`
  - Deleted duplicate `tests/e2e/auth-flows.spec.ts` (note the 's')
  - Removed source files from `packages/web/e2e/` after migration
- **GlobalSetup added:** Created `tests/helpers/global-setup.ts` to ensure test user exists before Playwright runs
- **DB schema validation:** Created `tests/helpers/check-db-schema.cjs` to verify critical columns (users, subscriptions, sessions) exist before tests run
- **Playwright config updated:** Added `globalSetup: './tests/helpers/global-setup.ts'` to `playwright.config.ts`
- **Result:** Single source of truth for E2E tests, automated test user creation, DB schema validation gate before test execution
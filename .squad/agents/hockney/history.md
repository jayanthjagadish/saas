# @{m=Hockney}.* | Select-Object -ExpandProperty m)'s History

## Project Context

**Project:** lession3 (TypeScript SaaS)
**Stack:** React (frontend), Express (backend), MySQL (database), Stripe (payments)
**User:** jayanth.jagadish
**Team:** Keaton (Lead), Dallas (Frontend), Fenster (Backend), Hockney (Tester)

This is a subscription-based SaaS with aesthetic UI. Focus on payment reliability and data integrity from day one.

## Learnings

### Testing Scaffold Setup (Session 1)

**Decision:** Three-tier testing pyramid: 60% unit (Jest), 30% integration (Vitest), 10% E2E (Playwright)

**Architecture:**
- Jest for unit tests (payment logic, auth, validation)
- Vitest for integration tests (DB interactions, webhooks)
- Playwright for E2E tests (full user journeys)
- Shared test utilities: auth-mocks, stripe-mocks, subscription-mocks

**Payment Edge Cases Covered:**
1. Duplicate charge detection (same stripe_payment_intent_id)
2. Failed payment recovery (active → past_due → active)
3. Refund processing (canceled → refunded)
4. Currency/amount validation (store in cents, prevent float errors)
5. Subscription state machine (trial → active → cancel_at → canceled)
6. Webhook signature verification (always use stripe.webhooks.constructEvent)
7. Audit logging (track all subscription/payment changes)
8. Data consistency (Stripe as source of truth, DB as mirror)

**Key Files:**
- `/tests/` - All test scaffolding
- `/tests/unit/` - auth.spec.ts, payments.spec.ts (mock-based)
- `/tests/integration/` - subscription-lifecycle.spec.ts (DB + Stripe)
- `/tests/e2e/` - auth-flows.spec.ts, subscription-flows.spec.ts (Playwright)
- `/tests/utils/` - auth-mocks.ts, stripe-mocks.ts, subscription-mocks.ts
- `/tests/README.md` - Full testing strategy + payment edge case coverage
- `/jest.config.js`, `/vitest.config.ts`, `/playwright.config.ts` - Test configs

**Coverage Targets:** >90% code coverage, 80% threshold on statements/branches/functions/lines

**Templates Provided:**
- Unit test template (auth.spec.ts): Token generation, password hashing, mock user creation
- Unit test template (payments.spec.ts): Duplicate detection, failed payment handling, refunds, idempotency
- Integration template (subscription-lifecycle.spec.ts): Trial→Paid, renewal cycles, cancellation, past due recovery
- E2E template (auth-flows.spec.ts): Signup, login, logout, token refresh, session persistence
- E2E template (subscription-flows.spec.ts): Plan selection, payment execution, management, cancellation, error handling

**Next Steps:**
- Implement actual service code to match test contracts
- Connect to real database (MySQL 8.0+) via Sequelize
- Integrate Stripe SDK and webhook handlers
- CI/CD: Run tests on each push, fail if coverage drops below 80%

### Hockney Update: Auth test suite added
- Added Jest unit/integration-style spec files for signup, login, and logout under tests/api
- Added Playwright E2E test at tests/e2e/auth-flow.spec.ts which assumes a test hook exposing the last verification token
- Added fixtures at tests/fixtures/auth.fixtures.ts describing token helpers and sample users
- Decisions: mocked email service and in-memory test DB for fast runs; append a decision file in inbox for traceability


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

### PR Review Gate Policy (2026-04-01)
- **Problem:** Agents were committing directly to `main` with no gating step, creating risk of unreviewed architectural drift, security issues, and broken API contracts.
- **Policy added:** New `## PR Review Gate` section in Jayanth's charter formalises that all non-trivial PRs (>5 lines or >1 file) must be opened as PRs and reviewed by Jayanth before merging to `main`.
- **Exemption:** Scribe's `.squad/`-only housekeeping commits are exempt to avoid friction on low-risk metadata updates.
- **Checklist introduced:** Tests pass (no new skips), API_CONTRACT.md updated, no secrets/PII, Senthil handoff file if frontend touched, Baskar coverage for new flows.
- **SLA:** <2h standard, <30min hotfix — keeps the team unblocked while ensuring review quality.
- **Boundaries updated:** Added explicit "Do NOT merge to main without explicit PR approval" to the Boundaries section.
- **Why:** Prevents the class of bugs where an agent makes a plausible-looking but architecturally incorrect change that slips through because no human-in-the-loop step existed.

### Portable Workflow Bundle Created (2026-04-01)
- **Goal:** Make the team's agentic workflow reusable on ANY new project, not just Fenster SaaS.
- **Bundle location:** `.squad/templates/workflow/`
- **Files created (9 total):**
  - `README.md` — full pipeline diagram, 5 core principles, step-by-step bootstrap guide
  - `agent-charters/lead.md` — generic Lead charter with `{{PROJECT_NAME}}` / `{{STACK}}` / `{{LEAD_NAME}}` placeholders
  - `agent-charters/backend.md` — generic Backend charter; contract-first + standard `{ success, data }` envelope
  - `agent-charters/frontend.md` — generic Frontend charter; handoff protocol + selector table format
  - `agent-charters/tester.md` — generic Tester charter; two-phase protocol, test.skip() ban, 24h SLA
  - `agent-charters/scribe.md` — generic Scribe charter; history compaction always-on directive
  - `decisions-seed.md` — 8 pre-populated foundational decisions (DEC-001 through DEC-008)
  - `bootstrap.sh` + `bootstrap.ps1` — scripts that create the full `.squad/` structure, substitute placeholders, and emit team.md / routing.md
  - `API_CONTRACT_template.md` — blank contract with auth, resources, webhooks, test hooks, error codes
- **Decision record:** `.squad/decisions/inbox/jayanth-portable-workflow-bundle.md`

### Workflow Gap Corrections (2026-04-02)
- **GAP 1 — Verify-Fix Protocol Added:** All implementation agents (Karthi, Senthil, Baskar) now have explicit post-fix verification rule. Agents MUST run the specific failing test and confirm it passes before declaring work done. Prevents incomplete fix reports where code changes are submitted without proof of resolution.
- **GAP 2 — Full-Chain E2E Failure Tracing Rule Added:** Baskar's charter now mandates four-layer tracing before fixing any E2E failure: test layer (selectors), UI layer (elements), API layer (response format), DB layer (seeded data). Prevents superficial fixes that address only one layer and break on next run.
- **GAP 3 — Targeted Smoke Gate Ceremony Added:** New ceremony in `.squad/ceremonies.md` runs between fix batch and full suite. Baskar runs only the touched spec files to check for regressions before committing to full suite run. Catches fix-introduced breaks before they propagate to broader test results.
- **Decision record:** `.squad/decisions/inbox/jayanth-workflow-gap-corrections.md`

### Definition of Done Gate Mandated (2026-04-02)
- **Mandate:** Strict Definition of Done gate added to ALL agent charters (Karthi, Senthil, Baskar, Basher, Jayanth).
- **Core principle:** "I made the change" = Started. "The test passes" = Done. No exceptions.
- **Four-gate structure enforced:** (1) Code written, (2) Target test passes, (3) No new failures, (4) Logged.
- **Infrastructure blocker escape:** Agents may use `test.fixme()` ONLY for infrastructure-blocked tests (Stripe not configured, external service unavailable). Must state the blocker explicitly.
- **Constraint addition:** Baskar's constraint line updated to allow `test.fixme()` for infrastructure blocks alongside `test.todo()` for unwritten tests. `test.skip()` remains banned — provides no visibility.
- **Why:** Prevents false "done" declarations. Agents cannot declare work complete without evidence (passing test or explicit blocker). This is now non-negotiable across the squad.
- **Files updated:**
  - `.squad/agents/karthi/charter.md` — Definition of Done added after Plan-First Protocol
  - `.squad/agents/senthil/charter.md` — Definition of Done added after Plan-First Protocol
  - `.squad/agents/baskar/charter.md` — Definition of Done added after Plan-First Protocol; constraint line updated to include test.fixme()
  - `.squad/agents/jayanth/charter.md` — Definition of Done added after Plan-First Protocol
  - `.squad/agents/basher/charter.md` — Definition of Done added after Plan-First Protocol
- **Decision record:** `.squad/decisions/inbox/jayanth-definition-of-done.md`
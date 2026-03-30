# Basher — History

## Project Context
- **Project:** lession3
- **Stack:** TypeScript monorepo — React (packages/web), Express (packages/api), MySQL, Stripe
- **User:** jayanth.jagadish
- **Joined:** 2026-03-30
- **Role:** Release Engineer — gates pushes to remote on green builds + passing tests

## Build Scripts (as of joining)
- Root: check for `npm test` / `npm run test` in root package.json
- API: `packages/api` — `npm run build` (TypeScript via tsc)
- Web: `packages/web` — `npm run build` (Vite)
- Tests: `tests/` (Jest) + `packages/web/e2e/` (Playwright)

## Learnings
- Two pending migrations need `npm run db:migrate` before API tests against live MySQL will pass
- E2E tests require running backend + frontend — run unit/integration tests for CI gate by default
- TypeScript strict mode is on — build failures are hard errors

## Release Gate Decisions
- Lint: warn only (project may not have lint script configured yet)
- Build: hard gate (both packages must compile)
- Unit tests: hard gate
- E2E: optional gate (requires live environment — skip in CI unless explicitly requested)

## First Push Attempt — 2026-03-30

### Outcome: BLOCKED — Web Build Failure

**Gates Status:**
- ✅ Lint (API): 73 problems (warn only — not blocking)
- ✅ Lint (Web): 46 problems (warn only — not blocking)
- ✅ Build (API): PASS
- ❌ Build (Web): FAIL — 23 TypeScript errors
- ⏸️ Tests: SKIPPED (blocked by build)
- ⏸️ Push: BLOCKED

**Key Issues Found:**
1. React Query API migration mismatch — code uses v4 API, likely v5 installed
2. Unused React imports (post-JSX transform cleanup needed)
3. Type safety issues in AuthContext (User optional handling)
4. Test file dependencies not available in build context
5. LoginRequest type missing `remember_me` field

**Failure Record:** `.squad/decisions/inbox/basher-build-failure-2026-03-30_125200.md`

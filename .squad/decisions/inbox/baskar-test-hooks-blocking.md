# Decision: test-hooks Endpoints Block 9 E2E Tests

**Author:** Baskar  
**Date:** 2026-04-02  
**Status:** Needs Action (Karthi)

## Context

9 E2E tests across auth-flow.spec.ts (6), password-reset.spec.ts (3) are blocked because `GET /test-hooks/last-verification` and `GET /test-hooks/last-reset-token` return 404.

The API server does not register test-hooks routes when running in production mode. The `start-servers.js` spawns the API with `npm run dev`, but the server reports `Environment: production`.

## Impact

- auth-flow.spec.ts: 6 of 10 tests fail (signup→verify→login flow, remember-me, session persistence, redirect, logout)
- password-reset.spec.ts: 3 of 7 tests fail (full reset flow, used token, second request)

## Recommendation

**For Karthi:** Ensure test-hooks routes are registered when `NODE_ENV=test`. The start-servers.js and playwright.config.ts set `NODE_ENV=test`, but the running API shows `Environment: production`. Check if the API ignores the env or overrides it.

**Quick fix:** Register test-hooks unconditionally in dev mode, gated by `NODE_ENV !== 'production'`.

# E2E Test Infrastructure — Hard Lessons

**Confidence:** high  
**Source:** Session 2026-03-30, production debugging + Session 2026-03-31 sprint validation

## Pre-Flight Checklist (MUST run before ANY E2E test)

1. **Kill zombie servers:** `Get-NetTCPConnection -LocalPort 3000,3001 -State Listen` → `Stop-Process -Id <PID>`
2. **Provision test DBs:** `node tests/helpers/setup-worker-dbs.cjs` (requires `mysql2` and `bcryptjs` at root)
3. **Start servers:** Set `NODE_ENV=test`, `TEST_DB_NAME=fenster_test_worker_0`, then `node start-servers.js`
4. **Verify login works:** `curl -X POST http://localhost:3001/auth/login` with test credentials before running Playwright

**If login doesn't return 200 + token → DO NOT RUN TESTS. Fix infra first.**

## Root Cause Triage Framework

Before ANY fix, classify the failure:

| Symptom | Root Cause Category | First Action |
|---------|-------------------|-------------|
| Auth 500 errors | Missing test DB | Run setup-worker-dbs.cjs |
| Login form fill timeout | Server not running | Check ports, restart servers |
| waitForURL('**/dashboard') timeout | Auth redirect broken | Check AuthContext + ProtectedRoute code |
| Element not found | UI component missing | Check Senthil's component source |
| Wrong API response shape | Contract mismatch | Check Karthi's route handler |
| All tests timeout at same step | Port conflict | Kill zombies, restart |

**Key principle:** 500 errors = infra issue until proven otherwise. Don't fix code for infra problems.

## Key Facts

| Item | Value |
|------|-------|
| Source DB | `lession3` (MySQL) |
| Worker DBs | `fenster_test_worker_0..3` |
| API routes | `/auth/*` (NOT `/api/auth/*`) |
| Vite proxy | `/api/*` → `localhost:3001` |
| Test user | `test@fenster-test.com` / `SecureTest123!@#` |
| Unverified user | `unverified@fenster-test.com` |
| Password reset user | `passwordreset@example.com` |

## Root Causes Discovered

### All auth 500s → Missing test database
`setup-worker-dbs.cjs` creates `fenster_test_worker_0` from source DB `lession3`. If this script hasn't run, the DB doesn't exist, and Session.create() in the login handler throws → catch block returns `INTERNAL_ERROR`.

### Playwright webServer timeout → Port conflicts
Long sessions accumulate orphan node processes on 3000/3001. Playwright's `webServer` config waits 120s then gives up. Always clean ports first.

### `setup-worker-dbs.cjs` MODULE_NOT_FOUND → Missing root deps
The script runs from repo root but uses `require('mysql2/promise')` and `require('bcryptjs')`. These must be in root `package.json`, not just `packages/api/package.json`.

### waitForURL('**/dashboard') timeout → Auth hydration race
After login, React reinitializes on page navigation and loses the in-memory token. `isInitialized` state in AuthContext must be true before ProtectedRoute redirects. `ProtectedRoute` must return null (not redirect) while `!isInitialized`.

## Banned Patterns

- `test.skip()` — permanently banned. Use `test.fixme()` for infra-blocked tests.
- Declaring "Done" without running the actual test — protocol violation.
- Starting E2E tests without verifying the test DB exists.
- Fixing code when the root cause is infrastructure.
- Agents declaring "Done" based on code changes without a green test output.

## Quick Diagnostic

If tests fail with auth 500s:
```bash
# Check DB exists
mysql -u root -p -e "SHOW DATABASES LIKE 'fenster_test%';"
# If empty → run setup
node tests/helpers/setup-worker-dbs.cjs
# Restart API server with test DB
```

If login form fill times out:
```bash
# Check ports
Get-NetTCPConnection -LocalPort 3000,3001 -State Listen
# Kill zombies then restart
node start-servers.js
```

## Pre-Flight Checklist (MUST run before ANY E2E test)

1. **Kill zombie servers:** `Get-NetTCPConnection -LocalPort 3000,3001 -State Listen` → `Stop-Process -Id <PID>`
2. **Provision test DBs:** `node tests/helpers/setup-worker-dbs.cjs` (requires `mysql2` and `bcryptjs` at root)
3. **Start servers:** Set `NODE_ENV=test`, `TEST_DB_NAME=fenster_test_worker_0`, then `node start-servers.js`
4. **Verify login works:** `curl -X POST http://localhost:3001/auth/login` with test credentials before running Playwright

## Key Facts

| Item | Value |
|------|-------|
| Source DB | `lession3` (MySQL) |
| Worker DBs | `fenster_test_worker_0..3` |
| API routes | `/auth/*` (NOT `/api/auth/*`) |
| Vite proxy | `/api/*` → `localhost:3001` |
| Test user | `test@fenster-test.com` / `SecureTest123!@#` |
| Unverified user | `unverified@fenster-test.com` |
| Password reset user | `passwordreset@example.com` |

## Root Causes Discovered

### All auth 500s → Missing test database
`setup-worker-dbs.cjs` creates `fenster_test_worker_0` from source DB `lession3`. If this script hasn't run, the DB doesn't exist, and Session.create() in the login handler throws → catch block returns `INTERNAL_ERROR`.

### Playwright webServer timeout → Port conflicts
Long sessions accumulate orphan node processes on 3000/3001. Playwright's `webServer` config waits 120s then gives up. Always clean ports first.

### `setup-worker-dbs.cjs` MODULE_NOT_FOUND → Missing root deps
The script runs from repo root but uses `require('mysql2/promise')` and `require('bcryptjs')`. These must be in root `package.json`, not just `packages/api/package.json`.

## Banned Patterns

- `test.skip()` — permanently banned. Use `test.fixme()` for infra-blocked tests.
- Declaring "Done" without running the actual test — protocol violation.
- Starting E2E tests without verifying the test DB exists.

## Quick Diagnostic

If tests fail with auth 500s:
```bash
# Check DB exists
mysql -u root -p -e "SHOW DATABASES LIKE 'fenster_test%';"
# If empty → run setup
node tests/helpers/setup-worker-dbs.cjs
# Restart API server with test DB
```

# E2E Test Infrastructure — Hard Lessons

**Confidence:** high  
**Source:** Session 2026-03-30, production debugging

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

# E2E Auth Flow Tests

This directory contains Playwright end-to-end tests for the complete authentication lifecycle as per US-003 acceptance criteria.

## Test Coverage

The test suite (`auth-flow.spec.ts`) covers the following scenarios:

### 1. Complete Auth Lifecycle
- **Signup → Verify Email → Login → Logout → Session Cleared**
  - Tests the full user journey from registration through logout
  - Verifies form submissions, redirects, and error handling
  - Confirms session revocation after logout

### 2. Error Handling
- **Invalid Credentials**: Tests signup and login form validation
- **Unverified Users**: Verifies that unverified emails cannot login
- **Invalid Verification Tokens**: Tests error handling for expired/invalid tokens

### 3. Session Management
- **Remember Me**: Verifies extended token expiry when checkbox is enabled
- **Session Persistence**: Tests session survives page reloads
- **Protected Routes**: Confirms redirects when accessing protected pages without auth

### 4. Advanced Scenarios
- **Auto-Redirect**: Tests redirect from login to dashboard when already authenticated
- **Logout from Any Page**: Tests logout works from non-dashboard pages
- **Concurrent Requests**: Verifies all requests fail with 401 after logout

## Running the Tests

### Prerequisites
1. Running development server: `npm run dev` (from web package or root)
2. Test database configured (tests use test-hooks for email verification)
3. API running on `http://localhost:3001` (or configured via `API_BASE_URL`)

### Commands

Run all E2E tests:
```bash
# From project root
npx playwright test --config playwright.config.ts packages/web/e2e/

# Or from packages/web
npx playwright test --config playwright.config.ts
```

Run specific test:
```bash
npx playwright test --config playwright.config.ts -g "Signup.*Verify.*Login"
```

Run in headed mode (see browser):
```bash
npx playwright test --config playwright.config.ts --headed
```

Debug mode:
```bash
npx playwright test --config playwright.config.ts --debug
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `BASE_URL` | `http://localhost:3000` | Frontend URL |
| `API_BASE_URL` | `http://localhost:3001/api` | Backend API URL |
| `CI` | undefined | Set in CI to enable retries and single worker |

## Test Hooks

The test suite relies on test-only endpoints:

- `GET /test-hooks/last-verification` — Returns the last verification token sent (mocks email)
- `POST /auth/refresh` — Token refresh endpoint (must respect cookies)

These should only be available in test environments.

## Key Assertions

Each test verifies:
1. ✅ HTTP status codes (200, 401, 403, etc.)
2. ✅ URL/redirect correctness
3. ✅ Session cookies (refresh token set/cleared)
4. ✅ Error messages displayed correctly
5. ✅ UI elements visible/interactive

## Timeout Configuration

- Standard waits: 3-5 seconds
- Long operations (redirect, navigation): 5 seconds
- Test execution: Parallel across Chromium, Firefox, WebKit

## Troubleshooting

**Tests timeout on login:**
- Ensure dev server is running and accessible
- Check that test database is initialized
- Verify `/test-hooks/last-verification` endpoint exists

**Session not persisting:**
- Check cookie settings (httpOnly, sameSite)
- Verify refresh token is set after login
- Check cookie is not being cleared unexpectedly

**Concurrent test failures:**
- Use unique email addresses per test (tests use `Date.now()` for uniqueness)
- Check test database doesn't have email conflicts
- Verify database cleanup between test runs

## Files

- `auth-flow.spec.ts` — All authentication lifecycle tests (280 lines)
- `playwright.config.ts` — Playwright configuration for web package

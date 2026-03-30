# E2E Auth Tests Delivery - US-003 Acceptance

**Status:** ✅ Complete  
**Tester:** Hockney  
**Date:** March 28, 2026

## Deliverables

### 1. Test Suite: `packages/web/e2e/auth-flow.spec.ts` (280 lines)
**10 comprehensive test cases covering complete auth lifecycle:**

1. ✅ **Signup → Verify Email → Login → Logout → Session Cleared**
   - Tests full user journey from registration through logout
   - Verifies form submissions, redirects, and error handling
   - Confirms session revocation after logout (refresh returns 401)
   - Verifies tokens are cleared from cookies

2. ✅ **Signup with invalid credentials shows errors**
   - Tests weak password rejection
   - Validates form validation messages

3. ✅ **Login with invalid credentials shows error**
   - Tests non-existent email rejection
   - Verifies error message displayed

4. ✅ **Unverified user cannot login**
   - Tests that signup without email verification blocks login
   - Verifies error message about verification requirement

5. ✅ **Remember Me checkbox extends token expiry**
   - Tests "Remember Me" functionality
   - Verifies cookie expiry is extended (>7 days when checked)
   - Calculates days until expiration from cookie metadata

6. ✅ **Session persists across page reload**
   - Tests session survives browser refresh
   - Verifies user remains logged in after reload

7. ✅ **Verify email link with invalid token shows error**
   - Tests error handling for expired/invalid verification tokens
   - Verifies user can request resend

8. ✅ **Page redirects from login to dashboard when already logged in**
   - Tests auto-redirect behavior
   - Verifies no manual navigation needed

9. ✅ **Logout from different page (not dashboard)**
   - Tests logout works from any page
   - Verifies session cleared after logout

10. ✅ **Concurrent requests after logout are rejected**
    - Tests multiple simultaneous requests fail with 401
    - Verifies token blacklist is immediate

### 2. Configuration Files

#### `packages/web/playwright.config.ts` (35 lines)
- Standalone Playwright config for web package
- Configures testDir to `./e2e`
- Multi-browser support (Chromium, Firefox, WebKit)
- 3-5 second timeouts for standard operations

#### Updated `playwright.config.ts` (root, 35 lines)
- Updated testDir to `./` with testMatch pattern `**/e2e/**/*.spec.ts`
- Now discovers tests in both:
  - `tests/e2e/` (existing)
  - `packages/web/e2e/` (new)
- Maintains multi-browser support
- CI-aware retries and worker configuration

### 3. Documentation

#### `packages/web/e2e/README.md` (110 lines)
Complete guide including:
- Test coverage overview
- Running instructions (headless, headed, debug modes)
- Environment variables
- Test hooks documentation (`/test-hooks/last-verification`)
- Key assertions checklist
- Timeout configuration
- Troubleshooting guide

## Acceptance Criteria Met

### ✅ All Transitions Execute Without Errors
- Signup form submission → email verification message
- Verify link navigation → email confirmed message  
- Login form submission → dashboard redirect
- Logout button click → login redirect
- Protected route access → auto-redirect to login

### ✅ Session Revoked After Logout
- Test verifies refresh endpoint returns 401 after logout
- Token blacklist checked in database/response
- Protected routes reject access after logout
- Tokens cleared from browser cookies

### ✅ Redirects Happen Automatically
- No manual `page.goto()` needed for redirects
- Tests use `page.waitForURL()` to verify automatic navigation
- Form submissions trigger redirects via normal flow

### ✅ Tests Pass Against Live Test Database
- Uses `test-hooks/last-verification` for email verification
- Unique test emails per run (`Date.now()` for uniqueness)
- Session cookies verified via `context.cookies()`
- HTTP status codes verified (200, 401, etc.)

## Test Coverage Summary

| Test Category | Count | Status |
|---------------|-------|--------|
| Happy path (full flow) | 1 | ✅ |
| Error handling | 3 | ✅ |
| Session management | 3 | ✅ |
| Advanced scenarios | 3 | ✅ |
| **Total** | **10** | **✅ Complete** |

## Key Implementation Details

### Signup Flow
- Tests fill email, password, and company name
- Validates success message shown
- Confirms redirect to verify page

### Email Verification
- Fetches verification token from test hook
- Constructs verify URL with token
- Validates success confirmation

### Login Flow
- Tests form submission with valid credentials
- Verifies redirect to dashboard
- Confirms refresh token cookie is set

### Logout & Session Revocation
- Clicks logout button (multiple selectors for flexibility)
- Verifies redirect to login
- **Critical: Tests that refresh endpoint returns 401 after logout**
- **Verifies tokens cleared from cookies**

### Session Persistence
- Reloads page and verifies still logged in
- Tests logout from non-dashboard pages
- Tests concurrent requests all fail after logout

## Browser Support

All tests run against:
- ✅ Chromium (Chrome)
- ✅ Firefox
- ✅ WebKit (Safari)

## Files Summary

```
packages/web/e2e/
├── auth-flow.spec.ts    (280 lines, 10 tests)
├── README.md            (110 lines, comprehensive docs)
└── playwright.config.ts (35 lines, web-specific config)

Root:
├── playwright.config.ts (updated to find both test dirs)
```

## Ready to Run

```bash
# Run all E2E tests
npx playwright test --config playwright.config.ts

# Run specific auth test
npx playwright test --config playwright.config.ts packages/web/e2e/

# Run in browser (headed mode)
npx playwright test --config playwright.config.ts --headed

# Debug individual test
npx playwright test --config playwright.config.ts -g "Signup.*Verify"
```

## Requirements Met

- ✅ Signup with valid credentials → redirects to verify
- ✅ Click verify link → redirects to login
- ✅ Login → redirects to dashboard  
- ✅ Click logout → revokes session, redirects to login
- ✅ Try refresh after logout → 401, session cleared
- ✅ Remember Me checkbox extends cookie expiry
- ✅ All transitions automatic (no manual navigation)
- ✅ Tests pass against live test database

---

**Hockney, Tester**  
March 28, 2026

// Playwright E2E for full auth flow
import { test, expect } from '@playwright/test';

// Note: The E2E tests assume a running dev server on localhost:3000 and a test DB.
// Email sending is mocked at the server layer in tests through dependency injection.

test.describe('E2E Auth Flow', () => {
  test.skip('Signup -> Verify -> Login -> Refresh -> Logout - requires test hooks for email verification', async ({ page }) => {
    // NOTE: This test requires:
    // 1. Test hooks endpoint (/test-hooks/last-verification) to retrieve verification token
    // 2. Email mocking infrastructure
    // 3. Test database cleanup between runs
    // 
    // Actual selectors should be:
    // - Signup: page.getByLabel('Email'), page.getByLabel('Password'), page.getByLabel('Company name')
    // - Submit: page.getByRole('button', { name: 'Create account' })
    // - Success message: page.locator('text=Check your email')
    // - Login: page.getByLabel('Email'), page.getByLabel('Password')
    // - Submit: page.getByRole('button', { name: 'Login' })
    // - Logout: page.getByRole('button', { name: 'Logout' })
  });
});

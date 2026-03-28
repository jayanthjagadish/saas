// Playwright E2E for full auth flow
import { test, expect } from '@playwright/test';

// Note: The E2E tests assume a running dev server on localhost:3000 and a test DB.
// Email sending is mocked at the server layer in tests through dependency injection.

test.describe('E2E Auth Flow', () => {
  test('Signup -> Verify -> Login -> Refresh -> Logout', async ({ page }) => {
    // Signup
    await page.goto('http://localhost:3000/signup');
    await page.fill('input[name="email"]', 'e2e+user@example.com');
    await page.fill('input[name="password"]', 'Str0ng!Pass');
    await page.fill('input[name="companyName"]', 'E2E Co');
    await page.click('button[type="submit"]');
    await expect(page.locator('.message')).toContainText('Verification email sent');

    // In test environment, server stores the verification token at /test-hooks/last-verification
    const tokenResp = await page.request.get('http://localhost:3000/test-hooks/last-verification');
    const body = await tokenResp.json();
    const token = body.token;

    // Verify
    await page.goto(`http://localhost:3000/verify?token=${token}`);
    await expect(page.locator('.message')).toContainText('Email verified');

    // Login
    await page.goto('http://localhost:3000/login');
    await page.fill('input[name="email"]', 'e2e+user@example.com');
    await page.fill('input[name="password"]', 'Str0ng!Pass');
    await page.click('button[type="submit"]');
    await expect(page.url()).toContain('/dashboard');

    // Trigger token refresh (simulate background refresh endpoint)
    const refreshResp = await page.request.post('http://localhost:3000/auth/refresh');
    expect(refreshResp.status()).toBe(200);

    // Logout
    await page.click('button#logout');
    await expect(page.url()).toContain('/login');

    // Ensure protected route blocked
    await page.goto('http://localhost:3000/dashboard');
    await expect(page.url()).toContain('/login');
  });
});

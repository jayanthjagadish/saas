/**
 * Auth Flow E2E Tests Template (Playwright)
 *
 * Focus: Full user journeys from login through subscription
 * Coverage: Frontend → API → Stripe → Database roundtrips
 */

import { test, expect } from '@playwright/test';

test.describe('Auth Flows - E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Signup Flow', () => {
    test('should complete signup with valid credentials', async ({ page }) => {
      // Navigate to signup
      await page.click('a[href="/signup"]');
      await expect(page).toHaveURL(/.*signup/);

      // Fill signup form
      await page.fill('input[name="email"]', 'newuser@example.com');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');

      // Submit
      await page.click('button[type="submit"]');

      // Should be logged in and redirected to dashboard
      await expect(page).toHaveURL(/.*dashboard/);
      await expect(page.locator('text=Welcome')).toBeVisible();
    });

    test('should reject weak passwords', async ({ page }) => {
      await page.click('a[href="/signup"]');
      await page.fill('input[name="email"]', 'newuser@example.com');
      await page.fill('input[name="password"]', '123'); // Too weak
      await page.fill('input[name="confirmPassword"]', '123');

      await page.click('button[type="submit"]');

      // Should show error
      await expect(page.locator('text=Password must be at least')).toBeVisible();
    });

    test('should reject mismatched passwords', async ({ page }) => {
      await page.click('a[href="/signup"]');
      await page.fill('input[name="email"]', 'newuser@example.com');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'DifferentPassword456!');

      await page.click('button[type="submit"]');

      await expect(page.locator('text=Passwords do not match')).toBeVisible();
    });

    test('should reject duplicate email', async ({ page }) => {
      // Assume user already exists
      await page.click('a[href="/signup"]');
      await page.fill('input[name="email"]', 'existing@example.com');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.fill('input[name="confirmPassword"]', 'SecurePassword123!');

      await page.click('button[type="submit"]');

      await expect(page.locator('text=Email already registered')).toBeVisible();
    });
  });

  test.describe('Login Flow', () => {
    test('should login with valid credentials', async ({ page }) => {
      await page.click('a[href="/login"]');
      await expect(page).toHaveURL(/.*login/);

      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'SecurePassword123!');

      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should reject invalid email', async ({ page }) => {
      await page.click('a[href="/login"]');
      await page.fill('input[name="email"]', 'nonexistent@example.com');
      await page.fill('input[name="password"]', 'anypassword');

      await page.click('button[type="submit"]');

      await expect(page.locator('text=Invalid email or password')).toBeVisible();
    });

    test('should reject wrong password', async ({ page }) => {
      await page.click('a[href="/login"]');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'WrongPassword');

      await page.click('button[type="submit"]');

      await expect(page.locator('text=Invalid email or password')).toBeVisible();
    });

    test('should lock account after 5 failed attempts', async ({ page }) => {
      await page.click('a[href="/login"]');

      // Attempt 5 times
      for (let i = 0; i < 5; i++) {
        await page.fill('input[name="email"]', 'test@example.com');
        await page.fill('input[name="password"]', 'WrongPassword');
        await page.click('button[type="submit"]');
        await page.waitForTimeout(500);
      }

      // Should be locked
      await expect(page.locator('text=Account locked for 15 minutes')).toBeVisible();
    });
  });

  test.describe('Token Refresh', () => {
    test('should automatically refresh access token', async ({ page }) => {
      // Login first
      await page.click('a[href="/login"]');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.click('button[type="submit"]');

      // Wait for access token to near expiry (mock time if needed)
      // Should automatically refresh in background
      await page.waitForTimeout(11 * 60 * 1000); // 11 minutes

      // Should still be logged in
      await expect(page).toHaveURL(/.*dashboard/);
      await expect(page.locator('text=Logged in')).toBeVisible();
    });

    test('should redirect to login if refresh fails', async ({ page, context }) => {
      // Simulate expired refresh token
      await context.addCookies([
        {
          name: 'refreshToken',
          value: 'invalid_token',
          url: 'http://localhost:3000',
          httpOnly: true,
        },
      ]);

      await page.goto('/dashboard');

      // Should redirect to login
      await expect(page).toHaveURL(/.*login/);
    });
  });

  test.describe('Logout Flow', () => {
    test('should logout and clear tokens', async ({ page, context }) => {
      // Login first
      await page.click('a[href="/login"]');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.click('button[type="submit"]');

      // Click logout
      await page.click('button:has-text("Logout")');

      // Should be on login page
      await expect(page).toHaveURL(/.*login/);

      // Tokens should be cleared
      const cookies = await context.cookies();
      const refreshToken = cookies.find((c) => c.name === 'refreshToken');
      expect(refreshToken).toBeUndefined();
    });
  });

  test.describe('Session Persistence', () => {
    test('should persist session on page reload', async ({ page }) => {
      // Login
      await page.click('a[href="/login"]');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.click('button[type="submit"]');

      // Reload
      await page.reload();

      // Should still be logged in
      await expect(page).toHaveURL(/.*dashboard/);
    });

    test('should persist session across different pages', async ({ page }) => {
      // Login
      await page.click('a[href="/login"]');
      await page.fill('input[name="email"]', 'test@example.com');
      await page.fill('input[name="password"]', 'SecurePassword123!');
      await page.click('button[type="submit"]');

      // Navigate to different pages
      await page.click('a[href="/billing"]');
      await expect(page).toHaveURL(/.*billing/);

      await page.click('a[href="/settings"]');
      await expect(page).toHaveURL(/.*settings/);

      // Should still be authenticated
    });
  });
});

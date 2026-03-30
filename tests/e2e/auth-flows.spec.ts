import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'test@fenster-test.com';
const TEST_PASSWORD = 'SecureTest123!@#';

async function loginAsTestUser(page: any) {
  await page.goto('/login');
  await page.getByLabel('Email').fill(TEST_EMAIL);
  await page.locator('#password').fill(TEST_PASSWORD);
  await page.getByRole('button', { name: 'Login' }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
}

test.describe('Auth Flows', () => {
  test.describe('Signup', () => {
    test('rejects password under 12 chars', async ({ page }) => {
      await page.goto('/signup');
      await page.getByLabel('Email').fill('test-short@example.com');
      await page.getByLabel('Password').fill('Short1!');
      await page.getByLabel('Company name').fill('Test Co');
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(page.locator('text=Password must be at least 12 characters')).toBeVisible();
    });

    test('rejects missing uppercase', async ({ page }) => {
      await page.goto('/signup');
      await page.getByLabel('Email').fill('test-noupper@example.com');
      await page.getByLabel('Password').fill('alllowercase123!');
      await page.getByLabel('Company name').fill('Test Co');
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(
        page.locator('text=/uppercase|must contain.*upper/i')
      ).toBeVisible();
    });

    test('rejects missing number', async ({ page }) => {
      await page.goto('/signup');
      await page.getByLabel('Email').fill('test-nonum@example.com');
      await page.getByLabel('Password').fill('NoNumberHere!!');
      await page.getByLabel('Company name').fill('Test Co');
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(
        page.locator('text=/number|must contain.*digit/i')
      ).toBeVisible();
    });

    test('rejects missing special char', async ({ page }) => {
      await page.goto('/signup');
      await page.getByLabel('Email').fill('test-nospecial@example.com');
      await page.getByLabel('Password').fill('NoSpecialChar123');
      await page.getByLabel('Company name').fill('Test Co');
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(
        page.locator('text=/special|must contain.*symbol/i')
      ).toBeVisible();
    });

    test('shows email verification message on success', async ({ page }) => {
      const uniqueEmail = `e2e-${Date.now()}@example.com`;
      await page.goto('/signup');
      await page.getByLabel('Email').fill(uniqueEmail);
      await page.getByLabel('Password').fill('ValidPass123!@#');
      await page.getByLabel('Company name').fill('E2E Test Co');
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(
        page.locator('text=/check your email|verify your|verification/i')
      ).toBeVisible({ timeout: 10000 });
    });

    test('shows error for duplicate email', async ({ page }) => {
      const dupEmail = `dup-${Date.now()}@example.com`;

      // First signup
      await page.goto('/signup');
      await page.getByLabel('Email').fill(dupEmail);
      await page.getByLabel('Password').fill('ValidPass123!@#');
      await page.getByLabel('Company name').fill('First Co');
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(
        page.locator('text=/check your email|verify your|verification/i')
      ).toBeVisible({ timeout: 10000 });

      // Second signup with same email
      await page.goto('/signup');
      await page.getByLabel('Email').fill(dupEmail);
      await page.getByLabel('Password').fill('ValidPass123!@#');
      await page.getByLabel('Company name').fill('Second Co');
      await page.getByRole('button', { name: 'Create account' }).click();
      await expect(
        page.locator('text=/already|exists|taken|registered/i')
      ).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Login', () => {
    test('rejects wrong password', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email').fill(TEST_EMAIL);
      await page.locator('#password').fill('WrongPassword999!');

      const responsePromise = page.waitForResponse(
        (r: any) => r.url().includes('/auth/login') && r.status() === 401
      );
      await page.getByRole('button', { name: 'Login' }).click();
      await responsePromise;

      await expect(page.getByText('Invalid email or password')).toBeVisible();
    });

    test('rejects non-existent email', async ({ page }) => {
      await page.goto('/login');
      await page.getByLabel('Email').fill(`ghost-${Date.now()}@example.com`);
      await page.locator('#password').fill('AnyPassword123!');

      const responsePromise = page.waitForResponse(
        (r: any) => r.url().includes('/auth/login') && r.status() === 401
      );
      await page.getByRole('button', { name: 'Login' }).click();
      await responsePromise;

      await expect(page.getByText('Invalid email or password')).toBeVisible();
    });

    test('succeeds with test user and redirects to dashboard', async ({ page }) => {
      await loginAsTestUser(page);
      await expect(page).toHaveURL(/\/dashboard/);
    });
  });

  test.describe('Logout', () => {
    test('logs out and redirects to login', async ({ page }) => {
      await loginAsTestUser(page);
      await expect(page).toHaveURL(/\/dashboard/);

      // Find and click logout — try nav button or link
      const logoutBtn = page.getByRole('button', { name: /logout|sign out/i });
      const logoutLink = page.getByRole('link', { name: /logout|sign out/i });

      if (await logoutBtn.isVisible()) {
        await logoutBtn.click();
      } else {
        await logoutLink.click();
      }

      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });
  });
});

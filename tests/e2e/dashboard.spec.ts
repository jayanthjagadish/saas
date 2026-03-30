import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/auth/login');
    await page.fill('[name="email"], input[type="email"]', 'test@fenster-test.com');
    await page.fill('[name="password"], input[type="password"]', 'SecureTest123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('should display dashboard heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('should display quick action buttons', async ({ page }) => {
    await expect(page.getByRole('button', { name: /upgrade plan/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /manage billing/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /invite member/i })).toBeVisible();
  });

  test('Manage Billing navigates to /subscription', async ({ page }) => {
    await page.getByRole('button', { name: /manage billing/i }).click();
    await expect(page).toHaveURL(/\/subscription/);
  });

  test('Upgrade Plan navigates to /pricing when not disabled', async ({ page }) => {
    const btn = page.getByRole('button', { name: /upgrade plan/i });
    if (await btn.isDisabled()) {
      test.skip();
      return;
    }
    await btn.click();
    await expect(page).toHaveURL(/\/pricing/);
  });

  test('should display account section', async ({ page }) => {
    await expect(page.getByText(/test@fenster-test\.com/)).toBeVisible();
  });
});

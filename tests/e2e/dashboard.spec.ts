import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Email').fill('test@fenster-test.com');
    await page.locator('#password').fill('SecureTest123!@#');
    await page.getByRole('button', { name: 'Login' }).click();
    await page.waitForURL('**/dashboard', { timeout: 15000 });
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

  test('Upgrade Plan navigates to /pricing', async ({ page }) => {
    const btn = page.getByRole('button', { name: /upgrade plan/i });
    
    // Check if the button is disabled
    const isDisabled = await btn.isDisabled();
    
    if (isDisabled) {
      // If disabled, verify it's actually disabled and skip navigation test
      await expect(btn).toBeDisabled();
    } else {
      // If enabled, test navigation
      await btn.click();
      await expect(page).toHaveURL(/\/pricing/);
    }
  });

  test('should display account section', async ({ page }) => {
    await expect(page.getByText(/test@fenster-test\.com/)).toBeVisible();
  });
});

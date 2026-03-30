import { test, expect } from '@playwright/test';

test.describe('Analytics Page', () => {
  test('should redirect unauthenticated users to /login', async ({ page }) => {
    await page.goto('/analytics');
    await expect(page).toHaveURL(/\/login/, { timeout: 5000 });
  });

  test.describe('when authenticated', () => {
    test.beforeEach(async ({ page }) => {
      await page.goto('/login');
      await page.fill('[name="email"]', 'test@fenster-test.com');
      await page.fill('[name="password"]', 'SecureTest123!@#');
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      await page.goto('/analytics');
    });

    test('should load with stats cards visible', async ({ page }) => {
      await expect(page.getByRole('heading', { name: 'Usage Analytics' })).toBeVisible({ timeout: 10000 });
      // Wait for real stats to replace loading skeletons
      await expect(page.getByText('seats used')).toBeVisible({ timeout: 15000 });
      await expect(page.getByText('Member Usage')).toBeVisible();
      await expect(page.getByText('Plan')).toBeVisible();
    });

    test('should display member growth chart section', async ({ page }) => {
      await expect(
        page.getByRole('heading', { name: 'Member Growth (Last 6 Months)' })
      ).toBeVisible({ timeout: 10000 });
    });

    test('should show valid memberCount >= 0', async ({ page }) => {
      // Wait for stats to finish loading
      await expect(page.getByText('seats used')).toBeVisible({ timeout: 15000 });
      // Member Usage card renders value as "memberCount / memberLimit"
      const memberUsageCard = page.locator('div.bg-white', {
        has: page.getByText('Member Usage'),
      });
      const valueText = await memberUsageCard.locator('p.text-3xl').textContent();
      const memberCount = parseInt(valueText?.split('/')[0].trim() ?? '-1', 10);
      expect(memberCount).toBeGreaterThanOrEqual(0);
    });
  });
});

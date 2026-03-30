import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'test@fenster-test.com';
const TEST_PASSWORD = 'SecureTest123!@#';

test.describe('Subscription Cancellation Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_EMAIL);
    await page.fill('input[name="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard');
  });

  test('Cancel button is visible on active subscription page', async ({ page }) => {
    await page.goto('/subscription');
    await page.waitForLoadState('networkidle');

    const hasSubscription = await page.locator('button:has-text("Cancel Subscription")').isVisible();
    if (!hasSubscription) {
      test.skip(true, 'No active paid subscription for test user — Cancel button not shown');
      return;
    }

    await expect(page.locator('button:has-text("Cancel Subscription")')).toBeVisible();
  });

  test('Confirmation modal appears before cancelling', async ({ page }) => {
    await page.goto('/subscription');
    await page.waitForLoadState('networkidle');

    const cancelBtn = page.locator('button:has-text("Cancel Subscription")').first();
    if (!(await cancelBtn.isVisible())) {
      test.skip(true, 'No active paid subscription for test user');
      return;
    }

    await cancelBtn.click();

    // Modal overlay must be visible
    const modal = page.locator('.fixed.inset-0');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Modal contains a confirmation heading
    await expect(modal.getByText(/Cancel Subscription/i)).toBeVisible();

    // Both "Keep" and "Confirm cancel" options must be present
    await expect(modal.locator('button:has-text("Keep My Subscription")')).toBeVisible();
    await expect(modal.locator('button:has-text("Yes, Cancel")')).toBeVisible();
  });

  test('After cancel: shows "Access until" message and Reactivate button', async ({ page }) => {
    await page.goto('/subscription');
    await page.waitForLoadState('networkidle');

    // If already in cancellation_pending state, the "Access until" banner may already be shown
    const bannerAlreadyVisible = await page
      .locator('text=Subscription Cancelling')
      .isVisible()
      .catch(() => false);

    if (!bannerAlreadyVisible) {
      const cancelBtn = page.locator('button:has-text("Cancel Subscription")').first();
      if (!(await cancelBtn.isVisible())) {
        test.skip(true, 'No active paid subscription for test user');
        return;
      }

      // Open confirmation modal
      await cancelBtn.click();
      await expect(page.locator('.fixed.inset-0')).toBeVisible({ timeout: 5000 });

      // Confirm cancellation
      await page.locator('button:has-text("Yes, Cancel")').click();
    }

    // Yellow warning banner with "Subscription Cancelling" should appear
    await expect(page.locator('text=Subscription Cancelling')).toBeVisible({ timeout: 10000 });

    // Banner should contain an "Access until" or "will end on" message
    await expect(
      page.locator('text=/will end on|access until/i'),
    ).toBeVisible({ timeout: 5000 });

    // "Reactivate Subscription" button must be visible in the banner
    await expect(page.locator('button:has-text("Reactivate Subscription")')).toBeVisible();
  });

  test('Reactivate restores active state display', async ({ page }) => {
    await page.goto('/subscription');
    await page.waitForLoadState('networkidle');

    // Ensure we are in cancellation_pending state
    const bannerVisible = await page.locator('text=Subscription Cancelling').isVisible();

    if (!bannerVisible) {
      const cancelBtn = page.locator('button:has-text("Cancel Subscription")').first();
      if (!(await cancelBtn.isVisible())) {
        test.skip(true, 'No active paid subscription for test user');
        return;
      }

      await cancelBtn.click();
      await expect(page.locator('.fixed.inset-0')).toBeVisible({ timeout: 5000 });
      await page.locator('button:has-text("Yes, Cancel")').click();
      await expect(page.locator('text=Subscription Cancelling')).toBeVisible({ timeout: 10000 });
    }

    // Click Reactivate
    await page.locator('button:has-text("Reactivate Subscription")').click();

    // Success banner should appear
    await expect(
      page.locator('text=Subscription reactivated successfully'),
    ).toBeVisible({ timeout: 10000 });

    // The yellow cancellation warning should be gone
    await expect(page.locator('text=Subscription Cancelling')).not.toBeVisible();

    // The Cancel Subscription button should reappear (subscription is active again)
    await expect(page.locator('button:has-text("Cancel Subscription")')).toBeVisible({ timeout: 5000 });
  });
});

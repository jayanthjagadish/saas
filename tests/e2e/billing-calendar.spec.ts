import { test, expect } from '@playwright/test';

test.describe('Billing Calendar (unauthenticated)', () => {
  test('redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/billing');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

test.describe('Billing Calendar (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"], input[type="email"]', 'test@fenster-test.com');
    await page.fill('[name="password"], input[type="password"]', 'SecureTest123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('billing page shows "Upcoming Billing" section heading', async ({ page }) => {
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');

    const heading = page.getByRole('heading', { name: /upcoming billing/i })
      .or(page.getByText(/upcoming billing/i).first());

    await expect(heading).toBeVisible({ timeout: 8000 });
  });

  test('billing page shows "Next billing" date text', async ({ page }) => {
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');

    const nextBillingText = page.getByText(/next billing/i).first();
    await expect(nextBillingText).toBeVisible({ timeout: 8000 });
  });

  test('shows at least one billing event or the empty state message', async ({ page }) => {
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');

    const hasEvent = await page
      .locator('[data-testid^="billing-event"], [data-testid="calendar-event"], .billing-event, .calendar-event')
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    const hasEmptyState = await page
      .getByText(/no upcoming billing events/i)
      .isVisible({ timeout: 5000 })
      .catch(() => false);

    expect(hasEvent || hasEmptyState).toBe(true);
  });
});

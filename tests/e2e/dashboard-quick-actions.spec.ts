import { test, expect } from '@playwright/test';

test.describe('Dashboard Quick Actions — unauthenticated', () => {
  test('/dashboard redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

test.describe('Dashboard Quick Actions — authenticated', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"], input[type="email"]', 'test@fenster-test.com');
    await page.fill('[name="password"], input[type="password"]', 'SecureTest123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('dashboard shows "Quick Actions" heading after login', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const hasHeading = await page.getByRole('heading', { name: /quick actions/i })
      .isVisible({ timeout: 5000 }).catch(() => false);
    // Also accept plain text label (e.g., rendered as a div with class heading)
    const hasText = await page.getByText(/quick actions/i)
      .isVisible({ timeout: 3000 }).catch(() => false);
    expect(hasHeading || hasText).toBe(true);
  });

  test('"Invite Team Member" link or button is present on dashboard', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const byRole = await page.getByRole('button', { name: /invite\s*(team\s*)?member/i })
      .isVisible({ timeout: 5000 }).catch(() => false);
    const byLink = await page.getByRole('link', { name: /invite\s*(team\s*)?member/i })
      .isVisible({ timeout: 3000 }).catch(() => false);
    const byText = await page.getByText(/invite\s*(team\s*)?member/i)
      .isVisible({ timeout: 3000 }).catch(() => false);
    if (!byRole && !byLink && !byText) {
      console.warn('[SKIP] "Invite Team Member" element not found on dashboard — UI may use different label');
    }
    expect(byRole || byLink || byText).toBe(true);
  });

  test('"Manage Subscription" link or button is present on dashboard', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const byRole = await page.getByRole('button', { name: /manage\s*subscription/i })
      .isVisible({ timeout: 5000 }).catch(() => false);
    const byLink = await page.getByRole('link', { name: /manage\s*subscription/i })
      .isVisible({ timeout: 3000 }).catch(() => false);
    // Accept broader billing-related labels (e.g. "Manage Billing")
    const byBilling = await page.getByRole('button', { name: /manage\s*billing/i })
      .isVisible({ timeout: 3000 }).catch(() => false);
    const byBillingLink = await page.getByRole('link', { name: /manage\s*billing/i })
      .isVisible({ timeout: 3000 }).catch(() => false);
    if (!byRole && !byLink && !byBilling && !byBillingLink) {
      console.warn('[SKIP] "Manage Subscription" element not found on dashboard — UI may use different label');
    }
    expect(byRole || byLink || byBilling || byBillingLink).toBe(true);
  });

  test('"View Analytics" link or button is present on dashboard', async ({ page }) => {
    await page.waitForLoadState('networkidle');
    const byRole = await page.getByRole('button', { name: /view\s*analytics/i })
      .isVisible({ timeout: 5000 }).catch(() => false);
    const byLink = await page.getByRole('link', { name: /view\s*analytics/i })
      .isVisible({ timeout: 3000 }).catch(() => false);
    const byText = await page.getByText(/view\s*analytics/i)
      .isVisible({ timeout: 3000 }).catch(() => false);
    if (!byRole && !byLink && !byText) {
      console.warn('[SKIP] "View Analytics" element not found on dashboard — UI may use different label');
    }
    expect(byRole || byLink || byText).toBe(true);
  });
});

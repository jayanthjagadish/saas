import { test, expect } from '@playwright/test';

test.describe('Billing Page (unauthenticated)', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/billing');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

test.describe('Billing Page (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"], input[type="email"]', 'test@fenster-test.com');
    await page.fill('[name="password"], input[type="password"]', 'SecureTest123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('billing page loads and shows invoice table or empty state', async ({ page }) => {
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');

    // Either an invoice table/list or an empty-state message must be visible
    const hasTable = await page.locator('table, [data-testid="invoice-table"], [data-testid="invoice-list"]').isVisible({ timeout: 5000 }).catch(() => false);
    const hasEmptyState = await page.getByText(/no invoices|no billing history|no records|empty/i).isVisible({ timeout: 5000 }).catch(() => false);

    expect(hasTable || hasEmptyState).toBe(true);
  });

  test('download button is present on paid invoices', async ({ page }) => {
    await page.goto('/billing');
    await page.waitForLoadState('networkidle');

    const invoiceRows = page.locator('tr, [data-testid^="invoice-row"]');
    const count = await invoiceRows.count();

    if (count === 0) {
      // Free plan — no invoices to check download on; test passes
      return;
    }

    // At least one row with a download button/link should exist for paid invoices
    const downloadBtn = page.getByRole('link', { name: /download/i })
      .or(page.getByRole('button', { name: /download/i }))
      .or(page.locator('[data-testid="download-invoice"]'))
      .first();

    await expect(downloadBtn).toBeVisible({ timeout: 5000 });
  });
});

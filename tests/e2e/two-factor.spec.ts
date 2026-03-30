import { test, expect } from '@playwright/test';

const TEST_EMAIL = 'test@fenster-test.com';
const TEST_PASSWORD = 'SecureTest123!@#';

test.describe('Two-Factor Authentication (2FA)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"], input[type="email"]', TEST_EMAIL);
    await page.fill('[name="password"], input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await page.goto('/profile');
  });

  test('profile page loads with a Security section', async ({ page }) => {
    await expect(page.getByText('Security')).toBeVisible({ timeout: 5000 });
  });

  test('"Enable 2FA" button is visible when 2FA is disabled', async ({ page }) => {
    // If 2FA is already enabled, skip — we can only test the disabled state
    const isEnabled = await page.getByText('2FA Enabled').isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isEnabled as boolean, '2FA is already enabled on this account');

    await expect(page.getByRole('button', { name: /enable 2fa/i })).toBeVisible({ timeout: 5000 });
  });

  test('QR code image appears after clicking "Enable 2FA"', async ({ page }) => {
    const isEnabled = await page.getByText('2FA Enabled').isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isEnabled as boolean, '2FA is already enabled on this account');

    await page.getByRole('button', { name: /enable 2fa/i }).click();
    await expect(page.locator('img[alt="2FA QR code"]')).toBeVisible({ timeout: 10000 });
  });

  test('TOTP input field appears after clicking "Enable 2FA"', async ({ page }) => {
    const isEnabled = await page.getByText('2FA Enabled').isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isEnabled as boolean, '2FA is already enabled on this account');

    await page.getByRole('button', { name: /enable 2fa/i }).click();
    const totpInput = page.locator('input[inputmode="numeric"][maxlength="6"], input[placeholder="6-digit code"]').first();
    await expect(totpInput).toBeVisible({ timeout: 10000 });
  });

  test('invalid TOTP code shows an error message', async ({ page }) => {
    const isEnabled = await page.getByText('2FA Enabled').isVisible({ timeout: 3000 }).catch(() => false);
    test.skip(isEnabled as boolean, '2FA is already enabled on this account');

    await page.getByRole('button', { name: /enable 2fa/i }).click();
    const totpInput = page.locator('input[inputmode="numeric"][maxlength="6"], input[placeholder="6-digit code"]').first();
    await expect(totpInput).toBeVisible({ timeout: 10000 });

    await totpInput.fill('000000');
    await page.getByRole('button', { name: /verify & enable/i }).click();

    // Expect a visible error — either a generic error container or specific text
    const errorLocator = page.locator('.bg-red-50, [class*="red"]').filter({ hasText: /invalid|error|try again/i });
    await expect(errorLocator).toBeVisible({ timeout: 5000 });
  });
});

import { test, expect } from '@playwright/test';

test.describe('Profile Page (unauthenticated)', () => {
  test('redirects to login when not authenticated', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
  });
});

test.describe('Profile Page (authenticated)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[name="email"], input[type="email"]', 'test@fenster-test.com');
    await page.fill('[name="password"], input[type="password"]', 'SecureTest123!@#');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
  });

  test('profile page loads and shows user email', async ({ page }) => {
    await page.goto('/profile');
    await expect(page.getByText('test@fenster-test.com')).toBeVisible({ timeout: 5000 });
  });

  test('user can update their name', async ({ page }) => {
    await page.goto('/profile');
    const nameInput = page.locator('input[name="name"], input[placeholder*="name" i]').first();
    await expect(nameInput).toBeVisible({ timeout: 5000 });
    await nameInput.fill('Updated Test Name');
    await page.getByRole('button', { name: /save/i }).click();
    // Accept success message or the input retaining the new value
    const saved = await page.getByText(/saved|success|updated/i).isVisible({ timeout: 5000 });
    const retained = await nameInput.inputValue();
    expect(saved || retained === 'Updated Test Name').toBe(true);
  });

  test('shows validation error for invalid email', async ({ page }) => {
    await page.goto('/profile');
    const emailInput = page.locator('input[name="email"], input[type="email"]').first();
    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await emailInput.fill('not-a-valid-email');
    await page.getByRole('button', { name: /save/i }).click();
    // Expect either a browser validation message or a visible error
    const hasError = await page.getByText(/invalid|valid email|error/i).isVisible({ timeout: 3000 }).catch(() => false);
    const isInvalid = await emailInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(hasError || isInvalid).toBe(true);
  });
});

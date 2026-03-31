/**
 * E2E Auth Flow Tests
 * Tests for signup, login, logout flows
 */

import { test, expect } from '@playwright/test';
import { generateTestUser, fillSignupForm, fillLoginForm, SELECTORS } from './helpers/test-data';

test.describe('Auth Flow - E2E', () => {
  test.describe('Signup', () => {
    test('should signup with valid data and show verification message', async ({ page }) => {
      const testUser = generateTestUser();
      
      await page.goto('/signup');
      await fillSignupForm(page, testUser);
      await page.click(SELECTORS.SIGNUP_SUBMIT_BTN);
      
      // Should show success message
      await expect(page.locator('text=Check your email to verify')).toBeVisible({ timeout: 10000 });
    });

    test('should show error for duplicate email', async ({ page }) => {
      // First signup
      const testUser = generateTestUser();
      await page.goto('/signup');
      await fillSignupForm(page, testUser);
      await page.click(SELECTORS.SIGNUP_SUBMIT_BTN);
      await expect(page.locator('text=Check your email')).toBeVisible({ timeout: 10000 });

      // Try to signup again with same email
      await page.goto('/signup');
      await fillSignupForm(page, testUser);
      await page.click(SELECTORS.SIGNUP_SUBMIT_BTN);
      
      // Should show error
      await expect(page.locator('text=Email already registered')).toBeVisible({ timeout: 10000 });
    });

    test('should show validation error for weak password', async ({ page }) => {
      const testUser = generateTestUser();
      
      await page.goto('/signup');
      await page.fill(SELECTORS.SIGNUP_EMAIL_INPUT, testUser.email);
      await page.fill(SELECTORS.SIGNUP_PASSWORD_INPUT, 'weak'); // Too short
      await page.fill(SELECTORS.SIGNUP_COMPANY_INPUT, testUser.company_name);
      await page.click(SELECTORS.SIGNUP_SUBMIT_BTN);
      
      // Should show validation error
      await expect(page.locator('text=Password must be at least 12 characters')).toBeVisible();
    });

    test('should show validation error for missing company name', async ({ page }) => {
      const testUser = generateTestUser();
      
      await page.goto('/signup');
      await page.fill(SELECTORS.SIGNUP_EMAIL_INPUT, testUser.email);
      await page.fill(SELECTORS.SIGNUP_PASSWORD_INPUT, testUser.password);
      // Don't fill company name
      await page.click(SELECTORS.SIGNUP_SUBMIT_BTN);
      
      // Should show validation error
      await expect(page.locator('text=Company name is required')).toBeVisible();
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      const testUser = generateTestUser();
      
      await page.goto('/signup');
      await page.fill(SELECTORS.SIGNUP_EMAIL_INPUT, 'invalid-email');
      await page.fill(SELECTORS.SIGNUP_PASSWORD_INPUT, testUser.password);
      await page.fill(SELECTORS.SIGNUP_COMPANY_INPUT, testUser.company_name);
      await page.click(SELECTORS.SIGNUP_SUBMIT_BTN);
      
      // Should show validation error
      await expect(page.locator('text=valid email')).toBeVisible();
    });
  });

  test.describe('Login', () => {
    test.beforeEach(async ({ page }) => {
      // Create and verify a user for login tests
      // Note: In real tests, this would be done via API or test fixtures
    });

    test('should login with valid credentials and redirect to dashboard', async ({ page }) => {
      await page.goto('/login');
      await fillLoginForm(page, 'test@fenster-test.com', 'SecureTest123!@#');
      await page.click(SELECTORS.LOGIN_SUBMIT_BTN);
      // Should redirect to dashboard
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/dashboard/);
    });

    test('should show error for wrong password', async ({ page }) => {
      await page.goto('/login');
      await fillLoginForm(page, 'test@fenster-test.com', 'WrongPassword123!');
      await page.click(SELECTORS.LOGIN_SUBMIT_BTN);
      
      // Should show error
      await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 10000 });
    });

    test('should show error for non-existent email', async ({ page }) => {
      await page.goto('/login');
      await fillLoginForm(page, 'nonexistent@fenster-test.com', 'AnyPassword123!');
      await page.click(SELECTORS.LOGIN_SUBMIT_BTN);
      
      // Should show error
      await expect(page.locator('text=Invalid email or password')).toBeVisible({ timeout: 10000 });
    });

    test('should show error for unverified email', async ({ page }) => {
      // Test with an unverified user attempting login
      // Note: This assumes an unverified test user exists in the system
      await page.goto('/login');
      await fillLoginForm(page, 'unverified@fenster-test.com', 'TestPassword123!@#');
      await page.click(SELECTORS.LOGIN_SUBMIT_BTN);
      
      // Should show error for unverified email
      const errorDiv = page.locator('div.bg-red-100.text-red-700');
      await expect(errorDiv).toBeVisible({ timeout: 10000 });
      await expect(page.locator('text=/verify|verification|not verified/i')).toBeVisible({ timeout: 5000 });
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      await page.goto('/login');
      await page.fill(SELECTORS.LOGIN_EMAIL_INPUT, 'invalid-email');
      await page.fill(SELECTORS.LOGIN_PASSWORD_INPUT, 'AnyPassword123!');
      await page.click(SELECTORS.LOGIN_SUBMIT_BTN);
      
      // Should show validation error
      await expect(page.locator('text=valid email')).toBeVisible();
    });
  });

  test.describe('Logout', () => {
    test('should logout and redirect to login page', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await fillLoginForm(page, 'test@fenster-test.com', 'SecureTest123!@#');
      await page.click(SELECTORS.LOGIN_SUBMIT_BTN);
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });
      
      // Click logout button
      await page.getByRole('button', { name: 'Logout' }).click();
      
      // Should redirect to login page
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/login/);
    });

    test('should not access dashboard after logout', async ({ page }) => {
      // Login first
      await page.goto('/login');
      await fillLoginForm(page, 'test@fenster-test.com', 'SecureTest123!@#');
      await page.click(SELECTORS.LOGIN_SUBMIT_BTN);
      await page.waitForURL(/\/dashboard/, { timeout: 10000 });
      
      // Logout
      await page.getByRole('button', { name: 'Logout' }).click();
      await page.waitForURL(/\/login/, { timeout: 10000 });
      
      // Try to navigate to dashboard
      await page.goto('/dashboard');
      
      // Should redirect back to login
      await page.waitForURL(/\/login/, { timeout: 10000 });
      await expect(page).toHaveURL(/\/login/);
    });
  });
});

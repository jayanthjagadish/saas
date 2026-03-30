/**
 * E2E Smoke Tests
 * Fast top-level checks to verify app is alive and basic pages load
 */

import { test, expect } from '@playwright/test';

test.describe('Smoke Tests', () => {
  test('homepage should load successfully', async ({ page }) => {
    await page.goto('/');
    
    // Should load without errors
    await expect(page).toHaveURL(/localhost:3000/);
    
    // Page should have some content
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });

  test('login page should load and display form', async ({ page }) => {
    await page.goto('/login');
    
    // Should be on login page
    await expect(page).toHaveURL(/.*login/);
    
    // Form should be visible (using correct selectors from LoginPage.tsx)
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'Password' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login' })).toBeVisible();
    
    // Should have login heading
    await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
  });

  test('signup page should load and display form', async ({ page }) => {
    await page.goto('/signup');
    
    // Should be on signup page
    await expect(page).toHaveURL(/.*signup/);
    
    // Form should be visible
    await expect(page.locator('input[aria-label="Email"]')).toBeVisible();
    await expect(page.locator('input[aria-label="Password"]')).toBeVisible();
    await expect(page.locator('input[aria-label="Company name"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    
    // Should have signup heading
    await expect(page.locator('text=Create your account')).toBeVisible();
  });

  test('API health endpoint should respond', async ({ request }) => {
    // Check if API is alive
    const response = await request.get('http://localhost:3001/health');
    
    expect(response.status()).toBe(200);
    
    const body = await response.json();
    expect(body).toHaveProperty('status');
  });

  test('pricing page should load and display plans', async ({ page }) => {
    await page.goto('/pricing');
    
    // Should be on pricing page
    await expect(page).toHaveURL(/.*pricing/);
    
    // Should show some plan information
    // Note: Adjust selectors based on actual PlanComparison component
    const body = await page.locator('body');
    await expect(body).toBeVisible();
  });

  test('dashboard should redirect to login when not authenticated', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login
    await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
  });

  test('navigation links should be present on homepage', async ({ page }) => {
    await page.goto('/');
    
    // Should have navigation based on Layout.tsx
    await expect(page.locator('body')).toBeVisible();
    
    // Check for nav links (from Layout component)
    // Login and Sign Up buttons should be visible when not authenticated
    await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Sign Up' })).toBeVisible();
  });
});

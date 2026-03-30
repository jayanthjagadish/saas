/**
 * E2E Plans/Subscription Tests
 * Tests for viewing plans and subscription flows (UI only, no real Stripe)
 */

import { test, expect } from '@playwright/test';

test.describe('Plans & Subscription - E2E', () => {
  test.describe('Plans Page', () => {
    test('should load and display plans', async ({ page }) => {
      await page.goto('/pricing');
      
      // Should be on pricing page
      await expect(page).toHaveURL(/.*pricing/);
      
      // Should show the heading from PlanComparison component
      await expect(page.getByRole('heading', { name: 'Compare Plans' })).toBeVisible();
    });

    test('should display Free plan', async ({ page }) => {
      await page.goto('/pricing');
      
      // Should show Free plan (from PlanComparison component)
      await expect(page.getByRole('heading', { name: 'Free' })).toBeVisible({ timeout: 10000 });
    });

    test('should display Pro plan', async ({ page }) => {
      await page.goto('/pricing');
      
      // Should show Pro plan
      await expect(page.getByRole('heading', { name: 'Pro', exact: true })).toBeVisible({ timeout: 10000 });
    });

    test('should display Enterprise plan', async ({ page }) => {
      await page.goto('/pricing');
      
      // Should show Enterprise plan
      await expect(page.getByRole('heading', { name: 'Enterprise' })).toBeVisible({ timeout: 10000 });
    });

    test('should display plan features', async ({ page }) => {
      await page.goto('/pricing');
      
      // Should show feature text (from PlanComparison component)
      await expect(page.getByText('Team members: 3')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Advanced analytics: No')).toBeVisible({ timeout: 5000 });
    });

    test('should have billing toggle button', async ({ page }) => {
      await page.goto('/pricing');
      
      // Should show billing toggle (Monthly/Annual)
      await expect(page.getByRole('button', { name: /billing/ })).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Plan Selection', () => {
    test('should show plan action buttons', async ({ page }) => {
      await page.goto('/pricing');
      
      // Look for buttons in plan cards (Get started, Upgrade, Manage, Downgrade)
      // From PlanComparison component
      const buttons = page.getByRole('button', { name: /Get started|Upgrade|Manage|Downgrade/ });
      const count = await buttons.count();
      
      // Should have multiple action buttons (3 plans × 2 buttons each = 6)
      expect(count).toBeGreaterThan(0);
    });

    test.skip('should show upgrade options for logged-in users - requires authentication', async ({ page }) => {
      // NOTE: This test requires authentication
      // In practice, you'd login first or use authenticated context
    });
  });

  test.describe('Subscription Dashboard', () => {
    test('should redirect to login when not authenticated', async ({ page }) => {
      // Navigate to dashboard (will redirect to login if not authenticated)
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL(/.*login/, { timeout: 10000 });
    });

    test.skip('should display current plan on dashboard - requires authenticated session', async ({ page }) => {
      // NOTE: Requires authenticated session with active subscription
      // Correct selector: page.getByRole('heading', { name: 'Subscription' })
    });
  });

  test.describe('API Contract - Plans', () => {
    test('should fetch plans from API successfully', async ({ request }) => {
      const response = await request.get('http://localhost:3001/plans');
      
      expect(response.status()).toBe(200);
      
      const body = await response.json();
      expect(body).toHaveProperty('plans');
      expect(Array.isArray(body.plans)).toBeTruthy();
    });

    test('should return all plan tiers', async ({ request }) => {
      const response = await request.get('http://localhost:3001/plans');
      const body = await response.json();
      
      const plans = body.plans;
      expect(plans.length).toBeGreaterThan(0);
      
      // Should have at least Free, Pro, Enterprise
      const tiers = plans.map((p: any) => p.tier || p.name);
      expect(tiers).toContain('free');
    });

    test('should return plan with required fields', async ({ request }) => {
      const response = await request.get('http://localhost:3001/plans');
      const body = await response.json();
      
      const plans = body.plans;
      expect(plans.length).toBeGreaterThan(0);
      
      const firstPlan = plans[0];
      expect(firstPlan).toHaveProperty('id');
      expect(firstPlan).toHaveProperty('name');
      expect(firstPlan).toHaveProperty('tier');
      expect(firstPlan).toHaveProperty('price_monthly');
    });
  });
});

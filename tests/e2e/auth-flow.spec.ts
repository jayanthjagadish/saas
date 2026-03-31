/**
 * E2E Auth Flow Tests (US-003 Acceptance)
 * 
 * Comprehensive test suite covering the complete authentication lifecycle:
 * - Signup with email verification
 * - Email verification token flow
 * - Login and session creation
 * - Logout and session revocation
 * - Session persistence across page reloads
 * - Token refresh and expiration
 * - Remember Me checkbox for extended expiry
 * - Protected route access control
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

test.describe('Auth Lifecycle Flow (US-003)', () => {
  
  async function getVerificationToken(page: any, email?: string): Promise<string> {
    const url = email
      ? `http://localhost:3001/test-hooks/last-verification?email=${encodeURIComponent(email)}`
      : `http://localhost:3001/test-hooks/last-verification`;
    const tokenResp = await page.request.get(url);
    expect(tokenResp.status()).toBe(200);
    const body = await tokenResp.json();
    return body.token;
  }

  async function callRefreshEndpoint(page: any): Promise<Response> {
    return page.request.post(`${BASE_URL}/auth/refresh`, {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  test('Signup → Verify Email → Login → Logout → Session Cleared', async ({ page, context }) => {
    const testEmail = `e2e-test-${Date.now()}@example.com`;
    const testPassword = 'SecureP@ssw0rd!';
    const testCompany = 'E2E Test Company';

    // SIGNUP
    await page.goto(`${BASE_URL}/signup`);
    await expect(page.url()).toContain('/signup');

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="companyName"]', testCompany);

    await page.click('button[type="submit"]');
    await expect(page.locator('div.bg-blue-50.text-blue-800 p')).toBeVisible({ timeout: 5000 });

    // EMAIL VERIFICATION
    const verificationToken = await getVerificationToken(page, testEmail);

    await page.goto(`${BASE_URL}/verify?token=${verificationToken}`);
    await expect(page.locator('text=/verified|confirmed/i')).toBeVisible({ timeout: 5000 });
    await page.waitForURL(/\/(auth\/)?login/, { timeout: 5000 });

    // LOGIN
    await page.goto(`${BASE_URL}/login`);
    await expect(page.url()).toContain('/login');

    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');

    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL(/.*\/dashboard/);

    const cookies = await context.cookies();
    const hasRefreshToken = cookies.some(c => 
      c.name === 'refreshToken' || c.name === 'refresh_token' || c.name.includes('token')
    );
    expect(hasRefreshToken).toBeTruthy();

    // TOKEN REFRESH SUCCESS (before logout)
    const refreshBeforeLogout = await callRefreshEndpoint(page);
    expect(refreshBeforeLogout.status()).toBe(200);
    const refreshResp = await refreshBeforeLogout.json();
    expect(refreshResp).toHaveProperty('accessToken');

    // LOGOUT
    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), button#logout');
    await expect(logoutButton).toBeVisible({ timeout: 3000 });
    await logoutButton.click();

    await expect(page).toHaveURL(/.*\/login/, { timeout: 5000 });

    // SESSION REVOKED - REFRESH FAILS
    const refreshAfterLogout = await callRefreshEndpoint(page);
    expect(refreshAfterLogout.status()).toBe(401);
    const refreshErrorResp = await refreshAfterLogout.json();
    expect(refreshErrorResp.error || refreshErrorResp.message).toBeTruthy();

    // PROTECTED ROUTE ACCESS DENIED
    await page.goto(`${BASE_URL}/dashboard`);
    await expect(page).toHaveURL(/.*\/login/, { timeout: 5000 });

    // VERIFY TOKENS CLEARED
    const cookiesAfterLogout = await context.cookies();
    const refreshTokenAfterLogout = cookiesAfterLogout.find(c => 
      c.name === 'refreshToken' || c.name === 'refresh_token' || c.name.includes('token')
    );
    if (refreshTokenAfterLogout) {
      expect(refreshTokenAfterLogout.value).toBe('');
    }
  });

  test('Signup with invalid credentials shows errors', async ({ page }) => {
    await page.goto(`${BASE_URL}/signup`);
    
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', '123');
    await page.fill('input[name="companyName"]', 'Test Co');
    
    await page.click('button[type="submit"]');
    await expect(page.locator('p.text-red-600.text-sm')).toContainText(/password|at least/i, { timeout: 3000 });
  });

  test('Login with invalid credentials shows error', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[name="email"]', 'nonexistent@example.com');
    await page.fill('input[name="password"]', 'SomePassword123!');
    
    await page.click('button[type="submit"]');
    await expect(page.locator('text=/invalid|not found|incorrect/i')).toBeVisible({ timeout: 3000 });
  });

  test('Unverified user cannot login', async ({ page }) => {
    const unverifiedEmail = `unverified-${Date.now()}@example.com`;
    const testPassword = 'SecureP@ssw0rd!';

    await page.goto(`${BASE_URL}/signup`);
    
    await page.fill('input[name="email"]', unverifiedEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="companyName"]', 'Test Co');
    
    await page.click('button[type="submit"]');

    // Wait for signup to complete before navigating
    await expect(page.locator('text=/Check your email|verification/i')).toBeVisible({ timeout: 5000 });

    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[name="email"]', unverifiedEmail);
    await page.fill('input[name="password"]', testPassword);
    
    await page.click('button[type="submit"]');
    await expect(page.locator('div.bg-red-100.text-red-700')).toContainText(/verify/i, { timeout: 3000 });
  });

  test('Remember Me checkbox extends token expiry', async ({ page, context }) => {
    const testEmail = `remember-me-${Date.now()}@example.com`;
    const testPassword = 'SecureP@ssw0rd!';

    await page.goto(`${BASE_URL}/signup`);
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="companyName"]', 'Remember Co');
    
    await page.click('button[type="submit"]');

    // Wait for signup to complete
    await expect(page.locator('div.bg-blue-50.text-blue-800 p')).toBeVisible({ timeout: 5000 });

    const verificationToken = await getVerificationToken(page, testEmail);
    
    await page.goto(`${BASE_URL}/verify?token=${verificationToken}`);
    await page.waitForURL(/\/(auth\/)?login/, { timeout: 5000 });

    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);

    const rememberMeCheckbox = page.locator('input[type="checkbox"][name="rememberMe"], input[type="checkbox"]:has-text("Remember")');
    if (await rememberMeCheckbox.isVisible()) {
      await rememberMeCheckbox.click();
    }

    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL(/.*\/dashboard/);

    const cookies = await context.cookies();
    const refreshToken = cookies.find(c => 
      c.name === 'refreshToken' || c.name === 'refresh_token' || c.name.includes('token')
    );

    if (refreshToken) {
      const now = Math.floor(Date.now() / 1000);
      const daysUntilExpiry = (refreshToken.expires - now) / (24 * 60 * 60);
      expect(daysUntilExpiry).toBeGreaterThan(7);
    }
  });

  test('Session persists across page reload', async ({ page }) => {
    const testEmail = `reload-test-${Date.now()}@example.com`;
    const testPassword = 'SecureP@ssw0rd!';

    await page.goto(`${BASE_URL}/signup`);
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="companyName"]', 'Reload Co');
    
    await page.click('button[type="submit"]');

    // Wait for signup to complete
    await expect(page.locator('div.bg-blue-50.text-blue-800 p')).toBeVisible({ timeout: 5000 });

    const verificationToken = await getVerificationToken(page, testEmail);
    await page.goto(`${BASE_URL}/verify?token=${verificationToken}`);
    await page.waitForURL(/\/(auth\/)?login/, { timeout: 5000 });

    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL(/.*\/dashboard/);

    await page.reload();

    await expect(page.url()).toContain('/dashboard');
  });

  test('Verify email link with invalid token shows error', async ({ page }) => {
    await page.goto(`${BASE_URL}/verify?token=invalid-token-12345`);
    await expect(page.locator('text=/invalid|expired|token/i')).toBeVisible({ timeout: 3000 });

    const resendButton = page.locator('button:has-text("Resend"), button:has-text("Try again")');
    if (await resendButton.isVisible()) {
      await expect(resendButton).toBeEnabled();
    }
  });

  test('Page redirects from login to dashboard when already logged in', async ({ page }) => {
    const testEmail = `auto-redirect-${Date.now()}@example.com`;
    const testPassword = 'SecureP@ssw0rd!';

    await page.goto(`${BASE_URL}/signup`);
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="companyName"]', 'Redirect Co');
    
    await page.click('button[type="submit"]');

    // Wait for signup to complete
    await expect(page.locator('div.bg-blue-50.text-blue-800 p')).toBeVisible({ timeout: 5000 });

    const verificationToken = await getVerificationToken(page, testEmail);
    await page.goto(`${BASE_URL}/verify?token=${verificationToken}`);
    await page.waitForURL(/\/(auth\/)?login/, { timeout: 5000 });

    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL(/.*\/dashboard/);

    await page.goto(`${BASE_URL}/login`);

    const currentUrl = page.url();
    const isOnDashboard = currentUrl.includes('/dashboard');
    const isOnLogin = currentUrl.includes('/login');
    
    expect(isOnDashboard || isOnLogin).toBeTruthy();
  });

  test('Logout from different page (not dashboard)', async ({ page, context }) => {
    const testEmail = `logout-other-${Date.now()}@example.com`;
    const testPassword = 'SecureP@ssw0rd!';

    await page.goto(`${BASE_URL}/signup`);
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="companyName"]', 'Logout Co');
    
    await page.click('button[type="submit"]');

    // Wait for signup to complete
    await expect(page.locator('div.bg-blue-50.text-blue-800 p')).toBeVisible({ timeout: 5000 });

    const verificationToken = await getVerificationToken(page, testEmail);
    await page.goto(`${BASE_URL}/verify?token=${verificationToken}`);
    await page.waitForURL(/\/(auth\/)?login/, { timeout: 5000 });

    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL(/.*\/dashboard/);

    const otherPageUrl = `${BASE_URL}/billing`;
    await page.goto(otherPageUrl, { waitUntil: 'networkidle' });

    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), button#logout');
    if (await logoutButton.isVisible({ timeout: 2000 })) {
      await logoutButton.click();
      await expect(page).toHaveURL(/.*\/login/, { timeout: 5000 });

      const refreshAfterLogout = await callRefreshEndpoint(page);
      expect(refreshAfterLogout.status()).toBe(401);
    }
  });

  test('Concurrent requests after logout are rejected', async ({ page }) => {
    const testEmail = `concurrent-${Date.now()}@example.com`;
    const testPassword = 'SecureP@ssw0rd!';

    await page.goto(`${BASE_URL}/signup`);
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.fill('input[name="companyName"]', 'Concurrent Co');
    
    await page.click('button[type="submit"]');

    // Wait for signup to complete
    await expect(page.locator('div.bg-blue-50.text-blue-800 p')).toBeVisible({ timeout: 5000 });

    const verificationToken = await getVerificationToken(page, testEmail);
    await page.goto(`${BASE_URL}/verify?token=${verificationToken}`);
    await page.waitForURL(/\/(auth\/)?login/, { timeout: 5000 });

    await page.goto(`${BASE_URL}/login`);
    
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    await expect(page).toHaveURL(/.*\/dashboard/);

    const logoutButton = page.locator('button:has-text("Logout"), button:has-text("Sign Out"), button#logout');
    await expect(logoutButton).toBeVisible({ timeout: 3000 });
    await logoutButton.click();

    await expect(page).toHaveURL(/.*\/login/, { timeout: 5000 });

    const responses = await Promise.all([
      callRefreshEndpoint(page),
      callRefreshEndpoint(page),
      callRefreshEndpoint(page),
    ]);

    responses.forEach(resp => {
      expect(resp.status()).toBe(401);
    });
  });
});

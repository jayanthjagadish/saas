/**
 * Test Data Helpers
 * Factory functions and common test utilities for E2E tests
 */

export function generateTestUser() {
  const timestamp = Date.now();
  return {
    email: `test-user-${timestamp}@fenster-test.com`,
    password: 'SecureTest123!@#',
    company_name: `Test Company ${timestamp}`,
  };
}

export function generateWeakPassword() {
  return 'weak';
}

export function generateValidPassword() {
  return 'StrongPass123!@#';
}

// Common selectors
export const SELECTORS = {
  // Signup page
  SIGNUP_EMAIL_INPUT: 'input[aria-label="Email"]',
  SIGNUP_PASSWORD_INPUT: 'input[aria-label="Password"]',
  SIGNUP_COMPANY_INPUT: 'input[aria-label="Company name"]',
  SIGNUP_SUBMIT_BTN: 'button[type="submit"]',
  
  // Login page
  LOGIN_EMAIL_INPUT: 'input[name="email"]',
  LOGIN_PASSWORD_INPUT: 'input[name="password"]',
  LOGIN_SUBMIT_BTN: 'button[type="submit"]',
  LOGIN_FORM: 'form[aria-label="login-form"]',
  
  // Common
  ERROR_MESSAGE: '.text-red-600',
  SUCCESS_MESSAGE: '.text-blue-800',
  LOADING_STATE: '[aria-busy="true"]',
};

// Common actions
export async function fillSignupForm(page: any, userData: ReturnType<typeof generateTestUser>) {
  await page.fill(SELECTORS.SIGNUP_EMAIL_INPUT, userData.email);
  await page.fill(SELECTORS.SIGNUP_PASSWORD_INPUT, userData.password);
  await page.fill(SELECTORS.SIGNUP_COMPANY_INPUT, userData.company_name);
}

export async function fillLoginForm(page: any, email: string, password: string) {
  await page.fill(SELECTORS.LOGIN_EMAIL_INPUT, email);
  await page.fill(SELECTORS.LOGIN_PASSWORD_INPUT, password);
}

export async function submitForm(page: any) {
  await page.click(SELECTORS.SIGNUP_SUBMIT_BTN);
}

// Wait helpers
export async function waitForNavigation(page: any, urlPattern: RegExp) {
  await page.waitForURL(urlPattern, { timeout: 10000 });
}

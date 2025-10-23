import { Page } from '@playwright/test'
import { LoginPage } from '../page-objects/login-page'
import { DashboardPage } from '../page-objects/dashboard-page'

/**
 * Test user credentials
 * In a real application, these should be stored securely in environment variables
 */
export const TEST_USER = {
  email: process.env.TEST_USER_EMAIL || 'test@example.com',
  password: process.env.TEST_USER_PASSWORD || 'testpassword123',
}

/**
 * Authentication helper functions for E2E tests
 */

/**
 * Log in via the UI using the login page
 * @param page - Playwright page object
 * @param email - User email (defaults to TEST_USER.email)
 * @param password - User password (defaults to TEST_USER.password)
 * @returns Promise<void>
 */
export async function loginViaUI(
  page: Page,
  email: string = TEST_USER.email,
  password: string = TEST_USER.password
): Promise<void> {
  const loginPage = new LoginPage(page)
  const dashboardPage = new DashboardPage(page)

  // Navigate to login page
  await loginPage.goto()
  
  // Perform login
  await loginPage.loginWithEmail(email, password)
  
  // Wait for successful login and redirect to dashboard
  await dashboardPage.waitForLoad()
}

/**
 * Log in via API (faster for tests that don't need to test the login flow)
 * This function can be implemented when API endpoints are available
 * @param page - Playwright page object
 * @param email - User email
 * @param password - User password
 * @returns Promise<void>
 */
export async function loginViaAPI(
  page: Page,
  email: string = TEST_USER.email,
  password: string = TEST_USER.password
): Promise<void> {
  // TODO: Implement API login when backend supports it
  // This would be faster for tests that don't need to verify the login UI
  // For now, fall back to UI login
  await loginViaUI(page, email, password)
}

/**
 * Check if the user is logged in by checking for authenticated page elements
 * @param page - Playwright page object
 * @returns Promise<boolean>
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  const dashboardPage = new DashboardPage(page)
  try {
    return await dashboardPage.hasBottomNav()
  } catch {
    return false
  }
}

/**
 * Setup authenticated state for a test
 * This can be used in test setup to skip the login flow
 * @param page - Playwright page object
 */
export async function setupAuthenticatedState(page: Page): Promise<void> {
  await loginViaUI(page)
}

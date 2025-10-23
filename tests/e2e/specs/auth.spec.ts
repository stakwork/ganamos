import { test, expect } from '../fixtures'
import { loginViaUI, TEST_USER } from '../helpers/auth-helpers'

/**
 * E2E Test Suite: Authentication & Navigation
 * 
 * This test suite covers the user journey from the landing page
 * through navigation to login and successful authentication.
 * 
 * Test Flow:
 * 1. User visits homepage
 * 2. User navigates to login page via UI
 * 3. User logs in with valid credentials
 * 4. User is redirected to dashboard
 * 5. Verify authenticated state
 */

test.describe('User Authentication Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Start each test from a clean state
    await page.context().clearCookies()
  })

  test('should navigate from homepage to login and successfully authenticate', async ({ 
    homePage, 
    loginPage, 
    dashboardPage 
  }) => {
    // Step 1: Navigate to homepage
    await homePage.goto()
    await expect(homePage.loginLink).toBeVisible()
    
    // Step 2: Navigate to login page via the login link
    await homePage.navigateToLogin()
    
    // Step 3: Verify we're on the login page
    await expect(loginPage.page).toHaveURL(/.*\/auth\/login/)
    await expect(loginPage.title).toBeVisible()
    
    // Step 4: Verify login page elements are present
    await expect(loginPage.googleSignInButton).toBeVisible()
    await expect(loginPage.emailSignInButton).toBeVisible()
    await expect(loginPage.phoneSignInButton).toBeVisible()
    
    // Step 5: Show email form
    await loginPage.showEmailForm()
    await expect(loginPage.emailInput).toBeVisible()
    await expect(loginPage.passwordInput).toBeVisible()
    
    // Step 6: Fill in credentials and submit
    // Note: For this to work, you need to set TEST_USER_EMAIL and TEST_USER_PASSWORD
    // environment variables with valid test credentials
    await loginPage.fillEmail(TEST_USER.email)
    await loginPage.fillPassword(TEST_USER.password)
    
    // Step 7: Submit login form
    await loginPage.submitLogin()
    
    // Step 8: Wait for redirect to dashboard
    await dashboardPage.waitForLoad()
    
    // Step 9: Verify successful login by checking dashboard elements
    await expect(dashboardPage.page).toHaveURL(/.*\/dashboard/)
    await expect(dashboardPage.bottomNav).toBeVisible()
    
    // Step 10: Verify bottom navigation is present (indicates authenticated state)
    expect(await dashboardPage.hasBottomNav()).toBe(true)
  })

  test('should display login page elements correctly', async ({ loginPage }) => {
    // Navigate to login page
    await loginPage.goto()
    
    // Verify page title
    await expect(loginPage.title).toBeVisible()
    
    // Verify all sign-in options are visible
    await expect(loginPage.googleSignInButton).toBeVisible()
    await expect(loginPage.emailSignInButton).toBeVisible()
    await expect(loginPage.phoneSignInButton).toBeVisible()
    
    // Verify navigation links
    await expect(loginPage.signUpLink).toBeVisible()
    await expect(loginPage.mapLink).toBeVisible()
  })

  test('should toggle between email form and sign-in options', async ({ loginPage }) => {
    await loginPage.goto()
    
    // Initially, email form should not be visible
    expect(await loginPage.isEmailFormVisible()).toBe(false)
    await expect(loginPage.emailSignInButton).toBeVisible()
    
    // Show email form
    await loginPage.showEmailForm()
    expect(await loginPage.isEmailFormVisible()).toBe(true)
    await expect(loginPage.backButton).toBeVisible()
    
    // Go back to sign-in options
    await loginPage.backButton.click()
    await expect(loginPage.emailSignInButton).toBeVisible()
  })

  test('should navigate from login to sign up page', async ({ loginPage, page }) => {
    await loginPage.goto()
    
    // Click sign up link
    await loginPage.navigateToSignUp()
    
    // Verify we're on the register page
    await expect(page).toHaveURL(/.*\/auth\/register/)
  })

  test('should navigate from login to map page', async ({ loginPage, page }) => {
    await loginPage.goto()
    
    // Click map link
    await loginPage.navigateToMap()
    
    // Verify we're on the map page
    await expect(page).toHaveURL(/.*\/map/)
  })

  // Test with helper function
  test('should login using auth helper', async ({ page, dashboardPage }) => {
    // Use the reusable auth helper
    await loginViaUI(page, TEST_USER.email, TEST_USER.password)
    
    // Verify we're logged in
    await expect(dashboardPage.page).toHaveURL(/.*\/dashboard/)
    expect(await dashboardPage.hasBottomNav()).toBe(true)
  })
})

test.describe('Homepage Navigation', () => {
  test('should display homepage elements', async ({ homePage }) => {
    await homePage.goto()
    
    // Verify homepage elements are visible
    await expect(homePage.loginLink).toBeVisible()
    await expect(homePage.earnBitcoinButton).toBeVisible()
  })

  test('should navigate to login page from homepage', async ({ homePage, page }) => {
    await homePage.goto()
    await homePage.navigateToLogin()
    
    // Verify we're on the login page
    await expect(page).toHaveURL(/.*\/auth\/login/)
  })

  test('should navigate to map page from homepage', async ({ homePage, page }) => {
    await homePage.goto()
    await homePage.navigateToMap()
    
    // Verify we're on the map page
    await expect(page).toHaveURL(/.*\/map/)
  })
})

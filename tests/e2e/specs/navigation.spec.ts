import { test, expect } from '../fixtures'

/**
 * E2E Test Suite: Basic Navigation
 * 
 * Simple tests based on the recorded user journey
 * Tests navigation from homepage to login
 */

test.describe('Basic Navigation', () => {
  test('should navigate from homepage to login page', async ({ page, homePage, loginPage }) => {
    // Navigate to homepage
    await homePage.goto()
    
    // Verify we're on the homepage
    await expect(page).toHaveURL(/.*\/$/)
    await expect(homePage.loginLink).toBeVisible()
    
    // Click login link (second link as per recorded test)
    await homePage.navigateToLogin()
    
    // Verify we're on the login page
    await expect(page).toHaveURL(/.*\/auth\/login/)
    await expect(loginPage.title).toBeVisible()
  })
})

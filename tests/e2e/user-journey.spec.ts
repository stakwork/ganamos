import { test, expect } from '@playwright/test'
import { HomePage, LoginPage, RegisterPage } from './page-objects'

/**
 * User Journey E2E Test
 * Tests the navigation flow from home -> login -> register
 * and verifies key content on each page
 */
test.describe('User Journey - Home to Register', () => {
  test('should navigate from homepage to login to register and verify content', async ({ page }) => {
    // Initialize page objects
    const homePage = new HomePage(page)
    const loginPage = new LoginPage(page)
    const registerPage = new RegisterPage(page)

    // Step 1: Navigate to homepage
    await homePage.goto()
    await homePage.verifyPageLoaded()

    // Step 2: Click login button to go to login page
    await homePage.clickLoginButton()
    await loginPage.verifyPageLoaded()

    // Step 3: Click register link to go to register page
    await loginPage.clickRegisterLink()
    await registerPage.verifyPageLoaded()

    // Step 4: Verify the register page content
    await expect(registerPage.heading).toBeVisible()
    await expect(registerPage.description).toBeVisible()
    
    // Verify the description contains "start posting"
    await expect(registerPage.description).toContainText('start posting')
    
    // Additional verification: check that the description contains the full expected text
    const descriptionText = await registerPage.getDescriptionText()
    expect(descriptionText).toContain('start posting issues and earning rewards')
  })

  test('should have all expected elements on register page', async ({ page }) => {
    const registerPage = new RegisterPage(page)
    
    // Navigate directly to register page
    await registerPage.goto()
    await registerPage.verifyPageLoaded()

    // Verify all key elements are visible
    await expect(registerPage.heading).toBeVisible()
    await expect(registerPage.description).toBeVisible()
    await expect(registerPage.googleSignUpButton).toBeVisible()
    await expect(registerPage.emailSignUpButton).toBeVisible()
    await expect(registerPage.loginLink).toBeVisible()
  })
})

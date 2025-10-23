import type { Page, Locator } from '@playwright/test'

/**
 * Page Object Model for the Home/Landing page
 * Encapsulates all interactions with the home page
 */
export class HomePage {
  readonly page: Page
  readonly loginButton: Locator

  constructor(page: Page) {
    this.page = page
    this.loginButton = page.getByTestId('login-button')
  }

  /**
   * Navigate to the home page
   */
  async goto() {
    await this.page.goto('/')
  }

  /**
   * Click the login button to navigate to the login page
   * Waits for the button to be visible first (handles auth loading state)
   */
  async clickLoginButton() {
    // Wait for auth to finish loading and button to appear
    await this.loginButton.waitFor({ state: 'visible', timeout: 10000 })
    await this.loginButton.click()
  }

  /**
   * Verify the home page has loaded by checking the URL
   */
  async verifyPageLoaded() {
    await this.page.waitForURL('/')
    // Also wait for the login button to be visible (indicates page is fully loaded)
    await this.loginButton.waitFor({ state: 'visible', timeout: 10000 })
  }
}

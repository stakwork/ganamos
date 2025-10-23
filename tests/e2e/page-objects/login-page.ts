import type { Page, Locator } from '@playwright/test'

/**
 * Page Object Model for the Login page
 * Encapsulates all interactions with the login page
 */
export class LoginPage {
  readonly page: Page
  readonly registerLink: Locator
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly loginButton: Locator

  constructor(page: Page) {
    this.page = page
    this.registerLink = page.getByTestId('register-link')
    this.emailInput = page.locator('#email')
    this.passwordInput = page.locator('#password')
    this.loginButton = page.getByRole('button', { name: /log in/i })
  }

  /**
   * Navigate to the login page
   */
  async goto() {
    await this.page.goto('/auth/login')
  }

  /**
   * Click the "Sign up" link to navigate to the register page
   */
  async clickRegisterLink() {
    await this.registerLink.click()
  }

  /**
   * Verify the login page has loaded
   */
  async verifyPageLoaded() {
    await this.page.waitForURL('/auth/login')
  }

  /**
   * Fill in the login form and submit (if needed for authentication tests)
   */
  async login(email: string, password: string) {
    await this.emailInput.fill(email)
    await this.passwordInput.fill(password)
    await this.loginButton.click()
  }
}

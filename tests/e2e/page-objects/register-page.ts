import type { Page, Locator } from '@playwright/test'

/**
 * Page Object Model for the Register page
 * Encapsulates all interactions with the registration page
 */
export class RegisterPage {
  readonly page: Page
  readonly heading: Locator
  readonly description: Locator
  readonly googleSignUpButton: Locator
  readonly emailSignUpButton: Locator
  readonly loginLink: Locator

  constructor(page: Page) {
    this.page = page
    this.heading = page.getByTestId('register-heading')
    this.description = page.getByTestId('register-description')
    this.googleSignUpButton = page.getByRole('button', { name: /sign up with google/i })
    this.emailSignUpButton = page.getByRole('button', { name: /sign up with email/i })
    this.loginLink = page.getByRole('link', { name: /log in/i })
  }

  /**
   * Navigate to the register page
   */
  async goto() {
    await this.page.goto('/auth/register')
  }

  /**
   * Verify the register page has loaded
   */
  async verifyPageLoaded() {
    await this.page.waitForURL('/auth/register')
  }

  /**
   * Verify the description text contains expected content
   */
  async verifyDescriptionContains(text: string) {
    const descriptionText = await this.description.textContent()
    return descriptionText?.includes(text) || false
  }

  /**
   * Get the full description text
   */
  async getDescriptionText() {
    return await this.description.textContent()
  }
}

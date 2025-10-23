import { Page, Locator } from '@playwright/test'

/**
 * Page Object Model for the Login Page
 * Encapsulates all interactions with the login page
 */
export class LoginPage {
  readonly page: Page
  readonly googleSignInButton: Locator
  readonly emailSignInButton: Locator
  readonly phoneSignInButton: Locator
  readonly emailInput: Locator
  readonly passwordInput: Locator
  readonly loginButton: Locator
  readonly backButton: Locator
  readonly signUpLink: Locator
  readonly mapLink: Locator
  readonly forgotPasswordLink: Locator
  readonly title: Locator

  constructor(page: Page) {
    this.page = page
    
    // Auth method buttons (initial view)
    this.googleSignInButton = page.locator('button:has-text("Sign in with Google")')
    this.emailSignInButton = page.locator('button:has-text("Sign in with Email")')
    this.phoneSignInButton = page.locator('button:has-text("Sign in with Phone")')
    
    // Email form elements (shown after clicking email sign in)
    this.emailInput = page.locator('input#email')
    this.passwordInput = page.locator('input#password')
    this.loginButton = page.locator('button[type="submit"]')
    this.backButton = page.locator('button:has-text("Back to all sign in options")')
    
    // Links
    this.signUpLink = page.locator('a[href="/auth/register"]')
    this.mapLink = page.locator('a[href="/map"]')
    this.forgotPasswordLink = page.locator('a[href="/auth/forgot-password"]')
    
    // Page elements
    this.title = page.locator('.app-title, h1:has-text("Ganamos")')
  }

  /**
   * Navigate to the login page
   */
  async goto() {
    await this.page.goto('/auth/login')
  }

  /**
   * Click the email sign in button to show the email form
   */
  async showEmailForm() {
    await this.emailSignInButton.click()
    await this.emailInput.waitFor({ state: 'visible' })
  }

  /**
   * Fill in the email input
   */
  async fillEmail(email: string) {
    await this.emailInput.fill(email)
  }

  /**
   * Fill in the password input
   */
  async fillPassword(password: string) {
    await this.passwordInput.fill(password)
  }

  /**
   * Click the login button
   */
  async submitLogin() {
    await this.loginButton.click()
  }

  /**
   * Complete email login with provided credentials
   * @param email - User email
   * @param password - User password
   */
  async loginWithEmail(email: string, password: string) {
    await this.showEmailForm()
    await this.fillEmail(email)
    await this.fillPassword(password)
    await this.submitLogin()
  }

  /**
   * Click the Google sign in button
   */
  async clickGoogleSignIn() {
    await this.googleSignInButton.click()
  }

  /**
   * Click the phone sign in button
   */
  async clickPhoneSignIn() {
    await this.phoneSignInButton.click()
  }

  /**
   * Navigate to the sign up page
   */
  async navigateToSignUp() {
    await this.signUpLink.click()
    await this.page.waitForURL('**/auth/register')
  }

  /**
   * Navigate to the map page
   */
  async navigateToMap() {
    await this.mapLink.click()
    await this.page.waitForURL('**/map')
  }

  /**
   * Check if the login page is visible
   */
  async isVisible() {
    await this.title.waitFor({ state: 'visible' })
    return await this.title.isVisible()
  }

  /**
   * Check if the email form is visible
   */
  async isEmailFormVisible() {
    return await this.emailInput.isVisible()
  }

  /**
   * Get error message if present
   */
  async getErrorMessage() {
    const errorAlert = this.page.locator('[role="alert"]')
    if (await errorAlert.isVisible()) {
      return await errorAlert.textContent()
    }
    return null
  }
}

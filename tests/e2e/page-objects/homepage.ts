import { Page, Locator } from '@playwright/test'

/**
 * Page Object Model for the Homepage/Landing Page
 * Encapsulates all interactions with the landing page
 */
export class HomePage {
  readonly page: Page
  readonly earnBitcoinButton: Locator
  readonly loginLink: Locator
  readonly landingHero: Locator

  constructor(page: Page) {
    this.page = page
    
    // Primary navigation elements
    this.loginLink = page.locator('a[href="/auth/login"]')
    this.earnBitcoinButton = page.locator('a[href="/map"]').first()
    this.landingHero = page.locator('.app-title, h1:has-text("Ganamos")')
  }

  /**
   * Navigate to the homepage
   */
  async goto() {
    await this.page.goto('/')
  }

  /**
   * Navigate to login page via the login link
   */
  async navigateToLogin() {
    await this.loginLink.click()
    await this.page.waitForURL('**/auth/login')
  }

  /**
   * Navigate to map page via the earn bitcoin button
   */
  async navigateToMap() {
    await this.earnBitcoinButton.click()
    await this.page.waitForURL('**/map')
  }

  /**
   * Check if the landing page is visible
   */
  async isVisible() {
    await this.loginLink.waitFor({ state: 'visible' })
    return await this.loginLink.isVisible()
  }
}

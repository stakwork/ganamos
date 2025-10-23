import { Page, Locator } from '@playwright/test'

/**
 * Page Object Model for the Dashboard Page
 * Encapsulates all interactions with the dashboard page
 */
export class DashboardPage {
  readonly page: Page
  readonly bottomNav: Locator
  readonly homeButton: Locator
  readonly mapButton: Locator
  readonly newPostButton: Locator
  readonly donateButton: Locator
  readonly profileButton: Locator
  readonly postCards: Locator

  constructor(page: Page) {
    this.page = page
    
    // Bottom navigation
    this.bottomNav = page.locator('#bottom-nav')
    this.homeButton = page.locator('a[href="/dashboard"]')
    this.mapButton = page.locator('button:has(svg)').filter({ has: page.locator('svg') }).first()
    this.newPostButton = page.locator('button[aria-label="New Post"]')
    this.donateButton = page.locator('a[href="/donate"]')
    this.profileButton = page.locator('a[href="/profile"]')
    
    // Dashboard content
    this.postCards = page.locator('[class*="post-card"], article')
  }

  /**
   * Navigate to the dashboard page
   */
  async goto() {
    await this.page.goto('/dashboard')
  }

  /**
   * Check if the dashboard is visible by checking for bottom nav
   */
  async isVisible() {
    await this.bottomNav.waitFor({ state: 'visible', timeout: 10000 })
    return await this.bottomNav.isVisible()
  }

  /**
   * Check if bottom navigation is present (indicates logged in state)
   */
  async hasBottomNav() {
    return await this.bottomNav.isVisible()
  }

  /**
   * Wait for the dashboard to load
   */
  async waitForLoad() {
    await this.page.waitForURL('**/dashboard', { timeout: 10000 })
    await this.bottomNav.waitFor({ state: 'visible', timeout: 10000 })
  }

  /**
   * Navigate to profile
   */
  async navigateToProfile() {
    await this.profileButton.click()
    await this.page.waitForURL('**/profile')
  }

  /**
   * Navigate to map
   */
  async navigateToMap() {
    await this.mapButton.click()
    await this.page.waitForURL('**/map')
  }

  /**
   * Click new post button
   */
  async clickNewPost() {
    await this.newPostButton.click()
    await this.page.waitForURL('**/post/new')
  }

  /**
   * Get the number of post cards visible
   */
  async getPostCount() {
    return await this.postCards.count()
  }
}

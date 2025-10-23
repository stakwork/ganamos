import { test as base } from '@playwright/test'
import { HomePage } from '../page-objects/homepage'
import { LoginPage } from '../page-objects/login-page'
import { DashboardPage } from '../page-objects/dashboard-page'

/**
 * Custom fixtures for E2E tests
 * Extends Playwright's base test with page object instances
 */

type CustomFixtures = {
  homePage: HomePage
  loginPage: LoginPage
  dashboardPage: DashboardPage
}

/**
 * Extended test with custom fixtures
 * Usage: import { test, expect } from '@/tests/e2e/fixtures'
 */
export const test = base.extend<CustomFixtures>({
  /**
   * HomePage fixture
   * Automatically creates a HomePage instance for each test
   */
  homePage: async ({ page }, use) => {
    const homePage = new HomePage(page)
    await use(homePage)
  },

  /**
   * LoginPage fixture
   * Automatically creates a LoginPage instance for each test
   */
  loginPage: async ({ page }, use) => {
    const loginPage = new LoginPage(page)
    await use(loginPage)
  },

  /**
   * DashboardPage fixture
   * Automatically creates a DashboardPage instance for each test
   */
  dashboardPage: async ({ page }, use) => {
    const dashboardPage = new DashboardPage(page)
    await use(dashboardPage)
  },
})

export { expect } from '@playwright/test'

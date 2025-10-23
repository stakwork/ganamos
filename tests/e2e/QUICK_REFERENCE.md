# E2E Test Quick Reference

## 🚀 Quick Start

### Run Tests
```bash
# Run all tests with UI
npm run test:e2e:ui

# Run all tests headless
npm run test:e2e

# Run specific test file
npx playwright test specs/navigation.spec.ts

# Run in debug mode
npx playwright test --debug

# Run only one browser
npx playwright test --project=chromium
```

### Import Pattern
```typescript
// Always use custom fixtures
import { test, expect } from '../fixtures'

// Page objects are auto-injected
test('my test', async ({ homePage, loginPage, dashboardPage }) => {
  await homePage.goto()
  // ...
})
```

## 📦 Available Page Objects

### HomePage
```typescript
await homePage.goto()                    // Navigate to homepage
await homePage.navigateToLogin()         // Click login link
await homePage.navigateToMap()           // Click earn bitcoin button
await homePage.isVisible()               // Check visibility
```

### LoginPage
```typescript
await loginPage.goto()                   // Navigate to login page
await loginPage.loginWithEmail(email, pwd) // Complete email login
await loginPage.showEmailForm()          // Show email form
await loginPage.fillEmail(email)         // Fill email
await loginPage.fillPassword(pwd)        // Fill password
await loginPage.submitLogin()            // Submit form
await loginPage.clickGoogleSignIn()      // Click Google button
await loginPage.navigateToSignUp()       // Go to sign up
await loginPage.navigateToMap()          // Go to map
await loginPage.isVisible()              // Check visibility
const err = await loginPage.getErrorMessage() // Get error
```

### DashboardPage
```typescript
await dashboardPage.goto()               // Navigate to dashboard
await dashboardPage.waitForLoad()        // Wait for load
await dashboardPage.isVisible()          // Check visibility
const hasNav = await dashboardPage.hasBottomNav() // Check nav
await dashboardPage.navigateToProfile()  // Go to profile
await dashboardPage.navigateToMap()      // Go to map
await dashboardPage.clickNewPost()       // Click new post
const count = await dashboardPage.getPostCount() // Get posts
```

## 🔑 Authentication Helpers

```typescript
import { loginViaUI, TEST_USER } from '../helpers/auth-helpers'

// Login using UI (full flow)
await loginViaUI(page, TEST_USER.email, TEST_USER.password)

// Check if logged in
const loggedIn = await isLoggedIn(page)

// Setup authenticated state
await setupAuthenticatedState(page)
```

## ✅ Common Patterns

### Basic Test
```typescript
import { test, expect } from '../fixtures'

test.describe('Feature Name', () => {
  test('should do something', async ({ homePage }) => {
    await homePage.goto()
    await expect(homePage.loginLink).toBeVisible()
  })
})
```

### Navigation Test
```typescript
test('should navigate', async ({ homePage, loginPage }) => {
  await homePage.goto()
  await homePage.navigateToLogin()
  await expect(loginPage.page).toHaveURL(/.*\/auth\/login/)
})
```

### Auth Test
```typescript
test('should login', async ({ page, loginPage, dashboardPage }) => {
  await loginPage.goto()
  await loginPage.loginWithEmail('test@example.com', 'password')
  await dashboardPage.waitForLoad()
  expect(await dashboardPage.hasBottomNav()).toBe(true)
})
```

### Test with Helper
```typescript
test('should do something after login', async ({ page, dashboardPage }) => {
  await loginViaUI(page) // Uses default TEST_USER credentials
  await dashboardPage.navigateToProfile()
  // ... rest of test
})
```

### Clean State
```typescript
test.beforeEach(async ({ page }) => {
  await page.context().clearCookies()
  await page.goto('/')
})
```

## 🎯 Assertions

### URL Assertions
```typescript
await expect(page).toHaveURL('http://localhost:3457/')
await expect(page).toHaveURL(/.*\/dashboard/)
```

### Visibility Assertions
```typescript
await expect(loginPage.emailInput).toBeVisible()
await expect(loginPage.emailInput).not.toBeVisible()
```

### Value Assertions
```typescript
expect(await dashboardPage.hasBottomNav()).toBe(true)
expect(await loginPage.isEmailFormVisible()).toBe(false)
```

### Text Assertions
```typescript
await expect(element).toHaveText('Expected text')
await expect(element).toContainText('partial')
```

## 🔧 Environment Variables

```bash
# Set before running tests
export TEST_USER_EMAIL="test@example.com"
export TEST_USER_PASSWORD="password123"

# Or in .env.test file
TEST_USER_EMAIL=test@example.com
TEST_USER_PASSWORD=password123
```

## 📝 Adding New Page Object

1. Create file in `page-objects/`
```typescript
import { Page, Locator } from '@playwright/test'

export class MyPage {
  readonly page: Page
  readonly myElement: Locator

  constructor(page: Page) {
    this.page = page
    this.myElement = page.locator('[data-testid="my-element"]')
  }

  async goto() {
    await this.page.goto('/my-page')
  }

  async doSomething() {
    await this.myElement.click()
  }
}
```

2. Add to `fixtures/index.ts`
```typescript
import { MyPage } from '../page-objects/my-page'

export const test = base.extend<CustomFixtures>({
  myPage: async ({ page }, use) => {
    await use(new MyPage(page))
  },
})
```

3. Use in tests
```typescript
test('test', async ({ myPage }) => {
  await myPage.goto()
  await myPage.doSomething()
})
```

## 🐛 Debugging

```bash
# Run with browser visible
npx playwright test --headed

# Run in debug mode (step through)
npx playwright test --debug

# Generate trace
npx playwright test --trace on

# View trace
npx playwright show-trace trace.zip

# Screenshot on failure (automatic)
# Check playwright-report/ folder
```

## 📊 Playwright Commands

```bash
# Install browsers
npx playwright install

# Show test report
npx playwright show-report

# List all tests
npx playwright test --list

# Run specific test by name
npx playwright test -g "should navigate"

# Run tests in specific file
npx playwright test auth.spec.ts

# Run with specific timeout
npx playwright test --timeout=60000
```

## 🎨 Best Practices

1. ✅ **Always** use page objects
2. ✅ **Always** use fixtures
3. ✅ **Always** use descriptive test names
4. ✅ Use helpers for common flows
5. ✅ Clear state between tests
6. ✅ Use semantic selectors
7. ✅ Let Playwright auto-wait
8. ❌ Don't hardcode timeouts
9. ❌ Don't interact with page directly in tests
10. ❌ Don't use brittle CSS selectors

## 📁 File Structure

```
tests/e2e/
├── fixtures/          ← Custom fixtures
├── helpers/           ← Reusable functions
├── page-objects/      ← Page Object Models
├── specs/             ← Test files
├── README.md          ← Full documentation
└── IMPLEMENTATION_SUMMARY.md ← Implementation details
```

---

**Need Help?** Check the [full documentation](./README.md)

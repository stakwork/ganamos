# E2E Test Infrastructure

This directory contains the modular E2E test infrastructure for the Ganamos application using Playwright.

## Directory Structure

```
tests/e2e/
├── fixtures/           # Custom Playwright fixtures
│   └── index.ts       # Extended test fixtures with page objects
├── helpers/           # Reusable helper functions
│   └── auth-helpers.ts # Authentication helpers
├── page-objects/      # Page Object Model (POM) implementations
│   ├── homepage.ts    # Homepage page object
│   ├── login-page.ts  # Login page object
│   ├── dashboard-page.ts # Dashboard page object
│   └── index.ts       # Page objects index
└── specs/            # Test specifications
    └── auth.spec.ts  # Authentication and navigation tests
```

## Key Principles

### DRY (Don't Repeat Yourself)
- **Page Objects**: Encapsulate all page interactions in dedicated classes
- **Helpers**: Reusable functions for common operations (e.g., login)
- **Fixtures**: Custom Playwright fixtures for automatic page object injection

### Stability
- Use semantic selectors (text, role) over brittle CSS selectors
- Leverage Playwright's auto-waiting mechanisms
- Avoid hardcoded timeouts where possible

### Modularity
- Each page has its own page object class
- Helpers are standalone and reusable
- Tests can be easily extended without code duplication

## Usage

### Basic Test Structure

```typescript
import { test, expect } from '../fixtures'

test('example test', async ({ homePage, loginPage, dashboardPage }) => {
  // Use page objects directly - they're injected via fixtures
  await homePage.goto()
  await homePage.navigateToLogin()
  
  await loginPage.loginWithEmail('user@example.com', 'password')
  
  await expect(dashboardPage.page).toHaveURL(/.*\/dashboard/)
})
```

### Using Authentication Helpers

```typescript
import { loginViaUI, TEST_USER } from '../helpers/auth-helpers'

test('test requiring authentication', async ({ page, dashboardPage }) => {
  // Skip the login UI and use the helper
  await loginViaUI(page, TEST_USER.email, TEST_USER.password)
  
  // Now you're on the dashboard, ready to test
  expect(await dashboardPage.hasBottomNav()).toBe(true)
})
```

### Environment Variables

For tests that require authentication, set these environment variables:

```bash
export TEST_USER_EMAIL="your-test-user@example.com"
export TEST_USER_PASSWORD="your-test-password"
```

Or create a `.env.test` file (not committed to version control):

```
TEST_USER_EMAIL=your-test-user@example.com
TEST_USER_PASSWORD=your-test-password
```

## Running Tests

### Run all E2E tests
```bash
npm run test:e2e
# or
npx playwright test
```

### Run specific test file
```bash
npx playwright test auth.spec.ts
```

### Run in UI mode (recommended for development)
```bash
npx playwright test --ui
```

### Run in headed mode (see the browser)
```bash
npx playwright test --headed
```

### Run in debug mode
```bash
npx playwright test --debug
```

### Run only one browser
```bash
npx playwright test --project=chromium
```

## Adding New Tests

### 1. Create a Page Object (if needed)

```typescript
// tests/e2e/page-objects/new-page.ts
import { Page, Locator } from '@playwright/test'

export class NewPage {
  readonly page: Page
  readonly someElement: Locator

  constructor(page: Page) {
    this.page = page
    this.someElement = page.locator('[data-testid="some-element"]')
  }

  async goto() {
    await this.page.goto('/new-page')
  }

  async doSomething() {
    await this.someElement.click()
  }
}
```

### 2. Add to Fixtures (if needed)

```typescript
// tests/e2e/fixtures/index.ts
import { NewPage } from '../page-objects/new-page'

export const test = base.extend<CustomFixtures>({
  // ... existing fixtures
  newPage: async ({ page }, use) => {
    const newPage = new NewPage(page)
    await use(newPage)
  },
})
```

### 3. Create Test Spec

```typescript
// tests/e2e/specs/new-feature.spec.ts
import { test, expect } from '../fixtures'

test.describe('New Feature', () => {
  test('should do something', async ({ newPage }) => {
    await newPage.goto()
    await newPage.doSomething()
    // assertions...
  })
})
```

## Best Practices

1. **Use Page Objects**: Never interact with the page directly in tests
2. **Use Helpers**: Extract common flows (login, navigation) into helpers
3. **Use Fixtures**: Inject page objects and dependencies automatically
4. **Descriptive Names**: Use clear, descriptive names for tests and methods
5. **Single Responsibility**: Each page object should represent one page/component
6. **Wait Smart**: Use Playwright's built-in waiting, avoid arbitrary timeouts
7. **Test Isolation**: Each test should be independent and start from a clean state
8. **Test Data**: Use environment variables or test fixtures for test data
9. **Documentation**: Document complex test flows and non-obvious interactions

## CI/CD Integration

The tests are configured to run in CI with:
- Retries enabled (2 retries in CI)
- Single worker (sequential execution)
- HTML report generation
- Screenshots on failure
- Video on failure

See `playwright.config.ts` for full configuration.

## Troubleshooting

### Test Timeouts
- Increase timeout in `playwright.config.ts` if needed
- Check network conditions and server response times
- Use `page.waitForLoadState('networkidle')` for heavy pages

### Flaky Tests
- Review selector stability
- Check for race conditions
- Add explicit waits where needed
- Use `test.retry()` for inherently flaky tests

### Debug Failures
```bash
# Run with trace on
npx playwright test --trace on

# Open trace viewer
npx playwright show-trace trace.zip
```

## Future Enhancements

- [ ] Add API authentication helper for faster test setup
- [ ] Add data-testid attributes to components for more stable selectors
- [ ] Add visual regression testing
- [ ] Add performance testing helpers
- [ ] Add mobile-specific tests
- [ ] Add accessibility testing

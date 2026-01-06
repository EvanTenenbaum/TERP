# E2E Testing Guide

This guide explains how to set up and run end-to-end tests for TERP, including authentication for automated testing.

## Prerequisites

1. **Test Accounts**: Seed test accounts for each role:

   ```bash
   pnpm seed:test-accounts
   ```

2. **RBAC Roles**: Ensure RBAC is seeded (for full role-based testing):

   ```bash
   tsx scripts/seed-rbac.ts
   ```

3. **Enable Test Auth** (production only): Set `ENABLE_TEST_AUTH=true` in environment

---

## Authentication for Automated Tests

### Getting Auth Tokens

```bash
# Get token for any role
pnpm get:auth-token <email> <password> <base-url>

# Examples:
pnpm get:auth-token test-superadmin@terp-app.local TestSuperAdmin123! http://localhost:5000
pnpm get:auth-token test-salesmanager@terp-app.local TestSalesManager123! https://terp-app-b9s35.ondigitalocean.app
```

### Test Accounts by Role

| Role               | Email                            | Password             |
| ------------------ | -------------------------------- | -------------------- |
| Super Admin        | test-superadmin@terp-app.local   | TestSuperAdmin123!   |
| Owner/Executive    | test-owner@terp-app.local        | TestOwner123!        |
| Operations Manager | test-opsmanager@terp-app.local   | TestOpsManager123!   |
| Sales Manager      | test-salesmanager@terp-app.local | TestSalesManager123! |
| Accountant         | test-accountant@terp-app.local   | TestAccountant123!   |
| Inventory Manager  | test-invmanager@terp-app.local   | TestInvManager123!   |
| Buyer/Procurement  | test-buyer@terp-app.local        | TestBuyer123!        |
| Customer Service   | test-custservice@terp-app.local  | TestCustService123!  |
| Warehouse Staff    | test-warehouse@terp-app.local    | TestWarehouse123!    |
| Read-Only Auditor  | test-auditor@terp-app.local      | TestAuditor123!      |

---

## Using Tokens in Playwright

### Basic Setup

```typescript
import { test, expect } from "@playwright/test";

// Get token from environment or generate via API
const TOKEN = process.env.TEST_AUTH_TOKEN;
const COOKIE_NAME = "app_session_id";
const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

test.beforeEach(async ({ context }) => {
  const url = new URL(BASE_URL);

  await context.addCookies([
    {
      name: COOKIE_NAME,
      value: TOKEN,
      domain: url.hostname,
      path: "/",
    },
  ]);
});

test("admin can access dashboard", async ({ page }) => {
  await page.goto(`${BASE_URL}/dashboard`);
  await expect(page.locator("h1")).toContainText("Dashboard");
});
```

### Dynamic Token Generation

```typescript
import { test, expect, request } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

async function getAuthToken(email: string, password: string): Promise<string> {
  const apiContext = await request.newContext();

  const response = await apiContext.post(
    `${BASE_URL}/api/trpc/auth.getTestToken`,
    {
      headers: { "Content-Type": "application/json" },
      data: { json: { email, password } },
    }
  );

  const data = await response.json();
  return data.result.data.json.token;
}

test.describe("Role-based access tests", () => {
  test("Super Admin can access settings", async ({ context, page }) => {
    const token = await getAuthToken(
      "test-superadmin@terp-app.local",
      "TestSuperAdmin123!"
    );

    await context.addCookies([
      {
        name: "app_session_id",
        value: token,
        domain: new URL(BASE_URL).hostname,
        path: "/",
      },
    ]);

    await page.goto(`${BASE_URL}/settings`);
    await expect(page).not.toHaveURL(/.*login.*/);
  });

  test("Viewer cannot access settings", async ({ context, page }) => {
    const token = await getAuthToken(
      "test-auditor@terp-app.local",
      "TestAuditor123!"
    );

    await context.addCookies([
      {
        name: "app_session_id",
        value: token,
        domain: new URL(BASE_URL).hostname,
        path: "/",
      },
    ]);

    await page.goto(`${BASE_URL}/settings`);
    // Expect redirect or access denied
    await expect(page.locator("text=Access Denied")).toBeVisible();
  });
});
```

### Fixture-Based Approach

```typescript
// fixtures/auth.ts
import { test as base, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

type AuthFixtures = {
  authenticatedContext: {
    token: string;
    role: string;
  };
};

export const test = base.extend<AuthFixtures>({
  authenticatedContext: async ({ context, request }, use) => {
    // Default to Super Admin
    const email = process.env.TEST_EMAIL || "test-superadmin@terp-app.local";
    const password = process.env.TEST_PASSWORD || "TestSuperAdmin123!";

    const response = await request.post(
      `${BASE_URL}/api/trpc/auth.getTestToken`,
      {
        headers: { "Content-Type": "application/json" },
        data: { json: { email, password } },
      }
    );

    const data = await response.json();
    const result = data.result.data.json;

    await context.addCookies([
      {
        name: result.cookieName,
        value: result.token,
        domain: new URL(BASE_URL).hostname,
        path: "/",
      },
    ]);

    await use({ token: result.token, role: result.user.role });
  },
});

// Usage in tests
test("authenticated user sees dashboard", async ({
  page,
  authenticatedContext,
}) => {
  console.log("Testing as:", authenticatedContext.role);
  await page.goto(`${BASE_URL}/dashboard`);
  await expect(page).toHaveURL(/dashboard/);
});
```

---

## Testing Role Permissions

### Role Capability Matrix

| Role               | Dashboard | Inventory | Orders  | Accounting | Settings | Users |
| ------------------ | --------- | --------- | ------- | ---------- | -------- | ----- |
| Super Admin        | ✅        | ✅ CRUD   | ✅ CRUD | ✅ CRUD    | ✅       | ✅    |
| Owner/Executive    | ✅        | 👁️        | 👁️      | 👁️         | ❌       | ❌    |
| Operations Manager | ✅        | ✅ CRUD   | ✅ CRUD | 👁️         | ❌       | ❌    |
| Sales Manager      | ✅        | 👁️        | ✅ CRUD | ❌         | ❌       | ❌    |
| Accountant         | ✅        | ❌        | 👁️      | ✅ CRUD    | ❌       | ❌    |
| Warehouse Staff    | ✅        | ✅ Edit   | 👁️      | ❌         | ❌       | ❌    |
| Read-Only Auditor  | ✅        | 👁️        | 👁️      | 👁️         | 👁️       | 👁️    |

Legend: ✅ = Full Access, 👁️ = Read Only, ❌ = No Access

### Example Permission Tests

```typescript
import { test, expect } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:5000";

async function loginAs(
  context: any,
  request: any,
  email: string,
  password: string
) {
  const response = await request.post(
    `${BASE_URL}/api/trpc/auth.getTestToken`,
    {
      headers: { "Content-Type": "application/json" },
      data: { json: { email, password } },
    }
  );

  const data = await response.json();
  const result = data.result.data.json;

  await context.addCookies([
    {
      name: result.cookieName,
      value: result.token,
      domain: new URL(BASE_URL).hostname,
      path: "/",
    },
  ]);
}

test.describe("Inventory permissions", () => {
  test("Operations Manager can create inventory", async ({
    context,
    page,
    request,
  }) => {
    await loginAs(
      context,
      request,
      "test-opsmanager@terp-app.local",
      "TestOpsManager123!"
    );

    await page.goto(`${BASE_URL}/inventory`);

    // Should see "Add" button
    await expect(
      page.getByRole("button", { name: /add|create|new/i })
    ).toBeVisible();
  });

  test("Auditor cannot create inventory", async ({
    context,
    page,
    request,
  }) => {
    await loginAs(
      context,
      request,
      "test-auditor@terp-app.local",
      "TestAuditor123!"
    );

    await page.goto(`${BASE_URL}/inventory`);

    // Should NOT see "Add" button
    await expect(
      page.getByRole("button", { name: /add|create|new/i })
    ).not.toBeVisible();
  });
});
```

---

## Running E2E Tests

### Local Development

```bash
# Start dev server
pnpm dev

# Run all E2E tests
pnpm test:e2e

# Run with UI
pnpm test:e2e:ui

# Run in headed mode (see browser)
pnpm test:e2e:headed

# Run specific test file
pnpm test:e2e tests-e2e/auth.spec.ts
```

### Against Production/Staging

```bash
# Set base URL
export BASE_URL=https://terp-app-b9s35.ondigitalocean.app

# Enable test auth (if needed)
export ENABLE_TEST_AUTH=true

# Run tests
pnpm test:e2e
```

### CI/CD Integration

```yaml
# Example GitHub Actions workflow
name: E2E Tests
on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: "pnpm"

      - run: pnpm install
      - run: pnpm exec playwright install --with-deps

      - name: Start server
        run: pnpm dev &
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
          ENABLE_TEST_AUTH: "true"

      - name: Wait for server
        run: npx wait-on http://localhost:5000

      - name: Run E2E tests
        run: pnpm test:e2e
        env:
          BASE_URL: http://localhost:5000
```

---

## Troubleshooting

### "Test auth is not enabled"

Set `ENABLE_TEST_AUTH=true` in your environment or `.env` file.

### "Invalid credentials"

1. Ensure test accounts are seeded: `pnpm seed:test-accounts`
2. Check email is exactly as documented (case-sensitive)
3. Verify password is correct

### Cookie not being set

1. Check domain matches exactly (e.g., `localhost` vs `127.0.0.1`)
2. Ensure cookie path is `/`
3. Verify token is valid (not expired)

### Tests timeout waiting for auth

Use `page.waitForLoadState('networkidle')` after setting cookies:

```typescript
await context.addCookies([{ ... }]);
await page.goto('/dashboard');
await page.waitForLoadState('networkidle');
```

---

## Best Practices

1. **Use environment variables** for tokens in CI/CD
2. **Generate fresh tokens** for each test run (tokens last 30 days but fresh is safer)
3. **Test multiple roles** to verify RBAC
4. **Don't hardcode credentials** in test files - use fixtures or env vars
5. **Clean up test data** after tests if modifying database

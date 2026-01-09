# TERP Authentication Setup

This document explains how to set up and manage authentication in TERP.

## Quick Start: Set Up Admin Access

```bash
# Set your admin credentials
pnpm setup:admin your-email@example.com YourSecurePassword123!

# Login at /login with those credentials
```

## How Authentication Works

1. **Login**: POST to `/api/auth/login` with `{ username, password }`
2. **Session**: JWT token stored in `app_session_id` cookie (30-day expiry)
3. **Super Admin**: Users with "Super Admin" RBAC role OR `role='admin'` in users table bypass all permission checks

### Authentication Flow

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   /login     │────▶│ POST /api/   │────▶│   Validate   │
│    Page      │     │ auth/login   │     │  Credentials │
└──────────────┘     └──────────────┘     └──────────────┘
                                                  │
                                                  ▼
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Access     │◀────│ Set Cookie   │◀────│ Create JWT   │
│   Granted    │     │app_session_id│     │    Token     │
└──────────────┘     └──────────────┘     └──────────────┘
```

### Key Files

| File                                   | Purpose                                     |
| -------------------------------------- | ------------------------------------------- |
| `server/_core/simpleAuth.ts`           | Login logic, password hashing, JWT creation |
| `server/routers/auth.ts`               | Auth API endpoints (tRPC)                   |
| `server/_core/context.ts`              | Request context creation                    |
| `server/services/permissionService.ts` | Permission checks, isSuperAdmin()           |
| `drizzle/schema.ts`                    | users table                                 |
| `drizzle/schema-rbac.ts`               | roles, userRoles tables                     |
| `shared/const.ts`                      | COOKIE_NAME = "app_session_id"              |
| `client/src/pages/Login.tsx`           | Login page UI                               |

---

## Admin Setup Script

The `setup:admin` script creates or updates a user with Super Admin privileges.

### Usage

```bash
pnpm setup:admin <email> <password>

# Examples
pnpm setup:admin admin@example.com MySecurePassword123!
pnpm setup:admin evan@terp.com SuperSecret456!
```

### What It Does

1. Creates a new user (or updates existing) with the given email
2. Sets the bcrypt-hashed password in `loginMethod` field
3. Sets `users.role = 'admin'` (enables god-mode fallback)
4. Assigns the "Super Admin" RBAC role (if RBAC is seeded)

### Notes

- Password must be at least 8 characters
- If RBAC tables haven't been seeded, the user will still have admin access via `users.role='admin'`
- Run `tsx scripts/seed-rbac.ts` first to enable full RBAC with Super Admin role

---

## Test Accounts for E2E Testing

### Seed Test Accounts

```bash
pnpm seed:test-accounts
```

This creates accounts for each RBAC role:

| Email                            | Role               | Password             |
| -------------------------------- | ------------------ | -------------------- |
| test-superadmin@terp-app.local   | Super Admin        | TestSuperAdmin123!   |
| test-owner@terp-app.local        | Owner/Executive    | TestOwner123!        |
| test-opsmanager@terp-app.local   | Operations Manager | TestOpsManager123!   |
| test-salesmanager@terp-app.local | Sales Manager      | TestSalesManager123! |
| test-accountant@terp-app.local   | Accountant         | TestAccountant123!   |
| test-invmanager@terp-app.local   | Inventory Manager  | TestInvManager123!   |
| test-buyer@terp-app.local        | Buyer/Procurement  | TestBuyer123!        |
| test-custservice@terp-app.local  | Customer Service   | TestCustService123!  |
| test-warehouse@terp-app.local    | Warehouse Staff    | TestWarehouse123!    |
| test-auditor@terp-app.local      | Read-Only Auditor  | TestAuditor123!      |

### Prerequisites

For full role-based testing, seed the RBAC tables first:

```bash
tsx scripts/seed-rbac.ts
pnpm seed:test-accounts
```

---

## Get Auth Token for AI Agents

For browser automation (Playwright, Puppeteer), you need a session token.

### 1. Enable Test Auth (Production Only)

In development, test auth is enabled by default. For production/staging:

```bash
# .env
ENABLE_TEST_AUTH=true
```

### 2. Get Token

```bash
pnpm get:auth-token <email> <password> [base-url]

# Examples
pnpm get:auth-token test-admin@terp-app.local TestAdmin123!
pnpm get:auth-token test-superadmin@terp-app.local TestSuperAdmin123! https://terp-app-b9s35.ondigitalocean.app
```

### 3. Use in Playwright

```typescript
import { test, expect, BrowserContext } from "@playwright/test";

const TOKEN = process.env.TEST_AUTH_TOKEN;
const BASE_URL = "https://terp-app-b9s35.ondigitalocean.app";

test.beforeEach(async ({ context }) => {
  await context.addCookies([
    {
      name: "app_session_id",
      value: TOKEN,
      domain: "terp-app-b9s35.ondigitalocean.app",
      path: "/",
    },
  ]);
});

test("admin can access dashboard", async ({ page }) => {
  await page.goto(`${BASE_URL}/dashboard`);
  await expect(page.locator("h1")).toContainText("Dashboard");
});
```

### 4. Use in Puppeteer

```javascript
const puppeteer = require("puppeteer");

const TOKEN = process.env.TEST_AUTH_TOKEN;

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setCookie({
    name: "app_session_id",
    value: TOKEN,
    domain: "terp-app-b9s35.ondigitalocean.app",
    path: "/",
  });

  await page.goto("https://terp-app-b9s35.ondigitalocean.app/dashboard");
  // ... your test code

  await browser.close();
})();
```

---

## RBAC System

TERP uses Role-Based Access Control (RBAC) with 10 predefined roles and 255 permissions.

### Seed RBAC

```bash
tsx scripts/seed-rbac.ts
```

### Predefined Roles

| Role               | Description                                 |
| ------------------ | ------------------------------------------- |
| Super Admin        | Unrestricted access to everything           |
| Owner/Executive    | Read-only access to all financial data      |
| Operations Manager | Full inventory, orders, POs, vendors access |
| Sales Manager      | Full clients, orders, quotes access         |
| Accountant         | Full accounting, credits, COGS access       |
| Inventory Manager  | Full inventory, locations, transfers access |
| Buyer/Procurement  | Full POs, vendors, vendor supply access     |
| Customer Service   | Full clients, orders, returns access        |
| Warehouse Staff    | Receive POs, adjust/transfer inventory      |
| Read-Only Auditor  | Read-only access + full audit logs          |

### Super Admin Check

The `isSuperAdmin()` function checks:

1. Does user have "Super Admin" role in `user_roles` table? → Yes = Super Admin
2. Does user have `role='admin'` in `users` table? → Yes = Super Admin (fallback)

This fallback ensures the initial admin user has full access before RBAC is seeded.

---

## Important Notes

### Rate Limiting

The `/api/auth/login` REST endpoint is rate-limited to 5 requests per 15 minutes per IP.
For automated testing, use `pnpm get:auth-token` which uses the tRPC endpoint (`/api/trpc/auth.getTestToken`) and bypasses rate limiting.

### VIP Portal

VIP Portal has a separate authentication system (`vipPortalAuth` table).
The admin setup and test accounts do NOT affect VIP Portal access.
VIP Portal testing requires separate setup - see VIP Portal documentation.

### Audit Logging

All login/logout events and mutations are logged to the audit trail.
Test account activities will appear in audit logs.

### Public Demo User

The email `demo+public@terp-app.local` is reserved for the public demo user.
Do NOT use this email pattern for test accounts - all test accounts use `test-*@terp-app.local` format.

---

## Security Notes

### For Production with Real Customers

1. **Disable Test Auth**: Set `ENABLE_TEST_AUTH=false`
2. **Change Test Passwords**: Update or delete test accounts
3. **Use Strong Passwords**: Admin passwords should be 16+ characters
4. **Rotate Secrets**: Change `JWT_SECRET` regularly

### Cookie Security

- `httpOnly: true` - Prevents XSS access
- `secure: true` (production) - HTTPS only
- `sameSite: 'lax'` - CSRF protection
- 30-day expiry

---

## Troubleshooting

### "Invalid username or password"

1. Check the email is correct (case-sensitive)
2. Verify password was set correctly
3. Run `pnpm setup:admin email password` to reset

### "Test auth is not enabled in production"

Set `ENABLE_TEST_AUTH=true` in environment variables.

### RBAC Role Not Found

Run `tsx scripts/seed-rbac.ts` to seed RBAC tables.

### User Has No Permissions

1. Check if user has a role assigned in `user_roles` table
2. Users with `role='admin'` in `users` table bypass all checks

---

## QA Authentication for RBAC Validation

TERP provides a dedicated QA authentication system for deterministic role-based testing.

### Enable QA Auth

```bash
# .env
QA_AUTH_ENABLED=true
```

**Security**: QA auth is automatically disabled in production (`NODE_ENV=production`).

### Seed QA Accounts

```bash
pnpm seed:qa-accounts
```

### QA Accounts

| Email                        | Role              | Password      |
| ---------------------------- | ----------------- | ------------- |
| qa.superadmin@terp.test      | Super Admin       | TerpQA2026!   |
| qa.salesmanager@terp.test    | Sales Manager     | TerpQA2026!   |
| qa.salesrep@terp.test        | Sales Rep         | TerpQA2026!   |
| qa.inventory@terp.test       | Inventory Manager | TerpQA2026!   |
| qa.fulfillment@terp.test     | Fulfillment       | TerpQA2026!   |
| qa.accounting@terp.test      | Accounting        | TerpQA2026!   |
| qa.auditor@terp.test         | Read-Only Auditor | TerpQA2026!   |

### QA Auth API Endpoints

- **POST** `/api/qa-auth/login` - Login as QA user
- **GET** `/api/qa-auth/roles` - List available QA roles
- **GET** `/api/qa-auth/status` - Check if QA auth is enabled

### Full Documentation

See [docs/auth/QA_AUTH.md](./auth/QA_AUTH.md) for complete QA authentication documentation.

---

## Available Scripts

| Command                                        | Description                        |
| ---------------------------------------------- | ---------------------------------- |
| `pnpm setup:admin <email> <password>`          | Create/update admin user           |
| `pnpm seed:test-accounts`                      | Create test accounts for all roles |
| `pnpm seed:qa-accounts`                        | Create QA accounts for RBAC testing|
| `pnpm get:auth-token <email> <password> [url]` | Get auth token for automation      |
| `tsx scripts/seed-rbac.ts`                     | Seed RBAC roles and permissions    |

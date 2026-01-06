# Agent 6F: Authentication & God-Mode Setup

**Estimated Time**: 12-16 hours  
**Priority**: CRITICAL - Blocks all testing and development  
**Dependencies**: None (can start immediately)

---

## Mission

Fix the authentication system so that:
1. You (the owner) can access the production site with full "god-mode" Super Admin permissions
2. AI agents can authenticate and perform E2E testing via browser automation
3. Test accounts exist for each role to verify RBAC permissions

---

## Context

### Current Auth System
TERP uses a hybrid authentication system:
- **Manus OAuth**: Primary auth via `openId` from OAuth callback
- **JWT Sessions**: 30-day session tokens stored in `terp_session` cookie
- **RBAC**: Role-based access control with `roles`, `userRoles`, `permissions` tables
- **Super Admin**: Users with "Super Admin" role OR `role='admin'` in users table bypass all permission checks

### Current Problems
1. Owner may not be properly set up as Super Admin
2. No easy way for AI agents to authenticate for E2E testing
3. No test accounts for different roles
4. "Must be logged in" and "permission denied" errors appearing

### Key Files
- `server/_core/simpleAuth.ts` - JWT session management
- `server/_core/context.ts` - Request context creation
- `server/_core/permissionMiddleware.ts` - Permission checks
- `server/services/permissionService.ts` - isSuperAdmin() logic
- `server/routers/auth.ts` - Auth endpoints
- `drizzle/schema.ts` - User and role tables

---

## Prompt

```
You are working on the TERP cannabis ERP project.

## Setup
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install

## Your Mission: Fix Authentication & Create God-Mode Access

### Task 1: Create Dev Auth Bypass for Owner (4-6h)

The owner needs to access the production site with full Super Admin permissions without going through OAuth every time.

#### 1.1 Add Environment Variables
Add to `.env.example`:

```bash
# Development/Beta Auth Configuration
# ====================================
# Enable dev auth bypass (ONLY for development/beta - NEVER in customer production)
DEV_AUTH_ENABLED=false

# God-mode account credentials (when DEV_AUTH_ENABLED=true)
# This account gets Super Admin access automatically
DEV_ADMIN_EMAIL=admin@terp-app.local
DEV_ADMIN_PASSWORD=

# Auto-login as god-mode admin (skips login page entirely)
DEV_AUTO_LOGIN=false
```

#### 1.2 Create Dev Auth Router
Create `server/routers/devAuth.ts`:

```typescript
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { publicProcedure, router } from "../_core/trpc";
import { simpleAuth } from "../_core/simpleAuth";
import { env } from "../_core/env";
import { logger } from "../_core/logger";
import * as db from "../db";
import { getSessionCookieOptions } from "../_core/cookies";
import { COOKIE_NAME } from "@shared/const";

// Only enable in development/beta mode
const DEV_AUTH_ENABLED = process.env.DEV_AUTH_ENABLED === "true";
const DEV_ADMIN_EMAIL = process.env.DEV_ADMIN_EMAIL || "admin@terp-app.local";
const DEV_ADMIN_PASSWORD = process.env.DEV_ADMIN_PASSWORD;

export const devAuthRouter = router({
  /**
   * Dev login - bypasses OAuth for development/beta testing
   * Only available when DEV_AUTH_ENABLED=true
   */
  devLogin: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        password: z.string().min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!DEV_AUTH_ENABLED) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Dev auth is not enabled",
        });
      }

      // Check if this is the god-mode admin account
      const isGodMode = 
        input.email === DEV_ADMIN_EMAIL && 
        input.password === DEV_ADMIN_PASSWORD;

      if (!isGodMode) {
        // Try to find user by email and verify password
        const user = await db.getUserByEmail(input.email);
        if (!user || !user.loginMethod) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid credentials",
          });
        }

        const isValid = await simpleAuth.verifyPassword(
          input.password,
          user.loginMethod
        );

        if (!isValid) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
            message: "Invalid credentials",
          });
        }

        // Create session for regular user
        const token = simpleAuth.createSessionToken(user);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        logger.info({ msg: "Dev login successful", userId: user.id, email: user.email });

        return { success: true, user: { id: user.id, email: user.email, role: user.role } };
      }

      // God-mode login - create or get admin user
      let adminUser = await db.getUserByEmail(DEV_ADMIN_EMAIL);
      
      if (!adminUser) {
        // Create the god-mode admin user
        const openId = `dev-admin-${Date.now()}`;
        const passwordHash = await simpleAuth.hashPassword(DEV_ADMIN_PASSWORD!);
        
        adminUser = await db.upsertUser({
          openId,
          email: DEV_ADMIN_EMAIL,
          name: "God Mode Admin",
          role: "admin",
          loginMethod: passwordHash,
        });

        logger.info({ msg: "Created god-mode admin user", userId: adminUser?.id });
      }

      if (!adminUser) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create admin user",
        });
      }

      // Ensure user has admin role
      if (adminUser.role !== "admin") {
        await db.upsertUser({
          ...adminUser,
          role: "admin",
        });
      }

      // Create session
      const token = simpleAuth.createSessionToken(adminUser);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

      logger.info({ msg: "God-mode login successful", userId: adminUser.id });

      return { 
        success: true, 
        user: { 
          id: adminUser.id, 
          email: adminUser.email, 
          role: "admin",
          isGodMode: true,
        } 
      };
    }),

  /**
   * Check if dev auth is enabled
   */
  isDevAuthEnabled: publicProcedure.query(() => {
    return { enabled: DEV_AUTH_ENABLED };
  }),

  /**
   * Get auto-login token (for AI agents)
   * Returns a pre-authenticated session token for the specified test user
   */
  getTestToken: publicProcedure
    .input(
      z.object({
        role: z.enum(["admin", "manager", "staff", "viewer"]),
        secret: z.string(), // Must match DEV_ADMIN_PASSWORD for security
      })
    )
    .mutation(async ({ input }) => {
      if (!DEV_AUTH_ENABLED) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Dev auth is not enabled",
        });
      }

      if (input.secret !== DEV_ADMIN_PASSWORD) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Invalid secret",
        });
      }

      // Get or create test user for this role
      const testEmail = `test-${input.role}@terp-app.local`;
      let testUser = await db.getUserByEmail(testEmail);

      if (!testUser) {
        const openId = `test-${input.role}-${Date.now()}`;
        testUser = await db.upsertUser({
          openId,
          email: testEmail,
          name: `Test ${input.role.charAt(0).toUpperCase() + input.role.slice(1)}`,
          role: input.role === "admin" ? "admin" : "user",
          loginMethod: null,
        });
      }

      if (!testUser) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create test user",
        });
      }

      // Create session token
      const token = simpleAuth.createSessionToken(testUser);

      logger.info({ msg: "Test token generated", role: input.role, userId: testUser.id });

      return { 
        token,
        user: {
          id: testUser.id,
          email: testUser.email,
          role: testUser.role,
        },
        cookieName: COOKIE_NAME,
        instructions: `Set cookie: ${COOKIE_NAME}=${token}`,
      };
    }),
});
```

#### 1.3 Register the Router
In `server/routers.ts`, add:

```typescript
import { devAuthRouter } from './routers/devAuth';

// In appRouter object:
devAuth: devAuthRouter,
```

#### 1.4 Create Dev Login Page
Create `client/src/pages/DevLoginPage.tsx`:

```tsx
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Shield, AlertTriangle } from "lucide-react";

export default function DevLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const { data: devAuthStatus } = trpc.devAuth.isDevAuthEnabled.useQuery();
  const loginMutation = trpc.devAuth.devLogin.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        navigate("/");
      }
    },
    onError: (err) => {
      setError(err.message);
    },
  });

  if (devAuthStatus && !devAuthStatus.enabled) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Dev Auth Disabled
            </CardTitle>
            <CardDescription>
              Development authentication is not enabled on this server.
              Please use the standard OAuth login.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate("/login")} className="w-full">
              Go to Standard Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    loginMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-500" />
            Dev Login
          </CardTitle>
          <CardDescription>
            Development/Beta authentication bypass.
            <br />
            <span className="text-yellow-600 font-medium">
              ⚠️ Not for production use
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@terp-app.local"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button
              type="submit"
              className="w-full"
              disabled={loginMutation.isPending}
            >
              {loginMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
```

#### 1.5 Add Route
In `client/src/App.tsx`, add the route:

```tsx
import DevLoginPage from "./pages/DevLoginPage";

// Add route (before the catch-all):
<Route path="/dev-login" element={<DevLoginPage />} />
```

### Task 2: Create Test Account Seeding (4-6h)

Create test accounts for each role that AI agents can use for E2E testing.

#### 2.1 Create Test Account Seeder
Create `server/db/seed/testAccounts.ts`:

```typescript
import { getDb } from "../../db";
import { users, roles, userRoles } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { simpleAuth } from "../../_core/simpleAuth";
import { logger } from "../../_core/logger";

interface TestAccount {
  email: string;
  name: string;
  role: "admin" | "user";
  rbacRole: string;
  password: string;
}

const TEST_ACCOUNTS: TestAccount[] = [
  {
    email: "test-superadmin@terp-app.local",
    name: "Test Super Admin",
    role: "admin",
    rbacRole: "Super Admin",
    password: "TestSuperAdmin123!",
  },
  {
    email: "test-admin@terp-app.local",
    name: "Test Admin",
    role: "admin",
    rbacRole: "Admin",
    password: "TestAdmin123!",
  },
  {
    email: "test-manager@terp-app.local",
    name: "Test Manager",
    role: "user",
    rbacRole: "Manager",
    password: "TestManager123!",
  },
  {
    email: "test-staff@terp-app.local",
    name: "Test Staff",
    role: "user",
    rbacRole: "Staff",
    password: "TestStaff123!",
  },
  {
    email: "test-viewer@terp-app.local",
    name: "Test Viewer",
    role: "user",
    rbacRole: "Viewer",
    password: "TestViewer123!",
  },
];

export async function seedTestAccounts(): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new Error("Database not available");
  }

  logger.info({ msg: "Seeding test accounts..." });

  for (const account of TEST_ACCOUNTS) {
    try {
      // Check if user already exists
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, account.email))
        .limit(1);

      if (existing.length > 0) {
        logger.info({ msg: "Test account already exists", email: account.email });
        continue;
      }

      // Hash password
      const passwordHash = await simpleAuth.hashPassword(account.password);

      // Create user
      const openId = `test-${account.rbacRole.toLowerCase().replace(" ", "-")}-${Date.now()}`;
      
      await db.insert(users).values({
        openId,
        email: account.email,
        name: account.name,
        role: account.role,
        loginMethod: passwordHash,
      });

      // Get the created user
      const newUser = await db
        .select()
        .from(users)
        .where(eq(users.email, account.email))
        .limit(1);

      if (newUser.length === 0) {
        logger.error({ msg: "Failed to create test user", email: account.email });
        continue;
      }

      // Find the RBAC role
      const rbacRole = await db
        .select()
        .from(roles)
        .where(eq(roles.name, account.rbacRole))
        .limit(1);

      if (rbacRole.length > 0) {
        // Assign RBAC role
        await db.insert(userRoles).values({
          userId: newUser[0].id,
          roleId: rbacRole[0].id,
        }).onDuplicateKeyUpdate({ set: { roleId: rbacRole[0].id } });

        logger.info({ 
          msg: "Test account created with RBAC role", 
          email: account.email, 
          rbacRole: account.rbacRole 
        });
      } else {
        logger.warn({ 
          msg: "RBAC role not found, test account created without role", 
          email: account.email, 
          rbacRole: account.rbacRole 
        });
      }
    } catch (error) {
      logger.error({ msg: "Error creating test account", email: account.email, error });
    }
  }

  logger.info({ msg: "Test account seeding complete" });
}

// Export test account info for documentation
export const TEST_ACCOUNT_INFO = TEST_ACCOUNTS.map(({ email, name, rbacRole, password }) => ({
  email,
  name,
  rbacRole,
  password,
}));
```

#### 2.2 Add Seed Command
In `package.json`, add:

```json
"seed:test-accounts": "tsx server/db/seed/testAccounts.ts"
```

#### 2.3 Create Admin Endpoint to Seed Test Accounts
In `server/routers/admin.ts`, add:

```typescript
import { seedTestAccounts, TEST_ACCOUNT_INFO } from "../db/seed/testAccounts";

// Add to adminRouter:
seedTestAccounts: adminProcedure.mutation(async () => {
  await seedTestAccounts();
  return { 
    success: true, 
    accounts: TEST_ACCOUNT_INFO.map(a => ({ email: a.email, rbacRole: a.rbacRole }))
  };
}),

getTestAccounts: adminProcedure.query(() => {
  return TEST_ACCOUNT_INFO;
}),
```

### Task 3: Fix Existing Admin User (2-4h)

Ensure the owner's account has proper Super Admin access.

#### 3.1 Create Admin Fix Script
Create `scripts/fix-admin-access.ts`:

```typescript
import { getDb } from "../server/db";
import { users, roles, userRoles } from "../drizzle/schema";
import { eq } from "drizzle-orm";

async function fixAdminAccess() {
  const adminEmail = process.argv[2];
  
  if (!adminEmail) {
    console.error("Usage: tsx scripts/fix-admin-access.ts <admin-email>");
    process.exit(1);
  }

  console.log(`🔧 Fixing admin access for: ${adminEmail}`);

  const db = await getDb();
  if (!db) {
    console.error("❌ Database not available");
    process.exit(1);
  }

  // Find user
  const user = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail))
    .limit(1);

  if (user.length === 0) {
    console.error(`❌ User not found: ${adminEmail}`);
    process.exit(1);
  }

  const userId = user[0].id;
  console.log(`✅ Found user: ${user[0].name} (ID: ${userId})`);

  // Ensure user has admin role in users table
  if (user[0].role !== "admin") {
    await db
      .update(users)
      .set({ role: "admin" })
      .where(eq(users.id, userId));
    console.log("✅ Set users.role = 'admin'");
  } else {
    console.log("✅ users.role already 'admin'");
  }

  // Find Super Admin RBAC role
  const superAdminRole = await db
    .select()
    .from(roles)
    .where(eq(roles.name, "Super Admin"))
    .limit(1);

  if (superAdminRole.length === 0) {
    console.error("❌ Super Admin role not found in roles table");
    console.log("   Run the RBAC seeder first: pnpm seed:rbac");
    process.exit(1);
  }

  const roleId = superAdminRole[0].id;
  console.log(`✅ Found Super Admin role (ID: ${roleId})`);

  // Check if user already has Super Admin role
  const existingRole = await db
    .select()
    .from(userRoles)
    .where(eq(userRoles.userId, userId))
    .limit(1);

  if (existingRole.length > 0 && existingRole[0].roleId === roleId) {
    console.log("✅ User already has Super Admin role");
  } else {
    // Assign Super Admin role
    await db
      .insert(userRoles)
      .values({ userId, roleId })
      .onDuplicateKeyUpdate({ set: { roleId } });
    console.log("✅ Assigned Super Admin role");
  }

  console.log("\n🎉 Admin access fixed successfully!");
  console.log(`   User: ${adminEmail}`);
  console.log("   Role: Super Admin (bypasses all permission checks)");
  
  process.exit(0);
}

fixAdminAccess().catch(console.error);
```

#### 3.2 Add Script to package.json
```json
"fix:admin": "tsx scripts/fix-admin-access.ts"
```

### Task 4: Create AI Agent Auth Helper (2-4h)

Create a utility for AI agents to authenticate via API.

#### 4.1 Create Auth Helper Script
Create `scripts/ai-agent-auth.ts`:

```typescript
/**
 * AI Agent Authentication Helper
 * 
 * Usage:
 *   tsx scripts/ai-agent-auth.ts <role> <base-url>
 * 
 * Example:
 *   tsx scripts/ai-agent-auth.ts admin https://terp.example.com
 * 
 * This script:
 * 1. Calls the devAuth.getTestToken endpoint
 * 2. Returns the session cookie that can be used for browser automation
 */

const role = process.argv[2] as "admin" | "manager" | "staff" | "viewer";
const baseUrl = process.argv[3] || "http://localhost:5000";
const secret = process.env.DEV_ADMIN_PASSWORD;

if (!role || !["admin", "manager", "staff", "viewer"].includes(role)) {
  console.error("Usage: tsx scripts/ai-agent-auth.ts <role> [base-url]");
  console.error("  role: admin | manager | staff | viewer");
  console.error("  base-url: defaults to http://localhost:5000");
  process.exit(1);
}

if (!secret) {
  console.error("DEV_ADMIN_PASSWORD environment variable is required");
  process.exit(1);
}

async function getAuthToken() {
  const response = await fetch(`${baseUrl}/api/trpc/devAuth.getTestToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      json: { role, secret },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    console.error("Failed to get auth token:", error);
    process.exit(1);
  }

  const data = await response.json();
  const result = data.result.data.json;

  console.log("=== AI Agent Auth Token ===");
  console.log(`Role: ${result.user.role}`);
  console.log(`User ID: ${result.user.id}`);
  console.log(`Email: ${result.user.email}`);
  console.log("");
  console.log("Cookie to set:");
  console.log(`  ${result.cookieName}=${result.token}`);
  console.log("");
  console.log("For Playwright/Puppeteer:");
  console.log(`  await context.addCookies([{`);
  console.log(`    name: '${result.cookieName}',`);
  console.log(`    value: '${result.token}',`);
  console.log(`    domain: '${new URL(baseUrl).hostname}',`);
  console.log(`    path: '/'`);
  console.log(`  }]);`);
}

getAuthToken().catch(console.error);
```

### Task 5: Update Documentation (1-2h)

#### 5.1 Create Auth Documentation
Create `docs/AUTH_SETUP.md`:

```markdown
# TERP Authentication Setup

## Development/Beta Mode

### Enabling Dev Auth

Set these environment variables:

```bash
DEV_AUTH_ENABLED=true
DEV_ADMIN_EMAIL=your-email@example.com
DEV_ADMIN_PASSWORD=your-secure-password
```

### Accessing Dev Login

Navigate to `/dev-login` to use the development login page.

### God-Mode Access

When logging in with `DEV_ADMIN_EMAIL` and `DEV_ADMIN_PASSWORD`, you get:
- Automatic Super Admin role
- Bypasses all permission checks
- Full access to all features

## Test Accounts

For E2E testing, seed test accounts:

```bash
pnpm seed:test-accounts
```

This creates:

| Email | Role | RBAC Role | Password |
|-------|------|-----------|----------|
| test-superadmin@terp-app.local | admin | Super Admin | TestSuperAdmin123! |
| test-admin@terp-app.local | admin | Admin | TestAdmin123! |
| test-manager@terp-app.local | user | Manager | TestManager123! |
| test-staff@terp-app.local | user | Staff | TestStaff123! |
| test-viewer@terp-app.local | user | Viewer | TestViewer123! |

## AI Agent Authentication

For browser automation:

```bash
# Get auth token for a role
DEV_ADMIN_PASSWORD=your-password tsx scripts/ai-agent-auth.ts admin https://your-site.com
```

This returns a session cookie that can be set in Playwright/Puppeteer.

## Fixing Admin Access

If your account doesn't have proper admin access:

```bash
pnpm fix:admin your-email@example.com
```

## Security Notes

⚠️ **NEVER enable DEV_AUTH_ENABLED in customer production environments**

- Dev auth is for development and beta testing only
- Test accounts have known passwords
- God-mode bypasses all security checks
```

### Task 6: Verify Everything Works

1. `pnpm check` - Must pass
2. `pnpm build` - Must complete
3. Test dev login flow manually
4. Test AI agent auth script
5. Verify Super Admin can access all features

### Task 7: Create PR

```bash
git checkout -b feat/auth-godmode-setup
git add -A
git commit -m "feat(auth): add dev auth bypass and test accounts

- Add DEV_AUTH_ENABLED mode for development/beta
- Create /dev-login page for password-based auth
- Add god-mode admin account with Super Admin access
- Create test account seeder for E2E testing
- Add AI agent auth helper script
- Add fix-admin-access script for troubleshooting
- Document auth setup in docs/AUTH_SETUP.md"

git push origin feat/auth-godmode-setup
gh pr create --title "feat(auth): add dev auth bypass, god-mode, and test accounts" --body "..."
```

---

## Success Criteria

- [ ] DEV_AUTH_ENABLED=true allows password login at /dev-login
- [ ] God-mode account gets Super Admin access
- [ ] Test accounts can be seeded for each role
- [ ] AI agent auth script returns valid session cookie
- [ ] fix-admin-access script works
- [ ] pnpm check passes
- [ ] pnpm build passes
- [ ] Documentation is complete

---

## Files Created/Modified

| File | Change |
|------|--------|
| server/routers/devAuth.ts | NEW - Dev auth endpoints |
| server/routers.ts | Register devAuth router |
| client/src/pages/DevLoginPage.tsx | NEW - Dev login page |
| client/src/App.tsx | Add /dev-login route |
| server/db/seed/testAccounts.ts | NEW - Test account seeder |
| server/routers/admin.ts | Add test account endpoints |
| scripts/fix-admin-access.ts | NEW - Admin fix script |
| scripts/ai-agent-auth.ts | NEW - AI agent helper |
| docs/AUTH_SETUP.md | NEW - Auth documentation |
| .env.example | Add dev auth variables |
| package.json | Add new scripts |

---

## Merge Priority

**Merge FIRST** - This is critical for all testing and development work.

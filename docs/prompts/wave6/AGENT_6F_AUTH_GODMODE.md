# Agent 6F: Authentication & God-Mode Setup

**Estimated Time**: 8-12 hours  
**Priority**: CRITICAL - Blocks all testing and development  
**Dependencies**: None (can start immediately)

---

## Mission

Fix the authentication system so that:
1. The owner can access the production site with full "god-mode" Super Admin permissions
2. AI agents can authenticate and perform E2E testing via browser automation
3. Test accounts exist for each role to verify RBAC permissions

---

## Context

### Current Auth System (ALREADY EXISTS)
TERP already has a working password-based login system:
- **Login Page**: `/login` → `client/src/pages/Login.tsx`
- **Login API**: `POST /api/auth/login` → `server/_core/simpleAuth.ts`
- **Session Cookie**: `app_session_id` (defined in `shared/const.ts`)
- **Password Storage**: Bcrypt hash stored in `users.loginMethod` column
- **JWT Tokens**: 30-day expiry, signed with `JWT_SECRET`

### RBAC System
- **Super Admin Check**: Users with "Super Admin" role in `user_roles` table OR `role='admin'` in `users` table bypass ALL permission checks
- **Tables**: `roles`, `user_roles`, `permissions`, `role_permissions` (defined in `drizzle/schema-rbac.ts`)
- **userId in userRoles**: Uses `openId` (varchar), NOT numeric id

### Current Problems
1. Owner may not have password set in `loginMethod` field
2. Owner may not have Super Admin RBAC role assigned
3. No test accounts for different roles
4. No easy way for AI agents to get auth tokens

### Key Files
```
server/_core/simpleAuth.ts      - Login logic, password hashing, JWT creation
server/_core/context.ts         - Request context creation
server/_core/permissionMiddleware.ts - Permission checks
server/services/permissionService.ts - isSuperAdmin() logic
server/db.ts                    - getUserByEmail(), upsertUser()
drizzle/schema.ts               - users table
drizzle/schema-rbac.ts          - roles, userRoles tables
shared/const.ts                 - COOKIE_NAME = "app_session_id"
client/src/pages/Login.tsx      - Existing login page
```

---

## Prompt

```
You are working on the TERP cannabis ERP project.

## Setup
gh repo clone EvanTenenbaum/TERP
cd TERP
pnpm install

## Your Mission: Fix Authentication & Create God-Mode Access

### Task 1: Create Admin Setup/Fix Script (3-4h)

Create a script to set up or fix admin access for any user.

#### 1.1 Create the Script
Create `scripts/setup-admin.ts`:

```typescript
/**
 * Admin Setup Script
 * 
 * Usage:
 *   tsx scripts/setup-admin.ts <email> <password>
 * 
 * This script:
 * 1. Creates or updates a user with the given email
 * 2. Sets their password (bcrypt hashed)
 * 3. Sets users.role = 'admin'
 * 4. Assigns the "Super Admin" RBAC role
 */

import bcrypt from "bcrypt";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema";
import { roles, userRoles } from "../drizzle/schema-rbac";

async function main() {
  const email = process.argv[2];
  const password = process.argv[3];

  if (!email || !password) {
    console.error("Usage: tsx scripts/setup-admin.ts <email> <password>");
    console.error("Example: tsx scripts/setup-admin.ts admin@example.com MySecurePassword123!");
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("❌ Password must be at least 8 characters");
    process.exit(1);
  }

  console.log(`🔧 Setting up admin access for: ${email}`);

  // Connect to database
  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection, { schema: { ...schema, roles, userRoles }, mode: "default" });

  try {
    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);
    console.log("✅ Password hashed");

    // Check if user exists
    const existingUsers = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.email, email))
      .limit(1);

    let userId: number;
    let userOpenId: string;

    if (existingUsers.length > 0) {
      // Update existing user
      const user = existingUsers[0];
      userId = user.id;
      userOpenId = user.openId;

      await db
        .update(schema.users)
        .set({
          loginMethod: passwordHash,
          role: "admin",
        })
        .where(eq(schema.users.id, userId));

      console.log(`✅ Updated existing user (ID: ${userId})`);
    } else {
      // Create new user
      userOpenId = `admin-${Date.now()}`;
      
      await db.insert(schema.users).values({
        openId: userOpenId,
        email: email,
        name: "Admin User",
        loginMethod: passwordHash,
        role: "admin",
      });

      const newUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, email))
        .limit(1);

      userId = newUser[0].id;
      console.log(`✅ Created new user (ID: ${userId})`);
    }

    // Find Super Admin role
    const superAdminRoles = await db
      .select()
      .from(roles)
      .where(eq(roles.name, "Super Admin"))
      .limit(1);

    if (superAdminRoles.length === 0) {
      console.log("⚠️  Super Admin role not found in database");
      console.log("   Run RBAC seeder first: pnpm seed:rbac");
      console.log("   User can still login but may have limited permissions");
    } else {
      const roleId = superAdminRoles[0].id;

      // Check if user already has this role
      const existingRoles = await db
        .select()
        .from(userRoles)
        .where(eq(userRoles.userId, userOpenId))
        .limit(1);

      if (existingRoles.length > 0) {
        // Update existing role assignment
        await db
          .update(userRoles)
          .set({ roleId: roleId })
          .where(eq(userRoles.userId, userOpenId));
        console.log("✅ Updated Super Admin role assignment");
      } else {
        // Create new role assignment
        await db.insert(userRoles).values({
          userId: userOpenId,
          roleId: roleId,
          assignedBy: "setup-script",
        });
        console.log("✅ Assigned Super Admin role");
      }
    }

    console.log("\n🎉 Admin setup complete!");
    console.log(`   Email: ${email}`);
    console.log(`   Password: (as provided)`);
    console.log(`   Role: Super Admin`);
    console.log(`\n   Login at: /login`);

  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
```

#### 1.2 Add to package.json
```json
"scripts": {
  "setup:admin": "tsx scripts/setup-admin.ts"
}
```

### Task 2: Create Test Account Seeder (3-4h)

Create test accounts for E2E testing with different roles.

#### 2.1 Create Test Account Seeder
Create `server/db/seed/testAccounts.ts`:

```typescript
/**
 * Test Account Seeder
 * 
 * Creates test accounts for each RBAC role for E2E testing.
 * 
 * Usage:
 *   pnpm seed:test-accounts
 */

import bcrypt from "bcrypt";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
import mysql from "mysql2/promise";
import * as schema from "../../../drizzle/schema";
import { roles, userRoles } from "../../../drizzle/schema-rbac";

interface TestAccount {
  email: string;
  name: string;
  userRole: "admin" | "user";
  rbacRoleName: string;
  password: string;
}

const TEST_ACCOUNTS: TestAccount[] = [
  {
    email: "test-superadmin@terp-app.local",
    name: "Test Super Admin",
    userRole: "admin",
    rbacRoleName: "Super Admin",
    password: "TestSuperAdmin123!",
  },
  {
    email: "test-admin@terp-app.local",
    name: "Test Admin",
    userRole: "admin",
    rbacRoleName: "Admin",
    password: "TestAdmin123!",
  },
  {
    email: "test-manager@terp-app.local",
    name: "Test Manager",
    userRole: "user",
    rbacRoleName: "Manager",
    password: "TestManager123!",
  },
  {
    email: "test-staff@terp-app.local",
    name: "Test Staff",
    userRole: "user",
    rbacRoleName: "Staff",
    password: "TestStaff123!",
  },
  {
    email: "test-viewer@terp-app.local",
    name: "Test Viewer",
    userRole: "user",
    rbacRoleName: "Viewer",
    password: "TestViewer123!",
  },
];

async function seedTestAccounts() {
  console.log("🌱 Seeding test accounts...\n");

  const connection = await mysql.createConnection(process.env.DATABASE_URL!);
  const db = drizzle(connection, { schema: { ...schema, roles, userRoles }, mode: "default" });

  try {
    for (const account of TEST_ACCOUNTS) {
      console.log(`Creating: ${account.email} (${account.rbacRoleName})`);

      // Check if user exists
      const existing = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, account.email))
        .limit(1);

      if (existing.length > 0) {
        console.log(`  ⏭️  Already exists, skipping`);
        continue;
      }

      // Hash password
      const passwordHash = await bcrypt.hash(account.password, 10);

      // Create user
      const openId = `test-${account.rbacRoleName.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;

      await db.insert(schema.users).values({
        openId,
        email: account.email,
        name: account.name,
        loginMethod: passwordHash,
        role: account.userRole,
      });

      // Get the created user
      const newUser = await db
        .select()
        .from(schema.users)
        .where(eq(schema.users.email, account.email))
        .limit(1);

      if (newUser.length === 0) {
        console.log(`  ❌ Failed to create user`);
        continue;
      }

      // Find RBAC role
      const rbacRole = await db
        .select()
        .from(roles)
        .where(eq(roles.name, account.rbacRoleName))
        .limit(1);

      if (rbacRole.length > 0) {
        // Assign RBAC role
        await db.insert(userRoles).values({
          userId: openId,
          roleId: rbacRole[0].id,
          assignedBy: "test-seeder",
        });
        console.log(`  ✅ Created with ${account.rbacRoleName} role`);
      } else {
        console.log(`  ⚠️  Created but RBAC role "${account.rbacRoleName}" not found`);
      }
    }

    console.log("\n✅ Test account seeding complete!");
    console.log("\nTest Accounts:");
    console.log("─".repeat(70));
    console.log("Email                              | Role         | Password");
    console.log("─".repeat(70));
    for (const account of TEST_ACCOUNTS) {
      console.log(
        `${account.email.padEnd(34)} | ${account.rbacRoleName.padEnd(12)} | ${account.password}`
      );
    }
    console.log("─".repeat(70));

  } finally {
    await connection.end();
  }
}

seedTestAccounts().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
```

#### 2.2 Add to package.json
```json
"scripts": {
  "seed:test-accounts": "tsx server/db/seed/testAccounts.ts"
}
```

### Task 3: Create AI Agent Auth Helper (2-3h)

Create a helper for AI agents to get auth tokens programmatically.

#### 3.1 Create Auth Token Endpoint
Add to `server/routers/auth.ts`:

```typescript
import bcrypt from "bcrypt";

// Add this procedure to the authRouter:

/**
 * Get auth token for automated testing
 * Requires a valid email/password combination
 * Returns the session token that can be set as a cookie
 */
getTestToken: publicProcedure
  .input(
    z.object({
      email: z.string().email(),
      password: z.string(),
    })
  )
  .mutation(async ({ input }) => {
    // Only allow in non-production or when explicitly enabled
    const isTestMode = process.env.ENABLE_TEST_AUTH === "true" || process.env.NODE_ENV !== "production";
    
    if (!isTestMode) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Test auth is not enabled in production",
      });
    }

    // Find user
    const user = await db.getUserByEmail(input.email);
    if (!user || !user.loginMethod) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid credentials",
      });
    }

    // Verify password
    const isValid = await bcrypt.compare(input.password, user.loginMethod);
    if (!isValid) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Invalid credentials",
      });
    }

    // Create token
    const token = simpleAuth.createSessionToken(user);

    logger.info({ msg: "Test token generated", email: input.email });

    return {
      token,
      cookieName: COOKIE_NAME,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
    };
  }),
```

#### 3.2 Create CLI Script for AI Agents
Create `scripts/get-auth-token.ts`:

```typescript
/**
 * Get Auth Token for AI Agents
 * 
 * Usage:
 *   tsx scripts/get-auth-token.ts <email> <password> [base-url]
 * 
 * Example:
 *   tsx scripts/get-auth-token.ts test-admin@terp-app.local TestAdmin123! https://terp.example.com
 */

const email = process.argv[2];
const password = process.argv[3];
const baseUrl = process.argv[4] || "http://localhost:5000";

if (!email || !password) {
  console.error("Usage: tsx scripts/get-auth-token.ts <email> <password> [base-url]");
  process.exit(1);
}

async function getToken() {
  console.log(`🔐 Getting auth token for: ${email}`);
  console.log(`   Server: ${baseUrl}\n`);

  const response = await fetch(`${baseUrl}/api/trpc/auth.getTestToken`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      json: { email, password },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    console.error("❌ Failed to get token:", text);
    process.exit(1);
  }

  const data = await response.json();
  const result = data.result?.data?.json;

  if (!result?.token) {
    console.error("❌ No token in response:", JSON.stringify(data, null, 2));
    process.exit(1);
  }

  console.log("✅ Token obtained successfully!\n");
  console.log("Cookie Name:", result.cookieName);
  console.log("User:", result.user.email, `(${result.user.role})`);
  console.log("\n" + "─".repeat(60));
  console.log("TOKEN:");
  console.log(result.token);
  console.log("─".repeat(60));
  console.log("\nFor Playwright/Puppeteer:");
  console.log(`
await context.addCookies([{
  name: '${result.cookieName}',
  value: '${result.token}',
  domain: '${new URL(baseUrl).hostname}',
  path: '/'
}]);
`);
}

getToken().catch((err) => {
  console.error("❌ Error:", err.message);
  process.exit(1);
});
```

#### 3.3 Add to package.json
```json
"scripts": {
  "get:auth-token": "tsx scripts/get-auth-token.ts"
}
```

### Task 4: Add Environment Variables (30 min)

Add to `.env.example`:

```bash
# ============================================================================
# TEST/DEVELOPMENT AUTH
# ============================================================================
# Enable test auth token endpoint (for AI agent E2E testing)
# Set to "true" to enable auth.getTestToken endpoint
# WARNING: Only enable in development/staging, never in customer production
ENABLE_TEST_AUTH=false
```

### Task 5: Create Documentation (1h)

Create `docs/AUTH_SETUP.md`:

```markdown
# TERP Authentication Setup

## Quick Start: Set Up Admin Access

```bash
# Set your admin credentials
pnpm setup:admin your-email@example.com YourSecurePassword123!

# Login at /login with those credentials
```

## Test Accounts for E2E Testing

### Seed Test Accounts

```bash
pnpm seed:test-accounts
```

This creates accounts for each role:

| Email | Role | Password |
|-------|------|----------|
| test-superadmin@terp-app.local | Super Admin | TestSuperAdmin123! |
| test-admin@terp-app.local | Admin | TestAdmin123! |
| test-manager@terp-app.local | Manager | TestManager123! |
| test-staff@terp-app.local | Staff | TestStaff123! |
| test-viewer@terp-app.local | Viewer | TestViewer123! |

### Get Auth Token for AI Agents

1. Enable test auth in `.env`:
   ```bash
   ENABLE_TEST_AUTH=true
   ```

2. Get token:
   ```bash
   pnpm get:auth-token test-admin@terp-app.local TestAdmin123! https://your-site.com
   ```

3. Use in Playwright:
   ```typescript
   await context.addCookies([{
     name: 'app_session_id',
     value: '<token-from-script>',
     domain: 'your-site.com',
     path: '/'
   }]);
   ```

## How Authentication Works

1. **Login**: POST to `/api/auth/login` with `{ username, password }`
2. **Session**: JWT token stored in `app_session_id` cookie (30-day expiry)
3. **Super Admin**: Users with "Super Admin" RBAC role OR `role='admin'` in users table bypass all permission checks

## Security Notes

⚠️ **For Production with Real Customers:**
- Set `ENABLE_TEST_AUTH=false`
- Remove or change test account passwords
- Use strong, unique admin passwords
```

### Task 6: Verify Everything Works

1. Run `pnpm check` - Must pass
2. Run `pnpm build` - Must complete
3. Test admin setup script
4. Test login flow
5. Test auth token generation

### Task 7: Create PR

```bash
git checkout -b feat/auth-admin-setup
git add -A
git commit -m "feat(auth): add admin setup scripts and test accounts

- Add setup:admin script to create/fix admin access
- Add test account seeder for E2E testing
- Add auth.getTestToken endpoint for AI agents
- Add get:auth-token CLI script
- Document auth setup in docs/AUTH_SETUP.md

Closes: AUTH-SETUP"

git push origin feat/auth-admin-setup
gh pr create --title "feat(auth): add admin setup, test accounts, and AI agent auth" --body "..."
```

---

## Success Criteria

- [ ] `pnpm setup:admin email password` creates working admin account
- [ ] Admin can login at `/login` and access all features
- [ ] `pnpm seed:test-accounts` creates all test accounts
- [ ] Test accounts can login with documented passwords
- [ ] `pnpm get:auth-token` returns valid session token
- [ ] AI agent can use token to access protected routes
- [ ] `pnpm check` passes
- [ ] `pnpm build` passes
- [ ] Documentation is complete

---

## Files Created/Modified

| File | Change |
|------|--------|
| scripts/setup-admin.ts | NEW - Admin setup script |
| scripts/get-auth-token.ts | NEW - AI agent auth helper |
| server/db/seed/testAccounts.ts | NEW - Test account seeder |
| server/routers/auth.ts | ADD getTestToken procedure |
| docs/AUTH_SETUP.md | NEW - Auth documentation |
| .env.example | ADD ENABLE_TEST_AUTH |
| package.json | ADD new scripts |

---

## Important Notes

1. **Cookie Name**: Use `app_session_id` (from `shared/const.ts`), NOT `terp_session`
2. **userRoles.userId**: Uses `openId` (varchar), NOT numeric `id`
3. **Existing Login**: `/login` page already exists and works - don't create a new one
4. **Password Field**: Stored in `users.loginMethod` as bcrypt hash
```

---

## Merge Priority

**Merge FIRST** - This is critical for all testing and development work.

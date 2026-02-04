# QA Authentication Module

> Feature Documentation for QA Authentication Layer

**Feature ID:** AUTH-QA-001, AUTH-QA-002
**Module:** Authentication
**Status:** ✅ COMPLETE
**Completion Date:** 2026-02-04 (AUTH-QA-002 added DEMO_MODE)
**Branch:** `claude/qa-auth-layer-KpG9q`, `claude/refactor-login-roles-qlrDH`

---

## Quick Start: Demo Mode

**For production demo/internal deployments, set one environment variable:**

```bash
DEMO_MODE=true
```

This will:

- Auto-login all visitors as **Super Admin** (no login required)
- Show role switcher to test different roles
- Work in production `NODE_ENV`

---

## 1. Feature Overview

### Business Value

The QA Authentication Layer provides deterministic login capabilities for all RBAC roles, enabling:

- **Deterministic RBAC validation** - Test each role's permissions reliably
- **Full coverage runs** - Execute USER_FLOW_MATRIX across all 7 roles
- **Regression testing** - Automated testing with consistent credentials
- **No external dependencies** - Works without SSO/IdP infrastructure
- **Role isolation testing** - Verify permission boundaries between roles

### Problem Solved

Previously, QA testing required:

- SSO/magic-link authentication (not available in all environments)
- Manual role assignment for test users
- External IdP dependencies
- Risk of falling back to Public Demo mode

This module eliminates these blockers with deterministic, environment-controlled QA authentication.

---

## 2. Current Implementation Status

| Component          | Status      | Notes                                         |
| ------------------ | ----------- | --------------------------------------------- |
| Core Auth Service  | ✅ Complete | `server/_core/qaAuth.ts`                      |
| API Endpoints      | ✅ Complete | 3 endpoints under `/api/qa-auth/*`            |
| User Seed Script   | ✅ Complete | `server/db/seed/qaAccounts.ts`                |
| Environment Config | ✅ Complete | `QA_AUTH_ENABLED` flag                        |
| Audit Logging      | ✅ Complete | `QA_AUTH_LOGIN`, `QA_AUTH_ROLE_SWITCH` events |
| Role Switcher UI   | ✅ Complete | `QaRoleSwitcher` component on Login page      |
| Documentation      | ✅ Complete | 8 documentation locations updated             |

---

## 3. Database Schema

### Users Table (Existing)

QA users are stored in the standard `users` table:

```typescript
// drizzle/schema.ts
users: {
  id: int().primaryKey().autoincrement(),
  openId: varchar(64).unique(),        // e.g., "qa-super-admin-1704812345"
  email: varchar(320),                  // e.g., "qa.superadmin@terp.test"
  name: text(),                         // e.g., "QA Super Admin"
  loginMethod: varchar(64),             // bcrypt hash of "TerpQA2026!"
  role: enum('user', 'admin'),          // 'admin' for Super Admin
  lastSignedIn: timestamp()
}
```

### User Roles Table (Existing)

QA users are linked to RBAC roles:

```typescript
// drizzle/schema-rbac.ts
userRoles: {
  id: int().primaryKey(),
  userId: varchar(255),                 // matches users.openId
  roleId: int().references(roles.id),   // RBAC role
  assignedAt: timestamp(),
  assignedBy: varchar(255)              // "qa-seeder"
}
```

### Audit Logs Table (Existing)

QA login events are logged:

```typescript
// drizzle/schema.ts
auditLogs: {
  id: int().primaryKey(),
  actorId: int(),                       // user.id
  entity: varchar(50),                  // "QaAuth"
  entityId: int(),                      // user.id
  action: varchar(50),                  // "QA_AUTH_LOGIN"
  before: text(),                       // null
  after: text(),                        // null
  reason: text(),                       // JSON metadata
  createdAt: timestamp()
}
```

---

## 4. API Endpoints

### POST /api/qa-auth/login

Authenticate as a QA test user.

**Request:**

```json
{
  "email": "qa.superadmin@terp.test",
  "password": "TerpQA2026!"
}
```

**Response (200):**

```json
{
  "success": true,
  "user": {
    "name": "QA Super Admin",
    "email": "qa.superadmin@terp.test",
    "role": "Super Admin"
  },
  "qaContext": {
    "isQaUser": true,
    "role": "Super Admin",
    "description": "Unrestricted access to entire system"
  }
}
```

**Response (401):**

```json
{
  "error": "Invalid QA credentials"
}
```

**Response (403):**

```json
{
  "error": "QA authentication is not enabled",
  "hint": "Set QA_AUTH_ENABLED=true in your environment"
}
```

### GET /api/qa-auth/roles

List available QA roles for role switcher UI.

**Response (200):**

```json
{
  "enabled": true,
  "roles": [
    {
      "email": "qa.superadmin@terp.test",
      "name": "QA Super Admin",
      "role": "Super Admin",
      "description": "Unrestricted access to entire system"
    }
    // ... 6 more roles
  ],
  "password": "TerpQA2026!"
}
```

### GET /api/qa-auth/status

Check if QA authentication is enabled.

**Response (200):**

```json
{
  "enabled": true,
  "environment": "development"
}
```

---

## 5. User Flows

### Flow 1: QA Login via UI Role Switcher

```
1. Navigate to /login
2. QA Role Switcher appears (if QA_AUTH_ENABLED=true)
3. Select role from dropdown
4. Click "Login" button
5. System authenticates via /api/qa-auth/login
6. Session cookie set
7. Redirect to dashboard
8. User has role-specific permissions
```

### Flow 2: QA Login via Standard Form

```
1. Navigate to /login
2. Enter QA email (e.g., qa.salesmanager@terp.test)
3. Enter password: TerpQA2026!
4. Click "Sign in"
5. System authenticates via /api/auth/login
6. Session established with correct RBAC role
```

### Flow 3: QA Login via API (Automation)

```bash
# 1. Login
curl -X POST http://localhost:3000/api/qa-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"qa.salesmanager@terp.test","password":"TerpQA2026!"}' \
  -c cookies.txt

# 2. Use session cookie for subsequent requests
curl http://localhost:3000/api/trpc/clients.list \
  -b cookies.txt
```

### Flow 4: Role Switching During QA Session

```
1. Logout from current session
2. Navigate to /login
3. Select different QA role
4. Login
5. Verify different permissions apply
```

---

## 6. Gap Analysis

### Current State: Feature Complete

All planned functionality has been implemented:

| Requirement              | Status |
| ------------------------ | ------ |
| Login as any RBAC role   | ✅     |
| Deterministic password   | ✅     |
| Environment flag control | ✅     |
| Production safety        | ✅     |
| Audit logging            | ✅     |
| Role switcher UI         | ✅     |
| Documentation            | ✅     |

### Known Limitations

1. **Single password for all accounts** - By design for simplicity
2. **No SSO integration** - By design (bypass purpose)
3. **Manual role switching** - No in-session switching (logout required)

### Future Enhancements (Not Planned)

These could be added if needed:

1. **In-session role switching** - Switch roles without logout
2. **Ephemeral data sandbox** - Per-session isolated data
3. **Admin impersonation** - Super Admin → lower role
4. **Test data presets** - Auto-create test data per role

---

## 7. Security Considerations

### Production Safety

```typescript
// server/_core/qaAuth.ts
export function isQaAuthEnabled(): boolean {
  // DEMO_MODE explicitly enables QA auth in any environment
  if (process.env.DEMO_MODE === "true") {
    return true;
  }

  const enabled = process.env.QA_AUTH_ENABLED === "true";
  const isProduction = process.env.NODE_ENV === "production";

  // CRITICAL: QA_AUTH_ENABLED is ignored in production
  // Use DEMO_MODE=true for production demos
  if (isProduction && enabled) {
    logger.warn(
      "QA_AUTH_ENABLED ignored in production. Use DEMO_MODE=true instead."
    );
    return false;
  }

  return enabled;
}
```

### Environment Variables

| Variable               | Purpose                                   | Works in Production? |
| ---------------------- | ----------------------------------------- | -------------------- |
| `DEMO_MODE=true`       | Auto-login as Super Admin + role switcher | ✅ Yes               |
| `QA_AUTH_ENABLED=true` | Enable QA auth (dev/staging only)         | ❌ No                |

### Audit Trail

All QA logins are logged with:

- Timestamp
- User ID
- Email
- Role
- Environment
- IP address
- Auth method ("qa-auth")

### Rollback

Disable with:

```bash
DEMO_MODE=false
QA_AUTH_ENABLED=false
```

Or remove from environment entirely.

---

## 8. File Locations

### Core Implementation

| File                           | Purpose                             |
| ------------------------------ | ----------------------------------- |
| `server/_core/qaAuth.ts`       | Core service, routes, configuration |
| `server/db/seed/qaAccounts.ts` | QA user seeder                      |
| `server/_core/env.ts`          | Environment flag (`qaAuthEnabled`)  |
| `server/_core/index.ts`        | Route registration                  |
| `server/auditLogger.ts`        | Audit event types                   |

### Frontend

| File                                          | Purpose                 |
| --------------------------------------------- | ----------------------- |
| `client/src/components/qa/QaRoleSwitcher.tsx` | Role switcher component |
| `client/src/pages/Login.tsx`                  | Login page integration  |

### Documentation

| File                       | Purpose               |
| -------------------------- | --------------------- |
| `docs/auth/QA_AUTH.md`     | Primary documentation |
| `docs/qa/QA_PLAYBOOK.md`   | 7-step testing guide  |
| `docs/qa/README.md`        | QA docs index         |
| `docs/AUTH_SETUP.md`       | Auth setup reference  |
| `docs/reference/README.md` | Quick reference table |
| `.env.example`             | Environment template  |
| `CHANGELOG.md`             | Release notes         |

---

## 9. Commands

```bash
# Option A: Demo Mode (recommended for production demos)
echo "DEMO_MODE=true" >> .env

# Option B: QA Auth (dev/staging only)
echo "QA_AUTH_ENABLED=true" >> .env

# Seed RBAC (required first)
pnpm seed:rbac

# Seed QA accounts
pnpm seed:qa-accounts

# Start server
pnpm dev

# Check QA auth status
curl http://localhost:3000/api/qa-auth/status
```

### Available QA Accounts

| Email                     | Role              | Access                                |
| ------------------------- | ----------------- | ------------------------------------- |
| qa.superadmin@terp.test   | Super Admin       | Full access (auto-login in DEMO_MODE) |
| qa.salesmanager@terp.test | Sales Manager     | Clients, orders, quotes               |
| qa.salesrep@terp.test     | Customer Service  | Clients, orders, returns              |
| qa.inventory@terp.test    | Inventory Manager | Inventory, locations, transfers       |
| qa.fulfillment@terp.test  | Warehouse Staff   | Receive POs, adjustments              |
| qa.accounting@terp.test   | Accountant        | Accounting, credits, COGS             |
| qa.auditor@terp.test      | Read-Only Auditor | Read-only access, audit logs          |

**Password for all:** `TerpQA2026!`

---

## 10. Related Documentation

- [QA_AUTH.md](../../auth/QA_AUTH.md) - Complete QA auth guide
- [QA_PLAYBOOK.md](../../qa/QA_PLAYBOOK.md) - Testing playbook
- [USER_FLOW_MATRIX.csv](../../reference/USER_FLOW_MATRIX.csv) - Permission matrix
- [AUTH_SETUP.md](../../AUTH_SETUP.md) - General auth setup
- [schema-rbac.ts](../../../drizzle/schema-rbac.ts) - RBAC schema

# QA Authentication Layer

> Deterministic authentication for RBAC validation testing

## Overview

The QA Authentication Layer provides deterministic login capabilities for all RBAC roles without requiring SSO, magic-link authentication, or external identity providers. This enables:

- **Deterministic RBAC validation** - Test each role's permissions reliably
- **Full coverage runs** - Execute USER_FLOW_MATRIX across all roles
- **Regression testing** - Automated testing with consistent credentials
- **No external dependencies** - Works without SSO/IdP infrastructure

## Security

**CRITICAL**: QA Authentication is automatically disabled in production environments (`NODE_ENV=production`), even if `QA_AUTH_ENABLED=true` is set.

This feature should only be used in:
- Development (`NODE_ENV=development`)
- Staging
- QA environments
- Demo environments

## Quick Start

### 1. Enable QA Authentication

Add to your `.env` file:

```bash
QA_AUTH_ENABLED=true
```

### 2. Seed QA Accounts

```bash
# Ensure RBAC roles exist first
pnpm seed:rbac

# Create QA accounts
pnpm seed:qa-accounts
```

### 3. Start the Server

```bash
pnpm dev
```

### 4. Login as QA User

**Option A: Via QA Auth Endpoint**
```bash
curl -X POST http://localhost:3000/api/qa-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "qa.superadmin@terp.test", "password": "TerpQA2026!"}'
```

**Option B: Via Standard Login Form**
Use any QA email/password in the normal login form.

## QA Accounts Reference

| Email | Role | Permissions |
|-------|------|-------------|
| `qa.superadmin@terp.test` | Super Admin | Unrestricted access to entire system |
| `qa.salesmanager@terp.test` | Sales Manager | Full access to clients, orders, quotes, sales sheets |
| `qa.salesrep@terp.test` | Customer Service (Sales Rep) | Full access to clients, orders, returns, refunds |
| `qa.inventory@terp.test` | Inventory Manager | Full access to inventory, locations, transfers, product intake |
| `qa.fulfillment@terp.test` | Warehouse Staff (Fulfillment) | Can receive POs, adjust inventory, transfer inventory, process returns |
| `qa.accounting@terp.test` | Accountant | Full access to accounting, credits, COGS, bad debt |
| `qa.auditor@terp.test` | Read-Only Auditor | Read-only access to all modules, full access to audit logs |

**Password for all accounts**: `TerpQA2026!`

## API Endpoints

### POST /api/qa-auth/login

Authenticate as a QA user.

**Request:**
```json
{
  "email": "qa.superadmin@terp.test",
  "password": "TerpQA2026!"
}
```

**Response (Success):**
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

### GET /api/qa-auth/roles

List all available QA roles (for role switcher UI).

**Response:**
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
    // ... other roles
  ],
  "password": "TerpQA2026!"
}
```

### GET /api/qa-auth/status

Check if QA authentication is enabled.

**Response:**
```json
{
  "enabled": true,
  "environment": "development"
}
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `QA_AUTH_ENABLED` | Enable QA authentication | `false` |
| `NODE_ENV` | Environment (production disables QA auth) | `development` |

## Role-Permission Mapping

QA roles map to the following RBAC roles from `USER_FLOW_MATRIX.csv`:

| QA Account | RBAC Role | Permission Categories |
|------------|-----------|----------------------|
| qa.superadmin | Super Admin | ALL (bypasses permission checks) |
| qa.salesmanager | Sales Manager | clients:*, orders:*, quotes:*, pricing:* |
| qa.salesrep | Customer Service | clients:*, orders:*, returns:* |
| qa.inventory | Inventory Manager | inventory:*, batches:*, strains:*, products:* |
| qa.fulfillment | Warehouse Staff | orders:fulfill, inventory:adjust, inventory:transfer |
| qa.accounting | Accountant | accounting:*, invoices:*, credits:*, badDebt:* |
| qa.auditor | Read-Only Auditor | *:read, audit:* |

## Audit Logging

All QA authentication events are logged to the audit trail:

| Event Type | Description |
|------------|-------------|
| `QA_AUTH_LOGIN` | QA user logged in |
| `QA_AUTH_ROLE_SWITCH` | QA user switched roles |

Logged data includes:
- Timestamp
- User ID
- Email
- Role
- Environment
- IP address (if available)
- User agent (if available)

Query audit logs:
```sql
SELECT * FROM audit_logs
WHERE action IN ('QA_AUTH_LOGIN', 'QA_AUTH_ROLE_SWITCH')
ORDER BY created_at DESC;
```

## Troubleshooting

### QA Auth Not Working

1. **Check environment variable:**
   ```bash
   echo $QA_AUTH_ENABLED  # Should be "true"
   ```

2. **Check NODE_ENV:**
   ```bash
   echo $NODE_ENV  # Should NOT be "production"
   ```

3. **Check server logs:**
   Look for: `✅ QA authentication enabled (QA_AUTH_ENABLED=true)`

4. **Verify accounts exist:**
   ```bash
   pnpm seed:qa-accounts
   ```

### Role Permissions Not Working

1. **Verify RBAC seeding:**
   ```bash
   pnpm seed:rbac
   ```

2. **Check user-role assignment:**
   ```sql
   SELECT u.email, r.name as role
   FROM users u
   JOIN user_roles ur ON u.open_id = ur.user_id
   JOIN roles r ON ur.role_id = r.id
   WHERE u.email LIKE 'qa.%@terp.test';
   ```

### Password Not Accepted

The QA password is `TerpQA2026!` (case-sensitive). Ensure:
- No trailing whitespace
- Correct capitalization
- Using the QA auth endpoint or standard login

## Implementation Details

### Files

| File | Purpose |
|------|---------|
| `server/_core/qaAuth.ts` | Core QA auth service and routes |
| `server/db/seed/qaAccounts.ts` | QA account seeder |
| `server/_core/env.ts` | Environment variable handling |
| `server/auditLogger.ts` | Audit event types |

### Authentication Flow

```
1. User submits QA credentials
   ↓
2. isQaAuthEnabled() checks QA_AUTH_ENABLED && !production
   ↓
3. getQaRoleByEmail() validates email is QA account
   ↓
4. Password verified against QA_PASSWORD constant
   ↓
5. User created/retrieved from database
   ↓
6. RBAC role assigned if not already assigned
   ↓
7. JWT session token created
   ↓
8. Session cookie set
   ↓
9. Audit event logged
```

## Testing with QA Auth

### Manual Testing

1. Enable QA auth in `.env`
2. Login as desired role
3. Navigate to test feature
4. Verify access granted/denied per USER_FLOW_MATRIX

### Automated Testing

```typescript
// Example E2E test setup
import { qaAuth } from "../server/_core/qaAuth";

describe("RBAC Tests", () => {
  it("Sales Manager can create orders", async () => {
    // Login as Sales Manager
    const response = await fetch("/api/qa-auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: "qa.salesmanager@terp.test",
        password: "TerpQA2026!"
      })
    });

    // Test order creation
    // ...
  });
});
```

## Rollback

To disable QA authentication:

1. **Immediate**: Set `QA_AUTH_ENABLED=false` or restart with production NODE_ENV
2. **Permanent**: Remove QA_AUTH_ENABLED from .env

QA user accounts remain in the database but cannot authenticate without the flag enabled.

## Changelog

| Date | Change |
|------|--------|
| 2026-01-09 | Initial QA Authentication Layer implementation |

## Related Documentation

- [USER_FLOW_MATRIX.csv](../reference/USER_FLOW_MATRIX.csv) - Complete role-permission matrix
- [RBAC Schema](../../drizzle/schema-rbac.ts) - Database schema for roles/permissions
- [Permission Service](../../server/services/permissionService.ts) - Runtime permission checking

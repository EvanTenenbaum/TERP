# QA Playbook

> Step-by-step guide for QA testing with deterministic role authentication

## Quick Reference

| QA Email | Role | Password |
|----------|------|----------|
| `qa.superadmin@terp.test` | Super Admin | `TerpQA2026!` |
| `qa.salesmanager@terp.test` | Sales Manager | `TerpQA2026!` |
| `qa.salesrep@terp.test` | Sales Rep | `TerpQA2026!` |
| `qa.inventory@terp.test` | Inventory Manager | `TerpQA2026!` |
| `qa.fulfillment@terp.test` | Fulfillment | `TerpQA2026!` |
| `qa.accounting@terp.test` | Accounting Manager | `TerpQA2026!` |
| `qa.auditor@terp.test` | Read-Only Auditor | `TerpQA2026!` |

## 7-Step QA Testing Flow

### Step 1: Enable QA Authentication

```bash
# In your .env file
QA_AUTH_ENABLED=true
```

Or set via environment:
```bash
export QA_AUTH_ENABLED=true
```

### Step 2: Start Local or Connect to QA Deployment

**Local Development:**
```bash
pnpm dev
```

**QA Environment:**
Connect to your QA deployment URL (ensure QA_AUTH_ENABLED=true in that environment).

### Step 3: Choose Role and Login

**Via UI:**
1. Navigate to login page
2. Enter QA email (e.g., `qa.salesmanager@terp.test`)
3. Enter password: `TerpQA2026!`
4. Click Login

**Via API:**
```bash
curl -X POST http://localhost:3000/api/qa-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "qa.salesmanager@terp.test", "password": "TerpQA2026!"}'
```

### Step 4: Execute USER_FLOW_MATRIX Tests

Reference: `docs/reference/USER_FLOW_MATRIX.csv`

For each flow in the matrix:
1. Navigate to the UI entry path
2. Attempt the action
3. Verify expected behavior based on role permissions

**Example Test Cases:**

| Flow | Super Admin | Sales Manager | Auditor |
|------|-------------|---------------|---------|
| Create Client | PASS | PASS | BLOCKED |
| Delete Client | PASS | BLOCKED | BLOCKED |
| View Audit Log | PASS | BLOCKED | PASS |

### Step 5: Record PASS/FAIL/BLOCKED

Create a test results document:

```markdown
## Test Run: [Date] [Role]

### CRM Module
- [ ] List Clients: PASS/FAIL/BLOCKED
- [ ] Create Client: PASS/FAIL/BLOCKED
- [ ] Update Client: PASS/FAIL/BLOCKED
- [ ] Delete Client: PASS/FAIL/BLOCKED

### Orders Module
- [ ] Create Order: PASS/FAIL/BLOCKED
- [ ] Update Order: PASS/FAIL/BLOCKED
...
```

### Step 6: Capture Evidence

**Screenshots:**
- Capture UI state before and after actions
- Capture permission denied messages
- Capture any error states

**Console Logs:**
1. Open browser DevTools (F12)
2. Go to Console tab
3. Look for permission errors or API responses
4. Export relevant logs

**Network Logs:**
1. Open Network tab in DevTools
2. Filter by "trpc" or "api"
3. Capture request/response for failed operations

### Step 7: File Bug Tickets

For any FAIL results, create a ticket with:

```markdown
## Bug Report Template

**Title:** [Module] [Action] - [Expected vs Actual]

**Role:** qa.salesmanager@terp.test (Sales Manager)

**Steps to Reproduce:**
1. Login as Sales Manager
2. Navigate to /clients
3. Click "Create Client"
4. Fill form and submit

**Expected Result:**
Client should be created successfully (Sales Manager has clients:create permission)

**Actual Result:**
Error: "Permission denied" or unexpected behavior

**Evidence:**
- Screenshot: [attach]
- Console log: [attach]
- Network response: [attach]

**USER_FLOW_MATRIX Reference:**
Row 59: clients.create should be allowed for Sales Manager
```

## Testing Checklist by Role

### Super Admin (`qa.superadmin@terp.test`)

Super Admin bypasses all permission checks. Test:
- [ ] Can access all navigation items
- [ ] Can perform all CRUD operations
- [ ] Can access admin-only features
- [ ] Can modify RBAC roles/permissions

### Sales Manager (`qa.salesmanager@terp.test`)

- [ ] **Clients:** Full CRUD access
- [ ] **Orders:** Full CRUD access
- [ ] **Quotes:** Create, read, update
- [ ] **Pricing:** View and modify rules
- [ ] **Inventory:** Read-only (no create/delete)
- [ ] **Accounting:** No access

### Sales Rep (`qa.salesrep@terp.test`)

- [ ] **Clients:** Read, create orders
- [ ] **Orders:** Create, view own
- [ ] **Returns:** Process returns
- [ ] **Inventory:** Read-only
- [ ] **Accounting:** No access

### Inventory Manager (`qa.inventory@terp.test`)

- [ ] **Inventory:** Full CRUD access
- [ ] **Batches:** Full CRUD access
- [ ] **Products:** Full CRUD access
- [ ] **Strains:** Full CRUD access
- [ ] **Orders:** Read-only
- [ ] **Accounting:** No access

### Fulfillment (`qa.fulfillment@terp.test`)

- [ ] **Orders:** Fulfill, ship, deliver
- [ ] **Inventory:** Adjust, transfer
- [ ] **Pick/Pack:** Full access
- [ ] **Clients:** No access
- [ ] **Accounting:** No access

### Accounting Manager (`qa.accounting@terp.test`)

- [ ] **Accounting:** Full access
- [ ] **Invoices:** Full CRUD
- [ ] **Payments:** Record, reconcile
- [ ] **Bad Debt:** Write-off, reverse
- [ ] **Orders:** Read-only
- [ ] **Inventory:** No modify access

### Read-Only Auditor (`qa.auditor@terp.test`)

- [ ] **All Modules:** Read-only
- [ ] **Audit Logs:** Full access
- [ ] **No Create/Update/Delete:** Anywhere
- [ ] **Reports:** Can view all

## Regression Test Suites

### Suite 1: Core RBAC Validation

Test each role can only access their permitted features:

```bash
# Run automated RBAC tests
pnpm test:e2e --grep "RBAC"
```

### Suite 2: Permission Boundary Testing

Test that blocked actions return proper errors:

1. Login as restricted role
2. Attempt forbidden action via:
   - UI (should show disabled/hidden controls)
   - API (should return 403 Forbidden)

### Suite 3: Cross-Role Workflow

Test workflows that span multiple roles:

1. **Sales Manager** creates order
2. **Fulfillment** fulfills order
3. **Accounting** generates invoice
4. **Auditor** verifies audit trail

## Troubleshooting

### Can't Login as QA User

1. Check `QA_AUTH_ENABLED=true` is set
2. Verify not in production (`NODE_ENV !== production`)
3. Run `pnpm seed:qa-accounts` to create accounts
4. Check server logs for auth errors

### Permission Errors When Expected to Pass

1. Verify correct role is assigned
2. Run `pnpm seed:rbac` to ensure permissions exist
3. Check `USER_FLOW_MATRIX.csv` for expected behavior
4. Inspect permission service cache (may need restart)

### Role Switcher Not Showing

1. Verify QA auth is enabled
2. Check `/api/qa-auth/status` returns `enabled: true`
3. Clear browser cache and reload

## Related Documentation

- [QA_AUTH.md](../auth/QA_AUTH.md) - Full QA authentication documentation
- [USER_FLOW_MATRIX.csv](../reference/USER_FLOW_MATRIX.csv) - Complete permission matrix
- [RBAC Schema](../../drizzle/schema-rbac.ts) - Database schema

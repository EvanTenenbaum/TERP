# AGENT AUTH — RBAC, Permissions, Security & Audit

## AGENT IDENTITY
```
Agent Name: AUTH
Risk Level: 🔴 RED MODE
Primary Role: ALL ROLES (systematic testing)
Estimated Time: 30 minutes
Run Order: Phase 2 (after REGRESSION passes)
Matrix Rows: ~40 flows
```

## YOUR MISSION

Test every permission boundary. Verify that RBAC is enforced at BOTH the UI level AND the API level. UI hidden is NOT sufficient — API must also block.

**Remember: You are browser automation only. Claude API makes all pass/fail decisions.**

---

## CLAUDE API SYSTEM PROMPT FOR THIS AGENT

```
You are the QA analyst for TERP authentication and authorization testing. Manus is executing browser automation and reporting observations. Your job:

1. Analyze permission enforcement observations
2. Verify UI elements are hidden for unauthorized roles
3. CRITICAL: Verify API returns 403 for unauthorized actions (UI hidden is NOT enough)
4. Check audit trail entries for sensitive actions
5. Test session security
6. Assign severity: P0 for any auth bypass, P1 for audit gaps, P2 for UI-only issues

When Manus reports a permission test:
- If UI hidden but API not tested: Request API test
- If UI hidden AND API blocks: PASS
- If UI visible when should be hidden: P2 FAIL
- If API allows unauthorized action: P0 FAIL (CRITICAL SECURITY)

Repository: https://github.com/EvanTenenbaum/TERP
Focus files: server/middleware/auth*, server/routers/*/permissions
```

---

## ROLE-PERMISSION MATRIX TO TEST

```
| Permission              | SuperAdmin | SalesMgr | SalesRep | InvMgr | Fulfill | Accounting | Auditor |
|-------------------------|------------|----------|----------|--------|---------|------------|---------|
| clients:read            | ✅         | ✅       | ✅       | ✅     | ✅      | ✅         | ✅      |
| clients:create          | ✅         | ✅       | ✅       | ❌     | ❌      | ❌         | ❌      |
| clients:delete          | ✅         | ❌       | ❌       | ❌     | ❌      | ❌         | ❌      |
| orders:create           | ✅         | ✅       | ✅       | ❌     | ❌      | ❌         | ❌      |
| orders:fulfill          | ✅         | ❌       | ❌       | ❌     | ✅      | ❌         | ❌      |
| orders:cancel           | ✅         | ✅       | ❌       | ❌     | ❌      | ❌         | ❌      |
| inventory:adjust        | ✅         | ❌       | ❌       | ✅     | ✅      | ❌         | ❌      |
| accounting:invoices:create | ✅      | ✅       | ❌       | ❌     | ❌      | ✅         | ❌      |
| accounting:payments:record | ✅      | ❌       | ❌       | ❌     | ❌      | ✅         | ❌      |
| admin:users:manage      | ✅         | ❌       | ❌       | ❌     | ❌      | ❌         | ❌      |
| audit:read              | ✅         | ❌       | ❌       | ❌     | ❌      | ❌         | ✅      |
```

---

## TEST EXECUTION PROTOCOL

### PHASE 1: Login Verification for All Roles

For each role, verify login works:

```
TEST AUTH-LOGIN-001 through AUTH-LOGIN-007

ACTION:
1. Navigate to /sign-in
2. Login with role credentials
3. Observe successful login

CREDENTIALS:
- qa.superadmin@terp.test / TerpQA2026!
- qa.salesmanager@terp.test / TerpQA2026!
- qa.salesrep@terp.test / TerpQA2026!
- qa.inventory@terp.test / TerpQA2026!
- qa.fulfillment@terp.test / TerpQA2026!
- qa.accounting@terp.test / TerpQA2026!
- qa.auditor@terp.test / TerpQA2026!

OBSERVE AND REPORT:
- Login success/failure
- Any role-specific welcome message
- What navigation items are visible
- What dashboard widgets are visible

SEND TO CLAUDE FOR ANALYSIS
```

### PHASE 2: UI Permission Tests

For each ❌ in the matrix, test that UI element is hidden:

```
TEST AUTH-UI-001: Sales Rep cannot see Delete Client button

ACTION:
1. Login as qa.salesrep@terp.test
2. Navigate to /clients
3. Click on any client to open detail view
4. Look for Delete button

OBSERVE AND REPORT:
- Is there a Delete button visible?
- Is there a dropdown menu with Delete option?
- Screenshot of client detail page

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST AUTH-UI-002: Fulfillment cannot see Create Order button

ACTION:
1. Login as qa.fulfillment@terp.test
2. Navigate to /orders
3. Look for "New Order" or "+" button

OBSERVE AND REPORT:
- Is there a Create/New button visible?
- Screenshot of orders page header

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST AUTH-UI-003: Accounting cannot see Inventory Adjust

ACTION:
1. Login as qa.accounting@terp.test
2. Navigate to /inventory
3. Click on any batch
4. Look for Adjust Quantity button/action

OBSERVE AND REPORT:
- Is there an Adjust button?
- Is there a quantity edit field?
- Screenshot of batch detail

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST AUTH-UI-004: Sales Rep cannot see Admin menu

ACTION:
1. Login as qa.salesrep@terp.test
2. Look at main navigation
3. Look for Admin, Settings, Users links

OBSERVE AND REPORT:
- Is Admin section visible in nav?
- Can you see any user management links?
- Screenshot of full navigation

SEND TO CLAUDE FOR ANALYSIS
```

Continue for all ❌ cells in the matrix...

### PHASE 3: API Permission Tests [CRITICAL]

**This is the most important phase. UI hidden means nothing if API allows the action.**

For each UI permission test, also test the API directly:

```
TEST AUTH-API-001: Sales Rep cannot delete client via API

ACTION:
1. Login as qa.salesrep@terp.test
2. Open browser DevTools > Console
3. Find a client ID from the page (or use network tab)
4. Execute in console:
   fetch('/api/trpc/clients.delete', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({id: '[CLIENT_ID]'})
   }).then(r => r.json()).then(console.log)

OBSERVE AND REPORT:
- HTTP status code (should be 403)
- Response body
- Full error message
- Screenshot of console

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST AUTH-API-002: Fulfillment cannot create order via API

ACTION:
1. Login as qa.fulfillment@terp.test
2. Open DevTools > Console
3. Execute:
   fetch('/api/trpc/orders.create', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({
       clientId: '[ANY_CLIENT_ID]',
       lineItems: [{productId: '[ANY_PRODUCT]', quantity: 1}]
     })
   }).then(r => r.json()).then(console.log)

OBSERVE AND REPORT:
- HTTP status code (should be 403)
- Response body
- Was order created? (check /orders list)

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST AUTH-API-003: Auditor cannot create invoice via API

ACTION:
1. Login as qa.auditor@terp.test
2. Execute API call to create invoice
3. Observe response

OBSERVE AND REPORT:
- HTTP status code
- Error message
- Any invoice created?

SEND TO CLAUDE FOR ANALYSIS
```

Continue for ALL permission boundaries...

### PHASE 4: Direct URL Access Tests

```
TEST AUTH-URL-001: Sales Rep cannot access /admin/users by URL

ACTION:
1. Login as qa.salesrep@terp.test
2. Directly navigate to: /admin/users
3. Observe result

OBSERVE AND REPORT:
- What page loaded?
- Any "Access Denied" message?
- Were you redirected?
- If page loaded, what content is visible?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST AUTH-URL-002: Fulfillment cannot access /accounting/ledger by URL

ACTION:
1. Login as qa.fulfillment@terp.test
2. Navigate directly to: /accounting/ledger
3. Observe result

OBSERVE AND REPORT:
- What page loaded?
- Access denied or actual content?

SEND TO CLAUDE FOR ANALYSIS
```

### PHASE 5: Session Security Tests

```
TEST AUTH-SESS-001: Token expiration

ACTION:
1. Login as any user
2. Note the time
3. Leave session idle for 30 minutes (or check token expiry in localStorage)
4. Try to perform an action

OBSERVE AND REPORT:
- What is token expiry time in localStorage?
- After expiry, what happens?
- Auto-logout or silent failure?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST AUTH-SESS-002: Logout invalidates token

ACTION:
1. Login as any user
2. Copy the auth token from localStorage/cookies
3. Logout
4. Try to use the copied token via API call

OBSERVE AND REPORT:
- Does old token still work?
- What error if rejected?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST AUTH-SESS-003: Session fixation protection

ACTION:
1. Note session token before login
2. Login
3. Compare session token after login

OBSERVE AND REPORT:
- Did token change after login?
- Same token = vulnerability

SEND TO CLAUDE FOR ANALYSIS
```

### PHASE 6: Input Validation / XSS Tests

```
TEST AUTH-XSS-001: Script injection in client name

ACTION:
1. Login as qa.salesmanager@terp.test
2. Create new client with name: <script>alert('xss')</script>
3. Save
4. View the client detail page

OBSERVE AND REPORT:
- Did alert popup appear? (BAD)
- How is the name displayed?
- View page source - is it escaped?

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST AUTH-XSS-002: SQL injection in search

ACTION:
1. Use global search
2. Enter: '; DROP TABLE clients; --
3. Search

OBSERVE AND REPORT:
- Any errors?
- Application still working?
- Results normal?

SEND TO CLAUDE FOR ANALYSIS
```

### PHASE 7: Audit Trail Verification

```
TEST AUTH-AUDIT-001: Login creates audit entry

ACTION:
1. Note current time
2. Login as qa.superadmin@terp.test
3. Navigate to audit logs (if accessible)
4. Look for login event

OBSERVE AND REPORT:
- Is there an audit log section?
- Is login event recorded?
- What details captured? (user, IP, time, user agent)

SEND TO CLAUDE FOR ANALYSIS
```

```
TEST AUTH-AUDIT-002: Sensitive action creates audit entry

ACTION:
1. Login as qa.accounting@terp.test
2. Record a payment (or create invoice)
3. Check audit log

OBSERVE AND REPORT:
- Is the action logged?
- What fields captured?
- Is previous/new state recorded?

SEND TO CLAUDE FOR ANALYSIS
```

### PHASE 8: Actor Attribution Verification

```
TEST AUTH-ACTOR-001: createdBy comes from session, not input

ACTION:
1. Login as qa.salesmanager@terp.test
2. Create a client via API with spoofed createdBy:
   fetch('/api/trpc/clients.create', {
     method: 'POST',
     headers: {'Content-Type': 'application/json'},
     body: JSON.stringify({
       name: 'qa-e2e-[DATE]-auth-actor',
       isBuyer: true,
       createdBy: 'SPOOFED_USER_ID'  // Try to spoof
     })
   })
3. Query the created client and check createdBy

OBSERVE AND REPORT:
- What is the createdBy value on the created record?
- Is it the logged-in user or the spoofed value?

SEND TO CLAUDE FOR ANALYSIS
```

---

## SEVERITY GUIDE (for Claude's reference)

| Finding | Severity |
|---------|----------|
| API allows unauthorized mutation | P0 — CRITICAL SECURITY |
| API allows unauthorized read of sensitive data | P0 — CRITICAL SECURITY |
| Session token not invalidated on logout | P0 — CRITICAL SECURITY |
| XSS executes | P0 — CRITICAL SECURITY |
| SQL injection possible | P0 — CRITICAL SECURITY |
| Actor attribution can be spoofed | P0 — CRITICAL SECURITY |
| UI shows action but API correctly blocks | P2 — UI bug only |
| Audit trail missing for sensitive action | P1 — Compliance |
| Session doesn't expire | P1 — Security hygiene |

---

## FINAL REPORT FORMAT

```markdown
## AGENT AUTH — Final Report

### Summary
- Total Tests: [N]
- PASS: [N]
- FAIL: [N]
- BLOCKED: [N]

### Permission Matrix Verification
| Permission | UI Hidden | API Blocks | Status |
|------------|-----------|------------|--------|
| SalesRep:clients:delete | ✅ | ✅ | PASS |
| Fulfillment:orders:create | ✅ | ✅ | PASS |
| Auditor:invoices:create | ✅ | ❌ 200 OK | P0 FAIL |
...

### Security Findings
| ID | Test | Severity | Description |
|----|------|----------|-------------|
| AUTH-SEC-001 | XSS in client name | P0 | Script executed |
...

### Audit Trail Coverage
| Action | Logged | Details Captured |
|--------|--------|------------------|
| Login | ✅ | user, IP, time, agent |
| Payment | ❌ | NOT LOGGED |
...

AWAITING CLAUDE FINAL ANALYSIS
```

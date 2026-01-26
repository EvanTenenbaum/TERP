# AGENT REGRESSION — Smoke Tests & Deployment Validation

## AGENT IDENTITY
```
Agent Name: REGRESSION
Risk Level: 🟢 SAFE MODE
Primary Role: qa.superadmin@terp.test
Estimated Time: 15 minutes
Run Order: FIRST (before all other agents)
```

## YOUR MISSION

You are the gatekeeper. Your smoke tests determine if the application is stable enough for full QA. If you fail, all other agents stop.

**Remember: You are browser automation only. Claude API makes all pass/fail decisions.**

---

## CLAUDE API SYSTEM PROMPT FOR THIS AGENT

When calling Claude API, use this system prompt:

```
You are the QA analyst for TERP smoke tests. Manus is executing browser automation and reporting observations. Your job:

1. Analyze each observation against the expected behavior
2. Determine PASS/FAIL for each smoke test
3. If any critical test fails (SMOKE-001, SMOKE-003, SMOKE-013), declare SMOKE SUITE FAILED and instruct Manus to stop
4. Track cumulative results
5. After all 14 tests, provide final verdict: PASS (all green), WARN (1-2 non-critical fails), FAIL (critical fail or 3+ fails)

Critical tests that block all QA:
- SMOKE-001: Login succeeds
- SMOKE-003: Dashboard loads
- SMOKE-013: API health returns 200

Repository for code reference: https://github.com/EvanTenenbaum/TERP
```

---

## SMOKE TEST CHECKLIST

Execute these 14 tests in order. For each test, report observations to Claude API.

### SMOKE-001: Login Succeeds [CRITICAL]
```
ACTION:
1. Navigate to https://terp-app-b9s35.ondigitalocean.app/sign-in
2. Enter email: qa.superadmin@terp.test
3. Enter password: TerpQA2026!
4. Click login button
5. Wait up to 10 seconds

OBSERVE AND REPORT:
- Did login form appear?
- Any error messages?
- What URL are you on after login?
- Is there a user indicator (name, avatar)?
- Any console errors?

SEND TO CLAUDE FOR ANALYSIS
```

### SMOKE-002: Session Persists
```
ACTION:
1. After successful login, refresh the page (F5)
2. Wait for page load

OBSERVE AND REPORT:
- Are you still logged in?
- Did you get redirected to login?
- Is user indicator still visible?

SEND TO CLAUDE FOR ANALYSIS
```

### SMOKE-003: Dashboard Loads [CRITICAL]
```
ACTION:
1. Navigate to /dashboard (or click dashboard in nav)
2. Wait up to 10 seconds for full load

OBSERVE AND REPORT:
- Did the page load without error?
- What elements are visible? (cards, charts, numbers)
- Any loading spinners stuck?
- Any error messages or empty states?
- Console errors?

SEND TO CLAUDE FOR ANALYSIS
```

### SMOKE-004: KPIs Display
```
ACTION:
1. On dashboard, look for KPI widgets/cards
2. Note all numeric values displayed

OBSERVE AND REPORT:
- List each KPI card title and its value
- Any showing "N/A", "Error", "Loading" indefinitely?
- Any obviously wrong values (negative counts, etc)?

SEND TO CLAUDE FOR ANALYSIS
```

### SMOKE-005: Navigation - All Main Routes
```
ACTION:
1. Click each main navigation item in order:
   - Dashboard
   - Inventory
   - Clients
   - Orders
   - Quotes
   - Accounting
   - Admin (if visible)
2. Wait 3 seconds on each page

OBSERVE AND REPORT:
- For each route: URL, page title, did it load?
- Any routes that showed errors?
- Any routes that redirected unexpectedly?
- Any 404 pages?

SEND TO CLAUDE FOR ANALYSIS
```

### SMOKE-006: Clients List Loads
```
ACTION:
1. Navigate to /clients
2. Wait for list to populate

OBSERVE AND REPORT:
- Does the list show data?
- How many rows visible?
- Is there pagination?
- Any loading errors?

SEND TO CLAUDE FOR ANALYSIS
```

### SMOKE-007: Create Basic Client
```
ACTION:
1. Click "New Client" or "+" button
2. Fill in:
   - Name: qa-e2e-[TODAY'S DATE]-regression-001
   - Select "Buyer" checkbox
   - Leave other fields default
3. Click Save/Create

OBSERVE AND REPORT:
- Did form appear?
- Did save succeed?
- What message appeared?
- Can you see the new client in the list?
- Any validation errors?

SEND TO CLAUDE FOR ANALYSIS
```

### SMOKE-008: Inventory List Loads
```
ACTION:
1. Navigate to /inventory
2. Wait for list to populate

OBSERVE AND REPORT:
- Does the list show data?
- How many rows visible?
- Any error states?

SEND TO CLAUDE FOR ANALYSIS
```

### SMOKE-009: Orders List Loads
```
ACTION:
1. Navigate to /orders
2. Wait for list to populate

OBSERVE AND REPORT:
- Does the list show data?
- How many rows visible?
- Any filters visible?
- Any error states?

SEND TO CLAUDE FOR ANALYSIS
```

### SMOKE-010: Create Draft Order
```
ACTION:
1. Click "New Order" or "+" button
2. Select any client from dropdown
3. Add one line item (any product, qty: 1)
4. Save as Draft (do NOT confirm)

OBSERVE AND REPORT:
- Did form appear?
- Could you select a client?
- Could you add a line item?
- Did save succeed?
- What status does the order show?

SEND TO CLAUDE FOR ANALYSIS
```

### SMOKE-011: Accounting Invoices List
```
ACTION:
1. Navigate to /accounting/invoices (or Accounting > Invoices)
2. Wait for list to populate

OBSERVE AND REPORT:
- Does the page load?
- Is there an invoice list?
- Any error messages?

SEND TO CLAUDE FOR ANALYSIS
```

### SMOKE-012: Global Search Works
```
ACTION:
1. Find search bar (usually top nav) or press Cmd+K
2. Type "test" and press Enter
3. Wait for results

OBSERVE AND REPORT:
- Did search UI appear?
- Did results appear?
- What types of results? (clients, orders, etc)
- Any errors?

SEND TO CLAUDE FOR ANALYSIS
```

### SMOKE-013: API Health Endpoint [CRITICAL]
```
ACTION:
1. Open browser dev tools > Network tab
2. Navigate to /api/health or /api/trpc/health
   (Or check: https://terp-app-b9s35.ondigitalocean.app/api/health)
3. Observe response

OBSERVE AND REPORT:
- HTTP status code
- Response body
- Response time

SEND TO CLAUDE FOR ANALYSIS
```

### SMOKE-014: Logout Works
```
ACTION:
1. Find logout button/link (usually in user menu)
2. Click logout
3. Observe result

OBSERVE AND REPORT:
- Did logout succeed?
- What URL are you on now?
- Can you access /dashboard without re-login?

SEND TO CLAUDE FOR ANALYSIS
```

---

## FINAL REPORT TO CLAUDE

After all 14 tests, send this summary to Claude:

```markdown
## SMOKE TEST SUITE COMPLETE

### Results Summary
| Test | Status | Notes |
|------|--------|-------|
| SMOKE-001 Login | [PASS/FAIL] | [notes] |
| SMOKE-002 Session | [PASS/FAIL] | [notes] |
| SMOKE-003 Dashboard | [PASS/FAIL] | [notes] |
| SMOKE-004 KPIs | [PASS/FAIL] | [notes] |
| SMOKE-005 Navigation | [PASS/FAIL] | [notes] |
| SMOKE-006 Clients List | [PASS/FAIL] | [notes] |
| SMOKE-007 Create Client | [PASS/FAIL] | [notes] |
| SMOKE-008 Inventory List | [PASS/FAIL] | [notes] |
| SMOKE-009 Orders List | [PASS/FAIL] | [notes] |
| SMOKE-010 Create Order | [PASS/FAIL] | [notes] |
| SMOKE-011 Invoices List | [PASS/FAIL] | [notes] |
| SMOKE-012 Search | [PASS/FAIL] | [notes] |
| SMOKE-013 API Health | [PASS/FAIL] | [notes] |
| SMOKE-014 Logout | [PASS/FAIL] | [notes] |

### Critical Tests Status
- SMOKE-001: [status]
- SMOKE-003: [status]
- SMOKE-013: [status]

AWAITING FINAL VERDICT FROM CLAUDE
```

---

## SUCCESS CRITERIA (Claude will determine)

- **PASS**: All 14 tests pass → Other agents can proceed
- **WARN**: 1-2 non-critical tests fail → Other agents proceed with caution
- **FAIL**: Any critical test fails OR 3+ tests fail → STOP ALL AGENTS

---

## IF SMOKE FAILS

If Claude determines FAIL:
1. Document all failures with screenshots
2. Do NOT proceed with other agents
3. Report to human operator:
   - Which critical test(s) failed
   - Observed behavior
   - Timestamp
   - Recommendation: Fix blockers before QA

---

## TEST DATA CLEANUP

After tests complete (pass or fail):
1. Note the client created in SMOKE-007: `qa-e2e-[DATE]-regression-001`
2. Note the order created in SMOKE-010
3. These will be cleaned up in final cleanup phase

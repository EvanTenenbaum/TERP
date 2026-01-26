# TERP QA ORCHESTRATOR — Final Assembly Document

## HOW TO USE THIS SYSTEM

This document explains how to deploy the complete QA system using Manus for browser automation and Claude API for all analysis.

---

## QUICK START

### Step 1: Set Up Claude API Access

You will need to call Claude API for all analysis. Configure your API access:

```javascript
const CLAUDE_CONFIG = {
  apiKey: "your-api-key",  // Get from console.anthropic.com
  model: "claude-sonnet-4-20250514",
  endpoint: "https://api.anthropic.com/v1/messages"
};

async function askClaude(systemPrompt, userMessage) {
  const response = await fetch(CLAUDE_CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_CONFIG.apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: CLAUDE_CONFIG.model,
      max_tokens: 4096,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }]
    })
  });
  return response.json();
}
```

### Step 2: Deploy Agents in Order

```
PHASE 1: REGRESSION (smoke tests)
├── If FAIL → STOP ALL, report to human
└── If PASS → Continue to Phase 2

PHASE 2 (parallel):
├── AGENT AUTH
├── AGENT PLATFORM  
├── AGENT MONEY
└── AGENT CRM

PHASE 3 (after Phase 2):
├── AGENT INVENTORY
└── AGENT ORDERS

PHASE 4 (after Phase 3):
├── AGENT QUALITY
└── AGENT STRESS
```

### Step 3: For Each Agent

1. Open the agent prompt file (e.g., `AGENT_03_MONEY.md`)
2. Copy the Claude API System Prompt from that file
3. Execute each test in the agent's test list
4. For each test:
   - Execute the browser ACTION
   - Collect OBSERVATIONS
   - Send to Claude API for analysis
   - Record Claude's verdict

---

## AGENT FILES

| Agent | File | Priority | Risk |
|-------|------|----------|------|
| REGRESSION | `AGENT_01_REGRESSION.md` | Run First | 🟢 SAFE |
| AUTH | `AGENT_02_AUTH.md` | Phase 2 | 🔴 RED |
| MONEY | `AGENT_03_MONEY.md` | Phase 2 | 🔴 RED |
| INVENTORY | `AGENT_04_INVENTORY.md` | Phase 3 | 🔴 RED |
| ORDERS | `AGENT_05_ORDERS.md` | Phase 3 | 🔴 RED |
| CRM | `AGENT_06_CRM.md` | Phase 2 | 🟡 STRICT |
| PLATFORM | `AGENT_07_PLATFORM.md` | Phase 2 | 🟡 STRICT |
| QUALITY | `AGENT_08_QUALITY.md` | Phase 4 | 🟡 STRICT |
| STRESS | `AGENT_09_STRESS.md` | Phase 4 | 🔴 RED |

---

## TEST CREDENTIALS

Use these credentials for all testing:

| Email | Password | Role |
|-------|----------|------|
| qa.superadmin@terp.test | TerpQA2026! | Super Admin |
| qa.salesmanager@terp.test | TerpQA2026! | Sales Manager |
| qa.salesrep@terp.test | TerpQA2026! | Sales Rep |
| qa.inventory@terp.test | TerpQA2026! | Inventory Manager |
| qa.fulfillment@terp.test | TerpQA2026! | Warehouse Staff |
| qa.accounting@terp.test | TerpQA2026! | Accounting Manager |
| qa.auditor@terp.test | TerpQA2026! | Read-Only Auditor |

---

## APPLICATION UNDER TEST

- **Live URL**: https://terp-app-b9s35.ondigitalocean.app
- **Repository**: https://github.com/EvanTenenbaum/TERP
- **Documentation**: Repository `docs/` folder

---

## CLAUDE API CALL PATTERN

For every test, follow this pattern:

### 1. Before Test - Get Instructions

```javascript
const systemPrompt = `You are the QA analyst for TERP [DOMAIN]. 
Repository: https://github.com/EvanTenenbaum/TERP
[Insert domain-specific context from agent file]`;

const response = await askClaude(systemPrompt, 
  `I'm about to execute test ${testId}. 
   Test description: ${testDescription}
   What should I observe and report?`);
```

### 2. After Test - Report Observations

```javascript
const observation = `
## Observation Report
**Test ID:** ${testId}
**Timestamp:** ${new Date().toISOString()}

### Action Performed
${whatYouDid}

### Page State
- URL: ${currentUrl}
- Visible Content: ${keyText}

### Specific Values Observed
- Field A: ${valueA}
- Field B: ${valueB}
- Calculated Total: ${total}

### Console Errors
${consoleErrors || "None"}

### Network Requests
${relevantRequests}

AWAITING ANALYSIS
`;

const analysis = await askClaude(systemPrompt, observation);
// Claude returns: PASS/FAIL, severity, next steps
```

### 3. Record Result

Based on Claude's analysis, record:
- Test ID
- Status (PASS/FAIL/BLOCKED)
- Severity (if FAIL)
- Evidence (screenshots, etc.)
- Notes

---

## OBSERVATION REPORT TEMPLATE

Use this exact format when reporting to Claude:

```markdown
## Observation Report

**Test ID:** [e.g., MONEY-INV-005]
**Agent:** [e.g., MONEY]
**Timestamp:** [ISO 8601]

### Action Performed
[Exactly what you did - clicked X, entered Y, submitted Z]

### Page State
- URL: [Current browser URL]
- Title: [Page title]
- Visible Content: [Key text, numbers, messages on screen]

### Specific Values Observed
- Subtotal: $[value]
- Discount: $[value]
- Tax: $[value]
- Total: $[value]
[List all relevant numeric values]

### Network Requests (if relevant)
- Endpoint: [e.g., /api/trpc/accounting.invoices.create]
- Method: [POST]
- Status: [200/400/500]
- Response: [First 500 chars or key fields]

### Console Errors
[Any JavaScript errors, or "None"]

### Screenshot Description
[Describe what the screenshot shows, or attach filename]

---
AWAITING CLAUDE ANALYSIS
```

---

## SEVERITY DEFINITIONS

Claude will assign these severities:

| Severity | Definition | Action |
|----------|------------|--------|
| **P0** | Trust killer — financial/inventory/security wrong | Stop testing, fix immediately |
| **P1** | Operational blocker — core workflow broken | Fix within 24h |
| **P2** | Degraded experience — workaround exists | Fix within 1 week |
| **P3** | Paper cut — cosmetic/minor | Fix within sprint |

---

## FINAL REPORT STRUCTURE

After all agents complete, compile:

### 1. Executive Summary
```markdown
# TERP QA Sweep — [DATE]

## Summary
- Total Tests: XXX
- PASS: XXX (XX%)
- FAIL: XXX (XX%)
- BLOCKED: XXX (XX%)

## Critical Findings (P0)
[List all P0 issues]

## Recommendation
[Go/No-Go for deployment]
```

### 2. Agent Reports
Include each agent's final report.

### 3. Prioritized Fix List
```markdown
## Immediate Fixes (P0)
1. [Issue] - [Owner] - [ETA]

## This Week (P1)
1. [Issue] - [Owner] - [ETA]

## Backlog (P2/P3)
1. [Issue]
```

---

## KNOWN ISSUES (DO NOT RETEST)

These are documented issues. Mark as BLOCKED-known-issue:

| ID | Domain | Description |
|----|--------|-------------|
| P0-002 | Inventory | Flexible lot selection needed |
| P0-003 | Orders | RETURNED status not implemented |
| P1-001 | Accounting | Invoice void needs reason field |
| REL-002 | Inventory | Quantities need DECIMAL migration |
| REL-003 | Accounting | Money needs DECIMAL migration |

---

## TEST DATA RULES

**Prefix all test data**: `qa-e2e-YYYYMMDD-[agent]-[seq]`

Example: `qa-e2e-20260125-money-001`

**Safety rules**:
- NEVER modify records without qa-e2e- prefix
- NEVER delete production-like data
- If unsure, mark test as BLOCKED-unsafe-proddata

---

## TROUBLESHOOTING

### Claude says "I need more information"
→ Provide more specific observations, exact values, screenshots

### Test seems to pass but Claude says FAIL
→ Trust Claude's analysis, it's checking against business logic

### Cannot execute test (feature missing)
→ Mark as BLOCKED-no-ui or BLOCKED-missing-feature

### Rate limited on Claude API
→ Wait and retry, or use claude-haiku for simpler analyses

### Site is down
→ Mark all remaining tests as BLOCKED-site-down, stop sweep

---

## CONTACT

If issues arise during QA:
1. Document the blocker with screenshots
2. Note the exact test ID and agent
3. Report to human operator before proceeding

---

## ESTIMATED TIMELINE

| Phase | Duration | Agents |
|-------|----------|--------|
| Phase 1 | 15 min | REGRESSION |
| Phase 2 | 45 min | AUTH, PLATFORM, MONEY, CRM (parallel) |
| Phase 3 | 40 min | INVENTORY, ORDERS (parallel) |
| Phase 4 | 45 min | QUALITY, STRESS (parallel) |
| Compilation | 30 min | Final report |

**Total: ~3 hours** (with parallelization)

---

*TERP QA System v3.0 — Manus + Claude API*
*Prime Directive: Verification over persuasion*

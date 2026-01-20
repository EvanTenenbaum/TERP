# Work Surfaces Exhaustive Testing Suite

## Mission

You are a Senior QA Engineer executing a comprehensive testing suite for TERP Work Surfaces. Your goal is to identify bugs, errors, gaps, placeholders, incorrect logic, and architectural issues.

---

## CRITICAL: Execution Guardrails

**These rules prevent context overflow errors. Follow them exactly.**

### Rule 1: Batched Agent Execution
Launch agents in batches of **2-3 maximum**, not all at once.

### Rule 2: Sequential Output Retrieval
Call `TaskOutput` **one at a time**. Never call multiple TaskOutput in the same message.

### Rule 3: File-Based Results
Agents must write detailed findings to `docs/qa/outputs/`. Return only summaries.

### Rule 4: Incremental Context Loading
Load files **per-batch**, not all upfront. Never read all 9 Work Surface files at once.

### Rule 5: Create Output Directory First
```bash
mkdir -p docs/qa/outputs
```

---

## Phase 0: Minimal Context Load

Read ONLY these files to start:
```
docs/auth/QA_AUTH.md                           # Role definitions
docs/specs/ui-ux-strategy/ATOMIC_ROADMAP.md    # Work Surface specs
```

**DO NOT** read all Work Surface component files yet. Agents will read them as needed.

---

## Phase 1: Test Matrix (Reference Only)

### Work Surfaces to Test
1. OrdersWorkSurface
2. InvoicesWorkSurface
3. InventoryWorkSurface
4. ClientsWorkSurface
5. PurchaseOrdersWorkSurface
6. PickPackWorkSurface
7. ClientLedgerWorkSurface
8. QuotesWorkSurface
9. DirectIntakeWorkSurface

### QA Roles
- qa.superadmin, qa.salesmanager, qa.salesrep, qa.fulfillment
- qa.accounting, qa.inventory, qa.auditor

### States to Test
- Empty, Single Item, Many Items (100+), Loading, Error, Stale Data, Offline

### Feature Flags
- WORK_SURFACE_INTAKE, WORK_SURFACE_ORDERS, WORK_SURFACE_INVENTORY, WORK_SURFACE_ACCOUNTING

---

## Phase 2: Batched Agent Execution

### Batch 1: Static Analysis + RBAC

**Launch these 2 agents in parallel:**

#### Agent 1: Static Analysis
```
TASK: Analyze Work Surface components for code quality issues

FILES TO ANALYZE (read these within the agent):
- client/src/components/work-surface/*.tsx

CHECKS:
1. Search for: TODO, FIXME, HACK, XXX, PLACEHOLDER, NotImplemented
2. Search for: @ts-ignore, @ts-expect-error, any type usage
3. Search for: console.log, debugger statements
4. Search for: if (false), if (true), return null without loading state
5. Check for code duplication patterns

OUTPUT: Write detailed findings to docs/qa/outputs/static_analysis.md

RETURN FORMAT (under 300 tokens):
{
  "status": "complete",
  "totalIssues": <number>,
  "bySeverity": {"P0": N, "P1": N, "P2": N, "P3": N},
  "topFindings": ["file:line - description", "file:line - description", "file:line - description"]
}
```

#### Agent 2: RBAC Validation
```
TASK: Validate role-based access control for Work Surfaces

FILES TO READ:
- server/services/rbacDefinitions.ts
- docs/reference/USER_FLOW_MATRIX.csv (first 100 lines only)

CHECKS:
1. Verify each Work Surface checks permissions correctly
2. Identify any actions missing permission checks
3. Check for permission bypass vulnerabilities
4. Validate UI element hiding matches backend enforcement

OUTPUT: Write detailed findings to docs/qa/outputs/rbac_validation.md

RETURN FORMAT (under 300 tokens):
{
  "status": "complete",
  "violationsFound": <number>,
  "rolesChecked": ["role1", "role2"],
  "criticalIssues": ["description1", "description2"]
}
```

**After Batch 1 completes:**
1. Call TaskOutput for Agent 1, note summary
2. Call TaskOutput for Agent 2, note summary
3. Proceed to Batch 2

---

### Batch 2: Business Logic + tRPC Integration

**Launch these 2 agents in parallel:**

#### Agent 3: Business Logic Validation
```
TASK: Validate business rules in Work Surface components

BUSINESS RULES TO CHECK:

OrdersWorkSurface:
- Order total = sum(lineItem.quantity * lineItem.unitPrice) - discounts + taxes
- Status transitions: DRAFT -> CONFIRMED -> FULFILLED -> SHIPPED -> DELIVERED
- Cannot edit confirmed orders without manager approval

InvoicesWorkSurface:
- Invoice total matches order total (unless adjustments)
- Status transitions: DRAFT -> SENT -> VIEWED -> PARTIAL -> PAID (or VOID)
- Cannot void paid invoices

InventoryWorkSurface:
- Available = OnHand - Reserved - Quarantined
- Negative inventory prevented
- FIFO/LIFO costing applied

ClientLedgerWorkSurface:
- Balance = sum(debits) - sum(credits)
- Bad debt write-offs require accounting:manage permission

OUTPUT: Write detailed findings to docs/qa/outputs/business_logic.md

RETURN FORMAT (under 300 tokens):
{
  "status": "complete",
  "rulesChecked": <number>,
  "violations": <number>,
  "criticalIssues": ["description1", "description2"]
}
```

#### Agent 4: tRPC Integration Testing
```
TASK: Map and validate tRPC procedure usage in Work Surfaces

FILES TO REFERENCE:
- docs/reference/FLOW_GUIDE.md (scan for procedure names)

CHECKS:
1. List all tRPC procedures called by each Work Surface
2. Identify missing error handling for API calls
3. Check for proper loading states during fetches
4. Verify optimistic updates are correctly implemented
5. Check for stale data handling

OUTPUT: Write detailed findings to docs/qa/outputs/trpc_integration.md

RETURN FORMAT (under 300 tokens):
{
  "status": "complete",
  "proceduresMapped": <number>,
  "missingErrorHandling": <number>,
  "criticalIssues": ["description1", "description2"]
}
```

**After Batch 2 completes:**
1. Call TaskOutput for Agent 3, note summary
2. Call TaskOutput for Agent 4, note summary
3. Proceed to Batch 3

---

### Batch 3: Feature Flags + Flow Analysis

**Launch these 2 agents in parallel:**

#### Agent 5: Feature Flag Testing
```
TASK: Validate feature flag behavior for Work Surfaces

FILES TO READ:
- client/src/hooks/work-surface/useWorkSurfaceFeatureFlags.ts
- client/src/contexts/FeatureFlagContext.tsx
- server/services/seedFeatureFlags.ts

CHECKS:
1. Test each flag combination renders correct component
2. Check for flash of wrong content during flag changes
3. Verify graceful fallback when flags are disabled
4. Check localStorage/session handling of flags

FLAG COMBINATIONS (16 total):
- WORK_SURFACE_INTAKE: [true, false]
- WORK_SURFACE_ORDERS: [true, false]
- WORK_SURFACE_INVENTORY: [true, false]
- WORK_SURFACE_ACCOUNTING: [true, false]

OUTPUT: Write detailed findings to docs/qa/outputs/feature_flags.md

RETURN FORMAT (under 300 tokens):
{
  "status": "complete",
  "combinationsTested": 16,
  "issuesFound": <number>,
  "criticalIssues": ["description1", "description2"]
}
```

#### Agent 6: Golden Flow Analysis
```
TASK: Analyze golden user flows for correctness

GOLDEN FLOWS TO ANALYZE:

1. Intake -> Inventory Flow:
   - Direct intake creates inventory record
   - Proper vendor association
   - Location assignment
   - Quantity tracking

2. Client -> Order -> Invoice Flow:
   - Client selection/creation
   - Line item management
   - Pricing calculations
   - Invoice generation

3. Invoice -> Payment -> Reconciliation Flow:
   - Payment recording
   - Partial payment handling
   - Overpayment handling
   - Ledger updates

CHECKS:
1. Verify each flow step is implemented
2. Check for missing validation
3. Identify broken navigation between steps
4. Check data persistence between steps

OUTPUT: Write detailed findings to docs/qa/outputs/golden_flows.md

RETURN FORMAT (under 300 tokens):
{
  "status": "complete",
  "flowsAnalyzed": 3,
  "brokenSteps": <number>,
  "criticalIssues": ["description1", "description2"]
}
```

**After Batch 3 completes:**
1. Call TaskOutput for Agent 5, note summary
2. Call TaskOutput for Agent 6, note summary
3. Proceed to Batch 4

---

### Batch 4: Adversarial + Unit Test Analysis

**Launch these 2 agents in parallel:**

#### Agent 7: Adversarial Testing Analysis
```
TASK: Identify vulnerabilities through adversarial analysis

ADVERSARIAL SCENARIOS TO CHECK:

1. Concurrent Edit Detection:
   - Two users editing same record
   - Optimistic locking implementation
   - Conflict resolution UI

2. Rapid State Transitions:
   - Quick status changes
   - State machine enforcement
   - Race condition prevention

3. Privilege Escalation:
   - Direct URL navigation to restricted pages
   - API call permission enforcement
   - UI element visibility vs actual access

4. Data Integrity:
   - Inventory oversell prevention
   - Negative balance prevention
   - Orphaned record handling

5. Input Validation:
   - XSS in text fields
   - SQL injection patterns
   - Oversized inputs

OUTPUT: Write detailed findings to docs/qa/outputs/adversarial.md

RETURN FORMAT (under 300 tokens):
{
  "status": "complete",
  "scenariosChecked": 5,
  "vulnerabilities": <number>,
  "criticalIssues": ["description1", "description2"]
}
```

#### Agent 8: Unit Test Coverage Analysis
```
TASK: Analyze existing test coverage for Work Surfaces

CHECKS:
1. Find existing test files for Work Surface components
2. Identify untested components
3. Check test quality (assertions, edge cases)
4. List missing test scenarios

SEARCH PATTERNS:
- client/src/components/work-surface/__tests__/
- client/src/**/*.test.tsx
- client/src/**/*.spec.tsx

OUTPUT: Write detailed findings to docs/qa/outputs/unit_test_coverage.md

RETURN FORMAT (under 300 tokens):
{
  "status": "complete",
  "testFilesFound": <number>,
  "componentsCovered": <number>,
  "componentsTotal": 9,
  "criticalGaps": ["description1", "description2"]
}
```

**After Batch 4 completes:**
1. Call TaskOutput for Agent 7, note summary
2. Call TaskOutput for Agent 8, note summary
3. Proceed to Phase 3

---

## Phase 3: Result Aggregation

After all 8 agents complete, read the output files:

```bash
ls -la docs/qa/outputs/
```

Read each file and compile the final deliverables:

### Deliverable 1: QA_ISSUE_LEDGER.md
Create `docs/qa/QA_ISSUE_LEDGER.md` with all issues sorted by severity:

```markdown
# QA Issue Ledger - Work Surfaces

## P0 - Blockers
| ID | Component | File:Line | Description | Suggested Fix |
|----|-----------|-----------|-------------|---------------|

## P1 - Critical
...

## P2 - Important
...

## P3 - Minor
...
```

### Deliverable 2: COVERAGE_MATRIX.md
Create `docs/qa/COVERAGE_MATRIX.md`:

```markdown
# Test Coverage Matrix

| Work Surface | Static | RBAC | Logic | tRPC | Flags | Flows | Adversarial | Unit Tests |
|--------------|--------|------|-------|------|-------|-------|-------------|------------|
| Orders       | ✓/✗    | ✓/✗  | ✓/✗   | ✓/✗  | ✓/✗   | ✓/✗   | ✓/✗         | ✓/✗        |
...
```

### Deliverable 3: FIX_PATCH_SET.md (P0/P1 only)
Create `docs/qa/FIX_PATCH_SET.md` with code fixes for critical issues.

### Deliverable 4: RECOMMENDATIONS.md
Create `docs/qa/RECOMMENDATIONS.md` with architectural recommendations.

---

## Execution Checklist

Use this to track progress:

- [ ] Created docs/qa/outputs/ directory
- [ ] Read minimal context (QA_AUTH.md, ATOMIC_ROADMAP.md)
- [ ] Batch 1: Static Analysis + RBAC (2 agents)
- [ ] Retrieved Batch 1 results (one at a time)
- [ ] Batch 2: Business Logic + tRPC (2 agents)
- [ ] Retrieved Batch 2 results (one at a time)
- [ ] Batch 3: Feature Flags + Golden Flows (2 agents)
- [ ] Retrieved Batch 3 results (one at a time)
- [ ] Batch 4: Adversarial + Unit Tests (2 agents)
- [ ] Retrieved Batch 4 results (one at a time)
- [ ] Read all output files
- [ ] Created QA_ISSUE_LEDGER.md
- [ ] Created COVERAGE_MATRIX.md
- [ ] Created FIX_PATCH_SET.md
- [ ] Created RECOMMENDATIONS.md

---

## Success Criteria

Testing is COMPLETE when:
1. All 8 agents have completed successfully
2. All output files exist in docs/qa/outputs/
3. All 4 deliverables are created
4. No context overflow errors occurred

---

## Quick Start Command

```bash
claude --prompt "Execute docs/prompts/WORK_SURFACES_EXHAUSTIVE_TEST_PROMPT.md"
```

---

## Error Recovery

If context limit is approached:
1. Stop launching new agents
2. Ensure partial results are written to files
3. Start new session and resume from last completed batch
4. Read output files to recover progress

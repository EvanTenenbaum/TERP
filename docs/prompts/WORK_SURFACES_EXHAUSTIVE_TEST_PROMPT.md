# Claude Code Agent Prompt: Work Surfaces Exhaustive Testing Suite

## Mission

You are a Senior QA Engineer specializing in automated testing and code quality analysis. Your mission is to execute a comprehensive, randomized testing suite that validates every component, edge case, and integration point of the TERP Work Surfaces system.

**Objective:** Identify ALL bugs, errors, gaps, placeholders, pseudocode, incorrect business/systems logic, code duplication, and architectural issues across the Work Surfaces implementation.

---

## Phase 0: Context Loading

Before generating tests, you MUST read and internalize these critical documents:

### Required Reading (Read ALL in parallel)

```
docs/reference/FLOW_GUIDE.md           # All 1,414+ tRPC procedures by domain
docs/reference/USER_FLOW_MATRIX.csv    # Role-permission matrix
docs/qa/QA_PLAYBOOK.md                 # QA testing methodology
docs/auth/QA_AUTH.md                   # QA authentication system
docs/specs/ui-ux-strategy/ATOMIC_ROADMAP.md  # Work Surface specifications
```

### Work Surface Components (Read ALL)

```
client/src/components/work-surface/OrdersWorkSurface.tsx
client/src/components/work-surface/InvoicesWorkSurface.tsx
client/src/components/work-surface/InventoryWorkSurface.tsx
client/src/components/work-surface/ClientsWorkSurface.tsx
client/src/components/work-surface/PurchaseOrdersWorkSurface.tsx
client/src/components/work-surface/PickPackWorkSurface.tsx
client/src/components/work-surface/ClientLedgerWorkSurface.tsx
client/src/components/work-surface/QuotesWorkSurface.tsx
client/src/components/work-surface/DirectIntakeWorkSurface.tsx
```

### Supporting Infrastructure

```
client/src/hooks/work-surface/useWorkSurfaceFeatureFlags.ts
client/src/contexts/FeatureFlagContext.tsx
client/src/App.tsx  # Route wiring
server/services/rbacDefinitions.ts
server/services/seedFeatureFlags.ts
```

---

## Phase 1: Test Matrix Generation

Generate a comprehensive test matrix covering:

### 1.1 Work Surface × Role Matrix

For EACH Work Surface, test with EACH QA role:

| Work Surface              | Roles to Test                                                                          |
| ------------------------- | -------------------------------------------------------------------------------------- |
| OrdersWorkSurface         | qa.superadmin, qa.salesmanager, qa.salesrep, qa.fulfillment, qa.accounting, qa.auditor |
| InvoicesWorkSurface       | qa.superadmin, qa.accounting, qa.salesmanager, qa.auditor                              |
| InventoryWorkSurface      | qa.superadmin, qa.inventory, qa.fulfillment, qa.salesrep, qa.auditor                   |
| ClientsWorkSurface        | qa.superadmin, qa.salesmanager, qa.salesrep, qa.auditor                                |
| PurchaseOrdersWorkSurface | qa.superadmin, qa.inventory, qa.accounting, qa.auditor                                 |
| PickPackWorkSurface       | qa.superadmin, qa.fulfillment, qa.inventory, qa.auditor                                |
| ClientLedgerWorkSurface   | qa.superadmin, qa.accounting, qa.salesmanager, qa.auditor                              |
| QuotesWorkSurface         | qa.superadmin, qa.salesmanager, qa.salesrep, qa.auditor                                |
| DirectIntakeWorkSurface   | qa.superadmin, qa.inventory, qa.fulfillment, qa.auditor                                |

### 1.2 State Permutations

For EACH Work Surface, test these states:

- **Empty State**: No data exists
- **Single Item**: Exactly one record
- **Many Items**: 100+ records (pagination)
- **Loading State**: API latency simulation
- **Error State**: API failure simulation
- **Stale Data**: Data changed by another user
- **Offline State**: Network disconnection

### 1.3 Feature Flag Permutations

Test each flag combination:

```
WORK_SURFACE_INTAKE: [true, false]
WORK_SURFACE_ORDERS: [true, false]
WORK_SURFACE_INVENTORY: [true, false]
WORK_SURFACE_ACCOUNTING: [true, false]
```

This creates 16 permutations. For each, verify:

- Correct component renders (WorkSurface vs Legacy)
- No flash of wrong content
- Graceful fallback behavior

---

## Phase 2: Randomized User Flow Generation

### 2.1 Golden Flow Variants

Generate 50 randomized variations of each golden flow:

#### Golden Flow: Intake → Inventory

```typescript
interface IntakeFlowVariant {
  vendor: "existing" | "new" | "null";
  productType: "flower" | "concentrate" | "edible" | "preroll" | "other";
  quantity: "single" | "bulk" | "zero" | "negative" | "decimal" | "max_int";
  location: "default" | "custom" | "invalid" | "null";
  notes:
    | "empty"
    | "short"
    | "long_5000_chars"
    | "special_chars"
    | "sql_injection"
    | "xss";
  submitMethod: "button" | "keyboard_enter" | "keyboard_shortcut";
  interruptAt: "never" | "mid_form" | "after_validation" | "during_save";
}
```

#### Golden Flow: Client → Order → Invoice

```typescript
interface OrderFlowVariant {
  client: "existing_buyer" | "existing_seller" | "new" | "archived" | "null";
  items: "single" | "multiple" | "zero" | "max_100";
  pricing: "default" | "custom" | "negotiated" | "zero" | "negative";
  discount: "none" | "percentage" | "fixed" | "both" | "exceeds_total";
  paymentTerms: "net_30" | "net_60" | "cod" | "prepaid" | "custom";
  fulfillment: "immediate" | "scheduled" | "partial" | "backorder";
  invoiceGeneration: "auto" | "manual" | "skip";
}
```

#### Golden Flow: Invoice → Payment → Reconciliation

```typescript
interface PaymentFlowVariant {
  invoice: "single" | "multiple" | "partial" | "overpaid" | "void";
  paymentMethod: "cash" | "check" | "wire" | "credit" | "mixed";
  amount: "exact" | "partial" | "overpayment" | "zero" | "negative";
  timing: "immediate" | "delayed" | "past_due" | "future_dated";
  reconciliation: "auto" | "manual" | "skip";
}
```

### 2.2 Adversarial Flow Generation

Generate flows specifically designed to break things:

```typescript
interface AdversarialFlow {
  name: string;
  steps: AdversarialStep[];
}

const adversarialFlows: AdversarialFlow[] = [
  // Concurrent Edit Detection
  {
    name: "CONCURRENT_EDIT_RACE",
    steps: [
      { action: "OPEN_RECORD", user: "user_a", record: "order_123" },
      { action: "OPEN_RECORD", user: "user_b", record: "order_123" },
      {
        action: "MODIFY_FIELD",
        user: "user_a",
        field: "status",
        value: "confirmed",
      },
      {
        action: "MODIFY_FIELD",
        user: "user_b",
        field: "status",
        value: "cancelled",
      },
      { action: "SAVE", user: "user_a" },
      { action: "SAVE", user: "user_b" }, // Should detect conflict
    ],
  },

  // Rapid State Transitions
  {
    name: "RAPID_STATUS_CHANGE",
    steps: [
      { action: "CREATE_ORDER", status: "draft" },
      { action: "CHANGE_STATUS", to: "confirmed", delay: 0 },
      { action: "CHANGE_STATUS", to: "fulfilled", delay: 0 },
      { action: "CHANGE_STATUS", to: "shipped", delay: 0 },
      { action: "CHANGE_STATUS", to: "delivered", delay: 0 },
      // Should enforce state machine rules
    ],
  },

  // Permission Boundary Testing
  {
    name: "PRIVILEGE_ESCALATION_ATTEMPT",
    steps: [
      { action: "LOGIN", role: "qa.salesrep" },
      { action: "NAVIGATE", to: "/accounting/invoices" },
      { action: "ATTEMPT_CREATE_INVOICE" }, // Should be blocked
      { action: "ATTEMPT_VOID_INVOICE" }, // Should be blocked
      { action: "ATTEMPT_BAD_DEBT_WRITEOFF" }, // Should be blocked
    ],
  },

  // Data Integrity Stress
  {
    name: "INVENTORY_OVERSELL",
    steps: [
      { action: "SET_INVENTORY", batch: "batch_1", quantity: 10 },
      { action: "CREATE_ORDER", batch: "batch_1", quantity: 7 },
      { action: "CREATE_ORDER", batch: "batch_1", quantity: 5 }, // Should fail - only 3 left
    ],
  },

  // Keyboard Navigation Edge Cases
  {
    name: "KEYBOARD_TRAP_TEST",
    steps: [
      { action: "FOCUS_FIRST_INPUT" },
      { action: "TAB", count: 100 }, // Should cycle through all focusable elements
      { action: "SHIFT_TAB", count: 100 }, // Should cycle backward
      { action: "ESCAPE" }, // Should close modals/panels
      { action: "CTRL_S" }, // Should save
      { action: "CTRL_Z" }, // Should undo (if supported)
    ],
  },

  // Form Validation Bypass Attempts
  {
    name: "VALIDATION_BYPASS",
    steps: [
      { action: "OPEN_CREATE_FORM" },
      { action: "FILL_REQUIRED_FIELDS" },
      { action: "CLEAR_REQUIRED_FIELD", field: "clientId" },
      { action: "SUBMIT_VIA_KEYBOARD" }, // Should still validate
      { action: "SUBMIT_VIA_DIRECT_API" }, // Backend should also validate
    ],
  },
];
```

---

## Phase 3: Static Code Analysis

Run these analyses on ALL Work Surface files:

### 3.1 Placeholder Detection

```bash
# Search patterns
grep -rn "TODO\|FIXME\|HACK\|XXX\|PLACEHOLDER\|NotImplemented" client/src/components/work-surface/
grep -rn "throw new Error.*not implemented" client/src/components/work-surface/
grep -rn "// @ts-ignore\|// @ts-expect-error" client/src/components/work-surface/
grep -rn "any\s*[;,)]" client/src/components/work-surface/  # Untyped 'any'
```

### 3.2 Pseudocode/Incomplete Logic Detection

```bash
# Patterns suggesting incomplete implementation
grep -rn "if (false)\|if (true)\|return null.*//\|return undefined.*//\|console\.log\|debugger" client/src/components/work-surface/
grep -rn "\.length === 0.*return\|!data && return" client/src/components/work-surface/  # Early returns without loading states
```

### 3.3 Business Logic Validation

For EACH Work Surface, verify these business rules:

#### OrdersWorkSurface

- [ ] Order total = Σ(lineItem.quantity × lineItem.unitPrice) - discounts + taxes
- [ ] Status transitions follow: DRAFT → CONFIRMED → FULFILLED → SHIPPED → DELIVERED
- [ ] Cannot edit confirmed orders without manager approval
- [ ] Inventory decrements on fulfillment, not on order creation

#### InvoicesWorkSurface

- [ ] Invoice total = Order total (unless adjustments)
- [ ] Status transitions: DRAFT → SENT → VIEWED → PARTIAL → PAID (or VOID)
- [ ] Cannot void paid invoices
- [ ] Overdue status auto-applies after payment terms expire

#### InventoryWorkSurface

- [ ] Available = OnHand - Reserved - Quarantined
- [ ] Movements must have valid reason codes
- [ ] FIFO/LIFO costing applied correctly
- [ ] Negative inventory prevented (unless configured)

#### ClientLedgerWorkSurface

- [ ] Balance = Σ(debits) - Σ(credits)
- [ ] All transactions have audit trail
- [ ] Bad debt write-offs require accounting:manage permission
- [ ] Statement generation includes all transactions in period

### 3.4 Duplication Detection

```bash
# Find similar code blocks
npx jscpd client/src/components/work-surface/ --min-lines 10 --min-tokens 50 --reporters console

# Find similar component patterns
# Look for repeated fetch/state/render patterns that could be abstracted
```

---

## Phase 4: Integration Point Testing

### 4.1 tRPC Procedure Coverage

For EACH Work Surface, map and test ALL tRPC calls:

```typescript
interface TrpcCoverageMap {
  workSurface: string;
  procedures: {
    name: string;
    type: "query" | "mutation";
    tested: boolean;
    edgeCases: string[];
  }[];
}

// Example for OrdersWorkSurface
const ordersCoverage: TrpcCoverageMap = {
  workSurface: "OrdersWorkSurface",
  procedures: [
    {
      name: "orders.getAll",
      type: "query",
      tested: false,
      edgeCases: ["empty", "pagination", "filters"],
    },
    {
      name: "orders.getById",
      type: "query",
      tested: false,
      edgeCases: ["not_found", "deleted", "archived"],
    },
    {
      name: "orders.create",
      type: "mutation",
      tested: false,
      edgeCases: ["validation", "duplicate", "permission"],
    },
    {
      name: "orders.update",
      type: "mutation",
      tested: false,
      edgeCases: ["concurrent", "stale", "locked"],
    },
    {
      name: "orders.delete",
      type: "mutation",
      tested: false,
      edgeCases: ["has_invoice", "fulfilled", "permission"],
    },
    // ... all other procedures
  ],
};
```

### 4.2 Component Integration Matrix

Test these component interactions:

| Source Component          | Target Component        | Interaction             | Test Cases                                   |
| ------------------------- | ----------------------- | ----------------------- | -------------------------------------------- |
| OrdersWorkSurface         | InvoicesWorkSurface     | Generate Invoice        | Valid order, partial order, already invoiced |
| ClientsWorkSurface        | OrdersWorkSurface       | Create Order for Client | Active client, archived, credit hold         |
| InventoryWorkSurface      | OrdersWorkSurface       | Check Availability      | In stock, low stock, out of stock            |
| QuotesWorkSurface         | OrdersWorkSurface       | Convert to Order        | Valid quote, expired, rejected               |
| PurchaseOrdersWorkSurface | InventoryWorkSurface    | Receive Goods           | Full receipt, partial, damaged               |
| InvoicesWorkSurface       | ClientLedgerWorkSurface | Post to Ledger          | Auto-post, manual, reversed                  |

---

## Phase 5: Parallel Agent Execution

Launch these agents IN PARALLEL to execute the test suite:

### Agent 1: Static Analysis Agent

```
TASK: Run all static code analysis checks from Phase 3
OUTPUT: static_analysis_report.json
FOCUS: Placeholders, pseudocode, type safety, duplication
```

### Agent 2: Unit Test Generation Agent

```
TASK: Generate and run unit tests for each Work Surface
OUTPUT: unit_test_results.json
FOCUS: Component rendering, state management, event handlers
```

### Agent 3: Integration Test Agent

```
TASK: Test all tRPC procedure integrations
OUTPUT: integration_test_results.json
FOCUS: API contracts, error handling, edge cases
```

### Agent 4: RBAC Validation Agent

```
TASK: Test every role against every Work Surface action
OUTPUT: rbac_validation_results.json
FOCUS: Permission enforcement, UI hiding, API blocking
```

### Agent 5: Business Logic Agent

```
TASK: Validate all business rules from Phase 3.3
OUTPUT: business_logic_results.json
FOCUS: Calculations, state machines, constraints
```

### Agent 6: Golden Flow Agent

```
TASK: Execute all 150 golden flow variants
OUTPUT: golden_flow_results.json
FOCUS: End-to-end workflows, data integrity
```

### Agent 7: Adversarial Testing Agent

```
TASK: Execute all adversarial flows from Phase 2.2
OUTPUT: adversarial_results.json
FOCUS: Security, race conditions, edge cases
```

### Agent 8: Feature Flag Agent

```
TASK: Test all 16 feature flag permutations
OUTPUT: feature_flag_results.json
FOCUS: Correct rendering, fallback behavior, transitions
```

---

## Phase 6: Result Aggregation

After all agents complete, aggregate results into:

### 6.1 Issue Ledger Schema

```typescript
interface Issue {
  id: string;
  severity: "P0_BLOCKER" | "P1_CRITICAL" | "P2_IMPORTANT" | "P3_MINOR";
  category:
    | "BUG"
    | "ERROR"
    | "GAP"
    | "PLACEHOLDER"
    | "PSEUDOCODE"
    | "LOGIC"
    | "DUPLICATION"
    | "SECURITY"
    | "PERFORMANCE";
  component: string;
  file: string;
  line?: number;
  description: string;
  reproSteps: string[];
  expectedBehavior: string;
  actualBehavior: string;
  suggestedFix?: string;
  relatedIssues?: string[];
}
```

### 6.2 Coverage Report Schema

```typescript
interface CoverageReport {
  workSurface: string;
  componentsCovered: number;
  componentsTotal: number;
  proceduresCovered: number;
  proceduresTotal: number;
  rolesTested: string[];
  statesTested: string[];
  edgeCasesCovered: number;
  edgeCasesTotal: number;
  passRate: number;
}
```

---

## Phase 7: Output Requirements

Generate these deliverables:

### 7.1 QA_ISSUE_LEDGER.md

Complete list of all issues found, sorted by severity.

### 7.2 COVERAGE_MATRIX.md

Visual matrix showing test coverage across all dimensions.

### 7.3 FIX_PATCH_SET.md

For each P0/P1 issue, provide:

- Root cause analysis
- Proposed fix (code diff)
- Test to prevent regression

### 7.4 RECOMMENDATIONS.md

Architectural recommendations for:

- Code quality improvements
- Missing abstractions
- Performance optimizations
- Security hardening

---

## Execution Command

To run this testing suite:

```bash
# From project root
claude --prompt "Execute the Work Surfaces Exhaustive Testing Suite from docs/prompts/WORK_SURFACES_EXHAUSTIVE_TEST_PROMPT.md"
```

---

## Success Criteria

The testing suite is COMPLETE when:

1. [ ] ALL 9 Work Surfaces have been tested
2. [ ] ALL 7 QA roles have been tested against each surface
3. [ ] ALL 7 state permutations have been tested
4. [ ] ALL 16 feature flag permutations have been tested
5. [ ] ALL 150 golden flow variants have been executed
6. [ ] ALL adversarial flows have been executed
7. [ ] ALL tRPC procedures have coverage
8. [ ] Issue ledger is complete with severity ratings
9. [ ] Coverage report shows >95% coverage
10. [ ] Fix patches provided for all P0/P1 issues

---

## EXECUTE NOW

Begin Phase 0 by reading all required documents in parallel. Then proceed through each phase systematically, launching parallel agents where indicated. Report progress after each phase completion.

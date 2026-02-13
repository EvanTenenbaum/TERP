# TERP Third-Party QA Protocol v4.0

> **PURPOSE**: Independent adversarial QA protocol for TERP where depth is the baseline and preexisting defects are dispositioned explicitly (fix now vs roadmap) using effort and risk gates.

---

## What Changed in v4.0

v4.0 keeps the v3.0 five-lens adversarial model and adds one required capability:

- **Mandatory Preexisting-Issue Closure Logic**
  - Preexisting issues discovered during QA are not ignored.
  - They are fixed in the same QA cycle when feasible.
  - If they exceed scope (rabbit-hole or >30% extra effort), they are documented and added to roadmap per TERP operational protocol.

---

## CRITICAL: DEPTH IS MANDATORY

> If a reviewer says "go deeper" and finds additional high-confidence issues, QA was incomplete.

### Anti-Patterns This Protocol Prevents

| Bad Behavior                                | Why It Fails          | v4.0 Fix                                                 |
| ------------------------------------------- | --------------------- | -------------------------------------------------------- |
| Stopping after finding "enough" bugs        | Satisficing bias      | Mandatory completeness counts and trace coverage         |
| Pattern scan without call-chain tracing     | Surface-only review   | Required execution, state, and integration tracing       |
| Happy-path heavy testing                    | Confirmation bias     | Adversarial scenarios are mandatory and primary          |
| Ignoring preexisting defects                | Deferred quality debt | Mandatory fix/defer decision with effort thresholds      |
| Deferring difficult issues without artifact | Hidden risk           | Mandatory roadmap task with validation before completion |

### Exhaustion Principle

**QA is not complete until every reasonable avenue for failure has been explored and evidence has been collected.**

If you think "this is probably fine", treat that as a trigger to deepen analysis.

---

## SYSTEM ROLE

You are an **Adversarial QA Specialist** auditing the TERP webapp.

- Your job is to prove failure modes, not to confirm happy paths.
- You succeed when production-impacting issues are detected before release.
- You fail when known or discoverable issues escape.

**TERP Context**

- Production-intent ERP for THCA wholesale cannabis operations
- Stack: Next.js 14 + TypeScript + React 19 + tRPC + Drizzle ORM + MySQL
- Hosted on DigitalOcean App Platform
- RBAC and workflow-driven business logic

---

## PRIME DIRECTIVE

> **Verification Over Persuasion**
>
> Never assume correctness. Prove failure or prove exhaustive attempts to break the system failed.

---

## PHASE 0: INTAKE, MODE, AND BLAST RADIUS

### 0A) Classify Work Type

| Type                           | Examples                      |
| ------------------------------ | ----------------------------- |
| **A** Code/PR/Patch            | Bug fix, feature, refactor    |
| **B** Feature Spec/UX Flow     | New workflow, redesigned page |
| **C** Architecture/Integration | API contract, new service     |
| **D** Data Model/Schema        | Drizzle migration, new tables |
| **E** Mixed                    | Combination                   |

### 0B) Select Autonomy Mode

**SAFE MODE** (only if all true):

- Isolated module, low blast radius
- No auth, money, RBAC, migration, sensitive data
- Easy to test and rollback

**STRICT MODE** (default):

- Shared components/core flows
- State transitions/business logic
- DB/permissions/pricing/inventory/accounting
- API contract or validation changes

**RED MODE** (required):

- Auth/RBAC changes
- Payments/accounting/financial statements
- Inventory valuation/posting logic
- Migrations/schema change

When uncertain, escalate one mode higher.

### 0C) Map Blast Radius (Required Before Lens Work)

```text
[Changed Code]
  -> [Direct Dependencies]
  -> [Transitive Dependencies]
  -> [Reverse Dependencies]
  -> [Data Touched: tables/columns/state]
  -> [UI Surfaces and user flows]
  -> [Existing tests and coverage]
```

Output this dependency map before proceeding.

---

## PHASE 0.5: PREEXISTING-ISSUE BASELINE (NEW, MANDATORY)

Goal: separate regression issues from legacy issues and establish a fix/defer budget for preexisting findings.

### 0.5.1 Define Issue Origins

- **Regression Issue**: Introduced by current change.
- **Preexisting Issue**: Present before this change, discovered during this QA cycle.
- **Unknown Origin**: Insufficient evidence; treat as preexisting-until-proven-regression and continue investigation.

### 0.5.2 Establish Effort Budget for Preexisting Fixes

Estimate:

- `CFE` = Core QA fix effort (hours) for in-scope/regression findings.
- `PEB` = Preexisting Effort Budget = `CFE * 0.30` (30% cap).
- `PES` = Preexisting Effort Spent (starts at `0h`).

Rule:

- Preexisting issues can be fixed during this QA cycle only while `PES + issueEffort <= PEB`, unless a blocker override applies.

### 0.5.3 Rabbit-Hole Flags

A preexisting issue is **rabbit-hole class** if any are true:

- Requires unrelated domain deep dive (auth, accounting, inventory core) outside current blast radius
- Requires migration/backfill or high-risk data repair outside QA scope
- Requires multi-team architectural changes or new product/spec decision
- Requires broad refactor (>3 modules, or major unrelated code surgery)
- Adds >30% cumulative effort (`PES + issueEffort > PEB`)

Rabbit-hole class issues must be documented and moved to roadmap workflow.

### 0.5.4 Blocker Override

Regardless of 30% cap, **do not defer** if preexisting issue is:

- P0 security bypass
- P0 data loss/corruption
- P0 financial misstatement
- P0 cross-tenant data leak

For blocker overrides:

- Verdict is **NO-SHIP** until fixed or an explicit rollback/feature-disable mitigation is in place and approved.

---

## PHASE 1: FIVE-LENS DEEP ANALYSIS (MANDATORY)

Complete all five lenses. Skipping any lens = incomplete QA.

---

### LENS 1: STATIC PATTERN SCAN (Breadth)

Goal: find known-bad patterns across changed code, dependencies, and nearby modules in blast radius.

#### 1.1 CI-Blocked Patterns

```bash
grep -rn "ctx\.user\?\.id \|\| 1" --include="*.ts" --include="*.tsx"
grep -rn "ctx\.user\?\.id ?? 1" --include="*.ts" --include="*.tsx"
grep -rn "input\.createdBy\|input\.userId" --include="*.ts" --include="*.tsx"
grep -rn "db\.query\.vendors" --include="*.ts" --include="*.tsx"
grep -rn ": any\b" --include="*.ts" --include="*.tsx"
grep -rn "db\.delete(" --include="*.ts" --include="*.tsx"
grep -rn "\.catch\(\(\) =>\|\.catch\(e =>" --include="*.ts" --include="*.tsx"
```

#### 1.2 Incomplete Code Patterns

```bash
grep -rn "TODO\|FIXME\|XXX\|TBD\|HACK" --include="*.ts" --include="*.tsx"
grep -rn "throw new Error\(.[^)]*\)" --include="*.ts" --include="*.tsx"
grep -rn "console\.log\|console\.error" --include="*.ts" --include="*.tsx"
grep -rn "return \[\]\s*$\|return {}\s*$" --include="*.ts" --include="*.tsx"
grep -rn "// @ts-ignore\|// @ts-expect-error" --include="*.ts" --include="*.tsx"
```

#### 1.3 TERP-Specific Violations

```bash
grep -rn "vendorId\|vendor_id" --include="*.ts" --include="*.tsx"
grep -rn "customerId\b" --include="*.ts" --include="*.tsx"
grep -rn "mysqlEnum\(" --include="*.ts"
```

**Minimum requirement**: document every match. If zero matches, explicitly state scans run and paths scanned.

---

### LENS 2: EXECUTION PATH TRACING (Depth)

Goal: enumerate and trace every reachable path.

#### 2.1 Entry Point Inventory

| Entry Point    | Type     | Auth             | Inputs        |
| -------------- | -------- | ---------------- | ------------- |
| tRPC procedure | API      | role requirement | schema        |
| UI action      | user     | role requirement | form payload  |
| background job | schedule | n/a              | job params    |
| webhook        | external | token/signature  | payload       |
| direct import  | code     | n/a              | function args |

#### 2.2 Branch Coverage Trace

For each branch:

- Triggering input
- Test coverage status
- Throw/exception behavior
- State mutation behavior

#### 2.3 Error Path Trace

For each failure-prone operation:

| Operation       | Can Fail | Error Handled | User Surface | State After Failure |
| --------------- | -------- | ------------- | ------------ | ------------------- |
| DB query/write  | yes      | ?             | ?            | ?                   |
| External API    | yes      | ?             | ?            | ?                   |
| Validation      | yes      | ?             | ?            | ?                   |
| Parse/transform | yes      | ?             | ?            | ?                   |

**Minimum requirement**: every changed function has documented error paths.

---

### LENS 3: DATA FLOW ANALYSIS (State)

Goal: verify transformations and invariants.

#### 3.1 Input -> Transform -> Output Mapping

Check at each transform:

- null/undefined handling
- empty collections
- type coercion
- decimal precision/rounding

#### 3.2 State Mutation Audit

| State                | Modified Where | Condition   | Rollback |
| -------------------- | -------------- | ----------- | -------- |
| `order.status`       | file:line      | transition  | yes/no   |
| `inventory.quantity` | file:line      | fulfillment | yes/no   |
| `client.totalOwed`   | file:line      | posting     | yes/no   |

For each mutation, evaluate:

- partial failure behavior
- idempotency
- concurrency impact

#### 3.3 Invariant Verification (TERP Critical)

| Invariant                               | Verification          | Severity if Broken |
| --------------------------------------- | --------------------- | ------------------ |
| Inventory >= 0 (except backorder path)  | post-mutation check   | P0                 |
| Order total = sum(line items)           | recompute and compare | P0                 |
| Client.totalOwed = unpaid invoice sum   | reconciliation        | P0                 |
| Soft delete only for protected entities | no hard delete path   | P0                 |
| Actor attribution always present        | createdBy/updatedBy   | P0                 |

**Minimum requirement**: each invariant explicitly checked against changed and dependent code.

---

### LENS 4: ADVERSARIAL SCENARIO GENERATION (Attack)

Goal: break the system under malformed, concurrent, and malicious inputs.

#### 4.1 Input Fuzz Categories

- null/undefined
- empty
- boundary numeric/date
- type confusion
- injection payloads
- unicode/control chars
- oversized payloads
- duplicate/replay requests

#### 4.2 State-Based Attacks

- race conditions (double submit)
- stale read/write conflicts
- privilege escalation (role bypass)
- cross-tenant access attempts
- replay attack timing windows

#### 4.3 TERP Business Logic Attacks

- negative inventory creation
- line-item manipulation after status transitions
- discount/credit stacking
- backdated posting abuse
- orphaned references

**Minimum requirement**:

- Define at least **25** adversarial scenarios (raised from v3 minimum 20)
- Execute as many as feasible
- Record executed vs unexecuted with reason

---

### LENS 5: INTEGRATION & BLAST RADIUS (Ripple Effects)

Goal: catch failures emerging at boundaries and side-effect chains.

#### 5.1 Contract Verification

| Caller  | Callee  | Contract               | Runtime Validation |
| ------- | ------- | ---------------------- | ------------------ |
| UI      | tRPC    | schema                 | yes/no             |
| tRPC    | service | signature + invariants | yes/no             |
| service | Drizzle | query shape            | yes/no             |
| Drizzle | MySQL   | schema compatibility   | yes/no             |

#### 5.2 Side-Effect Inventory

| Side Effect        | Trigger       | Reversible | Failure Mode       |
| ------------------ | ------------- | ---------- | ------------------ |
| DB write           | submit        | maybe      | rollback / partial |
| cache invalidation | update        | yes        | stale view         |
| audit log          | mutation      | usually no | silent audit gap   |
| webhook/email      | status change | no         | retry/duplicate    |

#### 5.3 Downstream Cascade

```text
[Issue]
  -> [Immediate dependent behavior]
  -> [Reporting / analytics distortion]
  -> [User decision error]
  -> [Financial/compliance impact]
```

**Minimum requirement**: full cascade for each P0/P1 issue.

---

## PHASE 2: VERIFICATION EXECUTION

### Mandatory Commands

```bash
pnpm check
pnpm lint
pnpm test
pnpm build
```

If roadmap/session artifacts were touched:

```bash
pnpm roadmap:validate
pnpm validate:sessions
```

If deployment verification is in scope:

```bash
./scripts/watch-deploy.sh
./scripts/terp-logs.sh run 100 | grep -i "error"
curl https://terp-app-b9s35.ondigitalocean.app/health
```

### If Verification Cannot Run

1. Mark status **UNVERIFIED**
2. Provide exact steps to run locally
3. Do not claim correctness
4. List missing evidence needed for closure

---

## PHASE 3: ISSUE TRIAGE + PREEXISTING DISPOSITION ENGINE (NEW)

### 3.1 Severity Model

| Level          | Criteria                                                       | Examples                                |
| -------------- | -------------------------------------------------------------- | --------------------------------------- |
| **P0 BLOCKER** | Security hole, data loss, financial incorrectness, tenant leak | auth bypass, negative inventory exploit |
| **P1 MAJOR**   | Broken core flow, inconsistent business state                  | incorrect totals, broken posting        |
| **P2 MINOR**   | Edge case failure, non-critical inconsistency                  | empty-state or retry bug                |
| **P3 NIT**     | Maintainability/perf/style                                     | low-risk cleanup                        |

### 3.2 Classify Every Issue by Origin

- `REGRESSION`
- `PREEXISTING`
- `UNKNOWN` (must resolve or treat as preexisting with rationale)

### 3.3 Preexisting Fix/Defer Decision Table

For each preexisting issue:

| Check                               | Result | Action                            |
| ----------------------------------- | ------ | --------------------------------- |
| P0 blocker?                         | yes    | Fix now or NO-SHIP                |
| Rabbit-hole flag?                   | yes    | Defer to roadmap (document fully) |
| Effort within remaining 30% budget? | yes    | Fix now in QA cycle               |
| Effort exceeds remaining budget     | yes    | Defer to roadmap                  |

### 3.4 Budget Ledger (Required)

Maintain this table in QA output:

| Preexisting ID | Severity | Est (h) | Rabbit-Hole | Decision | Budget Before | Budget After |
| -------------- | -------: | ------: | ----------- | -------- | ------------: | -----------: |
| PX-001         |       P1 |     2.0 | No          | FIX NOW  |          3.0h |         1.0h |
| PX-002         |       P2 |     4.0 | Yes         | ROADMAP  |          1.0h |         1.0h |

### 3.5 Roadmap Escalation for Deferred Preexisting Issues (MANDATORY)

If preexisting issue is deferred:

1. Create or update roadmap task in `docs/roadmaps/MASTER_ROADMAP.md`
2. Use TERP-valid field formats:
   - `Status`: `ready|in-progress|complete|blocked`
   - `Priority`: `HIGH|MEDIUM|LOW`
   - `Estimate`: `4-8h`, `16h`, `2d`, etc.
3. Include problem statement, objectives (>=3), deliverables (>=5)
4. Link evidence from QA report
5. Run:

```bash
pnpm roadmap:validate
pnpm validate:sessions
```

6. If validation fails, roadmap update is incomplete and QA is not fully closed.

### 3.6 Required Defer Reason Codes

Use one or more:

- `RH_SCOPE_DIVERGENCE` (different subsystem rabbit-hole)
- `RH_ARCH_CHANGE` (requires architecture/spec change)
- `RH_DATA_MIGRATION` (requires migration/backfill)
- `BUDGET_EXCEEDED_30` (exceeds 30% cumulative effort cap)
- `DEPENDENCY_BLOCKED` (external dependency unresolved)

---

## PHASE 4: ISSUE DOCUMENTATION AND FIX EXECUTION

### 4.1 Issue Card Format (Mandatory)

```text
═══════════════════════════════════════════════════════════════
ISSUE: QA-XXX [SEVERITY] [ORIGIN: REGRESSION|PREEXISTING]
═══════════════════════════════════════════════════════════════

WHAT: One-line description

WHERE:
  File: path/to/file.ts
  Lines: 45-52
  Function: processOrder()

EVIDENCE:
  [Code snippet / test output / trace]

WHY IT BREAKS:
  [Mechanism and failure mode]

REPRODUCTION:
  1. Step one
  2. Step two
  3. Observe: [specific failure]

BLAST RADIUS:
  - Direct: [immediate impact]
  - Downstream: [cascade effects]

FIX:
  [Concrete code-level remediation]

VERIFY FIX:
  [Test, command, or trace proving resolution]

PREEXISTING DISPOSITION (if origin=PREEXISTING):
  - Rabbit-Hole: [Yes/No + reason]
  - Added Effort: [Xh]
  - Budget Check: [Within 30% / Exceeds 30%]
  - Final Decision: [FIX NOW / ROADMAP]
  - Roadmap Ref: [Task ID or N/A]

═══════════════════════════════════════════════════════════════
```

### 4.2 Fix Order Rules

1. Fix all P0 regressions
2. Fix all P0 preexisting blockers (or NO-SHIP with mitigation plan)
3. Fix P1 regressions
4. Fix P1/P2 preexisting issues while within remaining 30% budget and non-rabbit-hole
5. Defer remaining preexisting issues to roadmap with full artifacts

---

## PHASE 5: COMPLETENESS ENFORCEMENT

### 5.1 Mandatory Counts

| Category                         | Minimum                                         |
| -------------------------------- | ----------------------------------------------- |
| Execution paths traced           | ALL reachable paths                             |
| Error points documented          | ALL relevant operations                         |
| State mutations audited          | ALL relevant mutations                          |
| Integration boundaries checked   | ALL relevant boundaries                         |
| Adversarial scenarios defined    | >=25                                            |
| Adversarial scenarios executed   | As many feasible, with explicit skipped reasons |
| Preexisting issues dispositioned | 100% (fix or roadmap)                           |

### 5.2 Completeness Checklist

- [ ] Lens 1 complete (patterns scanned + documented)
- [ ] Lens 2 complete (paths/branches/errors traced)
- [ ] Lens 3 complete (data flow + invariants verified)
- [ ] Lens 4 complete (25+ scenarios generated, attempts logged)
- [ ] Lens 5 complete (contracts + side effects + cascade mapped)
- [ ] Verification commands executed and recorded
- [ ] Every preexisting issue either fixed or roadmap-filed
- [ ] Roadmap/session validations pass when roadmap/session changed
- [ ] No "probably fine" shortcuts

### 5.3 "Probably Fine" Stop Rule

When "probably fine" appears in reasoning:

1. Stop
2. Document why it seems fine
3. Generate 3 concrete failure hypotheses
4. Test each hypothesis
5. Proceed only after evidence review

---

## PHASE 6: OUTPUT FORMAT

### 6.1 Executive Summary

```text
QA COMPLETE: [YES/NO]
VERDICT: [SHIP / SHIP WITH CONDITIONS / NO-SHIP]
ISSUES FOUND: X P0, Y P1, Z P2, W P3
ORIGIN SPLIT: A regression, B preexisting, C unknown
PREEXISTING BUDGET: CFE=[Xh], PEB(30%)=[Yh], PES=[Zh], REMAINING=[Wh]
LENSES COMPLETED: [1,2,3,4,5]
CONFIDENCE: [HIGH/MEDIUM/LOW] + justification
```

### 6.2 Verification Results

```text
VERIFICATION RESULTS
════════════════════
TypeScript:  ✅ PASS | ❌ FAIL (X errors)
Lint:        ✅ PASS | ❌ FAIL (X warnings)
Tests:       ✅ PASS | ❌ FAIL (X/Y passing)
Build:       ✅ PASS | ❌ FAIL
E2E:         ✅ PASS | ❌ FAIL | ⬜ N/A
Deployment:  ✅ PASS | ❌ FAIL | ⬜ N/A
Roadmap:     ✅ PASS | ❌ FAIL | ⬜ N/A
Sessions:    ✅ PASS | ❌ FAIL | ⬜ N/A
```

### 6.3 Issue Ledger

- Group by severity
- Include origin and disposition metadata

### 6.4 Preexisting Disposition Ledger (Required)

| ID  | Severity | Rabbit-Hole | Effort | Decision | Reason Code | Roadmap Task |
| --- | -------- | ----------- | -----: | -------- | ----------- | ------------ |

### 6.5 Lens Summaries

For each lens:

- what was checked
- what was found
- what remains uncertain

### 6.6 Risk Register (STRICT/RED Required)

| Risk | Likelihood | Impact | Mitigation | Monitoring |
| ---- | ---------- | ------ | ---------- | ---------- |

### 6.7 Rollback Plan (STRICT/RED Required)

```text
IF: [rollback trigger condition]
THEN:
  1. [step]
  2. [step]
VERIFY: [how rollback success is verified]
```

---

## HARD RULES

1. Complete all five lenses
2. Meet minimum counts (including 25+ adversarial scenarios)
3. Evidence required for every claim
4. Preexisting findings are mandatory to disposition (fix or roadmap)
5. 30% cumulative effort budget applies to non-blocker preexisting fixes
6. Rabbit-hole preexisting issues must be roadmap-tracked
7. Run roadmap/session validators when roadmap/session files are changed
8. Do not declare SHIP with unresolved P0 blocker

---

## ANTI-SHORTCUT ENFORCEMENT

| Red Flag Phrase              | Required Counter-Action                       |
| ---------------------------- | --------------------------------------------- |
| "This looks fine"            | Trace full execution path                     |
| "Should work"                | Prove with test/trace                         |
| "Probably handles that"      | Execute targeted adversarial case             |
| "I didn't see issues"        | Expand scenario generation                    |
| "It's preexisting so ignore" | Apply disposition engine and document outcome |

---

## Roadmap Escalation Template for Deferred Preexisting Issues

Use this when adding deferred preexisting findings to `docs/roadmaps/MASTER_ROADMAP.md`:

```markdown
### BUG-XXX: [Short title from QA finding]

**Status:** ready
**Priority:** HIGH
**Estimate:** 4-8h
**Module:** `path/to/primary/module`
**Dependencies:** [Task IDs or None]
**Prompt:** `docs/prompts/BUG-XXX.md`
**Initiative:** QA-LEGACY-REMEDIATION (Phase N)

**Problem:**
Preexisting issue discovered during QA cycle [Session/Date]. Deferral reason: [reason code].

**Objectives:**

1. Reproduce and isolate failure path.
2. Implement fix preserving business invariants.
3. Add tests guarding regression and legacy failure mode.

**Deliverables:**

- [ ] Root-cause analysis captured
- [ ] Code fix implemented
- [ ] Tests added/updated
- [ ] Verification commands pass
- [ ] Roadmap status and notes updated
```

After adding:

```bash
pnpm roadmap:validate
pnpm validate:sessions
```

---

## BEGIN QA NOW

1. Classify mode and map blast radius.
2. Establish preexisting budget (`PEB = CFE * 0.30`).
3. Run all five lenses.
4. Execute verification commands.
5. Apply preexisting disposition engine to all legacy findings.
6. Fix what is in-bounds; roadmap anything out-of-bounds.
7. Validate roadmap/session artifacts if changed.
8. Publish report with full evidence and explicit verdict.

---
inclusion: always
---

# 🔬 Adaptive Expert QA Protocol

**Version**: 1.0  
**Last Updated**: 2025-12-19  
**Status**: MANDATORY - EXECUTE BEFORE EVERY COMMIT

---

## 🚨 CRITICAL: PRE-COMMIT GATE

**Before committing ANY output, you MUST run an Adaptive Expert QA pass.**

Your responsibility is to improve quality WITHOUT unnecessarily reducing velocity.

### Failure Modes (Both Are Failures)

| ❌ Over-Engineering                | ❌ Under-Engineering            |
| ---------------------------------- | ------------------------------- |
| Over-reviewing low-risk work       | Under-reviewing high-risk work  |
| Adding unnecessary complexity      | Missing critical edge cases     |
| Slowing velocity on throwaway code | Shipping broken production code |
| Refactoring exploratory work       | Ignoring data integrity issues  |

**You must explicitly classify the work, select the minimum sufficient QA severity, then execute it.**

---

## STEP 1 — WORK CLASSIFICATION (MANDATORY)

Before any QA, classify your work along ALL dimensions:

### 1) Work Type (Choose Primary)

| Type           | Description                            |
| -------------- | -------------------------------------- |
| `EXPLORATORY`  | Draft, throwaway, proof-of-concept     |
| `ITERATIVE`    | Implementation that will evolve        |
| `PRODUCTION`   | Production code, deployed to users     |
| `ARCHITECTURE` | System architecture or specification   |
| `FINANCIAL`    | Financial, compliance, or safety logic |
| `UX_CREATIVE`  | UX, design, or creative work           |
| `STRATEGIC`    | Strategic or decision-making document  |

### 2) Persistence

| Level       | Description                          |
| ----------- | ------------------------------------ |
| `EPHEMERAL` | Likely discarded                     |
| `ITERATIVE` | Will evolve over time                |
| `DURABLE`   | Intended to persist or be built upon |

### 3) Risk of Error

| Level    | Impact                                          |
| -------- | ----------------------------------------------- |
| `LOW`    | Minor inconvenience only                        |
| `MEDIUM` | Rework, confusion, wasted time or money         |
| `HIGH`   | Data loss, financial impact, safety, reputation |

### 4) Downstream Consumers

| Audience      | Description                               |
| ------------- | ----------------------------------------- |
| `AUTHOR_ONLY` | Only you will use this                    |
| `INTERNAL`    | Internal collaborators                    |
| `EXTERNAL`    | External builders, users, or stakeholders |

### Classification Output Format

```
WORK CLASSIFICATION:
- Type: [PRODUCTION]
- Persistence: [DURABLE]
- Risk: [MEDIUM]
- Consumers: [INTERNAL]
```

**State this classification explicitly before continuing.**

---

## STEP 2 — QA SEVERITY SELECTION (AUTOMATIC)

Select the **MINIMUM sufficient** QA level based on classification:

### 🟢 LEVEL 1 — FAST SANITY CHECK (DEFAULT)

**Use when:**

- Exploratory or early iterative work
- Low risk
- Ephemeral or author-only
- Speed and momentum matter more than rigor

**Selection criteria:**

```
IF (Type = EXPLORATORY OR ITERATIVE)
   AND (Risk = LOW)
   AND (Persistence = EPHEMERAL OR ITERATIVE)
   AND (Consumers = AUTHOR_ONLY OR INTERNAL)
THEN → LEVEL 1
```

### 🟡 LEVEL 2 — EXPERT SKEPTICAL QA

**Use when:**

- Work is durable or handed to collaborators
- Medium risk
- Logic, assumptions, or clarity materially matter
- Rework would be annoying or costly

**Selection criteria:**

```
IF (Persistence = DURABLE)
   OR (Risk = MEDIUM)
   OR (Consumers = INTERNAL with handoff)
   OR (Type = ARCHITECTURE)
THEN → LEVEL 2
```

### 🔴 LEVEL 3 — FULL RED HAT QE / RED TEAM

**Use when:**

- Production code or formal specs
- High-risk domains (financial, data, safety, compliance)
- External delivery or irreversible decisions
- Failure would be costly, embarrassing, or dangerous

**Selection criteria:**

```
IF (Type = PRODUCTION OR FINANCIAL)
   OR (Risk = HIGH)
   OR (Consumers = EXTERNAL)
   OR (Persistence = DURABLE AND Risk >= MEDIUM)
THEN → LEVEL 3
```

### Selection Rules

1. **Level 1 is the default** — Don't over-engineer
2. **Escalate ONLY when justified** by risk or persistence
3. **If choosing Level 2 or 3**, briefly justify the escalation
4. **If unsure between two levels**, choose the LOWER level unless cost of failure is high

---

## STEP 3 — EXECUTE QA (SEVERITY-SPECIFIC)

### 🟢 LEVEL 1 — FAST SANITY CHECK

**Mindset**: Quick pass, fix obvious issues, maintain velocity.

**Checklist:**

- [ ] Identify obvious errors, gaps, or unsafe assumptions
- [ ] Fix issues directly
- [ ] Verify code compiles/runs

**DO NOT:**

- ❌ Refactor heavily
- ❌ Add features
- ❌ Over-explain
- ❌ Spend more than 2-3 minutes reviewing

**Goal**: Improve quality without killing velocity.

**Output format:**

```
QA LEVEL 1 — FAST SANITY CHECK
✅ No obvious errors found
✅ Code compiles
→ READY TO COMMIT
```

---

### 🟡 LEVEL 2 — EXPERT SKEPTICAL QA

**Mindset**: Act as a clean-room senior reviewer who did NOT create the work.

**Perform these checks:**

#### 1) Assumption Audit

- What is being taken for granted?
- Are these assumptions documented?
- Could any assumption be wrong?

#### 2) Logic and Edge-Case Review

- Are there off-by-one errors?
- What happens with empty inputs?
- What happens with null/undefined?
- Are error paths handled?

#### 3) Clarity and Handoff Readiness

- Would another developer understand this?
- Are variable names clear?
- Is the intent obvious?

#### 4) Structural Improvements

- Is there unnecessary complexity?
- Are there obvious optimizations?
- Does it follow project patterns?

**Guidelines:**

- Prefer clarity over cleverness
- Prefer robustness over minimalism
- Rewrite sections if needed

**Output format:**

```
QA LEVEL 2 — EXPERT SKEPTICAL QA

ASSUMPTION AUDIT:
- [List assumptions found]

ISSUES FOUND:
- [Issue 1]: [Fix applied]
- [Issue 2]: [Fix applied]

IMPROVEMENTS MADE:
- [Improvement 1]
- [Improvement 2]

→ READY TO COMMIT (after fixes)
```

---

### 🔴 LEVEL 3 — FULL RED HAT QE / RED TEAM

**Mindset**: Assume the work will fail unless proven otherwise.

**Perform ALL checks:**

#### 1) Requirements and Intent Validation

- Does this actually solve the stated problem?
- Are requirements fully addressed?
- Is anything missing from the spec?

#### 2) Failure-Mode Enumeration

- List every way this could fail
- What happens under load?
- What happens with malicious input?
- What happens with concurrent access?

#### 3) Domain-Expert Skepticism

- Would a domain expert approve this?
- Are business rules correctly implemented?
- Are edge cases from the domain handled?

#### 4) State, Lifecycle, and Data Integrity

- Are state transitions valid?
- Can data become inconsistent?
- Are there race conditions?
- Is cleanup handled properly?

#### 5) Structural Analysis

- Is the architecture sound?
- Are there hidden dependencies?
- Is it testable?
- Is it maintainable?

**Rules:**

- If something is ambiguous, treat it as incorrect
- If something is assumed, surface it explicitly
- Velocity is secondary to correctness
- Rewrite or redesign if necessary

**Output format:**

```
QA LEVEL 3 — FULL RED HAT QE / RED TEAM

REQUIREMENTS VALIDATION:
- [Requirement 1]: ✅ Met / ❌ Gap found
- [Requirement 2]: ✅ Met / ❌ Gap found

FAILURE MODES IDENTIFIED:
1. [Failure mode]: [Mitigation applied]
2. [Failure mode]: [Mitigation applied]

DATA INTEGRITY ANALYSIS:
- [Finding 1]
- [Finding 2]

CRITICAL ISSUES:
- [Issue]: [Resolution]

STRUCTURAL CHANGES:
- [Change 1]
- [Change 2]

FINAL VERDICT:
→ READY TO COMMIT (all issues resolved)
→ BLOCKED: [Reason] (if unresolved issues)
```

---

## STEP 4 — SELF-HEAL AND IMPROVE

After QA execution, if issues were found:

### For Code Issues

```bash
# 1. Fix the identified issues
# 2. Re-run diagnostics
pnpm typecheck
pnpm lint
pnpm test

# 3. Verify fixes don't introduce new issues
# 4. Re-run QA at same level to confirm resolution
```

### For Documentation Issues

1. Update documentation to address gaps
2. Ensure clarity for downstream consumers
3. Add missing context or assumptions

### For Architecture Issues

1. Document the architectural concern
2. Propose solution to user if significant
3. Implement approved changes
4. Update relevant steering files if patterns change

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│              ADAPTIVE QA DECISION MATRIX                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  EXPLORATORY + LOW RISK + EPHEMERAL    → 🟢 LEVEL 1        │
│  ITERATIVE + MEDIUM RISK + INTERNAL    → 🟡 LEVEL 2        │
│  PRODUCTION + ANY RISK + ANY CONSUMER  → 🔴 LEVEL 3        │
│  FINANCIAL/SAFETY + ANY                → 🔴 LEVEL 3        │
│  DURABLE + MEDIUM+ RISK                → 🔴 LEVEL 3        │
│                                                              │
│  DEFAULT = 🟢 LEVEL 1 (don't over-engineer)                 │
│  WHEN IN DOUBT, CHOOSE LOWER LEVEL                          │
│  UNLESS COST OF FAILURE IS HIGH                             │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Integration with Pre-Commit Checklist

This QA protocol runs BEFORE the standard pre-commit checklist (`99-pre-commit-checklist.md`).

**Workflow:**

1. Complete your work
2. Run Adaptive QA Protocol (this document)
3. Self-heal any issues found
4. Run Pre-Commit Checklist
5. Commit

---

## Examples

### Example 1: Quick Bug Fix (Level 1)

```
WORK CLASSIFICATION:
- Type: ITERATIVE
- Persistence: ITERATIVE
- Risk: LOW
- Consumers: INTERNAL

QA SEVERITY: 🟢 LEVEL 1 — FAST SANITY CHECK
Justification: Simple bug fix, low risk, internal only

QA LEVEL 1 — FAST SANITY CHECK
✅ Fix addresses the reported issue
✅ No obvious side effects
✅ Code compiles
→ READY TO COMMIT
```

### Example 2: New API Endpoint (Level 2)

```
WORK CLASSIFICATION:
- Type: PRODUCTION
- Persistence: DURABLE
- Risk: MEDIUM
- Consumers: INTERNAL

QA SEVERITY: 🟡 LEVEL 2 — EXPERT SKEPTICAL QA
Justification: Durable production code, medium risk

QA LEVEL 2 — EXPERT SKEPTICAL QA

ASSUMPTION AUDIT:
- Assumes authenticated user context always exists
- Assumes input validation catches all edge cases

ISSUES FOUND:
- Missing null check on optional field: Added guard
- Error message not user-friendly: Improved message

IMPROVEMENTS MADE:
- Added explicit return type
- Added JSDoc for complex logic

→ READY TO COMMIT (after fixes)
```

### Example 3: Payment Processing (Level 3)

```
WORK CLASSIFICATION:
- Type: FINANCIAL
- Persistence: DURABLE
- Risk: HIGH
- Consumers: EXTERNAL

QA SEVERITY: 🔴 LEVEL 3 — FULL RED HAT QE / RED TEAM
Justification: Financial logic, high risk, external impact

QA LEVEL 3 — FULL RED HAT QE / RED TEAM

REQUIREMENTS VALIDATION:
- Payment amount calculation: ✅ Met
- Tax handling: ✅ Met
- Refund logic: ❌ Gap - partial refunds not handled

FAILURE MODES IDENTIFIED:
1. Concurrent payment attempts: Added optimistic locking
2. Network timeout mid-transaction: Added idempotency key
3. Invalid currency conversion: Added validation

DATA INTEGRITY ANALYSIS:
- Ledger entries balanced: ✅ Verified
- Audit trail complete: ✅ Verified

CRITICAL ISSUES:
- Partial refund gap: Implemented partial refund handler

→ READY TO COMMIT (all issues resolved)
```

---

## Enforcement

This protocol is enforced by:

1. **Self-discipline** — Run before every commit
2. **Code review** — Reviewers check for QA output
3. **Session files** — Document QA level used
4. **Audit trail** — QA output in commit messages for Level 2+

---

**Remember: The goal is APPROPRIATE quality, not MAXIMUM quality. Match your QA effort to the actual risk and value of the work.**

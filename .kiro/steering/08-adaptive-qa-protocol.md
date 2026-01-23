---
inclusion: always
---

# ✅ Adaptive Verification Protocol (Mandatory)

**Prime Directive: Verification Over Persuasion**  
No change is considered correct unless it is **verified** through deterministic checks (tests/build/typecheck/lint/e2e logs). Never claim success without evidence.

---

## 1) Autonomy Throttle (Choose the Right Rigor)

When in doubt, **escalate to a stricter mode**.

### ✅ SAFE MODE (fast + autonomous)

Allowed **only if ALL are true**:

- Change is isolated (single module / low blast radius)
- No auth, money, RBAC, payments, sensitive data, migrations
- Behavior is easily testable and reversible

**Safe Mode Rules**

- Small, frequent commits
- Targeted tests + typecheck before finishing

### 🟡 STRICT MODE (default)

Required when **ANY are true**:

- Touches shared components or core flows
- Affects state transitions or business logic
- Interacts with DB, permissions, pricing, inventory, accounting
- Modifies API contracts or data validation
- UI flow or navigation changes

**Strict Mode Rules**

- Explore → plan → execute → verify
- Write/extend tests for expected behavior
- Run full verification loop before declaring done

### 🔴 RED MODE (highest scrutiny)

Required when **ANY are true**:

- Auth/RBAC changes
- Payments/accounting/financial reporting
- Inventory valuation, purchase/sales posting logic
- Migrations / schema changes
- Background jobs, webhooks, integrations

**Red Mode Rules**

- Add regression tests **and** adversarial tests
- Require end-to-end verification where relevant
- Produce a risk register + rollback plan

---

## 2) Definition of Done (Non-Negotiable)

A change is **DONE only if**:

1. Tests added/updated to cover new behavior **or** a written justification why not
2. Lint passes
3. Typecheck passes
4. Unit/integration tests pass
5. Build passes
6. E2E passes **when UI/business workflow changed**
7. No TODOs, stubs, placeholders, or "coming soon" blockers
8. Commit/PR message includes **what changed** + **what was verified**

---

## 3) Redhat QA Efficacy Review (Required for STRICT/RED)

For STRICT or RED mode, perform a **Redhat QA-style self-review** before declaring done:

- Re-check requirements and edge cases for missing coverage
- Validate no silent failures, stubs, or placeholder logic
- Confirm rollback path for any risk-bearing change
- Record risks and mitigations in the final response

---

## 4) Mandatory Verification Commands (Repo-Equivalent)

Agents must discover the correct commands for this repo, but must run the equivalents of:

| Check                 | Command (TERP)                       |
| --------------------- | ------------------------------------ |
| Lint                  | `pnpm lint`                          |
| Typecheck             | `pnpm check`                         |
| Unit/Integration      | `pnpm test` (or targeted tests)      |
| Build                 | `pnpm build`                         |
| E2E (UI flow changes) | `pnpm test:e2e` or `pnpm test:smoke` |

**If a command cannot be run in the environment**:

- Mark status as **UNSURE**
- Provide an exact plan for how to verify locally/CI
- **Do not** claim correctness

---

## 5) Change Discipline

- Prefer minimal, surgical edits
- Avoid broad refactors unless explicitly requested
- Do not rewrite unrelated modules “while here”
- Commit checkpoints so rollbacks are easy

---

## 6) Required Output (Every Agent Response)

Every agent final response **must include**:

- ✅ **Verified:** checks actually run + pass/fail
- 🧪 **Tests added/updated:** what + where
- ⚠️ **Risk notes:** what could still break
- 🔁 **Rollback notes:** what to revert if needed
- 🟥 **Redhat QA (STRICT/RED):** brief self-review summary

---

## 7) Escalation Rules

- If the required verification cannot be performed, **stop and report**.
- If protocols conflict, follow **the strictest applicable rule**.
- If the task’s risk level is unclear, treat it as **STRICT MODE**.

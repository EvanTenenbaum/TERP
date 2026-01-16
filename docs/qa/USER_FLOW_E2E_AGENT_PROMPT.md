# User Flow Impact Outcomes → Systematic E2E Testing Prompt

_Last Updated: 2026-01-15_

Use this prompt to guide an AI agent through **systematic E2E testing** based on the user flow impact outcomes model and matrix. The goal is to compare **expected business logic outcomes** with **observed behavior** for each flow.

---

## Prompt

You are an AI QA agent for TERP. Use the canonical user flow matrix and the impact outcomes model to plan, execute, and report systematic E2E tests. You must produce traceable, testable assertions for each selected flow and capture mismatches between expected and observed behavior.

### Required Inputs

- `docs/reference/USER_FLOW_MATRIX.csv`
- `docs/reference/FLOW_GUIDE.md`
- `docs/reference/USER_FLOW_IMPACT_OUTCOMES.md`
- `docs/reference/USER_FLOW_IMPACT_OUTCOMES_TEMPLATE.csv`
- QA authentication: `docs/auth/QA_AUTH.md`
- Oracle DSL schema: `docs/qa/TEST_ORACLE_SCHEMA.md`

### Scope Selection

Start with one domain at a time (e.g., Accounting, Inventory, Orders). Choose a **test batch** of 5–10 flows per run.

### Workflow (Required)

1. **Select flows**
   - Filter `USER_FLOW_MATRIX.csv` by Domain/Entity/Implementation Status.
   - Prioritize `Client-wired` and `mutation` flows first.
2. **Populate impact outcomes**
   - For each selected flow, complete a row in `USER_FLOW_IMPACT_OUTCOMES_TEMPLATE.csv` using:
     - Flow guide lifecycle/permissions.
     - Router file behaviors.
     - Business purpose and known issues.
3. **Define E2E assertions**
   - Translate impact outcomes into concrete UI + DB assertions.
   - Map each flow to an Oracle YAML file using `TEST_ORACLE_SCHEMA.md`.
4. **Execute tests**
   - Use QA accounts (role-appropriate).
   - Run the oracle suite for the selected flows.
5. **Compare expected vs observed**
   - Identify mismatches in data writes, state transitions, and business rules.
   - Record outcomes with flow IDs.
6. **Report**
   - Produce a report with:
     - Flow ID
     - Expected outcomes
     - Observed outcomes
     - Mismatch severity
     - Suggested fixes

---

## Output Requirements

### 1) Impact Outcomes CSV (Per Batch)

Populate a batch file (new file per run) using:

```
# Example filename
qa-results/user-flow-impact-outcomes.<domain>.<date>.csv
```

### 2) Oracle Files

Create oracle YAML files per flow in:

```
tests-e2e/oracles/<domain>/<flow-id>.oracle.yaml
```

### 3) E2E Run Report

Write a report for each batch in:

```
qa-results/USER_FLOW_E2E_REPORT.<domain>.<date>.md
```

Include:

- Summary metrics (flows tested, pass/fail, mismatches)
- Table of flows with expected vs observed
- Links to failing oracles

---

## Quality Gates (Non-Negotiable)

- Every flow must have **explicit expected outcomes** before testing.
- All assertions must map to a specific impact column.
- Any mismatch must be documented with a hypothesis + evidence.
- No flow is considered “validated” until all expected outcomes match observed results.

---

## Reference Commands

```bash
# Run oracle tests for one flow
ORACLE_RUN_MODE=single ORACLE_FLOW_ID="<Domain>.<Entity>.<FlowName>" pnpm qa:test:flow

# Run core suite (Tier 1)
pnpm qa:test:core
```

---

## Deliverable Checklist

- [ ] Impact outcomes CSV populated and saved in `qa-results/`
- [ ] Oracle files created/updated for each flow tested
- [ ] E2E report written with expected vs observed comparisons
- [ ] Mismatches logged with severity + proposed fix

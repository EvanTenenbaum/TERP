# Forged Prompt Template

> Copy this template and fill in the sections. The forge skill generates prompts in this format.

---

## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" or "I confirmed Y" without showing the ACTUAL COMMAND and its ACTUAL OUTPUT.
2. **NO PREMATURE COMPLETION.** Do not say "Done" or "Complete" until EVERY item in the completion checklist has a ✅ with evidence.
3. **NO SILENT ERROR HANDLING.** If any command fails: STOP. Report the exact error. Do not work around it silently.
4. **NO QA SKIPPING.** The QA protocol is not optional. Run every lens. Show findings.
5. **NO HAPPY-PATH-ONLY TESTING.** Test failure cases, edge cases, and adversarial inputs.
6. **PROOF OF WORK.** At every 🔒 gate, paste actual terminal output.
7. **ACTUALLY READ FILES BEFORE EDITING.** Read files first. Do not assume contents.
8. **ONE THING AT A TIME.** Complete and verify each task before starting the next.

---

## Mission Brief

**Objective**: [What must be accomplished]
**Classification**: [Simple | Medium | Complex | Critical]
**Risk Mode**: [SAFE | STRICT | RED]
**Files in Scope**: [List of files that will be changed]

---

## Task List

### Task 1: [Title]

**What**: [Description]
**Files**: [Files to modify]
**Acceptance Criteria**:

- [ ] [Criterion 1]
- [ ] [Criterion 2]

**Verification Command**:

```bash
[command]
```

Expected: [what to look for]

🔒 **GATE 1**: Paste verification output before proceeding.

---

### Task 2: [Title]

[Same format]

🔒 **GATE 2**: Paste verification output before proceeding.

---

## QA Protocol (for Medium+ classifications)

### Lens 1: Static Pattern Scan

```bash
git diff main..HEAD -- '*.ts' '*.tsx' | grep -E "ctx\.user\?\.id \|\| 1|: any\b|db\.delete\(|console\.log"
```

### Lens 2: Execution Path Tracing

For each modified function: list entry points, enumerate branches, check implicit else, trace error paths.

### Lens 3: Data Flow Analysis

Map INPUT → TRANSFORMS → OUTPUT. Check null handling, type coercion, precision loss.

### Lens 4: Adversarial Scenarios (MIN 10)

| #   | Category | Input | Expected   | Actual   |
| --- | -------- | ----- | ---------- | -------- |
| 1   | Null     | null  | [expected] | [actual] |
| ... |          |       |            |          |

### Lens 5: Integration & Blast Radius

Map: Changed Code → Direct Deps → Reverse Deps → UI Surfaces

---

## Fix Cycle

For each issue found:

1. Fix the issue
2. Re-run failed verification
3. Paste new passing output
4. Check for cross-task impact

**Maximum 3 cycles.** After 3, STOP and report status.

---

## ✅ Completion Checklist

- [ ] All tasks completed with evidence
- [ ] All 🔒 gates passed
- [ ] `pnpm check` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` passes
- [ ] QA protocol completed (all 5 lenses)
- [ ] All QA findings addressed
- [ ] No TODO/FIXME/HACK introduced
- [ ] No console.log in production code

---

## RULES REMINDER (re-read before declaring done)

1. NO PHANTOM VERIFICATION — show actual command output
2. NO PREMATURE COMPLETION — check every box with evidence
3. NO SILENT ERROR HANDLING — report all failures
4. NO QA SKIPPING — all lenses required
5. NO HAPPY-PATH-ONLY — test failure and edge cases
6. PROOF OF WORK — terminal output at every gate
7. READ BEFORE EDIT — no assumptions about file contents
8. ONE AT A TIME — verify each task before starting next

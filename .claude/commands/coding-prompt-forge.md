---
name: coding-prompt-forge
description: Transform any task description into a rigorous, QA-enforced prompt for Claude Code that prevents incomplete work, skipped verification, and buggy output. Use when preparing work for Claude Code sessions.
---

# Claude Code Prompt Forge

> **"Claude Code will do exactly as much work as you let it get away with. This skill makes sure it can't get away with anything."**

## What This Skill Does

Takes a user's task description (anything from a vague idea to a detailed spec) and produces a **battle-hardened prompt** for Claude Code that:

1. Decomposes the work into explicit, verifiable steps
2. Requires proof-of-work at every checkpoint (actual command output, not "I verified this")
3. Embeds the full adversarial QA protocol so Claude Code runs it on its own output
4. Blocks Claude Code from declaring "done" without passing all verification gates
5. Structures the prompt to survive context window pressure (critical instructions at top and bottom)

## Failure Modes Countered

| Failure Mode             | What Happens                                  | How This Skill Counteracts                               |
| ------------------------ | --------------------------------------------- | -------------------------------------------------------- |
| **Premature completion** | Claims "done" with half the work finished     | Explicit task checklist with PROOF requirements          |
| **Phantom verification** | Says "I verified X" without running anything  | Demands actual command output pasted inline              |
| **QA theater**           | Runs cursory checks, misses real issues       | Embeds full 5-lens protocol with minimum scenario counts |
| **Context amnesia**      | Forgets earlier tasks as context grows        | Critical instructions repeated at top AND bottom         |
| **Parallel abandonment** | Spawns subagents but doesn't collect results  | Explicit collection + verification gate                  |
| **Happy-path bias**      | Only tests the success case                   | Adversarial scenarios are mandatory, not optional        |
| **Silent failure**       | Encounters an error, works around it silently | STOP-AND-REPORT rules for any unexpected state           |

---

## Step 1: Classify the Work

Determine scope and risk level:

| Classification | Characteristics                               | Prompt Intensity                                      |
| -------------- | --------------------------------------------- | ----------------------------------------------------- |
| **Simple**     | Single file, isolated change, no side effects | Standard (1 verification gate)                        |
| **Medium**     | Multiple files, some dependencies, testable   | Enhanced (2 gates + targeted QA)                      |
| **Complex**    | Cross-module, state changes, financial/auth   | Full (3 gates + complete 5-lens QA)                   |
| **Critical**   | Database migration, auth system, money flow   | Maximum (4 gates + 5-lens + manual review checkpoint) |

## Step 2: Decompose Into Atomic Tasks

Break the work into steps where each step:

- Has a single, clear outcome
- Can be verified independently
- Has explicit acceptance criteria
- Specifies what file(s) will be changed

**Rule**: If a step requires more than ~200 lines of changes, split it further.

## Step 3: Generate the Prompt

### Prompt Architecture

Context window priority means instructions at top and bottom get most attention:

```
┌─────────────────────────────────────────┐
│  RULES & ANTI-PATTERNS (highest weight) │  ← Top: what NOT to do
│  MISSION BRIEF                          │  ← What to accomplish
│  TASK LIST WITH ACCEPTANCE CRITERIA     │  ← The actual work
│  VERIFICATION GATES                     │  ← Proof requirements
│  QA PROTOCOL (5-LENS)                   │  ← Self-review protocol
│  FIX CYCLE INSTRUCTIONS                │  ← What to do with QA findings
│  COMPLETION CHECKLIST                   │  ← Final verification
│  RULES REPEATED (highest weight)        │  ← Bottom: rules again
└─────────────────────────────────────────┘
```

### Anti-Pattern Rules (MUST be in every prompt)

These go at the TOP and are REPEATED at the BOTTOM:

```markdown
## MANDATORY RULES — VIOLATION = TASK FAILURE

1. **NO PHANTOM VERIFICATION.** Never write "I verified X" or "I confirmed Y"
   without showing the ACTUAL COMMAND and its ACTUAL OUTPUT. If you say something
   works, prove it with terminal output.

2. **NO PREMATURE COMPLETION.** Do not say "Done" or "Complete" until EVERY item
   in the completion checklist has a ✅ with evidence. Check the list. Actually
   check it.

3. **NO SILENT ERROR HANDLING.** If any command fails, if any test doesn't pass,
   if anything unexpected happens: STOP. Report the exact error. Do not work
   around it silently.

4. **NO QA SKIPPING.** The QA protocol below is not optional. You MUST run every
   lens. You MUST generate the minimum number of adversarial scenarios. You MUST
   show your findings.

5. **NO HAPPY-PATH-ONLY TESTING.** You must test failure cases, edge cases, and
   adversarial inputs. Testing only the success path = incomplete work.

6. **PROOF OF WORK.** At every verification gate marked with 🔒, you must paste
   the actual terminal output. Screenshots of your reasoning don't count.

7. **ACTUALLY READ FILES BEFORE EDITING.** Before modifying any file, read it
   first. Do not assume you know what's in a file from context or memory.

8. **ONE THING AT A TIME.** Complete and verify each task before starting the
   next. Do not batch-implement and then batch-verify.
```

### Task Format

Each task in the generated prompt:

```markdown
### Task [N]: [Title]

**What**: [1-2 sentence description]
**Files**: [exact files to create/modify]
**Acceptance Criteria**:

- [ ] [Specific, testable criterion 1]
- [ ] [Specific, testable criterion 2]

**Verification Command**:
\`\`\`bash
[exact command to run]
\`\`\`
Expected output should contain: [what to look for]

🔒 **GATE**: Before proceeding to Task [N+1], paste the verification command output above.
```

### QA Protocol Embedding

For **Medium** and above, embed the TERP QA 5-lens protocol directly:

1. **Lens 1: Static Pattern Scan** — P0 auto-reject patterns via git diff
2. **Lens 2: Execution Path Tracing** — All entry points, branches, implicit else paths
3. **Lens 3: Data Flow Analysis** — INPUT → TRANSFORMS → OUTPUT with null/type handling
4. **Lens 4: Adversarial Scenarios** — Minimum 10 test cases per the TERP adversarial matrix
5. **Lens 5: Integration & Blast Radius** — Dependency mapping and side effect inventory

See `.claude/agents/terp-qa-reviewer.md` for the full protocol.

### Fix Cycle

```markdown
## Fix Cycle

For each issue found by QA:

1. Fix the issue
2. Re-run the specific verification that failed
3. Paste the new output showing it passes
4. If fixing this issue could affect other tasks, re-run those verification gates too

**Maximum 3 fix cycles.** If issues persist after 3 cycles, STOP and report:

- What was fixed
- What still fails
- Your analysis of why it's still failing
- Suggested approach for resolution

Do NOT enter an infinite fix loop.
```

### Completion Checklist

```markdown
## ✅ Completion Checklist

Do NOT declare this work complete until every box is checked with evidence:

- [ ] All tasks completed (list each task with pass/fail)
- [ ] All verification gates passed (paste command outputs)
- [ ] TypeScript compiles: `pnpm check` passes
- [ ] Linter clean: `pnpm lint` passes
- [ ] Tests pass: `pnpm test` passes
- [ ] Build succeeds: `pnpm build` passes
- [ ] QA protocol completed (all 5 lenses for Complex+)
- [ ] All QA findings addressed or explicitly documented as known issues
- [ ] No TODO/FIXME/HACK comments introduced
- [ ] No console.log statements left in production code
```

---

## Step 4: Self-QA Before Delivering

Before presenting the prompt to the user, review with:

1. **Ambiguity check**: Could Claude Code interpret any instruction in more than one way?
2. **Escape hatch check**: Could Claude Code claim compliance without doing the work?
3. **Context pressure check**: Over ~3000 words? Consider splitting into sequential prompts.
4. **Verification completeness**: Every task has a concrete verification mechanism?
5. **QA coverage**: For Complex+ work, does QA section cover all files being modified?

---

## Special Modes

### "Fix my broken session" mode

If Claude Code messed something up mid-session, generate a recovery prompt that:

1. Audits what was actually done vs. what was supposed to be done
2. Identifies the delta
3. Completes remaining work with full verification
4. Runs QA on everything, not just the fix

### "Review what Claude Code did" mode

If the user pastes output from a Claude Code session, analyze for:

- Tasks claimed complete but not verified
- Phantom verifications (said "verified" without output)
- Tests that weren't actually run
- Edge cases not covered
- Then generate a follow-up prompt to fix gaps

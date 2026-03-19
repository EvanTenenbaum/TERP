# Parallel Module Readiness Implementation Prompt

Use this prompt in a fresh agent session when you want the repo to encode the corrected Orders module-parallelization guidance.

```text
W01 | Orders | Parallel Readiness | Implement

WORKSPACE ROOT:
/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318

FIRST STEP:
- verify `pwd`
- if current directory is not the WORKSPACE ROOT, switch to it before doing anything else
- read and follow the applicable `AGENTS.md` and `CLAUDE.md` files in scope
- treat this as Orders-roadmap documentation work unless the repo truth clearly requires a small contract update

Objective:
Implement the corrected repo truth for module-parallelization readiness based on the March 19 adversarial review. The Orders rollout may share its process model now, but it must not authorize broad parallel technical adapter work on the shared spreadsheet runtime until the foundation gate is honestly ready.

Grounding artifacts you must read before editing:
- /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/roadmaps/orders-spreadsheet-runtime/parallel-module-readiness-review-2026-03-19.md
- /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/roadmaps/orders-spreadsheet-runtime/README.md
- /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/roadmaps/orders-spreadsheet-runtime/roadmap-1-g2-shared-runtime-foundation.md
- /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md
- /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/Implement.md
- /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json
- /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/client/src/lib/spreadsheet-native/ordersRolloutContract.ts
- /Users/evan/.codex-runs/claude-qa/20260319T224014Z-users-evan-codex-runs-claude-qa-input-module-parallelization-rea-c8ee47/report.md

Required outcomes:
1. Add a repo-native `PowersheetGrid` interface-freeze or boundary document that defines what is and is not currently safe for other modules to depend on.
2. Update the active Orders roadmap/spec package so it explicitly distinguishes:
   - reusable process scaffolding that is safe to parallelize now
   - technical shared-foundation work that remains blocked until G2 closes with evidence
3. Publish the `SALE-ORD-031` sort/filter limitation as a foundation portability constraint.
4. Publish the `SALE-ORD-022` fill-handle persistence caveat as a known shared-capability caveat.
5. Add a concrete prerequisite gate for future module adapter work, so no team can interpret the current Orders state as broad technical readiness.

Constraints:
- Keep the work TERP-specific but not Orders-flow marketing language.
- Do not widen scope into non-Orders roadmap execution.
- Preserve existing gate semantics: `implemented-not-surfaced` remains rollout-blocking.
- Do not claim G2 is closed.
- If you touch code or contract files, keep the edit minimal and explicitly justified by the documentation need.

Preferred edit targets:
- docs/roadmaps/orders-spreadsheet-runtime/README.md
- docs/roadmaps/orders-spreadsheet-runtime/roadmap-1-g2-shared-runtime-foundation.md
- docs/specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md
- docs/specs/spreadsheet-native-foundation/orders-runtime/Implement.md
- a new doc under docs/specs/spreadsheet-native-foundation/orders-runtime/ for the `PowersheetGrid` interface boundary or freeze contract
- optionally a minimal note in client/src/lib/spreadsheet-native/ordersRolloutContract.ts if that is the cleanest place to make caveats visible

Verification:
- docs-only verification is acceptable unless you change executable code
- if docs-only, run targeted grep or readback checks that prove the new constraints and caveats are present
- if you change executable code, use the lightest sufficient targeted verification and state why

Return format:

SESSION: W01 | Orders | Parallel Readiness | Implement
STATUS: done | blocked | partial
CHANGED FILES:
- /abs/path

SUMMARY:
- one short bullet per material outcome

VERIFICATION:
- command: <exact command>
  result: pass | fail | not run
  note: <short note>

BLOCKERS:
- only if real

HANDOFF:
- what changed in repo truth
- whether the repo now clearly blocks premature parallel technical module work
- any residual ambiguity or follow-up needed
```

# Orders Runtime Non-Codex Takeover Prompt

```text
You are taking over the TERP Orders spreadsheet-runtime initiative and must drive it to completion quickly, honestly, and with product-first execution.

Workspace:
/Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318

First actions:
1. Verify you are in the workspace above.
2. Read these files in order:
   - /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/AGENTS.md
   - /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/CLAUDE.md
   - /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-handoff-2026-03-19.md
   - /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/roadmaps/orders-spreadsheet-runtime/README.md
   - /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/roadmaps/orders-spreadsheet-runtime/remaining-atomic-completion-roadmap-2026-03-19.md
   - /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/ter-795-state.json
   - /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/G2-runtime-gate.md
   - /Users/evan/spec-erp-docker/TERP/worktrees/orders-runtime-ter-795-20260318/docs/specs/spreadsheet-native-foundation/orders-runtime/Implement.md

Locked truth you must preserve:
- Scope is Orders only.
- `G1` is closed with evidence.
- `G2` is partial and is the only active gate.
- `G3` through `G7` are blocked until `G2` closes with evidence.
- `TER-796` is sealed and must not be reopened without isolated repro evidence.
- Current live-proven G2 rows are `SALE-ORD-019`, `SALE-ORD-022`, `SALE-ORD-030`, and `SALE-ORD-032`.
- `SALE-ORD-020` is currently blocked on live route reachability, not local implementation certainty.
- `SALE-ORD-021` should wait for a fresh reachable build and should use isolated `paste-only` mode.
- `SALE-ORD-029` is the next proof lane.
- `SALE-ORD-031` and `SALE-ORD-035` are limitation lanes unless stronger isolated evidence appears.

How to work:
- Be product-first. Do not spend time on architecture/process work unless it directly unlocks a current roadmap row.
- Every writable tranche must end in exactly one of:
  - product change
  - closure packet
  - limitation packet
  - blocker packet
- Use targeted tests during implementation.
- Use full repo gates only at real commit points.
- Use one narrow live probe per row when needed; do not rerun broad bundles.
- If a row cannot be proven cleanly on the current surface, package the limitation or blocker and move on.

Immediate priority order:
1. `SALE-ORD-029`
2. `SALE-ORD-031`
3. `SALE-ORD-035`
4. Revisit `SALE-ORD-020` only after a confirmed reachable fresh build exists
5. Revisit `SALE-ORD-021` only after a confirmed reachable fresh build exists

Required commands before any commit:
- pnpm check
- pnpm lint
- pnpm test
- pnpm build

Helpful commands:
- pnpm status:orders-runtime:all
- pnpm proof:staging:orders-selection
- pnpm proof:staging:orders-fill-handle
- PLAYWRIGHT_BASE_URL=<fresh-build-url> tsx scripts/spreadsheet-native/prove-orders-runtime-g2.ts --mode=paste-only

Your job:
- drive the Orders roadmap forward to completion
- keep all state/docs/evidence/tracker truth aligned
- avoid proof rabbit holes
- prefer the smallest honest progress unit that moves the roadmap

When you report progress, always say:
- what row or gate moved
- what exact evidence or blocker was produced
- what command proved it
- what the next smallest roadmap move is
```

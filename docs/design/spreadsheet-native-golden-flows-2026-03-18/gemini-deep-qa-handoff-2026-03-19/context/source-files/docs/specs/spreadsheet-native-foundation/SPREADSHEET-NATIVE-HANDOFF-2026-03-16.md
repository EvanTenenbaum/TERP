# Spreadsheet-Native Handoff - 2026-03-16

## Scope

This handoff covers the adversarial QA and hardening pass requested after the spreadsheet-native pilot rollout work. The goal of this pass was to:

- improve the final target definition so it is harder to underbuild or overcomplicate later
- tighten the Orders and Inventory pilot layouts around real spreadsheet-native UX goals
- explicitly address wasted horizontal space and reduce unnecessary left/right scanning
- preserve honesty between `final target`, `pilot scope`, and `preserved adjacent behavior`
- leave a clean continuation point for the next agent

## Current Branch and Repo State

- Repo: `/Users/evan/spec-erp-docker/TERP/TERP`
- Branch: `codex/sheet-native-final-target-hardening`
- Base state: branch was created from a dirty `staging` checkout that already contained broader spreadsheet-native work
- Important consequence: this repo still includes many pre-existing modified and untracked sheet-native files beyond this pass

## What Was Completed In This Pass

### 1. Adversarial review of the final target

Three hostile review passes were run earlier in the session, including external-style critique from the PM reviewer agents. The main issues found were:

- final target / pilot / adjacent-preserved behavior were too blurred
- width discipline was too weak and likely to reproduce horizontal scrolling pain
- the blueprints were still too forgiving about inspector usage and multi-lane layouts
- views risked becoming too powerful in ways that could destabilize layout coherence
- the pilot documentation was grading some adjacent behavior too generously

The foundation docs were updated to respond to those findings.

### 2. Orders pilot hardening

The Orders pilot was restructured away from a split `Drafts` / `Confirmed` 50-50 layout and toward:

- one dominant queue
- one linked line-items supporting table
- one compact summary strip
- one secondary inspector
- primary actions next to selection instead of buried in the inspector

The default queue now emphasizes:

- `Stage`
- `Order`
- `Client`
- `Lines`
- `Total`
- `Next`

The intent is to reduce width pressure and make the main operational decision path visible without requiring users to pan sideways just to understand the next step.

### 3. Inventory pilot hardening

The Inventory pilot was restructured to:

- remove oversized warning chrome and non-essential pilot messaging
- reduce the default visible column set to a narrow high-value operational slice
- replace page-to-page browsing emphasis with `Load More`
- add a real supporting table for selected batch locations
- move primary actions out of the inspector
- treat the inspector as secondary context instead of the work surface

The default inventory grid now emphasizes:

- `SKU`
- `Product`
- `Status`
- `Available`
- `On Hand`
- `Age`

### 4. Feature Flags and grid rendering fixes

Two functional fixes from the staging slice were carried into this repo:

- the spreadsheet pilot grid now gets an explicit height so AG Grid does not collapse into a blank white region
- the Feature Flags tab now renders the actual manager instead of looping back into itself

### 5. Proof-state synchronization

The canonical repo was still older than the dedicated staging worktree on the pilot proof registry. During this pass, the following were synchronized from the newer staging worktree so the canonical repo reflects the current March 15 proof truth:

- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/lib/spreadsheet-native/pilotProofCases.ts`
- `/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/spreadsheet-native-ledgers/pilot-proof-cases.csv`
- `/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/spreadsheet-native-ledgers/pilot-ledgers-parity-proof-plan.md`
- `/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/spreadsheet-native-ledgers/sales-orders-sheet-capability-ledger-summary.md`
- `/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/spreadsheet-native-ledgers/operations-inventory-sheet-capability-ledger-summary.md`

The matching March 15 staging detection artifact was also copied into:

- `/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/spreadsheet-native-ledgers/sheet-native-surface-detection-2026-03-15.json`

This artifact is now intentionally checked in under `docs/specs/spreadsheet-native-ledgers` so the proof gate no longer depends on an untracked `output/` file that would disappear in CI or a clean checkout.

## Files Changed In This Pass

### Code

- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/spreadsheet-native/SpreadsheetPilotGrid.tsx`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/spreadsheet-native/SpreadsheetPilotGrid.test.tsx`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/spreadsheet-native/OrdersSheetPilotSurface.tsx`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/spreadsheet-native/OrdersSheetPilotSurface.test.tsx`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/spreadsheet-native/InventorySheetPilotSurface.tsx`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/components/spreadsheet-native/InventorySheetPilotSurface.test.tsx`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/lib/spreadsheet-native/pilotContracts.ts`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/lib/spreadsheet-native/pilotContracts.test.ts`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/Settings.tsx`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/Settings.test.tsx`
- `/Users/evan/spec-erp-docker/TERP/TERP/client/src/pages/settings/FeatureFlagsPage.tsx`

### Docs

- `/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/SPREADSHEET-NATIVE-FOUNDATION-BASELINE-V2.md`
- `/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/SPREADSHEET-NATIVE-UX-UI-FRAMEWORK.md`
- `/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/SPREADSHEET-NATIVE-SHEET-ENGINE-CONTRACT.md`
- `/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/SPREADSHEET-NATIVE-VIEW-SHARING-PERMISSIONS-LIFECYCLE-CONTRACT.md`
- `/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/SPREADSHEET-NATIVE-SALES-ORDERS-BLUEPRINT.md`
- `/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/SPREADSHEET-NATIVE-OPERATIONS-INVENTORY-BLUEPRINT.md`
- `/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/SPREADSHEET-NATIVE-ADVERSARIAL-QA-2026-03-16.md`
- `/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/README.md`
- `/Users/evan/spec-erp-docker/TERP/TERP/docs/specs/spreadsheet-native-foundation/SPREADSHEET-NATIVE-HANDOFF-2026-03-16.md`

## Key Design Decisions Locked In

### Final target vs pilot vs preserved adjacent behavior

This distinction is now explicit and should be preserved.

- `Final target`: what the sheet-native product is supposed to own directly
- `Pilot`: what the current pilot surface actually implements and is honest enough to evaluate
- `Preserved adjacent behavior`: classic surfaces that remain valid evidence for functionality continuity but are not themselves proof that the pilot owns the behavior

### Width discipline

This is now a first-class rule, not a preference.

- primary sheets should surface `P0` columns without horizontal scrolling at common desktop widths
- secondary information should move to supporting tables, summary strips, or inspector context before widening the grid
- inspectors are capped as secondary companions, not dominant panes
- high-frequency operational sheets should default to one dominant primary table and at most one dominant supporting table

### Orders pilot layout

The Orders pilot should now be evaluated as:

- one main queue
- one linked lines table
- one compact summary strip
- one secondary inspector

It should no longer drift back toward parallel-lane symmetry unless a specific workflow absolutely requires it.

### Inventory pilot layout

The Inventory pilot should now be evaluated as:

- one dominant operational table
- a compact summary strip
- a supporting batch-locations table
- a secondary inspector

The pilot should not reintroduce heavy pagination chrome or a broad column default set.

## QA and Verification Completed

### Targeted tests

Command:

```bash
pnpm exec vitest run \
  client/src/components/spreadsheet-native/SpreadsheetPilotGrid.test.tsx \
  client/src/components/spreadsheet-native/InventorySheetPilotSurface.test.tsx \
  client/src/components/spreadsheet-native/OrdersSheetPilotSurface.test.tsx \
  client/src/lib/spreadsheet-native/pilotContracts.test.ts \
  client/src/pages/Settings.test.tsx
```

Result:

- passed: 5 files / 15 tests

### Typecheck

Command:

```bash
pnpm check
```

Result:

- passed after fixing:
  - `FeatureFlagsPage` route-safe export shape
  - inventory location field assumptions in the supporting locations table

### Lint

Command:

```bash
pnpm lint
```

Result:

- passed

### Build

Command:

```bash
pnpm build
```

Result:

- passed
- existing non-blocking Vite warnings remain about:
  - dual static/dynamic imports for some non-pilot pages
  - large chunk sizes

### Full tests

Command:

```bash
pnpm test
```

Result:

- passed
- `245` test files passed
- `5974` tests passed
- `20` skipped

### Vet

Attempted:

```bash
vet
```

Result:

- blocked by Anthropic billing:
  - `Your credit balance is too low to access the Anthropic API.`

Fallback attempted:

- staged-slice copied into temporary worktree
- agentic `vet` launched with Codex harness from clean temp worktree

Fallback result:

- failed with an internal `vet` validation error rather than a code finding:
  - `Agent CLI call failed: 2 validation errors for AgentToolResultBlock`
  - `content.str Input should be a valid string`
  - `content.list[dict[str,any]] Input should be a valid list`

Temporary worktree:

- `/tmp/terp-vet-slice-Q5qEux/worktree`

Original fallback `vet` session ID:

- `16000`

## Important Open Risks

### 1. Dirty repository base

This branch was created from a dirty checkout that already contained broader spreadsheet-native work. That means:

- not every modified/untracked file in `git status` belongs to this pass
- a careless `git add .` or broad commit would be unsafe
- the next agent must decide whether to:
  - commit only the files from this pass
  - or deliberately package a larger integrated sheet-native slice

### 2. Mixed docs and code

This pass is not docs-only.

It contains:

- pilot code changes
- tests
- settings/feature-flags behavior changes
- docs/spec updates

So this cannot be silently merged under a docs-only exception.

## Recommended Immediate Next Steps

1. Decide how to treat the `vet` blocker:
   - accept it as an external-tooling block because both Anthropic billing and the Codex-harness fallback failed
   - or retry later with a repaired `vet` install
2. Inspect `git diff --cached --stat` and `git status --short` carefully.
3. Build a safe commit plan:
   - either commit only this pass
   - or explicitly widen scope and say so
4. Because this includes code, open a normal PR rather than silently merging.
5. Only merge once the staged slice and PR scope are both truthful.

## Useful Commands For The Next Agent

Inspect current staged slice:

```bash
git diff --cached --stat
git diff --cached
```

Inspect full repo state:

```bash
git status --short
```

Compare canonical proof state to staging worktree:

```bash
diff -u \
  /Users/evan/spec-erp-docker/TERP/TERP/client/src/lib/spreadsheet-native/pilotProofCases.ts \
  /Users/evan/spec-erp-docker/TERP/worktrees/sheet-native-staging-20260315/client/src/lib/spreadsheet-native/pilotProofCases.ts
```

Re-run the core gates:

```bash
pnpm check
pnpm lint
pnpm build
pnpm test
```

## Bottom Line

The spreadsheet-native foundation and the two pilot surfaces are stronger and more honest than they were at the start of this pass.

The most important improvements are:

- width discipline is now explicit in both the final target and the pilots
- Orders and Inventory now behave more like real sheet-native surfaces and less like launcher shells
- the docs are clearer about what is final-target intent versus pilot reality versus preserved classic adjacency

The work is not ready for a silent merge because it includes real code changes, and it should not be bundled carelessly because the surrounding repo state is broader than this pass alone.

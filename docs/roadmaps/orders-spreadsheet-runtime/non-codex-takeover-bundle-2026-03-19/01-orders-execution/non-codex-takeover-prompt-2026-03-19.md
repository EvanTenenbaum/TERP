# Full Spreadsheet-Native Takeover Prompt

```text
You are taking over TERP spreadsheet-native execution from an active Orders-runtime worktree. Your primary job is to drive the Orders roadmap to completion quickly, honestly, and product-first. Your secondary job is to preserve the broader spreadsheet-native implementation truth so that future module work builds on the right contracts instead of accidentally flattening behavior.

Treat this as a dual-context handoff:
- Active execution lane: Orders spreadsheet-runtime rollout
- Broader implementation context: full spreadsheet-native build-source-of-truth and detailed-ledger system

Assume you are working from a normal checkout of the TERP repository.

Repository-relative bundle root:
docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19

Repository-relative broader packet root:
TERP/docs/design/spreadsheet-native-golden-flows-2026-03-18/build-source-of-truth-2026-03-19

Repository-relative detailed ledger root:
TERP/docs/specs/spreadsheet-native-ledgers

Current branch:
codex/ter-795-sale-ord-019-20260319

Current commit anchor:
bdcb1e39c2736bc1a1cc30bdac391c381c5e9623

First actions:
1. Verify you are at the repository root and this bundle folder exists.
2. Read and follow:
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/00-protocol/AGENTS.md
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/00-protocol/CLAUDE.md
3. Read the active Orders execution package in this order:
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/01-orders-execution/non-codex-takeover-handoff-2026-03-19.md
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/01-orders-execution/README.md
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/01-orders-execution/remaining-atomic-completion-roadmap-2026-03-19.md
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/01-orders-execution/ter-795-state.json
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/01-orders-execution/G2-runtime-gate.md
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/01-orders-execution/Implement.md
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/01-orders-execution/PowersheetGrid-boundary-contract.md
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/01-orders-execution/parallel-module-readiness-review-2026-03-19.md
4. Read the broader spreadsheet-native implementation packet in this order:
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/02-broader-build-source-of-truth/spreadsheet-native-build-source-of-truth.md
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/02-broader-build-source-of-truth/spreadsheet-native-pack-capability-ledger.csv
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/02-broader-build-source-of-truth/spreadsheet-native-pack-capability-ledger-summary.md
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/03-detailed-ledgers/sales-orders-sheet-capability-ledger.csv
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/03-detailed-ledgers/operations-inventory-sheet-capability-ledger.csv
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/03-detailed-ledgers/sales-sheets-capability-ledger.csv
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/03-detailed-ledgers/direct-intake-capability-ledger.csv
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/03-detailed-ledgers/purchase-orders-capability-ledger.csv
5. Read the design-review intent artifacts as context, not implementation truth:
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/04-design-review-context/deep_pass_review.md
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/04-design-review-context/actionable_tasks.md
   - docs/roadmaps/orders-spreadsheet-runtime/non-codex-takeover-bundle-2026-03-19/04-design-review-context/prd_draft.md

Primary mission:
- finish the Orders spreadsheet-runtime initiative in dependency order
- close the active gate honestly with the smallest product-moving units
- keep repo truth, evidence packets, and tracker truth aligned

Secondary mission:
- preserve full spreadsheet-native capability truth when touching shared runtime or preparing future module work
- prevent Figma omissions or pack-level shorthand from being misread as permission to simplify current TERP behavior

Locked current Orders truth you must preserve:
- Scope of active execution is Orders only.
- `G1` is `closed with evidence`.
- `G2` is `partial` and is the only active execution gate.
- `G3` through `G7` are blocked until `G2` is `closed with evidence`.
- `TER-795` is the active atomic card.
- `TER-796` is sealed and must not be reopened without isolated repro evidence.
- Current live-proven `G2` rows are `SALE-ORD-019`, `SALE-ORD-022`, `SALE-ORD-030`, and `SALE-ORD-032`.
- `SALE-ORD-020` is currently blocked on live Orders document-grid reachability, not local implementation certainty.
- `SALE-ORD-021` should wait for a fresh reachable build and should use isolated `paste-only` mode.
- `SALE-ORD-029` is the next active proof lane.
- `SALE-ORD-031` is a limitation lane unless stronger isolated evidence appears.
- `SALE-ORD-035` is a limitation lane unless stronger isolated evidence appears.
- Generated snapshots may lag coordinator truth; if `ACTIVE_GATE_STATUS.md` still says `SALE-ORD-020` is next, treat that as stale relative to the later coordinator decision above unless new evidence changes it.
- Current generated staging snapshot says build `build-mmxzi3to` on route `/sales?tab=orders&surface=sheet-native&orderId=627`, but you must verify freshness before spending a new live probe.

Orders execution rules:
- Be product-first. Do not spend time on architecture or process work unless it directly unlocks a current Orders roadmap row.
- Every writable tranche must end in exactly one of:
  - product change
  - closure packet
  - limitation packet
  - blocker packet
- Use targeted tests during implementation.
- Use full repo gates only at real commit points.
- Use one narrow live probe per row when needed; do not rerun broad bundles.
- If a row cannot be proven cleanly on the current surface, package the limitation or blocker and move on.
- If a verification lane stops producing new state after 1 to 2 informative reruns, stop the proof loop and pivot to the next atomic roadmap move.

Immediate Orders priority order:
1. `SALE-ORD-029`
2. `SALE-ORD-031`
3. `SALE-ORD-035`
4. revisit `SALE-ORD-020` only after a confirmed reachable fresh build exists
5. revisit `SALE-ORD-021` only after a confirmed reachable fresh build exists

Broader spreadsheet-native source-of-truth contract:
- Treat the Figma work as directional UI reference only, not implementation truth.
- The implementation source of truth is the build packet at:
  - TERP/docs/design/spreadsheet-native-golden-flows-2026-03-18/build-source-of-truth-2026-03-19/spreadsheet-native-build-source-of-truth.md
  - TERP/docs/design/spreadsheet-native-golden-flows-2026-03-18/build-source-of-truth-2026-03-19/spreadsheet-native-pack-capability-ledger.csv
  - TERP/docs/design/spreadsheet-native-golden-flows-2026-03-18/build-source-of-truth-2026-03-19/spreadsheet-native-pack-capability-ledger-summary.md
- Detailed ledgers already exist for:
  - TERP/docs/specs/spreadsheet-native-ledgers/sales-orders-sheet-capability-ledger.csv
  - TERP/docs/specs/spreadsheet-native-ledgers/operations-inventory-sheet-capability-ledger.csv
  - TERP/docs/specs/spreadsheet-native-ledgers/sales-sheets-capability-ledger.csv
  - TERP/docs/specs/spreadsheet-native-ledgers/direct-intake-capability-ledger.csv
  - TERP/docs/specs/spreadsheet-native-ledgers/purchase-orders-capability-ledger.csv
- Sales Sheets, Direct Intake, and Purchase Orders were collapsed to pointer rows in the pack CSV so there is no ambiguous ID remapping at pack level.
- Remaining pack-level modules are intentionally still `pack-only / blocked`.
- Shared and cross-pack contracts are the next required detailed-ledger tranche because they are foundational.
- Pack rows are a preservation floor, not a cap. Detailed ledgers are allowed to discover additional real capabilities from current code.
- Assume no functionality, logic, output contract, adjacency, draft behavior, or trust-critical commit path may be lost.
- Focus next on shared and cross-pack contracts, then Fulfillment, then Accounting, then Returns and Samples.
- Produce implementation-ready recommendations or the next detailed-ledger tranche without relying on Figma omissions as permission to simplify behavior.

What this means in practice:
- Do not treat the broader spreadsheet-native packet as permission to widen the active execution lane beyond Orders right now.
- Do use it whenever shared runtime behavior, future module portability, or preservation of adjacent workflows is in question.
- If you touch shared spreadsheet-native seams while finishing Orders, verify that you are not violating the broader pack-level preservation contract.
- If you prepare future module work, keep it at the ledger, mapping, or recommendation level until the active Orders gate and boundary rules actually permit broader technical rollout.

Additional spreadsheet-native protection rules:
- No module should be redesigned without a capability ledger.
- Current code wins if docs, mocks, or packets drift.
- No functionality may be removed just because a mock omitted it.
- Outputs and document contracts are first-class.
- Sibling and adjacent surfaces remain real even when not fully represented in the artboards.
- Shared foundation claims are not broadly portable until the Orders shared-foundation gate actually closes with evidence.

Helpful Orders commands:
- pnpm status:orders-runtime:all
- pnpm proof:staging:orders-selection
- pnpm proof:staging:orders-fill-handle
- PLAYWRIGHT_BASE_URL=<fresh-build-url> tsx scripts/spreadsheet-native/prove-orders-runtime-g2.ts --mode=paste-only

Required commands before any commit:
- pnpm check
- pnpm lint
- pnpm test
- pnpm build

Current verification note:
- `pnpm check`, `pnpm lint`, and `pnpm build` were green at commit `bdcb1e39c2736bc1a1cc30bdac391c381c5e9623`.
- A full `pnpm test` run previously found one real drift in `docs/specs/spreadsheet-native-ledgers/pilot-proof-cases.csv`; that drift was fixed and the targeted rerun of `client/src/lib/spreadsheet-native/pilotContracts.test.ts` passed.
- A second full `pnpm test` rerun was started but not awaited before that commit by explicit instruction, so do not treat full-test green as freshly re-proven until you rerun it yourself.

How to report progress:
- say what row, gate, or module ledger moved
- say whether the result is a product change, closure packet, limitation packet, blocker packet, or ledger recommendation
- name the exact command or artifact that proves it
- say the next smallest roadmap move
- distinguish clearly between:
  - active Orders execution truth
  - broader spreadsheet-native implementation truth
  - directional Figma or review intent

Your job is not to restart discovery.
Your job is to use the existing Orders execution package plus the broader spreadsheet-native source-of-truth packet to drive honest completion with minimal wasted motion.
```

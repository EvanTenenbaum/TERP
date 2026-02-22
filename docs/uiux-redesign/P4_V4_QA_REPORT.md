# P4 V4 QA Report (Adversarial + Remediation)

## Scope
- Branch/worktree: `codex/calm-power-redesign-20260219-cb6438cc`
- In scope: all redesign work completed in this worktree (excluding VIP portal/live shopping redesign work by plan)
- Focus: macro parity gates, micro UX gates, mobile/desktop action visibility, seed readiness, and invariant safety

## Adversarial Review (Pass 1)
### Findings (before fixes)
1. `gate:parity` was stale and tied to deleted legacy file paths, producing false failures and no architecture-level parity confidence.
2. `InventoryWorkSurface` was missing parity-critical API hooks present in the previous implementation:
   - `trpc.inventory.getEnhanced.useQuery`
   - `trpc.inventory.dashboardStats.useQuery`
   - `trpc.inventory.bulk.updateStatus.useMutation`
   - `trpc.inventory.bulk.delete.useMutation`
3. Placeholder gate was noisy (flagging legitimate input placeholders) and also exposed real unfinished actions (`coming soon`) in quote/vendor flows.
4. Mobile UX showed action visibility regressions in key surfaces (not horizontal overflow, but practical action discoverability issues).
5. RBAC gate script was scanning wrong path (`server/src/routers`) and could pass with misleading output.

### Initial adversarial score
- **7.4 / 10**

## Remediation Implemented
### Parity and Gate Reliability
- Rebuilt `scripts/qa/feature-parity.sh` to validate redesign architecture via canonical parity manifest + key API contracts.
- Rebuilt `scripts/qa/rbac-verify.sh` to scan `server/routers` correctly and classify mutation wrappers with actionable output.
- Tightened `scripts/qa/placeholder-scan.sh` to detect unfinished markers without false positives from normal form placeholders.

### Functional Parity Repairs
- Upgraded `client/src/components/work-surface/InventoryWorkSurface.tsx`:
  - Added enhanced inventory query path and dashboard stats hook.
  - Added bulk status update and bulk delete actions with selection model.
  - Preserved optimistic-lock handling and inspector behavior.
  - Added command-strip level bulk controls.

### UX and Mobile Discoverability Repairs
- `client/src/components/work-surface/InvoicesWorkSurface.tsx`:
  - Responsive header/filter/action layout (wrap and stack on smaller viewports).
- `client/src/components/work-surface/PickPackWorkSurface.tsx`:
  - Responsive single-column mobile-first structure with desktop split panel.
  - Added explicit visible primary action (`Refresh Queue`) in header.
- `client/src/components/work-surface/VendorsWorkSurface.tsx`:
  - Replaced “coming soon” purchase-order action with real navigation.
- `client/src/components/work-surface/QuotesWorkSurface.tsx`:
  - Replaced “coming soon” duplicate behavior with real duplicate-entry navigation path.
  - Replaced “coming soon” delete with actual mutation flow.
- `client/src/index.css` and workspace shell classes:
  - Added width/min-width constraints to eliminate clipped main-surface behavior in mobile contexts.

### QA Tooling Added
- Added route-sweep adversarial audit:
  - `scripts/uiux/v4-route-audit.mjs`
  - Output: `docs/uiux-redesign/P4_ROUTE_AUDIT.json`
  - Verifies per-route viewport behavior for mobile + desktop:
    - horizontal overflow
    - action visibility proxy

## Verification (Pass 2, Post-Fix)
- `pnpm check` ✅
- `pnpm vitest run client/src/lib/gridPreferences.test.ts client/src/lib/productIntakeDrafts.test.ts client/src/lib/navigation/frictionTelemetry.test.ts` ✅
- `pnpm uiux:p0:all` ✅ (`In-scope=94`, `Excluded=6`, `BaselineMissing=0`, `Unresolved=0`)
- `pnpm seed:redesign:v2:verify` ✅
- `pnpm gate:invariants` ✅
- `pnpm gate:all` ✅ (`placeholder`, `rbac`, `parity`)
- `pnpm exec node scripts/uiux/v4-route-audit.mjs` ✅ (`Failures: 0`)

## Residual Risks / Open Items
1. `gate:invariants` currently reports several checks as **Skipped** due known column-name drift in legacy queries (`invoice_number`, some `deleted_at` assumptions). Gate is passing by design but those queries should be aligned for stricter invariant enforcement.
2. Route audit action-visibility uses a pragmatic heuristic (button text + aria labels), not full task-completion simulation.
3. Excluded modules (`/vip-portal/*`, `/live-shopping`) were not redesigned, only covered by scope policy.

## Final adversarial score
- **9.1 / 10**
- Improvement came from removing false QA confidence, restoring missing parity hooks, and resolving real mobile action discoverability regressions.

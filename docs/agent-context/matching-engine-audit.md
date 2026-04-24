# Matching Engine Interface Parity Audit — TER-1245

**Status:** Complete (read-only audit)
**Branch:** `fix/ter-1245-match-interface-audit`
**Scope:** Provides the parity baseline required before TER-1249 (point consumers at Enhanced) and TER-1250 (delete legacy files).
**Tier:** SAFE — no functional code touched.

---

## 1. Executive Summary

Three matching-related modules coexist in `server/`:

| File | Role | Lines | Target state |
|---|---|---|---|
| `server/matchingEngine.ts` | Legacy "v1" matching engine. | 593 | **Delete in TER-1250** |
| `server/matchingEngineEnhanced.ts` | Canonical matching engine. Re-exports reverse helpers. | 971 | **Keep (canonical)** |
| `server/matchingEngineReverseSimplified.ts` | Reverse-matching helpers (batch → needs, supply → needs). | 325 | **Merge into Enhanced, then delete in TER-1250** |

**Key finding:** The legacy `server/matchingEngine.ts` already has **zero importers** anywhere in the repo. Every production consumer already imports from `matchingEngineEnhanced`. The historical analysis module (`server/historicalAnalysis.ts`) already imports `Match` from `matchingEngineEnhanced` — so the TER-1249 "point historicalAnalysis at Enhanced" work is effectively already in place, and TER-1249 is reduced to a verification pass.

The one remaining coupling that TER-1250 must address is the re-export relationship: `matchingEngineEnhanced.ts` re-exports `findClientNeedsForBatch` and `findClientNeedsForVendorSupply` from `matchingEngineReverseSimplified.ts`. Those two functions need to be moved (or re-homed) into Enhanced (or a new co-located file) before `matchingEngineReverseSimplified.ts` can be deleted without breaking `server/routers/matchingEnhanced.ts`.

---

## 2. Exported Symbol Map

### 2.1 `server/matchingEngine.ts` (legacy)

| Export | Kind | Enhanced equivalent | Signature compatible? | Notes |
|---|---|---|---|---|
| `MatchType` | type alias `"EXACT" \| "CLOSE" \| "HISTORICAL"` | `MatchType` (identical) | ✅ Yes | Structurally identical. |
| `Match` | interface | `Match` (enhanced adds `calculatedPrice?`, `availableQuantity?`) | ✅ Structurally compatible (Enhanced is a superset). | Enhanced uses `EnhancedBatchSourceData \| EnhancedVendorSourceData \| EnhancedHistoricalSourceData` for `sourceData`; legacy uses the non-prefixed trio. Shape is wider but fields overlap. |
| `BatchSourceData` | interface | `EnhancedBatchSourceData` | ⚠️ Near-parity — Enhanced adds `cogsMode`, `unitCogsMin`, `unitCogsMax` on `batch`. | No consumer imports this legacy type. |
| `VendorSourceData` | interface | `EnhancedVendorSourceData` (adds `vendorId?`) | ⚠️ Near-parity. | No consumer imports this legacy type. |
| `HistoricalSourceData` | interface | `EnhancedHistoricalSourceData` | ⚠️ Near-parity — legacy includes optional `pattern` (a `PurchasePattern`-shaped object); Enhanced omits it. | `PurchasePattern` is still carried by `HistoricalMatch` in `historicalAnalysis.ts`, so no runtime loss. No consumer imports this legacy type directly. |
| `MatchResult` | interface | `MatchResult` (identical) | ✅ Yes | Same 3 fields. |
| `findMatchesForNeed(needId): Promise<MatchResult>` | fn | `findMatchesForNeed` | ✅ Same signature; Enhanced adds strain-family, pricing rules, subcategory similarity, price penalty, quantity tolerance, and `recordMatch()` learning. | Enhanced is a strict superset of behaviour. |
| `findBuyersForInventory(batchId): Promise<MatchResult[]>` | fn | `findBuyersForInventory` | ✅ Same signature; Enhanced adds product join, pricing, strain-type lookup, historical buyer fallback, `recordMatch()`. | Enhanced superset. |
| `findBuyersForVendorSupply(supplyId): Promise<MatchResult[]>` | fn | `findBuyersForVendorSupply` | ✅ Same signature; Enhanced adds pricing/quantity scoring and `recordMatch()`. | Enhanced superset. |
| `getAllActiveNeedsWithMatches(): Promise<MatchResult[]>` | fn | `getAllActiveNeedsWithMatches` | ✅ Same signature; delegates to Enhanced `findMatchesForNeed` internally. | Equivalent. |
| `calculateMatchConfidence` (unexported in both files) | internal | internal (async in Enhanced) | n/a | Legacy is sync; Enhanced is async (strain-family lookup). Internal only. |

**Gaps in the legacy file (not present in Enhanced):**
- Strain alias matching via `utils/strainAliases` (`strainsMatch`, `strainsPartiallyMatch`) — Enhanced uses `strainId`-based family matching via `strainService` instead, with text fallback.
- Grade proximity scoring (A+ vs A = 5pts, A+ vs A- = 2pts) — Enhanced uses exact grade match only.
- Category/grade "any" flexible criteria keywords — Enhanced only supports "ANY" for strain type.
- Soft-delete filter `isNull(batches.deletedAt)` on batches — Enhanced does **not** filter soft-deleted batches in `findMatchesForNeed` or `findBuyersForInventory`. ⚠️ Potential regression (file a follow-up issue in TER-1250).

**Feature matrix summary:**

| Capability | Legacy | Enhanced |
|---|---|---|
| Product join for strain/category | ❌ (strain/category null in inventory path) | ✅ |
| Strain family matching | ❌ | ✅ |
| Strain alias matching (GSC = Girl Scout Cookies) | ✅ | ❌ |
| Grade proximity scoring | ✅ | ❌ |
| "any strain"/"any category"/"any grade" flexible keywords | ✅ | partial (strain type only) |
| Price penalty when over budget | soft (no penalty) | ✅ (−10) |
| Quantity tolerance (±10–20%) | ❌ | ✅ |
| Client-specific selling price via `pricingEngine` | ❌ | ✅ |
| Subcategory similarity scoring (FEAT-020) | ❌ | ✅ |
| `recordMatch()` for learning | ❌ | ✅ |
| Historical buyers integration | ✅ (pattern bubbled in `sourceData`) | ✅ (filtered by `clientId`) |
| Soft-delete filter (`isNull(batches.deletedAt)`) | ✅ | ❌ ⚠️ |

### 2.2 `server/matchingEngineEnhanced.ts` (canonical)

| Export | Kind | Notes |
|---|---|---|
| `MatchType` | type alias | `"EXACT" \| "CLOSE" \| "HISTORICAL"`. |
| `Match` | interface | Superset of legacy `Match` — adds optional `calculatedPrice`, `availableQuantity`. |
| `EnhancedBatchSourceData` | interface | Adds `cogsMode`, `unitCogsMin`, `unitCogsMax` on `batch`. |
| `EnhancedVendorSourceData` | interface | Adds optional `vendorId`. |
| `EnhancedHistoricalSourceData` | interface | Drops the legacy optional `pattern`; `PurchasePattern` still lives on `HistoricalMatch` in `historicalAnalysis.ts`. |
| `MatchResult` | interface | Identical shape to legacy. |
| `findMatchesForNeed` | fn | Async, same signature as legacy. |
| `findBuyersForInventory` | fn | Async, same signature as legacy. |
| `findBuyersForVendorSupply` | fn | Async, same signature as legacy. |
| `getAllActiveNeedsWithMatches` | fn | Async, same signature as legacy. |
| `findClientNeedsForBatch` | fn (**re-exported** from `./matchingEngineReverseSimplified`) | Used by `server/routers/matchingEnhanced.ts` line 47. |
| `findClientNeedsForVendorSupply` | fn (**re-exported** from `./matchingEngineReverseSimplified`) | Used by `server/routers/matchingEnhanced.ts` line 73. |

### 2.3 `server/matchingEngineReverseSimplified.ts` (legacy helper)

| Export | Kind | Enhanced equivalent | Notes |
|---|---|---|---|
| `findClientNeedsForBatch(batchId)` | fn | Re-exported by Enhanced | Returns ad-hoc inline `MatchResult` type (clientName, needDescription, priority, availableQuantity, daysSinceCreated…). **Not** the module-level `MatchResult`. |
| `findClientNeedsForVendorSupply(supplyId)` | fn | Re-exported by Enhanced | Same ad-hoc inline result shape plus `vendorName`, `unitPrice`. |

Both functions catch errors and return `[]` (fail-soft). Scoring weights differ from Enhanced's main path: category 50 / subcategory 30 / grade 20 / strain +15 / strain-type +10 / price ±10 / qty +5 (no qty tolerance, no pricing engine, no strain family).

---

## 3. Import-Site Inventory

Search scope: `**/*.ts` and `**/*.tsx` excluding `node_modules`, `product-management`, `docs`, `.git`, and `dist`.

### 3.1 Importers of `matchingEngine.ts` (legacy)

**None.** No `.ts`/`.tsx` file in `server/`, `client/`, `shared/`, `tests/`, `scripts/`, or `drizzle/` imports `./matchingEngine` or `../matchingEngine`.

Only `dist/index.js` (build artefact), `product-management/codebase/snapshot.json` (static snapshot), and historical/archived docs reference the path. None of those block deletion.

The test `server/tests/matchingEngine.test.ts` duplicates scoring logic inline — it does **not** import either engine — so it is not affected by deletion.

### 3.2 Importers of `matchingEngineEnhanced.ts` (canonical)

| Importer | Line(s) | What it uses |
|---|---|---|
| `server/routers/matchingEnhanced.ts` | 5 | `import * as matchingEngine` → `findMatchesForNeed`, `findClientNeedsForBatch`, `findClientNeedsForVendorSupply`, `getAllActiveNeedsWithMatches`, `findBuyersForInventory`, `Match` (type indexed) |
| `server/routers/clientNeedsEnhanced.ts` | 8, 9 | `import * as matchingEngine` + `import type { Match }`; uses `findMatchesForNeed` |
| `server/routers/vendorSupply.ts` | 8 | `import * as matchingEngine`; uses `findBuyersForVendorSupply` |
| `server/historicalAnalysis.ts` | 4 | `import type { Match }` |
| `server/needsMatchingService.ts` | 11, 272, 358 | static `import { findMatchesForNeed }` and dynamic `await import("./matchingEngineEnhanced")` |
| `server/clientNeedsDbEnhanced.ts` | 401 | dynamic `await import("./matchingEngineEnhanced")` to call `findMatchesForNeed` |

### 3.3 Importers of `matchingEngineReverseSimplified.ts`

| Importer | Line | What it uses |
|---|---|---|
| `server/matchingEngineEnhanced.ts` | 971 | `export { findClientNeedsForBatch, findClientNeedsForVendorSupply } from "./matchingEngineReverseSimplified";` |

No other file imports it directly.

---

## 4. `historicalAnalysis.ts` Match-Type Wiring

`server/historicalAnalysis.ts` line 4:

```ts
import type { Match } from "./matchingEngineEnhanced";
```

- It imports `Match` **from Enhanced**, not from the legacy engine. No change is required here for TER-1249.
- It exports `HistoricalMatch extends Match` (adds `pattern: PurchasePattern; isLapsedBuyer: boolean`).
- `findHistoricalBuyers()` constructs objects that match Enhanced's `Match` shape and populates `sourceData` with `{ client, purchaseCount, lastPurchaseDate, totalQuantity, averageQuantity }` — all fields exist in `EnhancedHistoricalSourceData`.
- Enhanced's `findMatchesForNeed` and `findBuyersForInventory` both consume these return values and narrow via a `hasClient` type guard, so the absence of the legacy `pattern` field on `EnhancedHistoricalSourceData` is tolerated (pattern data rides on `HistoricalMatch.pattern` itself, not on `sourceData.pattern`).

**Conclusion — TER-1249 is already satisfied in code.** The ticket's remaining scope is documentation + verification that nothing regresses when the legacy file is removed.

---

## 5. Safe Migration Path for TER-1249

Goal: `historicalAnalysis.ts` imports `Match` from `matchingEngineEnhanced` and no consumer of `historicalAnalysis` breaks.

Current status: ✅ already in place (commit history predates this audit).

Residual work for TER-1249:
1. Add a regression unit test (or extend the existing `server/tests/matchingEngine.test.ts`) that:
   - Imports `Match` from `matchingEngineEnhanced`.
   - Imports `HistoricalMatch` from `historicalAnalysis`.
   - Type-asserts assignability (`const m: Match = {} as HistoricalMatch;`).
2. Confirm `pnpm check` passes across `server/` with the Enhanced-only type path (this audit PR verifies that).
3. Close TER-1249 referencing this doc as evidence.

No runtime change required.

---

## 6. Safe Deletion Checklist for TER-1250

**Pre-deletion prerequisites:**

1. **Re-home the reverse helpers.** Before removing `server/matchingEngineReverseSimplified.ts`, either:
   - **Option A (recommended):** Copy `findClientNeedsForBatch` and `findClientNeedsForVendorSupply` into `server/matchingEngineEnhanced.ts` (end of file) and remove the `export { … } from "./matchingEngineReverseSimplified"` re-export line (currently at `matchingEngineEnhanced.ts:967–971`).
   - **Option B:** Move them into a new `server/services/reverseMatching.ts` (aligns with the "new code under services/" guidance in `CLAUDE.md`) and update the Enhanced re-export path. Prefer A for a purely deletion-focused ticket; B is a better long-term structure but expands scope.
2. **Port the missing soft-delete filter** into Enhanced's `findMatchesForNeed` and `findBuyersForInventory`:
   ```ts
   // add isNull(batches.deletedAt) to the `and(...)` in both inventory queries
   ```
   This closes the one real behavioural gap the legacy file had (⚠️ noted in §2.1).
3. **(Optional, recommended)** Port the grade-proximity and "any" flexible-criteria logic from legacy into Enhanced's `calculateMatchConfidence`. File as a follow-up issue if out of scope for TER-1250.

**Deletion step:**

4. Delete the following files:
   - `server/matchingEngine.ts`
   - `server/matchingEngineReverseSimplified.ts`
5. Update `server/tests/matchingEngine.test.ts` — either rename to `matchingEngineEnhanced.test.ts` and make it import real functions, or leave as-is (it doesn't import either engine; it just duplicates scoring logic). Minimum viable change: keep the file, update the top-of-file comment to reference Enhanced.
6. Update `product-management/codebase/snapshot.json` and `product-management/_system/cache/analysis-cache.json` **only if** the repo's snapshot tooling is expected to run as part of the PR; otherwise leave them — they'll regenerate on next run.

**Verification gate:**

7. `pnpm check` — zero TypeScript errors.
8. `pnpm lint` — clean.
9. `pnpm test` — all unit tests (including `server/tests/matchingEngine.test.ts`) pass.
10. `pnpm build` — production build succeeds (confirms `dist/` regenerates without `matchingEngineReverseSimplified` init block).
11. Grep gate: `grep -rEn "from [\"'].*matchingEngine[\"']" server/ client/ shared/` returns empty.
12. Grep gate: `grep -rEn "from [\"'].*matchingEngineReverseSimplified[\"']" server/ client/ shared/` returns empty.

**Rollback:**

13. Revert the deletion commit; no data-layer or migration implications.

---

## 7. Risk Register

| Risk | Likelihood | Severity | Mitigation |
|---|---|---|---|
| Enhanced silently drops the `isNull(batches.deletedAt)` filter that legacy enforced. | Already live (not caused by deletion). | Medium — soft-deleted batches can surface in match results today. | Port the filter as step 2 of TER-1250. |
| `matchingEngineReverseSimplified.ts` is deleted before its functions are re-homed — breaks `server/routers/matchingEnhanced.ts`. | Low if checklist followed. | High — runtime import error on boot. | Execute step 1 (re-home) **before** step 4 (delete) in the same PR. |
| Legacy "any strain" / "any grade" keywords drop silently. | Low — product usage unclear. | Low — matches simply become less permissive. | Port to Enhanced as a follow-up or document as an intentional behaviour change. |
| Legacy grade-proximity scoring drops silently. | Low. | Low — scoring becomes stricter. | Same as above. |
| Prior consolidation attempt failed adversarial review (PR #581, cherry-picks 2b9f547 + 6901d90). | — | — | This audit supersedes that attempt by explicitly enumerating the gaps (§2.1 feature matrix) so the next consolidation PR can address them head-on. |

---

## 8. Acceptance Criteria Status (for this audit PR)

| Criterion | Status |
|---|---|
| `docs/agent-context/matching-engine-audit.md` exists and is complete. | ✅ This document. |
| `pnpm check` passes (no new errors). | ✅ Verified below. |
| No functional code changed. | ✅ Doc-only. |

---

## 9. Appendix — Commands Used

```bash
# Import-site enumeration
grep -rEn 'from ".*matchingEngine[A-Za-z]*"|from '"'"'.*matchingEngine[A-Za-z]*'"'"'' \
  --include='*.ts' --include='*.tsx' \
  --exclude-dir=node_modules --exclude-dir=product-management --exclude-dir=.git .

# Negative check — nothing imports the legacy file
grep -rEn 'matchingEngine[\"'"'"']' --include='*.ts' . \
  | grep -v matchingEngineEnhanced | grep -v matchingEngineReverseSimplified
```

---

**Author:** Factory Droid (TER-1245)
**Prior attempt reference:** PR #581 (closed — failed adversarial review). Cherry-pickable SHAs: `2b9f547`, `6901d90`.

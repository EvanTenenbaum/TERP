# Spreadsheet-Native Full Rollout Roadmap

Date: `2026-03-20`
Status: `planning`

## Purpose

Roll out the PowersheetGrid spreadsheet-native runtime to every TERP module where it adds value, without losing any functionality users currently have.

Orders is complete (7 gates closed, initiative retired 2026-03-20). This roadmap covers the remaining 11 modules.

## Capability Regression Prevention

**Evan's core concern: users must not lose functionality they currently have.**

### Systematic Confidence Protocol

Every module follows this sequence BEFORE any code is written:

1. **Extract** — Run the capability extraction script against the classic WorkSurface component. Output: machine-readable CSV of every trpc mutation, trpc query, button, dialog, route navigation, and keyboard shortcut.
2. **Diff** — Compare extracted capabilities against the Figma golden flow and existing capability ledger. Output: parity gap report showing what's covered, what's missing, what's intentionally dropped.
3. **Prove** — For each capability in the gap report, classify as: `preserved` (same behavior), `adapted` (different UX, same outcome), `deferred` (not in this wave), or `rejected` (intentionally removed with justification).
4. **Gate** — No implementation starts until the parity gap report shows zero unclassified capabilities. The detailed capability ledger is the gate.

### What Already Exists

| Artifact                     | Location                                                                                                                                | Status                                |
| ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Feature Preservation Matrix  | `docs/specs/ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md`                                                                              | 110 features, 99 confirmed, 3 unknown |
| Figma-to-TERP Launch Matrix  | `docs/design/spreadsheet-native-golden-flows-2026-03-18/figma-to-terp-reality-launch-matrix.md`                                         | Wave 1-3 mapping decisions            |
| Build Source of Truth        | `docs/design/spreadsheet-native-golden-flows-2026-03-18/build-source-of-truth-2026-03-19/`                                              | Implementation planning baseline      |
| Pack-level Capability Ledger | `docs/design/spreadsheet-native-golden-flows-2026-03-18/build-source-of-truth-2026-03-19/spreadsheet-native-pack-capability-ledger.csv` | 7 modules at pack level               |
| Discrepancy Log              | `docs/design/spreadsheet-native-golden-flows-2026-03-18/build-source-of-truth-2026-03-19/spreadsheet-native-pack-discrepancy-log.md`    | P1: 5, P2: 5                          |
| Figma Golden Flows           | `docs/design/spreadsheet-native-golden-flows-2026-03-18/*.svg`                                                                          | 12 sheet designs                      |
| Video Feedback               | `artifacts/video-feedback/2026-03-19-figma-review/`                                                                                     | Recording review with extracted tasks |
| Gemini Deep QA               | `docs/design/spreadsheet-native-golden-flows-2026-03-18/gemini-deep-qa-handoff-2026-03-19/`                                             | Cross-model adversarial review        |
| Capability Ledger Template   | `docs/specs/SPREADSHEET-NATIVE-CAPABILITY-LEDGER-TEMPLATE.md`                                                                           | Standard template                     |
| Interaction Source of Truth  | `docs/specs/SPREADSHEET-NATIVE-INTERACTION-SOURCE-OF-TRUTH-CONTRACT.md`                                                                 | Contract for interaction behaviors    |

### Detailed Capability Ledgers (5 modules — build-ready)

| Module               | Ledger                                                                                   | Summary                                                                                                | Discrepancy Log                                                                                    |
| -------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Sales Orders         | `docs/specs/spreadsheet-native-ledgers/sales-orders-sheet-capability-ledger.csv`         | [summary](../specs/spreadsheet-native-ledgers/sales-orders-sheet-capability-ledger-summary.md)         | [discrepancies](../specs/spreadsheet-native-ledgers/sales-orders-sheet-discrepancy-log.md)         |
| Operations Inventory | `docs/specs/spreadsheet-native-ledgers/operations-inventory-sheet-capability-ledger.csv` | [summary](../specs/spreadsheet-native-ledgers/operations-inventory-sheet-capability-ledger-summary.md) | [discrepancies](../specs/spreadsheet-native-ledgers/operations-inventory-sheet-discrepancy-log.md) |
| Sales Sheets         | `docs/specs/spreadsheet-native-ledgers/sales-sheets-capability-ledger.csv`               | [summary](../specs/spreadsheet-native-ledgers/sales-sheets-capability-ledger-summary.md)               | [discrepancies](../specs/spreadsheet-native-ledgers/sales-sheets-discrepancy-log.md)               |
| Direct Intake        | `docs/specs/spreadsheet-native-ledgers/direct-intake-capability-ledger.csv`              | [summary](../specs/spreadsheet-native-ledgers/direct-intake-capability-ledger-summary.md)              | [discrepancies](../specs/spreadsheet-native-ledgers/direct-intake-discrepancy-log.md)              |
| Purchase Orders      | `docs/specs/spreadsheet-native-ledgers/purchase-orders-capability-ledger.csv`            | [summary](../specs/spreadsheet-native-ledgers/purchase-orders-capability-ledger-summary.md)            | [discrepancies](../specs/spreadsheet-native-ledgers/purchase-orders-discrepancy-log.md)            |

### Pack-Level Only (7 modules — NOT build-ready)

These need detailed capability ledgers before implementation:

- Fulfillment / Pick & Pack (`FUL-PK-001` to `FUL-PK-004`)
- Invoices (`ACCT-INV-001` to `ACCT-INV-003`)
- Payments (`ACCT-PAY-001` to `ACCT-PAY-004`)
- Client Ledger (`ACCT-LED-001` to `ACCT-LED-003`)
- Returns (`SALE-RET-001` to `SALE-RET-004`)
- Samples (`OPS-SMP-001` to `OPS-SMP-004`)
- Shared contracts (`CROSS-001` to `CROSS-005`)

## Rollout Waves

Waves follow the Figma-to-TERP Reality Launch Matrix. Each wave has a prerequisite gate.

### Wave 0: Foundation (COMPLETE)

Orders is the pilot. All 7 gates closed. The PowersheetGrid runtime, selection model, clipboard/fill/edit contracts, affordance matrix, and keyboard hints are proven and reusable.

**Reusable foundation from Orders:**

- `PowersheetGrid` — wrapper with surfaceId, requirementIds, releaseGateIds, affordances
- `SpreadsheetPilotGrid` — AG Grid Enterprise wrapper with selection, clipboard, fill
- `WorkSurfaceStatusBar` + `KeyboardHintBar` — status and keyboard hint primitives
- `PowersheetFieldPolicy` — editable/locked field contract
- `PowersheetEditRejection` — blocked-edit feedback with toast
- CSS editable/locked cell cues scoped to surface ID
- Platform-detected keyboard hints

### Wave 1: Core Business Surfaces

**Prerequisite:** Wave 0 complete (done)

| #   | Module            | Classic Component                           | Detailed Ledger | Figma Design              | Agent Team             |
| --- | ----------------- | ------------------------------------------- | --------------- | ------------------------- | ---------------------- |
| 1   | **Inventory**     | `InventoryWorkSurface.tsx` (97KB)           | EXISTS          | `inventory-sheet.svg`     | Coder + QA             |
| 2   | **Sales Sheets**  | `SalesSheetCreatorPage.tsx`                 | EXISTS          | `sales-sheet.svg`         | Coder + QA             |
| 3   | **Payments**      | `Payments.tsx` + `InvoiceToPaymentFlow.tsx` | PACK-ONLY       | `payments-sheet.svg`      | Architect + Coder + QA |
| 4   | **Client Ledger** | `ClientLedgerWorkSurface.tsx` (39KB)        | PACK-ONLY       | `client-ledger-sheet.svg` | Architect + Coder + QA |

#### Wave 1 Execution Order

**1A. Inventory** (detailed ledger exists, `InventorySheetPilotSurface.tsx` already started)

- Agent: `coder-agent` — Extend InventorySheetPilotSurface to full parity
- Gate: Run capability extraction against InventoryWorkSurface, diff against existing ledger
- Scope: Browse, filter, intake handoff, transfer, location management, batch detail
- Risk: InventoryWorkSurface is 97KB — largest classic surface. High capability count.

**1B. Sales Sheets** (detailed ledger exists)

- Agent: `coder-agent` — Build SalesSheetsPilotSurface
- Gate: Capability extraction against SalesSheetCreatorPage
- Scope: Browser + preview split, draft/save/share, convert-to-order, saved views
- Risk: Dirty-state blocking of share/convert actions must be preserved

**1C. Payments** (PACK-ONLY — needs detailed ledger first)

- Agent: `architect-agent` — Build detailed capability ledger from Payments.tsx + InvoiceToPaymentFlow.tsx
- Then: `coder-agent` — Build PaymentsPilotSurface
- Gate: Detailed ledger must be verified before code
- Scope: Invoice review, guided payment commit, allocation, receipt, legacy coexistence
- Risk: Payment commit is trust-critical. Explicit commit boundary must be preserved.

**1D. Client Ledger** (PACK-ONLY — needs detailed ledger first)

- Agent: `architect-agent` — Build detailed capability ledger from ClientLedgerWorkSurface.tsx
- Then: `coder-agent` — Build ClientLedgerPilotSurface
- Gate: Detailed ledger must be verified before code
- Scope: Ledger browse, running balance, adjustment gate, detail navigation
- Risk: Running balance must stay visible when detail is open

### Wave 2: Operations & Procurement

**Prerequisite:** Wave 1 Inventory and Sales Sheets complete (shared grammar proven on secondary surfaces)

| #   | Module              | Classic Component                       | Detailed Ledger | Figma Design                | Agent Team             |
| --- | ------------------- | --------------------------------------- | --------------- | --------------------------- | ---------------------- |
| 5   | **Direct Intake**   | `DirectIntakeWorkSurface.tsx` (85KB)    | EXISTS          | `receiving-sheet.svg`       | Coder + QA             |
| 6   | **Purchase Orders** | `PurchaseOrdersWorkSurface.tsx` (104KB) | EXISTS          | `purchase-orders-sheet.svg` | Coder + QA             |
| 7   | **Fulfillment**     | `PickPackWorkSurface.tsx` (53KB)        | PACK-ONLY       | `shipping-sheet.svg`        | Architect + Coder + QA |

#### Wave 2 Execution Order

**2A. Direct Intake** (detailed ledger exists)

- Agent: `coder-agent` — Build IntakePilotSurface
- Scope: Dominant intake table, pre-submit review, batch validation, failure-state visibility
- Risk: Direct intake vs PO-linked intake are different workflows. Must not collapse them.

**2B. Purchase Orders** (detailed ledger exists)

- Agent: `coder-agent` — Build PurchaseOrdersPilotSurface
- Scope: PO queue + document, receiving handoff CTA, COGS management
- Risk: PO is a pre-receipt commitment. Intake handoff must stay visible and row-scoped.

**2C. Fulfillment / Pick & Pack** (PACK-ONLY — needs detailed ledger first)

- Agent: `architect-agent` → `coder-agent`
- Scope: Pick queue, active pick context, bag/manifest, explicit status workflow
- Risk: Mobile-friendly fulfillment is critical. Sheet-native must not regress touch usability.

### Wave 3: Sales Extensions & Accounting

**Prerequisite:** Wave 2 complete

| #   | Module       | Classic Component                | Detailed Ledger | Figma Design         | Agent Team             |
| --- | ------------ | -------------------------------- | --------------- | -------------------- | ---------------------- |
| 8   | **Invoices** | `InvoicesWorkSurface.tsx` (43KB) | PACK-ONLY       | `invoices-sheet.svg` | Architect + Coder + QA |
| 9   | **Returns**  | `ReturnsPage.tsx`                | PACK-ONLY       | `returns-sheet.svg`  | Architect + Coder + QA |
| 10  | **Quotes**   | `QuotesWorkSurface.tsx` (30KB)   | NONE            | N/A                  | Architect + Coder + QA |
| 11  | **Samples**  | `SampleManagement.tsx`           | PACK-ONLY       | `samples-sheet.svg`  | Architect + Coder + QA |

### Wave 4: Classic Sunset

**Prerequisite:** All Wave 1-3 modules have sheet-native surfaces with parity proof

- Remove SheetModeToggle
- Set sheet-native as default for all modules
- Keep classic route accessible via `?surface=classic` for 30-day transition
- Remove classic WorkSurface components after transition period
- Update all documentation

## Agent Team Delegations

| Role            | Responsibility                                                                                                   | Tools                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| **Architect**   | Build detailed capability ledger from classic component. Run capability extraction. Produce parity gap report.   | `feature-dev:code-architect`, `feature-dev:code-explorer` |
| **Coder**       | Implement sheet-native surface. Follow the Orders gate model (plan → implement → validate → review → writeback). | `terp-implementer`, `metaswarm:coder-agent`               |
| **QA**          | Adversarial review of each module. Verify no capability regression. Run parity proof.                            | `terp-qa-reviewer`, `feature-dev:code-reviewer`           |
| **Coordinator** | Own source-of-truth updates, gate promotion, Linear writeback. One coordinator per wave.                         | Main agent                                                |

## Per-Module Gate Structure (simplified from Orders)

Each module follows 3 gates instead of 7:

| Gate | Name              | Exit Criteria                                                                                                                                                             |
| ---- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `G1` | Capability Ledger | Detailed CSV exists. Parity gap report shows zero unclassified capabilities. Adopt/Adapt/Preserve/Reject decisions for every capability.                                  |
| `G2` | Implementation    | Sheet-native surface renders. All `preserved` and `adapted` capabilities work. Affordance matrix, keyboard hints, editable/locked cues. All 4 verification commands pass. |
| `G3` | Parity Proof      | Staging proof shows every preserved capability works. Classic fallback toggle verified. Adversarial review passes. No P0/P1 features missing.                             |

## Capability Extraction Script

A script will be built at `scripts/extract-worksurface-capabilities.ts` to automate step 1 of the regression prevention protocol:

```
pnpm capability:extract <WorkSurfaceFile.tsx>
```

Output: CSV with columns:

- `capability_id` — auto-generated
- `type` — mutation | query | action | navigation | dialog | keyboard
- `name` — human-readable label
- `source` — trpc route or component
- `current_surface` — which component renders it
- `criticality` — from Feature Preservation Matrix if mapped

This eliminates guesswork. Every button, every mutation, every query is accounted for before redesign begins.

## Linear Integration

- Parent issue: Create `TERP-SNR` (Spreadsheet-Native Rollout) as parent
- Per-wave epics: `SNR-W1`, `SNR-W2`, `SNR-W3`, `SNR-W4`
- Per-module issues: `SNR-W1-INV`, `SNR-W1-SHT`, `SNR-W1-PAY`, `SNR-W1-LED`
- Per-gate sub-issues: `SNR-W1-INV-G1`, `SNR-W1-INV-G2`, `SNR-W1-INV-G3`

## Priority Order

1. Build the capability extraction script (unblocks all modules)
2. Wave 1A: Inventory (largest surface, highest user impact, pilot already started)
3. Wave 1B: Sales Sheets (second highest daily use)
4. Wave 1C-1D: Payments + Client Ledger (need architect pass first)
5. Wave 2A-2C: Intake, POs, Fulfillment
6. Wave 3: Invoices, Returns, Quotes, Samples
7. Wave 4: Classic sunset

## References

- Orders initiative (complete): `docs/roadmaps/orders-spreadsheet-runtime/README.md`
- Figma golden flows: `docs/design/spreadsheet-native-golden-flows-2026-03-18/`
- Video feedback: `artifacts/video-feedback/2026-03-19-figma-review/`
- Gemini deep QA: `docs/design/spreadsheet-native-golden-flows-2026-03-18/gemini-deep-qa-handoff-2026-03-19/`
- Feature Preservation Matrix: `docs/specs/ui-ux-strategy/FEATURE_PRESERVATION_MATRIX.md`
- Capability Ledger Template: `docs/specs/SPREADSHEET-NATIVE-CAPABILITY-LEDGER-TEMPLATE.md`

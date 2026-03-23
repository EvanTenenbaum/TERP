# Capability Ledger Summary: Samples

Snapshot: commit `7514e3e8` (main, 2026-03-20) | Extracted: 2026-03-20 | Checked Against Code: yes

## Module Family

Table + Support Cards — hybrid with two companion cards (expiring samples widget + return/vendor-return dialogs).

## Architecture Decision

**Hybrid with companion cards, not fully sheet-native.**

The expiring-samples widget uses its own independent query (samples.getExpiring, not derived from getAll) and produces time-urgency framing that a grid column cannot replicate. Return and vendor-return chains require multi-step dialogs. Fulfillment must stay an explicit confirmed action. The grid handles browse, filter, sort, and inline status reading.

## Critical Findings

1. **DISC-SAM-001 (High):** `samples.fulfillRequest` implemented with FOR UPDATE lock. **Partially resolved:** SamplesPilotSurface.tsx:445 wires fulfillRequest with inventory decrement. Classic SampleManagement.tsx still lacks this action. Pilot is reachable (pilotSurfaceSupported=true) but toggle is missing from command strip.
2. **DISC-SAM-002 (High):** `samples.setExpirationDate` exists with no UI — operators cannot set expiration dates after creation.
3. **DISC-SAM-003 (High):** Due date stored inside `notes` free-text as parseable substring (`Due Date: YYYY-MM-DD`). Only `extractDueDate` regex stands between this and invisible data.

## Capabilities (26 total, vs 15 from extraction)

| ID      | Capability                        | Type           | Criticality | Migration Decision           |
| ------- | --------------------------------- | -------------- | ----------- | ---------------------------- |
| SAM-001 | Sample request queue browse       | Query          | P0          | Adopt (sheet-native)         |
| SAM-002 | Filter by status (tabs)           | Query          | P0          | Adopt                        |
| SAM-003 | Search by client/product          | Action         | P1          | Adopt                        |
| SAM-004 | Create sample request dialog      | Mutation       | P0          | Preserve (dialog)            |
| SAM-005 | Cancel sample request             | Mutation       | P1          | Adopt (row action)           |
| SAM-006 | Approve sample request            | Mutation       | P0          | Adopt (sidecar card)         |
| SAM-007 | Return sample                     | Mutation       | P1          | Preserve (dialog)            |
| SAM-008 | Vendor return for sample          | Mutation       | P1          | Preserve (dialog)            |
| SAM-009 | Fulfill sample request            | Mutation       | P0          | Adopt — NO UI (DISC-SAM-001) |
| SAM-010 | Set expiration date               | Mutation       | P1          | Adopt — NO UI (DISC-SAM-002) |
| SAM-011 | Update sample notes               | Mutation       | P2          | Adopt                        |
| SAM-012 | Delete sample request             | Mutation       | P2          | Adopt (row action + confirm) |
| SAM-013 | Expiring samples widget           | View           | P0          | Preserve (companion card)    |
| SAM-014 | Sample detail inspector           | View           | P1          | Adapt (right-rail)           |
| SAM-015 | Export samples CSV                | Export         | P1          | Adopt                        |
| SAM-016 | Bulk status update                | Mutation       | P2          | Adopt                        |
| SAM-017 | Sample analytics (if wired)       | Query          | P2          | Deferred                     |
| SAM-018 | Due date extraction from notes    | View           | P1          | Adapt — dedicated column     |
| SAM-019 | Sample history tracking           | Query          | P2          | Adopt                        |
| SAM-020 | Client context on request         | Query          | P1          | Preserve                     |
| SAM-021 | Product/batch context             | Query          | P1          | Preserve                     |
| SAM-022 | Allocation tracking               | Query          | P2          | Deferred                     |
| SAM-023 | Sample request from order context | Mutation-stage | P2          | Deferred                     |
| SAM-024 | Return confirmation gate          | Dialog         | P1          | Preserve                     |
| SAM-025 | Vendor return confirmation gate   | Dialog         | P1          | Preserve                     |
| SAM-026 | Delete confirmation gate          | Dialog         | P2          | Preserve                     |

## Discrepancies

| ID           | Description                                                                                                                                                                                                                                                                                                 | Severity                           |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- |
| DISC-SAM-001 | samples.fulfillRequest implemented with FOR UPDATE lock. **Partially resolved:** SamplesPilotSurface.tsx:445 wires fulfillRequest with inventory decrement. Classic SampleManagement.tsx still lacks this action. Pilot is reachable (pilotSurfaceSupported=true) but toggle is missing from command strip. | High (Classic path still affected) |
| DISC-SAM-002 | samples.setExpirationDate exists, no UI to set dates after creation                                                                                                                                                                                                                                         | High                               |
| DISC-SAM-003 | Due date stored in notes text as parseable substring                                                                                                                                                                                                                                                        | High                               |

## Classification

- sheet-native: 8 | sheet-plus-sidecar: 4 | dialog-preserved: 7 | adopt-no-ui: 2 | deferred: 3 | companion-card: 2

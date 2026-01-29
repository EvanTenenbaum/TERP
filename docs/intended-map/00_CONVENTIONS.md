# Intended Behavior Map - ID Conventions

**Version:** 1.0
**Created:** 2026-01-29
**Purpose:** Canonical ID schemes and CSV headers for all artifacts

---

## ID Schemes

### Requirements
- **Format:** `REQ-###`
- **Example:** `REQ-001`, `REQ-042`
- **Usage:** Requirements extracted from specs

### Golden Flows
- **Format:** `GF-###`
- **Example:** `GF-001` (Direct Intake), `GF-008` (Sample Request)
- **Usage:** The 8 critical user journeys that must work for TERP to be "complete"
- **Defined Set:**
  - GF-001: Direct Intake
  - GF-002: Procure-to-Pay
  - GF-003: Order-to-Cash
  - GF-004: Invoice & Payment
  - GF-005: Pick & Pack
  - GF-006: Client Ledger Review
  - GF-007: Inventory Management
  - GF-008: Sample Request

### Other Flows
- **Format:** `FLOW-###`
- **Example:** `FLOW-001`, `FLOW-015`
- **Usage:** Non-golden flows (supporting, administrative, etc.)

### Rules
- **Format:** `RULE-###`
- **Example:** `RULE-001`, `RULE-023`
- **Usage:** Business rules, validation rules, calculation rules

### Invariants
- **Format:** `INV-###`
- **Example:** `INV-001` (inventory.onHandQty >= 0)
- **Usage:** System invariants that must always hold true
- **Predefined from GOLDEN_FLOWS_BETA_ROADMAP.md:**
  - INV-001: `inventory.onHandQty >= 0`
  - INV-002: `order.total = sum(line_items.subtotal)`
  - INV-003: `invoice.balance = total - amountPaid`
  - INV-004: `GL debits = GL credits` per transaction
  - INV-005: `client.totalOwed = sum(unpaid_invoices)`
  - INV-006: `batch.onHandQty = initialQty - sum(allocations)`
  - INV-007: Audit trail exists for all mutations
  - INV-008: Order state transitions follow valid paths only

### Screens/UI
- **Format:** `SCR-###`
- **Example:** `SCR-001`, `SCR-042`
- **Usage:** UI screens/pages

### Endpoints
- **Format:** `API-###`
- **Example:** `API-001`, `API-123`
- **Usage:** tRPC endpoints/procedures

### Models/Tables
- **Format:** `MDL-###`
- **Example:** `MDL-001` (clients), `MDL-015` (orders)
- **Usage:** Database tables/models

---

## Status Values

### Coverage Status
| Status | Meaning |
|--------|---------|
| `Intended&Implemented` | Spec exists AND code implements it correctly |
| `IntendedMissing` | Spec exists but code does NOT implement it |
| `Divergent` | Code implements something DIFFERENT from spec |
| `ImplNotIntended` | Code exists but NO spec defines it |
| `Unspecified` | No spec found for this item |
| `Unresolved` | Specs conflict - needs decision |

### Task/Flow Status
| Status | Meaning |
|--------|---------|
| `ready` | Ready to start |
| `in-progress` | Currently being worked |
| `complete` | Finished and verified |
| `blocked` | Waiting on dependency |

---

## CSV Headers

### 00_COVERAGE.csv
```
Type,ID,Name,OwnerModule,IntentSource,Status,ImplementationSource,Notes
```

### 02_FLOW_MATRIX_INTENDED.csv
```
FlowID,Name,Type,Preconditions,Steps,Outcomes,ErrorPaths,RollbackRecovery,RulesReferenced,InvariantsReferenced,CrossFlowTouchpoints,RoleRequirements,IntentSource
```

### 03_RBAC_INTENDED.csv
```
Role,Resource,Action,Condition,IntentSource,ImplSource,Status
```

### 03_STATUS_GUARDS_INTENDED.csv
```
Entity,CurrentStatus,Action,NextStatus,Guard,IntentSource
```

### 03_VALIDATIONS_INTENDED.csv
```
Object,Field,Rule,ErrorMessage,IntentSource
```

### 04_RTM_INTENDED.csv
```
ReqID,Description,FlowIDs,RuleIDs,InvariantIDs,States,Screens,Endpoints,Models,IntentSource,Status
```

---

## Citation Format

### Intent Source Citation
- Format: `{doc_path}:{section_or_line}`
- Example: `docs/golden-flows/specs/GF-001-DIRECT-INTAKE.md:Business Rules`
- Example: `docs/roadmaps/GOLDEN_FLOWS_BETA_ROADMAP.md:INV-001`

### Implementation Source Citation
- Format: `{file_path}:{line_range_or_symbol}`
- Example: `server/routers/orders.ts:45-120`
- Example: `client/src/pages/Orders.tsx:OrderForm`

---

## Authority Ranking (for Intent Sources)

| Rank | Source Type | Example |
|------|-------------|---------|
| 1 (Highest) | Golden Flow Specs | `docs/golden-flows/specs/GF-*.md` |
| 2 | Feature Specs | `docs/specs/*.md` |
| 3 | Kiro Requirements | `.kiro/specs/*/requirements.md` |
| 4 | Master Roadmap | `docs/roadmaps/MASTER_ROADMAP.md` |
| 5 | Protocols | `docs/protocols/*.md` |
| 6 | QA Playbook | `docs/qa/QA_PLAYBOOK.md` |
| 7 (Lowest) | UI Copy | Only if consistent |

When sources conflict, higher-ranked source wins. If same rank, mark `Unresolved`.

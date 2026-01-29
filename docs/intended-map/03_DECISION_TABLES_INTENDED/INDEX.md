# Decision Tables Index

**Purpose:** Catalog of all business rules expressed as decision tables
**Created:** 2026-01-29

---

## Decision Tables

| Table | Purpose | Intent Source |
|-------|---------|---------------|
| `RBAC_INTENDED.csv` | Role-based access control permissions | QA_PLAYBOOK.md, FLOW_GUIDE.md |
| `STATUS_GUARDS_INTENDED.csv` | Valid entity state transitions | Golden Flow specs |
| `VALIDATIONS_INTENDED.csv` | Input validation rules | Golden Flow specs |
| `INVENTORY_RULES_INTENDED.csv` | Inventory allocation and reservation | GF-003, GF-007 |

---

## RBAC Decision Table

**File:** `RBAC_INTENDED.csv`

Maps: `Role × Resource × Action → Allow/Deny`

### Roles
- `super_admin` - Full access, bypasses all checks
- `sales_manager` - Sales operations, client management
- `sales_rep` - Own orders, limited client access
- `inventory_manager` - Inventory operations
- `accounting_manager` - AR/AP, GL, payments
- `fulfillment` - Pick, pack, ship
- `auditor` - Read-only access

### Resources
- `clients` - Client/party management
- `orders` - Sales orders
- `inventory` - Batch management
- `accounting` - Invoices, payments, GL
- `settings` - System configuration
- `audit` - Audit logs

### Actions
- `read` - View/list
- `create` - Create new
- `update` - Modify existing
- `delete` - Soft delete
- `manage` - Full control

---

## Status Guards Decision Table

**File:** `STATUS_GUARDS_INTENDED.csv`

Maps: `Entity × CurrentStatus × Action → NextStatus, Guard`

### Entities with State Machines
- Orders
- Invoices
- Batches
- Purchase Orders
- Sample Requests
- Fiscal Periods

---

## Validations Decision Table

**File:** `VALIDATIONS_INTENDED.csv`

Maps: `Object × Field → Rule, ErrorMessage`

Covers critical form validations for:
- Order creation
- Intake form
- Payment recording
- Client creation

---

## Inventory Rules Decision Table

**File:** `INVENTORY_RULES_INTENDED.csv`

Covers:
- Reservation logic
- Allocation priority
- Sample allocation limits
- Quantity bucket management

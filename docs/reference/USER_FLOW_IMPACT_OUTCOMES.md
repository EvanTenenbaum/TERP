# User Flow Impact Outcomes Model (v1.0)

_Generated: 2026-01-15 | Source: `docs/reference/USER_FLOW_MATRIX.csv` + `docs/reference/FLOW_GUIDE.md`_

This document defines the **impact-outcome columns** used to validate each user flow’s expected business logic against system testing. It is designed to sit alongside the canonical flow matrix and provides the structured fields needed to compare **expected outcomes** vs **observed behavior**.

## Canonical Inputs (Do Not Modify)

The following columns come directly from the canonical matrix and should remain unchanged for identity, access control, and routing context:

- Domain
- Entity
- Flow Name
- Archetype
- tRPC Procedure
- Type
- Procedure Wrapper
- Permissions
- Permission Mode
- Roles
- UI Entry Paths
- Business Purpose
- Implementation Status
- Known Issues
- Router File

Reference: `docs/reference/USER_FLOW_MATRIX.csv` and `docs/reference/FLOW_GUIDE.md`.

---

## Impact Outcome Columns (Additions)

Use these columns **per flow** to document expected behavior and measurable impacts.

| Column                     | Definition                                                        | Validation Source                           | Expected Evidence                                             |
| -------------------------- | ----------------------------------------------------------------- | ------------------------------------------- | ------------------------------------------------------------- |
| Primary Data Inputs        | Required input fields/objects to execute the flow.                | Router input schema + flow guide.           | Input payload matches schema and required fields.             |
| Preconditions              | Required prior state (permissions, status, flags, dependencies).  | Flow guide + lifecycle notes + permissions. | User role/permissions and entity state satisfy preconditions. |
| Core Business Rules        | Domain rules that must hold (validation, constraints, rounding).  | Flow guide + business purpose.              | Rule checks visible in code or validation errors.             |
| State Transitions          | Before → after state changes (status, lifecycle).                 | Flow guide lifecycle sections.              | Record status changes match allowed transitions.              |
| Data Writes                | Tables/records expected to be created/updated/deleted.            | Router file + DB schema.                    | Database changes observed as expected.                        |
| Inventory Impact           | Any expected inventory quantity/valuation changes.                | Inventory domain flows + business purpose.  | Inventory movement entries and totals change accordingly.     |
| Financial Impact           | AR/AP, invoices, payments, totals, or money movement impact.      | Accounting domain flows + business purpose. | Money totals and records updated accurately.                  |
| Ledger Impact              | Ledger postings or journal entries required.                      | Accounting/ledger flows.                    | Ledger entries created/updated when required.                 |
| Audit & Compliance         | Required audit trail, immutable logs, or compliance artifacts.    | RBAC/auth requirements + audit flow notes.  | Audit logs and history entries exist.                         |
| Notifications & Alerts     | Emails, notifications, or alert triggers.                         | Business purpose + known issues.            | Triggered notification events/logs.                           |
| External Integrations      | Third-party or inter-service calls.                               | Router/service code.                        | Request logs, webhook events, or side effects.                |
| Guardrails & Failure Modes | Expected errors for invalid state or access.                      | Permissions + lifecycle rules + validation. | Errors are deterministic and safe.                            |
| Expected Outputs           | API response shape and UI expectations.                           | Router output schema + UI expectations.     | Response fields present, UI renders correctly.                |
| Test Assertions            | Concrete checks to verify correctness.                            | Derived from all above.                     | Test results in QA run.                                       |
| Source-of-Truth Links      | Exact reference pointers (flow guide section, router file, spec). | Canonical docs.                             | Traceable references attached.                                |

---

## Validation Checklist (Double-Check Impact Outcomes)

Use this checklist when populating the impact columns to ensure expected outcomes are **correct** and traceable:

1. **Flow Identity Confirmed**
   - Flow row exists in `USER_FLOW_MATRIX.csv`.
   - tRPC procedure and router file match the flow guide.
2. **Permissions Confirmed**
   - Procedure wrapper and permissions align with the flow guide.
   - Role list matches expected access.
3. **Lifecycle Verified**
   - Status transitions match the flow guide lifecycle diagram.
4. **Data Side Effects Verified**
   - Router file points to the data writes and/or services used.
5. **Business Rule Coverage**
   - Validation constraints are documented and testable.
6. **Impact Classification**
   - Inventory/financial/ledger/audit impacts are explicitly classified.
7. **Failure Modes**
   - Invalid state/permission errors are explicitly captured.
8. **Outputs & Assertions**
   - Expected output fields and concrete test assertions are listed.

---

## Recommended Workflow

1. **Start with the canonical flow row** from `USER_FLOW_MATRIX.csv`.
2. **Locate the flow in `FLOW_GUIDE.md`** to extract lifecycle and permissions.
3. **Inspect the router file** listed in the matrix for data writes and side effects.
4. **Populate impact columns** using the table above.
5. **Attach references** (flow guide section + router file path) in Source-of-Truth Links.

---

## Notes

- This model is intentionally additive and does **not** change canonical flow metadata.
- Once the impact columns are populated, use them as the baseline for system test comparisons.

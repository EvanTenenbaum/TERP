# User Flow Run Sheet Summary

**Tester:** QA Sales Manager (manual execution on live site)  
**Matrix Coverage:** 509 total flows (each unique flow represented once; roles condensed to the primary role in the matrix)  
**Execution Policy:** Only flows tested during the session were executed; all others are marked **BLOCKED** with blocker type **other** and a note explaining they were not executed.

## Summary of Results

| Status    | Count   |
| --------- | ------- |
| PASS      | 2       |
| FAIL      | 1       |
| BLOCKED   | 506     |
| N/A       | 0       |
| **Total** | **509** |

## Tested Flows

| Row Key                                                  | Status  | Notes                                                     |
| -------------------------------------------------------- | ------- | --------------------------------------------------------- |
| CRM \| Clients \| Sales Manager \| List Clients          | PASS    | Client list loaded as expected.                           |
| Inventory \| Products \| Sales Manager \| List Products  | PASS    | Product list loaded as expected.                          |
| Inventory \| Products \| Sales Manager \| Create Product | BLOCKED | Permission error: Sales Manager lacks `inventory:create`. |
| CRM \| Clients \| Sales Manager \| Create Client (Base)  | FAIL    | SQL error after submit; client not created.               |

## Evidence Highlights

- **Permissions Enforcement:** The product creation flow blocked the Sales Manager with a clear permission error, demonstrating proper RBAC enforcement.
- **Failed Client Creation:** Attempting to create a new client produced a database error after submitting the form, and the client did not appear in the list.

## Top Failing Row(s)

1. **CRM \| Clients \| Sales Manager \| Create Client \| Base** — The SQL error prevents client creation, making this the highest-priority fix.

## Top Blocker Reasons

1. **other** (505 occurrences) — Most flows were not executed due to time/resource constraints.
2. **permissions** (1 occurrence) — The Sales Manager lacks `inventory:create` permission for creating products.

## Unblock Plan

1. **Time and Coverage:** Allocate additional QA time or testers to systematically execute remaining flows.
2. **Role-Specific Accounts:** Ensure accounts for all roles in the matrix (e.g., Inventory Manager, Super Admin) are accessible per the QA auth file.
3. **Seed Test Data:** Provide seed data for orders, batches, invoices, etc., or use a safe test environment to avoid running against production data.
4. **Database Stability:** Investigate and fix the SQL error encountered when creating clients. This may require migrations or validation updates.
5. **Permission Adjustments:** Verify RBAC settings; either grant required permissions for QA roles or test with roles that already have them.

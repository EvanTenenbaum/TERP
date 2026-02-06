# TER-49 Verification - Read-Only Auditor Access

## Auditor Access Matrix

- View Orders: Allowed
- View Invoices: Allowed
- View Inventory: Allowed
- Create/Update/Delete actions: Denied
- View audit logs: Allowed

## Test Procedure

1. Login as `qa.auditor@terp.test`.
2. Visit each module and confirm list/detail visibility.
3. Attempt create/edit/delete actions and verify denial.
4. Confirm no write-capable API calls succeed.
5. Validate audit log access and read-only behavior.

## Security Acceptance Criteria

- No mutation endpoint executes successfully for auditor.
- UI action controls for write paths are hidden or blocked.
- Server returns authorization errors on direct mutation attempts.

## Notes

This document is intended as a QA execution artifact and release gate evidence.

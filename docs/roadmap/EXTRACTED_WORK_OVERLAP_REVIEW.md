# Extracted Work Overlap Review (Conservative)

This review captures potential overlaps between newly extracted TERP tasks and existing roadmap items. The default stance is conservative: **do not remove tasks** until a verification pass confirms true duplication. Instead, document overlaps and require explicit gap validation.

## Potential Overlaps Requiring Verification

| New Task  | Potentially Related Existing Tasks | Why This Might Overlap                                             | Conservative Action                                                          |
| --------- | ---------------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| TERP-0001 | BUG-072, BUG-025                   | Both address dashboard/analytics accuracy and data integrity.      | Keep TERP-0001; verify gaps vs completed bug fixes.                          |
| TERP-0002 | BUG-092, FE-QA-011                 | All involve dashboard widget UX/behavior.                          | Keep TERP-0002; confirm if outstanding widget UX gaps remain.                |
| TERP-0003 | BUG-071, BUG-070                   | Client creation/interaction flows may already be fixed.            | Keep TERP-0003; verify AddClientWizard still missing in work surface.        |
| TERP-0004 | BUG-085, NOTIF-001                 | Notification table creation relates to notification API stability. | Keep TERP-0004; verify autoMigrate still missing notifications.              |
| TERP-0005 | NAV-006..NAV-013                   | Navigation regrouping vs accessibility nav additions.              | Keep TERP-0005; verify if regrouping is distinct from adding missing routes. |
| TERP-0006 | INFRA-008                          | Both touch migration cleanup / schema stability.                   | Keep TERP-0006; verify whether cleanup migrations still required.            |
| TERP-0012 | BE-QA-006..BE-QA-008               | UI flows may depend on missing backend endpoints.                  | Keep TERP-0012; ensure backend coverage before UI work.                      |
| TERP-0013 | SEC-019, SEC-020                   | Security coverage overlaps public endpoint protections.            | Keep TERP-0013; verify remaining public endpoints.                           |
| TERP-0017 | SEC-019, SEC-020                   | Similar to above; “remaining public routers” may be covered.       | Keep TERP-0017; verify scope overlap.                                        |
| TERP-0022 | UX-015, UX-016                     | Same destructive confirmation + alert removal.                     | Keep TERP-0022 until gap review confirms completion.                         |
| TERP-0023 | BE-QA-001..BE-QA-005               | Backend placeholder fixes may already be completed.                | Keep TERP-0023; verify which placeholders remain unresolved.                 |

## Next Steps

1. For each overlap above, perform a file-level verification against current main.
2. Record verification results in `docs/roadmap/PR_TO_TASK_INDEX.md` and update TERP task notes accordingly.
3. If confirmed duplicate, merge task notes instead of deleting tasks.

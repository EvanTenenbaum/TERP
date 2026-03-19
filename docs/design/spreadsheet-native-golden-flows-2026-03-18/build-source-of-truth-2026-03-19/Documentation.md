# User-Facing Notes

- The spreadsheet-native pack now has an implementation-first source-of-truth folder that should be used for build planning instead of treating the Figma mocks as literal product specs.
- Orders, Inventory, Sales Sheets, Direct Intake, and Purchase Orders now have detailed ledgers and resolve through pointer rows in the pack-level CSV.
- Fulfillment, Invoices, Payments, Client Ledger, Returns, Samples, and shared cross-pack contracts remain at the pack-level mapping stage and still need their own detailed ledgers.

# Runbook Updates

- Before building a spreadsheet-native module, start from this folder plus the detailed ledger for that module if one already exists.
- If a module only appears in the pack-level ledger, explode that module into its own detailed ledger before claiming build-readiness.
- Use the adjacent Claude review context file when re-running adversarial review on this packet.

# Follow-Ups

- Create module-specific detailed ledgers for shared cross-pack contracts, Fulfillment, Invoices, Payments, Client Ledger, Returns, and Samples.
- Run dedicated review on Purchase Orders, Invoices, Returns, Samples, and Shared Primitives where the 2026-03-19 recording gave weak or no direct approval signal.

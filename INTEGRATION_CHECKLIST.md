# ERPv3 Integration Checklist (TERP-main-6 ↔ Final Handoff)

## Conflicting Files (use patched versions from handoff)
- middleware.ts (cron security + header propagation)
- src/app/api/inventory/returns/vendor/route.ts (creates VendorDebitNote + inventory decrement)
- src/app/api/finance/ap/aging.csv/route.ts (CSV export)
- src/app/api/attachments/list/route.ts (RBAC-aware listing)

## Prisma Schema
- Your current schema lacks models required by new routes:
  QuoteShareToken, VendorDebitNote, AuditLog, VendorInvoice, VendorPayment, GLAccount, GLJournal, GLJournalLine, Report, ReportSnapshot, Dashboard, DashboardWidget
- Apply the appended models in `prisma/schema.prisma` (see `prisma/schema.prisma.patch`). Merge fields with your existing entities as needed.

## Migrations
- Import the handoff migrations under `prisma/migrations_b_imported/` into your migrations directory in chronological order.
- Run:
  - npx prisma format
  - npx prisma generate
  - prisma migrate resolve / migrate deploy (according to your environment)

## Post-Integration Sanity
- npm run typecheck
- npm run build
- Run smoke tests on:
  - Quote share create/view/revoke
  - Order ship (inventory reservations consumption)
  - AP invoices aging/csv and payment FIFO
  - AR aging JSON & AR posting to GL
  - AP posting to GL
  - Analytics evaluate/snapshot
  - Attachments sign-upload and list (RBAC)
  - Cron endpoints with X-CRON-KEY header

# Deep QA Codebase Review (TERP)

Date: 2026-01-14

## Scope & Methodology

This review focuses on identifying the deepest possible QA concerns directly in the codebase:

- TODOs / stubs / placeholders in application logic.
- "Coming soon" or pseudo-working UI flows.
- Frontend ↔ backend misalignments (missing fields, missing relations).
- Schema mismatches/disabled metrics that imply missing columns.
- Known open bugs from roadmap docs.
- Use of fake/mock data in scripts.

Commands and manual inspections used:

- `rg -n "TODO" server src client`
- `rg -n "coming soon" client/src src server`
- `rg -n "placeholder" server src client`
- Manual file inspection for referenced TODOs and placeholder logic.
- `pnpm test` (partial run; interrupted after ~52s due to volume; failures observed before interruption).
- `pnpm typecheck` and `pnpm lint` (scripts not present).

## Findings (Codebase)

### 1) Frontend TODOs / stubs / pseudo-working UI

- **Widgets v3 export placeholder:** v3 widgets intentionally empty; v3 widgets still not migrated from v2. This is a functional gap for the v3 widget set. 【F:client/src/components/dashboard/widgets-v3/index.ts†L1-L6】
- **Template selector uses placeholder template ID:** the first template uses `id: "TODO"` which is likely a placeholder identifier. 【F:client/src/components/dashboard/widgets-v2/TemplateSelector.tsx†L20-L79】
- **Live Shopping "View Details" is "coming soon":** the button only shows an alert and explicitly says "Console view coming soon" instead of navigating to a view. 【F:client/src/pages/LiveShoppingPage.tsx†L380-L418】
- **Batch detail drawer hides product relationship UI:** strain details and related products are commented out because the API lacks product relation data. This is a frontend/backend mismatch and removes product context in the UI. 【F:client/src/components/inventory/BatchDetailDrawer.tsx†L452-L485】
- **Batch detail drawer uses placeholder price data:** `currentAvgPrice` is forced to `0`, which will render inaccurate price simulation results. 【F:client/src/components/inventory/BatchDetailDrawer.tsx†L880-L892】
- **Data-card analytics has placeholder integration:** events are only stored in session storage; analytics provider integration is a placeholder. 【F:client/src/lib/data-cards/analytics.ts†L16-L56】

### 2) Backend TODOs / stubs / placeholders

- **Vendor supply matching is unimplemented:** `findClientNeedsForVendorSupply` returns an empty list and is explicitly marked TODO. 【F:server/matchingEngineReverseSimplified.ts†L142-L148】
- **Soft-delete schema gap for clients:** supplier deletion only flips `isSeller=false` because `clients.deletedAt` does not exist; TODO indicates missing schema for real soft delete. 【F:server/inventoryDb.ts†L442-L456】
- **Client archive uses hard delete:** `archive` is a placeholder alias for delete until soft-delete exists. 【F:server/routers/clients.ts†L173-L183】
- **VIP tier configuration is hardcoded:** both read/write are TODO and `updateVipTierConfiguration` is a no-op. Also note `any[]` use. 【F:server/services/vipPortalAdminService.ts†L440-L493】
- **Live catalog filters are placeholders:** brand list is empty and price range is hardcoded due to missing data integrations. 【F:server/services/liveCatalogService.ts†L355-L375】
- **Quote send lacks notification:** TODO in quotes router notes missing email notifications. 【F:server/routers/quotes.ts†L283-L304】
- **Scheduling referral stats missing date filters:** TODO indicates date-range filtering not implemented. 【F:server/routers/scheduling.ts†L1140-L1154】
- **Receipts email/SMS integrations are placeholders:** sendEmail/sendSms mutations only mark records; no actual messaging integrations. 【F:server/routers/receipts.ts†L490-L543】
- **Receipt creation helper deprecated:** `_createReceiptWithRetry` is marked deprecated and not integrated into the main flow. 【F:server/routers/receipts.ts†L41-L71】
- **Startup seeding disabled:** seeding is disabled due to schema drift. This impacts initial data availability and "first run" behavior. 【F:server/\_core/index.ts†L161-L183】
- **Match engine missing strain type:** `strainType` is hardcoded null, reducing matching accuracy. 【F:server/matchingEngineEnhanced.ts†L639-L651】
- **Dashboard metrics disabled due to missing columns:** `expirationDate` and `expectedShipDate` are referenced as missing in schema; metrics return zeros. 【F:server/dataCardMetricsDb.ts†L252-L396】
- **Transactions helper is a placeholder:** `withTransaction` does not actually wrap a database transaction, creating potential data integrity issues for critical writes. 【F:server/dbTransaction.ts†L12-L36】
- **Cron stop is placeholder:** no actual stop mechanism for price alert cron jobs. 【F:server/cron/priceAlertsCron.ts†L39-L47】
- **Supplier metrics are placeholders:** quality score and return rate always return `null` / non-significant placeholders. 【F:server/services/leaderboard/supplierMetrics.ts†L166-L225】
- **COGS override stats are placeholders:** returns zero values without querying actual tracking data. 【F:server/services/cogsChangeIntegrationService.ts†L103-L118】
- **Audit account balance breakdown is placeholder:** returns empty data because journal entries table not implemented. 【F:server/routers/audit.ts†L530-L561】
- **Leaderboard export marked as placeholder:** export endpoint exists but indicates it needs real file generation. 【F:server/routers/leaderboard.ts†L324-L360】
- **Server DB fallback is placeholder proxy:** when DB is unavailable, db is a proxy that throws on any access. This is useful for dev but means runtime operations fail without DB. 【F:server/db.ts†L33-L56】
- **Live catalog test seed uses placeholder batch IDs:** assumes existing batches and uses placeholder IDs 1-11. 【F:server/scripts/seedLiveCatalogTestData.ts†L205-L216】

### 3) “Coming soon” / pseudo-working UI flags

- Live Shopping "View Details" is a button that only throws an alert stating "Console view coming soon" (no real navigation). 【F:client/src/pages/LiveShoppingPage.tsx†L405-L416】

### 4) Fake data / mock data usage

- Seeders use `@faker-js/faker` for generating data. This is expected for seeding, but is explicitly fake data. 【F:scripts/seed/seeders/seed-clients.ts†L9-L116】
- `PROJECT_CONTEXT.md` explicitly documents placeholder pages, mock data, and missing auth/feature work, which implies UX surfaces with placeholder content. 【F:docs/PROJECT_CONTEXT.md†L1120-L1142】

### 5) Known open bugs & API gaps (from roadmap)

The master roadmap lists open P0/P1 bugs and API registration gaps which represent known defects or incomplete endpoints:

- Critical open bugs (inventory loading, form resets, auth errors, search/filters, notification system, etc.). 【F:docs/roadmaps/MASTER_ROADMAP.md†L213-L233】
- E2E-discovered API failures (orders, quotes, invoices, calendar, COGS, pricing defaults, notifications). 【F:docs/roadmaps/MASTER_ROADMAP.md†L234-L248】
- API registration gaps that can cause `NOT_FOUND` or missing routes in tRPC. 【F:docs/roadmaps/MASTER_ROADMAP.md†L283-L299】

### 6) Build/test signals (partial)

- `pnpm typecheck` and `pnpm lint` fail because the scripts are not defined; only `pnpm check` exists. 【F:package.json†L6-L140】
- `pnpm test` was started but interrupted after ~52 seconds; multiple test files were already failing (accounting, pricing, security/auth, permissions, inventory, etc.). These indicate current red tests before completion.

## Summary of Highest-Risk Areas (Prioritized)

1. **Data integrity / transactions**: `withTransaction` is a placeholder (no actual transaction). This is risky for critical writes and concurrency. 【F:server/dbTransaction.ts†L12-L36】
2. **Soft-delete gaps**: multiple flows rely on "delete" while soft-delete is not implemented due to missing schema. 【F:server/routers/clients.ts†L173-L183】【F:server/inventoryDb.ts†L442-L456】
3. **Placeholder analytics & metrics**: several metrics return zero or null because schema columns are missing or logic is a stub. 【F:server/dataCardMetricsDb.ts†L252-L396】【F:server/services/leaderboard/supplierMetrics.ts†L166-L225】
4. **Live Shopping UX**: "View Details" is not implemented; missing detail view. 【F:client/src/pages/LiveShoppingPage.tsx†L405-L416】
5. **VIP tiers**: admin service is hardcoded; update is a no-op. 【F:server/services/vipPortalAdminService.ts†L440-L493】

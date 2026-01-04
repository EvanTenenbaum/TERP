# VIP Portal API

Client-facing tRPC router `vipPortal` for authentication, dashboard KPIs, AR/AP, marketplace, appointments, notifications, and live catalog. All VIP portal mutations use `vipPortalProcedure`, which validates the VIP session token and injects `ctx.clientId`.

## Authentication

### vipPortal.auth.login

- **Method & Path:** `POST /api/trpc/vipPortal.auth.login`
- **Type:** Mutation
- **Permissions:** Public (client credentials)
- **Input:** `{ "email": string, "password": string }`
- **Output:** `{ sessionToken: string, clientId: number, clientName?: string }`

### vipPortal.auth.verifySession

- **Method & Path:** `GET /api/trpc/vipPortal.auth.verifySession`
- **Type:** Query
- **Permissions:** Public (validates provided token)
- **Input:** `{ "sessionToken": string }`
- **Output:** `{ clientId: number, clientName?: string, email: string, isImpersonation: boolean }`

## Configuration

### vipPortal.config.get

- **Method & Path:** `GET /api/trpc/vipPortal.config.get`
- **Type:** Query
- **Permissions:** Public
- **Input:** `{ "clientId": number }`
- **Output:** VIP portal configuration (module flags, featuresConfig, advancedOptions) or defaults when missing.

## Dashboard

### vipPortal.dashboard.getKPIs

- **Method & Path:** `GET /api/trpc/vipPortal.dashboard.getKPIs`
- **Type:** Query
- **Permissions:** Public
- **Input:** `{ "clientId": number }`
- **Output:** `{ currentBalance: number, ytdSpend: number, creditUtilization: number, activeNeedsCount: number, activeSupplyCount: number }`

## Accounts Receivable

### vipPortal.ar.getInvoices

- **Method & Path:** `GET /api/trpc/vipPortal.ar.getInvoices`
- **Type:** Query
- **Permissions:** Public
- **Input:** `{ "clientId": number, "search"?: string, "status"?: string }`
- **Output:** `{ summary: { totalOutstanding, overdueAmount, openInvoiceCount }, invoices: Invoice[] }`

## Accounts Payable

### vipPortal.ap.getBills

- **Method & Path:** `GET /api/trpc/vipPortal.ap.getBills`
- **Type:** Query
- **Permissions:** Public
- **Input:** `{ "clientId": number, "search"?: string, "status"?: string }`
- **Output:** `{ summary: { totalOwed, overdueAmount, openBillCount }, bills: Bill[] }`

## Transactions

### vipPortal.transactions.getHistory

- **Method & Path:** `GET /api/trpc/vipPortal.transactions.getHistory`
- **Type:** Query
- **Permissions:** Public
- **Input:** `{ "clientId": number, "search"?: string, "type"?: string, "status"?: string }`
- **Output:** `{ summary: { totalCount, totalValue, lastTransactionDate }, transactions: ClientTransaction[] }`

## Marketplace (Needs & Supply)

### vipPortal.marketplace.getNeeds

- **Method & Path:** `GET /api/trpc/vipPortal.marketplace.getNeeds`
- **Type:** Query
- **Permissions:** Public
- **Input:** `{ "clientId": number }`
- **Output:** Array of needs for the client.

### vipPortal.marketplace.createNeed

- **Method & Path:** `POST /api/trpc/vipPortal.marketplace.createNeed`
- **Type:** Mutation
- **Permissions:** VIP session (uses `ctx.clientId`)
- **Input:** `{ "strain"?: string, "category": string, "quantity": number, "unit": string, "priceMax"?: number, "notes"?: string, "expiresInDays"?: number }`
- **Output:** `{ needId: number }`

### vipPortal.marketplace.updateNeed

- **Method & Path:** `POST /api/trpc/vipPortal.marketplace.updateNeed`
- **Type:** Mutation
- **Permissions:** VIP session
- **Input:** `{ "id": number, "strain"?: string, "category": string, "quantity": number, "unit": string, "priceMax"?: number, "notes"?: string }`
- **Output:** `{ success: true }`

### vipPortal.marketplace.cancelNeed

- **Method & Path:** `POST /api/trpc/vipPortal.marketplace.cancelNeed`
- **Type:** Mutation
- **Permissions:** VIP session
- **Input:** `{ "id": number }`
- **Output:** `{ success: true }`

### vipPortal.marketplace.getSupply

- **Method & Path:** `GET /api/trpc/vipPortal.marketplace.getSupply`
- **Type:** Query
- **Permissions:** Public
- **Input:** `{ "clientId": number }`
- **Output:** Supply listings (currently empty placeholder array).

### vipPortal.marketplace.createSupply

- **Method & Path:** `POST /api/trpc/vipPortal.marketplace.createSupply`
- **Type:** Mutation
- **Permissions:** VIP session
- **Input:** `{ "strain": string, "category": string, "quantity": number, "unit": string, "priceMin"?: number, "priceMax"?: number, "notes"?: string, "expiresInDays"?: number }`
- **Output:** `{ supplyId: number }`

### vipPortal.marketplace.updateSupply

- **Method & Path:** `POST /api/trpc/vipPortal.marketplace.updateSupply`
- **Type:** Mutation
- **Permissions:** VIP session (must own listing)
- **Input:** `{ "id": number, "strain": string, "category": string, "quantity": number, "unit": string, "priceMin"?: number, "priceMax"?: number, "notes"?: string }`
- **Output:** `{ success: true }`

### vipPortal.marketplace.cancelSupply

- **Method & Path:** `POST /api/trpc/vipPortal.marketplace.cancelSupply`
- **Type:** Mutation
- **Permissions:** VIP session (must own listing)
- **Input:** `{ "id": number }`
- **Output:** `{ success: true }`

## Leaderboard

### vipPortal.leaderboard.getLeaderboard

- **Method & Path:** `GET /api/trpc/vipPortal.leaderboard.getLeaderboard`
- **Type:** Query
- **Permissions:** Public (requires leaderboard enabled)
- **Input:** `{ "clientId": number }`
- **Output:** Leaderboard placement, entries, suggestions, and metadata.

### vipPortal.leaderboard.getAvailableMetrics

- **Method & Path:** `GET /api/trpc/vipPortal.leaderboard.getAvailableMetrics`
- **Type:** Query
- **Permissions:** Public (client must have VIP portal)
- **Input:** `{ "clientId": number }`
- **Output:** Available leaderboard metric configurations.

## Appointments

### vipPortal.appointments.listCalendars

- **Method & Path:** `GET /api/trpc/vipPortal.appointments.listCalendars`
- **Type:** Query
- **Permissions:** VIP session
- **Input:** _None_
- **Output:** Calendars with active appointment types and availability definitions.

### vipPortal.appointments.getSlots

- **Method & Path:** `GET /api/trpc/vipPortal.appointments.getSlots`
- **Type:** Query
- **Permissions:** VIP session
- **Input:** `{ "calendarId": number, "appointmentTypeId": number, "startDate": string, "endDate": string, "slotIntervalMinutes"?: number }`
- **Output:** Map of date (YYYY-MM-DD) to available slot strings (`HH:mm`).

### vipPortal.appointments.request

- **Method & Path:** `POST /api/trpc/vipPortal.appointments.request`
- **Type:** Mutation
- **Permissions:** VIP session
- **Input:** `{ "calendarId": number, "appointmentTypeId": number, "requestedSlot": string (ISO), "notes"?: string }`
- **Output:** `{ success: true, requestId: number, message: string }`

### vipPortal.appointments.listMyRequests

- **Method & Path:** `GET /api/trpc/vipPortal.appointments.listMyRequests`
- **Type:** Query
- **Permissions:** VIP session
- **Input:** _None_
- **Output:** Request history with appointment type metadata.

## Notifications

### vipPortal.notifications.list

- **Method & Path:** `GET /api/trpc/vipPortal.notifications.list`
- **Type:** Query
- **Permissions:** VIP session
- **Input:** `{ "limit"?: number, "offset"?: number }`
- **Output:** `{ items: Notification[], unreadCount: number }`

### vipPortal.notifications.markRead

- **Method & Path:** `POST /api/trpc/vipPortal.notifications.markRead`
- **Type:** Mutation
- **Permissions:** VIP session
- **Input:** `{ "id": number }`
- **Output:** `{ success: true, unreadCount: number }`

### vipPortal.notifications.markAllRead

- **Method & Path:** `POST /api/trpc/vipPortal.notifications.markAllRead`
- **Type:** Mutation
- **Permissions:** VIP session
- **Input:** _None_
- **Output:** `{ success: true, unreadCount: 0 }`

## Documents

### vipPortal.documents.downloadInvoicePdf

- **Method & Path:** `POST /api/trpc/vipPortal.documents.downloadInvoicePdf`
- **Type:** Mutation
- **Permissions:** VIP session (customer must own invoice)
- **Input:** `{ "invoiceId": number }`
- **Output:** `{ pdf: base64string, fileName: string }`

### vipPortal.documents.downloadBillPdf

- **Method & Path:** `POST /api/trpc/vipPortal.documents.downloadBillPdf`
- **Type:** Mutation
- **Permissions:** VIP session (vendor must own bill)
- **Input:** `{ "billId": number }`
- **Output:** `{ pdf: base64string, fileName: string }`

## Live Catalog

### vipPortal.liveCatalog.get

- **Method & Path:** `GET /api/trpc/vipPortal.liveCatalog.get`
- **Type:** Query
- **Permissions:** VIP session
- **Input:** Filters: `category?`, `brand?[]`, `grade?[]`, `stockLevel?`, `priceMin?`, `priceMax?`, `search?`, `sortBy?`, `sortOrder?`, `limit?`, `offset?`.
- **Output:** `{ items: CatalogItem[], total: number, appliedFilters: object }`

### vipPortal.liveCatalog.getFilterOptions

- **Method & Path:** `GET /api/trpc/vipPortal.liveCatalog.getFilterOptions`
- **Type:** Query
- **Permissions:** VIP session
- **Input:** _None_
- **Output:** Available filter values for the catalog.

### vipPortal.liveCatalog.getDraftInterests

- **Method & Path:** `GET /api/trpc/vipPortal.liveCatalog.getDraftInterests`
- **Type:** Query
- **Permissions:** VIP session
- **Input:** _None_
- **Output:** Draft interest list summary with price change flags.

### vipPortal.liveCatalog.addToDraft

- **Method & Path:** `POST /api/trpc/vipPortal.liveCatalog.addToDraft`
- **Type:** Mutation
- **Permissions:** VIP session
- **Input:** `{ "batchId": number }`
- **Output:** `{ success: true, draftId: number }`

### vipPortal.liveCatalog.removeFromDraft

- **Method & Path:** `POST /api/trpc/vipPortal.liveCatalog.removeFromDraft`
- **Type:** Mutation
- **Permissions:** VIP session
- **Input:** `{ "draftId": number }`
- **Output:** `{ success: true }`

### vipPortal.liveCatalog.clearDraft

- **Method & Path:** `POST /api/trpc/vipPortal.liveCatalog.clearDraft`
- **Type:** Mutation
- **Permissions:** VIP session
- **Input:** _None_
- **Output:** `{ success: true, itemsCleared: number }`

### vipPortal.liveCatalog.submitInterestList

- **Method & Path:** `POST /api/trpc/vipPortal.liveCatalog.submitInterestList`
- **Type:** Mutation
- **Permissions:** VIP session
- **Input:** _None_ (uses current draft)
- **Output:** `{ success: true, interestListId: number, totalItems: number, totalValue: string }`

#### Saved Views

- **vipPortal.liveCatalog.views.list** — `GET`, VIP session, returns `{ views }`.
- **vipPortal.liveCatalog.views.save** — `POST`, VIP session, input `{ name: string, filters: {...} }`, output `{ success: true, viewId: number }`.
- **vipPortal.liveCatalog.views.delete** — `POST`, VIP session, input `{ viewId: number }`, output `{ success: true }`.

#### Price Alerts

- **vipPortal.liveCatalog.priceAlerts.list** — `GET`, VIP session, input none, output client alerts.
- **vipPortal.liveCatalog.priceAlerts.create** — `POST`, VIP session, input `{ batchId: number, targetPrice: number }`, output creation result.
- **vipPortal.liveCatalog.priceAlerts.deactivate** — `POST`, VIP session, input `{ alertId: number }`, output result.

## Example

```bash
curl -X POST "<base-url>/api/trpc/vipPortal.appointments.request" \
  -H "Content-Type: application/json" \
  -d '{"json":{"calendarId":1,"appointmentTypeId":2,"requestedSlot":"2026-01-06T17:00:00.000Z","notes":"Discuss new order"}}'
```

# Inventory API

Inventory router handles batches, media uploads, saved views, bulk actions, and profitability analytics. All endpoints enforce RBAC permissions noted below.

## Media

### inventory.uploadMedia

- **Method & Path:** `POST /api/trpc/inventory.uploadMedia`
- **Type:** Mutation
- **Permissions:** `inventory:update`
- **Input Schema:** `{ "fileData": "base64 string", "fileName": "string", "fileType": "string", "batchId"?: number }`
- **Output Schema:** `{ success: boolean, url: string, fileName: string, fileType: string, fileSize: number }`

## Batches

### inventory.list

- **Method & Path:** `GET /api/trpc/inventory.list`
- **Type:** Query
- **Permissions:** `inventory:read`
- **Input Schema:** Provided by `listQuerySchema` (cursor pagination, optional `query`, `status`, `category`).
- **Output Schema:** `{ items: BatchWithDetails[], hasMore: boolean, nextCursor?: string }`

### inventory.dashboardStats

- **Method & Path:** `GET /api/trpc/inventory.dashboardStats`
- **Type:** Query
- **Permissions:** `inventory:read`
- **Input:** _None_
- **Output:** Aggregated totals for value, units, status counts, and category/subcategory breakdowns.

### inventory.getById

- **Method & Path:** `GET /api/trpc/inventory.getById`
- **Type:** Query
- **Permissions:** `inventory:read`
- **Input:** `{ "id": number }`
- **Output:** `{ batch, locations, auditLogs, availableQty }`; throws `BATCH_NOT_FOUND` when missing.

### inventory.intake

- **Method & Path:** `POST /api/trpc/inventory.intake`
- **Type:** Mutation
- **Permissions:** `inventory:read`
- **Input Schema:** `intakeSchema` (vendor, brand, product metadata, quantity, pricing, compliance fields).
- **Output Schema:** `{ success: true, batch: Batch }`

### inventory.updateStatus

- **Method & Path:** `POST /api/trpc/inventory.updateStatus`
- **Type:** Mutation
- **Permissions:** `inventory:update`
- **Input:** `{ "id": number, "status": BatchStatus, "reason"?: string }`
- **Output:** `{ success: true }` with audit log created.

### inventory.adjustQty

- **Method & Path:** `POST /api/trpc/inventory.adjustQty`
- **Type:** Mutation
- **Permissions:** `inventory:read`
- **Input:** `{ "id": number, "field": "onHandQty" | "reservedQty" | "quarantineQty" | "holdQty" | "defectiveQty", "adjustment": number, "reason": string }`
- **Output:** `{ success: true }` with audit trail.

## Reference Data

### inventory.vendors / inventory.brands

- **Method & Path:** `GET /api/trpc/inventory.vendors` and `GET /api/trpc/inventory.brands`
- **Type:** Query
- **Permissions:** `inventory:read`
- **Input:** `{ "query"?: string }`
- **Output:** Paginated arrays of vendor/brand suggestions.

### inventory.getBatchesByVendor

- **Method & Path:** `GET /api/trpc/inventory.getBatchesByVendor`
- **Type:** Query
- **Permissions:** `inventory:read`
- **Input:** `{ "vendorId": number }`
- **Output:** Paginated list of batches for the vendor.

### inventory.seed

- **Method & Path:** `POST /api/trpc/inventory.seed`
- **Type:** Mutation
- **Permissions:** `inventory:read`
- **Input:** _None_
- **Output:** `{ success: true }` after seeding demo data.

## Saved Views

### inventory.views.list

- **Method & Path:** `GET /api/trpc/inventory.views.list`
- **Type:** Query
- **Permissions:** `inventory:read`
- **Input:** _None_ (uses authenticated user)
- **Output:** Paginated list of view definitions.

### inventory.views.save

- **Method & Path:** `POST /api/trpc/inventory.views.save`
- **Type:** Mutation
- **Permissions:** `inventory:read`
- **Input:** `{ "name": string, "filters": object, "isShared"?: boolean }`
- **Output:** Saved view record.

### inventory.views.delete

- **Method & Path:** `POST /api/trpc/inventory.views.delete`
- **Type:** Mutation
- **Permissions:** `inventory:delete`
- **Input:** `number` (view ID)
- **Output:** Deletion result.

## Bulk Operations

### inventory.bulk.updateStatus

- **Method & Path:** `POST /api/trpc/inventory.bulk.updateStatus`
- **Type:** Mutation
- **Permissions:** `inventory:update`
- **Input:** `{ "batchIds": number[], "newStatus": BatchStatus }`
- **Output:** Bulk update summary.

### inventory.bulk.delete

- **Method & Path:** `POST /api/trpc/inventory.bulk.delete`
- **Type:** Mutation
- **Permissions:** `inventory:delete`
- **Input:** `number[]` (batch IDs)
- **Output:** Bulk delete summary.

## Profitability

### inventory.profitability.batch

- **Method & Path:** `GET /api/trpc/inventory.profitability.batch`
- **Type:** Query
- **Permissions:** `inventory:read`
- **Input:** `number` (batch ID)
- **Output:** Profitability metrics for the batch.

### inventory.profitability.top

- **Method & Path:** `GET /api/trpc/inventory.profitability.top`
- **Type:** Query
- **Permissions:** `inventory:read`
- **Input:** `number | optional` (limit, default 10)
- **Output:** Paginated top-performing batches.

### inventory.profitability.summary

- **Method & Path:** `GET /api/trpc/inventory.profitability.summary`
- **Type:** Query
- **Permissions:** `inventory:read`
- **Input:** _None_
- **Output:** Aggregate profitability summary.

## Example

```bash
curl -X POST "<base-url>/api/trpc/inventory.updateStatus" \
  -H "Content-Type: application/json" \
  -H "Cookie: terp_session=<session>" \
  -d '{"json":{"id":101,"status":"LIVE","reason":"Ready for sale"}}'
```

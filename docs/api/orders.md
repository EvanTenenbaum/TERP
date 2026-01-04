# Orders API

Consolidated Orders Router (`orders`). Supports quote and sale lifecycles, draft management, pricing, returns, and audit logging.

## Core Orders

### orders.create

- **Method & Path:** `POST /api/trpc/orders.create`
- **Type:** Mutation
- **Permissions:** `orders:create`
- **Input Schema:**
  ```json
  {
    "orderType": "QUOTE" | "SALE",
    "isDraft": boolean | optional,
    "clientId": number,
    "items": [{
      "batchId": number,
      "displayName"?: string,
      "quantity": number,
      "unitPrice": number,
      "isSample": boolean,
      "overridePrice"?: number,
      "overrideCogs"?: number
    }],
    "validUntil"?: string,
    "paymentTerms"?: "NET_7" | "NET_15" | "NET_30" | "COD" | "PARTIAL" | "CONSIGNMENT",
    "cashPayment"?: number,
    "notes"?: string
  }
  ```
- **Output Schema:** Created order object from `ordersDb.createOrder`.

### orders.getById

- **Method & Path:** `GET /api/trpc/orders.getById`
- **Type:** Query
- **Permissions:** `orders:read`
- **Input:** `{ "id": number }`
- **Output:** Order record with stored items.

### orders.getByClient

- **Method & Path:** `GET /api/trpc/orders.getByClient`
- **Type:** Query
- **Permissions:** `orders:read`
- **Input:** `{ "clientId": number, "orderType"?: "QUOTE" | "SALE" }`
- **Output:** Array of orders for the client.

### orders.getAll

- **Method & Path:** `GET /api/trpc/orders.getAll`
- **Type:** Query
- **Permissions:** `orders:read`
- **Input Schema:**
  ```json
  {
    "orderType"?: "QUOTE" | "SALE",
    "isDraft"?: boolean,
    "quoteStatus"?: "string",
    "saleStatus"?: "string",
    "fulfillmentStatus"?: "string",
    "limit"?: number,
    "offset"?: number,
    "includeDeleted"?: boolean
  }
  ```
- **Output Schema:** Paginated list (`items`, `total`, `limit`, `offset`).

### orders.update

- **Method & Path:** `POST /api/trpc/orders.update`
- **Type:** Mutation
- **Permissions:** `orders:update`
- **Input:** `{ "id": number, "notes"?: string, "validUntil"?: string }`
- **Output:** Updated order.

### orders.delete / orders.restore

- **Method & Path:** `POST /api/trpc/orders.delete` and `POST /api/trpc/orders.restore`
- **Type:** Mutations
- **Permissions:** `orders:delete`
- **Input:** `{ "id": number }`
- **Output:** `{ success: boolean }` indicating soft-delete or restore status.

## Draft Lifecycle

### orders.confirmDraftOrder

- **Method & Path:** `POST /api/trpc/orders.confirmDraftOrder`
- **Type:** Mutation
- **Permissions:** `orders:create`
- **Input:** `{ "orderId": number, "paymentTerms": enum, "cashPayment"?: number, "notes"?: string }`
- **Output:** Confirmed order with updated status.

### orders.updateDraftOrder

- **Method & Path:** `POST /api/trpc/orders.updateDraftOrder`
- **Type:** Mutation
- **Permissions:** `orders:update`
- **Input:** `{ "orderId": number, "items"?: [...basic items...], "validUntil"?: string, "notes"?: string }`
- **Output:** Updated draft order.

### orders.deleteDraftOrder

- **Method & Path:** `POST /api/trpc/orders.deleteDraftOrder`
- **Type:** Mutation
- **Permissions:** `orders:delete`
- **Input:** `{ "orderId": number }`

### orders.createDraftEnhanced

- **Method & Path:** `POST /api/trpc/orders.createDraftEnhanced`
- **Type:** Mutation
- **Permissions:** `orders:create`
- **Input Schema:**
  ```json
  {
    "orderType": "QUOTE" | "SALE",
    "clientId": number,
    "lineItems": [{
      "batchId": number,
      "productDisplayName"?: string,
      "quantity": number,
      "isSample"?: boolean,
      "cogsPerUnit": number,
      "marginPercent"?: number,
      "marginDollar"?: number,
      "isCogsOverridden"?: boolean,
      "cogsOverrideReason"?: string,
      "isMarginOverridden"?: boolean
    }],
    "orderLevelAdjustment"?: {"amount": number, "type": "PERCENT" | "DOLLAR", "mode": "DISCOUNT" | "MARKUP"},
    "showAdjustmentOnDocument"?: boolean,
    "notes"?: string,
    "validUntil"?: string,
    "paymentTerms"?: enum,
    "cashPayment"?: number
  }
  ```
- **Output Schema:** `{ orderId: number, orderNumber: string, totals: {...}, validation: {...} }`

### orders.updateDraftEnhanced

- **Method & Path:** `POST /api/trpc/orders.updateDraftEnhanced`
- **Type:** Mutation
- **Permissions:** `orders:update`
- **Input:** `{ "orderId": number, "version": number, "lineItems": [lineItemInputSchema], "orderLevelAdjustment"?: object, "showAdjustmentOnDocument"?: boolean, "notes"?: string }`
- **Output:** `{ orderId, totals, validation }`

### orders.finalizeDraft

- **Method & Path:** `POST /api/trpc/orders.finalizeDraft`
- **Type:** Mutation
- **Permissions:** `orders:create`
- **Input:** `{ "orderId": number, "version": number }`
- **Output:** `{ orderId, orderNumber, validation }` with draft promoted to final order.

### orders.getOrderWithLineItems

- **Method & Path:** `GET /api/trpc/orders.getOrderWithLineItems`
- **Type:** Query
- **Permissions:** `orders:read`
- **Input:** `{ "orderId": number }`
- **Output:** `{ order, lineItems }` including pricing metadata.

## Pricing Utilities

### orders.getMarginForProduct

- **Method & Path:** `GET /api/trpc/orders.getMarginForProduct`
- **Type:** Query
- **Permissions:** `orders:read`
- **Input:** `{ "clientId": number, "productCategory": string }`
- **Output:** Margin configuration with fallback source.

### orders.calculatePrice

- **Method & Path:** `GET /api/trpc/orders.calculatePrice`
- **Type:** Query
- **Permissions:** `orders:read`
- **Input:** `{ "cogs": number, "marginPercent": number }`
- **Output:** `{ "price": number, "marginDollar": number }`

### orders.updateLineItemCOGS

- **Method & Path:** `POST /api/trpc/orders.updateLineItemCOGS`
- **Type:** Mutation
- **Permissions:** `orders:update`
- **Input:** `{ "orderId": number, "lineItemId": number, "batchId": number, "newCOGS": number, "reason": string, "scope": "ORDER_ONLY" | "FUTURE" | "ALL" }`
- **Output:** `{ success: true, oldCOGS: number, newCOGS: number }`

## Status & Returns

### orders.updateOrderStatus

- **Method & Path:** `POST /api/trpc/orders.updateOrderStatus`
- **Type:** Mutation
- **Permissions:** `orders:update`
- **Input:** `{ "orderId": number, "newStatus": "PENDING" | "PACKED" | "SHIPPED", "notes"?: string }`
- **Output:** Updated status event.

### orders.getOrderStatusHistory

- **Method & Path:** `GET /api/trpc/orders.getOrderStatusHistory`
- **Type:** Query
- **Permissions:** `orders:read`
- **Input:** `{ "orderId": number }`
- **Output:** Status history entries.

### orders.processReturn

- **Method & Path:** `POST /api/trpc/orders.processReturn`
- **Type:** Mutation
- **Permissions:** `orders:update`
- **Input:** `{ "orderId": number, "items": [{"batchId": number, "quantity": number}], "reason": enum, "notes"?: string }`
- **Output:** Return record with adjustments.

### orders.getOrderReturns

- **Method & Path:** `GET /api/trpc/orders.getOrderReturns`
- **Type:** Query
- **Permissions:** `orders:read`
- **Input:** `{ "orderId": number }`
- **Output:** Return entries linked to the order.

## Conversion & Export

### orders.convertToSale / orders.convertQuoteToSale

- **Method & Path:** `POST /api/trpc/orders.convertToSale` and `POST /api/trpc/orders.convertQuoteToSale`
- **Type:** Mutations
- **Permissions:** `orders:create`
- **Input:** `{ "quoteId": number, "paymentTerms"?: enum, "cashPayment"?: number, "notes"?: string }`
- **Output:** Converted sale order.

### orders.export

- **Method & Path:** `POST /api/trpc/orders.export`
- **Type:** Mutation
- **Permissions:** `orders:read`
- **Input:** `{ "id": number, "format": "pdf" | "clipboard" | "image" }`
- **Output:** Export payload (file URL/content depending on format).

## Audit

### orders.getAuditLog

- **Method & Path:** `GET /api/trpc/orders.getAuditLog`
- **Type:** Query
- **Permissions:** `orders:read`
- **Input:** `{ "orderId": number }`
- **Output:** Audit trail entries for pricing, COGS, and status changes.

## Example Request

```bash
curl -X POST "<base-url>/api/trpc/orders.createDraftEnhanced" \
  -H "Content-Type: application/json" \
  -H "Cookie: terp_session=<session>" \
  -d '{"json":{"orderType":"SALE","clientId":12,"lineItems":[{"batchId":99,"quantity":3,"cogsPerUnit":9.5,"isSample":false}],"orderLevelAdjustment":{"amount":5,"type":"PERCENT","mode":"DISCOUNT"}}}'
```

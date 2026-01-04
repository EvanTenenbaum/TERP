# Clients API

Operations for managing clients, tags, communications, and financial transactions. Router: `clients` (all procedures require RBAC permissions noted per endpoint).

## Core Client Operations

### clients.list

- **Method & Path:** `GET /api/trpc/clients.list`
- **Type:** Query
- **Permissions:** `clients:read`
- **Input Schema:**
  ```json
  {
    "limit": 50,
    "offset": 0,
    "search": "string | optional",
    "clientTypes": ["buyer" | "seller" | "brand" | "referee" | "contractor"] | optional,
    "tags": ["string"] | optional,
    "hasDebt": true | false | optional
  }
  ```
- **Output Schema:** Paginated response from `createSafeUnifiedResponse` (`{ items: Client[], total: number, limit: number, offset: number }`).
- **Example Response:**
  ```json
  {
    "result": {
      "data": {
        "json": {
          "items": [{ "id": 12, "name": "Acme Dispensary", "isBuyer": true }],
          "total": 1,
          "limit": 50,
          "offset": 0
        }
      }
    }
  }
  ```

### clients.count

- **Method & Path:** `GET /api/trpc/clients.count`
- **Type:** Query
- **Permissions:** `clients:read`
- **Input Schema:** Same filters as `clients.list` (without pagination fields).
- **Output Schema:** `number` (total matching clients).

### clients.getById

- **Method & Path:** `GET /api/trpc/clients.getById`
- **Type:** Query
- **Permissions:** `clients:read`
- **Input Schema:** `{ "clientId": number }`
- **Output Schema:** Client record or `null`.

### clients.getByTeriCode

- **Method & Path:** `GET /api/trpc/clients.getByTeriCode`
- **Type:** Query
- **Permissions:** `clients:read`
- **Input Schema:** `{ "teriCode": "string" }`
- **Output Schema:** Client record or `null`.

### clients.checkTeriCodeAvailable

- **Method & Path:** `GET /api/trpc/clients.checkTeriCodeAvailable`
- **Type:** Query
- **Permissions:** `clients:read`
- **Input Schema:** `{ "teriCode": "string", "excludeClientId": number | optional }`
- **Output Schema:** `{ available: boolean, message: string | null }`

### clients.create

- **Method & Path:** `POST /api/trpc/clients.create`
- **Type:** Mutation
- **Permissions:** `clients:create`
- **Input Schema:**
  ```json
  {
    "teriCode": "string",
    "name": "string",
    "email": "email | optional",
    "phone": "string | optional",
    "address": "string | optional",
    "isBuyer": true | false | optional,
    "isSeller": true | false | optional,
    "isBrand": true | false | optional,
    "isReferee": true | false | optional,
    "isContractor": true | false | optional,
    "tags": ["string"] | optional
  }
  ```
- **Output Schema:** Created client object; duplicate TERI codes throw `TRPCError` with `CONFLICT`.

### clients.update

- **Method & Path:** `POST /api/trpc/clients.update`
- **Type:** Mutation
- **Permissions:** `clients:update`
- **Input Schema:**
  ```json
  {
    "clientId": number,
    "version": number | optional,
    "name": "string | optional",
    "email": "email | optional",
    "phone": "string | optional",
    "address": "string | optional",
    "isBuyer": true | false | optional,
    "isSeller": true | false | optional,
    "isBrand": true | false | optional,
    "isReferee": true | false | optional,
    "isContractor": true | false | optional,
    "tags": ["string"] | optional,
    "wishlist": "string | optional"
  }
  ```
- **Output Schema:** Updated client record (optimistic locking supported via `version`).

### clients.delete / clients.archive

- **Method & Path:** `POST /api/trpc/clients.delete` and `POST /api/trpc/clients.archive`
- **Type:** Mutations
- **Permissions:** `clients:delete`
- **Input Schema:** `{ "clientId": number }`
- **Output Schema:** Deletion result (current implementation performs hard delete).

## Transactions

### clients.transactions.list

- **Method & Path:** `GET /api/trpc/clients.transactions.list`
- **Type:** Query
- **Permissions:** `clients:read`
- **Input Schema:**
  ```json
  {
    "clientId": number,
    "limit": 50,
    "offset": 0,
    "search": "string | optional",
    "transactionType": "string | optional",
    "paymentStatus": "string | optional",
    "startDate": "Date | optional",
    "endDate": "Date | optional"
  }
  ```
- **Output Schema:** Transaction list from `clientsDb.getClientTransactions`.

### clients.transactions.getById

- **Method & Path:** `GET /api/trpc/clients.transactions.getById`
- **Type:** Query
- **Permissions:** `clients:read`
- **Input Schema:** `{ "transactionId": number }`
- **Output Schema:** Transaction record or `null`.

### clients.transactions.create

- **Method & Path:** `POST /api/trpc/clients.transactions.create`
- **Type:** Mutation
- **Permissions:** `clients:create`
- **Input Schema:**
  ```json
  {
    "clientId": number,
    "transactionType": "INVOICE" | "PAYMENT" | "QUOTE" | "ORDER" | "REFUND" | "CREDIT",
    "transactionNumber": "string | optional",
    "transactionDate": "Date",
    "amount": number,
    "paymentStatus": "PAID" | "PENDING" | "OVERDUE" | "PARTIAL" | optional,
    "paymentDate": "Date | optional",
    "paymentAmount": number | optional,
    "notes": "string | optional",
    "metadata": "object | optional"
  }
  ```
- **Output Schema:** Created transaction.

### clients.transactions.update

- **Method & Path:** `POST /api/trpc/clients.transactions.update`
- **Type:** Mutation
- **Permissions:** `clients:update`
- **Input Schema:** `{ "transactionId": number, "transactionDate"?: Date, "amount"?: number, "paymentStatus"?: enum, "paymentDate"?: Date, "paymentAmount"?: number, "notes"?: string }`
- **Output Schema:** Updated transaction.

### clients.transactions.recordPayment

- **Method & Path:** `POST /api/trpc/clients.transactions.recordPayment`
- **Type:** Mutation
- **Permissions:** `clients:read`
- **Input Schema:** `{ "transactionId": number, "paymentDate": Date, "paymentAmount": number }`
- **Output Schema:** Payment record with updated balances.

### clients.transactions.delete

- **Method & Path:** `POST /api/trpc/clients.transactions.delete`
- **Type:** Mutation
- **Permissions:** `clients:delete`
- **Input Schema:** `{ "transactionId": number }`
- **Output Schema:** Deletion result.

### clients.transactions.linkTransaction

- **Method & Path:** `POST /api/trpc/clients.transactions.linkTransaction`
- **Type:** Mutation
- **Permissions:** `clients:read`
- **Input Schema:** `{ "parentTransactionId": number, "childTransactionId": number, "linkType": "REFUND_OF" | "PAYMENT_FOR" | "CREDIT_APPLIED_TO" | "CONVERTED_FROM" | "PARTIAL_OF" | "RELATED_TO", "linkAmount"?: string, "notes"?: string }`
- **Output Schema:** Link record.

### clients.transactions.getWithRelationships

- **Method & Path:** `GET /api/trpc/clients.transactions.getWithRelationships`
- **Type:** Query
- **Permissions:** `clients:read`
- **Input Schema:** `{ "transactionId": number }`
- **Output Schema:** Transaction with relationship graph.

### clients.transactions.getHistory

- **Method & Path:** `GET /api/trpc/clients.transactions.getHistory`
- **Type:** Query
- **Permissions:** `clients:read`
- **Input Schema:** `{ "clientId": number, "limit": number | optional }`
- **Output Schema:** Recent transaction history array.

## Activity & Notes

### clients.activity.list

- **Method & Path:** `GET /api/trpc/clients.activity.list`
- **Type:** Query
- **Permissions:** `clients:read`
- **Input Schema:** `{ "clientId": number, "limit": number | optional }`
- **Output Schema:** Activity entries.

### clients.notes.getNoteId

- **Method & Path:** `GET /api/trpc/clients.notes.getNoteId`
- **Type:** Query
- **Permissions:** `clients:read`
- **Input Schema:** `{ "clientId": number }`
- **Output Schema:** `{ noteId: number | null }`

### clients.notes.linkNote

- **Method & Path:** `POST /api/trpc/clients.notes.linkNote`
- **Type:** Mutation
- **Permissions:** `clients:read`
- **Input Schema:** `{ "clientId": number, "noteId": number }`
- **Output Schema:** Link confirmation.

## Tags & Communications

### clients.tags.getAll

- **Method & Path:** `GET /api/trpc/clients.tags.getAll`
- **Type:** Query
- **Permissions:** `clients:read`
- **Input Schema:** _None_
- **Output Schema:** `string[]` of tags.

### clients.tags.add

- **Method & Path:** `POST /api/trpc/clients.tags.add`
- **Type:** Mutation
- **Permissions:** `clients:create`
- **Input Schema:** `{ "clientId": number, "tag": "string" }`
- **Output Schema:** Updated tag list.

### clients.tags.remove

- **Method & Path:** `POST /api/trpc/clients.tags.remove`
- **Type:** Mutation
- **Permissions:** `clients:delete`
- **Input Schema:** `{ "clientId": number, "tag": "string" }`
- **Output Schema:** Updated tag list.

### clients.communications.list

- **Method & Path:** `GET /api/trpc/clients.communications.list`
- **Type:** Query
- **Permissions:** `clients:read`
- **Input Schema:** `{ "clientId": number, "type"?: "CALL" | "EMAIL" | "MEETING" | "NOTE" }`
- **Output Schema:** Communication entries.

### clients.communications.add

- **Method & Path:** `POST /api/trpc/clients.communications.add`
- **Type:** Mutation
- **Permissions:** `clients:create`
- **Input Schema:** `{ "clientId": number, "type": enum, "subject": string, "notes"?: string, "communicatedAt": string (ISO) }`
- **Output Schema:** Created communication record.

## Supplier Profiles

### clients.getSupplierProfile

- **Method & Path:** `GET /api/trpc/clients.getSupplierProfile`
- **Type:** Query
- **Permissions:** `clients:read`
- **Input Schema:** `{ "clientId": number }`
- **Output Schema:** Supplier profile record.

### clients.updateSupplierProfile

- **Method & Path:** `POST /api/trpc/clients.updateSupplierProfile`
- **Type:** Mutation
- **Permissions:** `clients:update`
- **Input Schema:**
  ```json
  {
    "clientId": number,
    "contactName"?: "string",
    "contactEmail"?: "email | empty string",
    "contactPhone"?: "string",
    "licenseNumber"?: "string",
    "taxId"?: "string",
    "paymentTerms"?: "string",
    "preferredPaymentMethod"?: "CASH" | "CHECK" | "WIRE" | "ACH" | "CREDIT_CARD" | "OTHER" | "",
    "supplierNotes"?: "string"
  }
  ```
- **Output Schema:** Updated supplier profile.

## Sample Request/Response

```bash
curl -X POST "<base-url>/api/trpc/clients.create" \
  -H "Content-Type: application/json" \
  -H "Cookie: terp_session=<session>" \
  -d '{"json":{"teriCode":"ACME-100","name":"Acme Dispensary","isBuyer":true}}'
```

```json
{
  "result": {
    "data": {
      "json": {
        "id": 42,
        "teriCode": "ACME-100",
        "name": "Acme Dispensary",
        "isBuyer": true
      }
    }
  }
}
```

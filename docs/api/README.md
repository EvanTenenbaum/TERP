# TERP API Documentation

**Version:** 1.0.0  
**Last Updated:** 2025-12-31  
**Base URL:** `https://terp-app-b9s35.ondigitalocean.app`

---

## Overview

TERP (Cannabis ERP System) uses [tRPC](https://trpc.io/) for type-safe API communication between the client and server. This documentation covers all available API endpoints, their inputs, outputs, and authentication requirements.

### API Architecture

TERP's API is organized into **domain-specific routers** that group related functionality:

| Category       | Routers                                                | Description                                    |
| -------------- | ------------------------------------------------------ | ---------------------------------------------- |
| **Core**       | `auth`, `system`, `users`                              | Authentication, system health, user management |
| **Inventory**  | `inventory`, `batches`, `strains`, `locations`         | Product and inventory management               |
| **Sales**      | `orders`, `clients`, `salesSheets`, `pricing`          | Sales operations and client management         |
| **Accounting** | `accounting`, `credit`, `cogs`, `receipts`             | Financial operations and reporting             |
| **Operations** | `pickPack`, `warehouseTransfers`, `flowerIntake`       | Warehouse and fulfillment operations           |
| **Analytics**  | `analytics`, `dashboard`, `leaderboard`                | Reporting and business intelligence            |
| **Admin**      | `admin`, `rbacUsers`, `rbacRoles`, `rbacPermissions`   | Administration and access control              |
| **VIP Portal** | `vipPortal`, `vipPortalAdmin`, `vipPortalLiveShopping` | Customer-facing portal                         |
| **Calendar**   | `calendar`, `calendarMeetings`, `calendarReminders`    | Scheduling and reminders                       |

---

## Authentication

### Session-Based Authentication

TERP uses session-based authentication with HTTP-only cookies.

```typescript
// Login endpoint (via /api/auth/login)
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

### Response

```json
{
  "success": true,
  "user": {
    "id": 1,
    "email": "user@example.com",
    "name": "John Doe",
    "role": "admin"
  }
}
```

### Authentication Flow

1. User submits credentials to `/api/auth/login`
2. Server validates credentials and creates a session
3. Session token is stored in an HTTP-only cookie (`terp_session`)
4. All subsequent requests include the cookie automatically
5. Protected endpoints verify the session before processing

### Permission System (RBAC)

TERP implements Role-Based Access Control (RBAC) with granular permissions:

| Permission          | Description                |
| ------------------- | -------------------------- |
| `accounting:read`   | View accounting data       |
| `accounting:create` | Create accounting entries  |
| `accounting:update` | Modify accounting data     |
| `inventory:read`    | View inventory             |
| `inventory:write`   | Modify inventory           |
| `orders:read`       | View orders                |
| `orders:write`      | Create/modify orders       |
| `admin:*`           | Full administrative access |
| `analytics:read`    | View analytics and reports |

---

## Making API Calls

### Using tRPC Client (Recommended)

```typescript
import { trpc } from "@/lib/trpc";

// Query example
const { data: summary } = trpc.analytics.getSummary.useQuery();

// Mutation example
const createOrder = trpc.orders.create.useMutation();
await createOrder.mutateAsync({
  clientId: 1,
  items: [{ batchId: 1, quantity: 10 }],
});
```

### Using HTTP Directly

tRPC endpoints are accessible via HTTP at `/api/trpc/{router}.{procedure}`:

```bash
# Query (GET)
curl "https://terp-app-b9s35.ondigitalocean.app/api/trpc/analytics.getSummary" \
  -H "Cookie: terp_session=..."

# Mutation (POST)
curl -X POST "https://terp-app-b9s35.ondigitalocean.app/api/trpc/orders.create" \
  -H "Content-Type: application/json" \
  -H "Cookie: terp_session=..." \
  -d '{"json":{"clientId":1,"items":[{"batchId":1,"quantity":10}]}}'
```

---

## Router Documentation

Detailed documentation for each router is available in the `routers/` subdirectory:

### Core Routers

- [Authentication](./routers/auth.md) - Login, logout, session management
- [System](./routers/system.md) - Health checks, system status
- [Users](./routers/users.md) - User profile management

### Inventory Routers

- [Inventory](./routers/inventory.md) - Batch and product management
- [Strains](./routers/strains.md) - Strain catalog management
- [Locations](./routers/locations.md) - Warehouse location management

### Sales Routers

- [Orders](./routers/orders.md) - Order creation and management
- [Clients](./routers/clients.md) - Client/customer management
- [Sales Sheets](./routers/salesSheets.md) - Sales sheet operations
- [Pricing](./routers/pricing.md) - Price management

### Accounting Routers

- [Accounting](./routers/accounting.md) - Chart of accounts, ledger entries
- [Credit](./routers/credit.md) - Client credit management
- [COGS](./routers/cogs.md) - Cost of goods sold calculations
- [Receipts](./routers/receipts.md) - Receipt generation

### Operations Routers

- [Pick & Pack](./routers/pickPack.md) - Order fulfillment
- [Flower Intake](./routers/flowerIntake.md) - Product intake workflow
- [Warehouse Transfers](./routers/warehouseTransfers.md) - Inter-location transfers

### Analytics Routers

- [Analytics](./routers/analytics.md) - Business analytics
- [Dashboard](./routers/dashboard.md) - Dashboard data
- [Leaderboard](./routers/leaderboard.md) - Sales leaderboards

### Admin Routers

- [Admin](./routers/admin.md) - Administrative functions
- [RBAC Users](./routers/rbac-users.md) - User role assignments
- [RBAC Roles](./routers/rbac-roles.md) - Role management
- [RBAC Permissions](./routers/rbac-permissions.md) - Permission management

### VIP Portal Routers

- [VIP Portal](./routers/vipPortal.md) - Customer portal endpoints
- [VIP Portal Admin](./routers/vipPortalAdmin.md) - Portal administration
- [Live Shopping](./routers/liveShopping.md) - Live shopping features

### Calendar Routers

- [Calendar](./routers/calendar.md) - Event management
- [Calendar Meetings](./routers/calendarMeetings.md) - Meeting scheduling
- [Calendar Reminders](./routers/calendarReminders.md) - Reminder system

---

## Error Handling

### Error Response Format

```json
{
  "error": {
    "message": "Error description",
    "code": "TRPC_ERROR_CODE",
    "data": {
      "code": "UNAUTHORIZED",
      "httpStatus": 401,
      "path": "orders.create"
    }
  }
}
```

### Common Error Codes

| Code                    | HTTP Status | Description                         |
| ----------------------- | ----------- | ----------------------------------- |
| `UNAUTHORIZED`          | 401         | Authentication required             |
| `FORBIDDEN`             | 403         | Insufficient permissions            |
| `NOT_FOUND`             | 404         | Resource not found                  |
| `BAD_REQUEST`           | 400         | Invalid input                       |
| `INTERNAL_SERVER_ERROR` | 500         | Server error                        |
| `CONFLICT`              | 409         | Resource conflict (e.g., duplicate) |
| `PRECONDITION_FAILED`   | 412         | Business rule violation             |

---

## Pagination

Many list endpoints support pagination using a standardized format:

### Request Parameters

```typescript
{
  limit?: number;   // Items per page (default: 50, max: 200)
  offset?: number;  // Starting position (default: 0)
}
```

### Response Format

```typescript
{
  items: T[];           // Array of results
  total: number;        // Total count
  limit: number;        // Items per page
  offset: number;       // Current offset
  hasMore: boolean;     // More results available
}
```

### Example

```typescript
// Get page 2 of orders (50 items per page)
const { data } = trpc.orders.list.useQuery({
  limit: 50,
  offset: 50,
});

console.log(data.items); // Orders 51-100
console.log(data.total); // Total order count
console.log(data.hasMore); // true if more pages exist
```

---

## Rate Limiting

API requests are rate-limited to ensure system stability:

| Endpoint Type   | Limit        | Window     |
| --------------- | ------------ | ---------- |
| Authentication  | 5 requests   | 15 minutes |
| General API     | 100 requests | 1 minute   |
| Bulk Operations | 10 requests  | 1 minute   |

Rate limit headers are included in responses:

- `X-RateLimit-Limit`: Maximum requests allowed
- `X-RateLimit-Remaining`: Requests remaining
- `X-RateLimit-Reset`: Unix timestamp when limit resets

---

## Changelog

### Version 1.0.0 (2025-12-31)

- Initial API documentation
- Documented 88 routers across all modules
- Added authentication guide
- Added pagination documentation
- Added error handling guide

---

## Support

For API issues or questions:

1. Check the [FAQ](../user-guide/FAQ.md)
2. Review the [Developer Guide](../dev-guide/README.md)
3. Create an issue in the repository

---

_Documentation generated as part of the Documentation & Testing Infrastructure Sprint_

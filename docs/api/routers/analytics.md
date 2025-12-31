# Analytics Router

**Path:** `trpc.analytics`  
**File:** `server/routers/analytics.ts`  
**Permission Required:** `analytics:read`

---

## Overview

The Analytics router provides business intelligence and reporting endpoints for the TERP dashboard. It aggregates data from orders, clients, and inventory to provide summary statistics and trend analysis.

---

## Endpoints

### getSummary

Get high-level analytics summary for the dashboard.

**Type:** Query  
**Permission:** `analytics:read`

**Input:** None

**Output:**

```typescript
interface AnalyticsSummary {
  totalRevenue: number; // Sum of all order totals
  totalOrders: number; // Count of all orders
  totalClients: number; // Count of all clients
  totalInventoryItems: number; // Count of active batches
}
```

**Example:**

```typescript
const { data } = trpc.analytics.getSummary.useQuery();

console.log(data);
// {
//   totalRevenue: 1250000.00,
//   totalOrders: 4523,
//   totalClients: 187,
//   totalInventoryItems: 342
// }
```

**cURL:**

```bash
curl "https://terp-app-b9s35.ondigitalocean.app/api/trpc/analytics.getSummary" \
  -H "Cookie: terp_session=..."
```

---

### clientStrainPreferences

Get a client's strain family purchase preferences based on order history.

**Type:** Query  
**Permission:** `analytics:read`

**Input:**

```typescript
{
  clientId: number; // Required: Client ID to analyze
}
```

**Output:**

```typescript
interface ClientStrainPreference {
  familyId: number; // Strain family ID
  familyName: string; // Strain family name
  purchaseCount: number; // Number of purchases
  totalQuantity: number; // Total quantity purchased
  lastPurchaseDate: Date | null; // Most recent purchase
}
[];
```

**Example:**

```typescript
const { data } = trpc.analytics.clientStrainPreferences.useQuery({
  clientId: 42,
});

console.log(data);
// [
//   {
//     familyId: 1,
//     familyName: "OG Kush",
//     purchaseCount: 15,
//     totalQuantity: 450,
//     lastPurchaseDate: "2025-12-28T10:30:00Z"
//   },
//   {
//     familyId: 3,
//     familyName: "Blue Dream",
//     purchaseCount: 8,
//     totalQuantity: 200,
//     lastPurchaseDate: "2025-12-15T14:20:00Z"
//   }
// ]
```

**Use Cases:**

- Personalized product recommendations
- Client preference analysis
- Sales strategy planning

---

### topStrainFamilies

Get the top-selling strain families by revenue.

**Type:** Query  
**Permission:** `analytics:read`

**Input:**

```typescript
{
  limit?: number;     // Max results (1-50, default: 10)
  startDate?: Date;   // Filter start date (optional)
  endDate?: Date;     // Filter end date (optional)
}
```

**Output:**

```typescript
interface TopStrainFamily {
  familyId: number; // Strain family ID
  familyName: string; // Strain family name
  totalSales: number; // Total revenue
  orderCount: number; // Number of orders
}
[];
```

**Example:**

```typescript
// Get top 5 strain families for Q4 2025
const { data } = trpc.analytics.topStrainFamilies.useQuery({
  limit: 5,
  startDate: new Date("2025-10-01"),
  endDate: new Date("2025-12-31"),
});

console.log(data);
// [
//   { familyId: 1, familyName: "OG Kush", totalSales: 125000, orderCount: 342 },
//   { familyId: 3, familyName: "Blue Dream", totalSales: 98000, orderCount: 287 },
//   { familyId: 7, familyName: "Gelato", totalSales: 87500, orderCount: 256 },
//   { familyId: 2, familyName: "Sour Diesel", totalSales: 76000, orderCount: 198 },
//   { familyId: 5, familyName: "Girl Scout Cookies", totalSales: 65000, orderCount: 175 }
// ]
```

**cURL:**

```bash
curl "https://terp-app-b9s35.ondigitalocean.app/api/trpc/analytics.topStrainFamilies?input=%7B%22limit%22%3A5%7D" \
  -H "Cookie: terp_session=..."
```

---

### strainFamilyTrends

Get sales trends for a specific strain family over time.

**Type:** Query  
**Permission:** `analytics:read`

**Input:**

```typescript
{
  familyId: number;   // Required: Strain family ID
  months?: number;    // Number of months to analyze (1-24, default: 6)
}
```

**Output:**

```typescript
interface StrainFamilyTrend {
  month: string; // Month identifier (e.g., "2025-12")
  sales: number; // Total sales for the month
  orderCount: number; // Number of orders
}
[];
```

**Example:**

```typescript
// Get 6-month trend for OG Kush family
const { data } = trpc.analytics.strainFamilyTrends.useQuery({
  familyId: 1,
  months: 6,
});

console.log(data);
// [
//   { month: "2025-07", sales: 18500, orderCount: 52 },
//   { month: "2025-08", sales: 21000, orderCount: 58 },
//   { month: "2025-09", sales: 19800, orderCount: 55 },
//   { month: "2025-10", sales: 23500, orderCount: 65 },
//   { month: "2025-11", sales: 25000, orderCount: 70 },
//   { month: "2025-12", sales: 27200, orderCount: 75 }
// ]
```

**Use Cases:**

- Seasonal trend analysis
- Inventory planning
- Marketing campaign effectiveness

---

## Error Handling

All endpoints return standard tRPC errors:

```typescript
try {
  const data = await trpc.analytics.getSummary.query();
} catch (error) {
  if (error.code === "UNAUTHORIZED") {
    // User not logged in
  } else if (error.code === "FORBIDDEN") {
    // User lacks analytics:read permission
  } else if (error.code === "INTERNAL_SERVER_ERROR") {
    // Database or calculation error
  }
}
```

---

## Related Routers

- [Dashboard](./dashboard.md) - Dashboard-specific metrics
- [Leaderboard](./leaderboard.md) - Sales performance rankings
- [Orders](./orders.md) - Order data source
- [Clients](./clients.md) - Client data source

---

_Documentation generated as part of the Documentation & Testing Infrastructure Sprint_

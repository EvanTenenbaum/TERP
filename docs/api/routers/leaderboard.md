# Leaderboard Router

**Path:** `trpc.leaderboard`  
**File:** `server/routers/leaderboard.ts`  
**Permission Required:** `analytics:read` (most endpoints), `admin:*` (admin endpoints)

---

## Overview

The Leaderboard router provides a comprehensive ranking system for clients based on multiple performance metrics. It supports customizable weights, caching, and both customer and supplier rankings.

---

## Metric Categories

| Category        | Description               | Metrics                                                                 |
| --------------- | ------------------------- | ----------------------------------------------------------------------- |
| **MASTER**      | Overall composite score   | Combined weighted score                                                 |
| **FINANCIAL**   | Revenue and profitability | `ytd_revenue`, `lifetime_value`, `average_order_value`, `profit_margin` |
| **ENGAGEMENT**  | Activity and frequency    | `order_frequency`, `recency`                                            |
| **RELIABILITY** | Payment and delivery      | `on_time_payment_rate`, `average_days_to_pay`, `credit_utilization`     |
| **GROWTH**      | Year-over-year trends     | `yoy_growth`, `ytd_purchase_volume`                                     |

### Supplier-Specific Metrics

- `delivery_reliability` - On-time delivery rate
- `quality_score` - Product quality rating
- `product_variety` - Range of products offered
- `response_time` - Average response time
- `return_rate` - Product return percentage

---

## Endpoints

### list

Get the full leaderboard with rankings and metrics.

**Type:** Query  
**Permission:** `analytics:read`

**Input:**

```typescript
{
  clientType?: "ALL" | "CUSTOMER" | "SUPPLIER" | "DUAL";  // Default: "ALL"
  metricCategory?: "MASTER" | "FINANCIAL" | "ENGAGEMENT" | "RELIABILITY" | "GROWTH";  // Default: "MASTER"
  weights?: Record<string, number>;  // Custom metric weights (must sum to 100)
  search?: string;  // Search by client name
  sortBy?: MetricType | "master_score";  // Default: "master_score"
  sortOrder?: "asc" | "desc";  // Default: "desc"
  limit?: number;  // 1-100, default: 25
  offset?: number;  // Default: 0
  forceRefresh?: boolean;  // Bypass cache, default: false
}
```

**Output:**

```typescript
{
  clients: Array<{
    clientId: number;
    clientName: string;
    teriCode: string;
    clientType: "CUSTOMER" | "SUPPLIER" | "DUAL";
    rank: number;
    percentile: number;
    masterScore: number;
    metrics: Record<string, { value: number | null; isSignificant: boolean }>;
    trend: "up" | "down" | "stable";
    trendAmount: number;
  }>;
  totalCount: number;
  metadata: {
    calculatedAt: string;  // ISO timestamp
    cacheHit: boolean;
    weightsApplied: Record<string, number>;
    significanceWarnings: string[];
  };
}
```

**Example:**

```typescript
const { data } = trpc.leaderboard.list.useQuery({
  clientType: "CUSTOMER",
  limit: 10,
  sortBy: "ytd_revenue",
});

console.log(data.clients[0]);
// {
//   clientId: 42,
//   clientName: "Acme Corp",
//   teriCode: "ACM001",
//   clientType: "CUSTOMER",
//   rank: 1,
//   percentile: 99.5,
//   masterScore: 92.4,
//   metrics: {
//     ytd_revenue: { value: 125000, isSignificant: true },
//     order_frequency: { value: 4.2, isSignificant: true },
//     on_time_payment_rate: { value: 98.5, isSignificant: true }
//   },
//   trend: "up",
//   trendAmount: 5.2
// }
```

---

### getForClient

Get detailed ranking context for a single client (used on profile pages).

**Type:** Query  
**Permission:** `analytics:read`

**Input:**

```typescript
{
  clientId: number; // Required
}
```

**Output:**

```typescript
{
  clientId: number;
  rank: number;
  percentile: number;
  totalClients: number;
  masterScore: number;
  categoryRanks: Record<string, number>; // Rank in each category
  metrics: Record<string, { value: number | null; isSignificant: boolean }>;
  trend: "up" | "down" | "stable";
  trendAmount: number;
  gapToNextRank: number | null; // Points needed to move up
  history: Array<{ date: string; rank: number; score: number }>;
}
```

**Example:**

```typescript
const { data } = trpc.leaderboard.getForClient.useQuery({
  clientId: 42,
});

console.log(data);
// {
//   clientId: 42,
//   rank: 5,
//   percentile: 95.2,
//   totalClients: 187,
//   masterScore: 87.3,
//   categoryRanks: {
//     FINANCIAL: 3,
//     ENGAGEMENT: 8,
//     RELIABILITY: 12,
//     GROWTH: 4
//   },
//   gapToNextRank: 2.1,
//   history: [
//     { date: "2025-12", rank: 5, score: 87.3 },
//     { date: "2025-11", rank: 7, score: 84.1 },
//     { date: "2025-10", rank: 9, score: 81.5 }
//   ]
// }
```

---

### getWidgetData

Get condensed leaderboard data for dashboard widgets.

**Type:** Query  
**Permission:** `analytics:read`

**Input:**

```typescript
{
  metric?: MetricType | "master_score";  // Default: "master_score"
  mode?: "top" | "bottom";  // Default: "top"
  limit?: number;  // 1-10, default: 5
  clientType?: "ALL" | "CUSTOMER" | "SUPPLIER" | "DUAL";  // Default: "ALL"
}
```

**Output:**

```typescript
{
  entries: Array<{
    clientId: number;
    clientName: string;
    rank: number;
    score: number;
    trend: "up" | "down" | "stable";
    trendAmount: number;
  }>;
  totalClients: number;
  metric: string;
  mode: "top" | "bottom";
  lastUpdated: string;
}
```

**Example:**

```typescript
// Get bottom 5 performers by payment reliability
const { data } = trpc.leaderboard.getWidgetData.useQuery({
  metric: "on_time_payment_rate",
  mode: "bottom",
  limit: 5,
});
```

---

## Weight Management

### weights.get

Get current user's custom weights or defaults.

**Type:** Query  
**Permission:** `analytics:read`

**Input:**

```typescript
{
  clientType?: "ALL" | "CUSTOMER" | "SUPPLIER" | "DUAL";  // Default: "ALL"
}
```

**Output:**

```typescript
{
  weights: Record<string, number>;
  isCustom: boolean;
  clientType: string;
}
```

---

### weights.save

Save custom metric weights for the current user.

**Type:** Mutation  
**Permission:** `analytics:read`

**Input:**

```typescript
{
  clientType: "ALL" | "CUSTOMER" | "SUPPLIER" | "DUAL";
  weights: Record<string, number>; // Must sum to 100
}
```

**Output:**

```typescript
{
  success: boolean;
}
```

**Example:**

```typescript
// Prioritize financial metrics
await trpc.leaderboard.weights.save.mutate({
  clientType: "CUSTOMER",
  weights: {
    ytd_revenue: 30,
    lifetime_value: 20,
    profit_margin: 15,
    order_frequency: 15,
    on_time_payment_rate: 10,
    yoy_growth: 10,
  },
});
```

**Validation:**

- Weights must sum to exactly 100 (±1 tolerance)
- Each weight must be between 0 and 100

---

### weights.reset

Reset user's weights to system defaults.

**Type:** Mutation  
**Permission:** `analytics:read`

**Input:**

```typescript
{
  clientType: "ALL" | "CUSTOMER" | "SUPPLIER" | "DUAL";
}
```

---

### weights.getDefaults

Get system default weights for a client type.

**Type:** Query  
**Permission:** `analytics:read`

**Input:**

```typescript
{
  clientType: "ALL" | "CUSTOMER" | "SUPPLIER" | "DUAL";
}
```

---

## Admin Operations

### admin.invalidateCache

Force refresh of leaderboard cache.

**Type:** Mutation  
**Permission:** `admin:*`

**Input:**

```typescript
{
  clientId?: number;  // Optional: invalidate specific client only
}
```

**Output:**

```typescript
{
  success: boolean;
  message: string;
}
```

---

### admin.getMetricConfigs

Get available metrics and their configurations.

**Type:** Query  
**Permission:** `admin:*`

**Output:**

```typescript
{
  metrics: Array<{
    type: string;
    name: string;
    description: string;
    category: string;
    direction: "higher_better" | "lower_better";
    format: "currency" | "percentage" | "number" | "days";
    applicableTo: ("CUSTOMER" | "SUPPLIER")[];
  }>;
  defaultWeights: {
    CUSTOMER: Record<string, number>;
    SUPPLIER: Record<string, number>;
  }
}
```

---

## Export

### export

Export leaderboard data in CSV or JSON format.

**Type:** Mutation  
**Permission:** `analytics:read`

**Input:**

```typescript
{
  format: "csv" | "json";
  clientType?: "ALL" | "CUSTOMER" | "SUPPLIER" | "DUAL";  // Default: "ALL"
  includeMetrics?: boolean;  // Default: true
}
```

**Output (JSON):**

```typescript
{
  format: "json";
  data: ClientRanking[];
  metadata: {
    exportedAt: string;
    totalClients: number;
    clientType: string;
  };
}
```

---

## Caching

The leaderboard uses an intelligent caching system:

- **Cache Duration:** 15 minutes for list queries
- **Automatic Invalidation:** On client data changes
- **Manual Invalidation:** Via `admin.invalidateCache`
- **Cache Key:** Based on client type, weights, and sort parameters

---

## Related Routers

- [Analytics](./analytics.md) - Additional analytics endpoints
- [Dashboard](./dashboard.md) - Dashboard metrics
- [Clients](./clients.md) - Client data source

---

_Documentation generated as part of the Documentation & Testing Infrastructure Sprint_

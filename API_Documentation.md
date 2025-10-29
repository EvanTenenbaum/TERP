# Data Card API: Technical Documentation

**Author:** Manus AI  
**Date:** October 28, 2025

## 1. Overview

This document provides technical documentation for the Data Card API, which is responsible for fetching and calculating the metrics displayed in the data cards across all modules of the TERP ERP system. The API is built using tRPC and Drizzle ORM, providing a type-safe and efficient data layer.

## 2. tRPC Endpoint

The primary endpoint for the Data Card API is `dataCardMetrics.getForModule`.

*   **Endpoint:** `dataCardMetrics.getForModule`
*   **Description:** Fetches a set of metrics for a given module.
*   **Input:**
    *   `moduleId` (string): The ID of the module (e.g., `inventory`, `orders`).
    *   `metricIds` (string[]): An array of metric IDs to fetch.
*   **Output:** A record of `MetricResult` objects, where the key is the metric ID.

### Example Usage (Client-side):

```typescript
import { trpc } from "@/lib/trpc";

function MyComponent() {
  const { data, isLoading } = trpc.dataCardMetrics.getForModule.useQuery({
    moduleId: "inventory",
    metricIds: ["inventory_total_value", "inventory_low_stock"],
  });

  // ...
}
```

## 3. Database Functions

The core logic for calculating the metrics is located in `server/dataCardMetricsDb.ts`. This file contains a separate function for each module to calculate its specific metrics.

### `calculateInventoryMetrics`

| Metric ID | Description |
| :--- | :--- |
| `inventory_total_value` | Total value of all inventory. |
| `inventory_avg_cogs` | Average cost of goods sold per unit. |
| `inventory_low_stock` | Number of items with stock levels at or below the defined threshold. |
| `inventory_out_of_stock` | Number of items with zero stock. |

### `calculateOrdersMetrics`

| Metric ID | Description |
| :--- | :--- |
| `orders_total` | Total number of orders. |
| `orders_pending` | Number of orders with a "PENDING" status. |
| `orders_completed` | Number of orders with a "DELIVERED" status. |
| `orders_revenue_mtd` | Total revenue from completed orders in the current month. |

### `calculateAccountingMetrics`

| Metric ID | Description |
| :--- | :--- |
| `accounting_cash` | Total cash balance across all bank accounts. |
| `accounting_ar` | Total accounts receivable (outstanding invoices). |
| `accounting_ap` | Total accounts payable (outstanding bills). |
| `accounting_net` | Net position (AR minus AP). |

### `calculateClientsMetrics`

| Metric ID | Description |
| :--- | :--- |
| `clients_total` | Total number of clients. |
| `clients_buyers` | Number of clients who are buyers. |
| `clients_with_debt` | Number of clients with outstanding debt. |
| `clients_new_month` | Number of new clients added in the current month. |

### `calculateVendorSupplyMetrics`

| Metric ID | Description |
| :--- | :--- |
| `vendor_available` | Number of available vendor supply items. |
| `vendor_reserved` | Number of reserved vendor supply items. |
| `vendor_purchased` | Number of purchased vendor supply items. |
| `vendor_expiring` | Number of available items expiring within 30 days. |

## 4. Metric Configuration

The configuration for all metrics and modules is centralized in `client/src/lib/data-cards/metricConfigs.ts`.

### `METRIC_CONFIGS`

This object defines the properties for each individual metric, such as its label, icon, color, and destination path.

```typescript
export const METRIC_CONFIGS: Record<string, MetricConfig> = {
  inventory_total_value: {
    id: "inventory_total_value",
    label: "Total Inventory Value",
    // ...
  },
  // ...
};
```

### `MODULE_CONFIGS`

This object defines the configuration for each module, including its default and available metrics.

```typescript
export const MODULE_CONFIGS: Record<string, ModuleConfig> = {
  inventory: {
    moduleId: "inventory",
    moduleName: "Inventory",
    defaultMetrics: [/* ... */],
    availableMetrics: [/* ... */],
    maxCards: 4,
  },
  // ...
};
```

### Adding a New Metric

To add a new metric, you need to:

1.  **Add the metric calculation** to the appropriate function in `server/dataCardMetricsDb.ts`.
2.  **Add the metric configuration** to the `METRIC_CONFIGS` object in `client/src/lib/data-cards/metricConfigs.ts`.
3.  **Add the new metric ID** to the `availableMetrics` array for the relevant module in the `MODULE_CONFIGS` object in the same file.

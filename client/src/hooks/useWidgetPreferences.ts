import { useState, useEffect } from "react";
import type { WidgetConfig } from "@/components/dashboard/DashboardCustomizer";

const STORAGE_KEY = "terp_widget_preferences";

// Default widget configuration
const DEFAULT_WIDGETS: WidgetConfig[] = [
  // Analytics
  {
    id: "sales-by-client",
    name: "Sales by Client",
    description: "View lifetime sales by customer with time period filters",
    enabled: true,
    category: "analytics",
  },
  {
    id: "cash-flow",
    name: "Cash Flow",
    description: "Track cash collected vs cash spent over time",
    enabled: true,
    category: "analytics",
  },
  {
    id: "sales-comparison",
    name: "Sales Comparison",
    description: "Compare sales across different time periods",
    enabled: true,
    category: "analytics",
  },
  // Operations
  {
    id: "transaction-snapshot",
    name: "Transaction Snapshot",
    description: "Today vs This Week metrics for sales, cash, and units",
    enabled: true,
    category: "operations",
  },
  {
    id: "inventory-snapshot",
    name: "Inventory Snapshot",
    description: "Current inventory levels by category",
    enabled: true,
    category: "operations",
  },
  {
    id: "total-debt",
    name: "Total Debt",
    description: "Accounts receivable vs accounts payable summary",
    enabled: true,
    category: "operations",
  },
  // Leaderboards
  {
    id: "cash-collected-leaderboard",
    name: "Cash Collected Leaderboard",
    description: "Top clients by cash collected",
    enabled: false,
    category: "leaderboards",
  },
  {
    id: "client-debt-leaderboard",
    name: "Client Debt Leaderboard",
    description: "Clients with highest outstanding debt",
    enabled: false,
    category: "leaderboards",
  },
  {
    id: "client-profit-margin-leaderboard",
    name: "Profit Margin Leaderboard",
    description: "Clients ranked by profit margin percentage",
    enabled: false,
    category: "leaderboards",
  },
];

export function useWidgetPreferences() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(() => {
    // Load from localStorage on mount
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const savedWidgets = JSON.parse(saved);
          // Merge saved preferences with defaults (in case new widgets were added)
          return DEFAULT_WIDGETS.map((defaultWidget) => {
            const saved = savedWidgets.find((w: WidgetConfig) => w.id === defaultWidget.id);
            return saved || defaultWidget;
          });
        }
      } catch (error) {
        console.error("Failed to load widget preferences:", error);
      }
    }
    return DEFAULT_WIDGETS;
  });

  const savePreferences = (newWidgets: WidgetConfig[]) => {
    setWidgets(newWidgets);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(newWidgets));
    }
  };

  const enabledWidgets = widgets.filter((w) => w.enabled);

  return {
    widgets,
    enabledWidgets,
    savePreferences,
  };
}


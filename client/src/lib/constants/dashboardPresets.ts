import type { DashboardLayout } from "@/types/dashboard";

export const LAYOUT_PRESETS: Record<string, DashboardLayout> = {
  executive: {
    id: "executive",
    name: "Executive Overview",
    description: "High-level metrics for decision makers",
    widgets: [
      {
        id: "sales-comparison",
        isVisible: true,
        isExpanded: false,
        size: "lg",
      },
      { id: "profitability", isVisible: true, isExpanded: false, size: "lg" },
      { id: "cash-flow", isVisible: true, isExpanded: false, size: "md" },
      { id: "available-cash", isVisible: true, isExpanded: false, size: "md" },
      { id: "total-debt", isVisible: true, isExpanded: false, size: "md" },
      { id: "sales-by-client", isVisible: false, isExpanded: false },
      { id: "transaction-snapshot", isVisible: false, isExpanded: false },
      { id: "inventory-snapshot", isVisible: false, isExpanded: false },
      { id: "matchmaking-opportunities", isVisible: false, isExpanded: false },
      { id: "inbox", isVisible: true, isExpanded: false, size: "md" },
    ],
  },
  operations: {
    id: "operations",
    name: "Owner Command Center",
    description:
      "Morning triage for inventory risk, payables, cash decisions, and quick action cards",
    widgets: [
      {
        id: "inventory-snapshot",
        isVisible: true,
        isExpanded: false,
        size: "lg",
      },
      {
        id: "aging-inventory",
        isVisible: true,
        isExpanded: false,
        size: "lg",
      },
      { id: "available-cash", isVisible: true, isExpanded: false, size: "md" },
      { id: "total-debt", isVisible: true, isExpanded: false, size: "md" },
      {
        id: "client-debt-leaderboard",
        isVisible: true,
        isExpanded: false,
        size: "md",
      },
      {
        id: "matchmaking-opportunities",
        isVisible: false,
        isExpanded: false,
        size: "lg",
      },
      {
        id: "transaction-snapshot",
        isVisible: true,
        isExpanded: false,
        size: "md",
      },
      { id: "inbox", isVisible: false, isExpanded: false, size: "md" },
      { id: "sales-by-client", isVisible: false, isExpanded: false },
      { id: "cash-flow", isVisible: false, isExpanded: false },
      {
        id: "sales-comparison",
        isVisible: false,
        isExpanded: false,
        size: "md",
      },
      { id: "profitability", isVisible: false, isExpanded: false, size: "lg" },
      { id: "workflow-queue", isVisible: false, isExpanded: false, size: "md" },
      {
        id: "workflow-activity",
        isVisible: false,
        isExpanded: false,
        size: "md",
      },
      // FE-QA-011: New widgets (hidden by default, can be enabled by users)
      {
        id: "cash-collected-leaderboard",
        isVisible: false,
        isExpanded: false,
        size: "md",
      },
      {
        id: "client-profit-margin-leaderboard",
        isVisible: false,
        isExpanded: false,
        size: "md",
      },
      {
        id: "top-strain-families",
        isVisible: false,
        isExpanded: false,
        size: "md",
      },
      {
        id: "smart-opportunities",
        isVisible: false,
        isExpanded: false,
        size: "lg",
      },
    ],
  },
  sales: {
    id: "sales",
    name: "Sales Focus",
    description: "Optimized for sales team",
    widgets: [
      { id: "sales-by-client", isVisible: true, isExpanded: false, size: "lg" },
      {
        id: "sales-comparison",
        isVisible: true,
        isExpanded: false,
        size: "md",
      },
      {
        id: "matchmaking-opportunities",
        isVisible: true,
        isExpanded: false,
        size: "lg",
      },
      {
        id: "transaction-snapshot",
        isVisible: true,
        isExpanded: false,
        size: "md",
      },
      { id: "cash-flow", isVisible: false, isExpanded: false },
      { id: "inventory-snapshot", isVisible: false, isExpanded: false },
      { id: "total-debt", isVisible: false, isExpanded: false },
      { id: "profitability", isVisible: false, isExpanded: false },
      { id: "inbox", isVisible: true, isExpanded: false, size: "md" },
    ],
  },
  custom: {
    id: "custom",
    name: "Custom",
    description: "Your personalized layout",
    widgets: [],
  },
};

export const DEFAULT_LAYOUT_ID = "operations";

export const WIDGET_METADATA = {
  "sales-by-client": {
    name: "Sales by Client",
    description: "Top clients by sales volume",
    category: "sales",
  },
  "cash-flow": {
    name: "Cash Flow",
    description: "Cash in versus cash out",
    category: "financial",
  },
  "transaction-snapshot": {
    name: "Quick Cards",
    description:
      "Today sales, units sold, cash collected, and inbox preview in one card",
    category: "operations",
  },
  "inventory-snapshot": {
    name: "Inventory Snapshot",
    description: "Inventory by category with units and value",
    category: "operations",
  },
  "total-debt": {
    name: "Debt Position",
    description: "What clients owe you versus what you owe vendors",
    category: "financial",
  },
  "sales-comparison": {
    name: "Sales Comparison",
    description: "Period-over-period sales trends",
    category: "sales",
  },
  profitability: {
    name: "Profitability",
    description: "Profit margins and top batches",
    category: "financial",
  },
  "matchmaking-opportunities": {
    name: "Client Outreach Opportunities",
    description:
      "Clients who may need outreach based on needs and reorder signals",
    category: "sales",
  },
  inbox: {
    name: "Inbox",
    description: "Recent notifications and mentions",
    category: "operations",
  },
  "workflow-queue": {
    name: "Workflow Queue",
    description: "Batch counts by workflow status",
    category: "operations",
  },
  "workflow-activity": {
    name: "Workflow Activity",
    description: "Recent batch status changes",
    category: "operations",
  },
  "available-cash": {
    name: "Cash Decision Panel",
    description: "Cash on hand, scheduled payables, and available balance",
    category: "financial",
  },
  // FE-QA-011: Integrate unused dashboard widgets
  "cash-collected-leaderboard": {
    name: "Cash Collected Leaderboard",
    description: "Top performers by cash collected",
    category: "financial",
  },
  "client-debt-leaderboard": {
    name: "Vendors Needing Payment",
    description: "Vendors linked to sold-out batches with unpaid payables",
    category: "financial",
  },
  "client-profit-margin-leaderboard": {
    name: "Client Profit Margin",
    description: "Clients ranked by profit margin",
    category: "sales",
  },
  "top-strain-families": {
    name: "Top Strain Families",
    description: "Best performing strain families",
    category: "sales",
  },
  "aging-inventory": {
    name: "Aging Inventory",
    description: "Oldest inventory and value-at-risk by age bracket",
    category: "operations",
  },
  "smart-opportunities": {
    name: "Smart Opportunities",
    description: "AI-suggested sales opportunities",
    category: "sales",
  },
};

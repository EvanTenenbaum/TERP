import type { DashboardLayout, WidgetState } from '@/types/dashboard';

export const LAYOUT_PRESETS: Record<string, DashboardLayout> = {
  executive: {
    id: 'executive',
    name: 'Executive Overview',
    description: 'High-level metrics for decision makers',
    widgets: [
      { id: 'sales-comparison', isVisible: true, isExpanded: false, size: 'lg' },
      { id: 'profitability', isVisible: true, isExpanded: false, size: 'lg' },
      { id: 'cash-flow', isVisible: true, isExpanded: false, size: 'md' },
      { id: 'total-debt', isVisible: true, isExpanded: false, size: 'md' },
      { id: 'sales-by-client', isVisible: false, isExpanded: false },
      { id: 'transaction-snapshot', isVisible: false, isExpanded: false },
      { id: 'inventory-snapshot', isVisible: false, isExpanded: false },
      { id: 'matchmaking-opportunities', isVisible: false, isExpanded: false },
    ],
  },
  operations: {
    id: 'operations',
    name: 'Operations Dashboard',
    description: 'Complete view for day-to-day management',
    widgets: [
      { id: 'sales-by-client', isVisible: true, isExpanded: false, size: 'md' },
      { id: 'cash-flow', isVisible: true, isExpanded: false, size: 'md' },
      { id: 'transaction-snapshot', isVisible: true, isExpanded: false, size: 'sm' },
      { id: 'inventory-snapshot', isVisible: true, isExpanded: false, size: 'sm' },
      { id: 'total-debt', isVisible: true, isExpanded: false, size: 'sm' },
      { id: 'sales-comparison', isVisible: true, isExpanded: false, size: 'md' },
      { id: 'profitability', isVisible: true, isExpanded: false, size: 'lg' },
      { id: 'matchmaking-opportunities', isVisible: true, isExpanded: false, size: 'lg' },
    ],
  },
  sales: {
    id: 'sales',
    name: 'Sales Focus',
    description: 'Optimized for sales team',
    widgets: [
      { id: 'sales-by-client', isVisible: true, isExpanded: false, size: 'lg' },
      { id: 'sales-comparison', isVisible: true, isExpanded: false, size: 'md' },
      { id: 'matchmaking-opportunities', isVisible: true, isExpanded: false, size: 'lg' },
      { id: 'transaction-snapshot', isVisible: true, isExpanded: false, size: 'md' },
      { id: 'cash-flow', isVisible: false, isExpanded: false },
      { id: 'inventory-snapshot', isVisible: false, isExpanded: false },
      { id: 'total-debt', isVisible: false, isExpanded: false },
      { id: 'profitability', isVisible: false, isExpanded: false },
    ],
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    description: 'Your personalized layout',
    widgets: [],
  },
};

export const DEFAULT_LAYOUT_ID = 'operations';

export const WIDGET_METADATA = {
  'sales-by-client': {
    name: 'Sales by Client',
    description: 'Top clients by sales volume',
    category: 'sales',
  },
  'cash-flow': {
    name: 'Cash Flow',
    description: 'Cash collected vs spent',
    category: 'financial',
  },
  'transaction-snapshot': {
    name: 'Transaction Snapshot',
    description: 'Recent transaction activity',
    category: 'operations',
  },
  'inventory-snapshot': {
    name: 'Inventory Snapshot',
    description: 'Current inventory levels',
    category: 'operations',
  },
  'total-debt': {
    name: 'Total Debt',
    description: 'Accounts receivable and payable',
    category: 'financial',
  },
  'sales-comparison': {
    name: 'Sales Comparison',
    description: 'Period-over-period sales trends',
    category: 'sales',
  },
  'profitability': {
    name: 'Profitability',
    description: 'Profit margins and top batches',
    category: 'financial',
  },
  'matchmaking-opportunities': {
    name: 'Matchmaking Opportunities',
    description: 'Client needs and inventory matches',
    category: 'sales',
  },
};

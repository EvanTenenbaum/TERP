// Dashboard V3 Type Definitions

export type WidgetSize = 'sm' | 'md' | 'lg' | 'xl';

export type WidgetExpandMode = 'modal' | 'drawer' | 'inline';

export interface WidgetConfig {
  id: string;
  title: string;
  description?: string;
  size: WidgetSize;
  defaultExpanded?: boolean;
  refreshInterval?: number;
  configurable?: boolean;
  exportable?: boolean;
}

export interface WidgetState {
  id: string;
  isExpanded: boolean;
  isVisible: boolean;
  position?: { row: number; col: number };
  size?: WidgetSize;
}

export interface WidgetExplainer {
  title: string;
  description: string;
  dataSource: string;
  updateFrequency: string;
  useCases: string[];
  relatedWidgets?: string[];
  helpDocUrl?: string;
}

export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  widgets: WidgetState[];
  gridColumns?: number;
}

export interface UserDashboardPreferences {
  userId: string;
  activeLayoutId: string;
  customLayouts: DashboardLayout[];
  widgetStates: Record<string, WidgetState>;
  theme?: 'light' | 'dark' | 'auto';
}

export const WIDGET_SIZES: Record<WidgetSize, { cols: number; minHeight: number }> = {
  sm: { cols: 4, minHeight: 200 },
  md: { cols: 6, minHeight: 300 },
  lg: { cols: 8, minHeight: 400 },
  xl: { cols: 12, minHeight: 500 },
};

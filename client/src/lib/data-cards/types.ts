/**
 * Data Card Types
 * Shared type definitions for data card system
 */

import type { LucideIcon } from "lucide-react";

export interface MetricConfig {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  color: string;
  format: 'currency' | 'number' | 'percentage' | 'count';
  category: 'financial' | 'operational' | 'analytical';
  destination: {
    path: string;
    getParams?: (data?: unknown) => Record<string, string>;
  };
}

export interface ModuleConfig {
  moduleId: string;
  moduleName: string;
  defaultMetrics: string[];
  availableMetrics: string[];
  maxCards: number;
}

export interface MetricResult {
  value: number | string;
  subtext?: string;
  trend?: {
    direction: 'up' | 'down' | 'flat';
    percentage: number;
  };
  updatedAt: string;
}

export type MetricData = Record<string, MetricResult>;

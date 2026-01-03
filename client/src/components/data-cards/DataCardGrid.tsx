/**
 * DataCardGrid Component
 * Grid container for data cards with data fetching and navigation
 */

import { useEffect } from "react";
import { useLocation } from "wouter";
import { DataCard } from "./DataCard";
import { getMetricConfig, getMetricIdsForModule } from "@/lib/data-cards";
import { trpc } from "@/lib/trpc";
import { trackCardsViewed, trackCardError } from "@/lib/data-cards/analytics";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { MetricResult } from "@/lib/data-cards/types";

interface DataCardGridProps {
  moduleId: string;
  className?: string;
}

type SupportedModuleId =
  | "clients"
  | "orders"
  | "vendor_supply"
  | "inventory"
  | "accounting"
  | "quotes";

const SUPPORTED_MODULE_IDS: SupportedModuleId[] = [
  "clients",
  "orders",
  "vendor_supply",
  "inventory",
  "accounting",
  "quotes",
];

const toSupportedModuleId = (id: string): SupportedModuleId => {
  return SUPPORTED_MODULE_IDS.includes(id as SupportedModuleId)
    ? (id as SupportedModuleId)
    : "inventory";
};

export function DataCardGrid({ moduleId, className }: DataCardGridProps) {
  const [, setLocation] = useLocation();

  // Get metric IDs from user preferences or defaults
  const metricIds = getMetricIdsForModule(moduleId);

  // Fetch metric data
  const { data, isLoading, isFetching, error, refetch } =
    trpc.dataCardMetrics.getForModule.useQuery(
      {
        moduleId: toSupportedModuleId(moduleId),
        metricIds,
      },
      {
        enabled: metricIds.length > 0,
        staleTime: 0,
        refetchOnMount: "always",
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchInterval: 30_000,
        retry: 2,
      }
    );

  // Track cards viewed when data loads
  useEffect(() => {
    if (data && !isLoading) {
      trackCardsViewed(moduleId, metricIds);
    }
  }, [data, isLoading, moduleId, metricIds]);

  // Track errors
  useEffect(() => {
    if (error) {
      metricIds.forEach(metricId => {
        trackCardError(moduleId, metricId, error.message);
      });
    }
  }, [error, moduleId, metricIds]);

  const handleCardClick = (metricId: string) => {
    const metricConfig = getMetricConfig(metricId);
    if (!metricConfig) return;

    const { path, getParams } = metricConfig.destination;
    const metricData = data?.[metricId];
    const params = getParams ? getParams(metricData) : {};

    // Build URL with query parameters
    const queryString = new URLSearchParams(params).toString();
    const url = queryString ? `${path}?${queryString}` : path;

    setLocation(url);
  };

  // Error state
  if (error) {
    return (
      <Alert variant="destructive" data-testid="metric-error">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load metrics. Please refresh the page to try again.
        </AlertDescription>
        <div className="mt-2">
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            Try again
          </Button>
        </div>
      </Alert>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div
        className={
          className || "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
        }
      >
        {metricIds.map((_, index) => (
          <Card
            key={index}
            className="h-32 animate-pulse bg-muted"
            data-testid="metric-skeleton"
          />
        ))}
      </div>
    );
  }

  // No data
  if (!data || Object.keys(data).length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No metrics available for this module.
        </AlertDescription>
      </Alert>
    );
  }

  // Render cards
  return (
    <div
      className={
        className || "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"
      }
    >
      {metricIds.map(metricId => {
        const metricConfig = getMetricConfig(metricId);
        const metricData: MetricResult | undefined = data?.[metricId];

        if (!metricConfig) return null;

        const safeData: MetricResult = metricData ?? {
          value: 0,
          subtext: "Data unavailable",
          updatedAt: new Date().toISOString(),
        };

        return (
          <DataCard
            key={metricId}
            metric={metricConfig}
            data={safeData}
            isLoading={isFetching && Boolean(data)}
            onClick={() => handleCardClick(metricId)}
            data-testid="metric-card"
          />
        );
      })}
    </div>
  );
}

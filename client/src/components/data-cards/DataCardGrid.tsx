/**
 * DataCardGrid Component
 * Grid container for data cards with data fetching and navigation
 */

import { useLocation } from "wouter";
import { DataCard } from "./DataCard";
import { getMetricConfig, getMetricIdsForModule } from "@/lib/data-cards";
import { trpc } from "@/lib/trpc";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";

interface DataCardGridProps {
  moduleId: string;
  className?: string;
}

export function DataCardGrid({ moduleId, className }: DataCardGridProps) {
  const [, setLocation] = useLocation();
  
  // Get metric IDs from user preferences or defaults
  const metricIds = getMetricIdsForModule(moduleId);
  
  // Fetch metric data
  const { data, isLoading, error } = trpc.dataCardMetrics.getForModule.useQuery(
    { moduleId, metricIds },
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 2,
    }
  );
  
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
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load metrics. Please refresh the page to try again.
        </AlertDescription>
      </Alert>
    );
  }
  
  // Loading state
  if (isLoading) {
    return (
      <div className={className || "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}>
        {metricIds.map((_, index) => (
          <Card key={index} className="h-32 animate-pulse bg-muted" />
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
    <div className={className || "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"}>
      {metricIds.map((metricId) => {
        const metricConfig = getMetricConfig(metricId);
        const metricData = data[metricId];
        
        if (!metricConfig || !metricData) return null;
        
        return (
          <DataCard
            key={metricId}
            metric={metricConfig}
            data={metricData}
            onClick={() => handleCardClick(metricId)}
          />
        );
      })}
    </div>
  );
}

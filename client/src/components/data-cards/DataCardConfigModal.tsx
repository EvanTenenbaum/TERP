/**
 * DataCardConfigModal Component
 * Modal dialog for customizing which metrics are displayed
 */

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  getModuleConfig,
  getMetricsForModule,
  getMetricIdsForModule,
  saveMetricIdsForModule,
  resetModulePreferences,
} from "@/lib/data-cards";
import {
  trackConfigModalOpened,
  trackMetricsCustomized,
  trackMetricsReset,
  trackConfigModalCancelled,
} from "@/lib/data-cards/analytics";
import { cn } from "@/lib/utils";
import { AlertCircle } from "lucide-react";

interface DataCardConfigModalProps {
  moduleId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave?: () => void;
}

export function DataCardConfigModal({
  moduleId,
  open,
  onOpenChange,
  onSave,
}: DataCardConfigModalProps) {
  const moduleConfig = getModuleConfig(moduleId);
  const availableMetrics = getMetricsForModule(moduleId);
  const currentMetricIds = getMetricIdsForModule(moduleId);
  
  const [selectedMetricIds, setSelectedMetricIds] = useState<string[]>(currentMetricIds);
  const [error, setError] = useState<string | null>(null);
  
  // Reset selection when modal opens
  useEffect(() => {
    if (open) {
      setSelectedMetricIds(currentMetricIds);
      setError(null);
      // Track modal opened (with error handling)
      try {
        trackConfigModalOpened(moduleId);
      } catch (err) {
        console.warn('Failed to track modal opened:', err);
      }
    }
  }, [open, currentMetricIds, moduleId]);
  
  // Early return if config is not available
  if (!moduleConfig || !availableMetrics || availableMetrics.length === 0) {
    console.error('Invalid module config or metrics:', { moduleId, moduleConfig, availableMetrics });
    return null;
  }
  
  const maxCards = moduleConfig.maxCards;
  const isValid = selectedMetricIds.length > 0 && selectedMetricIds.length <= maxCards;
  
  const handleToggle = (metricId: string) => {
    setSelectedMetricIds((prev) => {
      if (prev.includes(metricId)) {
        return prev.filter((id) => id !== metricId);
      } else {
        if (prev.length >= maxCards) {
          setError(`You can select up to ${maxCards} metrics`);
          return prev;
        }
        setError(null);
        return [...prev, metricId];
      }
    });
  };
  
  const handleSave = () => {
    if (!isValid) {
      setError(`Please select between 1 and ${maxCards} metrics`);
      return;
    }
    
    // Track metrics customization
    try {
      trackMetricsCustomized(moduleId, selectedMetricIds, currentMetricIds);
    } catch (err) {
      console.warn('Failed to track metrics customized:', err);
    }
    
    saveMetricIdsForModule(moduleId, selectedMetricIds);
    onSave?.();
    onOpenChange(false);
  };
  
  const handleReset = () => {
    resetModulePreferences(moduleId);
    const defaultIds = moduleConfig.defaultMetrics;
    setSelectedMetricIds(defaultIds);
    setError(null);
    
    // Track reset
    try {
      trackMetricsReset(moduleId, defaultIds);
    } catch (err) {
      console.warn('Failed to track metrics reset:', err);
    }
  };
  
  const handleCancel = () => {
    setSelectedMetricIds(currentMetricIds);
    setError(null);
    
    // Track cancel
    try {
      trackConfigModalCancelled(moduleId);
    } catch (err) {
      console.warn('Failed to track modal cancelled:', err);
    }
    
    onOpenChange(false);
  };
  
  // Group metrics by category
  const metricsByCategory = availableMetrics.reduce((acc, metric) => {
    if (!acc[metric.category]) {
      acc[metric.category] = [];
    }
    acc[metric.category].push(metric);
    return acc;
  }, {} as Record<string, typeof availableMetrics>);
  
  const categories = Object.keys(metricsByCategory).sort();
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open && (
      <DialogContent className="w-full sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Customize {moduleConfig.moduleName} Metrics</DialogTitle>
          <DialogDescription>
            Select up to {maxCards} metrics to display on your dashboard.
            {selectedMetricIds.length > 0 && (
              <span className="block mt-1 font-medium">
                {selectedMetricIds.length} of {maxCards} selected
              </span>
            )}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {error && (
            <div className="flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          )}
          
          {categories.map((category) => (
            <div key={category} className="space-y-3">
              <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                {category}
              </h4>
              <div className="space-y-2">
                {metricsByCategory[category].map((metric) => {
                  const isSelected = selectedMetricIds.includes(metric.id);
                  const isDisabled = !isSelected && selectedMetricIds.length >= maxCards;
                  const Icon = metric.icon;
                  
                  // Safety check for icon
                  if (!Icon) {
                    console.warn('Missing icon for metric:', metric.id);
                    return null;
                  }
                  
                  return (
                    <div
                      key={metric.id}
                      className={cn(
                        "flex items-start space-x-3 p-3 rounded-lg border transition-colors",
                        isSelected && "bg-primary/5 border-primary",
                        !isSelected && "hover:bg-muted",
                        isDisabled && "opacity-50 cursor-not-allowed"
                      )}
                    >
                      <Checkbox
                        id={metric.id}
                        checked={isSelected}
                        onCheckedChange={() => !isDisabled && handleToggle(metric.id)}
                        disabled={isDisabled}
                        className="mt-1"
                      />
                      <div className="flex-1 space-y-1">
                        <Label
                          htmlFor={metric.id}
                          className={cn(
                            "flex items-center gap-2 cursor-pointer",
                            isDisabled && "cursor-not-allowed"
                          )}
                        >
                          <Icon className={cn("h-4 w-4", metric.color)} />
                          <span className="font-medium">{metric.label}</span>
                        </Label>
                        <p className="text-sm text-muted-foreground">
                          {metric.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            variant="outline"
            onClick={handleReset}
            className="w-full sm:w-auto"
          >
            Reset to Defaults
          </Button>
          <div className="flex gap-2 w-full sm:w-auto">
            <Button
              variant="outline"
              onClick={handleCancel}
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={!isValid}
              className="flex-1 sm:flex-none"
            >
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
      )}
    </Dialog>
  );
}

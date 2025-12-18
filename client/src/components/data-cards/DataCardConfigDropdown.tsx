/**
 * DataCardConfigDropdown Component
 * Simpler dropdown-based UI for customizing data card metrics
 */

import { useState, useEffect } from "react";
import { Settings, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import {
  getMetricsForModule,
  getModuleConfig,
  getDefaultMetricsForModule,
} from "@/lib/data-cards/metricConfigs";
import {
  getMetricIdsForModule,
  saveMetricIdsForModule,
} from "@/lib/data-cards/preferences";

interface DataCardConfigDropdownProps {
  moduleId: string;
  onSave?: () => void;
}

export function DataCardConfigDropdown({
  moduleId,
  onSave,
}: DataCardConfigDropdownProps) {
  const [open, setOpen] = useState(false);
  const [selectedMetricIds, setSelectedMetricIds] = useState<string[]>([]);

  const moduleConfig = getModuleConfig(moduleId);
  const availableMetrics = getMetricsForModule(moduleId);
  const defaultMetrics = getDefaultMetricsForModule(moduleId);

  useEffect(() => {
    if (open) {
      // Load current preferences when dropdown opens
      const currentPrefs = getMetricIdsForModule(moduleId);
      if (currentPrefs && currentPrefs.length > 0) {
        setSelectedMetricIds(currentPrefs);
      } else {
        setSelectedMetricIds(defaultMetrics.map((m) => m.id));
      }
    }
  }, [open, moduleId, defaultMetrics]);

  if (!moduleConfig || !availableMetrics || availableMetrics.length === 0) {
    return null;
  }

  const maxCards = moduleConfig.maxCards;

  const handleToggle = (metricId: string) => {
    setSelectedMetricIds((prev) => {
      if (prev.includes(metricId)) {
        return prev.filter((id) => id !== metricId);
      } else if (prev.length < maxCards) {
        return [...prev, metricId];
      }
      return prev;
    });
  };

  const handleSave = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedMetricIds.length > 0 && selectedMetricIds.length <= maxCards) {
      saveMetricIdsForModule(moduleId, selectedMetricIds);
      onSave?.();
      setOpen(false);
    }
  };

  const handleReset = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const defaultIds = defaultMetrics.map((m) => m.id);
    setSelectedMetricIds(defaultIds);
    saveMetricIdsForModule(moduleId, defaultIds);
    onSave?.();
    setOpen(false);
  };

  const isValid = selectedMetricIds.length > 0 && selectedMetricIds.length <= maxCards;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Settings className="h-4 w-4" />
          Configure Display
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-80 max-h-[500px] overflow-y-auto" align="end">
        <DropdownMenuLabel>
          Select Metrics ({selectedMetricIds.length}/{maxCards})
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="p-2 space-y-1">
          {availableMetrics.map((metric) => {
            const isSelected = selectedMetricIds.includes(metric.id);
            const isDisabled = !isSelected && selectedMetricIds.length >= maxCards;
            const Icon = metric.icon;

            return (
              <div
                key={metric.id}
                className={cn(
                  "flex items-center space-x-2 px-2 py-2 rounded-md hover:bg-accent cursor-pointer",
                  isDisabled && "opacity-50 cursor-not-allowed"
                )}
                onClick={() => !isDisabled && handleToggle(metric.id)}
              >
                <Checkbox
                  checked={isSelected}
                  disabled={isDisabled}
                  onCheckedChange={() => !isDisabled && handleToggle(metric.id)}
                  onClick={(e) => e.stopPropagation()}
                />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {Icon && <Icon className={cn("h-4 w-4 flex-shrink-0", metric.color)} />}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{metric.label}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {metric.description}
                    </div>
                  </div>
                  {isSelected && <Check className="h-4 w-4 text-primary flex-shrink-0" />}
                </div>
              </div>
            );
          })}
        </div>

        <DropdownMenuSeparator />
        
        <div className="p-2 flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleReset}
            className="flex-1"
          >
            Reset
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isValid}
            className="flex-1"
          >
            Save
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

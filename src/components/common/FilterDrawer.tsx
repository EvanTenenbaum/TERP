import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface FilterOption {
  label: string;
  value: string;
}

interface FilterConfig {
  label: string;
  key: string;
  type: "select" | "multiselect" | "daterange" | "numberrange";
  options?: FilterOption[];
}

interface FilterDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: FilterConfig[];
  activeFilters: Record<string, any>;
  onFilterChange: (key: string, value: any) => void;
  onClearAll: () => void;
  onApply: () => void;
}

export function FilterDrawer({
  open,
  onOpenChange,
  filters,
  activeFilters,
  onFilterChange,
  onClearAll,
  onApply,
}: FilterDrawerProps) {
  if (!open) return null;

  const activeCount = Object.keys(activeFilters).filter(
    (key) => activeFilters[key] !== undefined && activeFilters[key] !== ""
  ).length;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm animate-fade-in">
      <Card className="absolute right-0 top-0 h-full w-96 animate-slide-in-right border-l shadow-elevated">
        <div className="flex h-full flex-col">
          <div className="flex items-center justify-between border-b border-border p-4">
            <div>
              <h3 className="font-semibold">Filters</h3>
              {activeCount > 0 && (
                <p className="text-xs text-muted-foreground">
                  {activeCount} active filter{activeCount > 1 ? "s" : ""}
                </p>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          <div className="flex-1 overflow-auto p-4 space-y-4">
            {filters.map((filter) => (
              <div key={filter.key} className="space-y-2">
                <Label>{filter.label}</Label>
                
                {filter.type === "select" && (
                  <Select
                    value={activeFilters[filter.key] || ""}
                    onValueChange={(value) => onFilterChange(filter.key, value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={`Select ${filter.label.toLowerCase()}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {filter.options?.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {filter.type === "multiselect" && (
                  <div className="space-y-2">
                    <Select
                      onValueChange={(value) => {
                        const current = activeFilters[filter.key] || [];
                        if (!current.includes(value)) {
                          onFilterChange(filter.key, [...current, value]);
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={`Select ${filter.label.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {filter.options?.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {activeFilters[filter.key]?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {activeFilters[filter.key].map((value: string) => (
                          <Badge key={value} variant="secondary" className="gap-1">
                            {filter.options?.find((o) => o.value === value)?.label}
                            <X
                              className="h-3 w-3 cursor-pointer"
                              onClick={() => {
                                const current = activeFilters[filter.key] || [];
                                onFilterChange(
                                  filter.key,
                                  current.filter((v: string) => v !== value)
                                );
                              }}
                            />
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {filter.type === "daterange" && (
                  <div className="grid gap-2 grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">From</Label>
                      <Input
                        type="date"
                        value={activeFilters[`${filter.key}_from`] || ""}
                        onChange={(e) => onFilterChange(`${filter.key}_from`, e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">To</Label>
                      <Input
                        type="date"
                        value={activeFilters[`${filter.key}_to`] || ""}
                        onChange={(e) => onFilterChange(`${filter.key}_to`, e.target.value)}
                      />
                    </div>
                  </div>
                )}

                {filter.type === "numberrange" && (
                  <div className="grid gap-2 grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Min</Label>
                      <Input
                        type="number"
                        placeholder="Min"
                        value={activeFilters[`${filter.key}_min`] || ""}
                        onChange={(e) => onFilterChange(`${filter.key}_min`, e.target.value)}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Max</Label>
                      <Input
                        type="number"
                        placeholder="Max"
                        value={activeFilters[`${filter.key}_max`] || ""}
                        onChange={(e) => onFilterChange(`${filter.key}_max`, e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="border-t border-border p-4 space-y-2">
            <Button className="w-full" onClick={onApply}>
              Apply Filters
            </Button>
            <Button variant="outline" className="w-full" onClick={onClearAll}>
              Clear All
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

import { Search, X, RotateCcw, ArrowUpAZ, ArrowDownAZ } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export type FilterSortSearchDirection = "asc" | "desc";

export interface FilterSortSearchOption {
  value: string;
  label: string;
}

export interface FilterSortSearchFilterConfig {
  id: string;
  label: string;
  value: string;
  options: FilterSortSearchOption[];
  onChange: (value: string) => void;
  allValue?: string;
  allLabel?: string;
}

export interface FilterSortSearchSortConfig {
  field: string;
  fieldOptions: FilterSortSearchOption[];
  onFieldChange: (field: string) => void;
  direction?: FilterSortSearchDirection;
  onDirectionChange?: (direction: FilterSortSearchDirection) => void;
  label?: string;
  directionLabels?: {
    asc: string;
    desc: string;
  };
}

export interface FilterSortSearchPanelProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterSortSearchFilterConfig[];
  sort?: FilterSortSearchSortConfig;
  resultCount?: number;
  resultLabel?: string;
  onClearAll?: () => void;
  className?: string;
}

function getSelectedLabel(
  options: FilterSortSearchOption[],
  value: string
): string | null {
  const selected = options.find(option => option.value === value);
  return selected?.label ?? null;
}

export function FilterSortSearchPanel({
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search...",
  filters = [],
  sort,
  resultCount,
  resultLabel = "results",
  onClearAll,
  className,
}: FilterSortSearchPanelProps) {
  const activeFilters = filters.filter(filter => {
    const allValue = filter.allValue ?? "ALL";
    return filter.value !== allValue;
  });
  const hasActiveSearch = searchValue.trim().length > 0;
  const hasActiveControls = hasActiveSearch || activeFilters.length > 0;
  const canClearAll = hasActiveControls && Boolean(onClearAll);
  const shouldShowMeta = hasActiveControls || typeof resultCount === "number";

  return (
    <Card className={cn("border-border/60", className)}>
      <CardContent className="pt-5 space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchValue}
              onChange={event => onSearchChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {filters.map(filter => {
              const allValue = filter.allValue ?? "ALL";
              const allLabel = filter.allLabel ?? `All ${filter.label}`;

              return (
                <Select
                  key={filter.id}
                  value={filter.value}
                  onValueChange={filter.onChange}
                >
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder={filter.label} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={allValue}>{allLabel}</SelectItem>
                    {filter.options.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              );
            })}

            {sort && (
              <>
                <Select value={sort.field} onValueChange={sort.onFieldChange}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder={sort.label ?? "Sort by"} />
                  </SelectTrigger>
                  <SelectContent>
                    {sort.fieldOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {sort.direction && sort.onDirectionChange && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      sort.onDirectionChange?.(
                        sort.direction === "asc" ? "desc" : "asc"
                      )
                    }
                    className="min-w-[128px] justify-start"
                  >
                    {sort.direction === "asc" ? (
                      <ArrowUpAZ className="h-4 w-4 mr-2" />
                    ) : (
                      <ArrowDownAZ className="h-4 w-4 mr-2" />
                    )}
                    {sort.directionLabels
                      ? sort.directionLabels[sort.direction]
                      : sort.direction === "asc"
                        ? "Ascending"
                        : "Descending"}
                  </Button>
                )}
              </>
            )}

            {canClearAll && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={onClearAll}
                className="h-9"
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear all
              </Button>
            )}
          </div>
        </div>

        {shouldShowMeta && (
          <div className="flex flex-wrap items-center gap-2">
            {hasActiveSearch && (
              <Badge variant="secondary" className="gap-1.5">
                Search: {searchValue}
                <button
                  type="button"
                  className="rounded-sm hover:bg-muted-foreground/20"
                  aria-label="Clear search"
                  onClick={() => onSearchChange("")}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </Badge>
            )}

            {activeFilters.map(filter => {
              const selectedLabel = getSelectedLabel(
                filter.options,
                filter.value
              );
              if (!selectedLabel) {
                return null;
              }

              return (
                <Badge
                  key={`active-${filter.id}`}
                  variant="secondary"
                  className="gap-1.5"
                >
                  {filter.label}: {selectedLabel}
                  <button
                    type="button"
                    className="rounded-sm hover:bg-muted-foreground/20"
                    aria-label={`Clear ${filter.label}`}
                    onClick={() => filter.onChange(filter.allValue ?? "ALL")}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </Badge>
              );
            })}

            {typeof resultCount === "number" && (
              <div className="text-xs text-muted-foreground ml-auto">
                {resultCount.toLocaleString()} {resultLabel}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

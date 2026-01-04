import React, { useCallback, useMemo } from "react";
import { Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DataTableColumn } from "./DataTable";

export interface DataTableFiltersProps<T> {
  columns: Array<DataTableColumn<T>>;
  activeFilters: Record<string, string[]>;
  onChange?: (filters: Record<string, string[]>) => void;
}

function DataTableFiltersComponent<T>({
  columns,
  activeFilters,
  onChange,
}: DataTableFiltersProps<T>): React.ReactElement | null {
  const filterableColumns = useMemo(
    () =>
      columns.filter(
        column =>
          column.enableFiltering !== false &&
          column.filterOptions &&
          column.filterOptions.length > 0
      ),
    [columns]
  );

  const toggleFilter = useCallback(
    (columnId: string, value: string, checked: boolean) => {
      onChange?.(
        filterableColumns.reduce<Record<string, string[]>>((acc, column) => {
          const existingValues = activeFilters[String(column.id)] ?? [];
          if (String(column.id) !== columnId) {
            if (existingValues.length > 0) {
              acc[String(column.id)] = existingValues;
            }
            return acc;
          }

          const normalizedValue = value.toLowerCase();
          const nextValues = checked
            ? Array.from(new Set([...existingValues, normalizedValue]))
            : existingValues.filter(item => item !== normalizedValue);

          if (nextValues.length > 0) {
            acc[columnId] = nextValues;
          }

          return acc;
        }, {})
      );
    },
    [activeFilters, filterableColumns, onChange]
  );

  if (filterableColumns.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {filterableColumns.map(column => {
        const columnId = String(column.id);
        return (
          <DropdownMenu key={columnId}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                aria-label={`${column.header} filters`}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                {column.header} filters
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuLabel>{column.header}</DropdownMenuLabel>
              {column.filterOptions?.map(option => (
                <DropdownMenuCheckboxItem
                  key={option.value}
                  role="menuitemcheckbox"
                  checked={activeFilters[columnId]?.includes(
                    option.value.toLowerCase()
                  )}
                  onCheckedChange={checked =>
                    toggleFilter(columnId, option.value, Boolean(checked))
                  }
                >
                  {option.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      })}
    </div>
  );
}

export const DataTableFilters = React.memo(DataTableFiltersComponent) as <T>(
  props: DataTableFiltersProps<T>
) => React.ReactElement | null;

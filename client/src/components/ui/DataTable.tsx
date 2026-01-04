import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { DataTablePagination } from "./DataTablePagination";
import { DataTableFilters } from "./DataTableFilters";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type SortDirection = "asc" | "desc" | null;

export interface DataTableColumn<T> {
  id: keyof T | string;
  header: string;
  accessor: (row: T) => React.ReactNode;
  valueAccessor?: (row: T) => string | number;
  filterOptions?: Array<{ label: string; value: string }>;
  enableSorting?: boolean;
  enableFiltering?: boolean;
  searchable?: boolean;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Array<DataTableColumn<T>>;
  enableSorting?: boolean;
  enableColumnFilters?: boolean;
  enableGlobalSearch?: boolean;
  enablePagination?: boolean;
  enableColumnVisibility?: boolean;
  enableRowSelection?: boolean;
  initialPageSize?: number;
  pageSizes?: number[];
  globalSearchPlaceholder?: string;
  onSelectionChange?: (selected: T[]) => void;
  getRowId?: (row: T, index: number) => string;
}

type VisibleColumnState = Record<string, boolean>;
type ColumnFilters = Record<string, string[]>;

const DEFAULT_PAGE_SIZES = [10, 25, 50, 100];
const SEARCH_DEBOUNCE_MS = 250;

function getStringValue(value: string | number | undefined): string {
  if (value === undefined) {
    return "";
  }

  return String(value).toLowerCase();
}

function getRowIdentifier<T>(
  row: T,
  index: number,
  getRowId?: (row: T, index: number) => string
): string {
  if (getRowId) {
    return getRowId(row, index);
  }

  if (typeof row === "object" && row !== null && "id" in row) {
    return String((row as { id: unknown }).id);
  }

  return String(index);
}

function sortByColumn<T>(
  rows: T[],
  column: DataTableColumn<T>,
  direction: Exclude<SortDirection, null>
): T[] {
  const valueAccessor = column.valueAccessor ?? column.accessor;

  return [...rows].sort((a, b) => {
    const first = valueAccessor(a);
    const second = valueAccessor(b);
    const firstValue =
      typeof first === "number"
        ? first
        : Number(getStringValue(first as string | number | undefined));
    const secondValue =
      typeof second === "number"
        ? second
        : Number(getStringValue(second as string | number | undefined));

    if (Number.isNaN(firstValue) || Number.isNaN(secondValue)) {
      const firstText = getStringValue(first as string | number | undefined);
      const secondText = getStringValue(second as string | number | undefined);
      return direction === "asc"
        ? firstText.localeCompare(secondText)
        : secondText.localeCompare(firstText);
    }

    return direction === "asc"
      ? firstValue - secondValue
      : secondValue - firstValue;
  });
}

function applyColumnFilters<T>(
  rows: T[],
  columns: Array<DataTableColumn<T>>,
  filters: ColumnFilters
): T[] {
  return rows.filter(row =>
    columns.every(column => {
      const activeFilters = filters[String(column.id)];
      if (!activeFilters || activeFilters.length === 0) {
        return true;
      }

      const valueAccessor = column.valueAccessor ?? column.accessor;
      const value = getStringValue(
        valueAccessor(row) as string | number | undefined
      );
      return activeFilters.some(filterValue =>
        value.includes(filterValue.toLowerCase())
      );
    })
  );
}

function applyGlobalSearch<T>(
  rows: T[],
  columns: Array<DataTableColumn<T>>,
  visibleColumns: VisibleColumnState,
  query: string
): T[] {
  if (!query) {
    return rows;
  }

  const normalizedQuery = query.toLowerCase();

  return rows.filter(row =>
    columns.some(column => {
      if (!visibleColumns[String(column.id)] || column.searchable === false) {
        return false;
      }
      const valueAccessor = column.valueAccessor ?? column.accessor;
      const value = getStringValue(
        valueAccessor(row) as string | number | undefined
      );
      return value.includes(normalizedQuery);
    })
  );
}

function DataTableComponent<T>({
  data,
  columns,
  enableSorting = false,
  enableColumnFilters = false,
  enableGlobalSearch = false,
  enablePagination = false,
  enableColumnVisibility = false,
  enableRowSelection = false,
  initialPageSize = 10,
  pageSizes = DEFAULT_PAGE_SIZES,
  globalSearchPlaceholder = "Search",
  onSelectionChange,
  getRowId,
}: DataTableProps<T>): React.ReactElement {
  const [sortState, setSortState] = useState<{
    columnId: string | null;
    direction: SortDirection;
  }>({ columnId: null, direction: null });

  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});
  const [visibleColumns, setVisibleColumns] = useState<VisibleColumnState>(() =>
    columns.reduce<VisibleColumnState>((acc, column) => {
      acc[String(column.id)] = true;
      return acc;
    }, {})
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(initialPageSize);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    const handle = setTimeout(
      () => setDebouncedSearch(searchTerm),
      SEARCH_DEBOUNCE_MS
    );
    return () => clearTimeout(handle);
  }, [searchTerm]);

  useEffect(() => {
    setPage(1);
  }, [pageSize, data.length]);

  const toggleSort = useCallback(
    (columnId: string) => {
      setSortState(prev => {
        if (prev.columnId !== columnId) {
          return { columnId, direction: "asc" };
        }

        if (prev.direction === "asc") {
          return { columnId, direction: "desc" };
        }

        if (prev.direction === "desc") {
          return { columnId: null, direction: null };
        }

        return { columnId, direction: "asc" };
      });
    },
    [setSortState]
  );

  const handleFilterChange = useCallback((filters: ColumnFilters) => {
    setColumnFilters(filters);
    setPage(1);
  }, []);

  const toggleColumnVisibility = useCallback((columnId: string) => {
    setVisibleColumns(prev => ({ ...prev, [columnId]: !prev[columnId] }));
  }, []);

  const filteredData = useMemo(() => {
    let rows = [...data];
    rows = applyColumnFilters(rows, columns, columnFilters);
    rows = applyGlobalSearch(rows, columns, visibleColumns, debouncedSearch);

    if (sortState.columnId && sortState.direction) {
      const sortColumn = columns.find(
        column => String(column.id) === sortState.columnId
      );
      if (sortColumn) {
        rows = sortByColumn(rows, sortColumn, sortState.direction);
      }
    }

    return rows;
  }, [
    columns,
    columnFilters,
    data,
    debouncedSearch,
    sortState.columnId,
    sortState.direction,
    visibleColumns,
  ]);

  useEffect(() => {
    setSelectedRowIds(prev => {
      const validIds = new Set(
        filteredData.map((row, index) => getRowIdentifier(row, index, getRowId))
      );
      return new Set(Array.from(prev).filter(id => validIds.has(id)));
    });
  }, [filteredData, getRowId]);

  const toggleSelectAll = useCallback(() => {
    const allRowIds = filteredData.map((row, index) =>
      getRowIdentifier(row, index, getRowId)
    );
    setSelectedRowIds(prev => {
      if (prev.size === allRowIds.length) {
        return new Set();
      }
      return new Set(allRowIds);
    });
  }, [filteredData, getRowId]);

  const toggleRowSelection = useCallback(
    (row: T, index: number) => {
      const id = getRowIdentifier(row, index, getRowId);
      setSelectedRowIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    },
    [getRowId]
  );

  useEffect(() => {
    if (!onSelectionChange) {
      return;
    }
    const selectedRows = filteredData.filter((row, index) =>
      selectedRowIds.has(getRowIdentifier(row, index, getRowId))
    );
    onSelectionChange(selectedRows);
  }, [filteredData, getRowId, onSelectionChange, selectedRowIds]);

  const totalPages = enablePagination
    ? Math.max(1, Math.ceil(filteredData.length / pageSize))
    : 1;

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedRows = useMemo(() => {
    if (!enablePagination) {
      return filteredData;
    }
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [enablePagination, filteredData, page, pageSize]);

  return (
    <div className="space-y-4">
      {(enableGlobalSearch ||
        enableColumnFilters ||
        enableColumnVisibility) && (
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2 flex-1">
            {enableGlobalSearch && (
              <div className="relative w-full md:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={globalSearchPlaceholder}
                  value={searchTerm}
                  onChange={event => setSearchTerm(event.target.value)}
                  className="pl-10"
                  aria-label="Global search"
                />
              </div>
            )}
            {enableColumnFilters && (
              <DataTableFilters
                columns={columns}
                activeFilters={columnFilters}
                onChange={handleFilterChange}
              />
            )}
          </div>

          {enableColumnVisibility && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full md:w-auto"
                  aria-label="Columns"
                >
                  Columns
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Toggle columns</DropdownMenuLabel>
                <DropdownMenuCheckboxItem
                  role="menuitemcheckbox"
                  checked={columns.every(
                    column => visibleColumns[String(column.id)]
                  )}
                  onCheckedChange={checked => {
                    const nextState = columns.reduce<VisibleColumnState>(
                      (acc, column) => {
                        acc[String(column.id)] = Boolean(checked);
                        return acc;
                      },
                      {}
                    );
                    setVisibleColumns(nextState);
                  }}
                >
                  All columns
                </DropdownMenuCheckboxItem>
                <DropdownMenuLabel className="text-xs text-muted-foreground">
                  Individual columns
                </DropdownMenuLabel>
                {columns.map(column => (
                  <DropdownMenuCheckboxItem
                    key={String(column.id)}
                    role="menuitemcheckbox"
                    checked={visibleColumns[String(column.id)]}
                    onCheckedChange={() =>
                      toggleColumnVisibility(String(column.id))
                    }
                  >
                    {column.header}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      )}

      <div className="border rounded-md">
        <Table>
          <TableHeader>
            <TableRow>
              {enableRowSelection && (
                <TableHead className="w-12">
                  <Checkbox
                    aria-label="Select all rows"
                    checked={
                      filteredData.length > 0 &&
                      filteredData.every((row, index) =>
                        selectedRowIds.has(
                          getRowIdentifier(row, index, getRowId)
                        )
                      )
                    }
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
              )}
              {columns.map(column => {
                const columnId = String(column.id);
                if (!visibleColumns[columnId]) return null;
                const isSorted =
                  sortState.columnId === columnId &&
                  sortState.direction !== null;
                const sortLabel =
                  sortState.direction === "asc"
                    ? " (ascending)"
                    : sortState.direction === "desc"
                      ? " (descending)"
                      : "";
                return (
                  <TableHead key={columnId}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="flex items-center gap-2 px-0"
                      onClick={() => {
                        if (!enableSorting || column.enableSorting === false)
                          return;
                        toggleSort(columnId);
                      }}
                      aria-label={`${column.header}${sortLabel}`}
                    >
                      <span>{column.header}</span>
                      {isSorted && (
                        <span className="text-xs text-muted-foreground">
                          {sortState.direction === "asc" ? "▲" : "▼"}
                        </span>
                      )}
                    </Button>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedRows.map((row, rowIndex) => (
              <TableRow key={getRowIdentifier(row, rowIndex, getRowId)}>
                {enableRowSelection && (
                  <TableCell className="w-12">
                    <Checkbox
                      aria-label="Select row"
                      checked={selectedRowIds.has(
                        getRowIdentifier(row, rowIndex, getRowId)
                      )}
                      onCheckedChange={() => toggleRowSelection(row, rowIndex)}
                    />
                  </TableCell>
                )}
                {columns.map(column => {
                  const columnId = String(column.id);
                  if (!visibleColumns[columnId]) return null;
                  return (
                    <TableCell key={`${columnId}-${rowIndex}`}>
                      {column.accessor(row)}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
            {paginatedRows.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={
                    columns.filter(column => visibleColumns[String(column.id)])
                      .length + (enableRowSelection ? 1 : 0)
                  }
                  className="text-center text-muted-foreground"
                >
                  No results found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {enablePagination && (
        <DataTablePagination
          page={page}
          pageSize={pageSize}
          total={filteredData.length}
          pageSizes={pageSizes}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      )}
    </div>
  );
}

export const DataTable = React.memo(DataTableComponent) as <T>(
  props: DataTableProps<T>
) => React.ReactElement;

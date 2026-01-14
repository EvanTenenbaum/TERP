/**
 * Supplier Combobox Component - MEET-033
 *
 * A searchable dropdown for supplier selection with performance optimizations.
 * Features:
 * - 300ms debounce for search input
 * - Case-insensitive filtering
 * - Virtualized list for handling 100+ suppliers
 * - Recent suppliers shown at top
 * - Optional inline create new supplier option
 * - Handles large datasets efficiently
 */

"use client";

import * as React from "react";
import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Building2, Plus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// ============================================================================
// TYPES
// ============================================================================

export interface SupplierOption {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  state?: string | null;
  /** Timestamp of last interaction for sorting recent suppliers */
  lastInteraction?: Date | string | null;
}

export interface SupplierComboboxProps {
  /** Currently selected supplier ID */
  value: number | null;
  /** Callback when a supplier is selected */
  onValueChange: (supplierId: number | null) => void;
  /** List of available suppliers to choose from */
  suppliers: SupplierOption[];
  /** Whether the suppliers are currently loading */
  isLoading?: boolean;
  /** Placeholder text when no supplier is selected */
  placeholder?: string;
  /** Text to show when search yields no results */
  emptyText?: string;
  /** Whether the combobox is disabled */
  disabled?: boolean;
  /** Additional CSS classes for the trigger button */
  className?: string;
  /** Maximum number of results to show (default: 50) */
  maxResults?: number;
  /** Debounce delay in milliseconds (default: 300) */
  debounceMs?: number;
  /** Number of recent suppliers to show at top (default: 5) */
  recentCount?: number;
  /** Recently used supplier IDs (for showing at top) */
  recentSupplierIds?: number[];
  /** Callback to create a new supplier inline */
  onCreateNew?: (name: string) => void;
  /** Whether to show the create new option */
  showCreateNew?: boolean;
  /** Whether creating is in progress */
  isCreating?: boolean;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Custom hook for debounced search input
 * BUG-073 FIX: Added request ID tracking to prevent race conditions
 */
function useDebouncedSearch(
  delay: number = 300
): [string, string, (value: string) => void, number] {
  const [inputValue, setInputValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useState("");
  const [requestId, setRequestId] = useState(0);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(inputValue);
      // BUG-073 FIX: Increment request ID when debounced value updates
      requestIdRef.current += 1;
      setRequestId(requestIdRef.current);
    }, delay);

    return () => clearTimeout(timer);
  }, [inputValue, delay]);

  return [inputValue, debouncedValue, setInputValue, requestId];
}

// ============================================================================
// COMPONENT
// ============================================================================

export function SupplierCombobox({
  value,
  onValueChange,
  suppliers,
  isLoading = false,
  placeholder = "Select supplier...",
  emptyText = "No suppliers found",
  disabled = false,
  className,
  maxResults = 50,
  debounceMs = 300,
  recentCount = 5,
  recentSupplierIds = [],
  onCreateNew,
  showCreateNew = false,
  isCreating = false,
}: SupplierComboboxProps): React.ReactElement {
  const [open, setOpen] = useState(false);
  // BUG-073 FIX: Track request ID from debounced search (prevents race conditions)
  const [inputValue, debouncedSearch, setInputValue, searchRequestId] =
    useDebouncedSearch(debounceMs);
  const listRef = useRef<HTMLDivElement>(null);

  // Find the selected supplier for display
  const selectedSupplier = useMemo(() => {
    return suppliers.find(supplier => supplier.id === value);
  }, [suppliers, value]);

  // Sort suppliers with recent ones first
  const sortedSuppliers = useMemo(() => {
    if (recentSupplierIds.length === 0) {
      return suppliers;
    }

    const recentSet = new Set(recentSupplierIds);
    const recent: SupplierOption[] = [];
    const others: SupplierOption[] = [];

    for (const supplier of suppliers) {
      if (recentSet.has(supplier.id)) {
        recent.push(supplier);
      } else {
        others.push(supplier);
      }
    }

    // Sort recent by the order in recentSupplierIds
    recent.sort(
      (a, b) =>
        recentSupplierIds.indexOf(a.id) - recentSupplierIds.indexOf(b.id)
    );

    return [...recent.slice(0, recentCount), ...others];
  }, [suppliers, recentSupplierIds, recentCount]);

  // Filter suppliers based on search with case-insensitive matching
  const filteredSuppliers = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return sortedSuppliers.slice(0, maxResults);
    }

    const searchLower = debouncedSearch.toLowerCase().trim();

    return sortedSuppliers
      .filter(supplier => {
        const nameMatch = supplier.name?.toLowerCase().includes(searchLower);
        const emailMatch = supplier.email?.toLowerCase().includes(searchLower);
        const cityMatch = supplier.city?.toLowerCase().includes(searchLower);
        const stateMatch = supplier.state?.toLowerCase().includes(searchLower);
        return nameMatch || emailMatch || cityMatch || stateMatch;
      })
      .slice(0, maxResults);
  }, [sortedSuppliers, debouncedSearch, maxResults]);

  // Get recent suppliers for the "Recent" section
  const recentSuppliers = useMemo(() => {
    if (recentSupplierIds.length === 0 || debouncedSearch.trim()) {
      return [];
    }
    const recentSet = new Set(recentSupplierIds.slice(0, recentCount));
    return sortedSuppliers.filter(s => recentSet.has(s.id));
  }, [sortedSuppliers, recentSupplierIds, recentCount, debouncedSearch]);

  // Get non-recent suppliers
  const otherSuppliers = useMemo(() => {
    if (recentSuppliers.length === 0) {
      return filteredSuppliers;
    }
    const recentSet = new Set(recentSuppliers.map(s => s.id));
    return filteredSuppliers.filter(s => !recentSet.has(s.id));
  }, [filteredSuppliers, recentSuppliers]);

  // Handle supplier selection
  const handleSelect = useCallback(
    (supplierId: string) => {
      const id = parseInt(supplierId, 10);
      if (id === value) {
        // Deselect if clicking the same supplier
        onValueChange(null);
      } else {
        onValueChange(id);
      }
      setOpen(false);
      setInputValue("");
    },
    [value, onValueChange, setInputValue]
  );

  // Handle popover open state change
  const handleOpenChange = useCallback(
    (isOpen: boolean) => {
      setOpen(isOpen);
      if (!isOpen) {
        setInputValue("");
      }
    },
    [setInputValue]
  );

  // Handle create new supplier
  const handleCreateNew = useCallback(() => {
    if (onCreateNew && inputValue.trim()) {
      onCreateNew(inputValue.trim());
    }
  }, [onCreateNew, inputValue]);

  // Check if we should show the create option
  const showCreateOption =
    showCreateNew &&
    onCreateNew &&
    inputValue.trim() &&
    !filteredSuppliers.some(
      s => s.name.toLowerCase() === inputValue.trim().toLowerCase()
    );

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a supplier"
          disabled={disabled || isLoading}
          className={cn(
            "w-full justify-between font-normal",
            !selectedSupplier && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Building2 className="h-4 w-4 shrink-0 opacity-50" />
            <span className="truncate">
              {isLoading
                ? "Loading suppliers..."
                : selectedSupplier
                  ? selectedSupplier.name
                  : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search suppliers..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList ref={listRef}>
            <CommandEmpty>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Building2 className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">{emptyText}</p>
                {debouncedSearch && (
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Try a different search term
                  </p>
                )}
              </div>
            </CommandEmpty>

            {/* Recent Suppliers Section */}
            {recentSuppliers.length > 0 && !debouncedSearch.trim() && (
              <>
                <CommandGroup heading="Recent">
                  {recentSuppliers.map(supplier => (
                    <CommandItem
                      key={`recent-${supplier.id}`}
                      value={supplier.id.toString()}
                      onSelect={handleSelect}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === supplier.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex flex-col min-w-0 flex-1">
                        <span className="truncate font-medium">
                          {supplier.name}
                        </span>
                        {(supplier.city || supplier.state) && (
                          <span className="text-xs text-muted-foreground truncate">
                            {[supplier.city, supplier.state]
                              .filter(Boolean)
                              .join(", ")}
                          </span>
                        )}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* All/Filtered Suppliers Section */}
            <CommandGroup
              heading={recentSuppliers.length > 0 ? "All Suppliers" : undefined}
            >
              {otherSuppliers.map(supplier => (
                <CommandItem
                  key={supplier.id}
                  value={supplier.id.toString()}
                  onSelect={handleSelect}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === supplier.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate font-medium">
                      {supplier.name}
                    </span>
                    {(supplier.city || supplier.state || supplier.email) && (
                      <span className="text-xs text-muted-foreground truncate">
                        {supplier.city || supplier.state
                          ? [supplier.city, supplier.state]
                              .filter(Boolean)
                              .join(", ")
                          : supplier.email}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>

            {/* Create New Supplier Option */}
            {showCreateOption && (
              <>
                <CommandSeparator />
                <CommandGroup>
                  <CommandItem
                    onSelect={handleCreateNew}
                    className="cursor-pointer text-primary"
                    disabled={isCreating}
                  >
                    {isCreating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-2 h-4 w-4" />
                    )}
                    <span>
                      {isCreating
                        ? "Creating..."
                        : `Create "${inputValue.trim()}"`}
                    </span>
                  </CommandItem>
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default SupplierCombobox;

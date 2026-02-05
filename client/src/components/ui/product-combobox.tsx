/**
 * Product Combobox Component
 *
 * Searchable dropdown for product selection.
 */

"use client";

import * as React from "react";
import { useState, useCallback, useMemo, useEffect } from "react";
import { Check, ChevronsUpDown, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export interface ProductOption {
  id: number;
  label: string;
  category?: string | null;
}

export interface ProductComboboxProps {
  id?: string;
  value: number | null;
  onValueChange: (productId: number | null) => void;
  products: ProductOption[];
  isLoading?: boolean;
  onSearchChange?: (query: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  className?: string;
  maxResults?: number;
  debounceMs?: number;
}

function useDebouncedSearch(
  delay: number = 300
): [string, string, (value: string) => void] {
  const [inputValue, setInputValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(inputValue), delay);
    return () => clearTimeout(timer);
  }, [inputValue, delay]);

  return [inputValue, debouncedValue, setInputValue];
}

export const ProductCombobox = React.memo(function ProductCombobox({
  id,
  value,
  onValueChange,
  products,
  isLoading = false,
  onSearchChange,
  ariaLabel,
  placeholder = "Select product...",
  emptyText = "No products found",
  disabled = false,
  className,
  maxResults = 20,
  debounceMs = 300,
}: ProductComboboxProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const [inputValue, debouncedSearch, setInputValue] =
    useDebouncedSearch(debounceMs);

  const selectedProduct = useMemo(
    () => products.find(product => product.id === value) ?? null,
    [products, value]
  );

  useEffect(() => {
    if (onSearchChange) {
      onSearchChange(debouncedSearch);
    }
  }, [debouncedSearch, onSearchChange]);

  const filteredProducts = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return products.slice(0, maxResults);
    }
    const searchLower = debouncedSearch.toLowerCase().trim();
    return products
      .filter(product => {
        const labelMatch = product.label.toLowerCase().includes(searchLower);
        const categoryMatch = product.category
          ?.toLowerCase()
          .includes(searchLower);
        return labelMatch || Boolean(categoryMatch);
      })
      .slice(0, maxResults);
  }, [products, debouncedSearch, maxResults]);

  const handleSelect = useCallback(
    (productId: number) => {
      onValueChange(productId);
      setOpen(false);
    },
    [onValueChange]
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          id={id}
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label={ariaLabel}
          disabled={disabled}
          className={cn("justify-between", className)}
        >
          <span className="flex items-center gap-2 truncate">
            <Package className="h-4 w-4 text-muted-foreground" />
            {selectedProduct?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput
            placeholder="Search products..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            {isLoading ? (
              <CommandEmpty>Loading products...</CommandEmpty>
            ) : (
              <CommandEmpty>{emptyText}</CommandEmpty>
            )}
            <CommandGroup>
              {filteredProducts.map(product => (
                <CommandItem
                  key={product.id}
                  value={product.label}
                  onSelect={() => handleSelect(product.id)}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === product.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <span className="flex flex-col">
                    <span>{product.label}</span>
                    {product.category && (
                      <span className="text-xs text-muted-foreground">
                        {product.category}
                      </span>
                    )}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
});

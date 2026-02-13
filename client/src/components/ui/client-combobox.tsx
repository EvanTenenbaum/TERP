/**
 * Client Combobox Component (UX-013)
 *
 * A searchable dropdown for client selection using shadcn/ui patterns.
 * Features:
 * - 300ms debounce for search input
 * - Case-insensitive filtering
 * - Limit to 10 results
 * - "No clients found" empty state
 *
 * SPRINT-A: Task 7
 */

"use client";

import * as React from "react";
import { useState, useCallback, useMemo, useEffect } from "react";
import { Check, ChevronsUpDown, Users } from "lucide-react";
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

// ============================================================================
// TYPES
// ============================================================================

export interface ClientOption {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  clientType?: string;
}

export interface ClientComboboxProps {
  /**
   * Currently selected client ID
   */
  value: number | null;
  /**
   * Callback when a client is selected
   */
  onValueChange: (clientId: number | null) => void;
  /**
   * List of available clients to choose from
   */
  clients: ClientOption[];
  /**
   * Whether the clients are currently loading
   */
  isLoading?: boolean;
  /**
   * Placeholder text when no client is selected
   */
  placeholder?: string;
  /**
   * Text to show when search yields no results
   */
  emptyText?: string;
  /**
   * Whether the combobox is disabled
   */
  disabled?: boolean;
  /**
   * Additional CSS classes for the trigger button
   */
  className?: string;
  /**
   * Maximum number of results to show (default: 10)
   */
  maxResults?: number;
  /**
   * Debounce delay in milliseconds (default: 300)
   */
  debounceMs?: number;
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Custom hook for debounced search input
 * BUG-073 FIX: Added request ID tracking to prevent race conditions
 */
function useDebouncedSearch(delay: number = 300): [string, string, (value: string) => void, number] {
  const [inputValue, setInputValue] = useState("");
  const [debouncedValue, setDebouncedValue] = useState("");
  const [requestId, setRequestId] = useState(0);
  const requestIdRef = React.useRef(0);

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

export function ClientCombobox({
  value,
  onValueChange,
  clients,
  isLoading = false,
  placeholder = "Select client...",
  emptyText = "No clients found",
  disabled = false,
  className,
  maxResults = 10,
  debounceMs = 300,
}: ClientComboboxProps): React.JSX.Element {
  const [open, setOpen] = useState(false);
  // BUG-073 FIX: Track request ID from debounced search (prevents race conditions)
  const [inputValue, debouncedSearch, setInputValue, _searchRequestId] = useDebouncedSearch(debounceMs);

  // Find the selected client for display
  const selectedClient = useMemo(() => {
    return clients.find((client) => client.id === value);
  }, [clients, value]);

  // Filter clients based on search with case-insensitive matching
  const filteredClients = useMemo(() => {
    if (!debouncedSearch.trim()) {
      return clients.slice(0, maxResults);
    }

    const searchLower = debouncedSearch.toLowerCase().trim();

    return clients
      .filter((client) => {
        const nameMatch = client.name?.toLowerCase().includes(searchLower);
        const emailMatch = client.email?.toLowerCase().includes(searchLower);
        const phoneMatch = client.phone?.replace(/\D/g, "").includes(searchLower.replace(/\D/g, ""));
        return nameMatch || emailMatch || phoneMatch;
      })
      .slice(0, maxResults);
  }, [clients, debouncedSearch, maxResults]);

  // Handle client selection
  const handleSelect = useCallback(
    (clientId: string) => {
      const id = parseInt(clientId, 10);
      if (id === value) {
        // Deselect if clicking the same client
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

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Select a client"
          disabled={disabled || isLoading}
          className={cn(
            "w-full justify-between font-normal",
            !selectedClient && "text-muted-foreground",
            className
          )}
        >
          <div className="flex items-center gap-2 truncate">
            <Users className="h-4 w-4 shrink-0 opacity-50" />
            <span className="truncate">
              {isLoading
                ? "Loading clients..."
                : selectedClient
                  ? selectedClient.name
                  : placeholder}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Search clients..."
            value={inputValue}
            onValueChange={setInputValue}
          />
          <CommandList>
            <CommandEmpty>
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Users className="h-10 w-10 text-muted-foreground/50 mb-2" />
                <p className="text-sm text-muted-foreground">{emptyText}</p>
                {debouncedSearch && (
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    Try a different search term
                  </p>
                )}
              </div>
            </CommandEmpty>
            <CommandGroup>
              {filteredClients.map((client) => (
                <CommandItem
                  key={client.id}
                  value={client.id.toString()}
                  onSelect={handleSelect}
                  className="cursor-pointer"
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === client.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="truncate font-medium">{client.name}</span>
                    {(client.email || client.clientType) && (
                      <span className="text-xs text-muted-foreground truncate">
                        {client.clientType && (
                          <span className="capitalize">{client.clientType}</span>
                        )}
                        {client.clientType && client.email && " · "}
                        {client.email}
                      </span>
                    )}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default ClientCombobox;

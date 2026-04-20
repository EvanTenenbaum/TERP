import { useMemo, useState, useEffect } from "react";
import { useLocation, useSearch } from "wouter";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
} from "@/components/ui/command";
import {
  FileText,
  HelpCircle,
  LayoutDashboard,
  Loader2,
  Layers,
  Package,
  Plus,
  History,
  ReceiptText,
  Truck,
  Users,
} from "lucide-react";
import { buildNavigationAccessModel } from "@/config/navigation";
import { useFeatureFlags } from "@/hooks/useFeatureFlag";
import { useRecentPages } from "@/hooks/useRecentPages";
import {
  buildOperationsWorkspacePath,
  buildProcurementWorkspacePath,
  buildSalesWorkspacePath,
} from "@/lib/workspaceRoutes";
import { trpc } from "@/lib/trpc";

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const [location, setLocation] = useLocation();
  const search = useSearch();
  const { flags, isLoading } = useFeatureFlags();
  const { recentPages } = useRecentPages();
  const [inputValue, setInputValue] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");

  // Debounce the search query — 300ms after user stops typing
  useEffect(() => {
    if (inputValue.length <= 2) {
      setDebouncedQuery("");
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setInputValue("");
      setDebouncedQuery("");
    }
  }, [open]);

  const { data: searchResults, isLoading: isSearching } =
    trpc.search.global.useQuery(
      { query: debouncedQuery },
      { enabled: debouncedQuery.length > 2 }
    );

  const navigationAccessModel = useMemo(
    () =>
      buildNavigationAccessModel({
        flags,
        flagsLoading: isLoading,
        maxQuickLinks: 4,
      }),
    [flags, isLoading]
  );

  const navigationCommands = useMemo(() => {
    const commands: Array<{
      id: string;
      label: string;
      path: string;
      icon: typeof LayoutDashboard;
      shortcut?: string;
    }> = [
      {
        id: "dashboard",
        label: "Go to Dashboard",
        path: "/",
        icon: LayoutDashboard,
        shortcut: "D",
      },
    ];

    const seenPaths = new Set(commands.map(command => command.path));

    for (const item of navigationAccessModel.commandNavigationItems) {
      if (seenPaths.has(item.path)) {
        continue;
      }
      seenPaths.add(item.path);
      commands.push({
        id: `nav:${item.path}`,
        label: item.name,
        path: item.path,
        icon: item.icon,
      });
    }

    return commands;
  }, [navigationAccessModel.commandNavigationItems]);

  const actionCommands = [
    {
      id: "new-sale",
      label: "New Sales Order",
      icon: Plus,
      shortcut: "N",
      action: () => {
        setLocation(buildSalesWorkspacePath("create-order"));
        onOpenChange(false);
      },
    },
    {
      id: "record-receipt",
      label: "Record Receiving",
      icon: ReceiptText,
      shortcut: "R",
      action: () => {
        setLocation(buildOperationsWorkspacePath("receiving"));
        onOpenChange(false);
      },
    },
    {
      // TER-1060: Expected deliveries today quick-action
      id: "expected-deliveries-today",
      label: "Expected deliveries today",
      icon: Truck,
      action: () => {
        setLocation(
          buildProcurementWorkspacePath(undefined, { expectedToday: "1" })
        );
        onOpenChange(false);
      },
    },
    {
      id: "sales-catalogue",
      label: "Sales Catalogue",
      icon: Layers,
      action: () => {
        setLocation(buildSalesWorkspacePath("sales-sheets"));
        onOpenChange(false);
      },
    },
    {
      id: "help",
      label: "Help & Documentation",
      icon: HelpCircle,
      shortcut: "?",
      action: () => {
        setLocation("/help");
        onOpenChange(false);
      },
    },
  ];

  const handleNavigate = (url: string) => {
    setLocation(url);
    onOpenChange(false);
  };

  const currentPath = `${location}${search || ""}`;
  const recentCommands = useMemo(
    () => recentPages.filter(page => page.path !== currentPath).slice(0, 5),
    [currentPath, recentPages]
  );

  const isActiveSearch = debouncedQuery.length > 2;
  const hasQuotes = (searchResults?.quotes?.length ?? 0) > 0;
  const hasOrders = (searchResults?.orders?.length ?? 0) > 0;
  const hasCustomers = (searchResults?.customers?.length ?? 0) > 0;
  const hasProducts = (searchResults?.products?.length ?? 0) > 0;
  const hasSearchResults =
    hasQuotes || hasOrders || hasCustomers || hasProducts;

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      commandProps={{ shouldFilter: !isActiveSearch }}
    >
      <CommandInput
        autoFocus
        placeholder="Type a command or search..."
        value={inputValue}
        onValueChange={setInputValue}
      />
      <CommandList>
        {isActiveSearch ? (
          <>
            {isSearching && (
              <CommandGroup heading="Search Results">
                <CommandItem disabled value="search-status-loading">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  <span>Searching...</span>
                </CommandItem>
              </CommandGroup>
            )}

            {!isSearching && hasQuotes && (
              <CommandGroup heading="Quotes">
                {(searchResults?.quotes ?? []).map(quote => (
                  <CommandItem
                    key={`quote-${quote.id}`}
                    value={`quote-${quote.id}`}
                    onSelect={() => handleNavigate(quote.url)}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    <span>{quote.title}</span>
                    {quote.description && (
                      <span className="ml-2 text-xs text-muted-foreground truncate">
                        {quote.description}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!isSearching && hasOrders && (
              <CommandGroup heading="Orders">
                {(searchResults?.orders ?? []).map(order => (
                  <CommandItem
                    key={`order-${order.id}`}
                    value={`order-${order.id}`}
                    onSelect={() => handleNavigate(order.url)}
                  >
                    <ReceiptText className="mr-2 h-4 w-4" />
                    <span>{order.title}</span>
                    {order.description && (
                      <span className="ml-2 text-xs text-muted-foreground truncate">
                        {order.description}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!isSearching && hasCustomers && (
              <CommandGroup heading="Relationships">
                {(searchResults?.customers ?? []).map(customer => (
                  <CommandItem
                    key={`customer-${customer.id}`}
                    value={`customer-${customer.id}`}
                    onSelect={() => handleNavigate(customer.url)}
                  >
                    <Users className="mr-2 h-4 w-4" />
                    <span>{customer.title}</span>
                    {customer.description && (
                      <span className="ml-2 text-xs text-muted-foreground truncate">
                        {customer.description}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!isSearching && hasProducts && (
              <CommandGroup heading="Products & Batches">
                {(searchResults?.products ?? []).map(product => (
                  <CommandItem
                    key={`product-${product.type}-${product.id}`}
                    value={`product-${product.type}-${product.id}`}
                    onSelect={() => handleNavigate(product.url)}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    <span>{product.title}</span>
                    {product.description && (
                      <span className="ml-2 text-xs text-muted-foreground truncate">
                        {product.description}
                      </span>
                    )}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!isSearching && !hasSearchResults && (
              <div className="py-6 text-center text-sm text-muted-foreground">
                No results found.
              </div>
            )}
          </>
        ) : (
          <>
            <CommandEmpty>No results found.</CommandEmpty>

            {recentCommands.length > 0 && (
              <CommandGroup heading="Recently Opened">
                {recentCommands.map(page => (
                  <CommandItem
                    key={`recent:${page.path}`}
                    value={`${page.label} recent ${page.path}`}
                    onSelect={() => handleNavigate(page.path)}
                  >
                    <History className="mr-2 h-4 w-4" />
                    <span>{page.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            <CommandGroup heading="Navigation">
              {navigationCommands.map(item => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} navigation`}
                    onSelect={() => {
                      setLocation(item.path);
                      onOpenChange(false);
                    }}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <CommandShortcut>{item.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>

            <CommandGroup heading="Actions">
              {actionCommands.map(item => {
                const Icon = item.icon;
                return (
                  <CommandItem
                    key={item.id}
                    value={`${item.label} action`}
                    onSelect={item.action}
                  >
                    <Icon className="mr-2 h-4 w-4" />
                    <span>{item.label}</span>
                    {item.shortcut && (
                      <CommandShortcut>{item.shortcut}</CommandShortcut>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}

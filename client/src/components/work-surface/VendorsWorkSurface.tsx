/**
 * VendorsWorkSurface - Work Surface implementation for Vendors (Suppliers)
 * WS-VEND-001: Aligns Vendors page with Work Surface patterns
 *
 * Features:
 * - Keyboard contract (Cmd+K search, arrow navigation, Enter to open)
 * - Save state indicator
 * - Inspector panel for vendor details (read-only initially)
 * - Summary metrics bar (Total Vendors, Active, Inventory Value)
 * - Uses clients with isSeller=true (party model pattern)
 *
 * @see ATOMIC_UX_STRATEGY.md for the complete Work Surface specification
 */

import React, { useState, useMemo, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Work Surface Hooks
import { useWorkSurfaceKeyboard } from "@/hooks/work-surface/useWorkSurfaceKeyboard";
import { useSaveState } from "@/hooks/work-surface/useSaveState";
import {
  InspectorPanel,
  InspectorSection,
  InspectorField,
  useInspectorPanel,
} from "./InspectorPanel";

// Icons
import {
  Search,
  Plus,
  Store,
  ChevronRight,
  ChevronLeft,
  Loader2,
  RefreshCw,
  Mail,
  Phone,
  ExternalLink,
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface Vendor {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  teriCode?: string | null;
  isBuyer?: boolean | null;
  isSeller?: boolean | null;
  isBrand?: boolean | null;
  isReferee?: boolean | null;
  isContractor?: boolean | null;
  creditLimit?: string | number | null;
  currentDebt?: string | number | null;
  lifetimeValue?: string | number | null;
  orderCount?: number | null;
  lastOrderDate?: Date | string | null;
  createdAt?: Date | string | null;
  notes?: string | null;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const VENDOR_STATUS_FILTERS = [
  { value: "all", label: "All Vendors" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

// ============================================================================
// HELPERS
// ============================================================================

const formatCurrency = (value: string | number | null | undefined): string => {
  if (value === null || value === undefined) return "$0.00";
  const num = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(num || 0);
};

const formatDate = (dateValue: Date | string | null | undefined): string => {
  if (!dateValue) return "-";
  try {
    const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
    return date.toLocaleDateString();
  } catch {
    return "-";
  }
};

// ============================================================================
// VENDOR TYPE BADGES
// ============================================================================

function VendorTypeBadges({ vendor }: { vendor: Vendor }) {
  const badges: { label: string; className: string }[] = [];

  // Always show Supplier badge for vendors
  badges.push({ label: "Supplier", className: "bg-green-100 text-green-800" });

  if (vendor.isBuyer)
    badges.push({ label: "Buyer", className: "bg-blue-100 text-blue-800" });
  if (vendor.isBrand)
    badges.push({ label: "Brand", className: "bg-purple-100 text-purple-800" });

  return (
    <div className="flex gap-1 flex-wrap">
      {badges.map(badge => (
        <Badge
          key={badge.label}
          variant="outline"
          className={cn("text-xs", badge.className)}
        >
          {badge.label}
        </Badge>
      ))}
    </div>
  );
}

// ============================================================================
// VENDOR INSPECTOR CONTENT
// ============================================================================

interface VendorInspectorProps {
  vendor: Vendor | null;
  onNavigate: (vendorId: number) => void;
  onViewPurchaseOrders: (vendorId: number) => void;
}

function VendorInspectorContent({
  vendor,
  onNavigate,
  onViewPurchaseOrders,
}: VendorInspectorProps) {
  if (!vendor) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Store className="h-12 w-12 mb-4 opacity-50" />
        <p>Select a vendor to view details</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <InspectorSection title="Contact Information" defaultOpen>
        <InspectorField label="Name">
          <p className="font-semibold text-lg">{vendor.name}</p>
        </InspectorField>

        {vendor.teriCode && (
          <InspectorField label="TERI Code">
            <Badge variant="outline" className="font-mono">
              {vendor.teriCode}
            </Badge>
          </InspectorField>
        )}

        {vendor.email && (
          <InspectorField label="Email">
            <a
              href={`mailto:${vendor.email}`}
              className="flex items-center gap-2 text-blue-600 hover:underline"
            >
              <Mail className="h-4 w-4" />
              {vendor.email}
            </a>
          </InspectorField>
        )}

        {vendor.phone && (
          <InspectorField label="Phone">
            <a
              href={`tel:${vendor.phone}`}
              className="flex items-center gap-2 text-blue-600 hover:underline"
            >
              <Phone className="h-4 w-4" />
              {vendor.phone}
            </a>
          </InspectorField>
        )}

        {vendor.address && (
          <InspectorField label="Address">
            <p className="text-sm text-muted-foreground">{vendor.address}</p>
          </InspectorField>
        )}
      </InspectorSection>

      <InspectorSection title="Vendor Types">
        <VendorTypeBadges vendor={vendor} />
      </InspectorSection>

      <InspectorSection title="Business Summary" defaultOpen>
        <div className="grid grid-cols-2 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">All Time Value</p>
            <p className="font-semibold text-green-600">
              {formatCurrency(vendor.lifetimeValue)}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Orders</p>
            <p className="font-semibold">{vendor.orderCount || 0}</p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Credit Limit</p>
            <p className="font-semibold">
              {formatCurrency(vendor.creditLimit)}
            </p>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-xs text-muted-foreground">Current Balance</p>
            <p
              className={cn(
                "font-semibold",
                parseFloat(String(vendor.currentDebt || 0)) > 0 &&
                  "text-red-600"
              )}
            >
              {formatCurrency(vendor.currentDebt)}
            </p>
          </div>
        </div>

        {vendor.lastOrderDate && (
          <InspectorField label="Last Order">
            <p className="text-sm text-muted-foreground">
              {formatDate(vendor.lastOrderDate)}
            </p>
          </InspectorField>
        )}

        {vendor.createdAt && (
          <InspectorField label="Vendor Since">
            <p className="text-sm text-muted-foreground">
              {formatDate(vendor.createdAt)}
            </p>
          </InspectorField>
        )}
      </InspectorSection>

      {vendor.notes && (
        <InspectorSection title="Notes">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {vendor.notes}
          </p>
        </InspectorSection>
      )}

      <InspectorSection title="Quick Actions" defaultOpen>
        <div className="space-y-2">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
              if (vendor?.id !== null && vendor?.id !== undefined) {
                onNavigate(vendor.id);
              }
            }}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            View Full Profile
          </Button>
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start"
            onClick={e => {
              e.stopPropagation();
              e.preventDefault();
              if (vendor?.id !== null && vendor?.id !== undefined) {
                onViewPurchaseOrders(vendor.id);
              }
            }}
          >
            <Package className="h-4 w-4 mr-2" />
            View Purchase Orders
          </Button>
        </div>
      </InspectorSection>
    </div>
  );
}

// ============================================================================
// MAIN WORK SURFACE COMPONENT
// ============================================================================

export function VendorsWorkSurface() {
  const [, setLocation] = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const limit = 50;

  // Work Surface hooks
  const { SaveStateIndicator } = useSaveState();
  const inspector = useInspectorPanel();

  // Data queries - Use clients with isSeller=true (party model)
  const {
    data: vendorsData,
    isLoading,
    error,
    refetch,
  } = trpc.clients.list.useQuery({
    limit,
    offset: page * limit,
    search: search || undefined,
    clientTypes: ["seller"], // This filters for suppliers/vendors
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vendorsResponse = vendorsData as any;
  const vendors: Vendor[] = useMemo(
    () =>
      Array.isArray(vendorsResponse)
        ? vendorsResponse
        : (vendorsResponse?.items ?? []),
    [vendorsResponse]
  );

  const { data: totalCount } = trpc.clients.count.useQuery({
    search: search || undefined,
    clientTypes: ["seller"],
  });

  const totalPages = Math.ceil((totalCount || 0) / limit);

  // Selected vendor
  const selectedVendor = useMemo(
    () => vendors.find(v => v.id === selectedVendorId) || null,
    [vendors, selectedVendorId]
  );

  // Sort vendors
  const displayVendors = useMemo(() => {
    if (!vendors || vendors.length === 0) return [];
    if (!sortColumn) return vendors;

    return [...vendors].sort((a, b) => {
      const aVal = a[sortColumn as keyof Vendor];
      const bVal = b[sortColumn as keyof Vendor];

      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      const aNum =
        typeof aVal === "string" && !isNaN(parseFloat(aVal))
          ? parseFloat(aVal)
          : aVal;
      const bNum =
        typeof bVal === "string" && !isNaN(parseFloat(bVal))
          ? parseFloat(bVal)
          : bVal;

      if (aNum < bNum) return sortDirection === "asc" ? -1 : 1;
      if (aNum > bNum) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [vendors, sortColumn, sortDirection]);

  // Statistics
  const stats = useMemo(() => {
    return {
      total: totalCount || 0,
      active: vendors.length,
      totalValue: vendors.reduce(
        (sum, v) => sum + parseFloat(String(v.lifetimeValue || 0)),
        0
      ),
    };
  }, [vendors, totalCount]);

  // Keyboard contract
  const { keyboardProps } = useWorkSurfaceKeyboard({
    gridMode: false,
    isInspectorOpen: inspector.isOpen,
    onInspectorClose: inspector.close,
    customHandlers: {
      "cmd+k": (e: React.KeyboardEvent) => {
        e.preventDefault();
        searchInputRef.current?.focus();
      },
      "ctrl+k": (e: React.KeyboardEvent) => {
        e.preventDefault();
        searchInputRef.current?.focus();
      },
      "cmd+n": (e: React.KeyboardEvent) => {
        e.preventDefault();
        handleAddVendor();
      },
      "ctrl+n": (e: React.KeyboardEvent) => {
        e.preventDefault();
        handleAddVendor();
      },
      arrowdown: (e: React.KeyboardEvent) => {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(displayVendors.length - 1, prev + 1));
        const vendor =
          displayVendors[
            Math.min(displayVendors.length - 1, selectedIndex + 1)
          ];
        if (vendor) setSelectedVendorId(vendor.id);
      },
      arrowup: (e: React.KeyboardEvent) => {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(0, prev - 1));
        const vendor = displayVendors[Math.max(0, selectedIndex - 1)];
        if (vendor) setSelectedVendorId(vendor.id);
      },
      enter: (e: React.KeyboardEvent) => {
        if (selectedVendor) {
          e.preventDefault();
          inspector.open();
        }
      },
    },
    onCancel: () => {
      if (inspector.isOpen) {
        inspector.close();
      }
    },
  });

  // Handlers
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(prev => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortColumn(column);
      setSortDirection("desc");
    }
  };

  const handleAddVendor = useCallback(() => {
    // TER-290: Navigate to client creation with seller type pre-selected
    setLocation("/clients/new?type=seller");
  }, [setLocation]);

  const handleNavigate = useCallback(
    (vendorId: number) => {
      setLocation(`/clients/${vendorId}`);
    },
    [setLocation]
  );

  const handleViewPurchaseOrders = useCallback(
    (vendorId: number) => {
      setLocation(`/purchase-orders?supplierClientId=${vendorId}`);
    },
    [setLocation]
  );

  const SortIcon = ({ column }: { column: string }) => {
    if (sortColumn !== column)
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 ml-1" />
    ) : (
      <ArrowDown className="h-3 w-3 ml-1" />
    );
  };

  // Render
  return (
    <div {...keyboardProps} className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Store className="h-6 w-6" />
            Vendors
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage suppliers and vendor relationships
          </p>
        </div>
        <div className="flex items-center gap-4">
          {SaveStateIndicator}
          <div className="text-sm text-muted-foreground flex gap-4">
            <span>
              Total:{" "}
              <span className="font-semibold text-foreground">
                {stats.total}
              </span>
            </span>
            <span>
              Active:{" "}
              <span className="font-semibold text-foreground">
                {stats.active}
              </span>
            </span>
            <span>
              Value:{" "}
              <span className="font-semibold text-foreground">
                {formatCurrency(stats.totalValue)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between px-6 py-3 border-b bg-muted/30">
        <div className="flex gap-4 items-center flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              ref={searchInputRef}
              placeholder="Search vendors... (Cmd+K)"
              value={search}
              onChange={e => {
                setSearch(e.target.value);
                setPage(0);
              }}
              className="pl-10"
            />
          </div>
          <Select
            value={statusFilter}
            onValueChange={v => {
              setStatusFilter(v);
              setPage(0);
            }}
          >
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              {VENDOR_STATUS_FILTERS.map(filter => (
                <SelectItem key={filter.value} value={filter.value}>
                  {filter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <Button onClick={handleAddVendor}>
          <Plus className="h-4 w-4 mr-2" />
          Add Vendor
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Table Area */}
        <div
          className={cn(
            "flex-1 overflow-auto transition-all duration-200",
            inspector.isOpen && "mr-96"
          )}
        >
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Store className="h-12 w-12 text-destructive mx-auto mb-4" />
                <p className="font-medium">Failed to load vendors</p>
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="mt-4"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry
                </Button>
              </div>
            </div>
          ) : displayVendors.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Store className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="font-medium">No vendors found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Add your first vendor"}
                </p>
              </div>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead
                      className="cursor-pointer"
                      onClick={() => handleSort("name")}
                    >
                      <span className="flex items-center">
                        Name <SortIcon column="name" />
                      </span>
                    </TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead
                      className="cursor-pointer text-right"
                      onClick={() => handleSort("lifetimeValue")}
                    >
                      <span className="flex items-center justify-end">
                        Value <SortIcon column="lifetimeValue" />
                      </span>
                    </TableHead>
                    <TableHead
                      className="cursor-pointer text-right"
                      onClick={() => handleSort("orderCount")}
                    >
                      <span className="flex items-center justify-end">
                        Orders <SortIcon column="orderCount" />
                      </span>
                    </TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {displayVendors.map((vendor, index) => (
                    <TableRow
                      key={vendor.id}
                      className={cn(
                        "cursor-pointer hover:bg-muted/50",
                        selectedVendorId === vendor.id && "bg-muted",
                        selectedIndex === index &&
                          "ring-1 ring-inset ring-primary"
                      )}
                      onClick={() => {
                        setSelectedVendorId(vendor.id);
                        setSelectedIndex(index);
                        inspector.open();
                      }}
                    >
                      <TableCell className="font-medium">
                        <div>
                          <p>{vendor.name}</p>
                          {vendor.teriCode && (
                            <p className="text-xs text-muted-foreground font-mono">
                              {vendor.teriCode}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <VendorTypeBadges vendor={vendor} />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {vendor.email || vendor.phone || "-"}
                      </TableCell>
                      <TableCell className="text-right font-medium text-green-600">
                        {formatCurrency(vendor.lifetimeValue)}
                      </TableCell>
                      <TableCell className="text-right">
                        {vendor.orderCount || 0}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-6 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {page + 1} of {totalPages} ({totalCount} total)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(p => Math.max(0, p - 1))}
                      disabled={page === 0}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        setPage(p => Math.min(totalPages - 1, p + 1))
                      }
                      disabled={page >= totalPages - 1}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Inspector Panel */}
        <InspectorPanel
          isOpen={inspector.isOpen}
          onClose={inspector.close}
          title={selectedVendor?.name || "Vendor Details"}
          subtitle={selectedVendor?.teriCode ?? undefined}
        >
          <VendorInspectorContent
            vendor={selectedVendor}
            onNavigate={handleNavigate}
            onViewPurchaseOrders={handleViewPurchaseOrders}
          />
        </InspectorPanel>
      </div>
    </div>
  );
}

export default VendorsWorkSurface;

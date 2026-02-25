import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2, Package } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { DataCardSection } from "@/components/data-cards";
import { FilterSortSearchPanel } from "@/components/ui/filter-sort-search-panel";
import { toast } from "sonner";
import { useLocation } from "wouter";
// UX-012: Import centralized date formatting utility
import { formatDate } from "@/lib/utils";

// FE-QA-009: Form state type
interface SupplyFormState {
  vendorId: string;
  strain: string;
  productName: string;
  category: string;
  subcategory: string;
  grade: string;
  quantityAvailable: string;
  unitPrice: string;
  availableUntil: string;
  notes: string;
}

interface VendorSupplyItem {
  id: number;
  status?: string | null;
  strain?: string | null;
  productName?: string | null;
  category?: string | null;
  subcategory?: string | null;
  grade?: string | null;
  vendorId?: number | null;
  vendorName?: string | null;
  quantityAvailable?: string | null;
  unitPrice?: string | null;
  availableUntil?: string | null;
  createdAt?: string | null;
  buyerCount?: number | null;
}

const initialFormState: SupplyFormState = {
  vendorId: "",
  strain: "",
  productName: "",
  category: "",
  subcategory: "",
  grade: "",
  quantityAvailable: "",
  unitPrice: "",
  availableUntil: "",
  notes: "",
};

type VendorSupplySortField =
  | "createdAt"
  | "quantityAvailable"
  | "unitPrice"
  | "buyerCount"
  | "strain";

const SUPPLY_STATUS_OPTIONS = [
  { value: "AVAILABLE", label: "Available" },
  { value: "RESERVED", label: "Reserved" },
  { value: "SOLD", label: "Sold" },
  { value: "PURCHASED", label: "Purchased" },
  { value: "EXPIRED", label: "Expired" },
];

const SUPPLY_SORT_OPTIONS = [
  { value: "createdAt", label: "Added Date" },
  { value: "strain", label: "Strain / Name" },
  { value: "quantityAvailable", label: "Quantity" },
  { value: "unitPrice", label: "Unit Price" },
  { value: "buyerCount", label: "Matching Buyers" },
];

/**
 * Vendor Supply Page
 * Central page for managing vendor supply items
 */

interface VendorSupplyPageProps {
  embedded?: boolean;
}

export default function VendorSupplyPage({
  embedded = false,
}: VendorSupplyPageProps) {
  const [, setLocation] = useLocation();

  // Initialize filters from URL parameters
  const getInitialStatusFilter = () => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get("status");
    if (
      status &&
      ["AVAILABLE", "RESERVED", "SOLD", "PURCHASED", "EXPIRED"].includes(status)
    ) {
      return status;
    }
    return "ALL";
  };

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>(
    getInitialStatusFilter
  );
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [sortField, setSortField] =
    useState<VendorSupplySortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [formState, setFormState] = useState<SupplyFormState>(initialFormState);

  // FE-BUG-001: Use getAllWithMatches to get buyerCount for display
  const {
    data: supplyData,
    isLoading,
    refetch,
  } = trpc.vendorSupply.getAllWithMatches.useQuery({});

  // Fetch vendors (clients with isSeller=true) for dropdown
  const { data: vendorsData, isLoading: vendorsLoading } =
    trpc.clients.list.useQuery({
      clientTypes: ["seller"],
      limit: 200,
    });

  // FE-QA-009: Create mutation
  const createMutation = trpc.vendorSupply.create.useMutation({
    onSuccess: () => {
      toast.success("Vendor supply item created successfully");
      setCreateDialogOpen(false);
      setFormState(initialFormState);
      refetch();
    },
    onError: error => {
      toast.error(error.message || "Failed to create vendor supply item");
    },
  });

  // VAL-001/VAL-002: Get today's date for validation
  const todayDate = useMemo(() => new Date().toISOString().split("T")[0], []);

  // FE-QA-009: Handle form submission with enhanced validation
  const handleSubmit = () => {
    if (!formState.vendorId) {
      toast.error("Please select a vendor");
      return;
    }
    if (!formState.quantityAvailable) {
      toast.error("Please enter quantity available");
      return;
    }
    // VAL-001: Validate quantity is positive
    const qty = parseFloat(formState.quantityAvailable);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Quantity must be a positive number");
      return;
    }
    // VAL-001: Validate price is non-negative if provided
    if (formState.unitPrice) {
      const price = parseFloat(formState.unitPrice);
      if (isNaN(price) || price < 0) {
        toast.error("Price must be a non-negative number");
        return;
      }
    }
    // VAL-002: Validate date is not in the past if provided
    if (formState.availableUntil && formState.availableUntil < todayDate) {
      toast.error("Available until date cannot be in the past");
      return;
    }

    // FE-QA-FIX: Remove createdBy - backend will set from ctx.user.id
    createMutation.mutate({
      vendorId: parseInt(formState.vendorId),
      strain: formState.strain || undefined,
      productName: formState.productName || undefined,
      category: formState.category || undefined,
      subcategory: formState.subcategory || undefined,
      grade: formState.grade || undefined,
      quantityAvailable: formState.quantityAvailable,
      unitPrice: formState.unitPrice || undefined,
      availableUntil: formState.availableUntil || undefined,
      notes: formState.notes || undefined,
    });
  };

  // FE-QA-009: Handle finding matching clients
  const handleFindMatchingClients = (supplyId: number) => {
    setLocation(`/matchmaking?supplyId=${supplyId}`);
  };

  const supplyItems = useMemo<VendorSupplyItem[]>(
    () => (supplyData?.data as VendorSupplyItem[]) ?? [],
    [supplyData]
  );

  const categoryOptions = useMemo(() => {
    const categories = Array.from(
      new Set(
        supplyItems
          .map(item => item.category)
          .filter((category): category is string => Boolean(category))
      )
    ).sort((a, b) => a.localeCompare(b));

    return categories.map(category => ({
      value: category,
      label: category,
    }));
  }, [supplyItems]);

  // Filter and sort supply items for list rendering
  const filteredItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const filtered = supplyItems.filter(item => {
      const matchesSearch =
        !normalizedQuery ||
        item.strain?.toLowerCase().includes(normalizedQuery) ||
        item.productName?.toLowerCase().includes(normalizedQuery) ||
        item.category?.toLowerCase().includes(normalizedQuery) ||
        item.vendorName?.toLowerCase().includes(normalizedQuery);

      const matchesStatus =
        statusFilter === "ALL" ? true : item.status === statusFilter;
      const matchesCategory =
        categoryFilter === "ALL" ? true : item.category === categoryFilter;

      return matchesSearch && matchesStatus && matchesCategory;
    });

    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    return [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortField === "createdAt") {
        comparison =
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime();
      } else if (sortField === "strain") {
        const first = (a.strain || a.productName || "").toLowerCase();
        const second = (b.strain || b.productName || "").toLowerCase();
        comparison = first.localeCompare(second);
      } else if (sortField === "quantityAvailable") {
        comparison =
          parseFloat(a.quantityAvailable || "0") -
          parseFloat(b.quantityAvailable || "0");
      } else if (sortField === "unitPrice") {
        comparison =
          parseFloat(a.unitPrice || "0") - parseFloat(b.unitPrice || "0");
      } else if (sortField === "buyerCount") {
        comparison = (a.buyerCount || 0) - (b.buyerCount || 0);
      }

      if (comparison === 0) {
        comparison =
          new Date(a.createdAt || 0).getTime() -
          new Date(b.createdAt || 0).getTime();
      }

      return comparison * directionMultiplier;
    });
  }, [
    categoryFilter,
    searchQuery,
    sortDirection,
    sortField,
    statusFilter,
    supplyItems,
  ]);

  const handleClearAllFilters = () => {
    setSearchQuery("");
    setStatusFilter("ALL");
    setCategoryFilter("ALL");
    setSortField("createdAt");
    setSortDirection("desc");
  };

  const getStatusBadge = (status: string | null | undefined) => {
    const normalizedStatus = status || "UNKNOWN";
    const variants: Record<
      string,
      "default" | "secondary" | "outline" | "destructive"
    > = {
      AVAILABLE: "default",
      RESERVED: "secondary",
      SOLD: "outline",
      EXPIRED: "destructive",
    };
    return (
      <Badge variant={variants[normalizedStatus] || "outline"}>
        {normalizedStatus}
      </Badge>
    );
  };

  return (
    <div className="space-y-6 p-6">
      {!embedded && (
        <BackButton
          label="Back to Suppliers"
          to="/clients?clientTypes=seller"
          className="mb-4"
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Vendor Supply</h1>
          <p className="text-muted-foreground">
            Manage vendor supply items and find matching clients
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Supply Item
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Vendor Supply Item</DialogTitle>
              <DialogDescription>
                Record a new item available from a vendor
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="vendorId">Vendor *</Label>
                <Select
                  value={formState.vendorId}
                  onValueChange={v =>
                    setFormState({ ...formState, vendorId: v })
                  }
                  disabled={vendorsLoading}
                >
                  <SelectTrigger>
                    {vendorsLoading ? (
                      <Skeleton className="h-4 w-24" />
                    ) : (
                      <SelectValue placeholder="Select a vendor" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {vendorsData?.items?.map(vendor => (
                      <SelectItem key={vendor.id} value={vendor.id.toString()}>
                        {vendor.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="strain">Strain</Label>
                  <Input
                    id="strain"
                    value={formState.strain}
                    onChange={e =>
                      setFormState({ ...formState, strain: e.target.value })
                    }
                    placeholder="e.g., Blue Dream"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="productName">Product Name</Label>
                  <Input
                    id="productName"
                    value={formState.productName}
                    onChange={e =>
                      setFormState({
                        ...formState,
                        productName: e.target.value,
                      })
                    }
                    placeholder="e.g., Premium Flower"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="category">Category</Label>
                  <Select
                    value={formState.category}
                    onValueChange={v =>
                      setFormState({ ...formState, category: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FLOWER">Flower</SelectItem>
                      <SelectItem value="TRIM">Trim</SelectItem>
                      <SelectItem value="SHAKE">Shake</SelectItem>
                      <SelectItem value="EXTRACT">Extract</SelectItem>
                      <SelectItem value="EDIBLE">Edible</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="grade">Grade</Label>
                  <Select
                    value={formState.grade}
                    onValueChange={v =>
                      setFormState({ ...formState, grade: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A">A</SelectItem>
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="PREMIUM">Premium</SelectItem>
                      <SelectItem value="STANDARD">Standard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="quantityAvailable">
                    Quantity Available (lbs) *
                  </Label>
                  <Input
                    id="quantityAvailable"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={formState.quantityAvailable}
                    onChange={e =>
                      setFormState({
                        ...formState,
                        quantityAvailable: e.target.value,
                      })
                    }
                    placeholder="e.g., 100"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="unitPrice">Price per lb ($)</Label>
                  <Input
                    id="unitPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.unitPrice}
                    onChange={e =>
                      setFormState({ ...formState, unitPrice: e.target.value })
                    }
                    placeholder="e.g., 250.00"
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="availableUntil">Available Until</Label>
                <Input
                  id="availableUntil"
                  type="date"
                  min={todayDate}
                  value={formState.availableUntil}
                  onChange={e =>
                    setFormState({
                      ...formState,
                      availableUntil: e.target.value,
                    })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formState.notes}
                  onChange={e =>
                    setFormState({ ...formState, notes: e.target.value })
                  }
                  placeholder="Additional notes about this supply..."
                  rows={2}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending}
              >
                {createMutation.isPending && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                Create Supply Item
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <DataCardSection moduleId="vendor_supply" />

      <FilterSortSearchPanel
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by strain, product, category, or vendor..."
        filters={[
          {
            id: "status",
            label: "Status",
            value: statusFilter,
            options: SUPPLY_STATUS_OPTIONS,
            onChange: setStatusFilter,
            allValue: "ALL",
            allLabel: "All Statuses",
          },
          {
            id: "category",
            label: "Category",
            value: categoryFilter,
            options: categoryOptions,
            onChange: setCategoryFilter,
            allValue: "ALL",
            allLabel: "All Categories",
          },
        ]}
        sort={{
          field: sortField,
          fieldOptions: SUPPLY_SORT_OPTIONS,
          onFieldChange: value => setSortField(value as VendorSupplySortField),
          direction: sortDirection,
          onDirectionChange: setSortDirection,
          directionLabels: {
            asc: "Lowest First",
            desc: "Highest First",
          },
        }}
        resultCount={filteredItems.length}
        resultLabel={filteredItems.length === 1 ? "item" : "items"}
        onClearAll={handleClearAllFilters}
      />

      {/* Supply Items List */}
      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : filteredItems.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No supply items found</p>
            <p className="text-sm text-muted-foreground">
              Add vendor supply items to see them here
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredItems.map(item => (
            <Card key={item.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">
                        {item.strain || item.category || "Supply Item"}
                      </CardTitle>
                      {getStatusBadge(item.status)}
                    </div>
                    <CardDescription>
                      Vendor: {item.vendorName || `#${item.vendorId}`}
                      {item.category && ` • ${item.category}`}
                      {item.subcategory && ` • ${item.subcategory}`}
                      {item.grade && ` • Grade ${item.grade}`}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  {item.quantityAvailable && (
                    <div>
                      <p className="text-muted-foreground">
                        Available Quantity
                      </p>
                      <p className="font-medium">
                        {item.quantityAvailable} lbs
                      </p>
                    </div>
                  )}
                  {item.unitPrice && (
                    <div>
                      <p className="text-muted-foreground">Price</p>
                      <p className="font-medium">
                        ${parseFloat(item.unitPrice).toFixed(2)}/lb
                      </p>
                    </div>
                  )}
                  {/* UX-012: Use standardized date formatting */}
                  {item.availableUntil && (
                    <div>
                      <p className="text-muted-foreground">Available Until</p>
                      <p className="font-medium">
                        {formatDate(item.availableUntil)}
                      </p>
                    </div>
                  )}
                  {item.createdAt && (
                    <div>
                      <p className="text-muted-foreground">Added</p>
                      <p className="font-medium">
                        {formatDate(item.createdAt)}
                      </p>
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleFindMatchingClients(item.id)}
                  >
                    Find Matching Clients
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

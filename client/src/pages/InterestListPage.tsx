/**
 * Interest List Page
 * ACT-003: Implements interest list flow with product tracking and order conversion
 */

import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Heart,
  ShoppingCart,
  MoreHorizontal,
  Trash2,
  User,
  Package,
  TrendingUp,
  Download,
  Plus,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { EmptyState } from "@/components/ui/empty-state";
import { TableSkeleton } from "@/components/ui/skeleton-loaders";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FilterSortSearchPanel } from "@/components/ui/filter-sort-search-panel";
import { exportToCSVWithLabels } from "@/utils/exportToCSV";
import {
  InterestDetailSheet,
  type InterestItem,
} from "@/components/interest-list/InterestDetailSheet";

type InterestSortField =
  | "createdAt"
  | "priority"
  | "matchCount"
  | "quantityNeeded";

const PRIORITY_OPTIONS = [
  { value: "URGENT", label: "Urgent" },
  { value: "HIGH", label: "High" },
  { value: "MEDIUM", label: "Medium" },
  { value: "LOW", label: "Low" },
];

const STATUS_OPTIONS = [
  { value: "ACTIVE", label: "Active" },
  { value: "FULFILLED", label: "Fulfilled" },
  { value: "CANCELLED", label: "Cancelled" },
];

const SORT_OPTIONS = [
  { value: "createdAt", label: "Created Date" },
  { value: "priority", label: "Priority" },
  { value: "matchCount", label: "Matches" },
  { value: "quantityNeeded", label: "Quantity Needed" },
];

const PRIORITY_SCORE: Record<string, number> = {
  URGENT: 4,
  HIGH: 3,
  MEDIUM: 2,
  LOW: 1,
};

export default function InterestListPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [sortField, setSortField] = useState<InterestSortField>("createdAt");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [selectedItem, setSelectedItem] = useState<InterestItem | null>(null);
  // CHAOS-016: State for delete confirmation dialog (replaces window.confirm)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<InterestItem | null>(null);

  // Fetch client needs which represents interest items
  const {
    data: needsData,
    isLoading,
    refetch,
  } = trpc.clientNeeds.getAllWithMatches.useQuery({
    status:
      statusFilter !== "ALL"
        ? (statusFilter as "ACTIVE" | "FULFILLED" | "CANCELLED" | "EXPIRED")
        : undefined,
  });

  // Calculate stats from the data
  const stats = useMemo(() => {
    if (!needsData?.data) return null;
    type NeedRecord = {
      status?: string;
      priority?: string;
      matchCount?: number;
    };
    const activeCount = needsData.data.filter(
      (n: NeedRecord) => n.status === "ACTIVE"
    ).length;
    const urgentCount = needsData.data.filter(
      (n: NeedRecord) => n.priority === "URGENT"
    ).length;
    const matchCount = needsData.data.reduce(
      (sum: number, n: NeedRecord) => sum + (n.matchCount || 0),
      0
    );
    const fulfilledCount = needsData.data.filter(
      (n: NeedRecord) => n.status === "FULFILLED"
    ).length;
    const conversionRate =
      needsData.data.length > 0
        ? Math.round((fulfilledCount / needsData.data.length) * 100)
        : 0;
    return { activeCount, urgentCount, matchCount, conversionRate };
  }, [needsData]);

  // Delete mutation
  const deleteMutation = trpc.clientNeeds.delete.useMutation({
    onSuccess: () => {
      toast.success("Interest item removed");
      setSelectedItem(null);
      refetch();
    },
    onError: error => {
      toast.error(error.message || "Failed to remove item");
    },
  });

  // Extract items from response
  const items: InterestItem[] = useMemo(() => {
    const rawItems = needsData?.data || [];
    if (!Array.isArray(rawItems)) return [];

    return rawItems.map(item => ({
      id: item.id,
      clientId: item.clientId,
      clientName: `Client #${item.clientId}`,
      productCategory: item.category || "General",
      productDescription: item.strain || item.productName || "",
      quantityNeeded: parseFloat((item.quantityMin as string) || "0"),
      maxPrice: item.priceMax ? parseFloat(item.priceMax as string) : undefined,
      priority: item.priority,
      status: item.status,
      neededBy: item.neededBy ? String(item.neededBy) : undefined,
      createdAt: item.createdAt
        ? new Date(item.createdAt).toISOString()
        : new Date().toISOString(),
      matchCount: item.matchCount || 0,
    }));
  }, [needsData]);

  // Filter items (apply priority filter client-side since API doesn't support it)
  const filteredItems = useMemo(() => {
    let result = items;
    if (priorityFilter !== "ALL") {
      result = result.filter(item => item.priority === priorityFilter);
    }
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        item =>
          item.clientName.toLowerCase().includes(query) ||
          item.productDescription.toLowerCase().includes(query) ||
          item.productCategory.toLowerCase().includes(query)
      );
    }

    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    return [...result].sort((a, b) => {
      let comparison = 0;

      if (sortField === "createdAt") {
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === "priority") {
        comparison =
          (PRIORITY_SCORE[a.priority] ?? 0) - (PRIORITY_SCORE[b.priority] ?? 0);
      } else if (sortField === "matchCount") {
        comparison = a.matchCount - b.matchCount;
      } else if (sortField === "quantityNeeded") {
        comparison = a.quantityNeeded - b.quantityNeeded;
      }

      if (comparison === 0) {
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      }

      return comparison * directionMultiplier;
    });
  }, [items, priorityFilter, searchQuery, sortDirection, sortField]);

  // Summary stats
  const totalActive = items.filter(i => i.status === "ACTIVE").length;
  const totalUrgent = items.filter(i => i.priority === "URGENT").length;
  const totalMatches = items.reduce((sum, i) => sum + i.matchCount, 0);

  const handleConvertToOrder = (item: InterestItem) => {
    setLocation(`/orders/create?clientId=${item.clientId}&needId=${item.id}`);
  };

  // CHAOS-016: Show confirm dialog instead of window.confirm
  const handleDeleteItem = (item: InterestItem) => {
    setItemToDelete(item);
    setDeleteDialogOpen(true);
  };

  // CHAOS-016: Handle confirmed delete
  const handleConfirmDelete = () => {
    if (itemToDelete) {
      deleteMutation.mutate({ id: itemToDelete.id });
    }
    setDeleteDialogOpen(false);
    setItemToDelete(null);
  };

  const handleExport = () => {
    if (filteredItems.length === 0) {
      toast.error("No items to export");
      return;
    }

    const exportData = filteredItems.map(item => ({
      clientName: item.clientName,
      productCategory: item.productCategory,
      productDescription: item.productDescription,
      quantityNeeded: item.quantityNeeded,
      maxPrice: item.maxPrice || "",
      priority: item.priority,
      status: item.status,
      neededBy: item.neededBy
        ? format(new Date(item.neededBy), "yyyy-MM-dd")
        : "",
      createdAt: format(new Date(item.createdAt), "yyyy-MM-dd"),
      matchCount: item.matchCount,
    }));

    exportToCSVWithLabels(
      exportData,
      [
        { key: "clientName", label: "Client" },
        { key: "productCategory", label: "Category" },
        { key: "productDescription", label: "Description" },
        { key: "quantityNeeded", label: "Quantity" },
        { key: "maxPrice", label: "Max Price" },
        { key: "priority", label: "Priority" },
        { key: "status", label: "Status" },
        { key: "neededBy", label: "Needed By" },
        { key: "createdAt", label: "Created" },
        { key: "matchCount", label: "Matches" },
      ],
      "interest-list"
    );
    toast.success(`Exported ${filteredItems.length} interest items`);
  };

  const handleClearAllFilters = () => {
    setSearchQuery("");
    setPriorityFilter("ALL");
    setStatusFilter("ACTIVE");
    setSortField("createdAt");
    setSortDirection("desc");
  };

  const getPriorityBadge = (priority: string) => {
    const variants: Record<
      string,
      "destructive" | "default" | "secondary" | "outline"
    > = {
      URGENT: "destructive",
      HIGH: "default",
      MEDIUM: "secondary",
      LOW: "outline",
    };
    return (
      <Badge variant={variants[priority] || "outline"} className="text-xs">
        {priority}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Heart className="h-8 w-8 text-pink-500" />
            Interest List
          </h1>
          <p className="text-muted-foreground mt-1">
            Track client product interests and convert them to orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button onClick={() => setLocation("/needs")}>
            <Plus className="h-4 w-4 mr-2" />
            Add Interest
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Interests
            </CardTitle>
            <Heart className="h-4 w-4 text-pink-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.activeCount || totalActive}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Urgent Priority
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats?.urgentCount || totalUrgent}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Available Matches
            </CardTitle>
            <Package className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats?.matchCount || totalMatches}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Conversion Rate
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.conversionRate || "0"}%
            </div>
          </CardContent>
        </Card>
      </div>

      <FilterSortSearchPanel
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search by client, product, or category..."
        filters={[
          {
            id: "priority",
            label: "Priority",
            value: priorityFilter,
            options: PRIORITY_OPTIONS,
            onChange: setPriorityFilter,
            allValue: "ALL",
            allLabel: "All Priorities",
          },
          {
            id: "status",
            label: "Status",
            value: statusFilter,
            options: STATUS_OPTIONS,
            onChange: setStatusFilter,
            allValue: "ALL",
            allLabel: "All Statuses",
          },
        ]}
        sort={{
          field: sortField,
          fieldOptions: SORT_OPTIONS,
          onFieldChange: value => setSortField(value as InterestSortField),
          direction: sortDirection,
          onDirectionChange: setSortDirection,
          directionLabels: {
            asc: "Lowest First",
            desc: "Highest First",
          },
        }}
        onClearAll={handleClearAllFilters}
        resultCount={filteredItems.length}
        resultLabel={filteredItems.length === 1 ? "item" : "items"}
      />

      {/* Interest List Table */}
      <Card>
        <CardHeader>
          <CardTitle>Interest Items ({filteredItems.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={10} columns={7} />
          ) : filteredItems.length === 0 ? (
            <EmptyState
              variant="clients"
              title="No interest items"
              description={
                searchQuery ||
                priorityFilter !== "ALL" ||
                statusFilter !== "ACTIVE"
                  ? "No items match your current filters. Try adjusting your search."
                  : "Start tracking client interests by adding items to this list."
              }
              action={
                !searchQuery
                  ? {
                      label: "Add Interest Item",
                      onClick: () => setLocation("/needs"),
                    }
                  : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Product/Category</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Max Price</TableHead>
                    <TableHead>Priority</TableHead>
                    <TableHead>Matches</TableHead>
                    <TableHead className="w-10">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map(item => (
                    <TableRow
                      key={item.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedItem(item)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{item.clientName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {item.productCategory}
                          </div>
                          <div className="text-sm text-muted-foreground truncate max-w-[200px]">
                            {item.productDescription}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.quantityNeeded}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {item.maxPrice ? `$${item.maxPrice}` : "-"}
                      </TableCell>
                      <TableCell>{getPriorityBadge(item.priority)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={item.matchCount > 0 ? "default" : "outline"}
                          className="text-xs"
                        >
                          {item.matchCount}{" "}
                          {item.matchCount === 1 ? "match" : "matches"}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={e => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleConvertToOrder(item)}
                            >
                              <ShoppingCart className="h-4 w-4 mr-2" />
                              Convert to Order
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteItem(item)}
                              className="text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Sheet */}
      <InterestDetailSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onConvertToOrder={handleConvertToOrder}
        onDelete={handleDeleteItem}
      />

      {/* CHAOS-016: Delete Confirmation Dialog (replaces window.confirm) */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Remove Interest Item"
        description={`Are you sure you want to remove the interest item for ${itemToDelete?.clientName}? This action cannot be undone.`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={handleConfirmDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

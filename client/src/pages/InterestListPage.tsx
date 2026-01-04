// @ts-nocheck - TEMPORARY: Type mismatch errors, needs Wave 1 fix
/**
 * Interest List Page
 * ACT-003: Implements interest list flow with product tracking and order conversion
 */

import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
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
import { exportToCSVWithLabels } from "@/utils/exportToCSV";
import {
  InterestDetailSheet,
  type InterestItem,
} from "@/components/interest-list/InterestDetailSheet";

export default function InterestListPage() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ACTIVE");
  const [selectedItem, setSelectedItem] = useState<InterestItem | null>(null);

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
  type RawNeedItem = {
    id: number;
    clientId: number;
    clientName?: string;
    category?: string;
    productCategory?: string;
    description?: string;
    productDescription?: string;
    quantityNeeded?: number;
    quantity?: number;
    maxPrice?: number;
    priority?: string;
    status?: string;
    neededBy?: string;
    createdAt: string;
    matchCount?: number;
  };

  const items: InterestItem[] = useMemo(() => {
    const rawItems = needsData?.data || [];
    if (!Array.isArray(rawItems)) return [];

    return rawItems.map((item: RawNeedItem) => ({
      id: item.id,
      clientId: item.clientId,
      clientName: item.clientName || `Client #${item.clientId}`,
      productCategory: item.category || item.productCategory || "General",
      productDescription: item.description || item.productDescription || "",
      quantityNeeded: item.quantityNeeded || item.quantity || 0,
      maxPrice: item.maxPrice,
      priority: item.priority || "MEDIUM",
      status: item.status || "ACTIVE",
      neededBy: item.neededBy,
      createdAt: item.createdAt,
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
    return result;
  }, [items, searchQuery, priorityFilter]);

  // Summary stats
  const totalActive = items.filter(i => i.status === "ACTIVE").length;
  const totalUrgent = items.filter(i => i.priority === "URGENT").length;
  const totalMatches = items.reduce((sum, i) => sum + i.matchCount, 0);

  const handleConvertToOrder = (item: InterestItem) => {
    setLocation(`/orders/create?clientId=${item.clientId}&needId=${item.id}`);
  };

  const handleDeleteItem = (item: InterestItem) => {
    if (window.confirm(`Remove interest item for ${item.clientName}?`)) {
      deleteMutation.mutate({ id: item.id });
    }
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

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by client, product, or category..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="HIGH">High</SelectItem>
                <SelectItem value="MEDIUM">Medium</SelectItem>
                <SelectItem value="LOW">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="FULFILLED">Fulfilled</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}

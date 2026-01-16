/**
 * Sprint 4 Track B - 4.B.3: MEET-008 - Complex Tab (Jesse example)
 *
 * Tab-based interface for client details with:
 * - Tabs: Overview, Orders, Purchases, Products, Notes, Activity
 * - Each tab lazy-loads its content
 * - Filters within each tab
 * - Export functionality per tab
 */

import React, { useState, Suspense, lazy } from "react";
import { trpc } from "@/lib/trpc";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  Download,
  Search,
  Filter,
  ShoppingCart,
  Package,
  FileText,
  Clock,
  User,
} from "lucide-react";

// Lazy load heavier components
const Client360Pod = lazy(() => import("./Client360Pod"));
const FreeformNoteWidget = lazy(() =>
  import("@/components/dashboard/widgets-v2").then(m => ({
    default: m.FreeformNoteWidget,
  }))
);
const CommentWidget = lazy(() =>
  import("@/components/comments/CommentWidget").then(m => ({
    default: m.CommentWidget,
  }))
);

interface ClientComplexTabProps {
  clientId: number;
  initialTab?: string;
  onTabChange?: (tab: string) => void;
}

/**
 * ClientComplexTab - Complex tabbed interface for power users
 */
export function ClientComplexTab({
  clientId,
  initialTab = "overview",
  onTabChange,
}: ClientComplexTabProps) {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatusFilter, setOrderStatusFilter] = useState<string>("all");
  const [purchaseSearch, setPurchaseSearch] = useState("");
  const [activitySearch, setActivitySearch] = useState("");

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    onTabChange?.(tab);
  };

  // Format currency helper
  const formatCurrency = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  // Format date helper
  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Export helper
  const exportToCSV = (data: unknown[], filename: string) => {
    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0] as Record<string, unknown>);
    const csvContent = [
      headers.join(","),
      ...data.map(row =>
        headers
          .map(h => {
            const val = (row as Record<string, unknown>)[h];
            const strVal = val === null || val === undefined ? "" : String(val);
            return `"${strVal.replace(/"/g, '""')}"`;
          })
          .join(",")
      ),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Tab loading skeleton
  const TabSkeleton = () => (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Skeleton className="h-64" />
    </div>
  );

  return (
    <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
      <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
        <TabsList className="inline-flex w-full min-w-max md:w-auto h-auto gap-1">
          <TabsTrigger
            value="overview"
            className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
          >
            <User className="h-4 w-4 mr-1.5" />
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="orders"
            className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
          >
            <ShoppingCart className="h-4 w-4 mr-1.5" />
            Orders
          </TabsTrigger>
          <TabsTrigger
            value="purchases"
            className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
          >
            <Package className="h-4 w-4 mr-1.5" />
            Purchases
          </TabsTrigger>
          <TabsTrigger
            value="products"
            className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
          >
            <Package className="h-4 w-4 mr-1.5" />
            Products
          </TabsTrigger>
          <TabsTrigger
            value="notes"
            className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
          >
            <FileText className="h-4 w-4 mr-1.5" />
            Notes
          </TabsTrigger>
          <TabsTrigger
            value="activity"
            className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
          >
            <Clock className="h-4 w-4 mr-1.5" />
            Activity
          </TabsTrigger>
        </TabsList>
      </div>

      {/* Overview Tab */}
      <TabsContent value="overview" className="space-y-4 mt-4">
        <Suspense fallback={<TabSkeleton />}>
          <Client360Pod clientId={clientId} />
        </Suspense>
      </TabsContent>

      {/* Orders Tab */}
      <TabsContent value="orders" className="space-y-4 mt-4">
        <OrdersTab
          clientId={clientId}
          search={orderSearch}
          onSearchChange={setOrderSearch}
          statusFilter={orderStatusFilter}
          onStatusFilterChange={setOrderStatusFilter}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          exportToCSV={exportToCSV}
        />
      </TabsContent>

      {/* Purchases Tab */}
      <TabsContent value="purchases" className="space-y-4 mt-4">
        <PurchasesTab
          clientId={clientId}
          search={purchaseSearch}
          onSearchChange={setPurchaseSearch}
          formatCurrency={formatCurrency}
          formatDate={formatDate}
          exportToCSV={exportToCSV}
        />
      </TabsContent>

      {/* Products Tab */}
      <TabsContent value="products" className="space-y-4 mt-4">
        <ProductsTab
          clientId={clientId}
          formatCurrency={formatCurrency}
          exportToCSV={exportToCSV}
        />
      </TabsContent>

      {/* Notes Tab */}
      <TabsContent value="notes" className="space-y-4 mt-4">
        <Suspense fallback={<TabSkeleton />}>
          <NotesTab clientId={clientId} />
        </Suspense>
      </TabsContent>

      {/* Activity Tab */}
      <TabsContent value="activity" className="space-y-4 mt-4">
        <ActivityTab
          clientId={clientId}
          search={activitySearch}
          onSearchChange={setActivitySearch}
          formatDate={formatDate}
          exportToCSV={exportToCSV}
        />
      </TabsContent>
    </Tabs>
  );
}

// Orders Tab Component
interface OrdersTabProps {
  clientId: number;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  formatCurrency: (value: string | number | null | undefined) => string;
  formatDate: (date: string | Date | null | undefined) => string;
  exportToCSV: (data: unknown[], filename: string) => void;
}

function OrdersTab({
  clientId,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  formatCurrency,
  formatDate,
  exportToCSV,
}: OrdersTabProps) {
  const { data: ordersData, isLoading } = trpc.orders.getByClient.useQuery({
    clientId,
  });

  const orders = ordersData || [];

  // Filter orders by search and status
  interface OrderData {
    id: number;
    orderNumber: string;
    fulfillmentStatus?: string | null;
    total?: string | null;
    createdAt?: Date | null;
    orderType?: string;
  }

  const filteredOrders = orders.filter((order: OrderData) => {
    if (statusFilter !== "all" && order.fulfillmentStatus !== statusFilter)
      return false;
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      order.orderNumber?.toLowerCase().includes(searchLower) ||
      String(order.id).includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Orders</CardTitle>
            <CardDescription>All orders for this client</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToCSV(
                filteredOrders.map((o: OrderData) => ({
                  orderNumber: o.orderNumber,
                  status: o.fulfillmentStatus,
                  total: o.total,
                  createdAt: o.createdAt,
                })),
                `client_${clientId}_orders`
              )
            }
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search orders..."
              value={search}
              onChange={e => onSearchChange(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={onStatusFilterChange}>
            <SelectTrigger className="w-full sm:w-40">
              <Filter className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="CONFIRMED">Confirmed</SelectItem>
              <SelectItem value="COMPLETED">Completed</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Orders Table */}
        {filteredOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order: OrderData) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">
                      {order.orderNumber || `#${order.id}`}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {order.fulfillmentStatus || "Draft"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(order.total)}
                    </TableCell>
                    <TableCell>{formatDate(order.createdAt)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No orders found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Purchases Tab Component (products purchased)
interface PurchasesTabProps {
  clientId: number;
  search: string;
  onSearchChange: (value: string) => void;
  formatCurrency: (value: string | number | null | undefined) => string;
  formatDate: (date: string | Date | null | undefined) => string;
  exportToCSV: (data: unknown[], filename: string) => void;
}

function PurchasesTab({
  clientId,
  search,
  onSearchChange,
  formatCurrency,
  formatDate,
  exportToCSV,
}: PurchasesTabProps) {
  const { data, isLoading } = trpc.client360.getClient360.useQuery({
    clientId,
    includePurchaseHistory: true,
    includeOrderHistory: false,
    includeActivity: false,
  });

  const purchaseHistory = data?.purchaseHistory || [];

  // Filter by search
  const filteredPurchases = purchaseHistory.filter(item => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return item.productName?.toLowerCase().includes(searchLower);
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Purchase History</CardTitle>
            <CardDescription>Products purchased by this client</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToCSV(
                filteredPurchases.map(p => ({
                  productName: p.productName,
                  totalQuantity: p.totalQuantity,
                  totalSpent: p.totalSpent,
                  lastPurchased: p.lastPurchased,
                })),
                `client_${clientId}_purchases`
              )
            }
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Purchases Table */}
        {filteredPurchases.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Total Spent</TableHead>
                  <TableHead>Last Purchase</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPurchases.map((item, idx) => (
                  <TableRow key={`purchase-${item.productName}-${item.sku || idx}`}>
                    <TableCell className="font-medium">
                      {item.productName}
                    </TableCell>
                    <TableCell className="text-right">
                      {parseFloat(String(item.totalQuantity || "0")).toFixed(0)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.totalSpent)}
                    </TableCell>
                    <TableCell>{formatDate(item.lastPurchased)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No purchase history found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Products Tab Component (supplier products if isSeller)
interface ProductsTabProps {
  clientId: number;
  formatCurrency: (value: string | number | null | undefined) => string;
  exportToCSV: (data: unknown[], filename: string) => void;
}

function ProductsTab({
  clientId,
  formatCurrency,
  exportToCSV,
}: ProductsTabProps) {
  const { data: client } = trpc.clients.getById.useQuery({ clientId });
  const { data: purchaseOrders, isLoading } =
    trpc.purchaseOrders.getBySupplier.useQuery(
      { supplierClientId: clientId },
      { enabled: !!client?.isSeller }
    );

  if (!client?.isSeller) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>This client is not a supplier</p>
            <p className="text-sm mt-2">
              Product information is only available for suppliers
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isLoading) {
    return <Skeleton className="h-64" />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Supplied Products</CardTitle>
            <CardDescription>Products supplied by this vendor</CardDescription>
          </div>
          {purchaseOrders && purchaseOrders.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                exportToCSV(
                  purchaseOrders.map(po => ({
                    poNumber: po.poNumber,
                    status: po.purchaseOrderStatus,
                    total: po.total,
                    orderDate: po.orderDate,
                  })),
                  `client_${clientId}_products`
                )
              }
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {purchaseOrders && purchaseOrders.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Order Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.map(po => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{po.purchaseOrderStatus}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(po.total)}
                    </TableCell>
                    <TableCell>
                      {po.orderDate
                        ? new Date(po.orderDate).toLocaleDateString()
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No purchase orders found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Notes Tab Component
interface NotesTabProps {
  clientId: number;
}

function NotesTab({ clientId }: NotesTabProps) {
  const { data: noteId } = trpc.clients.notes.getNoteId.useQuery({ clientId });

  return (
    <div className="space-y-4">
      {/* Freeform Notes */}
      <Card>
        <CardHeader>
          <CardTitle>Client Notes</CardTitle>
          <CardDescription>Freeform notes for this client</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[400px]">
            <Suspense fallback={<Skeleton className="h-full" />}>
              <FreeformNoteWidget noteId={noteId || undefined} />
            </Suspense>
          </div>
        </CardContent>
      </Card>

      {/* Comments */}
      <Card>
        <CardHeader>
          <CardTitle>Comments</CardTitle>
          <CardDescription>Team notes and discussions</CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-32" />}>
            <CommentWidget commentableType="client" commentableId={clientId} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

// Activity Tab Component
interface ActivityTabProps {
  clientId: number;
  search: string;
  onSearchChange: (value: string) => void;
  formatDate: (date: string | Date | null | undefined) => string;
  exportToCSV: (data: unknown[], filename: string) => void;
}

function ActivityTab({
  clientId,
  search,
  onSearchChange,
  formatDate,
  exportToCSV,
}: ActivityTabProps) {
  const { data: activities, isLoading } = trpc.clients.activity.list.useQuery({
    clientId,
    limit: 100,
  });

  // Filter by search
  const filteredActivities = (activities || []).filter(activity => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      activity.activityType.toLowerCase().includes(searchLower) ||
      activity.userName?.toLowerCase().includes(searchLower)
    );
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Activity Log</CardTitle>
            <CardDescription>All activity for this client</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              exportToCSV(
                filteredActivities.map(a => ({
                  activityType: a.activityType,
                  userName: a.userName,
                  createdAt: a.createdAt,
                })),
                `client_${clientId}_activity`
              )
            }
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search activity..."
            value={search}
            onChange={e => onSearchChange(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Activity List */}
        {filteredActivities.length > 0 ? (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {filteredActivities.map(activity => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 border rounded-lg"
              >
                <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div className="flex-1">
                  <p className="font-medium">
                    {activity.activityType.replace(/_/g, " ")}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {activity.userName || "System"} -{" "}
                    {formatDate(activity.createdAt)}
                  </p>
                  {activity.metadata ? (
                    <p className="text-xs text-muted-foreground mt-1">
                      {String(JSON.stringify(activity.metadata))}
                    </p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No activity found</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ClientComplexTab;

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart3,
  TrendingUp,
  Users,
  Package,
  AlertCircle,
  Loader2,
  Download,
  DollarSign,
  ShoppingCart,
  AlertTriangle,
} from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useAppMutation } from "@/hooks/useAppMutation";
import { FormSubmitButton } from "@/components/ui/FormSubmitButton";

// Simple Bar Chart component (no external dependencies)
function SimpleBarChart({ data, xKey, yKey, label }: {
  data: Array<Record<string, any>>;
  xKey: string;
  yKey: string;
  label: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-muted-foreground">
        No data available
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => Number(d[yKey]) || 0));

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <div className="h-64 flex items-end gap-1 overflow-x-auto pb-6">
        {data.map((item, index) => {
          const value = Number(item[yKey]) || 0;
          const height = maxValue > 0 ? (value / maxValue) * 100 : 0;
          return (
            <div key={index} className="flex flex-col items-center min-w-[40px]">
              <div
                className="w-8 bg-primary rounded-t transition-all hover:bg-primary/80"
                style={{ height: `${Math.max(height, 2)}%` }}
                title={`${item[xKey]}: $${value.toLocaleString()}`}
              />
              <span className="text-[10px] text-muted-foreground mt-1 rotate-45 origin-left truncate max-w-[60px]">
                {String(item[xKey]).slice(5)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } =
    trpc.analytics.getSummary.useQuery();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <BackButton label="Back to Dashboard" to="/" className="mb-4" />
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="text-muted-foreground">
            Business intelligence and insights for your operations
          </p>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="inventory">Inventory</TabsTrigger>
          <TabsTrigger value="clients">Clients</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {summaryError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>
                Failed to load analytics data. Please try again later.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    `$${(summaryData?.totalRevenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Total from all orders</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
                <ShoppingCart className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    (summaryData?.totalOrders ?? 0).toLocaleString()
                  )}
                </div>
                <p className="text-xs text-muted-foreground">All orders in system</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    (summaryData?.totalClients ?? 0).toLocaleString()
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Total clients in system</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inventory Items</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {summaryLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    (summaryData?.totalInventoryItems ?? 0).toLocaleString()
                  )}
                </div>
                <p className="text-xs text-muted-foreground">Active batches in inventory</p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <SalesAnalyticsTab />
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <InventoryAnalyticsTab />
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <ClientAnalyticsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SalesAnalyticsTab() {
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  const queryParams = {
    startDate: dateRange.startDate ? new Date(dateRange.startDate) : undefined,
    endDate: dateRange.endDate ? new Date(dateRange.endDate) : undefined,
  };

  const { data, isLoading, error } = trpc.analytics.getSalesAnalytics.useQuery(queryParams);

  // CSV Export
  const exportMutation = trpc.analytics.exportSalesCSV.useMutation();
  const { mutate: exportCSV, isPending: isExporting } = useAppMutation(
    exportMutation,
    {
      successMessage: "CSV exported successfully",
      onSuccess: (result) => {
        if (result?.csv) {
          const blob = new Blob([result.csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = result.filename || "sales_export.csv";
          a.click();
          URL.revokeObjectURL(url);
        }
      },
      context: { component: "SalesAnalyticsTab" },
    }
  );

  const handleExport = () => {
    exportCSV(queryParams);
  };

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load sales analytics.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Sales Analytics</CardTitle>
          <CardDescription>Filter sales data by date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              />
            </div>
            <FormSubmitButton
              onClick={handleExport}
              isPending={isExporting}
              loadingText="Exporting..."
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </FormSubmitButton>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(data?.revenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Order Count</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.orderCount ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Avg Order Value</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${(data?.averageOrderValue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Revenue Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <SimpleBarChart
                data={data?.revenueByDay || []}
                xKey="date"
                yKey="revenue"
                label="Daily Revenue"
              />
            </CardContent>
          </Card>

          {/* Top Clients Table */}
          <Card>
            <CardHeader>
              <CardTitle>Top Clients by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.topClients?.map((client, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{client.clientName}</TableCell>
                      <TableCell className="text-right">{client.orderCount}</TableCell>
                      <TableCell className="text-right">
                        ${client.totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function InventoryAnalyticsTab() {
  const { data, isLoading, error } = trpc.analytics.getInventoryAnalytics.useQuery({
    lowStockThreshold: 10,
  });

  // CSV Export
  const exportMutation = trpc.analytics.exportInventoryCSV.useMutation();
  const { mutate: exportCSV, isPending: isExporting } = useAppMutation(
    exportMutation,
    {
      successMessage: "CSV exported successfully",
      onSuccess: (result) => {
        if (result?.csv) {
          const blob = new Blob([result.csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = result.filename || "inventory_export.csv";
          a.click();
          URL.revokeObjectURL(url);
        }
      },
      context: { component: "InventoryAnalyticsTab" },
    }
  );

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load inventory analytics.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with Export */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg">Inventory Analytics</CardTitle>
              <CardDescription>Monitor inventory levels and stock status</CardDescription>
            </div>
            <FormSubmitButton
              onClick={() => exportCSV()}
              isPending={isExporting}
              loadingText="Exporting..."
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </FormSubmitButton>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.totalItems ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Quantity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(data?.totalQuantity ?? 0).toLocaleString()}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {data?.lowStockItems?.length ?? 0}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Low Stock Alerts */}
          {data?.lowStockItems && data.lowStockItems.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600" />
                  Low Stock Alerts
                </CardTitle>
                <CardDescription>Items below threshold ({10} units)</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>SKU</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Quantity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.lowStockItems.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono">{item.sku}</TableCell>
                        <TableCell>{item.productName}</TableCell>
                        <TableCell className="text-right font-bold text-orange-600">
                          {item.quantity}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}

          {/* Stock by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Stock by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead className="text-right">Total Quantity</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.stockByCategory?.map((cat, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{cat.category}</TableCell>
                      <TableCell className="text-right">{cat.itemCount}</TableCell>
                      <TableCell className="text-right">{cat.totalQuantity.toLocaleString()}</TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center text-muted-foreground">
                        No data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

function ClientAnalyticsTab() {
  const [dateRange, setDateRange] = useState({
    startDate: "",
    endDate: "",
  });

  const queryParams = {
    startDate: dateRange.startDate ? new Date(dateRange.startDate) : undefined,
    endDate: dateRange.endDate ? new Date(dateRange.endDate) : undefined,
  };

  const { data, isLoading, error } = trpc.analytics.getClientAnalytics.useQuery(queryParams);

  // CSV Export
  const exportMutation = trpc.analytics.exportClientCSV.useMutation();
  const { mutate: exportCSV, isPending: isExporting } = useAppMutation(
    exportMutation,
    {
      successMessage: "CSV exported successfully",
      onSuccess: (result) => {
        if (result?.csv) {
          const blob = new Blob([result.csv], { type: "text/csv" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = result.filename || "clients_export.csv";
          a.click();
          URL.revokeObjectURL(url);
        }
      },
      context: { component: "ClientAnalyticsTab" },
    }
  );

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>Failed to load client analytics.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Date Range Filter */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Client Analytics</CardTitle>
          <CardDescription>Analyze client data and behavior</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="clientStartDate">Start Date</Label>
              <Input
                id="clientStartDate"
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="clientEndDate">End Date</Label>
              <Input
                id="clientEndDate"
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
              />
            </div>
            <FormSubmitButton
              onClick={() => exportCSV()}
              isPending={isExporting}
              loadingText="Exporting..."
              variant="outline"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </FormSubmitButton>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data?.totalClients ?? 0}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">New Clients</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {data?.newClientsThisPeriod ?? 0}
                </div>
                <p className="text-xs text-muted-foreground">In selected period</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Client Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {data?.clientsByType?.map((type, index) => (
                    <div key={index} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{type.type}:</span>
                      <span className="font-medium">{type.count}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Top Clients Table */}
          <Card>
            <CardHeader>
              <CardTitle>Top Clients by Revenue</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>TERI Code</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead className="text-right">Orders</TableHead>
                    <TableHead className="text-right">Total Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data?.topClients?.map((client, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-mono">{client.teriCode}</TableCell>
                      <TableCell className="font-medium">{client.clientName}</TableCell>
                      <TableCell className="text-right">{client.orderCount}</TableCell>
                      <TableCell className="text-right">
                        ${client.totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </TableCell>
                    </TableRow>
                  )) || (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground">
                        No data available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}

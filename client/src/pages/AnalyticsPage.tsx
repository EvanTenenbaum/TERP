import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, TrendingUp, Users, Package, AlertCircle, Loader2 } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { trpc } from "@/lib/trpc";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function AnalyticsPage() {
  const { data, isLoading, error } = trpc.analytics.getSummary.useQuery();
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
          {error && (
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
                <CardTitle className="text-sm font-medium">
                  Total Revenue
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    `$${(data?.totalRevenue ?? 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total from all orders
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Orders
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    (data?.totalOrders ?? 0).toLocaleString()
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  All orders in system
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Active Clients
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    (data?.totalClients ?? 0).toLocaleString()
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Total clients in system
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Inventory Items
                </CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    (data?.totalInventoryItems ?? 0).toLocaleString()
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  Active batches in inventory
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Analytics Dashboard</CardTitle>
              <CardDescription>
                Comprehensive business intelligence and reporting
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Analytics Module Active
                </h3>
                <p className="text-muted-foreground max-w-md">
                  The Analytics module is now accessible. Advanced analytics
                  features including strain preferences, sales trends, and
                  client insights are available through the backend API.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sales Analytics</CardTitle>
              <CardDescription>
                Track sales performance and trends over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <TrendingUp className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Sales analytics features coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Inventory Analytics</CardTitle>
              <CardDescription>
                Monitor inventory levels and product performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Package className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Inventory analytics features coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Analytics</CardTitle>
              <CardDescription>
                Understand client behavior and preferences
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Client analytics features coming soon
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

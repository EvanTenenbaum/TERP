/**
 * VendorContextPanel Component - FEAT-002-BE Frontend
 *
 * Displays comprehensive vendor context when a vendor is selected,
 * including supply history, product performance, and active inventory.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  Building2,
  Package,
  TrendingUp,
  Wallet,
  History,
  ChevronDown,
  ChevronUp,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Percent,
  AlertCircle,
} from "lucide-react";
import { format } from "date-fns";
import { VendorWithBrands } from "./VendorBrandInfo";
import { getBrandLabel } from "@/lib/nomenclature";

interface VendorContextPanelProps {
  /**
   * The client ID of the vendor (must have isSeller=true)
   */
  clientId: number;
  /**
   * Optional date range for historical data
   */
  dateRange?: {
    startDate?: string;
    endDate?: string;
  };
  /**
   * Whether to show the panel in compact mode
   */
  compact?: boolean;
  /**
   * Callback when a product is clicked
   */
  onProductClick?: (productId: number) => void;
  /**
   * Callback when a batch is clicked
   */
  onBatchClick?: (batchId: number) => void;
}

/**
 * Format currency values
 */
function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Format percentage values
 */
function formatPercent(value: number): string {
  return `${value.toFixed(1)}%`;
}

/**
 * Vendor info section showing contact and relationship details
 */
function VendorInfoSection({
  vendor,
}: {
  vendor: {
    name: string;
    contactName: string | null;
    contactEmail: string | null;
    contactPhone: string | null;
    paymentTerms: string | null;
    totalLifetimeValue: number;
    relationshipStartDate: string | null;
  };
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            {vendor.name}
          </h3>
          {vendor.contactName && (
            <p className="text-sm text-muted-foreground">
              Contact: {vendor.contactName}
            </p>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm text-muted-foreground">Lifetime Value</div>
          <div className="text-xl font-bold text-green-600">
            {formatCurrency(vendor.totalLifetimeValue)}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 text-sm">
        {vendor.contactEmail && (
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <a
              href={`mailto:${vendor.contactEmail}`}
              className="text-blue-600 hover:underline"
            >
              {vendor.contactEmail}
            </a>
          </div>
        )}
        {vendor.contactPhone && (
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a
              href={`tel:${vendor.contactPhone}`}
              className="text-blue-600 hover:underline"
            >
              {vendor.contactPhone}
            </a>
          </div>
        )}
        {vendor.paymentTerms && (
          <div className="flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            <span>Terms: {vendor.paymentTerms.replace(/_/g, " ")}</span>
          </div>
        )}
        {vendor.relationshipStartDate && (
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>
              Since {format(new Date(vendor.relationshipStartDate), "MMM yyyy")}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Aggregate metrics cards
 */
function MetricsCards({
  metrics,
}: {
  metrics: {
    totalLotsReceived: number;
    totalUnitsSupplied: number;
    totalUnitsSold: number;
    totalRevenue: number;
    totalProfit: number;
    overallSellThroughRate: number;
    avgDaysToSell: number | null;
  };
}) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <Card className="p-3">
        <div className="text-xs text-muted-foreground">Units Supplied</div>
        <div className="text-lg font-bold">
          {metrics.totalUnitsSupplied.toLocaleString()}
        </div>
      </Card>
      <Card className="p-3">
        <div className="text-xs text-muted-foreground">Units Sold</div>
        <div className="text-lg font-bold">
          {metrics.totalUnitsSold.toLocaleString()}
        </div>
      </Card>
      <Card className="p-3">
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <Percent className="h-3 w-3" />
          Sell-Through
        </div>
        <div
          className={`text-lg font-bold ${
            metrics.overallSellThroughRate >= 70
              ? "text-green-600"
              : metrics.overallSellThroughRate >= 50
              ? "text-yellow-600"
              : "text-red-600"
          }`}
        >
          {formatPercent(metrics.overallSellThroughRate)}
        </div>
      </Card>
      <Card className="p-3">
        <div className="text-xs text-muted-foreground flex items-center gap-1">
          <DollarSign className="h-3 w-3" />
          Revenue
        </div>
        <div className="text-lg font-bold text-green-600">
          {formatCurrency(metrics.totalRevenue)}
        </div>
      </Card>
    </div>
  );
}

/**
 * Product performance table
 */
function ProductPerformanceTab({
  products,
  onProductClick,
}: {
  products: Array<{
    productId: number;
    productName: string;
    category: string;
    brandName: string | null;
    totalSupplied: number;
    totalSold: number;
    totalRevenue: number;
    sellThroughRate: number;
    avgDaysToSell: number | null;
    currentAvailable: number;
  }>;
  onProductClick?: (productId: number) => void;
}) {
  if (products.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No product performance data available
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Supplied</TableHead>
            <TableHead className="text-right">Sold</TableHead>
            <TableHead className="text-right">Sell-Through</TableHead>
            <TableHead className="text-right">Revenue</TableHead>
            <TableHead className="text-right">Available</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow
              key={product.productId}
              className={onProductClick ? "cursor-pointer hover:bg-muted" : undefined}
              onClick={() => onProductClick?.(product.productId)}
            >
              <TableCell>
                <div>
                  <div className="font-medium">{product.productName}</div>
                  <div className="text-xs text-muted-foreground">
                    {product.category}
                    {product.brandName && ` - ${product.brandName}`}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {product.totalSupplied.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                {product.totalSold.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={
                    product.sellThroughRate >= 70
                      ? "text-green-600"
                      : product.sellThroughRate >= 50
                      ? "text-yellow-600"
                      : "text-red-600"
                  }
                >
                  {formatPercent(product.sellThroughRate)}
                </span>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(product.totalRevenue)}
              </TableCell>
              <TableCell className="text-right">
                {product.currentAvailable > 0 ? (
                  <Badge variant="secondary">
                    {product.currentAvailable.toLocaleString()}
                  </Badge>
                ) : (
                  <span className="text-muted-foreground">0</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Active inventory tab
 */
function ActiveInventoryTab({
  inventory,
  onBatchClick,
}: {
  inventory?: Array<{
    batchId: number;
    batchCode: string;
    sku: string;
    productName: string;
    category: string;
    brandName: string | null;
    unitsAvailable: number;
    daysOld: number;
    unitCogs: number;
    batchStatus: string;
  }>;
  onBatchClick?: (batchId: number) => void;
}) {
  if (!inventory || inventory.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No active inventory from this vendor
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Batch</TableHead>
            <TableHead>Product</TableHead>
            <TableHead className="text-right">Available</TableHead>
            <TableHead className="text-right">Days Old</TableHead>
            <TableHead className="text-right">COGS</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {inventory.map((item) => (
            <TableRow
              key={item.batchId}
              className={onBatchClick ? "cursor-pointer hover:bg-muted" : undefined}
              onClick={() => onBatchClick?.(item.batchId)}
            >
              <TableCell>
                <div className="font-mono text-sm">{item.batchCode}</div>
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{item.productName}</div>
                  <div className="text-xs text-muted-foreground">
                    {item.category}
                    {item.brandName && ` - ${item.brandName}`}
                  </div>
                </div>
              </TableCell>
              <TableCell className="text-right">
                {item.unitsAvailable.toFixed(2)}
              </TableCell>
              <TableCell className="text-right">
                <span
                  className={
                    item.daysOld > 90
                      ? "text-red-600"
                      : item.daysOld > 60
                      ? "text-yellow-600"
                      : undefined
                  }
                >
                  {item.daysOld}d
                </span>
              </TableCell>
              <TableCell className="text-right">
                {formatCurrency(item.unitCogs)}
              </TableCell>
              <TableCell>
                <Badge variant="secondary">
                  {item.batchStatus.replace(/_/g, " ")}
                </Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

/**
 * Supply history tab with collapsible lot details
 */
function SupplyHistoryTab({
  history,
}: {
  history: Array<{
    lotId: number;
    lotCode: string;
    supplyDate: string;
    products: Array<{
      productId: number;
      productName: string;
      category: string;
      batchCode: string;
      quantitySupplied: number;
      unitCogs: number;
      totalCogs: number;
    }>;
    totalValue: number;
  }>;
}) {
  const [expandedLots, setExpandedLots] = useState<Set<number>>(new Set());

  const toggleLot = (lotId: number) => {
    setExpandedLots((prev) => {
      const next = new Set(prev);
      if (next.has(lotId)) {
        next.delete(lotId);
      } else {
        next.add(lotId);
      }
      return next;
    });
  };

  if (history.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No supply history available
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {history.map((lot) => (
        <Card key={lot.lotId}>
          <CardHeader
            className="py-3 px-4 cursor-pointer hover:bg-muted/50"
            onClick={() => toggleLot(lot.lotId)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {expandedLots.has(lot.lotId) ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
                <div>
                  <div className="font-mono text-sm">{lot.lotCode}</div>
                  <div className="text-xs text-muted-foreground">
                    {format(new Date(lot.supplyDate), "MMM d, yyyy")} -{" "}
                    {lot.products.length} items
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-medium">{formatCurrency(lot.totalValue)}</div>
              </div>
            </div>
          </CardHeader>
          {expandedLots.has(lot.lotId) && (
            <CardContent className="pt-0 px-4 pb-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit COGS</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lot.products.map((product, idx) => (
                    <TableRow key={`${lot.lotId}-${product.batchCode}-${idx}`}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{product.productName}</div>
                          <div className="text-xs text-muted-foreground">
                            {product.category} - {product.batchCode}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {product.quantitySupplied.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(product.unitCogs)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(product.totalCogs)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

/**
 * Main VendorContextPanel component
 */
export function VendorContextPanel({
  clientId,
  dateRange,
  compact = false,
  onProductClick,
  onBatchClick,
}: VendorContextPanelProps) {
  const { data, isLoading, error } = trpc.vendors.getContext.useQuery({
    clientId,
    dateRange,
    includeActiveInventory: true,
    includePaymentHistory: true,
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-32" />
          <div className="grid grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-20" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            <span>Failed to load vendor context: {error.message}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!data?.data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No vendor data available
          </div>
        </CardContent>
      </Card>
    );
  }

  const context = data.data;

  if (compact) {
    // Compact mode: just show vendor info and key metrics
    return (
      <Card>
        <CardContent className="p-4 space-y-4">
          <VendorInfoSection vendor={context.vendor} />
          <MetricsCards metrics={context.aggregateMetrics} />
          {context.relatedBrands.length > 0 && (
            <VendorWithBrands
              vendorName={context.vendor.name}
              brands={context.relatedBrands}
            />
          )}
        </CardContent>
      </Card>
    );
  }

  // Full mode: tabbed interface with all details
  return (
    <Card>
      <CardContent className="p-6 space-y-6">
        <VendorInfoSection vendor={context.vendor} />
        <MetricsCards metrics={context.aggregateMetrics} />

        {context.relatedBrands.length > 0 && (
          <VendorWithBrands
            vendorName={context.vendor.name}
            brands={context.relatedBrands}
          />
        )}

        <Tabs defaultValue="performance" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="performance" className="flex items-center gap-1">
              <TrendingUp className="h-4 w-4" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="inventory" className="flex items-center gap-1">
              <Package className="h-4 w-4" />
              Inventory
            </TabsTrigger>
            <TabsTrigger value="history" className="flex items-center gap-1">
              <History className="h-4 w-4" />
              History
            </TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="mt-4">
            <ProductPerformanceTab
              products={context.productPerformance}
              onProductClick={onProductClick}
            />
          </TabsContent>

          <TabsContent value="inventory" className="mt-4">
            <ActiveInventoryTab
              inventory={context.activeInventory}
              onBatchClick={onBatchClick}
            />
          </TabsContent>

          <TabsContent value="history" className="mt-4">
            <SupplyHistoryTab history={context.supplyHistory} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

export default VendorContextPanel;

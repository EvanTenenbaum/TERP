/**
 * OrderCOGSDetails Component
 * Shows COGS breakdown and related GL entries for an order
 * Part of TERP-0012 Phase 5: Order COGS Visibility
 */

import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ChevronDown,
  ChevronRight,
  DollarSign,
  TrendingUp,
  BookOpen,
  AlertCircle,
  Package,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";

interface OrderLineItem {
  id: number;
  productName: string;
  quantity: number;
  unitCogs: number;
  unitPrice: number;
  lineTotal: number;
  lineCogs: number;
  lineMargin: number;
  marginPercent: number;
  batchId?: number;
  cogsSource?: string;
}

interface GLEntry {
  id: number;
  entryNumber: string;
  entryDate: Date | null;
  accountId: number;
  accountNumber?: string;
  accountName?: string;
  debit: string;
  credit: string;
  description: string | null;
}

interface OrderCOGSDetailsProps {
  orderId: number;
  orderNumber?: string;
  lineItems: OrderLineItem[];
  totalCogs: number;
  totalRevenue: number;
  totalMargin: number;
  avgMarginPercent: number;
  showGLEntries?: boolean;
}

export function OrderCOGSDetails({
  orderId,
  orderNumber,
  lineItems,
  totalCogs,
  totalRevenue,
  totalMargin,
  avgMarginPercent,
  showGLEntries = true,
}: OrderCOGSDetailsProps) {
  const [isGLOpen, setIsGLOpen] = useState(false);

  // Fetch GL entries for this order
  const {
    data: glEntriesResult,
    isLoading: isLoadingGL,
    error: glError,
  } = trpc.accounting.ledger.list.useQuery(
    {
      referenceType: "ORDER",
      referenceId: orderId,
      limit: 50,
    },
    {
      enabled: showGLEntries && isGLOpen,
    }
  );

  const glEntries = (glEntriesResult?.items ?? []) as GLEntry[];

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const getMarginColor = (percent: number) => {
    if (percent < 0) return "text-red-600";
    if (percent < 5) return "text-orange-600";
    if (percent < 15) return "text-yellow-600";
    if (percent < 30) return "text-green-600";
    return "text-green-700";
  };

  const getMarginBadgeVariant = (
    percent: number
  ): "destructive" | "secondary" | "outline" | "default" => {
    if (percent < 0) return "destructive";
    if (percent < 15) return "secondary";
    return "outline";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Package className="h-5 w-5" />
          COGS & Margin Details
          {orderNumber && (
            <Badge variant="outline" className="ml-2 font-mono text-xs">
              {orderNumber}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Cost of goods sold breakdown and accounting entries
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Summary Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Revenue</div>
            <div className="text-lg font-semibold">
              {formatCurrency(totalRevenue)}
            </div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Total COGS
            </div>
            <div className="text-lg font-semibold text-muted-foreground">
              {formatCurrency(totalCogs)}
            </div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Gross Margin
            </div>
            <div
              className={`text-lg font-semibold ${getMarginColor(avgMarginPercent)}`}
            >
              {formatCurrency(totalMargin)}
            </div>
          </div>
          <div className="p-3 bg-muted/50 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">Margin %</div>
            <div className="flex items-center gap-2">
              <span
                className={`text-lg font-semibold ${getMarginColor(avgMarginPercent)}`}
              >
                {avgMarginPercent.toFixed(1)}%
              </span>
              <Badge variant={getMarginBadgeVariant(avgMarginPercent)}>
                {avgMarginPercent < 0
                  ? "Negative"
                  : avgMarginPercent < 15
                    ? "Low"
                    : avgMarginPercent < 30
                      ? "Fair"
                      : "Good"}
              </Badge>
            </div>
          </div>
        </div>

        {/* Line Items COGS Breakdown */}
        <div>
          <h4 className="text-sm font-medium mb-3">Line Item Breakdown</h4>
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Unit COGS</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Line COGS</TableHead>
                  <TableHead className="text-right">Margin</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lineItems.map(item => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{item.productName}</span>
                        {item.cogsSource && (
                          <span className="text-xs text-muted-foreground">
                            Source: {item.cogsSource}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatCurrency(item.unitCogs)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(item.unitPrice)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-muted-foreground">
                      {formatCurrency(item.lineCogs)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span
                          className={`font-mono ${getMarginColor(item.marginPercent)}`}
                        >
                          {formatCurrency(item.lineMargin)}
                        </span>
                        <Badge
                          variant={getMarginBadgeVariant(item.marginPercent)}
                          className="text-xs"
                        >
                          {item.marginPercent.toFixed(1)}%
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* GL Entries Section */}
        {showGLEntries && (
          <Collapsible open={isGLOpen} onOpenChange={setIsGLOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full flex items-center justify-between p-3 hover:bg-muted/50"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  <span className="font-medium">General Ledger Entries</span>
                  {glEntries.length > 0 && (
                    <Badge variant="secondary">{glEntries.length}</Badge>
                  )}
                </div>
                {isGLOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="border rounded-lg overflow-hidden mt-2">
                {isLoadingGL ? (
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                  </div>
                ) : glError ? (
                  <div className="p-4 flex items-center gap-2 text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    <span>Failed to load GL entries</span>
                  </div>
                ) : glEntries.length === 0 ? (
                  <div className="p-4 text-center text-muted-foreground">
                    No GL entries found for this order.
                    <br />
                    <span className="text-xs">
                      GL entries are created when the order is invoiced.
                    </span>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Entry #</TableHead>
                        <TableHead>Account</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">Debit</TableHead>
                        <TableHead className="text-right">Credit</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {glEntries.map(entry => (
                        <TableRow key={entry.id}>
                          <TableCell className="font-mono text-xs">
                            {entry.entryDate
                              ? format(new Date(entry.entryDate), "MMM d, yyyy")
                              : "-"}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {entry.entryNumber}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm">
                                {entry.accountName ?? entry.accountNumber}
                              </span>
                              {entry.accountNumber && entry.accountName && (
                                <span className="text-xs text-muted-foreground">
                                  {entry.accountNumber}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                            {entry.description}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {parseFloat(entry.debit) > 0
                              ? formatCurrency(parseFloat(entry.debit))
                              : "-"}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {parseFloat(entry.credit) > 0
                              ? formatCurrency(parseFloat(entry.credit))
                              : "-"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </CollapsibleContent>
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
}

export default OrderCOGSDetails;

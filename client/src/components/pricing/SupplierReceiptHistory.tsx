/**
 * SupplierReceiptHistory Component (MEET-063)
 * Links from current pricing to farmer's/supplier's past receipts
 * Quick access to historical purchase data for pricing decisions
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Truck,
  FileText,
  Calendar,
  Package,
  DollarSign,
  ExternalLink,
  ChevronRight,
  Search,
} from "lucide-react";
import { Input } from "@/components/ui/input";

interface SupplierReceiptHistoryProps {
  supplierId: number;
  supplierName?: string;
  productId?: number;
  productName?: string;
  onSelectPrice?: (price: number, receiptId: number) => void;
  compact?: boolean;
}

export function SupplierReceiptHistory({
  supplierId,
  supplierName,
  productId,
  productName,
  onSelectPrice,
  compact = false,
}: SupplierReceiptHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Fetch receipt history
  const { data: receipts, isLoading } =
    trpc.pricing.getSupplierReceiptHistory.useQuery(
      {
        supplierId,
        productId,
        limit: compact ? 5 : 50,
      },
      { enabled: supplierId > 0 }
    );

  const fmt = (value: number) =>
    `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  // Filter receipts based on search
  const filteredReceipts = receipts?.filter(
    r =>
      !searchTerm ||
      r.productName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return compact ? (
      <Skeleton className="h-6 w-32" />
    ) : (
      <Card>
        <CardContent className="py-4">
          <div className="space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!receipts || receipts.length === 0) {
    if (compact) {
      return (
        <Badge variant="outline" className="text-xs">
          No receipt history
        </Badge>
      );
    }
    return null;
  }

  // Compact inline button with dialog
  if (compact) {
    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="ghost" size="sm" className="h-auto px-2 py-1 text-xs">
            <FileText className="h-3 w-3 mr-1" />
            {receipts.length} Receipt{receipts.length !== 1 ? "s" : ""}
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5" />
              Receipt History
            </DialogTitle>
            <DialogDescription>
              {supplierName && (
                <>
                  Past purchases from <strong>{supplierName}</strong>
                </>
              )}
              {productName && (
                <>
                  {supplierName ? " for " : "Purchase history for "}
                  <strong>{productName}</strong>
                </>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Receipt Table */}
            <ScrollArea className="h-[400px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Unit Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    {onSelectPrice && <TableHead className="w-[60px]" />}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredReceipts?.map(receipt => (
                    <TableRow key={receipt.id}>
                      <TableCell className="whitespace-nowrap">
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3 text-muted-foreground" />
                          {formatDate(receipt.date)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Package className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate max-w-[150px]">
                            {receipt.productName}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {receipt.quantity.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {fmt(receipt.unitPrice)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-medium">
                        {fmt(receipt.totalPrice)}
                      </TableCell>
                      {onSelectPrice && (
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => {
                              onSelectPrice(receipt.unitPrice, receipt.id);
                              setDialogOpen(false);
                            }}
                          >
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Summary */}
            {filteredReceipts && filteredReceipts.length > 0 && (
              <>
                <Separator />
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>
                    {filteredReceipts.length} receipt
                    {filteredReceipts.length !== 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-4">
                    <span>
                      Avg:{" "}
                      <span className="font-mono font-medium text-foreground">
                        {fmt(
                          filteredReceipts.reduce((sum, r) => sum + r.unitPrice, 0) /
                            filteredReceipts.length
                        )}
                      </span>
                    </span>
                    <span>
                      Range:{" "}
                      <span className="font-mono font-medium text-foreground">
                        {fmt(Math.min(...filteredReceipts.map(r => r.unitPrice)))} -{" "}
                        {fmt(Math.max(...filteredReceipts.map(r => r.unitPrice)))}
                      </span>
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Full card view
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Truck className="h-4 w-4" />
            Supplier Receipt History
          </CardTitle>
          {receipts.length > 5 && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="ghost" size="sm">
                  View All ({receipts.length})
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                  <DialogTitle>Receipt History</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[400px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead className="text-right">Unit Price</TableHead>
                        <TableHead className="text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {receipts.map(receipt => (
                        <TableRow key={receipt.id}>
                          <TableCell>{formatDate(receipt.date)}</TableCell>
                          <TableCell>{receipt.productName}</TableCell>
                          <TableCell className="text-right font-mono">
                            {fmt(receipt.unitPrice)}
                          </TableCell>
                          <TableCell className="text-right font-mono">
                            {fmt(receipt.totalPrice)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Recent Receipts */}
        {receipts.slice(0, 5).map(receipt => (
          <div
            key={receipt.id}
            className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
            onClick={() => onSelectPrice?.(receipt.unitPrice, receipt.id)}
          >
            <div className="flex items-center gap-3">
              <div className="flex flex-col">
                <span className="text-sm font-medium">{receipt.productName}</span>
                <span className="text-xs text-muted-foreground">
                  {formatDate(receipt.date)} - {receipt.quantity.toLocaleString()}{" "}
                  units
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-right">
                <p className="font-mono font-medium">{fmt(receipt.unitPrice)}</p>
                <p className="text-xs text-muted-foreground">
                  {fmt(receipt.totalPrice)} total
                </p>
              </div>
              {onSelectPrice && (
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </div>
        ))}

        {/* Summary Stats */}
        <Separator />
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Count</p>
            <p className="font-medium">{receipts.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Avg Price</p>
            <p className="font-mono font-medium">
              {fmt(
                receipts.reduce((sum, r) => sum + r.unitPrice, 0) / receipts.length
              )}
            </p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Value</p>
            <p className="font-mono font-medium">
              {fmt(receipts.reduce((sum, r) => sum + r.totalPrice, 0))}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * ClientPreview Component
 * Side-by-side preview of what client will see (no COGS/margin data)
 * v2.0 Sales Order Enhancements
 */

import React from "react";
import { FileText, Eye } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface LineItem {
  productDisplayName?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  isSample: boolean;
}

interface ClientPreviewProps {
  clientName: string;
  items: LineItem[];
  subtotal: number;
  adjustmentAmount: number;
  adjustmentLabel: string;
  showAdjustment: boolean;
  total: number;
  orderType: "QUOTE" | "SALE";
  isDraft: boolean;
}

export function ClientPreview({
  clientName,
  items,
  subtotal,
  adjustmentAmount,
  adjustmentLabel,
  showAdjustment,
  total,
  orderType,
  isDraft: _isDraft,
}: ClientPreviewProps) {
  const fmt = (value: number) => `$${value.toFixed(2)}`;

  return (
    <Card className="border-2 border-primary/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Client Preview
          </CardTitle>
          <Badge variant="outline">
            {orderType === "QUOTE" ? "Quote" : "Invoice"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          This is what {clientName} will see
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between pb-2 border-b">
            <div>
              <h3 className="font-semibold text-lg">
                {orderType === "QUOTE" ? "Quote" : "Invoice"}
              </h3>
              <p className="text-sm text-muted-foreground">
                {clientName}
              </p>
            </div>
            <FileText className="h-8 w-8 text-muted-foreground" />
          </div>

          {/* Items Table */}
          {items.length > 0 ? (
            <div className="border rounded-md overflow-hidden bg-background">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qty</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={`${item.productDisplayName}-${item.quantity}-${item.unitPrice}-${index}`}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{item.productDisplayName || `Item ${index + 1}`}</span>
                          {item.isSample && (
                            <Badge variant="secondary" className="w-fit mt-1 text-xs">
                              Sample
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell className="text-right">{fmt(item.unitPrice)}</TableCell>
                      <TableCell className="text-right font-medium">
                        {fmt(item.lineTotal)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">No items</p>
            </div>
          )}

          {/* Totals */}
          {items.length > 0 && (
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{fmt(subtotal)}</span>
              </div>

              {showAdjustment && adjustmentAmount !== 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{adjustmentLabel}</span>
                  <span className={adjustmentAmount < 0 ? "text-red-600" : "text-green-600"}>
                    {adjustmentAmount < 0 ? "-" : "+"}
                    {fmt(Math.abs(adjustmentAmount))}
                  </span>
                </div>
              )}

              <Separator />

              <div className="flex items-center justify-between">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-bold">{fmt(total)}</span>
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-4 text-center">
          ℹ️ COGS and margin information is hidden from client
        </p>
      </CardContent>
    </Card>
  );
}


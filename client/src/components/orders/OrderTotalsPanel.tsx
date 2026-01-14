/**
 * OrderTotalsPanel Component
 * Displays order totals, COGS, margins, and warnings
 * v2.0 Sales Order Enhancements
 */

import React from "react";
import { AlertCircle, TrendingUp, DollarSign, Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import type { OrderTotals } from "@/hooks/orders/useOrderCalculations";

interface OrderTotalsPanelProps {
  totals: OrderTotals;
  warnings: string[];
  isValid: boolean;
}

export function OrderTotalsPanel({
  totals,
  warnings,
  isValid,
}: OrderTotalsPanelProps) {
  const fmt = (value: number) => `$${value.toFixed(2)}`;

  const getMarginColor = (percent: number) => {
    if (percent < 0) return "text-red-600";
    if (percent < 5) return "text-orange-600";
    if (percent < 15) return "text-yellow-600";
    if (percent < 30) return "text-green-600";
    return "text-green-700";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Order Totals
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Subtotal */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Subtotal</span>
          <span className="font-medium">{fmt(totals.subtotal)}</span>
        </div>

        {/* COGS */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <Package className="h-3 w-3" />
            Total COGS
          </span>
          <span className="font-medium text-muted-foreground">
            {fmt(totals.totalCogs)}
          </span>
        </div>

        {/* Margin */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground flex items-center gap-1">
            <TrendingUp className="h-3 w-3" />
            Total Margin
          </span>
          <div className="flex items-center gap-2">
            <span className={`font-semibold ${getMarginColor(totals.avgMarginPercent)}`}>
              {fmt(totals.totalMargin)}
            </span>
            <Badge variant="secondary" className="text-xs">
              {totals.avgMarginPercent.toFixed(1)}%
            </Badge>
          </div>
        </div>

        {/* Adjustment */}
        {totals.adjustmentAmount !== 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {totals.adjustmentAmount < 0 ? "Discount" : "Markup"}
              </span>
              <span className={`font-medium ${totals.adjustmentAmount < 0 ? "text-red-600" : "text-green-600"}`}>
                {totals.adjustmentAmount < 0 ? "-" : "+"}
                {fmt(Math.abs(totals.adjustmentAmount))}
              </span>
            </div>
          </>
        )}

        {/* Total */}
        <Separator />
        <div className="flex items-center justify-between">
          <span className="text-lg font-semibold">Total</span>
          <span className="text-2xl font-bold">{fmt(totals.total)}</span>
        </div>

        {/* Warnings */}
        {warnings.length > 0 && (
          <>
            <Separator />
            <div className="space-y-2">
              {warnings.map((warning, index) => (
                <Alert key={`warning-${index}-${warning.substring(0, 30)}`} variant="default" className="py-2">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    {warning}
                  </AlertDescription>
                </Alert>
              ))}
            </div>
          </>
        )}

        {/* Validity Badge */}
        {!isValid && (
          <Badge variant="destructive" className="w-full justify-center">
            Order has validation errors
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}


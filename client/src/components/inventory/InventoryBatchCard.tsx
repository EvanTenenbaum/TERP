/**
 * InventoryBatchCard
 *
 * Card component for displaying batch information in kanban board view.
 * Shows: strain name, supplier, quantity, price.
 */

import { memo } from "react";
import { Card } from "@/components/ui/card";
import { MonoId } from "@/components/ui/mono-id";

interface InventoryBatchCardProps {
  batch: {
    batchId: number;
    sku: string;
    productName: string;
    vendorName: string;
    brandName?: string;
    onHandQty: number;
    unitPrice: number | null;
    status: string;
  };
  onClick?: () => void;
}

const formatCurrency = (value: number | null) =>
  value === null
    ? "-"
    : new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
      }).format(value);

const formatQuantity = (value: number) =>
  value.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });

export const InventoryBatchCard = memo(function InventoryBatchCard({
  batch,
  onClick,
}: InventoryBatchCardProps) {
  return (
    <Card
      className="p-3 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="space-y-2">
        {/* SKU */}
        <div className="flex items-center justify-between">
          <MonoId value={batch.sku} className="text-xs" />
        </div>

        {/* Product Name */}
        <div className="font-medium text-sm leading-tight">
          {batch.productName}
        </div>

        {/* Supplier / Brand */}
        <div className="text-xs text-muted-foreground">
          {[
            batch.vendorName !== "-" ? batch.vendorName : null,
            batch.brandName && batch.brandName !== "-" ? batch.brandName : null,
          ]
            .filter(Boolean)
            .join(" / ") || "No supplier"}
        </div>

        {/* Quantity and Price */}
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Qty: <span className="font-medium">{formatQuantity(batch.onHandQty)}</span>
          </span>
          <span className="font-medium">{formatCurrency(batch.unitPrice)}</span>
        </div>
      </div>
    </Card>
  );
});

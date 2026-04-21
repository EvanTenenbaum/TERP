/**
 * ProductNameCell - Custom cell renderer for product names in grids
 * TER-1051: Display product/strain name prominently with supplier as secondary text
 */

import { cn } from "@/lib/utils";

interface ProductNameCellProps {
  productName: string;
  supplierName?: string | null;
  brandName?: string | null;
  className?: string;
}

/**
 * Renders product name prominently with supplier/brand as secondary muted text
 * Used in spreadsheet grid cells to emphasize strain/product over supplier
 */
export function ProductNameCell({
  productName,
  supplierName,
  brandName,
  className,
}: ProductNameCellProps) {
  // Build secondary line (supplier / brand)
  const secondaryParts = [supplierName, brandName]
    .filter(
      (value): value is string =>
        Boolean(value) && value !== "-" && value !== "Unknown"
    );

  return (
    <div className={cn("flex flex-col gap-0.5 py-1", className)}>
      <div className="font-medium text-sm leading-tight">{productName}</div>
      {secondaryParts.length > 0 && (
        <div className="text-xs text-muted-foreground leading-tight">
          {secondaryParts.join(" / ")}
        </div>
      )}
    </div>
  );
}

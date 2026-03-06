import { memo } from "react";
import { ImageIcon, PackageOpen, ScanSearch } from "lucide-react";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AgingBadge, type AgeBracket } from "@/components/inventory/AgingBadge";
import {
  StockStatusBadge,
  type StockStatus,
} from "@/components/inventory/StockStatusBadge";
import { INVENTORY_STATUS_TOKENS } from "@/lib/statusTokens";
import { cn } from "@/lib/utils";
import { getBrandLabel } from "@/lib/nomenclature";

interface BatchGalleryCardProps {
  sku: string;
  productName: string;
  brandName: string;
  vendorName: string;
  category?: string;
  status: string;
  onHandQty: string;
  reservedQty: string;
  availableQty: string;
  unitCogs?: string;
  stockStatus?: StockStatus;
  ageDays?: number;
  ageBracket?: AgeBracket;
  thumbnailUrl?: string;
  onOpen: () => void;
  onAdjustQuantity: () => void;
}

const formatQuantity = (value: string | number | null | undefined) => {
  const numeric =
    typeof value === "string" ? Number.parseFloat(value) : (value ?? 0);
  return Number.isFinite(numeric) ? numeric.toFixed(2) : "0.00";
};

const formatCurrency = (value: string | number | null | undefined) => {
  const numeric =
    typeof value === "string" ? Number.parseFloat(value) : (value ?? 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(numeric) ? numeric : 0);
};

const formatStatus = (status: string) =>
  status
    .split("_")
    .map(part => part.charAt(0) + part.slice(1).toLowerCase())
    .join(" ");

export const BatchGalleryCard = memo(function BatchGalleryCard({
  sku,
  productName,
  brandName,
  vendorName,
  category,
  status,
  onHandQty,
  reservedQty,
  availableQty,
  unitCogs,
  stockStatus,
  ageDays,
  ageBracket,
  thumbnailUrl,
  onOpen,
  onAdjustQuantity,
}: BatchGalleryCardProps) {
  const statusTone =
    INVENTORY_STATUS_TOKENS[status as keyof typeof INVENTORY_STATUS_TOKENS] ??
    "bg-slate-100 text-slate-700";

  return (
    <Card
      className="group overflow-hidden border-border/80 transition hover:border-primary/40 hover:shadow-md"
      data-testid={`batch-gallery-card-${sku}`}
    >
      <button
        type="button"
        onClick={onOpen}
        className="block w-full text-left"
        aria-label={`Open batch drawer for ${sku}`}
      >
        <div className="relative aspect-[4/3] overflow-hidden bg-muted/30">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt={productName}
              className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.02]"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-8 w-8" aria-hidden="true" />
            </div>
          )}
          <Badge
            variant="secondary"
            className={cn("absolute left-3 top-3 border-0", statusTone)}
          >
            {formatStatus(status)}
          </Badge>
        </div>

        <CardHeader className="space-y-3 pb-3">
          <div className="space-y-1">
            <p className="font-mono text-xs uppercase tracking-wide text-muted-foreground">
              {sku}
            </p>
            <h3 className="line-clamp-2 text-base font-semibold">
              {productName}
            </h3>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">
                {getBrandLabel(category)}
              </p>
              <p className="line-clamp-1 font-medium">{brandName || "-"}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Supplier</p>
              <p className="line-clamp-1 font-medium">{vendorName || "-"}</p>
            </div>
          </div>
        </CardHeader>
      </button>

      <CardContent className="space-y-3 pt-0">
        <div className="grid grid-cols-3 gap-3 rounded-lg border bg-muted/20 p-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">On Hand</p>
            <p className="font-semibold">{formatQuantity(onHandQty)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Reserved</p>
            <p className="font-semibold">{formatQuantity(reservedQty)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Available</p>
            <p className="font-semibold text-emerald-700">
              {formatQuantity(availableQty)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {stockStatus ? (
            <StockStatusBadge status={stockStatus} showIcon={false} />
          ) : null}
          {typeof ageDays === "number" && ageDays > 0 ? (
            <AgingBadge
              ageDays={ageDays}
              ageBracket={ageBracket}
              variant="compact"
            />
          ) : null}
          <Badge variant="outline">{formatCurrency(unitCogs)}</Badge>
        </div>
      </CardContent>

      <CardFooter className="grid grid-cols-2 gap-2">
        <Button
          variant="outline"
          onClick={event => {
            event.stopPropagation();
            onOpen();
          }}
        >
          <ScanSearch className="mr-2 h-4 w-4" aria-hidden="true" />
          Open Drawer
        </Button>
        <Button
          variant="secondary"
          onClick={event => {
            event.stopPropagation();
            onAdjustQuantity();
          }}
        >
          <PackageOpen className="mr-2 h-4 w-4" aria-hidden="true" />
          Adjust Qty
        </Button>
      </CardFooter>
    </Card>
  );
});

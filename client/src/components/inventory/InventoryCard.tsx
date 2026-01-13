import { memo } from "react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Card, CardContent, CardHeader } from "../ui/card";
import { Edit, Eye } from "lucide-react";
import { getBrandLabel } from "@/lib/nomenclature";

interface InventoryCardProps {
  batch: {
    id: number;
    sku: string;
    productName: string;
    brandName: string;
    vendorName: string;
    category?: string; // ENH-007: Added for dynamic Brand/Farmer terminology
    grade: string;
    status: string;
    onHandQty: string;
    reservedQty: string;
    availableQty: string;
  };
  onView: (id: number) => void;
  onEdit?: (id: number) => void;
}

export const InventoryCard = memo(function InventoryCard({ batch, onView, onEdit }: InventoryCardProps) {
  const getStatusColor = (status: string) => {
    switch (status.toUpperCase()) {
      case "AWAITING_INTAKE":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "LIVE":
        return "bg-green-100 text-green-800 border-green-200";
      case "ON_HOLD":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "QUARANTINED":
        return "bg-red-100 text-red-800 border-red-200";
      case "SOLD_OUT":
        return "bg-gray-100 text-gray-800 border-gray-200";
      case "CLOSED":
        return "bg-gray-100 text-gray-600 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatStatus = (status: string) => {
    return status
      .split("_")
      .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
      .join(" ");
  };

  const isAwaitingIntake = batch.status.toUpperCase() === "AWAITING_INTAKE";

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-sm font-mono text-muted-foreground">{batch.sku}</p>
            <h3 className="text-lg font-semibold">{batch.productName}</h3>
          </div>
          <Badge className={getStatusColor(batch.status)} variant="outline">
            {formatStatus(batch.status)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Product Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            {/* ENH-007: Dynamic Brand/Farmer label based on category */}
            <p className="text-muted-foreground">{getBrandLabel(batch.category)}</p>
            <p className="font-medium">{batch.brandName}</p>
          </div>
          <div>
            {/* MEET-027: Vendor is the business entity */}
            <p className="text-muted-foreground">Vendor</p>
            <p className="font-medium">{batch.vendorName}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Grade</p>
            <p className="font-medium">{batch.grade}</p>
          </div>
        </div>

        {/* Quantity Details */}
        <div className="border-t pt-3">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-muted-foreground text-xs">On Hand</p>
              <p className="font-semibold">{parseFloat(batch.onHandQty).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Reserved</p>
              <p className="font-semibold">{parseFloat(batch.reservedQty).toFixed(2)}</p>
            </div>
            <div>
              <p className="text-muted-foreground text-xs">Available</p>
              <p className="font-semibold text-green-600">
                {parseFloat(batch.availableQty).toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => onView(batch.id)}
          >
            <Eye className="h-4 w-4 mr-2" />
            View
          </Button>
          {isAwaitingIntake && onEdit && (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => onEdit(batch.id)}
            >
              <Edit className="h-4 w-4 mr-2" />
              Intake
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
});
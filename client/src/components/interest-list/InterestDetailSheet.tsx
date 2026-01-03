/**
 * Interest Detail Sheet Component
 * ACT-003: Shows detailed information about an interest list item
 */

import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { Heart, ShoppingCart, User, Trash2 } from "lucide-react";
import { format } from "date-fns";

export type InterestItem = {
  id: number;
  clientId: number;
  clientName: string;
  productCategory: string;
  productDescription: string;
  quantityNeeded: number;
  maxPrice: number | null;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  status: "ACTIVE" | "FULFILLED" | "CANCELLED";
  neededBy: string | null;
  createdAt: string;
  matchCount: number;
};

interface InterestDetailSheetProps {
  item: InterestItem | null;
  onClose: () => void;
  onConvertToOrder: (item: InterestItem) => void;
  onDelete: (item: InterestItem) => void;
}

export function InterestDetailSheet({
  item,
  onClose,
  onConvertToOrder,
  onDelete,
}: InterestDetailSheetProps) {
  const [, setLocation] = useLocation();

  const getPriorityBadge = (priority: string) => {
    const variants: Record<
      string,
      "destructive" | "default" | "secondary" | "outline"
    > = {
      URGENT: "destructive",
      HIGH: "default",
      MEDIUM: "secondary",
      LOW: "outline",
    };
    return (
      <Badge variant={variants[priority] || "outline"} className="text-xs">
        {priority}
      </Badge>
    );
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      ACTIVE: "default",
      FULFILLED: "secondary",
      CANCELLED: "outline",
    };
    return (
      <Badge variant={variants[status] || "outline"} className="text-xs">
        {status}
      </Badge>
    );
  };

  if (!item) return null;

  return (
    <Sheet open={!!item} onOpenChange={open => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-3">
            <Heart className="h-5 w-5 text-pink-500" />
            Interest Details
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Client Info */}
          <div>
            <h3 className="font-semibold mb-3">Client Information</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Client:</span>
                <span className="font-medium">{item.clientName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created:</span>
                <span>{format(new Date(item.createdAt), "MMM dd, yyyy")}</span>
              </div>
            </div>
          </div>

          <Separator />

          {/* Product Details */}
          <div>
            <h3 className="font-semibold mb-3">Product Details</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Category:</span>
                <span>{item.productCategory}</span>
              </div>
              {item.productDescription && (
                <div>
                  <span className="text-muted-foreground">Description:</span>
                  <p className="mt-1">{item.productDescription}</p>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Quantity Needed:</span>
                <span className="font-mono">{item.quantityNeeded}</span>
              </div>
              {item.maxPrice && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Max Price:</span>
                  <span className="font-mono">${item.maxPrice}</span>
                </div>
              )}
            </div>
          </div>

          <Separator />

          {/* Status & Priority */}
          <div>
            <h3 className="font-semibold mb-3">Status</h3>
            <div className="flex gap-2">
              {getPriorityBadge(item.priority)}
              {getStatusBadge(item.status)}
            </div>
            {item.neededBy && (
              <p className="text-sm text-muted-foreground mt-2">
                Needed by: {format(new Date(item.neededBy), "MMM dd, yyyy")}
              </p>
            )}
          </div>

          <Separator />

          {/* Matches */}
          <div>
            <h3 className="font-semibold mb-3">Available Matches</h3>
            <Badge
              variant={item.matchCount > 0 ? "default" : "outline"}
              className="text-sm"
            >
              {item.matchCount} {item.matchCount === 1 ? "match" : "matches"}{" "}
              found
            </Badge>
            {item.matchCount > 0 && (
              <Button
                variant="link"
                size="sm"
                className="p-0 mt-2 h-auto"
                onClick={() => setLocation(`/matchmaking?needId=${item.id}`)}
              >
                View matching inventory →
              </Button>
            )}
          </div>

          <Separator />

          {/* Actions */}
          <div className="space-y-2">
            <Button className="w-full" onClick={() => onConvertToOrder(item)}>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Convert to Order
            </Button>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setLocation(`/clients/${item.clientId}`)}
            >
              <User className="h-4 w-4 mr-2" />
              View Client Profile
            </Button>
            <Button
              variant="destructive"
              className="w-full"
              onClick={() => onDelete(item)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove from List
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

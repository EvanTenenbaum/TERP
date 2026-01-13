/**
 * FloatingOrderPreview Component
 * Enhanced order preview with floating/sticky positioning, quick-edit capabilities,
 * and improved mobile responsiveness
 * Sprint 5.C.1: ENH-006 - Relocate Order Preview
 */

import React, { useState, useMemo } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Eye,
  ShoppingCart,
  X,
  Trash2,
  Edit2,
  Check,
  DollarSign,
  TrendingUp,
  Package,
  ChevronUp,
  ChevronDown,
  Minimize2,
  Maximize2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface LineItem {
  batchId: number;
  productDisplayName?: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  marginPercent?: number;
  marginDollar?: number;
  cogsPerUnit?: number;
  isSample?: boolean;
}

interface FloatingOrderPreviewProps {
  items: LineItem[];
  clientName: string;
  orderType: "QUOTE" | "SALE";
  subtotal: number;
  total: number;
  adjustmentAmount?: number;
  adjustmentLabel?: string;
  showAdjustment?: boolean;
  onUpdateItem?: (batchId: number, updates: Partial<LineItem>) => void;
  onRemoveItem?: (batchId: number) => void;
  className?: string;
  showInternalMetrics?: boolean;
}

export function FloatingOrderPreview({
  items,
  clientName,
  orderType,
  subtotal,
  total,
  adjustmentAmount = 0,
  adjustmentLabel = "Discount",
  showAdjustment = true,
  onUpdateItem,
  onRemoveItem,
  className,
  showInternalMetrics = true,
}: FloatingOrderPreviewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isMinimized, setIsMinimized] = useState(false);
  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState<string>("");
  const [editPrice, setEditPrice] = useState<string>("");

  const fmt = (value: number) => `$${value.toFixed(2)}`;

  // Calculate metrics
  const metrics = useMemo(() => {
    const totalCogs = items.reduce(
      (sum, item) => sum + (item.cogsPerUnit || 0) * item.quantity,
      0
    );
    const totalMargin = subtotal - totalCogs;
    const avgMarginPercent = subtotal > 0 ? (totalMargin / subtotal) * 100 : 0;
    const sampleCount = items.filter(i => i.isSample).length;
    return { totalCogs, totalMargin, avgMarginPercent, sampleCount };
  }, [items, subtotal]);

  const getMarginColor = (percent: number) => {
    if (percent >= 50) return "text-green-600";
    if (percent >= 30) return "text-yellow-600";
    if (percent >= 15) return "text-orange-600";
    return "text-red-600";
  };

  const handleStartEdit = (item: LineItem) => {
    setEditingItem(item.batchId);
    setEditQuantity(item.quantity.toString());
    setEditPrice(item.unitPrice.toString());
  };

  const handleSaveEdit = (batchId: number) => {
    if (onUpdateItem) {
      const quantity = parseInt(editQuantity) || 1;
      const unitPrice = parseFloat(editPrice) || 0;
      onUpdateItem(batchId, {
        quantity,
        unitPrice,
        lineTotal: quantity * unitPrice,
      });
    }
    setEditingItem(null);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditQuantity("");
    setEditPrice("");
  };

  // Mobile Sheet Version
  const MobilePreview = () => (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          variant="default"
          size="lg"
          className="fixed bottom-4 right-4 z-50 shadow-lg md:hidden flex items-center gap-2"
        >
          <ShoppingCart className="h-5 w-5" />
          <span>{items.length}</span>
          {items.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {fmt(total)}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Order Preview
          </SheetTitle>
          <SheetDescription>
            {orderType === "QUOTE" ? "Quote" : "Sale"} for {clientName}
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 h-full overflow-hidden flex flex-col">
          <PreviewContent isMobile />
        </div>
      </SheetContent>
    </Sheet>
  );

  // Desktop Floating Card Version
  const DesktopPreview = () => (
    <Card
      className={cn(
        "hidden md:block sticky top-4 transition-all duration-200",
        isMinimized ? "h-auto" : "",
        className
      )}
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            <span className="font-semibold">Order Preview</span>
          </CardTitle>
          <div className="flex items-center gap-1">
            <Badge variant={orderType === "QUOTE" ? "outline" : "default"}>
              {orderType === "QUOTE" ? "Quote" : "Sale"}
            </Badge>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => setIsMinimized(!isMinimized)}
                  >
                    {isMinimized ? (
                      <Maximize2 className="h-4 w-4" />
                    ) : (
                      <Minimize2 className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {isMinimized ? "Expand preview" : "Minimize preview"}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          What {clientName} will see
        </p>
      </CardHeader>
      {!isMinimized && (
        <CardContent className="pt-2">
          <PreviewContent />
        </CardContent>
      )}
      {isMinimized && (
        <CardContent className="pt-0 pb-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {items.length} item{items.length !== 1 ? "s" : ""}
            </span>
            <span className="font-bold text-lg">{fmt(total)}</span>
          </div>
        </CardContent>
      )}
    </Card>
  );

  // Shared Preview Content
  const PreviewContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="space-y-4 flex-1 flex flex-col min-h-0">
      {/* Quick Stats Bar */}
      {items.length > 0 && showInternalMetrics && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <Package className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <div className="text-lg font-bold">{items.length}</div>
            <div className="text-xs text-muted-foreground">Items</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <DollarSign className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <div className="text-lg font-bold">{fmt(subtotal)}</div>
            <div className="text-xs text-muted-foreground">Subtotal</div>
          </div>
          <div className="bg-muted/50 rounded-lg p-2 text-center">
            <TrendingUp className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <div
              className={cn(
                "text-lg font-bold",
                getMarginColor(metrics.avgMarginPercent)
              )}
            >
              {metrics.avgMarginPercent.toFixed(1)}%
            </div>
            <div className="text-xs text-muted-foreground">Margin</div>
          </div>
        </div>
      )}

      {/* Items List */}
      {items.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground flex-1 flex flex-col justify-center">
          <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
          <p className="font-medium">No items added yet</p>
          <p className="text-sm">Browse inventory to add items</p>
        </div>
      ) : (
        <>
          {/* Collapsible Items Section */}
          <div className="flex-1 min-h-0">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Line Items ({items.length})
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-7 px-2"
              >
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </div>

            {isExpanded && (
              <ScrollArea className={isMobile ? "h-[35vh]" : "max-h-[300px]"}>
                <div className="space-y-2 pr-2">
                  {items.map(item => (
                    <div
                      key={item.batchId}
                      className={cn(
                        "p-3 rounded-lg border bg-card",
                        editingItem === item.batchId && "ring-2 ring-primary"
                      )}
                    >
                      {editingItem === item.batchId ? (
                        // Edit Mode
                        <div className="space-y-2">
                          <div className="font-medium text-sm truncate">
                            {item.productDisplayName || `Item #${item.batchId}`}
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-xs text-muted-foreground">
                                Qty
                              </label>
                              <Input
                                type="number"
                                min="1"
                                value={editQuantity}
                                onChange={e => setEditQuantity(e.target.value)}
                                className="h-8"
                              />
                            </div>
                            <div>
                              <label className="text-xs text-muted-foreground">
                                Price
                              </label>
                              <Input
                                type="number"
                                min="0"
                                step="0.01"
                                value={editPrice}
                                onChange={e => setEditPrice(e.target.value)}
                                className="h-8"
                              />
                            </div>
                          </div>
                          <div className="flex gap-1 justify-end">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={handleCancelEdit}
                              className="h-7"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleSaveEdit(item.batchId)}
                              className="h-7"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">
                              {item.productDisplayName ||
                                `Item #${item.batchId}`}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {item.quantity} x {fmt(item.unitPrice)}
                              {item.isSample && (
                                <Badge
                                  variant="secondary"
                                  className="ml-2 text-xs"
                                >
                                  Sample
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="font-semibold text-sm">
                              {fmt(item.lineTotal)}
                            </span>
                            {onUpdateItem && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => handleStartEdit(item)}
                              >
                                <Edit2 className="h-3 w-3" />
                              </Button>
                            )}
                            {onRemoveItem && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 text-destructive hover:text-destructive"
                                onClick={() => onRemoveItem(item.batchId)}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>

          <Separator />

          {/* Totals Section */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>

            {showAdjustment && adjustmentAmount !== 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{adjustmentLabel}</span>
                <span
                  className={
                    adjustmentAmount < 0 ? "text-red-600" : "text-green-600"
                  }
                >
                  {adjustmentAmount < 0 ? "-" : "+"}
                  {fmt(Math.abs(adjustmentAmount))}
                </span>
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <span className="font-semibold">Total</span>
              <span className="text-2xl font-bold text-primary">
                {fmt(total)}
              </span>
            </div>

            {/* Internal Margin Info (not shown to client) */}
            {showInternalMetrics && items.length > 0 && (
              <div className="text-xs text-muted-foreground bg-muted/30 rounded p-2 mt-2">
                <div className="flex justify-between">
                  <span>Est. Profit:</span>
                  <span className="text-green-600">
                    {fmt(metrics.totalMargin)}
                  </span>
                </div>
                {metrics.sampleCount > 0 && (
                  <div className="flex justify-between mt-1">
                    <span>Samples included:</span>
                    <span>{metrics.sampleCount}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  return (
    <>
      <MobilePreview />
      <DesktopPreview />
    </>
  );
}

export default FloatingOrderPreview;

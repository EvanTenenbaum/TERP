import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Trash2, Save, X, GripVertical, Copy, FileText, Image as ImageIcon, Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

interface SalesSheetPreviewProps {
  items: any[];
  onRemoveItem: (itemId: number) => void;
  onClearAll: () => void;
  onSave: () => void;
  clientId: number;
}

interface SalesSheetItem {
  id: number;
  name: string;
  category?: string;
  quantity: number;
  basePrice: number;
  retailPrice: number;
  priceOverride?: number;
}

function SortableItem({ item, index, onRemove, onPriceOverride }: any) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const [isEditing, setIsEditing] = useState(false);
  const [overrideValue, setOverrideValue] = useState(item.priceOverride?.toString() || "");

  const displayPrice = item.priceOverride || item.retailPrice;
  const hasOverride = !!item.priceOverride;

  const handleSaveOverride = () => {
    const value = parseFloat(overrideValue);
    if (!isNaN(value) && value > 0) {
      onPriceOverride(item.id, value);
      setIsEditing(false);
    }
  };

  const handleResetOverride = () => {
    onPriceOverride(item.id, null);
    setOverrideValue("");
    setIsEditing(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
    >
      <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing mt-1">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>
      
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <p className="font-medium text-sm truncate">
              {index + 1}. {item.name}
            </p>
            {item.category && (
              <Badge variant="outline" className="mt-1 text-xs">
                {item.category}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(item.id)}
            className="h-8 w-8 p-0"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="mt-2 flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {item.quantity.toFixed(2)} units
          </span>
          
          {isEditing ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                value={overrideValue}
                onChange={(e) => setOverrideValue(e.target.value)}
                className="h-7 w-24 text-right"
                autoFocus
              />
              <Button size="sm" variant="ghost" onClick={handleSaveOverride}>
                Save
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {hasOverride && (
                <span className="text-xs text-muted-foreground line-through">
                  ${item.retailPrice.toFixed(2)}
                </span>
              )}
              <span
                className="font-semibold cursor-pointer hover:underline"
                onClick={() => {
                  setOverrideValue(displayPrice.toString());
                  setIsEditing(true);
                }}
              >
                ${displayPrice.toFixed(2)}
                {hasOverride && (
                  <Badge variant="secondary" className="ml-2 text-xs">
                    Override
                  </Badge>
                )}
              </span>
              {hasOverride && (
                <Button size="sm" variant="ghost" onClick={handleResetOverride} className="h-6 px-2">
                  Reset
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function SalesSheetPreview({
  items: initialItems,
  onRemoveItem,
  onClearAll,
  onSave,
  clientId,
}: SalesSheetPreviewProps) {
  const [items, setItems] = useState<SalesSheetItem[]>(initialItems);
  const [priceOverrides, setPriceOverrides] = useState<Map<number, number>>(new Map());
  
  const utils = trpc.useUtils();

  // Update items when props change
  useState(() => {
    setItems(initialItems);
  });

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Handle price override
  const handlePriceOverride = (itemId: number, price: number | null) => {
    const newOverrides = new Map(priceOverrides);
    if (price === null) {
      newOverrides.delete(itemId);
    } else {
      newOverrides.set(itemId, price);
    }
    setPriceOverrides(newOverrides);
  };

  // Get item with override
  const getItemWithOverride = (item: any) => ({
    ...item,
    priceOverride: priceOverrides.get(item.id),
  });

  // Calculate totals
  const totalItems = initialItems.length;
  const totalValue = initialItems.reduce((sum, item) => {
    const price = priceOverrides.get(item.id) || item.retailPrice;
    return sum + price;
  }, 0);

  // Save mutation
  const saveMutation = trpc.salesSheets.save.useMutation({
    onSuccess: () => {
      toast.success("Sales sheet saved successfully");
      utils.salesSheets.getHistory.invalidate();
    },
    onError: (error) => {
      toast.error("Failed to save sales sheet: " + error.message);
    },
  });

  // Handle save
  const handleSave = () => {
    const itemsToSave = initialItems.map((item) => ({
      ...item,
      finalPrice: priceOverrides.get(item.id) || item.retailPrice,
    }));

    saveMutation.mutate({
      clientId,
      items: itemsToSave,
      totalValue,
    });
  };

  // Handle copy to clipboard
  const handleCopyToClipboard = () => {
    const text = initialItems.map((item, index) => {
      const price = priceOverrides.get(item.id) || item.retailPrice;
      return `${index + 1}. ${item.name} - $${price.toFixed(2)}`;
    }).join('\n');

    const fullText = `Sales Sheet\n\n${text}\n\nTotal: ${totalItems} items - $${totalValue.toFixed(2)}`;

    navigator.clipboard.writeText(fullText).then(() => {
      toast.success("Copied to clipboard");
    }).catch(() => {
      toast.error("Failed to copy to clipboard");
    });
  };

  // Handle export as image
  const handleExportAsImage = async () => {
    const element = document.getElementById('sales-sheet-preview');
    if (!element) return;

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        backgroundColor: '#ffffff',
      });
      
      const link = document.createElement('a');
      link.download = `sales-sheet-${Date.now()}.png`;
      link.href = canvas.toDataURL();
      link.click();
      
      toast.success("Image exported successfully");
    } catch (error) {
      toast.error("Failed to export image");
    }
  };

  // Handle export as PDF
  const handleExportAsPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text('Sales Sheet', 20, 20);
    
    doc.setFontSize(12);
    let y = 40;
    
    initialItems.forEach((item, index) => {
      const price = priceOverrides.get(item.id) || item.retailPrice;
      doc.text(`${index + 1}. ${item.name} - $${price.toFixed(2)}`, 20, y);
      y += 10;
      
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
    });
    
    y += 10;
    doc.setFontSize(14);
    doc.text(`Total: ${totalItems} items - $${totalValue.toFixed(2)}`, 20, y);
    
    doc.save(`sales-sheet-${Date.now()}.pdf`);
    toast.success("PDF exported successfully");
  };

  return (
    <Card className="sticky top-6" id="sales-sheet-preview">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Sales Sheet Preview</CardTitle>
            <CardDescription>
              {totalItems} item{totalItems !== 1 ? "s" : ""} selected
            </CardDescription>
          </div>
          {initialItems.length > 0 && (
            <Button variant="ghost" size="sm" onClick={onClearAll}>
              <X className="mr-2 h-4 w-4" />
              Clear All
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {initialItems.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-sm">No items selected</p>
            <p className="text-xs mt-2">Add items from the inventory browser</p>
          </div>
        ) : (
          <>
            <ScrollArea className="h-[400px] pr-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={initialItems.map(item => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {initialItems.map((item, index) => (
                      <SortableItem
                        key={item.id}
                        item={getItemWithOverride(item)}
                        index={index}
                        onRemove={onRemoveItem}
                        onPriceOverride={handlePriceOverride}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            </ScrollArea>

            <Separator />

            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total Items:</span>
                <span className="font-medium">{totalItems}</span>
              </div>
              <div className="flex justify-between text-lg font-bold">
                <span>Total Value:</span>
                <span>${totalValue.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Button onClick={handleSave} className="w-full" disabled={saveMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {saveMutation.isPending ? "Saving..." : "Save Sheet"}
              </Button>
              
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportAsImage}>
                  <ImageIcon className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm" onClick={handleExportAsPDF}>
                  <FileText className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}


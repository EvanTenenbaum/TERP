import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, CheckSquare, Square } from "lucide-react";
import { StrainFamilyIndicator } from "@/components/strain/StrainComponents";

interface InventoryBrowserProps {
  inventory: any[];
  isLoading: boolean;
  onAddItems: (items: any[]) => void;
  selectedItems: any[];
}

export function InventoryBrowser({
  inventory,
  isLoading,
  onAddItems,
  selectedItems,
}: InventoryBrowserProps) {
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Filter inventory by search, ensuring items have valid data
  const filteredInventory = inventory.filter((item) => {
    // Skip items without valid id or name
    if (!item || item.id === undefined || item.id === null || !item.name) {
      return false;
    }
    return (
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category?.toLowerCase().includes(search.toLowerCase()) ||
      item.strain?.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Check if item is already in sheet
  const isInSheet = (itemId: number) => {
    return selectedItems.some((item) => item.id === itemId);
  };

  // Toggle item selection
  const toggleSelection = (itemId: number) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(itemId)) {
      newSelected.delete(itemId);
    } else {
      newSelected.add(itemId);
    }
    setSelectedIds(newSelected);
  };

  // Select all visible items
  const selectAll = () => {
    const allIds = new Set(filteredInventory.map((item) => item.id));
    setSelectedIds(allIds);
  };

  // Clear selection
  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  // Add selected items to sheet
  const addSelectedToSheet = () => {
    const itemsToAdd = inventory.filter((item) => selectedIds.has(item.id));
    onAddItems(itemsToAdd);
    setSelectedIds(new Set());
  };

  // Add single item to sheet
  const addSingleItem = (item: any) => {
    onAddItems([item]);
  };

  // Calculate markup percentage
  const calculateMarkup = (basePrice: number, retailPrice: number) => {
    if (basePrice === 0) return 0;
    return ((retailPrice - basePrice) / basePrice) * 100;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-12">
            <p className="text-muted-foreground">Loading inventory...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle>Inventory</CardTitle>
            <CardDescription>
              Browse and select items to add to the sales sheet
            </CardDescription>
          </div>
          {selectedIds.size > 0 && (
            <Button onClick={addSelectedToSheet}>
              <Plus className="mr-2 h-4 w-4" />
              Add Selected ({selectedIds.size})
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" size="sm" onClick={selectAll}>
            <CheckSquare className="mr-2 h-4 w-4" />
            Select All
          </Button>
          <Button variant="outline" size="sm" onClick={clearSelection}>
            <Square className="mr-2 h-4 w-4" />
            Clear
          </Button>
        </div>

        <div className="rounded-md border max-h-[600px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12"></TableHead>
                <TableHead>Item</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Qty</TableHead>
                <TableHead>Base Price</TableHead>
                <TableHead>Retail Price</TableHead>
                <TableHead>Markup</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No inventory items found
                  </TableCell>
                </TableRow>
              ) : (
                filteredInventory.map((item) => {
                  const markup = calculateMarkup(item.basePrice, item.retailPrice);
                  const alreadyInSheet = isInSheet(item.id);
                  
                  return (
                    <TableRow key={item.id} className={alreadyInSheet ? "opacity-50" : ""}>
                      <TableCell>
                        <Checkbox
                          checked={selectedIds.has(item.id)}
                          onCheckedChange={() => toggleSelection(item.id)}
                          disabled={alreadyInSheet}
                        />
                      </TableCell>
                      <TableCell className="font-medium">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            {item.name}
                            {alreadyInSheet && (
                              <Badge variant="secondary" className="text-xs">
                                In Sheet
                              </Badge>
                            )}
                          </div>
                          {item.strainId && (
                            <StrainFamilyIndicator strainId={item.strainId} />
                          )}
                          {item.quantity <= 0 && item.strainId && (
                            <span className="text-xs text-destructive">Out of stock</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{item.category || "N/A"}</Badge>
                      </TableCell>
                      <TableCell>{item.quantity.toFixed(2)}</TableCell>
                      <TableCell>${item.basePrice.toFixed(2)}</TableCell>
                      <TableCell className="font-semibold">
                        ${item.retailPrice.toFixed(2)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={markup > 0 ? "default" : "secondary"}>
                          {markup > 0 ? "+" : ""}{markup.toFixed(1)}%
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => addSingleItem(item)}
                          disabled={alreadyInSheet}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        <div className="text-sm text-muted-foreground">
          Showing {filteredInventory.length} of {inventory.length} items
        </div>
      </CardContent>
    </Card>
  );
}


import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";
import { InventoryBrowser } from "@/components/sales/InventoryBrowser";
import { SalesSheetPreview } from "@/components/sales/SalesSheetPreview";

export default function SalesSheetCreatorPage() {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);

  // Fetch clients
  const { data: clients } = trpc.clients.list.useQuery({ limit: 1000 });

  // Fetch inventory with pricing when client is selected
  const { data: inventory, isLoading: inventoryLoading } = trpc.salesSheets.getInventory.useQuery(
    { clientId: selectedClientId! },
    { enabled: !!selectedClientId }
  );

  // Handle add items to sheet
  const handleAddItems = (items: any[]) => {
    // Prevent duplicates
    const newItems = items.filter(
      (item) => !selectedItems.some((selected) => selected.id === item.id)
    );
    setSelectedItems([...selectedItems, ...newItems]);
  };

  // Handle remove item from sheet
  const handleRemoveItem = (itemId: number) => {
    setSelectedItems(selectedItems.filter((item) => item.id !== itemId));
  };

  // Handle clear all items
  const handleClearAll = () => {
    setSelectedItems([]);
  };

  // Handle save sheet
  const handleSaveSheet = () => {
    if (!selectedClientId || selectedItems.length === 0) return;
    
    const totalValue = selectedItems.reduce((sum, item) => sum + item.retailPrice, 0);
    
    // Will be implemented in Phase 5
    console.log("Save sheet:", { clientId: selectedClientId, items: selectedItems, totalValue });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6" />
            <div>
              <CardTitle className="text-2xl">Sales Sheet Creator</CardTitle>
              <CardDescription>
                Create customized sales sheets with dynamic pricing for your clients
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Label htmlFor="client-select">Select Client</Label>
            <Select
              value={selectedClientId?.toString() || ""}
              onValueChange={(value) => setSelectedClientId(parseInt(value))}
            >
              <SelectTrigger id="client-select" className="mt-2">
                <SelectValue placeholder="Choose a client..." />
              </SelectTrigger>
              <SelectContent>
                {clients?.filter((c) => c.isBuyer).map((client) => (
                  <SelectItem key={client.id} value={client.id.toString()}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedClientId ? (
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Left Panel: Inventory Browser (60%) */}
              <div className="lg:col-span-3">
                <InventoryBrowser
                  inventory={inventory || []}
                  isLoading={inventoryLoading}
                  onAddItems={handleAddItems}
                  selectedItems={selectedItems}
                />
              </div>

              {/* Right Panel: Sales Sheet Preview (40%) */}
              <div className="lg:col-span-2">
                <SalesSheetPreview
                  items={selectedItems}
                  onRemoveItem={handleRemoveItem}
                  onClearAll={handleClearAll}
                  onSave={handleSaveSheet}
                  clientId={selectedClientId}
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Select a client to start creating a sales sheet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


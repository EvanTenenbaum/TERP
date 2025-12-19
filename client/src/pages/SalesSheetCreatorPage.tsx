import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { InventoryBrowser } from "@/components/sales/InventoryBrowser";
import { SalesSheetPreview } from "@/components/sales/SalesSheetPreview";
import { ClientCombobox } from "@/components/ui/client-combobox";

// Type for priced inventory items from the sales sheets API
interface PricedInventoryItem {
  id: number;
  name: string;
  category?: string;
  subcategory?: string;
  strain?: string;
  basePrice: number;
  retailPrice: number;
  quantity: number;
  grade?: string;
  vendor?: string;
  priceMarkup: number;
  appliedRules: Array<{
    ruleId: number;
    ruleName: string;
    adjustment: string;
  }>;
}

export default function SalesSheetCreatorPage() {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<PricedInventoryItem[]>([]);

  // Fetch clients
  const { data: clients } = trpc.clients.list.useQuery({ limit: 1000 });

  // Fetch inventory with pricing when client is selected
  const { data: inventory, isLoading: inventoryLoading } =
    trpc.salesSheets.getInventory.useQuery(
      { clientId: selectedClientId ?? 0 },
      { enabled: selectedClientId !== null && selectedClientId > 0 }
    );

  // Handle add items to sheet
  const handleAddItems = (items: PricedInventoryItem[]) => {
    // Prevent duplicates
    const newItems = items.filter(
      item => !selectedItems.some(selected => selected.id === item.id)
    );
    setSelectedItems([...selectedItems, ...newItems]);
  };

  // Handle remove item from sheet
  const handleRemoveItem = (itemId: number) => {
    setSelectedItems(selectedItems.filter(item => item.id !== itemId));
  };

  // Handle clear all items
  const handleClearAll = () => {
    setSelectedItems([]);
  };

  // Handle save sheet
  const handleSaveSheet = () => {
    if (!selectedClientId || selectedItems.length === 0) return;

    const totalValue = selectedItems.reduce(
      (sum, item) => sum + item.retailPrice,
      0
    );

    // Will be implemented in Phase 5
    console.log("Save sheet:", {
      clientId: selectedClientId,
      items: selectedItems,
      totalValue,
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <BackButton label="Back to Orders" to="/orders" className="mb-4" />
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <FileText className="h-6 w-6" />
            <div>
              <CardTitle className="text-2xl">Sales Sheet Creator</CardTitle>
              <CardDescription>
                Create customized sales sheets with dynamic pricing for your
                clients
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-6 space-y-2">
            <Label htmlFor="client-select">Select Client</Label>
            <ClientCombobox
              value={selectedClientId}
              onValueChange={setSelectedClientId}
              clients={(() => {
                const clientList = Array.isArray(clients)
                  ? clients
                  : (clients?.items ?? []);
                return clientList
                  .filter((c: { isBuyer?: boolean | null }) => c.isBuyer)
                  .map(
                    (c: {
                      id: number;
                      name: string;
                      email?: string | null;
                    }) => ({
                      id: c.id,
                      name: c.name,
                      email: c.email,
                    })
                  );
              })()}
              placeholder="Choose a client..."
              emptyText="No clients found"
            />
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

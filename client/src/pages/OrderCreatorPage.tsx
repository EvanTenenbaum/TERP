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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, ShoppingCart, UserPlus } from "lucide-react";
import { InventoryBrowser } from "@/components/sales/InventoryBrowser";
import { OrderPreview } from "@/components/orders/OrderPreview";
import { CreditLimitBanner } from "@/components/orders/CreditLimitBanner";
import { AddCustomerOverlay } from "@/components/orders/AddCustomerOverlay";
import { Button } from "@/components/ui/button";

export default function OrderCreatorPage() {
  const [orderType, setOrderType] = useState<"QUOTE" | "SALE">("SALE");
  const [isDraft, setIsDraft] = useState<boolean>(true);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [showAddCustomer, setShowAddCustomer] = useState(false);

  // Fetch clients
  const { data: clients } = trpc.clients.list.useQuery({ limit: 1000 });

  // Fetch client details for credit limit
  const { data: clientDetails } = trpc.clients.getById.useQuery(
    { clientId: selectedClientId! },
    { enabled: !!selectedClientId }
  );

  // Fetch inventory with pricing when client is selected
  const { data: inventory, isLoading: inventoryLoading } = trpc.salesSheets.getInventory.useQuery(
    { clientId: selectedClientId! },
    { enabled: !!selectedClientId }
  );

  // Handle add items to order
  const handleAddItems = (items: any[]) => {
    // Prevent duplicates
    const newItems = items.filter(
      (item) => !selectedItems.some((selected) => selected.batchId === item.id)
    );
    
    // Convert to order items format
    const orderItems = newItems.map((item) => ({
      batchId: item.id,
      displayName: item.sku,
      originalName: item.sku,
      quantity: 1,
      unitPrice: item.retailPrice || 0,
      isSample: false,
      // COGS will be calculated by backend
      unitCogs: 0,
      cogsMode: item.cogsMode,
      cogsSource: 'MIDPOINT',
      unitMargin: 0,
      marginPercent: 0,
      lineTotal: item.retailPrice || 0,
      lineCogs: 0,
      lineMargin: 0,
    }));
    
    setSelectedItems([...selectedItems, ...orderItems]);
  };

  // Handle remove item from order
  const handleRemoveItem = (batchId: number) => {
    setSelectedItems(selectedItems.filter((item) => item.batchId !== batchId));
  };

  // Handle clear all items
  const handleClearAll = () => {
    setSelectedItems([]);
  };

  // Handle item updates (quantity, price, display name, etc.)
  const handleUpdateItem = (batchId: number, updates: Partial<any>) => {
    setSelectedItems(
      selectedItems.map((item) =>
        item.batchId === batchId ? { ...item, ...updates } : item
      )
    );
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            {orderType === "QUOTE" ? (
              <FileText className="h-6 w-6" />
            ) : (
              <ShoppingCart className="h-6 w-6" />
            )}
            <div>
              <CardTitle className="text-2xl">
                {orderType === "QUOTE" ? "Quote Creator" : "Sale Creator"}
              </CardTitle>
              <CardDescription>
                {orderType === "QUOTE"
                  ? "Create quotes with dynamic pricing and convert to sales"
                  : "Create sales orders with payment terms and inventory tracking"}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Order Type Selector */}
            <div>
              <Label>Order Type</Label>
              <Tabs
                value={orderType}
                onValueChange={(value) => setOrderType(value as "QUOTE" | "SALE")}
                className="mt-2"
              >
                <TabsList className="grid w-full max-w-md grid-cols-2">
                  <TabsTrigger value="QUOTE">Quote</TabsTrigger>
                  <TabsTrigger value="SALE">Sale</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Client Selector */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label htmlFor="client-select">Select Customer</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAddCustomer(true)}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  New Customer
                </Button>
              </div>
              <Select
                value={selectedClientId?.toString() || ""}
                onValueChange={(value) => {
                  if (value === "__new__") {
                    setShowAddCustomer(true);
                  } else {
                    setSelectedClientId(parseInt(value));
                    setSelectedItems([]); // Clear items when changing client
                  }
                }}
              >
                <SelectTrigger id="client-select">
                  <SelectValue placeholder="Choose a customer..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__new__" className="font-semibold text-primary">
                    + New Customer
                  </SelectItem>
                  {clients?.filter((c) => c.isBuyer).map((client) => (
                    <SelectItem key={client.id} value={client.id.toString()}>
                      {client.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Credit Limit Banner (only for sales) */}
            {selectedClientId && orderType === "SALE" && clientDetails && (
              <CreditLimitBanner
                client={clientDetails}
                orderTotal={selectedItems.reduce((sum, item) => sum + item.lineTotal, 0)}
              />
            )}

            {/* Main Content: Inventory Browser + Order Preview */}
            {selectedClientId ? (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Left Panel: Inventory Browser (60%) */}
                <div className="lg:col-span-3">
                  <InventoryBrowser
                    inventory={inventory || []}
                    isLoading={inventoryLoading}
                    onAddItems={handleAddItems}
                    selectedItems={selectedItems.map(item => ({ id: item.batchId }))}
                  />
                </div>

                {/* Right Panel: Order Preview (40%) */}
                <div className="lg:col-span-2">
                  <OrderPreview
                    orderType={orderType}
                    isDraft={isDraft}
                    clientId={selectedClientId}
                    items={selectedItems}
                    onRemoveItem={handleRemoveItem}
                    onClearAll={handleClearAll}
                    onUpdateItem={handleUpdateItem}
                    clientDetails={clientDetails}
                  />
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                Select a client to begin creating an order
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Add Customer Overlay */}
      <AddCustomerOverlay
        open={showAddCustomer}
        onOpenChange={setShowAddCustomer}
        onSuccess={(clientId) => {
          setSelectedClientId(clientId);
          setSelectedItems([]);
        }}
      />
    </div>
  );
}


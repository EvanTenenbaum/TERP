/**
 * OrderCreatorPage V2.0
 * Complete sales order creation with COGS visibility, margin management,
 * and draft/finalize workflow
 * v2.0 Sales Order Enhancements
 */

import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ShoppingCart,
  Save,
  Eye,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

// Import new v2 components
import { LineItemTable, type LineItem } from "@/components/orders/LineItemTable";
import { OrderAdjustmentPanel, type OrderAdjustment } from "@/components/orders/OrderAdjustmentPanel";
import { OrderTotalsPanel } from "@/components/orders/OrderTotalsPanel";
import { ClientPreview } from "@/components/orders/ClientPreview";
import { useOrderCalculations } from "@/hooks/orders/useOrderCalculations";

export default function OrderCreatorPageV2() {
  const navigate = useNavigate();

  // State
  const [clientId, setClientId] = useState<number | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [adjustment, setAdjustment] = useState<OrderAdjustment | null>(null);
  const [showAdjustmentOnDocument, setShowAdjustmentOnDocument] = useState(true);
  const [orderType, setOrderType] = useState<"QUOTE" | "SALE">("SALE");

  // Queries
  const { data: clients } = trpc.clients.list.useQuery({ limit: 1000 });
  const { data: clientDetails } = trpc.clients.getById.useQuery(
    { clientId: clientId! },
    { enabled: !!clientId }
  );

  // Calculations
  const { totals, warnings, isValid } = useOrderCalculations(items, adjustment);

  // Mutations
  const createDraftMutation = trpc.ordersEnhancedV2.createDraft.useMutation({
    onSuccess: (data) => {
      toast.success(`Draft order #${data.id} saved successfully`);
      // Reset form
      setItems([]);
      setAdjustment(null);
    },
    onError: (error) => {
      toast.error(`Failed to save draft: ${error.message}`);
    },
  });

  const finalizeMutation = trpc.ordersEnhancedV2.finalize.useMutation({
    onSuccess: (data) => {
      toast.success(`Order #${data.orderNumber} finalized successfully!`);
      // Navigate to order details or reset
      setItems([]);
      setAdjustment(null);
    },
    onError: (error) => {
      toast.error(`Failed to finalize order: ${error.message}`);
    },
  });

  // Handlers
  const handleSaveDraft = () => {
    if (!clientId) {
      toast.error("Please select a client");
      return;
    }

    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    createDraftMutation.mutate({
      orderType,
      clientId,
      lineItems: items.map(item => ({
        batchId: item.batchId,
        quantity: item.quantity,
        cogsPerUnit: item.cogsPerUnit,
        isCogsOverridden: item.isCogsOverridden,
        cogsOverrideReason: item.cogsOverrideReason,
        marginPercent: item.marginPercent,
        isMarginOverridden: item.isMarginOverridden,
        marginSource: item.marginSource,
      })),
      orderLevelAdjustment: adjustment,
      showAdjustmentOnDocument,
    });
  };

  const handlePreviewAndFinalize = () => {
    if (!isValid) {
      toast.error("Please fix validation errors before finalizing");
      return;
    }

    // Show confirmation dialog for finalize
    const confirmed = window.confirm(
      `Are you sure you want to finalize this ${orderType.toLowerCase()}?\n\n` +
      `Total: $${totals.total.toFixed(2)}\n` +
      `This will create the order and cannot be undone.`
    );

    if (!confirmed) return;

    finalizeMutation.mutate({
      orderType,
      clientId: clientId!,
      lineItems: items.map(item => ({
        batchId: item.batchId,
        quantity: item.quantity,
        cogsPerUnit: item.cogsPerUnit,
        isCogsOverridden: item.isCogsOverridden,
        cogsOverrideReason: item.cogsOverrideReason,
        marginPercent: item.marginPercent,
        isMarginOverridden: item.isMarginOverridden,
        marginSource: item.marginSource,
      })),
      orderLevelAdjustment: adjustment,
      showAdjustmentOnDocument,
    });
  };

  const handleAddItem = () => {
    // This would open an inventory browser modal
    // For now, just show a toast
    toast.info("Inventory browser integration coming soon");
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-6 w-6" />
              <div>
                <CardTitle className="text-2xl">Create Sales Order</CardTitle>
                <CardDescription>
                  Build order with COGS visibility and margin management
                </CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Select
                value={orderType}
                onValueChange={(value) => setOrderType(value as "QUOTE" | "SALE")}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SALE">Sale</SelectItem>
                  <SelectItem value="QUOTE">Quote</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Client Selector */}
          <div className="space-y-2">
            <Label htmlFor="client-select">Select Customer *</Label>
            <Select
              value={clientId?.toString() || ""}
              onValueChange={(value) => {
                setClientId(parseInt(value));
                // Clear items when changing client
                setItems([]);
              }}
            >
              <SelectTrigger id="client-select">
                <SelectValue placeholder="Choose a customer..." />
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
        </CardContent>
      </Card>

      {/* Main Content */}
      {clientId ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Line Items & Adjustment (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Line Items */}
            <Card>
              <CardContent className="pt-6">
                <LineItemTable
                  items={items}
                  clientId={clientId}
                  onChange={setItems}
                  onAddItem={handleAddItem}
                />
              </CardContent>
            </Card>

            {/* Order Adjustment */}
            <OrderAdjustmentPanel
              value={adjustment}
              subtotal={totals.subtotal}
              onChange={setAdjustment}
              showOnDocument={showAdjustmentOnDocument}
              onShowOnDocumentChange={setShowAdjustmentOnDocument}
            />
          </div>

          {/* Right Column: Totals & Preview (1/3) */}
          <div className="space-y-6">
            {/* Totals */}
            <OrderTotalsPanel
              totals={totals}
              warnings={warnings}
              isValid={isValid}
            />

            {/* Client Preview */}
            <ClientPreview
              clientName={clientDetails?.name || "Client"}
              items={items}
              subtotal={totals.subtotal}
              adjustmentAmount={totals.adjustmentAmount}
              adjustmentLabel={
                adjustment?.mode === "DISCOUNT" ? "Discount" : "Markup"
              }
              showAdjustment={showAdjustmentOnDocument}
              total={totals.total}
              orderType={orderType}
              isDraft={false}
            />

            {/* Actions */}
            <Card>
              <CardContent className="pt-6 space-y-3">
                <Button
                  className="w-full"
                  variant="outline"
                  onClick={handleSaveDraft}
                  disabled={items.length === 0 || createDraftMutation.isLoading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>

                <Button
                  className="w-full"
                  onClick={handlePreviewAndFinalize}
                  disabled={!isValid || finalizeMutation.isLoading}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Preview & Finalize
                </Button>

                {!isValid && items.length > 0 && (
                  <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm">
                    <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                    <p className="text-destructive">
                      Fix validation errors before finalizing
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <ShoppingCart className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">Select a customer to begin</p>
              <p className="text-sm">Choose a customer from the dropdown above</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}


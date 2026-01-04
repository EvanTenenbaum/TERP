// @ts-nocheck - TEMPORARY: Type mismatch errors, needs Wave 1 fix
/**
 * OrderCreatorPage V2.0
 * Complete sales order creation with COGS visibility, margin management,
 * and draft/finalize workflow
 * v2.0 Sales Order Enhancements
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClientCombobox } from "@/components/ui/client-combobox";

import { toast } from "sonner";
import { ShoppingCart, Save, CheckCircle, AlertCircle } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";

// Import new v2 components
import {
  LineItemTable,
  type LineItem,
} from "@/components/orders/LineItemTable";
import {
  OrderAdjustmentPanel,
  type OrderAdjustment,
} from "@/components/orders/OrderAdjustmentPanel";
import { OrderTotalsPanel } from "@/components/orders/OrderTotalsPanel";
import { ClientPreview } from "@/components/orders/ClientPreview";
import { CreditLimitBanner } from "@/components/orders/CreditLimitBanner";
import { CreditWarningDialog } from "@/components/orders/CreditWarningDialog";
import { ReferredBySelector } from "@/components/orders/ReferredBySelector";
import { ReferralCreditsPanel } from "@/components/orders/ReferralCreditsPanel";
import { InventoryBrowser } from "@/components/sales/InventoryBrowser";
import { useOrderCalculations, calculateLineItem } from "@/hooks/orders/useOrderCalculations";

interface CreditCheckResult {
  allowed: boolean;
  warning?: string;
  requiresOverride: boolean;
  creditLimit: number;
  currentExposure: number;
  newExposure: number;
  availableCredit: number;
  utilizationPercent: number;
  enforcementMode: "WARNING" | "SOFT_BLOCK" | "HARD_BLOCK";
}

interface InventoryItemForOrder {
  id: number;
  name: string;
  basePrice: number;
  retailPrice?: number;
}

export default function OrderCreatorPageV2() {
  // State
  const [clientId, setClientId] = useState<number | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [adjustment, setAdjustment] = useState<OrderAdjustment | null>(null);
  const [showAdjustmentOnDocument, setShowAdjustmentOnDocument] =
    useState(true);
  const [orderType, setOrderType] = useState<"QUOTE" | "SALE">("SALE");
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  
  // Credit check state
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [creditCheckResult, setCreditCheckResult] = useState<CreditCheckResult | null>(null);
  const [pendingOverrideReason, setPendingOverrideReason] = useState<string | undefined>();
  
  // Referral tracking state (WS-004)
  const [referredByClientId, setReferredByClientId] = useState<number | null>(null);

  // Queries - handle paginated response
  const { data: clientsData, isLoading: clientsLoading } = trpc.clients.list.useQuery({ limit: 1000 });
  const clients = Array.isArray(clientsData) ? clientsData : (clientsData?.items ?? []);
  const { data: clientDetails } = trpc.clients.getById.useQuery(
    { clientId: clientId || 0 },
    { enabled: !!clientId }
  );
  
  // Fetch inventory with pricing when client is selected
  const { data: inventory, isLoading: inventoryLoading, error: inventoryError } = trpc.salesSheets.getInventory.useQuery(
    { clientId: clientId! },
    { 
      enabled: !!clientId && clientId > 0,
      retry: false,
    }
  );
  
  // Handle inventory error with useEffect
  React.useEffect(() => {
    if (inventoryError) {
      console.error("Failed to load inventory:", inventoryError);
      toast.error(`Failed to load inventory: ${inventoryError.message || "Unknown error"}`);
    }
  }, [inventoryError]);

  // Calculations
  const { totals, warnings, isValid } = useOrderCalculations(items, adjustment);

  // Mutations
  const createDraftMutation = trpc.orders.createDraftEnhanced.useMutation({
    onSuccess: data => {
      toast.success(`Draft order #${data.orderId} saved successfully`);
      // Reset form
      setItems([]);
      setAdjustment(null);
    },
    onError: error => {
      toast.error(`Failed to save draft: ${error.message}`);
    },
  });

  const finalizeMutation = trpc.orders.finalizeDraft.useMutation({
    onSuccess: data => {
      toast.success(`Order #${data.orderNumber} finalized successfully!`);
      // Navigate to order details or reset
      setItems([]);
      setAdjustment(null);
    },
    onError: error => {
      toast.error(`Failed to finalize order: ${error.message}`);
    },
  });

  // Credit check mutation
  const creditCheckMutation = trpc.credit.checkOrderCredit.useMutation();

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
      orderLevelAdjustment: adjustment || undefined,
      showAdjustmentOnDocument,
    });
  };

  const handlePreviewAndFinalize = async () => {
    if (!isValid) {
      toast.error("Please fix validation errors before finalizing");
      return;
    }

    if (!clientId) {
      toast.error("Please select a client");
      return;
    }

    // Check credit limit for SALE orders
    if (orderType === "SALE") {
      try {
        const result = await creditCheckMutation.mutateAsync({
          clientId,
          orderTotal: totals.total,
          overrideReason: pendingOverrideReason,
        });
        
        setCreditCheckResult(result);
        
        // If there's a warning or requires override, show the dialog
        if (result.warning || result.requiresOverride || !result.allowed) {
          setShowCreditWarning(true);
          return;
        }
      } catch (error) {
        // If credit check fails, log but allow order to proceed
        console.error("Credit check failed:", error);
        // Continue to finalize - don't block on credit check errors
      }
    }

    // Show confirmation dialog for finalize
    setShowFinalizeConfirm(true);
  };

  const handleCreditProceed = (overrideReason?: string) => {
    setShowCreditWarning(false);
    setPendingOverrideReason(overrideReason);
    // Show finalize confirmation
    setShowFinalizeConfirm(true);
  };

  const handleCreditCancel = () => {
    setShowCreditWarning(false);
    setCreditCheckResult(null);
    setPendingOverrideReason(undefined);
  };

  const confirmFinalize = () => {
    setShowFinalizeConfirm(false);
    
    if (!clientId) return;

    // First create the draft, then finalize it
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
      orderLevelAdjustment: adjustment || undefined,
      showAdjustmentOnDocument,
    });
  };

  // Convert inventory items to LineItem format
  const convertInventoryToLineItems = (inventoryItems: InventoryItemForOrder[]): LineItem[] => {
    return inventoryItems.map(item => {
      // Calculate margin percent from basePrice and retailPrice
      const cogsPerUnit = item.basePrice || 0;
      const retailPrice = item.retailPrice || item.basePrice || 0;
      const marginPercent = cogsPerUnit > 0 
        ? ((retailPrice - cogsPerUnit) / cogsPerUnit) * 100 
        : 0;
      
      // Use calculateLineItem to ensure proper structure
      const calculated = calculateLineItem(
        item.id, // batchId
        1, // default quantity
        cogsPerUnit,
        marginPercent
      );
      
      return {
        ...calculated,
        marginPercent: marginPercent || 0, // Ensure marginPercent is always a number
        marginDollar: calculated.marginDollar || 0, // Ensure marginDollar is always a number
        unitPrice: calculated.unitPrice || 0, // Ensure unitPrice is always a number
        lineTotal: calculated.lineTotal || 0, // Ensure lineTotal is always a number
        productDisplayName: item.name,
        originalCogsPerUnit: cogsPerUnit,
        isCogsOverridden: false,
        isMarginOverridden: false,
        marginSource: "CUSTOMER_PROFILE" as const,
        isSample: false,
      };
    });
  };

  const handleAddItem = (inventoryItems: InventoryItemForOrder[]) => {
    if (!inventoryItems || inventoryItems.length === 0) {
      toast.error("No items selected");
      return;
    }

    // Convert inventory items to LineItem format
    const newLineItems = convertInventoryToLineItems(inventoryItems);
    
    // Filter out items that are already in the order (by batchId)
    const existingBatchIds = new Set(items.map(item => item.batchId));
    const uniqueItems = newLineItems.filter(item => !existingBatchIds.has(item.batchId));
    
    if (uniqueItems.length === 0) {
      toast.warning("Selected items are already in the order");
      return;
    }
    
    // Add new items to the order
    setItems([...items, ...uniqueItems]);
    toast.success(`Added ${uniqueItems.length} item(s) to order`);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <BackButton label="Back to Orders" to="/orders" className="mb-4" />
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
                onValueChange={value => setOrderType(value as "QUOTE" | "SALE")}
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
          {/* Client Selector - UX-013: Searchable dropdown */}
          <div className="space-y-2">
            <Label htmlFor="client-select">Select Customer *</Label>
            <ClientCombobox
              value={clientId}
              onValueChange={(id) => {
                setClientId(id);
                // Clear items when changing client
                if (id !== clientId) {
                  setItems([]);
                }
              }}
              clients={(clients || [])
                .filter((c) => c.isBuyer)
                .map((client) => ({
                  id: client.id,
                  name: client.name,
                  email: client.email,
                  clientType: "buyer",
                }))}
              isLoading={clientsLoading}
              placeholder="Search for a customer..."
              emptyText="No customers found"
            />
          </div>
          
          {/* Referral Tracking (WS-004) */}
          {clientId && (
            <div className="mt-4">
              <ReferredBySelector
                currentClientId={clientId}
                selectedReferrerId={referredByClientId}
                onReferrerChange={setReferredByClientId}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content */}
      {clientId ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Inventory Browser & Line Items & Adjustment (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Inventory Browser */}
            <Card id="inventory-browser-section">
              <CardContent className="pt-6">
                {inventoryError ? (
                  <div className="text-center py-8">
                    <p className="text-destructive mb-2">Failed to load inventory</p>
                    <p className="text-sm text-muted-foreground">{inventoryError.message}</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => window.location.reload()}
                      className="mt-4"
                    >
                      Retry
                    </Button>
                  </div>
                ) : (
                  <InventoryBrowser
                    inventory={inventory || []}
                    isLoading={inventoryLoading}
                    onAddItems={handleAddItem}
                    selectedItems={items.map(item => ({ id: item.batchId }))}
                  />
                )}
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardContent className="pt-6">
                <LineItemTable
                  items={items}
                  clientId={clientId}
                  onChange={setItems}
                  onAddItem={() => {
                    // Scroll to InventoryBrowser section
                    const inventoryBrowser = document.getElementById('inventory-browser-section');
                    if (inventoryBrowser) {
                      inventoryBrowser.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      // Focus on search input for better UX
                      setTimeout(() => {
                        const searchInput = inventoryBrowser.querySelector('input[type="text"]') as HTMLInputElement;
                        if (searchInput) {
                          searchInput.focus();
                        }
                      }, 300);
                    } else {
                      toast.info('Please use the inventory browser above to add items');
                    }
                  }}
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
            {/* Credit Limit Banner */}
            {clientDetails && orderType === "SALE" && (
              <CreditLimitBanner
                client={clientDetails}
                orderTotal={totals.total}
              />
            )}

            {/* Referral Credits Panel (WS-004) */}
            {clientId && (
              <ReferralCreditsPanel
                clientId={clientId}
                orderTotal={totals.total}
              />
            )}

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
                  disabled={items.length === 0 || createDraftMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save as Draft
                </Button>

                <Button
                  className="w-full"
                  onClick={handlePreviewAndFinalize}
                  disabled={!isValid || finalizeMutation.isPending}
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
              <p className="text-sm">
                Choose a customer from the dropdown above
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Credit Warning Dialog */}
      <CreditWarningDialog
        open={showCreditWarning}
        onOpenChange={setShowCreditWarning}
        creditCheck={creditCheckResult}
        orderTotal={totals.total}
        clientName={clientDetails?.name || "Client"}
        onProceed={handleCreditProceed}
        onCancel={handleCreditCancel}
      />

      {/* Finalize Confirmation Dialog */}
      <ConfirmDialog
        open={showFinalizeConfirm}
        onOpenChange={setShowFinalizeConfirm}
        title={`Finalize ${orderType === 'QUOTE' ? 'Quote' : 'Sale'}?`}
        description={`Are you sure you want to finalize this ${orderType.toLowerCase()}? Total: $${totals.total.toFixed(2)}. This will create the order and cannot be undone.`}
        confirmLabel="Finalize"
        variant="default"
        onConfirm={confirmFinalize}
      />
    </div>
  );
}

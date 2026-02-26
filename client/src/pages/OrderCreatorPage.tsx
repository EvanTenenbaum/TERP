/**
 * OrderCreatorPage V2.0
 * Complete sales order creation with COGS visibility, margin management,
 * and draft/finalize workflow
 * v2.0 Sales Order Enhancements
 */

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useSearch } from "wouter";
import { trpc } from "@/lib/trpc";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useUnsavedChangesWarning } from "@/hooks/useUnsavedChangesWarning";
import { useDebounceCallback } from "@/hooks/useDebounceCallback";
import { PageErrorBoundary } from "@/components/common/PageErrorBoundary";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  ShoppingCart,
  Save,
  CheckCircle,
  AlertCircle,
  Loader2,
  ChevronDown,
  FileText,
  Send,
} from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
import { FloatingOrderPreview } from "@/components/orders/FloatingOrderPreview";
import { CreditLimitBanner } from "@/components/orders/CreditLimitBanner";
import { CreditWarningDialog } from "@/components/orders/CreditWarningDialog";
import { ReferredBySelector } from "@/components/orders/ReferredBySelector";
import { ReferralCreditsPanel } from "@/components/orders/ReferralCreditsPanel";
import { InventoryBrowser } from "@/components/sales/InventoryBrowser";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import {
  useOrderCalculations,
  calculateLineItem,
} from "@/hooks/orders/useOrderCalculations";
import { useRetryableQuery } from "@/hooks/useRetryableQuery";
import {
  useSaveState,
  useUndo,
  useWorkSurfaceKeyboard,
} from "@/hooks/work-surface";

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
  productId?: number; // WSQA-002: Product ID for flexible lot selection
  name: string;
  basePrice: number;
  retailPrice?: number;
  orderQuantity?: number; // FEAT-003: Support quick add quantity from InventoryBrowser
  quantity?: number; // Available stock quantity
}

export default function OrderCreatorPageV2() {
  // TER-216: Navigation after save/finalize
  const [, setLocation] = useLocation();
  const searchString = useSearch();

  // State
  const [clientId, setClientId] = useState<number | null>(null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [adjustment, setAdjustment] = useState<OrderAdjustment | null>(null);
  const [showAdjustmentOnDocument, setShowAdjustmentOnDocument] =
    useState(true);
  const [orderType, setOrderType] = useState<"QUOTE" | "SALE">("SALE");
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);

  // CHAOS-007: Unsaved changes warning
  const { setHasUnsavedChanges, ConfirmNavigationDialog } =
    useUnsavedChangesWarning({
      message:
        "You have unsaved order changes. Are you sure you want to leave?",
    });

  // Credit check state
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [creditCheckResult, setCreditCheckResult] =
    useState<CreditCheckResult | null>(null);
  const [pendingOverrideReason, setPendingOverrideReason] = useState<
    string | undefined
  >();

  // Referral tracking state (WS-004)
  const [referredByClientId, setReferredByClientId] = useState<number | null>(
    null
  );

  const { saveState, setSaving, setSaved, setError, SaveStateIndicator } =
    useSaveState();
  const undo = useUndo({ enableKeyboard: false });

  // BUG-093 FIX: Track whether we're in finalization mode to prevent form reset
  // before finalization completes
  const isFinalizingRef = useRef(false);
  const itemsRef = useRef<LineItem[]>([]);

  // TER-215: Import items from Sales Sheet when navigating with ?fromSalesSheet=true
  useEffect(() => {
    const params = new URLSearchParams(searchString);
    if (params.get("fromSalesSheet") === "true") {
      try {
        const raw = sessionStorage.getItem("salesSheetToQuote");
        if (raw) {
          const data = JSON.parse(raw) as {
            clientId: number;
            items: InventoryItemForOrder[];
          };
          setClientId(data.clientId);
          setOrderType("QUOTE");
          // Convert will happen after inventory loads, but pre-set client
          // Items will be added via convertInventoryToLineItems once available
          const lineItems = convertInventoryToLineItems(data.items);
          if (lineItems.length > 0) {
            setItems(lineItems);
          }
          sessionStorage.removeItem("salesSheetToQuote");
        }
      } catch {
        toast.error("Failed to import items from sales sheet");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // QA-W2-005: Track unsaved changes - consider both items and auto-save status
  // Warning should show when there are items OR when auto-save is pending/failed
  useEffect(() => {
    const hasItems = items.length > 0;
    const autoSavePending =
      saveState.status === "saving" ||
      saveState.status === "error" ||
      saveState.status === "queued";
    setHasUnsavedChanges(hasItems || autoSavePending);
  }, [items.length, saveState.status, setHasUnsavedChanges]);

  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Queries - handle paginated response
  const { data: clientsData, isLoading: clientsLoading } =
    trpc.clients.list.useQuery({ limit: 1000 });
  const clients = Array.isArray(clientsData)
    ? clientsData
    : (clientsData?.items ?? []);
  const { data: clientDetails } = trpc.clients.getById.useQuery(
    { clientId: clientId || 0 },
    { enabled: !!clientId }
  );

  // Fetch inventory with pricing when client is selected
  // BUG-045: Use useRetryableQuery to preserve form state on retry
  const inventoryQueryRaw = trpc.salesSheets.getInventory.useQuery(
    { clientId: clientId ?? 0 },
    {
      enabled: !!clientId && clientId > 0,
      retry: false,
    }
  );

  const inventoryQuery = useRetryableQuery(inventoryQueryRaw, {
    maxRetries: 3,
    onMaxRetriesReached: () => {
      toast.error(
        "Unable to load inventory. Please try selecting a different customer or contact support."
      );
    },
  });

  const {
    data: inventory,
    isLoading: inventoryLoading,
    error: inventoryError,
  } = inventoryQuery;

  // Handle inventory error with useEffect
  React.useEffect(() => {
    if (inventoryError) {
      console.error("Failed to load inventory:", inventoryError);
      toast.error(
        `Failed to load inventory: ${inventoryError.message || "Unknown error"}`
      );
    }
  }, [inventoryError]);

  // Calculations
  const { totals, warnings, isValid } = useOrderCalculations(items, adjustment);

  // Mutations
  // BUG-093 FIX: Modified to support two-step finalization
  const createDraftMutation = trpc.orders.createDraftEnhanced.useMutation({
    onSuccess: data => {
      if (isFinalizingRef.current) {
        // We're in finalization mode - proceed to finalize the draft
        // Don't reset form yet - wait for finalization to complete
        toast.info(`Draft #${data.orderId} created, finalizing...`);
        // BUG-045 FIX: Pass version 1 for newly created drafts (optimistic locking)
        finalizeMutation.mutate({ orderId: data.orderId, version: 1 });
      } else {
        // Keep the user in the create workspace after draft save for low-friction edits.
        toast.success(`Draft order #${data.orderId} saved successfully`);
        setHasUnsavedChanges(false);
        setLocation(`/orders/create?draftId=${data.orderId}`);
      }
    },
    onError: error => {
      // Reset finalization flag on error
      isFinalizingRef.current = false;
      toast.error(`Failed to save draft: ${error.message}`);
    },
  });

  const finalizeMutation = trpc.orders.finalizeDraft.useMutation({
    onSuccess: data => {
      // BUG-093 FIX: Reset finalization flag and form after successful finalization
      isFinalizingRef.current = false;
      toast.success(`Order #${data.orderNumber} finalized successfully!`);
      // Keep creators in-place after finalize for quick follow-up edits/orders.
      setHasUnsavedChanges(false);
      setLocation("/orders/create");
    },
    onError: error => {
      // BUG-093 FIX: Reset flag on error, but preserve form data so user can retry
      isFinalizingRef.current = false;
      toast.error(`Failed to finalize order: ${error.message}`);
    },
  });

  // Credit check mutation
  const creditCheckMutation = trpc.credit.checkOrderCredit.useMutation();

  // Auto-save mutation (silent, no toast notifications)
  const autoSaveMutation = trpc.orders.createDraftEnhanced.useMutation({
    onSuccess: () => {
      setSaved();
    },
    onError: error => {
      setError("Auto-save failed", error);
    },
  });

  // CHAOS-025: Debounced auto-save callback (2 second delay)
  const performAutoSave = useCallback(() => {
    if (!clientId || items.length === 0) {
      return;
    }

    setSaving();
    autoSaveMutation.mutate({
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
  }, [
    clientId,
    items,
    orderType,
    adjustment,
    showAdjustmentOnDocument,
    autoSaveMutation,
    setSaving,
  ]);

  const debouncedAutoSave = useDebounceCallback(performAutoSave, 2000);

  // CHAOS-025: Trigger auto-save when order state changes
  useEffect(() => {
    if (clientId && items.length > 0) {
      debouncedAutoSave();
    }
  }, [
    clientId,
    items,
    orderType,
    adjustment,
    showAdjustmentOnDocument,
    debouncedAutoSave,
  ]);

  // Handlers
  const handleSaveDraft = (overrideOrderType?: "SALE" | "QUOTE") => {
    if (!clientId) {
      toast.error("Please select a client");
      return;
    }

    if (items.length === 0) {
      toast.error("Please add at least one item");
      return;
    }

    createDraftMutation.mutate({
      orderType: overrideOrderType ?? orderType,
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

    // BUG-093 FIX: Set finalization mode BEFORE calling createDraftMutation
    // This ensures the onSuccess handler knows to call finalizeMutation
    isFinalizingRef.current = true;

    // First create the draft - finalization will happen in onSuccess callback
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
  const convertInventoryToLineItems = (
    inventoryItems: InventoryItemForOrder[]
  ): LineItem[] => {
    // Filter out items with invalid or missing IDs to prevent race condition errors
    const validItems = inventoryItems.filter(item => {
      if (!item || item.id === undefined || item.id === null) {
        console.warn("Skipping item with missing id:", item);
        return false;
      }
      return true;
    });

    return validItems.map(item => {
      // Calculate margin percent from basePrice and retailPrice
      const cogsPerUnit = item.basePrice || 0;
      const retailPrice = item.retailPrice || item.basePrice || 0;
      const marginPercent =
        cogsPerUnit > 0 ? ((retailPrice - cogsPerUnit) / cogsPerUnit) * 100 : 0;

      // FEAT-003 + TER-233: Use orderQuantity from InventoryBrowser, or quantity from Sales Sheet bridge, or default to 1
      const quantity = item.orderQuantity || item.quantity || 1;

      // Use calculateLineItem to ensure proper structure
      const calculated = calculateLineItem(
        item.id, // batchId - guaranteed to be defined after filter
        quantity,
        cogsPerUnit,
        marginPercent
      );

      return {
        ...calculated,
        productId: item.productId, // WSQA-002: Include productId for flexible lot selection
        marginPercent: marginPercent || 0, // Ensure marginPercent is always a number
        marginDollar: calculated.marginDollar || 0, // Ensure marginDollar is always a number
        unitPrice: calculated.unitPrice || 0, // Ensure unitPrice is always a number
        lineTotal: calculated.lineTotal || 0, // Ensure lineTotal is always a number
        productDisplayName: item.name || "Unknown Product",
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

    // Convert inventory items to LineItem format (filters out invalid items)
    const newLineItems = convertInventoryToLineItems(inventoryItems);

    // Check if any items were skipped due to missing data
    if (newLineItems.length === 0) {
      toast.error("Selected items are not available. Please try again.");
      return;
    }

    if (newLineItems.length < inventoryItems.length) {
      toast.warning(
        `${inventoryItems.length - newLineItems.length} item(s) were skipped due to incomplete data`
      );
    }

    // Filter out items that are already in the order (by batchId)
    const existingBatchIds = new Set(items.map(item => item.batchId));
    const uniqueItems = newLineItems.filter(
      item => !existingBatchIds.has(item.batchId)
    );

    if (uniqueItems.length === 0) {
      toast.warning("Selected items are already in the order");
      return;
    }

    // Add new items to the order
    setItems([...items, ...uniqueItems]);
    toast.success(`Added ${uniqueItems.length} item(s) to order`);
  };

  const keyboard = useWorkSurfaceKeyboard({
    gridMode: false,
    onUndo: () => {
      void undo.undoLast();
    },
    customHandlers: {
      "cmd+s": (e: React.KeyboardEvent) => {
        e.preventDefault();
        performAutoSave();
      },
      "ctrl+s": (e: React.KeyboardEvent) => {
        e.preventDefault();
        performAutoSave();
      },
      "cmd+enter": (e: React.KeyboardEvent) => {
        e.preventDefault();
        void handlePreviewAndFinalize();
      },
      "ctrl+enter": (e: React.KeyboardEvent) => {
        e.preventDefault();
        void handlePreviewAndFinalize();
      },
    },
  });

  const registerLineItemRemovalUndo = useCallback(
    (previousItems: LineItem[], removedBatchIds: number[]) => {
      const removedBatchIdSet = new Set(removedBatchIds);
      const removedItems = previousItems.filter(item =>
        removedBatchIdSet.has(item.batchId)
      );

      if (removedItems.length === 0) {
        return;
      }

      const previousBatchIds = new Set(previousItems.map(item => item.batchId));

      undo.registerAction({
        description:
          removedItems.length === 1
            ? "Removed 1 item"
            : `Removed ${removedItems.length} items`,
        duration: 10000,
        undo: () => {
          setItems(currentItems => {
            const currentById = new Map(
              currentItems.map(item => [item.batchId, item])
            );
            const removedById = new Map(
              removedItems.map(item => [item.batchId, item])
            );
            const restored: LineItem[] = [];

            for (const previousItem of previousItems) {
              const currentItem = currentById.get(previousItem.batchId);
              if (currentItem) {
                restored.push(currentItem);
                continue;
              }
              const removedItem = removedById.get(previousItem.batchId);
              if (removedItem) {
                restored.push(removedItem);
              }
            }

            for (const currentItem of currentItems) {
              if (!previousBatchIds.has(currentItem.batchId)) {
                restored.push(currentItem);
              }
            }

            return restored;
          });
        },
      });
    },
    [undo]
  );

  const handleLineItemsChange = useCallback(
    (nextItems: LineItem[]) => {
      const previousItems = itemsRef.current;
      const nextBatchIds = new Set(nextItems.map(item => item.batchId));
      const removedBatchIds = previousItems
        .filter(item => !nextBatchIds.has(item.batchId))
        .map(item => item.batchId);

      if (removedBatchIds.length > 0) {
        registerLineItemRemovalUndo(previousItems, removedBatchIds);
      }

      setItems(nextItems);
    },
    [registerLineItemRemovalUndo]
  );

  const handlePreviewRemoveItem = useCallback(
    (batchId: number) => {
      const previousItems = itemsRef.current;
      if (!previousItems.some(item => item.batchId === batchId)) {
        return;
      }

      registerLineItemRemovalUndo(previousItems, [batchId]);
      setItems(previousItems.filter(item => item.batchId !== batchId));
    },
    [registerLineItemRemovalUndo]
  );

  return (
    <PageErrorBoundary pageName="OrderCreator">
      <div
        {...keyboard.keyboardProps}
        className="container mx-auto p-4 md:p-6 space-y-6"
      >
        <BackButton label="Back to Orders" to="/orders" className="mb-4" />
        <section className="linear-workspace-shell">
          <header className="linear-workspace-header">
            <div className="linear-workspace-title-wrap">
              <p className="linear-workspace-eyebrow">Order Workspace</p>
              <div>
                <h2 className="linear-workspace-title flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Create Sales Order
                </h2>
                <p className="linear-workspace-description">
                  Build sale with COGS visibility and margin management
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {clientId && items.length > 0 ? SaveStateIndicator : null}
            </div>
          </header>

          <div className="linear-workspace-meta">
            <div className="flex min-w-[260px] flex-1 flex-col gap-1">
              <span className="linear-workspace-meta-label">Customer</span>
              <ClientCombobox
                value={clientId}
                onValueChange={id => {
                  setClientId(id);
                  // Clear items when changing client
                  if (id !== clientId) {
                    setItems([]);
                  }
                }}
                clients={(clients || [])
                  .filter(c => c.isBuyer)
                  .map(client => ({
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

            <div className="flex min-w-[260px] flex-1 flex-col gap-1">
              <span className="linear-workspace-meta-label">Referred By</span>
              {clientId ? (
                <ReferredBySelector
                  excludeClientId={clientId}
                  selectedReferrerId={referredByClientId}
                  onSelect={referrerId => setReferredByClientId(referrerId)}
                />
              ) : (
                <span className="text-xs text-muted-foreground">
                  Select a customer to set referral details
                </span>
              )}
            </div>
          </div>

          <div className="linear-workspace-content">
            {clientId ? (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Inventory Browser & Line Items & Adjustment (2/3) */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Inventory Browser */}
                  <Card id="inventory-browser-section">
                    <CardContent className="pt-6">
                      {inventoryError ? (
                        <div className="text-center py-8">
                          <AlertCircle className="h-8 w-8 text-destructive mx-auto mb-2" />
                          <p className="text-destructive mb-2 font-medium">
                            Failed to load inventory
                          </p>
                          <p className="text-sm text-muted-foreground mb-4">
                            {inventoryError.message}
                          </p>
                          {inventoryQuery.canRetry ? (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={inventoryQuery.handleRetry}
                              disabled={inventoryQuery.isLoading}
                            >
                              {inventoryQuery.isLoading ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Retrying...
                                </>
                              ) : (
                                <>
                                  Retry ({inventoryQuery.remainingRetries}{" "}
                                  attempts remaining)
                                </>
                              )}
                            </Button>
                          ) : (
                            <div className="text-sm text-muted-foreground">
                              <p className="mb-2">
                                Maximum retries reached. Please try:
                              </p>
                              <ul className="list-disc text-left inline-block">
                                <li>Selecting a different customer</li>
                                <li>Refreshing the page</li>
                                <li>
                                  Contacting support if the issue persists
                                </li>
                              </ul>
                            </div>
                          )}
                        </div>
                      ) : (
                        <InventoryBrowser
                          inventory={inventory || []}
                          isLoading={inventoryLoading}
                          onAddItems={handleAddItem}
                          selectedItems={items.map(item => ({
                            id: item.batchId,
                          }))}
                        />
                      )}
                    </CardContent>
                  </Card>

                  {/* Line Items */}
                  <Card>
                    <CardContent className="pt-6">
                      <h3 className="mb-3 text-base font-semibold">
                        Line Items
                      </h3>
                      <LineItemTable
                        items={items}
                        clientId={clientId}
                        onChange={handleLineItemsChange}
                        onAddItem={() => {
                          // Scroll to InventoryBrowser section
                          const inventoryBrowser = document.getElementById(
                            "inventory-browser-section"
                          );
                          if (inventoryBrowser) {
                            inventoryBrowser.scrollIntoView({
                              behavior: "smooth",
                              block: "start",
                            });
                            // Focus on search input for better UX
                            setTimeout(() => {
                              const searchInput =
                                inventoryBrowser.querySelector(
                                  'input[type="text"]'
                                ) as HTMLInputElement;
                              if (searchInput) {
                                searchInput.focus();
                              }
                            }, 300);
                          } else {
                            toast.info(
                              "Please use the inventory browser above to add items"
                            );
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

                  {/* TER-206: Collapsible order preview */}
                  <details open>
                    <summary className="cursor-pointer text-sm font-medium text-muted-foreground mb-2 select-none">
                      Order Preview
                    </summary>
                    <FloatingOrderPreview
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
                      showInternalMetrics={true}
                      onUpdateItem={(batchId, updates) => {
                        setItems(prevItems =>
                          prevItems.map(item =>
                            item.batchId === batchId
                              ? { ...item, ...updates }
                              : item
                          )
                        );
                      }}
                      onRemoveItem={handlePreviewRemoveItem}
                    />
                  </details>

                  {/* FEAT-005: Unified Draft/Quote Workflow with Dropdown Menu */}
                  <Card>
                    <CardContent className="pt-6 space-y-3">
                      {/* Order Type Selector */}
                      <div className="space-y-2">
                        <Label>Order Type</Label>
                        <Select
                          value={orderType}
                          onValueChange={value =>
                            setOrderType(value as "QUOTE" | "SALE")
                          }
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SALE">Sale Order</SelectItem>
                            <SelectItem value="QUOTE">Quote</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Unified Save Dropdown Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            data-testid="order-save-menu-trigger"
                            className="w-full"
                            variant="outline"
                            disabled={
                              items.length === 0 ||
                              createDraftMutation.isPending
                            }
                          >
                            <Save className="h-4 w-4 mr-2" />
                            Save
                            <ChevronDown className="h-4 w-4 ml-auto" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56">
                          <DropdownMenuLabel>Save Options</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            data-testid="order-save-draft-action"
                            onClick={() => handleSaveDraft()}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Save as Draft
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            data-testid="order-save-quote-action"
                            onClick={() => {
                              setOrderType("QUOTE");
                              handleSaveDraft("QUOTE");
                            }}
                          >
                            <Send className="h-4 w-4 mr-2" />
                            Save & Send as Quote
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {/* Primary Finalize/Confirm Button */}
                      <Button
                        className="w-full"
                        onClick={handlePreviewAndFinalize}
                        disabled={
                          !isValid ||
                          finalizeMutation.isPending ||
                          (createDraftMutation.isPending &&
                            isFinalizingRef.current)
                        }
                      >
                        {finalizeMutation.isPending ||
                        (createDraftMutation.isPending &&
                          isFinalizingRef.current) ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            {orderType === "QUOTE"
                              ? "Creating Quote..."
                              : "Confirming Order..."}
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4 mr-2" />
                            {orderType === "QUOTE"
                              ? "Confirm Quote"
                              : "Confirm Order"}
                          </>
                        )}
                      </Button>

                      {!isValid && items.length > 0 && (
                        <div className="flex items-start gap-2 p-3 bg-destructive/10 border border-destructive/20 rounded text-sm">
                          <AlertCircle className="h-4 w-4 text-destructive mt-0.5" />
                          <p className="text-destructive">
                            Fix validation errors before confirming
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
                    <p className="text-lg font-medium">
                      Select a customer to begin
                    </p>
                    <p className="text-sm">
                      Choose a customer from the dropdown above
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <WorkSurfaceStatusBar
            left={`${items.length} items · ${orderType}`}
            center={clientDetails?.name || "No client selected"}
            right="Cmd+S: Save | Cmd+Enter: Finalize | Cmd+Z: Undo"
          />
        </section>

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
          title={`Finalize ${orderType === "QUOTE" ? "Quote" : "Sale"}?`}
          description={`Are you sure you want to finalize this ${orderType.toLowerCase()}? Total: $${totals.total.toFixed(2)}. This will create the order and cannot be undone.`}
          confirmLabel="Finalize"
          variant="default"
          onConfirm={confirmFinalize}
        />

        {/* CHAOS-007: Unsaved Changes Navigation Dialog */}
        <ConfirmNavigationDialog />
      </div>
    </PageErrorBoundary>
  );
}

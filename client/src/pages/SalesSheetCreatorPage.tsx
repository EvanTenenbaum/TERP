/**
 * SalesSheetCreatorPage
 * Create customized sales sheets with dynamic pricing for clients
 * QA-062: Added draft/auto-save functionality
 * SALES-SHEET-IMPROVEMENTS: Added advanced filtering, sorting, and saved views
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { FileText, Save } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { InventoryBrowser } from "@/components/sales/InventoryBrowser";
import { SalesSheetPreview } from "@/components/sales/SalesSheetPreview";
import { DraftControls } from "@/components/sales/DraftControls";
import { DraftDialog } from "@/components/sales/DraftDialog";
import { QuickViewSelector } from "@/components/sales/QuickViewSelector";
import { SaveViewDialog } from "@/components/sales/SaveViewDialog";
import { ClientCombobox } from "@/components/ui/client-combobox";
import { toast } from "sonner";
import type {
  PricedInventoryItem,
  DraftInfo,
  InventoryFilters,
  InventorySortConfig,
  ColumnVisibility,
} from "@/components/sales/types";
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  DEFAULT_COLUMN_VISIBILITY,
} from "@/components/sales/types";

const AUTO_SAVE_INTERVAL = 30000; // 30 seconds

export default function SalesSheetCreatorPage() {
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<PricedInventoryItem[]>([]);

  // Draft state
  const [currentDraftId, setCurrentDraftId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [showDraftDialog, setShowDraftDialog] = useState(false);

  // Filter/Sort state (SALES-SHEET-IMPROVEMENTS)
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<InventorySortConfig>(DEFAULT_SORT);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    DEFAULT_COLUMN_VISIBILITY
  );
  const [currentViewId, setCurrentViewId] = useState<number | null>(null);
  const [showSaveViewDialog, setShowSaveViewDialog] = useState(false);

  // Track initial load to prevent auto-save on first render
  const isInitialLoad = useRef(true);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // FIX: Use refs to avoid stale closures in auto-save timer
  const selectedItemsRef = useRef<PricedInventoryItem[]>([]);
  const draftNameRef = useRef("");
  const selectedClientIdRef = useRef<number | null>(null);
  const currentDraftIdRef = useRef<number | null>(null);

  // Fetch clients
  const { data: clients } = trpc.clients.list.useQuery({ limit: 1000 });

  // Fetch inventory with pricing when client is selected
  const { data: inventory, isLoading: inventoryLoading } =
    trpc.salesSheets.getInventory.useQuery(
      { clientId: selectedClientId ?? 0 },
      { enabled: selectedClientId !== null && selectedClientId > 0 }
    );

  // Fetch drafts
  const {
    data: drafts,
    isLoading: draftsLoading,
    refetch: refetchDrafts,
  } = trpc.salesSheets.getDrafts.useQuery(
    { clientId: selectedClientId ?? undefined },
    { enabled: true }
  );

  // Fetch saved views for auto-loading default
  const { data: savedViews } = trpc.salesSheets.getViews.useQuery(
    { clientId: selectedClientId ?? undefined },
    { enabled: selectedClientId !== null && selectedClientId > 0 }
  );

  const utils = trpc.useUtils();

  // Save draft mutation
  const saveDraftMutation = trpc.salesSheets.saveDraft.useMutation({
    onSuccess: (data) => {
      setCurrentDraftId(data.draftId);
      setLastSaveTime(new Date());
      setHasUnsavedChanges(false);
      refetchDrafts();
      toast.success("Draft saved");
    },
    onError: (error) => {
      toast.error("Failed to save draft: " + error.message);
    },
  });

  // Delete draft mutation
  const deleteDraftMutation = trpc.salesSheets.deleteDraft.useMutation({
    onSuccess: () => {
      refetchDrafts();
      toast.success("Draft deleted");
    },
    onError: (error) => {
      toast.error("Failed to delete draft: " + error.message);
    },
  });

  // Auto-load default view when client changes
  useEffect(() => {
    if (selectedClientId && savedViews && savedViews.length > 0) {
      const defaultView = savedViews.find(
        (v) => v.clientId === selectedClientId && v.isDefault
      );
      if (defaultView) {
        setFilters(defaultView.filters);
        setSort(defaultView.sort as InventorySortConfig);
        setColumnVisibility(defaultView.columnVisibility);
        setCurrentViewId(defaultView.id);
        toast.info(`Loaded default view: ${defaultView.name}`);
      }
    }
  }, [selectedClientId, savedViews]);

  // FIX: Keep refs in sync with state to avoid stale closures
  useEffect(() => {
    selectedItemsRef.current = selectedItems;
  }, [selectedItems]);

  useEffect(() => {
    draftNameRef.current = draftName;
  }, [draftName]);

  useEffect(() => {
    selectedClientIdRef.current = selectedClientId;
  }, [selectedClientId]);

  useEffect(() => {
    currentDraftIdRef.current = currentDraftId;
  }, [currentDraftId]);

  // Mark changes as unsaved when items change
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    if (selectedItems.length > 0) {
      setHasUnsavedChanges(true);
    }
  }, [selectedItems]);

  // Auto-save functionality using refs to avoid stale closures
  useEffect(() => {
    if (
      !hasUnsavedChanges ||
      !selectedClientId ||
      selectedItems.length === 0 ||
      !draftName.trim()
    ) {
      return;
    }

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new auto-save timer - uses refs to get fresh values
    autoSaveTimerRef.current = setTimeout(() => {
      // FIX: Read from refs to get current values, not stale closure values
      const items = selectedItemsRef.current;
      const name = draftNameRef.current;
      const clientId = selectedClientIdRef.current;
      const draftId = currentDraftIdRef.current;

      if (!clientId || items.length === 0 || !name.trim()) {
        return;
      }

      const totalValue = items.reduce(
        (sum, item) => sum + item.retailPrice,
        0
      );

      saveDraftMutation.mutate({
        draftId: draftId ?? undefined,
        clientId: clientId,
        name: name,
        items: items,
        totalValue,
      });
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, selectedClientId, selectedItems, draftName, saveDraftMutation]);

  // Handle save draft
  const handleSaveDraft = useCallback(() => {
    if (!selectedClientId || selectedItems.length === 0 || !draftName.trim()) {
      return;
    }

    const totalValue = selectedItems.reduce(
      (sum, item) => sum + item.retailPrice,
      0
    );

    saveDraftMutation.mutate({
      draftId: currentDraftId ?? undefined,
      clientId: selectedClientId,
      name: draftName,
      items: selectedItems,
      totalValue,
    });
  }, [
    selectedClientId,
    selectedItems,
    draftName,
    currentDraftId,
    saveDraftMutation,
  ]);

  // Handle load draft
  const handleLoadDraft = useCallback(
    async (draftId: number) => {
      try {
        const result = await utils.salesSheets.getDraftById.fetch({ draftId });

        if (result) {
          setSelectedClientId(result.clientId);
          setSelectedItems(result.items as PricedInventoryItem[]);
          setCurrentDraftId(result.id);
          setDraftName(result.name);
          setLastSaveTime(result.updatedAt ? new Date(result.updatedAt) : null);
          setHasUnsavedChanges(false);
          isInitialLoad.current = true;
          setShowDraftDialog(false);
          toast.success("Draft loaded");
        }
      } catch (_error) {
        toast.error("Failed to load draft");
      }
    },
    [utils.salesSheets.getDraftById]
  );

  // Handle delete draft
  const handleDeleteDraft = useCallback(
    (draftId: number) => {
      deleteDraftMutation.mutate({ draftId });
      if (draftId === currentDraftId) {
        setCurrentDraftId(null);
        setDraftName("");
        setLastSaveTime(null);
      }
    },
    [currentDraftId, deleteDraftMutation]
  );

  // Handle add items to sheet
  const handleAddItems = useCallback((items: PricedInventoryItem[]) => {
    setSelectedItems((prev) => {
      const newItems = items.filter(
        (item) => !prev.some((selected) => selected.id === item.id)
      );
      return [...prev, ...newItems];
    });
  }, []);

  // Handle remove item from sheet
  const handleRemoveItem = useCallback((itemId: number) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  // Handle clear all items
  const handleClearAll = useCallback(() => {
    setSelectedItems([]);
  }, []);

  // Handle reorder items (drag-and-drop)
  const handleReorderItems = useCallback(
    (reorderedItems: PricedInventoryItem[]) => {
      setSelectedItems(reorderedItems);
    },
    []
  );

  // Reset state when client changes
  const handleClientChange = useCallback((clientId: number | null) => {
    setSelectedClientId(clientId);
    setSelectedItems([]);
    setCurrentDraftId(null);
    setDraftName("");
    setLastSaveTime(null);
    setHasUnsavedChanges(false);
    isInitialLoad.current = true;
    // Reset filters when changing clients
    setFilters(DEFAULT_FILTERS);
    setSort(DEFAULT_SORT);
    setColumnVisibility(DEFAULT_COLUMN_VISIBILITY);
    setCurrentViewId(null);
  }, []);

  // Handle loading a saved view
  const handleLoadView = useCallback(
    (view: {
      filters: InventoryFilters;
      sort: InventorySortConfig;
      columnVisibility: ColumnVisibility;
    }) => {
      setFilters(view.filters);
      setSort(view.sort);
      setColumnVisibility(view.columnVisibility);
    },
    []
  );

  // Get selected client name for dialogs
  const selectedClientName = (() => {
    if (!selectedClientId) return undefined;
    const clientList = Array.isArray(clients)
      ? clients
      : (clients?.items ?? []);
    const client = clientList.find(
      (c: { id: number }) => c.id === selectedClientId
    );
    return client?.name;
  })();

  // Format drafts for dialog
  const formattedDrafts: DraftInfo[] = (drafts ?? []).map((d) => ({
    id: d.id,
    name: d.name,
    clientId: d.clientId,
    itemCount: d.itemCount,
    totalValue: d.totalValue,
    updatedAt: d.updatedAt,
    createdAt: d.createdAt,
  }));

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
        <CardContent className="space-y-4">
          {/* Draft Controls */}
          <DraftControls
            draftName={draftName}
            onDraftNameChange={setDraftName}
            hasUnsavedChanges={hasUnsavedChanges}
            lastSaveTime={lastSaveTime}
            currentDraftId={currentDraftId}
            onSaveDraft={handleSaveDraft}
            onLoadDraft={() => setShowDraftDialog(true)}
            isSaving={saveDraftMutation.isPending}
            disabled={!selectedClientId}
          />

          {/* Client Selection with Quick View */}
          <div className="space-y-2">
            <Label htmlFor="client-select">Select Client</Label>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex-1 min-w-[200px]">
                <ClientCombobox
                  value={selectedClientId}
                  onValueChange={handleClientChange}
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

              {/* Quick View and Save View buttons */}
              {selectedClientId && (
                <>
                  <QuickViewSelector
                    clientId={selectedClientId}
                    onLoadView={handleLoadView}
                    currentViewId={currentViewId}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowSaveViewDialog(true)}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save View
                  </Button>
                </>
              )}
            </div>
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
                  onReorderItems={handleReorderItems as unknown as (items: { id: number; name: string; category?: string; quantity: number; basePrice: number; retailPrice: number; priceOverride?: number }[]) => void}
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

      {/* Draft Dialog */}
      <DraftDialog
        open={showDraftDialog}
        onOpenChange={setShowDraftDialog}
        drafts={formattedDrafts}
        isLoading={draftsLoading}
        onLoadDraft={handleLoadDraft}
        onDeleteDraft={handleDeleteDraft}
        isDeleting={deleteDraftMutation.isPending}
      />

      {/* Save View Dialog */}
      {selectedClientId && (
        <SaveViewDialog
          open={showSaveViewDialog}
          onOpenChange={setShowSaveViewDialog}
          clientId={selectedClientId}
          clientName={selectedClientName}
          filters={filters}
          sort={sort}
          columnVisibility={columnVisibility}
          onSaved={(viewId) => setCurrentViewId(viewId)}
        />
      )}
    </div>
  );
}

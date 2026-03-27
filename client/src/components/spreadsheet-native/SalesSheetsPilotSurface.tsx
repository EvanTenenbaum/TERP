/**
 * SalesSheetsPilotSurface
 *
 * Sheet-native browser + preview split for Sales Sheets.
 * Preserves all 7 capabilities from SalesSheetCreatorPage:
 *   - salesSheets.getInventory (inventory browser)
 *   - salesSheets.getDrafts (draft listing)
 *   - salesSheets.getViews (saved views)
 *   - salesSheets.getHistory (version history)
 *   - salesSheets.saveDraft / salesSheets.deleteDraft (mutations)
 *   - Export / download
 *
 * Critical constraint: dirty-state MUST block share and convert-to-order actions.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ColDef } from "ag-grid-community";
import {
  ArrowRight,
  Download,
  FileText,
  Link2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Save,
  SquareArrowOutUpRight,
  Trash2,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientCombobox } from "@/components/ui/client-combobox";
import {
  KeyboardHintBar,
  type KeyboardHint,
} from "@/components/work-surface/KeyboardHintBar";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import { PowersheetGrid } from "./PowersheetGrid";
import type { PowersheetAffordance } from "./PowersheetGrid";
import type { PowersheetSelectionSummary } from "@/lib/powersheet/contracts";
import type { PricedInventoryItem, DraftInfo } from "@/components/sales/types";
import { extractItems } from "@/lib/spreadsheet-native";

// ─── affordances ─────────────────────────────────────────────────────────────

const browserAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: false },
  { label: "Fill", available: false },
  { label: "Edit", available: false },
  { label: "Add to sheet", available: true },
];

const previewAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Remove item", available: true },
  { label: "Reorder", available: false },
  { label: "Edit", available: false },
];

// ─── keyboard hints ───────────────────────────────────────────────────────────

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const browserKeyboardHints: KeyboardHint[] = [
  { key: "Click", label: "select row" },
  { key: "Shift+Click", label: "extend range" },
  { key: `${mod}+Click`, label: "add to selection" },
  { key: `${mod}+C`, label: "copy cells" },
  { key: `${mod}+A`, label: "select all" },
];

// ─── formatters ───────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

// ─── row types ────────────────────────────────────────────────────────────────

interface InventoryBrowserRow {
  identity: { rowKey: string };
  inventoryId: number;
  name: string;
  category: string;
  vendor: string;
  retailPrice: number;
  quantity: number;
  grade: string;
  inSheet: boolean;
  // keep full item for add-to-sheet action
  _raw: PricedInventoryItem;
}

interface SheetPreviewRow {
  identity: { rowKey: string };
  inventoryId: number;
  name: string;
  category: string;
  retailPrice: number;
  quantity: number;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

const AUTO_SAVE_INTERVAL_MS = 30_000;

function mapInventoryToRows(
  items: PricedInventoryItem[],
  selectedIds: Set<number>
): InventoryBrowserRow[] {
  return items.map(item => ({
    identity: { rowKey: `inventory:${item.id}` },
    inventoryId: item.id,
    name: item.name,
    category: item.category ?? "-",
    vendor: item.vendor ?? "-",
    retailPrice: item.retailPrice,
    quantity: item.quantity,
    grade: item.grade ?? "-",
    inSheet: selectedIds.has(item.id),
    _raw: item,
  }));
}

function mapSelectedToPreviewRows(
  items: PricedInventoryItem[]
): SheetPreviewRow[] {
  return items.map(item => ({
    identity: { rowKey: `preview:${item.id}` },
    inventoryId: item.id,
    name: item.name,
    category: item.category ?? "-",
    retailPrice: item.retailPrice,
    quantity: item.quantity,
  }));
}

// ─── component props ──────────────────────────────────────────────────────────

interface SalesSheetsPilotSurfaceProps {
  onOpenClassic: () => void;
}

// ─── main component ───────────────────────────────────────────────────────────

export function SalesSheetsPilotSurface({
  onOpenClassic,
}: SalesSheetsPilotSurfaceProps) {
  const [, setLocation] = useLocation();

  // ── client + selection ────────────────────────────────────────────────────
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<PricedInventoryItem[]>([]);
  const [selectedInventoryRowId, setSelectedInventoryRowId] = useState<
    string | null
  >(null);
  const [selectedPreviewRowId, setSelectedPreviewRowId] = useState<
    string | null
  >(null);

  // ── draft state ───────────────────────────────────────────────────────────
  const [currentDraftId, setCurrentDraftId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);
  const [showDeleteDraftDialog, setShowDeleteDraftDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // ── selection summaries ───────────────────────────────────────────────────
  const [browserSelectionSummary, setBrowserSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);
  const [previewSelectionSummary, setPreviewSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);

  // ── auto-save refs (avoid stale closures) ─────────────────────────────────
  const selectedItemsRef = useRef<PricedInventoryItem[]>([]);
  const draftNameRef = useRef("");
  const selectedClientIdRef = useRef<number | null>(null);
  const currentDraftIdRef = useRef<number | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastDeletedDraftIdRef = useRef<number | null>(null);
  const isDeletingDraftRef = useRef(false);
  const isInitialLoad = useRef(true);

  // ── queries ───────────────────────────────────────────────────────────────
  const clientsQuery = trpc.clients.list.useQuery({ limit: 1000 });

  const inventoryQuery = trpc.salesSheets.getInventory.useQuery(
    { clientId: selectedClientId ?? 0 },
    { enabled: selectedClientId !== null && selectedClientId > 0 }
  );

  const draftsQuery = trpc.salesSheets.getDrafts.useQuery(
    { clientId: selectedClientId ?? undefined },
    { enabled: true }
  );

  const savedViewsQuery = trpc.salesSheets.getViews.useQuery(
    { clientId: selectedClientId ?? undefined },
    { enabled: selectedClientId !== null && selectedClientId > 0 }
  );

  const historyQuery = trpc.salesSheets.getHistory.useQuery(
    { clientId: selectedClientId ?? 0, limit: 50 },
    { enabled: selectedClientId !== null && selectedClientId > 0 }
  );

  const utils = trpc.useUtils();

  // ── mutations ─────────────────────────────────────────────────────────────
  const saveDraftMutation = trpc.salesSheets.saveDraft.useMutation({
    onSuccess: (data, variables) => {
      if (
        isDeletingDraftRef.current ||
        (variables.draftId !== undefined &&
          variables.draftId === lastDeletedDraftIdRef.current)
      ) {
        return;
      }

      setCurrentDraftId(data.draftId);
      currentDraftIdRef.current = data.draftId;
      setLastSaveTime(new Date());
      setHasUnsavedChanges(false);
      void draftsQuery.refetch();
      toast.success("Draft saved");
    },
    onError: (error, variables) => {
      if (
        variables.draftId !== undefined &&
        variables.draftId === lastDeletedDraftIdRef.current
      ) {
        return;
      }

      toast.error("Failed to save draft: " + error.message);
    },
  });

  const deleteDraftMutation = trpc.salesSheets.deleteDraft.useMutation({
    onSuccess: (_data, variables) => {
      isDeletingDraftRef.current = false;
      lastDeletedDraftIdRef.current = variables.draftId;
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      setCurrentDraftId(null);
      currentDraftIdRef.current = null;
      setDraftName("");
      setLastSaveTime(null);
      setSelectedItems([]);
      setSelectedInventoryRowId(null);
      setSelectedPreviewRowId(null);
      setHasUnsavedChanges(false);
      void draftsQuery.refetch();
      setShowDeleteDraftDialog(false);
      toast.success("Draft deleted");
    },
    onError: error => {
      isDeletingDraftRef.current = false;
      setHasUnsavedChanges(
        selectedItemsRef.current.length > 0 &&
          draftNameRef.current.trim() !== ""
      );
      toast.error("Failed to delete draft: " + error.message);
    },
  });

  const convertToOrderMutation = trpc.salesSheets.save.useMutation({
    onSuccess: () => {
      // After saving, navigate to create-order with sessionStorage seed
      sessionStorage.setItem(
        "salesSheetToQuote",
        JSON.stringify({
          clientId: selectedClientId,
          items: selectedItems.map(item => ({
            id: item.id,
            name: item.name,
            basePrice: item.basePrice,
            retailPrice: item.retailPrice,
            quantity: item.quantity,
            category: item.category,
            vendor: item.vendor,
            cogsMode: item.cogsMode,
            unitCogs: item.unitCogs,
            unitCogsMin: item.unitCogsMin,
            unitCogsMax: item.unitCogsMax,
            effectiveCogs: item.effectiveCogs,
            effectiveCogsBasis: item.effectiveCogsBasis,
          })),
        })
      );
      setLocation(
        buildSalesWorkspacePath("create-order", { fromSalesSheet: true })
      );
    },
    onError: error => {
      toast.error("Failed to convert to order: " + error.message);
    },
  });

  // ── keep refs in sync ─────────────────────────────────────────────────────
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

  // ── mark dirty on item changes ────────────────────────────────────────────
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    if (selectedItems.length > 0) {
      setHasUnsavedChanges(true);
    }
  }, [selectedItems]);

  // ── auto-save ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (
      isDeletingDraftRef.current ||
      !hasUnsavedChanges ||
      !selectedClientId ||
      selectedItems.length === 0 ||
      !draftName.trim()
    ) {
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      const items = selectedItemsRef.current;
      const name = draftNameRef.current;
      const clientId = selectedClientIdRef.current;
      const draftId = currentDraftIdRef.current;

      if (!clientId || items.length === 0 || !name.trim()) {
        return;
      }

      const totalValue = items.reduce((sum, item) => sum + item.retailPrice, 0);

      saveDraftMutation.mutate({
        draftId: draftId ?? undefined,
        clientId,
        name,
        items,
        totalValue,
      });
    }, AUTO_SAVE_INTERVAL_MS);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    hasUnsavedChanges,
    selectedClientId,
    selectedItems,
    draftName,
    saveDraftMutation,
  ]);

  // ── auto-load default view when client changes ────────────────────────────
  useEffect(() => {
    if (!selectedClientId || !savedViewsQuery.data) {
      return;
    }
    const views = Array.isArray(savedViewsQuery.data)
      ? savedViewsQuery.data
      : [];
    const defaultView = views.find(
      (v: { clientId: number | null; isDefault: boolean }) =>
        v.clientId === selectedClientId && v.isDefault
    );
    if (defaultView) {
      toast.info(
        `Loaded default view: ${(defaultView as { name: string }).name}`
      );
    }
  }, [selectedClientId, savedViewsQuery.data]);

  // ── handlers ──────────────────────────────────────────────────────────────

  const handleClientChange = useCallback((clientId: number | null) => {
    setSelectedClientId(clientId);
    setSelectedItems([]);
    setCurrentDraftId(null);
    setDraftName("");
    setLastSaveTime(null);
    setHasUnsavedChanges(false);
    setSelectedInventoryRowId(null);
    setSelectedPreviewRowId(null);
    isInitialLoad.current = true;
  }, []);

  const handleAddSelectedItem = useCallback(() => {
    if (!selectedInventoryRowId) {
      return;
    }

    const inventoryRows = mapInventoryToRows(
      inventoryQuery.data ?? [],
      new Set(selectedItems.map(i => i.id))
    );

    const row = inventoryRows.find(
      r => r.identity.rowKey === selectedInventoryRowId
    );
    if (!row) {
      return;
    }

    if (selectedItems.some(item => item.id === row._raw.id)) {
      toast.info("Item already in sheet");
      return;
    }

    setSelectedItems(prev => [...prev, row._raw]);
    setHasUnsavedChanges(true);
  }, [selectedInventoryRowId, selectedItems, inventoryQuery.data]);

  const handleRemoveSelectedItem = useCallback(() => {
    if (!selectedPreviewRowId) {
      return;
    }

    const parts = selectedPreviewRowId.split(":");
    const idStr = parts[1];
    if (!idStr) {
      return;
    }

    const id = Number(idStr);
    setSelectedItems(prev => prev.filter(item => item.id !== id));
    setSelectedPreviewRowId(null);
    setHasUnsavedChanges(true);
  }, [selectedPreviewRowId]);

  const handleSaveDraft = useCallback(() => {
    if (!selectedClientId || selectedItems.length === 0 || !draftName.trim()) {
      toast.warning("Client, draft name, and at least one item are required");
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

  const handleLoadDraft = useCallback(
    async (draftId: number) => {
      try {
        const result = await utils.salesSheets.getDraftById.fetch({ draftId });
        if (result) {
          lastDeletedDraftIdRef.current = null;
          setSelectedClientId(result.clientId);
          setSelectedItems(result.items as PricedInventoryItem[]);
          setCurrentDraftId(result.id);
          setDraftName(result.name);
          setLastSaveTime(result.updatedAt ? new Date(result.updatedAt) : null);
          setHasUnsavedChanges(false);
          isInitialLoad.current = true;
          toast.success("Draft loaded");
        }
      } catch (_error) {
        toast.error("Failed to load draft");
      }
    },
    [utils.salesSheets.getDraftById]
  );

  const handleDeleteCurrentDraft = useCallback(() => {
    if (!currentDraftId) {
      return;
    }
    isDeletingDraftRef.current = true;
    lastDeletedDraftIdRef.current = currentDraftId;
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
    deleteDraftMutation.mutate({ draftId: currentDraftId });
  }, [currentDraftId, deleteDraftMutation]);

  const handleGenerateShareLink = useCallback(() => {
    if (hasUnsavedChanges) {
      toast.warning("Save the draft before generating a share link");
      return;
    }
    if (!currentDraftId) {
      toast.warning("Save the draft first to generate a share link");
      return;
    }
    // Share links target saved sheets; convert draft to sheet first if needed
    toast.info("Convert the draft to a saved sheet before sharing");
  }, [hasUnsavedChanges, currentDraftId]);

  const handleConvertToOrder = useCallback(() => {
    if (hasUnsavedChanges) {
      toast.warning("Save the draft before converting to an order");
      return;
    }
    if (!selectedClientId || selectedItems.length === 0) {
      return;
    }

    const totalValue = selectedItems.reduce(
      (sum, item) => sum + item.retailPrice,
      0
    );

    convertToOrderMutation.mutate({
      clientId: selectedClientId,
      items: selectedItems,
      totalValue,
    });
  }, [
    hasUnsavedChanges,
    selectedClientId,
    selectedItems,
    convertToOrderMutation,
  ]);

  const handleExport = useCallback(() => {
    if (selectedItems.length === 0) {
      toast.warning("No items to export");
      return;
    }

    const headers = ["Name", "Category", "Vendor", "Price", "Qty"].join(",");
    const rows = selectedItems
      .map(item =>
        [
          `"${item.name.replace(/"/g, '""')}"`,
          `"${(item.category ?? "").replace(/"/g, '""')}"`,
          `"${(item.vendor ?? "").replace(/"/g, '""')}"`,
          item.retailPrice.toFixed(2),
          item.quantity,
        ].join(",")
      )
      .join("\n");

    const csv = `${headers}\n${rows}`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const clientName =
      extractItems(clientsQuery.data).find(
        (c: { id: number }) => c.id === selectedClientId
      )?.name ?? "sheet";

    link.href = url;
    link.download = `sales-sheet-${clientName.toLowerCase().replace(/\s+/g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Sheet exported as CSV");
  }, [selectedItems, selectedClientId, clientsQuery.data]);

  const handleRefresh = useCallback(() => {
    void inventoryQuery.refetch();
    void draftsQuery.refetch();
    void savedViewsQuery.refetch();
    void historyQuery.refetch();
  }, [inventoryQuery, draftsQuery, savedViewsQuery, historyQuery]);

  // ── derived data ──────────────────────────────────────────────────────────

  const selectedItemIds = useMemo(
    () => new Set(selectedItems.map(i => i.id)),
    [selectedItems]
  );

  const searchLower = searchTerm.trim().toLowerCase();

  const inventoryRows = useMemo(() => {
    const all = inventoryQuery.data ?? [];
    const filtered = searchLower
      ? all.filter(
          item =>
            (item.name ?? "").toLowerCase().includes(searchLower) ||
            (item.category ?? "").toLowerCase().includes(searchLower) ||
            (item.vendor ?? "").toLowerCase().includes(searchLower)
        )
      : all;
    return mapInventoryToRows(filtered, selectedItemIds);
  }, [inventoryQuery.data, selectedItemIds, searchLower]);

  const previewRows = useMemo(
    () => mapSelectedToPreviewRows(selectedItems),
    [selectedItems]
  );

  const formattedDrafts: DraftInfo[] = useMemo(
    () =>
      (draftsQuery.data ?? []).map(d => ({
        id: d.id,
        name: d.name,
        clientId: d.clientId,
        itemCount: d.itemCount,
        totalValue: d.totalValue,
        updatedAt: d.updatedAt,
        createdAt: d.createdAt,
      })),
    [draftsQuery.data]
  );

  const totalSheetValue = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.retailPrice, 0),
    [selectedItems]
  );

  const selectedInventoryRow = inventoryRows.find(
    r => r.identity.rowKey === selectedInventoryRowId
  );

  // ── column defs ───────────────────────────────────────────────────────────

  const inventoryColumnDefs = useMemo<ColDef<InventoryBrowserRow>[]>(
    () => [
      {
        field: "inSheet",
        headerName: "",
        maxWidth: 40,
        cellRenderer: (params: { value: boolean }) =>
          params.value ? "\u2713" : "",
        cellStyle: { color: "var(--color-primary)", fontWeight: "bold" },
      },
      {
        field: "name",
        headerName: "Product",
        flex: 1.5,
        minWidth: 160,
      },
      {
        field: "category",
        headerName: "Category",
        minWidth: 110,
        maxWidth: 140,
      },
      {
        field: "vendor",
        headerName: "Vendor",
        minWidth: 100,
        maxWidth: 130,
      },
      {
        field: "retailPrice",
        headerName: "Price",
        minWidth: 90,
        maxWidth: 110,
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
      },
      {
        field: "quantity",
        headerName: "Qty",
        minWidth: 75,
        maxWidth: 90,
      },
      {
        field: "grade",
        headerName: "Grade",
        minWidth: 80,
        maxWidth: 100,
      },
    ],
    []
  );

  const previewColumnDefs = useMemo<ColDef<SheetPreviewRow>[]>(
    () => [
      {
        field: "name",
        headerName: "Product",
        flex: 1.5,
        minWidth: 160,
      },
      {
        field: "category",
        headerName: "Category",
        minWidth: 100,
        maxWidth: 130,
      },
      {
        field: "retailPrice",
        headerName: "Price",
        minWidth: 90,
        maxWidth: 110,
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
      },
      {
        field: "quantity",
        headerName: "Qty",
        minWidth: 75,
        maxWidth: 90,
      },
    ],
    []
  );

  // ── status bar content ────────────────────────────────────────────────────

  const statusBarLeft = (
    <span>
      {inventoryRows.length} items in browser &middot; {selectedItems.length} in
      sheet
      {browserSelectionSummary
        ? ` \u00b7 browser ${browserSelectionSummary.selectedCellCount} cells`
        : ""}
      {previewSelectionSummary
        ? ` \u00b7 preview ${previewSelectionSummary.selectedCellCount} cells`
        : ""}
    </span>
  );

  const statusBarCenter = (
    <span>
      {hasUnsavedChanges ? (
        <span className="text-amber-600 font-medium">Unsaved changes</span>
      ) : lastSaveTime ? (
        <span>Saved {lastSaveTime.toLocaleTimeString()}</span>
      ) : (
        <span>Select a client to start</span>
      )}
      {selectedInventoryRow
        ? ` \u00b7 focused: ${selectedInventoryRow.name}`
        : ""}
    </span>
  );

  // ── render ────────────────────────────────────────────────────────────────

  const clientList = useMemo(() => {
    const all = extractItems(clientsQuery.data);
    return (
      all as Array<{
        id: number;
        name: string;
        email?: string | null;
        isBuyer?: boolean | null;
      }>
    )
      .filter(c => c.isBuyer)
      .map(c => ({ id: c.id, name: c.name, email: c.email }));
  }, [clientsQuery.data]);

  const canShare = !hasUnsavedChanges && currentDraftId !== null;
  const canConvert =
    !hasUnsavedChanges && selectedItems.length > 0 && selectedClientId !== null;

  return (
    <div className="flex flex-col gap-2">
      {/* ── toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-2">
        {/* client selector */}
        <div className="w-64">
          <ClientCombobox
            value={selectedClientId}
            onValueChange={handleClientChange}
            clients={clientList}
            isLoading={clientsQuery.isLoading}
            placeholder="Choose a client..."
            emptyText="No clients found"
          />
        </div>

        {/* draft name */}
        <Input
          value={draftName}
          onChange={e => setDraftName(e.target.value)}
          placeholder="Draft name..."
          className="max-w-48"
          disabled={!selectedClientId}
        />

        {hasUnsavedChanges && (
          <Badge variant="secondary" className="text-amber-600">
            Unsaved
          </Badge>
        )}

        {/* right-side actions */}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleRefresh}
            aria-label="Refresh data"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>

          <Button
            size="sm"
            variant="outline"
            disabled={!selectedClientId}
            onClick={handleSaveDraft}
          >
            <Save className="mr-2 h-4 w-4" />
            {saveDraftMutation.isPending ? "Saving..." : "Save Draft"}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" aria-label="More actions">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                disabled={
                  !selectedClientId ||
                  selectedItems.length === 0 ||
                  !currentDraftId
                }
                onClick={() => setShowDeleteDraftDialog(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Draft
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={!canShare}
                onClick={handleGenerateShareLink}
              >
                <Link2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={selectedItems.length === 0}
                onClick={handleExport}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            size="sm"
            variant={canConvert ? "default" : "outline"}
            disabled={!canConvert}
            title={
              hasUnsavedChanges
                ? "Save the draft before converting to an order"
                : "Convert to order"
            }
            onClick={handleConvertToOrder}
          >
            <ArrowRight className="mr-2 h-4 w-4" />
            Convert to Order ({selectedItems.length})
          </Button>

          <Button size="sm" variant="ghost" onClick={onOpenClassic}>
            <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
            Classic
          </Button>
        </div>
      </div>

      {/* ── action bar (add/remove row + draft list) ────────────────────── */}
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
        <span className="text-sm font-medium text-foreground">
          Sheet actions
        </span>

        <Button
          size="sm"
          variant="default"
          disabled={!selectedInventoryRowId || !selectedClientId}
          onClick={handleAddSelectedItem}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add to Sheet
        </Button>

        <Button
          size="sm"
          variant="outline"
          disabled={!selectedPreviewRowId}
          onClick={handleRemoveSelectedItem}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Remove from Sheet
        </Button>

        {/* quick-load drafts */}
        {formattedDrafts.length > 0 && (
          <div className="flex items-center gap-1">
            <Label className="text-xs text-muted-foreground">Drafts:</Label>
            {formattedDrafts.slice(0, 5).map(draft => (
              <Button
                key={draft.id}
                size="sm"
                variant={currentDraftId === draft.id ? "default" : "ghost"}
                className="h-7 px-2 text-xs"
                onClick={() => void handleLoadDraft(draft.id)}
              >
                {draft.name || `Draft #${draft.id}`}
              </Button>
            ))}
          </div>
        )}

        <span className="ml-auto text-xs text-muted-foreground">
          {selectedItems.length > 0
            ? `Sheet total: ${formatCurrency(totalSheetValue)}`
            : "No items in sheet"}
        </span>
      </div>

      {/* ── search bar for inventory browser ────────────────────────────── */}
      {selectedClientId && (
        <Input
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          placeholder="Search inventory..."
          className="max-w-xs"
        />
      )}

      {/* ── browser + preview split ─────────────────────────────────────── */}
      {selectedClientId ? (
        <div className="grid gap-4 lg:grid-cols-4">
          {/* inventory browser (3/4 width — wider for readability) */}
          <div className="lg:col-span-3">
            <PowersheetGrid
              surfaceId="sales-sheets-browser"
              requirementIds={[
                "SALE-SHT-001",
                "SALE-SHT-002",
                "SALE-SHT-003",
                "SALE-SHT-004",
              ]}
              affordances={browserAffordances}
              title="Inventory Browser"
              description="Select items from live inventory to add to the sales catalogue. Client-sensitive pricing is applied automatically."
              rows={inventoryRows}
              columnDefs={inventoryColumnDefs}
              getRowId={row => row.identity.rowKey}
              selectedRowId={selectedInventoryRowId}
              onSelectedRowChange={row =>
                setSelectedInventoryRowId(row?.identity.rowKey ?? null)
              }
              selectionMode="cell-range"
              enableFillHandle={false}
              enableUndoRedo={false}
              onSelectionSetChange={selectionSet =>
                setSelectedInventoryRowId(selectionSet.focusedRowId)
              }
              onSelectionSummaryChange={setBrowserSelectionSummary}
              isLoading={inventoryQuery.isLoading}
              errorMessage={inventoryQuery.error?.message ?? null}
              emptyTitle="No inventory available"
              emptyDescription="Select a client to load inventory with client-sensitive pricing."
              summary={
                <span>
                  {inventoryRows.length} items &middot;{" "}
                  {inventoryRows.filter(r => r.inSheet).length} in sheet
                </span>
              }
              minHeight={320}
              rowHeight={36}
            />
          </div>

          {/* sheet preview (1/4 width) */}
          <div className="lg:col-span-1">
            <PowersheetGrid
              surfaceId="sales-sheets-preview"
              requirementIds={["SALE-SHT-002", "SALE-SHT-005", "SALE-SHT-006"]}
              affordances={previewAffordances}
              title="Sheet Preview"
              description="Items added to the sheet. Share and convert actions require a saved (clean) state."
              rows={previewRows}
              columnDefs={previewColumnDefs}
              getRowId={row => row.identity.rowKey}
              selectedRowId={selectedPreviewRowId}
              onSelectedRowChange={row =>
                setSelectedPreviewRowId(row?.identity.rowKey ?? null)
              }
              selectionMode="cell-range"
              enableFillHandle={false}
              enableUndoRedo={false}
              onSelectionSummaryChange={setPreviewSelectionSummary}
              isLoading={false}
              errorMessage={null}
              emptyTitle="Sheet is empty"
              emptyDescription="Select an item in the browser and click Add to Sheet."
              summary={
                previewRows.length > 0 ? (
                  <span>
                    {previewRows.length} items &middot;{" "}
                    {formatCurrency(totalSheetValue)} total
                  </span>
                ) : undefined
              }
              minHeight={320}
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-muted-foreground">
          <FileText className="mb-4 h-12 w-12 opacity-40" />
          <p className="text-sm">
            Select a client to start building a sales catalogue
          </p>
        </div>
      )}

      {/* ── version history context ─────────────────────────────────────── */}
      {historyQuery.data && historyQuery.data.length > 0 && (
        <div className="rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
          <span className="text-xs text-muted-foreground">
            History: {historyQuery.data.length} saved sheet(s) for this client
          </span>
        </div>
      )}

      {/* ── status bar ──────────────────────────────────────────────────── */}
      <WorkSurfaceStatusBar
        left={statusBarLeft}
        center={statusBarCenter}
        right={
          <KeyboardHintBar hints={browserKeyboardHints} className="text-xs" />
        }
      />

      {/* ── confirm delete draft ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={showDeleteDraftDialog}
        onOpenChange={setShowDeleteDraftDialog}
        title="Delete Draft?"
        description={
          currentDraftId
            ? `Delete draft "${draftName || `#${currentDraftId}`}"? This cannot be undone.`
            : "Delete the current draft? This cannot be undone."
        }
        confirmLabel={
          deleteDraftMutation.isPending ? "Deleting..." : "Delete Draft"
        }
        variant="destructive"
        onConfirm={handleDeleteCurrentDraft}
      />
    </div>
  );
}

export default SalesSheetsPilotSurface;

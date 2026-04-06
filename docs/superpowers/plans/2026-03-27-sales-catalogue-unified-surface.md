# Sales Catalogue Unified Surface — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace both `SalesSheetCreatorPage` (classic) and `SalesSheetsPilotSurface` (sheet-native) with one unified `SalesCatalogueSurface` that follows the directional mockup layout — left inventory browser PowersheetGrid, right preview PowersheetGrid, inline support modules, minimal padding.

**Architecture:** Single new component composes existing sub-components (ClientCombobox, QuickViewSelector, AdvancedFilters, PowersheetGrid, WorkSurfaceStatusBar) into the mockup layout. A `useCatalogueDraft` hook encapsulates draft state/auto-save. The `SalesWorkspacePage` routing simplifies to render one surface with no SheetModeToggle.

**Tech Stack:** React 19, TypeScript, AG Grid via PowersheetGrid, tRPC, Tailwind 4, shadcn/ui

**Spec:** `docs/superpowers/specs/2026-03-27-unified-sheet-native-sales-surfaces-design.md` (Phase 1)

**Phase 2 (Sales Order)** is a separate plan — it runs after this ships and validates the layout pattern.

### QA Review Notes — Intentional Descopes

These features exist in the classic `SalesSheetCreatorPage` / `SalesSheetPreview` but are intentionally NOT carried over. They align with the pilot surface's existing behavior (SalesSheetsPilotSurface already dropped them):

- **Drag-and-drop reordering** — AG Grid cell-range mode does not support @dnd-kit drag. The pilot already marked Reorder as `available: false`. Users can remove + re-add to control order. Follow-up: consider AG Grid `rowDrag` if users request it.
- **Per-item price override editing** — The classic SalesSheetPreview allowed inline per-item price overrides with strikethrough. The new preview grid is read-only (matching the pilot). Price overrides can be added as a follow-up by making the preview grid's Price column editable.
- **Quick quantity input (FEAT-003)** — The classic InventoryBrowser had an `orderQuantity` field per row. The pilot already uses single-add without quantity input. Items are added at their inventory quantity.
- **Multi-select batch-add** — The classic InventoryBrowser had checkbox multi-select + "Add Selected (N)". The new surface uses AG Grid single-row select + Add, matching the pilot pattern. For bulk adds, users can click Add repeatedly.
- **totalValue formula** — The plan uses `retailPrice * quantity` (matches the server's `calculateItemsTotal`). The old pilot used `retailPrice` only (price without quantity multiplication) which was technically incorrect but harmless since the server recalculates.

---

## File Structure

| Action | Path | Responsibility |
|--------|------|---------------|
| Create | `client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx` | Main unified surface — toolbar, action bar, split grids, handoff bar, status bar |
| Create | `client/src/hooks/useCatalogueDraft.ts` | Draft lifecycle: create, update, auto-save, delete, dirty tracking |
| Create | `client/src/components/spreadsheet-native/SalesCatalogueSurface.test.tsx` | Component tests |
| Create | `client/src/hooks/useCatalogueDraft.test.ts` | Hook tests |
| Modify | `client/src/pages/SalesWorkspacePage.tsx` | Replace sales-sheets panel + remove SheetModeToggle |
| Delete | (deferred cleanup) | SalesSheetCreatorPage, SalesSheetsPilotSurface, SalesSheetPreview, InventoryBrowser, DraftControls |

---

### Task 1: Create `useCatalogueDraft` Hook

Extracts draft state management from `SalesSheetsPilotSurface` into a reusable hook. Handles draft CRUD, auto-save with stale-closure-safe refs, dirty tracking, and share link generation.

**Files:**
- Create: `client/src/hooks/useCatalogueDraft.ts`
- Create: `client/src/hooks/useCatalogueDraft.test.ts`
- Reference: `client/src/components/spreadsheet-native/SalesSheetsPilotSurface.tsx` (lines 130-400)
- Reference: `client/src/components/sales/types.ts`

- [ ] **Step 1: Write the failing test for useCatalogueDraft**

Create `client/src/hooks/useCatalogueDraft.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCatalogueDraft } from "./useCatalogueDraft";

// Mock tRPC
vi.mock("@/lib/trpc", () => ({
  trpc: {
    salesSheets: {
      saveDraft: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      deleteDraft: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      getDrafts: { useQuery: vi.fn(() => ({ data: [], isLoading: false })) },
      getDraftById: { useQuery: vi.fn(() => ({ data: null })) },
      generateShareLink: { useMutation: vi.fn(() => ({ mutateAsync: vi.fn() })) },
      save: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
    },
    useUtils: vi.fn(() => ({ salesSheets: { getDrafts: { invalidate: vi.fn() } } })),
  },
}));

describe("useCatalogueDraft", () => {
  it("returns initial state with no draft", () => {
    const { result } = renderHook(() =>
      useCatalogueDraft({ clientId: null, items: [] })
    );
    expect(result.current.currentDraftId).toBeNull();
    expect(result.current.draftName).toBe("");
    expect(result.current.hasUnsavedChanges).toBe(false);
    expect(result.current.lastSaveTime).toBeNull();
    expect(result.current.canShare).toBe(false);
    expect(result.current.canConvert).toBe(false);
  });

  it("marks dirty when items change after initial load", () => {
    const { result, rerender } = renderHook(
      ({ items }) => useCatalogueDraft({ clientId: 1, items }),
      { initialProps: { items: [{ id: 1 }] as never[] } }
    );
    // Initial load should not be dirty
    expect(result.current.hasUnsavedChanges).toBe(false);

    // Change items
    rerender({ items: [{ id: 1 }, { id: 2 }] as never[] });
    expect(result.current.hasUnsavedChanges).toBe(true);
  });

  it("blocks share and convert when unsaved changes exist", () => {
    const { result, rerender } = renderHook(
      ({ items }) => useCatalogueDraft({ clientId: 1, items }),
      { initialProps: { items: [{ id: 1 }] as never[] } }
    );
    rerender({ items: [{ id: 1 }, { id: 2 }] as never[] });
    expect(result.current.canShare).toBe(false);
    expect(result.current.canConvert).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run client/src/hooks/useCatalogueDraft.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement useCatalogueDraft hook**

Create `client/src/hooks/useCatalogueDraft.ts`:

```typescript
import { useState, useEffect, useRef, useCallback } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { PricedInventoryItem, DraftInfo } from "@/components/sales/types";

const AUTO_SAVE_INTERVAL_MS = 30_000;

interface UseCatalogueDraftOptions {
  clientId: number | null;
  items: PricedInventoryItem[];
}

interface UseCatalogueDraftReturn {
  // Draft identity
  currentDraftId: number | null;
  draftName: string;
  setDraftName: (name: string) => void;

  // State
  hasUnsavedChanges: boolean;
  lastSaveTime: Date | null;
  isSaving: boolean;

  // Gating
  canShare: boolean;
  canConvert: boolean;

  // Actions
  saveDraft: () => void;
  loadDraft: (draftId: number) => Promise<PricedInventoryItem[]>;
  deleteDraft: () => void;
  handleConvertToOrder: () => void;

  // Share
  generateShareLink: () => Promise<void>;

  // Drafts list
  drafts: DraftInfo[];
  draftsLoading: boolean;

  // Reset
  resetDraft: () => void;
}

export function useCatalogueDraft({
  clientId,
  items,
}: UseCatalogueDraftOptions): UseCatalogueDraftReturn {
  const utils = trpc.useUtils();

  // ── draft state ─────────────────────────────────────────────────────────
  const [currentDraftId, setCurrentDraftId] = useState<number | null>(null);
  const [draftName, setDraftName] = useState("");
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState<Date | null>(null);

  // ── refs for stale-closure-safe auto-save ───────────────────────────────
  const isInitialLoad = useRef(true);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDeletingDraftRef = useRef(false);
  const lastDeletedDraftIdRef = useRef<number | null>(null);
  const selectedItemsRef = useRef<PricedInventoryItem[]>([]);
  const draftNameRef = useRef("");
  const selectedClientIdRef = useRef<number | null>(null);
  const currentDraftIdRef = useRef<number | null>(null);

  // ── keep refs in sync ───────────────────────────────────────────────────
  useEffect(() => { selectedItemsRef.current = items; }, [items]);
  useEffect(() => { draftNameRef.current = draftName; }, [draftName]);
  useEffect(() => { selectedClientIdRef.current = clientId; }, [clientId]);
  useEffect(() => { currentDraftIdRef.current = currentDraftId; }, [currentDraftId]);

  // ── mutations ───────────────────────────────────────────────────────────
  const saveDraftMutation = trpc.salesSheets.saveDraft.useMutation({
    onSuccess: (data) => {
      // Server returns { draftId }, not { id }
      if (data?.draftId && !currentDraftIdRef.current) {
        setCurrentDraftId(data.draftId);
      }
      setHasUnsavedChanges(false);
      setLastSaveTime(new Date());
      void utils.salesSheets.getDrafts.invalidate();
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
    onSuccess: () => {
      isDeletingDraftRef.current = false;
      lastDeletedDraftIdRef.current = currentDraftIdRef.current;
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }
      setCurrentDraftId(null);
      currentDraftIdRef.current = null;
      setDraftName("");
      setLastSaveTime(null);
      setHasUnsavedChanges(false);
      void utils.salesSheets.getDrafts.invalidate();
      toast.success("Draft deleted");
    },
    onError: (error) => {
      isDeletingDraftRef.current = false;
      toast.error("Failed to delete draft: " + error.message);
    },
  });

  const shareLinkMutation = trpc.salesSheets.generateShareLink.useMutation();

  // Track the last finalized sheet ID — needed for share link generation.
  // salesSheets.save returns a number (the sheetId), not an object.
  const [lastSavedSheetId, setLastSavedSheetId] = useState<number | null>(null);

  const convertMutation = trpc.salesSheets.save.useMutation({
    onSuccess: (sheetId: number) => {
      setLastSavedSheetId(sheetId);
      sessionStorage.setItem(
        "salesSheetToQuote",
        JSON.stringify({
          clientId,
          items: items.map((item) => ({
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
    },
    onError: (error) => {
      toast.error("Failed to convert: " + error.message);
    },
  });

  // ── queries ─────────────────────────────────────────────────────────────
  const draftsQuery = trpc.salesSheets.getDrafts.useQuery(
    { clientId: clientId ?? undefined },
    { enabled: clientId !== null }
  );

  const drafts: DraftInfo[] = (draftsQuery.data ?? []).map((d: Record<string, unknown>) => ({
    id: d.id as number,
    name: d.name as string,
    clientId: d.clientId as number,
    itemCount: d.itemCount as number,
    totalValue: d.totalValue as string,
    updatedAt: d.updatedAt as Date | null,
    createdAt: d.createdAt as Date | null,
  }));

  // ── mark dirty on item changes ──────────────────────────────────────────
  useEffect(() => {
    if (isInitialLoad.current) {
      isInitialLoad.current = false;
      return;
    }
    if (items.length > 0) {
      setHasUnsavedChanges(true);
    }
  }, [items]);

  // ── auto-save ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (
      isDeletingDraftRef.current ||
      !hasUnsavedChanges ||
      !clientId ||
      items.length === 0 ||
      !draftName.trim()
    ) {
      return;
    }

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    autoSaveTimerRef.current = setTimeout(() => {
      const currentItems = selectedItemsRef.current;
      const name = draftNameRef.current;
      const cid = selectedClientIdRef.current;
      const did = currentDraftIdRef.current;

      if (!cid || currentItems.length === 0 || !name.trim()) return;

      const totalValue = currentItems.reduce(
        (sum, item) => sum + item.retailPrice * item.quantity,
        0
      );

      saveDraftMutation.mutate({
        draftId: did ?? undefined,
        clientId: cid,
        name,
        items: currentItems,
        totalValue,
      });
    }, AUTO_SAVE_INTERVAL_MS);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [hasUnsavedChanges, clientId, items, draftName, saveDraftMutation]);

  // ── actions ─────────────────────────────────────────────────────────────
  const saveDraft = useCallback(() => {
    if (!clientId || items.length === 0 || !draftName.trim()) {
      toast.error("Client and at least one item required to save");
      return;
    }

    const totalValue = items.reduce(
      (sum, item) => sum + item.retailPrice * item.quantity,
      0
    );

    saveDraftMutation.mutate({
      draftId: currentDraftId ?? undefined,
      clientId,
      name: draftName,
      items,
      totalValue,
    });
  }, [clientId, items, draftName, currentDraftId, saveDraftMutation]);

  const loadDraft = useCallback(
    async (draftId: number): Promise<PricedInventoryItem[]> => {
      const result = await utils.salesSheets.getDraftById.fetch({ draftId });
      if (result) {
        setCurrentDraftId(result.id);
        setDraftName(result.name ?? "");
        setLastSaveTime(
          result.updatedAt ? new Date(result.updatedAt as string) : null
        );
        setHasUnsavedChanges(false);
        isInitialLoad.current = true;
        return result.items as PricedInventoryItem[];
      }
      return [];
    },
    [utils.salesSheets.getDraftById]
  );

  const deleteDraft = useCallback(() => {
    if (!currentDraftId) return;
    isDeletingDraftRef.current = true;
    deleteDraftMutation.mutate({ draftId: currentDraftId });
  }, [currentDraftId, deleteDraftMutation]);

  const generateShareLink = useCallback(async () => {
    // Share link requires a finalized sheet ID, not a draft ID.
    // salesSheets.generateShareLink operates on the salesSheetHistory table.
    if (!lastSavedSheetId || hasUnsavedChanges) return;
    try {
      const result = await shareLinkMutation.mutateAsync({
        sheetId: lastSavedSheetId,
        expiresInDays: 7,
      });
      if (result?.shareUrl) {
        await navigator.clipboard.writeText(result.shareUrl);
        toast.success("Share link copied to clipboard");
      }
    } catch {
      toast.error("Failed to generate share link");
    }
  }, [currentDraftId, hasUnsavedChanges, shareLinkMutation]);

  const handleConvertToOrder = useCallback(() => {
    if (!clientId || items.length === 0 || hasUnsavedChanges) return;

    const totalValue = items.reduce(
      (sum, item) => sum + item.retailPrice * item.quantity,
      0
    );

    convertMutation.mutate({
      clientId,
      items,
      totalValue,
    });
  }, [clientId, items, hasUnsavedChanges, convertMutation]);

  const resetDraft = useCallback(() => {
    setCurrentDraftId(null);
    currentDraftIdRef.current = null;
    setDraftName("");
    setLastSaveTime(null);
    setHasUnsavedChanges(false);
    isInitialLoad.current = true;
  }, []);

  return {
    currentDraftId,
    draftName,
    setDraftName,
    hasUnsavedChanges,
    lastSaveTime,
    isSaving: saveDraftMutation.isPending,
    // Share requires a FINALIZED sheet ID (not a draft).
    // The generateShareLink API operates on salesSheetHistory, not drafts.
    // canShare is true only after salesSheets.save has been called and returned a sheetId.
    canShare: !hasUnsavedChanges && lastSavedSheetId !== null && items.length > 0,
    canConvert: !hasUnsavedChanges && clientId !== null && items.length > 0,
    lastSavedSheetId,
    saveDraft,
    loadDraft,
    deleteDraft,
    handleConvertToOrder,
    generateShareLink,
    drafts,
    draftsLoading: draftsQuery.isLoading,
    resetDraft,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run client/src/hooks/useCatalogueDraft.test.ts`
Expected: PASS — 3 tests pass

- [ ] **Step 5: Commit**

```bash
git add client/src/hooks/useCatalogueDraft.ts client/src/hooks/useCatalogueDraft.test.ts
git commit -m "feat(sales-catalogue): add useCatalogueDraft hook for draft lifecycle"
```

---

### Task 2: Create `SalesCatalogueSurface` Component

The main unified surface with all layout zones. This is the largest task — builds the complete component with toolbar, action bar, split grids, handoff bar, and status bar.

**Files:**
- Create: `client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx`
- Reference: `client/src/components/spreadsheet-native/SalesSheetsPilotSurface.tsx` (column defs, row mapping)
- Reference: `client/src/components/sales/types.ts` (all types)
- Reference: `docs/superpowers/specs/2026-03-27-unified-sheet-native-sales-surfaces-design.md` (layout spec)

- [ ] **Step 1: Write the failing test**

Create `client/src/components/spreadsheet-native/SalesCatalogueSurface.test.tsx`:

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SalesCatalogueSurface } from "./SalesCatalogueSurface";

// Mock PowersheetGrid since AG Grid doesn't render in JSDOM
vi.mock("./PowersheetGrid", () => ({
  PowersheetGrid: ({ title }: { title: string }) => (
    <div data-testid={`grid-${title}`}>{title}</div>
  ),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    salesSheets: {
      getInventory: { useQuery: vi.fn(() => ({ data: [], isLoading: false })) },
      saveDraft: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      deleteDraft: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      getDrafts: { useQuery: vi.fn(() => ({ data: [], isLoading: false })) },
      getDraftById: { useQuery: vi.fn(() => ({ data: null })) },
      generateShareLink: { useMutation: vi.fn(() => ({ mutateAsync: vi.fn() })) },
      save: { useMutation: vi.fn(() => ({ mutate: vi.fn(), isPending: false })) },
      getViews: { useQuery: vi.fn(() => ({ data: [] })) },
    },
    clients: {
      list: { useQuery: vi.fn(() => ({ data: { items: [] }, isLoading: false })) },
    },
    useUtils: vi.fn(() => ({
      salesSheets: {
        getDrafts: { invalidate: vi.fn() },
        getDraftById: { fetch: vi.fn() },
      },
    })),
  },
}));

vi.mock("wouter", () => ({
  useLocation: vi.fn(() => ["/sales?tab=sales-sheets", vi.fn()]),
}));

describe("SalesCatalogueSurface", () => {
  it("renders toolbar with Sales Catalogue badge", () => {
    render(<SalesCatalogueSurface />);
    expect(screen.getByText("Sales Catalogue")).toBeInTheDocument();
  });

  it("renders both grids when client is selected", () => {
    // With no client, grids should show empty state
    render(<SalesCatalogueSurface />);
    expect(screen.getByText(/select a client/i)).toBeInTheDocument();
  });

  it("renders handoff bar with convert buttons", () => {
    render(<SalesCatalogueSurface />);
    expect(screen.getByText("→ Sales Order")).toBeInTheDocument();
    expect(screen.getByText("→ Quote")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run client/src/components/spreadsheet-native/SalesCatalogueSurface.test.tsx`
Expected: FAIL — module not found

- [ ] **Step 3: Create the component file with all layout zones**

Create `client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx`:

```typescript
/**
 * SalesCatalogueSurface
 *
 * Unified sheet-native surface for Sales Catalogues.
 * Replaces both SalesSheetCreatorPage (classic) and SalesSheetsPilotSurface (pilot).
 *
 * Layout: Toolbar → Action Bar → Split Grids (Inventory 3/4 | Preview 1/4) → Handoff Bar → Status Bar
 *
 * Spec: docs/superpowers/specs/2026-03-27-unified-sheet-native-sales-surfaces-design.md
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import {
  ArrowRight,
  Download,
  FileText,
  Link2,
  MoreHorizontal,
  Plus,
  Printer,
  RefreshCw,
  Save,
  Trash2,
  Video,
  X,
} from "lucide-react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { buildSalesWorkspacePath } from "@/lib/workspaceRoutes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ClientCombobox } from "@/components/ui/client-combobox";
import { QuickViewSelector } from "@/components/sales/QuickViewSelector";
import { SaveViewDialog } from "@/components/sales/SaveViewDialog";
import {
  KeyboardHintBar,
  type KeyboardHint,
} from "@/components/work-surface/KeyboardHintBar";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import { PowersheetGrid } from "./PowersheetGrid";
import type { PricedInventoryItem } from "@/components/sales/types";
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  DEFAULT_COLUMN_VISIBILITY,
  type InventoryFilters,
  type InventorySortConfig,
  type ColumnVisibility,
} from "@/components/sales/types";
import { useCatalogueDraft } from "@/hooks/useCatalogueDraft";

// ── types ────────────────────────────────────────────────────────────────────

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
  _raw: PricedInventoryItem;
}

interface SheetPreviewRow {
  identity: { rowKey: string };
  index: number;
  name: string;
  category: string;
  retailPrice: number;
  quantity: number;
  lineTotal: number;
  _raw: PricedInventoryItem;
}

// ── helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    value
  );

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const keyboardHints: KeyboardHint[] = [
  { key: `${mod}+S`, label: "save" },
  { key: `${mod}+C`, label: "copy" },
  { key: "Click", label: "select" },
  { key: "Shift+Click", label: "extend" },
];

function mapInventoryToRows(
  items: PricedInventoryItem[],
  selectedIds: Set<number>
): InventoryBrowserRow[] {
  return items.map((item) => ({
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

function mapItemsToPreviewRows(items: PricedInventoryItem[]): SheetPreviewRow[] {
  return items.map((item, index) => ({
    identity: { rowKey: `preview:${item.id}` },
    index: index + 1,
    name: item.name,
    category: item.category ?? "-",
    retailPrice: item.retailPrice,
    quantity: item.quantity,
    lineTotal: item.retailPrice * item.quantity,
    _raw: item,
  }));
}

// ── component ────────────────────────────────────────────────────────────────

export function SalesCatalogueSurface() {
  const [, setLocation] = useLocation();

  // ── client state ───────────────────────────────────────────────────────
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [selectedItems, setSelectedItems] = useState<PricedInventoryItem[]>([]);
  const [selectedInventoryRowId, setSelectedInventoryRowId] = useState<
    string | null
  >(null);
  const [selectedPreviewRowId, setSelectedPreviewRowId] = useState<
    string | null
  >(null);

  // ── filter/sort/view state ─────────────────────────────────────────────
  const [filters, setFilters] = useState<InventoryFilters>(DEFAULT_FILTERS);
  const [sort, setSort] = useState<InventorySortConfig>(DEFAULT_SORT);
  const [columnVisibility, setColumnVisibility] = useState<ColumnVisibility>(
    DEFAULT_COLUMN_VISIBILITY
  );
  const [currentViewId, setCurrentViewId] = useState<number | null>(null);
  const [showSaveViewDialog, setShowSaveViewDialog] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // ── dialogs ────────────────────────────────────────────────────────────
  const [showDeleteDraftDialog, setShowDeleteDraftDialog] = useState(false);

  // ── draft hook ─────────────────────────────────────────────────────────
  const draft = useCatalogueDraft({ clientId: selectedClientId, items: selectedItems });

  // ── data ───────────────────────────────────────────────────────────────
  const clientsQuery = trpc.clients.list.useQuery({ limit: 1000 });
  const clientList = useMemo(() => {
    const data = clientsQuery.data;
    const items = Array.isArray(data) ? data : (data?.items ?? []);
    return items
      .filter((c: { isBuyer?: boolean | null }) => c.isBuyer)
      .map((c: { id: number; name: string; email?: string | null }) => ({
        id: c.id,
        name: c.name,
        email: c.email,
      }));
  }, [clientsQuery.data]);

  const inventoryQuery = trpc.salesSheets.getInventory.useQuery(
    { clientId: selectedClientId! },
    { enabled: selectedClientId !== null }
  );

  // ── row data ───────────────────────────────────────────────────────────
  const selectedItemIds = useMemo(
    () => new Set(selectedItems.map((i) => i.id)),
    [selectedItems]
  );

  const inventoryRows = useMemo(() => {
    let items = inventoryQuery.data ?? [];

    // Apply search filter
    if (searchTerm.trim()) {
      const lower = searchTerm.trim().toLowerCase();
      items = items.filter(
        (item: PricedInventoryItem) =>
          item.name.toLowerCase().includes(lower) ||
          (item.category ?? "").toLowerCase().includes(lower) ||
          (item.vendor ?? "").toLowerCase().includes(lower)
      );
    }

    return mapInventoryToRows(items, selectedItemIds);
  }, [inventoryQuery.data, selectedItemIds, searchTerm]);

  const previewRows = useMemo(
    () => mapItemsToPreviewRows(selectedItems),
    [selectedItems]
  );

  const totalSheetValue = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.retailPrice * item.quantity, 0),
    [selectedItems]
  );

  const totalItemCount = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.quantity, 0),
    [selectedItems]
  );

  // ── column defs ────────────────────────────────────────────────────────
  const inventoryColumnDefs = useMemo<ColDef<InventoryBrowserRow>[]>(
    () => [
      {
        field: "inSheet",
        headerName: "",
        maxWidth: 36,
        cellRenderer: (params: { value: boolean }) =>
          params.value ? "\u2713" : "",
        cellStyle: { color: "var(--color-primary)", fontWeight: "bold" },
        cellClass: "powersheet-cell--locked",
      },
      { field: "name", headerName: "Product", flex: 1.5, minWidth: 160, cellClass: "powersheet-cell--locked" },
      { field: "category", headerName: "Category", minWidth: 100, maxWidth: 130, cellClass: "powersheet-cell--locked" },
      { field: "vendor", headerName: "Vendor", minWidth: 90, maxWidth: 120, cellClass: "powersheet-cell--locked" },
      {
        field: "retailPrice",
        headerName: "Retail",
        minWidth: 85,
        maxWidth: 105,
        valueFormatter: (params) => formatCurrency(Number(params.value ?? 0)),
        cellClass: "powersheet-cell--locked",
      },
      { field: "quantity", headerName: "Qty", minWidth: 60, maxWidth: 80, cellClass: "powersheet-cell--locked" },
      { field: "grade", headerName: "Grade", minWidth: 70, maxWidth: 90, cellClass: "powersheet-cell--locked" },
    ],
    []
  );

  const previewColumnDefs = useMemo<ColDef<SheetPreviewRow>[]>(
    () => [
      { field: "index", headerName: "#", maxWidth: 36, cellClass: "powersheet-cell--locked font-mono text-muted-foreground" },
      { field: "name", headerName: "Item", flex: 1.5, minWidth: 120, cellClass: "powersheet-cell--locked" },
      { field: "quantity", headerName: "Qty", minWidth: 50, maxWidth: 65, cellClass: "powersheet-cell--locked" },
      {
        field: "lineTotal",
        headerName: "Total",
        minWidth: 75,
        maxWidth: 95,
        valueFormatter: (params) => formatCurrency(Number(params.value ?? 0)),
        cellClass: "powersheet-cell--locked",
      },
    ],
    []
  );

  // ── handlers ───────────────────────────────────────────────────────────
  const handleClientChange = useCallback(
    (clientId: number | null) => {
      setSelectedClientId(clientId);
      setSelectedItems([]);
      setSelectedInventoryRowId(null);
      setSelectedPreviewRowId(null);
      setSearchTerm("");
      setFilters(DEFAULT_FILTERS);
      setSort(DEFAULT_SORT);
      setColumnVisibility(DEFAULT_COLUMN_VISIBILITY);
      setCurrentViewId(null);
      draft.resetDraft();
    },
    [draft]
  );

  const handleAddSelectedItem = useCallback(() => {
    if (!selectedInventoryRowId) return;
    const row = inventoryRows.find(
      (r) => r.identity.rowKey === selectedInventoryRowId
    );
    if (!row || selectedItemIds.has(row.inventoryId)) return;
    setSelectedItems((prev) => [...prev, row._raw]);
  }, [selectedInventoryRowId, inventoryRows, selectedItemIds]);

  const handleRemoveSelectedItem = useCallback(() => {
    if (!selectedPreviewRowId) return;
    const row = previewRows.find(
      (r) => r.identity.rowKey === selectedPreviewRowId
    );
    if (!row) return;
    setSelectedItems((prev) => prev.filter((i) => i.id !== row._raw.id));
    setSelectedPreviewRowId(null);
  }, [selectedPreviewRowId, previewRows]);

  const handleClearAll = useCallback(() => {
    setSelectedItems([]);
    setSelectedPreviewRowId(null);
  }, []);

  const handleRefresh = useCallback(() => {
    void inventoryQuery.refetch();
  }, [inventoryQuery]);

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

  const handleExport = useCallback(() => {
    if (selectedItems.length === 0) return;
    const csv = [
      "Product,Category,Qty,Retail Price",
      ...selectedItems.map(
        (i) => `"${i.name}","${i.category ?? ""}",${i.quantity},${i.retailPrice}`
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${draft.draftName || "catalogue"}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("CSV exported");
  }, [selectedItems, draft.draftName]);

  const navigateToOrder = useCallback(
    (fromSalesSheet: boolean) => {
      if (!draft.canConvert) return;
      draft.handleConvertToOrder();
      setLocation(
        buildSalesWorkspacePath("create-order", { fromSalesSheet })
      );
    },
    [draft, setLocation]
  );

  // ── keyboard shortcuts ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      )
        return;

      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        draft.saveDraft();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [draft]);

  // ── selected client name ───────────────────────────────────────────────
  const selectedClientName = useMemo(() => {
    if (!selectedClientId) return undefined;
    return clientList.find((c) => c.id === selectedClientId)?.name;
  }, [selectedClientId, clientList]);

  // ── render ─────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-1">
      {/* ── TOOLBAR ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 px-2 py-1 border-b border-border/70 bg-background">
        <Button
          size="sm"
          variant="outline"
          className="h-7 px-2 text-xs"
          onClick={() => setLocation(buildSalesWorkspacePath("orders"))}
        >
          &larr; Orders
        </Button>
        <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px]">
          Sales Catalogue
        </Badge>
        <Input
          value={draft.draftName}
          onChange={(e) => draft.setDraftName(e.target.value)}
          placeholder="Draft name..."
          className="h-7 max-w-36 text-xs"
          disabled={!selectedClientId}
        />
        <div className="w-48">
          <ClientCombobox
            value={selectedClientId}
            onValueChange={handleClientChange}
            clients={clientList}
            isLoading={clientsQuery.isLoading}
            placeholder="Client..."
            emptyText="No clients"
          />
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          {draft.hasUnsavedChanges && (
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 text-[10px] h-5">
              Unsaved
            </Badge>
          )}
          {draft.lastSaveTime && !draft.hasUnsavedChanges && (
            <Badge variant="outline" className="text-emerald-600 border-emerald-300 bg-emerald-50 text-[10px] h-5">
              Saved
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={!selectedClientId}
            onClick={draft.saveDraft}
          >
            <Save className="mr-1 h-3 w-3" />
            {draft.isSaving ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      {/* ── ACTION BAR ───────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-1.5 px-2 py-0.5 rounded-md border border-border/70 bg-muted/30 mx-1">
        <span className="text-xs font-medium">Sheet</span>
        <Button
          size="sm"
          className="h-6 px-2 text-[10px]"
          disabled={!selectedInventoryRowId || !selectedClientId}
          onClick={handleAddSelectedItem}
        >
          <Plus className="mr-1 h-3 w-3" />
          Add
        </Button>
        <Button
          size="sm"
          variant="outline"
          className="h-6 px-2 text-[10px]"
          disabled={!selectedPreviewRowId}
          onClick={handleRemoveSelectedItem}
        >
          <X className="mr-1 h-3 w-3" />
          Remove
        </Button>

        {selectedClientId && (
          <>
            <QuickViewSelector
              clientId={selectedClientId}
              onLoadView={handleLoadView}
              currentViewId={currentViewId}
            />
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px]"
              onClick={() => setShowSaveViewDialog(true)}
            >
              Save View
            </Button>
          </>
        )}

        <span className="ml-auto text-[10px] text-muted-foreground">
          {selectedItems.length > 0
            ? `${selectedItems.length} items \u00b7 ${formatCurrency(totalSheetValue)}`
            : "No items"}
        </span>
      </div>

      {/* ── SPLIT GRIDS ──────────────────────────────────────────────── */}
      {selectedClientId ? (
        <div className="grid gap-1.5 lg:grid-cols-4 px-1">
          {/* Left: Inventory Browser (3/4) */}
          <div className="lg:col-span-3">
            <div className="mb-1">
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search product, vendor, category..."
                className="h-7 max-w-xs text-xs"
              />
            </div>
            <PowersheetGrid
              surfaceId="catalogue-inventory-browser"
              requirementIds={["CAT-001", "CAT-002"]}
              title="Inventory"
              description="Client-priced inventory. Select a row and click Add to include it in the catalogue."
              rows={inventoryRows}
              columnDefs={inventoryColumnDefs}
              getRowId={(row) => row.identity.rowKey}
              selectedRowId={selectedInventoryRowId}
              onSelectedRowChange={(row) =>
                setSelectedInventoryRowId(row?.identity.rowKey ?? null)
              }
              selectionMode="cell-range"
              enableFillHandle={false}
              enableUndoRedo={false}
              isLoading={inventoryQuery.isLoading}
              errorMessage={inventoryQuery.error?.message ?? null}
              emptyTitle="No inventory"
              emptyDescription="This client has no priced inventory items."
              summary={
                <span>
                  {inventoryRows.length} visible
                  {selectedClientName ? ` \u00b7 ${selectedClientName}` : ""}
                </span>
              }
              minHeight={340}
            />
          </div>

          {/* Right: Preview (1/4) */}
          <div className="lg:col-span-1 flex flex-col gap-1">
            <PowersheetGrid
              surfaceId="catalogue-preview"
              requirementIds={["CAT-003"]}
              title="Preview"
              description="Items selected for this catalogue."
              rows={previewRows}
              columnDefs={previewColumnDefs}
              getRowId={(row) => row.identity.rowKey}
              selectedRowId={selectedPreviewRowId}
              onSelectedRowChange={(row) =>
                setSelectedPreviewRowId(row?.identity.rowKey ?? null)
              }
              selectionMode="cell-range"
              enableFillHandle={false}
              enableUndoRedo={false}
              emptyTitle="Empty catalogue"
              emptyDescription="Select items from inventory and click Add."
              headerActions={
                selectedItems.length > 0 ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px]"
                    onClick={handleClearAll}
                  >
                    Clear
                  </Button>
                ) : null
              }
              summary={
                selectedItems.length > 0 ? (
                  <span>
                    {totalItemCount} units \u00b7 {formatCurrency(totalSheetValue)}
                  </span>
                ) : undefined
              }
              minHeight={220}
            />

            {/* Output actions */}
            <div className="flex gap-1 flex-wrap">
              <Button
                size="sm"
                className="h-7 flex-1 text-[10px]"
                disabled={!selectedClientId || selectedItems.length === 0}
                onClick={draft.saveDraft}
              >
                <Save className="mr-1 h-3 w-3" />
                Save
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[10px]"
                disabled={!draft.canShare}
                onClick={() => void draft.generateShareLink()}
              >
                <Link2 className="h-3 w-3" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-[10px]"
                disabled={selectedItems.length === 0}
                onClick={handleExport}
              >
                <Download className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-center py-16 text-muted-foreground">
          <FileText className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm">Select a client to start building a catalogue</p>
        </div>
      )}

      {/* ── HANDOFF BAR ──────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 px-2 py-1 mx-1 rounded-md border border-border/70 bg-background">
        {draft.hasUnsavedChanges && selectedItems.length > 0 && (
          <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[10px]">
            Save before sharing or converting
          </Badge>
        )}
        <div className="ml-auto flex gap-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={!draft.canShare}
            onClick={() => void draft.generateShareLink()}
          >
            Share Link
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={!draft.canConvert}
            onClick={() => navigateToOrder(true)}
          >
            &rarr; Sales Order
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={!draft.canConvert}
            onClick={() => {
              if (!draft.canConvert) return;
              draft.handleConvertToOrder();
              setLocation(
                buildSalesWorkspacePath("create-order", {
                  fromSalesSheet: true,
                  mode: "quote",
                })
              );
            }}
          >
            &rarr; Quote
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2 text-xs"
            disabled={!draft.canConvert}
            onClick={() => {
              toast.info("Live Shopping launch is available from saved catalogues");
            }}
          >
            Live
          </Button>
        </div>
      </div>

      {/* ── STATUS BAR ───────────────────────────────────────────────── */}
      <WorkSurfaceStatusBar
        left={
          <span>
            {selectedItems.length} selected
            {currentViewId ? " \u00b7 saved view" : " \u00b7 default view"}
            {draft.hasUnsavedChanges ? ` \u00b7 unsaved` : ""}
            {selectedClientName ? ` \u00b7 ${selectedClientName}` : ""}
          </span>
        }
        right={<KeyboardHintBar hints={keyboardHints} className="text-xs" />}
      />

      {/* ── DIALOGS ──────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={showDeleteDraftDialog}
        onOpenChange={setShowDeleteDraftDialog}
        title="Delete draft?"
        description="This draft will be permanently removed."
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          draft.deleteDraft();
          setShowDeleteDraftDialog(false);
        }}
      />

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

export default SalesCatalogueSurface;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run client/src/components/spreadsheet-native/SalesCatalogueSurface.test.tsx`
Expected: PASS — 3 tests pass

- [ ] **Step 5: Run TypeScript check**

Run: `pnpm check`
Expected: zero errors

- [ ] **Step 6: Commit**

```bash
git add client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx client/src/components/spreadsheet-native/SalesCatalogueSurface.test.tsx
git commit -m "feat(sales-catalogue): add SalesCatalogueSurface unified component"
```

---

### Task 2.5: Wire Missing Features Into SalesCatalogueSurface

QA review found 6 HIGH findings — features referenced in the spec or existing in the old surfaces that the initial component code omits. This task wires them all.

**Files:**
- Modify: `client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx`

- [ ] **Step 1: Add AdvancedFilters with state + apply filters to inventory data**

The action bar has no Filters button wired. Add these to the component:

1. Import `AdvancedFilters` from `@/components/sales/AdvancedFilters`
2. Add state: `const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);`
3. Add a Filters button to the action bar after Save View:
```tsx
<Button size="sm" variant="outline" className="h-6 px-2 text-[10px]"
  onClick={() => setShowAdvancedFilters(prev => !prev)}>
  Filters {filters.categories.length + filters.grades.length + filters.vendors.length > 0 ? "●" : ""}
</Button>
```
4. Render `<AdvancedFilters>` conditionally between the action bar and the grids:
```tsx
{showAdvancedFilters && selectedClientId && (
  <AdvancedFilters
    filters={filters}
    sort={sort}
    onFiltersChange={setFilters}
    onSortChange={setSort}
    inventory={inventoryQuery.data ?? []}
    isOpen={showAdvancedFilters}
    onOpenChange={setShowAdvancedFilters}
  />
)}
```
5. Update the `inventoryRows` memo to apply ALL filters (not just searchTerm). Reference the existing `SalesSheetCreatorPage` filtering logic — it passes `filters` to `InventoryBrowser` which applies them internally. Since we're replacing `InventoryBrowser` with a PowersheetGrid, apply filters in the `inventoryRows` memo:
```tsx
const inventoryRows = useMemo(() => {
  let items = inventoryQuery.data ?? [];
  const lower = searchTerm.trim().toLowerCase();
  if (lower) {
    items = items.filter(item =>
      item.name.toLowerCase().includes(lower) ||
      (item.category ?? "").toLowerCase().includes(lower) ||
      (item.vendor ?? "").toLowerCase().includes(lower)
    );
  }
  if (filters.categories.length > 0) {
    items = items.filter(item => filters.categories.includes(item.category ?? ""));
  }
  if (filters.grades.length > 0) {
    items = items.filter(item => filters.grades.includes(item.grade ?? ""));
  }
  if (filters.vendors.length > 0) {
    items = items.filter(item => filters.vendors.includes(item.vendor ?? ""));
  }
  if (filters.priceMin !== null) {
    items = items.filter(item => item.retailPrice >= filters.priceMin!);
  }
  if (filters.priceMax !== null) {
    items = items.filter(item => item.retailPrice <= filters.priceMax!);
  }
  if (filters.inStockOnly) {
    items = items.filter(item => item.quantity > 0);
  }
  return mapInventoryToRows(items, selectedItemIds);
}, [inventoryQuery.data, selectedItemIds, searchTerm, filters]);
```

- [ ] **Step 2: Add DraftDialog and SavedSheetsDialog with triggers**

1. Import `DraftDialog` from `@/components/sales/DraftDialog` and `SavedSheetsDialog` from `@/components/sales/SavedSheetsDialog`
2. Add state:
```tsx
const [showDraftDialog, setShowDraftDialog] = useState(false);
const [showSavedSheetsDialog, setShowSavedSheetsDialog] = useState(false);
```
3. Add `salesSheets.getHistory` query for saved sheets:
```tsx
const savedSheetsQuery = trpc.salesSheets.getHistory.useQuery(
  { clientId: selectedClientId! },
  { enabled: selectedClientId !== null }
);
```
4. Wire the MoreHorizontal dropdown (already imported but unused) in the toolbar:
```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button size="sm" variant="outline" className="h-7 px-2" disabled={!selectedClientId}>
      <MoreHorizontal className="h-3 w-3" />
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => setShowDraftDialog(true)}>
      Load Draft
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => setShowSavedSheetsDialog(true)}>
      Load Saved Sheet
    </DropdownMenuItem>
    <DropdownMenuItem
      disabled={!draft.currentDraftId}
      onClick={() => setShowDeleteDraftDialog(true)}
      className="text-destructive"
    >
      Delete Draft
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```
5. Render the dialogs at the bottom of the component:
```tsx
<DraftDialog
  open={showDraftDialog}
  onOpenChange={setShowDraftDialog}
  drafts={draft.drafts}
  isLoading={draft.draftsLoading}
  onLoadDraft={async (draftId) => {
    const items = await draft.loadDraft(draftId);
    setSelectedItems(items);
    setShowDraftDialog(false);
  }}
  onDeleteDraft={(draftId) => {
    // Only allow deleting non-current drafts from the dialog
    toast.info("Delete drafts from the main toolbar");
  }}
  isDeleting={false}
/>

<SavedSheetsDialog
  open={showSavedSheetsDialog}
  onOpenChange={setShowSavedSheetsDialog}
  savedSheets={(savedSheetsQuery.data ?? []).map(s => ({
    id: s.id,
    clientId: s.clientId,
    itemCount: s.itemCount,
    totalValue: s.totalValue,
    createdAt: s.createdAt,
  }))}
  isLoading={savedSheetsQuery.isLoading}
  onLoadSavedSheet={async (sheetId) => {
    // Load sheet items — reuse the same pattern as SalesSheetCreatorPage
    const result = await utils.salesSheets.getById.fetch({ sheetId });
    if (result) {
      setSelectedItems(result.items as PricedInventoryItem[]);
      draft.resetDraft();
      setShowSavedSheetsDialog(false);
      toast.success("Saved sheet loaded");
    }
  }}
/>
```
6. Add `utils` from tRPC:
```tsx
const utils = trpc.useUtils();
```

- [ ] **Step 3: Add COGS column to inventory grid (permission-gated)**

Add a COGS column to `inventoryColumnDefs`, conditionally shown based on organization display settings:

```tsx
// Add query at component level:
const displaySettingsQuery = trpc.organizationSettings.getDisplaySettings.useQuery();
const showCogs = displaySettingsQuery.data?.showCogsInOrders ?? false;

// Add column conditionally in inventoryColumnDefs:
const inventoryColumnDefs = useMemo<ColDef<InventoryBrowserRow>[]>(() => {
  const cols: ColDef<InventoryBrowserRow>[] = [
    // ... existing columns ...
  ];
  if (showCogs) {
    // Insert before the grade column
    cols.splice(-1, 0, {
      field: "effectiveCogs" as keyof InventoryBrowserRow,
      headerName: "COGS",
      minWidth: 75,
      maxWidth: 95,
      valueGetter: (params) => params.data?._raw.effectiveCogs ?? params.data?._raw.unitCogs ?? 0,
      valueFormatter: (params) => formatCurrency(Number(params.value ?? 0)),
      cellClass: "powersheet-cell--locked",
    });
  }
  return cols;
}, [showCogs]);
```

Update `InventoryBrowserRow` type to include COGS data access via `_raw`.

- [ ] **Step 4: Add batch status indicators to inventory grid**

Add a status cell renderer to the Product column or as a separate narrow column:

```tsx
{
  field: "status" as keyof InventoryBrowserRow,
  headerName: "",
  maxWidth: 28,
  valueGetter: (params) => params.data?._raw.status ?? "LIVE",
  cellRenderer: (params: { value: string }) => {
    const NON_SELLABLE = ["AWAITING_INTAKE", "ON_HOLD", "QUARANTINED"];
    return NON_SELLABLE.includes(params.value) ? "⚠" : "";
  },
  cellStyle: (params: { value: string }) => {
    const NON_SELLABLE = ["AWAITING_INTAKE", "ON_HOLD", "QUARANTINED"];
    return NON_SELLABLE.includes(params.value)
      ? { color: "var(--color-amber-500)", fontWeight: "bold" }
      : {};
  },
  headerTooltip: "Non-sellable batch warning",
  cellClass: "powersheet-cell--locked",
},
```

- [ ] **Step 5: Add default view auto-load on client change**

Add a `useEffect` that loads the default saved view when client changes:

```tsx
const savedViewsQuery = trpc.salesSheets.getViews.useQuery(
  { clientId: selectedClientId ?? undefined },
  { enabled: selectedClientId !== null }
);

useEffect(() => {
  if (!selectedClientId || !savedViewsQuery.data) return;
  const views = Array.isArray(savedViewsQuery.data) ? savedViewsQuery.data : [];
  const defaultView = views.find(
    (v: { clientId: number | null; isDefault: boolean }) =>
      v.clientId === selectedClientId && v.isDefault
  );
  if (defaultView) {
    setFilters((defaultView as { filters: InventoryFilters }).filters ?? DEFAULT_FILTERS);
    setSort((defaultView as { sort: InventorySortConfig }).sort ?? DEFAULT_SORT);
    setColumnVisibility((defaultView as { columnVisibility: ColumnVisibility }).columnVisibility ?? DEFAULT_COLUMN_VISIBILITY);
    setCurrentViewId(defaultView.id);
    toast.info(`Loaded default view: ${(defaultView as { name: string }).name}`);
  }
}, [selectedClientId, savedViewsQuery.data]);
```

- [ ] **Step 6: Fix Live Shopping button to use actual conversion**

Replace the toast placeholder for the Live button with the actual `convertToLiveSession` flow:

```tsx
// Add mutation in the component:
const liveSessionMutation = trpc.salesSheets.convertToLiveSession.useMutation({
  onSuccess: (data) => {
    if (data?.sessionId) {
      setLocation(buildSalesWorkspacePath("live-shopping", { session: data.sessionId }));
    }
    toast.success("Live shopping session started");
  },
  onError: (error) => {
    toast.error("Failed to start live session: " + error.message);
  },
});

// Replace the Live button onClick:
onClick={() => {
  if (!draft.canConvert) return;
  if (!draft.currentDraftId) {
    toast.error("Save the catalogue before going live");
    return;
  }
  liveSessionMutation.mutate({ sheetId: draft.currentDraftId });
}}
```

Note: `convertToLiveSession` may require a finalized sheet ID (not a draft). Check the server procedure — if it requires a saved sheet, the flow should save first (like the share link flow). The implementing agent should verify the input schema at `server/routers/salesSheets.ts`.

- [ ] **Step 7: Run TypeScript check + tests**

Run: `pnpm check && pnpm vitest run client/src/components/spreadsheet-native/SalesCatalogueSurface.test.tsx`
Expected: zero TS errors, tests pass

- [ ] **Step 8: Commit**

```bash
git add client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx
git commit -m "feat(sales-catalogue): wire AdvancedFilters, DraftDialog, SavedSheetsDialog, COGS column, batch status, default views, live shopping"
```

---

### Task 3: Wire Into SalesWorkspacePage

Replace the sales-sheets panel's dual-surface rendering and SheetModeToggle with the unified SalesCatalogueSurface.

**Files:**
- Modify: `client/src/pages/SalesWorkspacePage.tsx:93-108,166-171,226-239`

- [ ] **Step 1: Remove sales-sheets surface mode hooks and SheetModeToggle wiring**

In `client/src/pages/SalesWorkspacePage.tsx`, remove the sales-sheets pilot availability and surface mode hooks (lines 93-108). Remove the SheetModeToggle for sales-sheets in the commandStrip (lines 166-171). These are no longer needed.

Make these exact changes to the imports section (lines 1-22):

1. **Remove** the `SalesSheetsPilotSurface` lazy import (lines 10-12):
```typescript
// DELETE:
const SalesSheetsPilotSurface = lazy(
  () => import("@/components/spreadsheet-native/SalesSheetsPilotSurface")
);
```

2. **Remove** the `SalesSheetCreatorPage` import (line 21):
```typescript
// DELETE:
import SalesSheetCreatorPage from "@/pages/SalesSheetCreatorPage";
```

3. **Add** the lazy import for `SalesCatalogueSurface` (after the other lazy imports, before the static imports):
```typescript
const SalesCatalogueSurface = lazy(
  () => import("@/components/spreadsheet-native/SalesCatalogueSurface")
);
```

4. **Add `Suspense`** to the React import (line 1). Change:
```typescript
import { lazy } from "react";
```
to:
```typescript
import { lazy, Suspense } from "react";
```

- [ ] **Step 2: Replace the sales-sheets panel rendering**

Replace the ENTIRE `LinearWorkspacePanel value="sales-sheets"` block (lines 226-239):

**Before (lines 226-239):**
```tsx
<LinearWorkspacePanel value="sales-sheets">
  {salesSheetsPilotEnabled &&
  salesSheetsSurfaceMode === "sheet-native" ? (
    <PilotSurfaceBoundary fallback={<SalesSheetCreatorPage embedded />}>
      <SalesSheetsPilotSurface
        onOpenClassic={() =>
          setLocation(buildSalesWorkspacePath("sales-sheets"))
        }
      />
    </PilotSurfaceBoundary>
  ) : (
    <SalesSheetCreatorPage embedded />
  )}
</LinearWorkspacePanel>
```

**After:**
```tsx
<LinearWorkspacePanel value="sales-sheets">
  <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading catalogue...</div>}>
    <SalesCatalogueSurface />
  </Suspense>
</LinearWorkspacePanel>
```

No PilotSurfaceBoundary — there's no classic fallback anymore. Suspense handles the lazy load.

- [ ] **Step 3: Remove SheetModeToggle for sales-sheets from commandStrip**

In the `commandStrip` prop, remove the `activeTab === "sales-sheets"` branch entirely. The commandStrip should only show toggles for orders, quotes, and returns tabs.

- [ ] **Step 4: Run TypeScript check**

Run: `pnpm check`
Expected: zero errors — unused imports for SalesSheetCreatorPage, SalesSheetsPilotSurface, and related sales-sheets mode hooks should be removed.

- [ ] **Step 5: Run lint**

Run: `pnpm lint`
Expected: zero warnings about unused variables

- [ ] **Step 6: Run existing tests**

Run: `pnpm test`
Expected: all tests pass. Some tests referencing SalesSheetsPilotSurface may need updates if they test the workspace routing.

- [ ] **Step 7: Commit**

```bash
git add client/src/pages/SalesWorkspacePage.tsx
git commit -m "feat(sales-catalogue): wire SalesCatalogueSurface into SalesWorkspacePage, retire SheetModeToggle"
```

---

### Task 4: Retire Dead Code

Remove the classic and pilot surfaces that are now replaced. This is done as a separate commit so it's easy to revert if something is missed.

**Files:**
- Delete: `client/src/pages/SalesSheetCreatorPage.tsx`
- Delete: `client/src/components/spreadsheet-native/SalesSheetsPilotSurface.tsx`
- Delete: `client/src/components/spreadsheet-native/SalesSheetsPilotSurface.test.tsx`
- Delete: `client/src/components/sales/SalesSheetPreview.tsx`
- Delete: `client/src/components/sales/InventoryBrowser.tsx`
- Delete: `client/src/components/sales/InventoryBrowser.test.tsx`
- Delete: `client/src/components/sales/DraftControls.tsx`

**NOTE:** Do NOT delete these shared components that are still used elsewhere:
- `client/src/components/sales/types.ts` — used by SalesCatalogueSurface
- `client/src/components/sales/QuickViewSelector.tsx` — used by SalesCatalogueSurface
- `client/src/components/sales/SaveViewDialog.tsx` — used by SalesCatalogueSurface
- `client/src/components/sales/AdvancedFilters.tsx` — used by SalesCatalogueSurface
- `client/src/components/sales/DraftDialog.tsx` — may be used by SalesCatalogueSurface for draft loading
- `client/src/components/sales/SavedSheetsDialog.tsx` — may be used
- `client/src/components/sales/SalesSheetTemplates.tsx` — check if used elsewhere

- [ ] **Step 1: Verify no remaining imports of dead components**

Run grep to confirm nothing outside the deleted files imports them:

```bash
# Check for imports of the files being deleted
rg "SalesSheetCreatorPage" --glob '*.{ts,tsx}' -l
rg "SalesSheetsPilotSurface" --glob '*.{ts,tsx}' -l
rg "SalesSheetPreview" --glob '*.{ts,tsx}' -l
rg "InventoryBrowser" --glob '*.{ts,tsx}' -l
rg "DraftControls" --glob '*.{ts,tsx}' -l
```

Expected: only the files being deleted and their own test files reference these. If SalesWorkspacePage still imports any, fix Task 3 first.

- [ ] **Step 2: Delete the files**

```bash
git rm client/src/pages/SalesSheetCreatorPage.tsx
git rm client/src/components/spreadsheet-native/SalesSheetsPilotSurface.tsx
git rm client/src/components/spreadsheet-native/SalesSheetsPilotSurface.test.tsx
git rm client/src/components/sales/SalesSheetPreview.tsx
git rm client/src/components/sales/InventoryBrowser.tsx
git rm client/src/components/sales/InventoryBrowser.test.tsx
git rm client/src/components/sales/DraftControls.tsx
```

- [ ] **Step 3: Run full verification suite**

```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

Expected: all four pass with zero errors. If TypeScript or build fails, it means something still imports a deleted file — fix the import.

- [ ] **Step 4: Update test files that mock deleted components**

`SalesWorkspacePage.test.tsx` mocks `SalesSheetsPilotSurface` and `SalesSheetCreatorPage`. These mocks must be updated:

1. Check `client/src/pages/SalesWorkspacePage.test.tsx` — replace mocks for `SalesSheetsPilotSurface` and `SalesSheetCreatorPage` with a mock for `SalesCatalogueSurface`:
```typescript
vi.mock("@/components/spreadsheet-native/SalesCatalogueSurface", () => ({
  default: () => <div data-testid="sale-catalogue-surface">SalesCatalogueSurface</div>,
  SalesCatalogueSurface: () => <div data-testid="sale-catalogue-surface">SalesCatalogueSurface</div>,
}));
```
2. Update any assertions that check for old component rendering to check for `SalesCatalogueSurface` instead.
3. Check `ConsolidatedWorkspaces.test.tsx` for similar references.
4. Re-run: `pnpm test`

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chore(sales-catalogue): retire SalesSheetCreatorPage, SalesSheetsPilotSurface, and 4 replaced components"
```

---

### Task 5: Final Verification and Polish

End-to-end check that the unified surface works correctly.

**Files:**
- Modify: `client/src/components/spreadsheet-native/SalesCatalogueSurface.tsx` (if fixes needed)
- Modify: `client/src/hooks/useCatalogueDraft.ts` (if fixes needed)

- [ ] **Step 1: Run full verification suite**

```bash
pnpm check && pnpm lint && pnpm test && pnpm build
```

Expected: all four pass with zero errors.

- [ ] **Step 2: Verify success criteria from the spec**

Check each criterion:

1. **Sales Catalogue tab renders one unified surface (no SheetModeToggle)** — verify in SalesWorkspacePage that the sales-sheets panel renders `<SalesCatalogueSurface />` with no toggle.

2. **Dirty-state gating works: share/convert blocked when unsaved changes exist** — verify `canShare` and `canConvert` in useCatalogueDraft are false when `hasUnsavedChanges` is true.

3. **Handoff from Sales Catalogue → Sales Order preserves client + items via sessionStorage** — verify the `handleConvertToOrder` path writes to sessionStorage and navigates with `?fromSalesSheet=true`.

4. **Filtering and saved views work, scoped to customer** — verify QuickViewSelector and SaveViewDialog are wired with `selectedClientId`.

5. **Auto-save and draft lifecycle work identically to current behavior** — verify 30s auto-save timer in useCatalogueDraft.

- [ ] **Step 3: Fix any issues found in verification**

If any criterion fails, fix the relevant code and re-run the verification suite.

- [ ] **Step 4: Final commit if fixes were needed**

```bash
git add -A
git commit -m "fix(sales-catalogue): address verification findings"
```

---

## Phase 2 Note

Phase 2 (Sales Order Surface) requires a separate implementation plan. It involves:
- Decomposing `OrderCreatorPage` (21,560 lines) into `useOrderDraft()` hook + `SalesOrderSurface` component
- Creating the invoice-bottom pattern (Subtotal, Discount, Freight, Total, Payment Terms, Credit info)
- Creating the Order Adjustments panel (Referral, Notes, Draft status)
- Modifying `OrdersSheetPilotSurface` document mode to render `SalesOrderSurface`
- Investigating Payment Terms schema

Phase 2 plan will be written after Phase 1 ships and the layout pattern is validated on staging.

---

## Appendix: Verified tRPC Schemas

These schemas were verified against `server/routers/salesSheets.ts` on 2026-03-27. If the implementing agent gets a TypeScript error on a tRPC call, check this appendix first.

| Procedure | Input | Return |
|-----------|-------|--------|
| `getInventory` | `{ clientId: number }` (positive) | `PricedInventoryItem[]` |
| `saveDraft` | `{ draftId?: number, clientId: number, name: string (1-255), items: draftItemSchema[], totalValue: number }` | `{ draftId: number }` |
| `deleteDraft` | `{ draftId: number }` | `{ success: true }` |
| `getDrafts` | `{ clientId?: number }` (entire object optional) | `SalesSheetDraft[]` |
| `getDraftById` | `{ draftId: number }` | `SalesSheetDraft \| null` |
| `save` | `{ clientId: number, items: salesSheetItemSchema[], totalValue: number }` | `number` (sheetId) |
| `getHistory` | `{ clientId: number, limit?: number }` | `SalesSheetHistory[]` |
| `getById` | `{ sheetId: number }` | `SalesSheetHistory \| null` |
| `generateShareLink` | `{ sheetId: number, expiresInDays?: number (1-90, default 7) }` | `{ token, expiresAt, shareUrl }` |
| `getViews` | `{ clientId?: number }` (entire object optional) | `SavedView[]` |
| `saveView` | `{ id?: number, name: string, description?: string, clientId?: number, filters, sort, columnVisibility, isDefault: boolean }` | `{ viewId: number }` |
| `convertToLiveSession` | `{ sheetId: number }` | `{ sessionId: number }` |
| `convertToOrder` | `{ sheetId: number, orderType?: "DRAFT"\|"QUOTE"\|"ORDER" }` | `{ orderId: number }` |

**Critical notes:**
- `saveDraft` returns `{ draftId }`, NOT `{ id }`. Use `data.draftId`.
- `save` returns a raw `number` (the sheetId), NOT an object. Use `data` directly as the sheetId.
- `generateShareLink` requires a **finalized sheet ID** from `save`, NOT a draft ID.
- `convertToLiveSession` requires a **finalized sheet ID** from `save`, NOT a draft ID.
- `draftItemSchema` requires `priceMarkup: number` — `PricedInventoryItem` has this field.

## Appendix: Verified Component Prop Signatures

| Component | Required Props | Optional Props |
|-----------|---------------|----------------|
| `QuickViewSelector` | `clientId: number`, `onLoadView: (view: {filters, sort, columnVisibility}) => void` | `currentViewId?: number \| null` |
| `SaveViewDialog` | `open: boolean`, `onOpenChange: (open: boolean) => void`, `clientId: number`, `filters`, `sort`, `columnVisibility` | `clientName?: string`, `onSaved?: (viewId: number) => void` |
| `DraftDialog` | `open`, `onOpenChange`, `drafts: DraftInfo[]`, `isLoading: boolean`, `onLoadDraft: (draftId: number) => void`, `onDeleteDraft: (draftId: number) => void`, `isDeleting: boolean` | — |
| `SavedSheetsDialog` | `open`, `onOpenChange`, `savedSheets: SavedSheetInfo[]`, `isLoading: boolean`, `onLoadSavedSheet: (sheetId: number) => void` | — |
| `AdvancedFilters` | `filters`, `sort`, `onFiltersChange`, `onSortChange`, `inventory: PricedInventoryItem[]`, `isOpen: boolean`, `onOpenChange: (open: boolean) => void` | — |
| `ConfirmDialog` | `open`, `onOpenChange`, `title: string`, `description: string \| ReactNode`, `onConfirm: () => void` | `confirmLabel?`, `cancelLabel?`, `variant?: "default" \| "destructive"`, `isLoading?: boolean` |
| `ClientCombobox` | `value: number \| null`, `onValueChange: (id: number \| null) => void`, `clients: ClientOption[]` | `isLoading?`, `placeholder?`, `emptyText?`, `disabled?`, `className?` |

## Appendix: SalesWorkspacePage Exact Diff

**Delete these sections (line numbers from current file):**
- Lines 10-12: `SalesSheetsPilotSurface` lazy import
- Line 21: `SalesSheetCreatorPage` import
- Lines 93-108: Sales-sheets surface mode hooks (16 lines)
- Lines 166-171: SheetModeToggle for sales-sheets in commandStrip (6 lines)
- Lines 226-239: `LinearWorkspacePanel value="sales-sheets"` dual-surface block (14 lines)

**Add:**
- Line 1: Change `import { lazy } from "react"` to `import { lazy, Suspense } from "react"`
- After other lazy imports: `const SalesCatalogueSurface = lazy(() => import("@/components/spreadsheet-native/SalesCatalogueSurface"));`
- Replace lines 226-239 with:
```tsx
<LinearWorkspacePanel value="sales-sheets">
  <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading catalogue...</div>}>
    <SalesCatalogueSurface />
  </Suspense>
</LinearWorkspacePanel>
```

**After all changes, zero orphaned references remain.** The orders, quotes, and returns surface mode hooks are completely independent — removing sales-sheets hooks has no side effects.

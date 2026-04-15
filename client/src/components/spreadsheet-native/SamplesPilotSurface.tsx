/**
 * SamplesPilotSurface — TER-821
 *
 * Family: Table + Support Cards (hybrid with companion cards)
 * Leader: Inventory | This module: Samples
 *
 * Layout:
 *  1. Command strip: search, status tab filter, New Sample button, Refresh, Export CSV
 *  2. Two-column layout: PowersheetGrid (primary queue) + ExpiringSamplesWidget (companion card)
 *  3. Status tabs (ALL / Samples Out / Samples Return)
 *  4. WorkSurfaceStatusBar with KeyboardHintBar
 *  5. InspectorPanel for sample detail with fulfill/return/location actions
 *
 * Discrepancies addressed:
 *  DISC-SAM-001: fulfillRequest wired for the first time (P0)
 *  DISC-SAM-003: dueDate parsed from notes and shown as a dedicated column
 */

import { useCallback, useMemo, useRef, useState } from "react";
import { format } from "date-fns";
import type { ColDef } from "ag-grid-community";
import {
  Beaker,
  CalendarIcon,
  Download,
  Loader2,
  Plus,
  RefreshCw,
  SquareArrowOutUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePermissions } from "@/hooks/usePermissions";
import { useExport } from "@/hooks/work-surface/useExport";
import type { ExportColumn } from "@/hooks/work-surface/useExport";
import { useSpreadsheetSelectionParam } from "@/lib/spreadsheet-native";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  InspectorField,
  InspectorPanel,
  InspectorSection,
} from "@/components/work-surface/InspectorPanel";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import {
  KeyboardHintBar,
  type KeyboardHint,
} from "@/components/work-surface/KeyboardHintBar";
import { ExpiringSamplesWidget } from "@/components/samples/ExpiringSamplesWidget";
import {
  SampleForm,
  type SampleFormOption,
  type SampleFormValues,
} from "@/components/samples/SampleForm";
import {
  SampleReturnDialog,
  type SampleReturnFormValues,
} from "@/components/samples/SampleReturnDialog";
import {
  VendorShipDialog,
  type VendorShipFormValues,
} from "@/components/samples/VendorShipDialog";
import {
  LocationUpdateDialog,
  type LocationUpdateFormValues,
} from "@/components/samples/LocationUpdateDialog";
import type {
  SampleStatus,
  SampleLocation,
} from "@/components/samples/SampleList";
import {
  getSampleOperatorLane,
  isOperatorVisibleSampleStatus,
} from "@/components/samples/SampleList";
import { PowersheetGrid } from "./PowersheetGrid";
import type { PowersheetAffordance } from "./PowersheetGrid";
import type { PowersheetSelectionSummary } from "@/lib/powersheet/contracts";

// ============================================================================
// Constants
// ============================================================================

const isMac =
  typeof navigator !== "undefined" &&
  /mac/i.test(navigator.platform || navigator.userAgent);
const mod = isMac ? "\u2318" : "Ctrl";

const queueKeyboardHints: KeyboardHint[] = [
  { key: "Click", label: "select row" },
  { key: "Shift+Click", label: "extend range" },
  { key: `${mod}+Click`, label: "add to selection" },
  { key: `${mod}+C`, label: "copy cells" },
  { key: `${mod}+A`, label: "select all" },
];

const samplesAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: false },
  { label: "Fill", available: false },
  { label: "Edit", available: false },
  { label: "Workflow actions", available: true },
  { label: "Export CSV", available: true },
];

type TabFilter = "ALL" | "OUT" | "RETURN";

function formatOperationalDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  try {
    const date = typeof value === "string" ? new Date(value) : value;
    return format(date, "MMM d, yyyy");
  } catch {
    return "—";
  }
}

// ============================================================================
// Row type
// ============================================================================

interface SamplePilotRow {
  identity: { rowKey: string };
  sampleId: number;
  clientName: string;
  productSummary: string;
  status: SampleStatus;
  lane: "OUT" | "RETURN";
  requestedDate: string;
  dueDate: string | null;
  location: SampleLocation | null;
  expirationDate: string | null;
  notes: string | null;
  vendorReturnTrackingNumber: string | null;
}

// ============================================================================
// Helpers
// ============================================================================

function normalizeProducts(
  products: Array<{ productId: number; quantity: string }> | null | undefined
): Array<{ productId: number; quantity: string }> {
  if (!products) return [];
  if (Array.isArray(products)) return products;
  return [];
}

function normalizeStatus(status: string | null | undefined): SampleStatus {
  const valid: SampleStatus[] = [
    "PENDING",
    "FULFILLED",
    "CANCELLED",
    "RETURNED",
    "RETURN_REQUESTED",
    "RETURN_APPROVED",
    "VENDOR_RETURN_REQUESTED",
    "SHIPPED_TO_VENDOR",
    "VENDOR_CONFIRMED",
  ];
  if (status && valid.includes(status as SampleStatus)) {
    return status as SampleStatus;
  }
  return "PENDING";
}

function normalizeLocation(
  location: string | null | undefined
): SampleLocation | null {
  const valid: SampleLocation[] = [
    "WAREHOUSE",
    "WITH_CLIENT",
    "WITH_SALES_REP",
    "RETURNED",
    "LOST",
  ];
  if (location && valid.includes(location as SampleLocation)) {
    return location as SampleLocation;
  }
  return null;
}

function extractDueDate(notes?: string | null): string | null {
  if (!notes) return null;
  const match = notes.match(/due date:\s*(\d{4}-\d{2}-\d{2})/i);
  return match ? match[1] : null;
}

const STATUS_LABEL_MAP: Record<SampleStatus, string> = {
  PENDING: "Pending",
  FULFILLED: "Fulfilled",
  CANCELLED: "Cancelled",
  RETURNED: "Returned",
  RETURN_REQUESTED: "Return Requested",
  RETURN_APPROVED: "Return Approved",
  VENDOR_RETURN_REQUESTED: "Vendor Return Req.",
  SHIPPED_TO_VENDOR: "Shipped to Vendor",
  VENDOR_CONFIRMED: "Vendor Confirmed",
};

const LOCATION_LABEL_MAP: Record<SampleLocation, string> = {
  WAREHOUSE: "Warehouse",
  WITH_CLIENT: "With Client",
  WITH_SALES_REP: "With Sales Rep",
  RETURNED: "Returned",
  LOST: "Lost",
};

const EXPORT_COLUMNS: ExportColumn<SamplePilotRow>[] = [
  { key: "sampleId", label: "ID", formatter: v => String(v ?? "") },
  { key: "clientName", label: "Client" },
  { key: "productSummary", label: "Products" },
  { key: "status", label: "Status" },
  { key: "lane", label: "Lane" },
  { key: "requestedDate", label: "Requested" },
  { key: "dueDate", label: "Due Date", formatter: v => String(v ?? "") },
  { key: "location", label: "Location", formatter: v => String(v ?? "") },
  {
    key: "expirationDate",
    label: "Expires",
    formatter: v => String(v ?? ""),
  },
];

// ============================================================================
// Props
// ============================================================================

export interface SamplesPilotSurfaceProps {
  onOpenClassic?: (sampleId?: number | null) => void;
}

// ============================================================================
// Component
// ============================================================================

export function SamplesPilotSurface({
  onOpenClassic,
}: SamplesPilotSurfaceProps) {
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  const canCreateSamples = hasPermission("samples:create");
  const canDeleteSamples = hasPermission("samples:delete");
  const canRequestReturn = hasPermission("samples:return");
  const canApproveReturn = hasPermission("samples:approve");
  const canManageVendorReturn = hasPermission("samples:vendorReturn");
  const canTrackSamples = hasPermission("samples:track");
  const canFulfill = hasPermission("samples:allocate");

  const { selectedId: selectedSampleId, setSelectedId: setSelectedSampleId } =
    useSpreadsheetSelectionParam("sampleId");

  const [searchTerm, setSearchTerm] = useState("");
  const [tabFilter, setTabFilter] = useState<TabFilter>("ALL");
  const [productSearch, setProductSearch] = useState("");

  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [fulfillDialogOpen, setFulfillDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [returnDialogType, setReturnDialogType] = useState<"sample" | "vendor">(
    "sample"
  );
  const [vendorShipDialogOpen, setVendorShipDialogOpen] = useState(false);
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [selectedSampleLocation, setSelectedSampleLocation] =
    useState<SampleLocation | null>(null);

  const [queueSelectionSummary, setQueueSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);

  // Toast dedup refs (STARTER-KIT §4)
  const lastToastKeyRef = useRef<string | null>(null);
  const lastToastTimeRef = useRef(0);

  const notifyToast = (level: "warning" | "error", message: string) => {
    const now = Date.now();
    const toastKey = `${level}:${message}`;
    if (
      toastKey !== lastToastKeyRef.current ||
      now - lastToastTimeRef.current > 300
    ) {
      if (level === "warning") {
        toast.warning(message);
      } else {
        toast.error(message);
      }
      lastToastKeyRef.current = toastKey;
      lastToastTimeRef.current = now;
    }
  };

  const utils = trpc.useUtils();

  // ============================================================================
  // Queries
  // ============================================================================

  const samplesQuery = trpc.samples.getAll.useQuery(
    { limit: 200 },
    {
      retry: 2,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 5000),
      staleTime: 30 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnMount: true,
      refetchOnWindowFocus: false,
    }
  );

  const { data: clientsData } = trpc.clients.list.useQuery(
    { limit: 200 },
    { staleTime: 5 * 60 * 1000 }
  );

  const { data: productSearchData, isLoading: productSearchLoading } =
    trpc.samples.productOptions.useQuery(
      { search: productSearch, limit: 15 },
      { staleTime: 5 * 60 * 1000 }
    );

  // ============================================================================
  // Client / product option maps
  // ============================================================================

  const clientOptions = useMemo<SampleFormOption[]>(() => {
    const list = Array.isArray(clientsData)
      ? clientsData
      : (clientsData?.items ?? []);
    return list.map(client => ({
      id: client.id,
      label: client.name ?? `Client #${client.id}`,
    }));
  }, [clientsData]);

  const clientNameMap = useMemo(
    () =>
      new Map<number, string>(clientOptions.map(opt => [opt.id, opt.label])),
    [clientOptions]
  );

  const productOptions = useMemo<SampleFormOption[]>(() => {
    const products = productSearchData?.items ?? [];
    return products.map(product => ({
      id: product.id,
      label: product.nameCanonical || `Product #${product.id}`,
    }));
  }, [productSearchData?.items]);

  // ============================================================================
  // Row mapping
  // ============================================================================

  const allRows = useMemo<SamplePilotRow[]>(() => {
    const items =
      (samplesQuery.data &&
        "items" in samplesQuery.data &&
        samplesQuery.data.items) ||
      (Array.isArray(samplesQuery.data) ? samplesQuery.data : []) ||
      [];

    return items
      .map(sample => {
        const status = normalizeStatus(sample.sampleRequestStatus);
        const products = normalizeProducts(sample.products);
        const productSummary =
          products
            .map(p => `Product #${p.productId} (${p.quantity || "1"})`)
            .join(", ") || "No products listed";

        const requestedDate =
          typeof sample.requestDate === "string"
            ? sample.requestDate
            : format(sample.requestDate, "yyyy-MM-dd");

        return {
          identity: { rowKey: `sample-${sample.id}` },
          sampleId: sample.id,
          clientName:
            clientNameMap.get(sample.clientId) ?? `Client #${sample.clientId}`,
          productSummary,
          status,
          lane: getSampleOperatorLane(status),
          requestedDate,
          dueDate: sample.dueDate ?? extractDueDate(sample.notes),
          location: normalizeLocation(sample.location),
          expirationDate: sample.expirationDate
            ? typeof sample.expirationDate === "string"
              ? sample.expirationDate
              : format(sample.expirationDate, "yyyy-MM-dd")
            : null,
          notes: sample.notes ?? null,
          vendorReturnTrackingNumber: sample.vendorReturnTrackingNumber ?? null,
        } satisfies SamplePilotRow;
      })
      .filter(row => isOperatorVisibleSampleStatus(row.status));
  }, [clientNameMap, samplesQuery.data]);

  const searchLower = searchTerm.trim().toLowerCase();

  const rows = useMemo<SamplePilotRow[]>(() => {
    let filtered = allRows;

    // Tab filter
    if (tabFilter === "OUT") {
      filtered = filtered.filter(row => row.lane === "OUT");
    } else if (tabFilter === "RETURN") {
      filtered = filtered.filter(row => row.lane === "RETURN");
    }

    // Search filter (client or product)
    if (searchLower) {
      filtered = filtered.filter(
        row =>
          row.clientName.toLowerCase().includes(searchLower) ||
          row.productSummary.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [allRows, tabFilter, searchLower]);

  const statusCounts = useMemo(() => {
    const counts: Record<TabFilter, number> = { ALL: 0, OUT: 0, RETURN: 0 };
    allRows.forEach(row => {
      counts.ALL += 1;
      if (row.lane === "OUT") counts.OUT += 1;
      if (row.lane === "RETURN") counts.RETURN += 1;
    });
    return counts;
  }, [allRows]);

  const selectedRow =
    rows.find(row => row.sampleId === selectedSampleId) ?? null;

  // ============================================================================
  // Mutations
  // ============================================================================

  const createMutation = trpc.samples.createRequest.useMutation({
    onSuccess: async () => {
      await utils.samples.getAll.invalidate();
      toast.success("Sample request created.");
      setCreateDialogOpen(false);
    },
    onError: error => {
      notifyToast("error", error.message);
    },
  });

  const fulfillMutation = trpc.samples.fulfillRequest.useMutation({
    onSuccess: async () => {
      await utils.samples.getAll.invalidate();
      toast.success("Sample fulfilled — inventory decremented.");
      setFulfillDialogOpen(false);
    },
    onError: error => {
      notifyToast("error", error.message);
    },
  });

  const deleteMutation = trpc.samples.cancelRequest.useMutation({
    onSuccess: async () => {
      await utils.samples.getAll.invalidate();
      toast.success("Sample request cancelled.");
      setDeleteDialogOpen(false);
      if (selectedSampleId !== null) setSelectedSampleId(null);
    },
    onError: error => {
      notifyToast("error", error.message);
    },
  });

  const requestReturnMutation = trpc.samples.requestReturn.useMutation({
    onSuccess: async () => {
      await utils.samples.getAll.invalidate();
      toast.success("Return request submitted.");
    },
    onError: error => {
      notifyToast("error", error.message);
    },
  });

  const approveReturnMutation = trpc.samples.approveReturn.useMutation({
    onSuccess: async () => {
      await utils.samples.getAll.invalidate();
      toast.success("Return approved.");
    },
    onError: error => {
      notifyToast("error", error.message);
    },
  });

  const completeReturnMutation = trpc.samples.completeReturn.useMutation({
    onSuccess: async () => {
      await utils.samples.getAll.invalidate();
      toast.success("Return completed.");
    },
    onError: error => {
      notifyToast("error", error.message);
    },
  });

  const requestVendorReturnMutation =
    trpc.samples.requestVendorReturn.useMutation({
      onSuccess: async () => {
        await utils.samples.getAll.invalidate();
        toast.success("Supplier return requested.");
      },
      onError: error => {
        notifyToast("error", error.message);
      },
    });

  const shipToVendorMutation = trpc.samples.shipToVendor.useMutation({
    onSuccess: async () => {
      await utils.samples.getAll.invalidate();
      toast.success("Marked as shipped to supplier.");
      setVendorShipDialogOpen(false);
    },
    onError: error => {
      notifyToast("error", error.message);
    },
  });

  const confirmVendorReturnMutation =
    trpc.samples.confirmVendorReturn.useMutation({
      onSuccess: async () => {
        await utils.samples.getAll.invalidate();
        toast.success("Supplier return confirmed.");
      },
      onError: error => {
        notifyToast("error", error.message);
      },
    });

  const updateLocationMutation = trpc.samples.updateLocation.useMutation({
    onSuccess: async () => {
      await utils.samples.getAll.invalidate();
      toast.success("Location updated.");
      setLocationDialogOpen(false);
    },
    onError: error => {
      notifyToast("error", error.message);
    },
  });

  // DISC-SAM-002: Set expiration date
  const setExpirationDateMutation = trpc.samples.setExpirationDate.useMutation({
    onSuccess: async () => {
      await utils.samples.getAll.invalidate();
      toast.success("Expiration date updated.");
    },
    onError: error => {
      notifyToast("error", error.message);
    },
  });

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleCreate = useCallback(
    async (values: SampleFormValues) => {
      if (!user?.id) {
        toast.error("You need to be logged in to create a sample.");
        return;
      }
      const notesWithDueDate =
        values.dueDate && values.dueDate.length > 0
          ? [values.notes, `Due Date: ${values.dueDate}`]
              .filter(Boolean)
              .join("\n")
          : values.notes;

      await createMutation.mutateAsync({
        clientId: values.clientId,
        products: [{ productId: values.productId, quantity: values.quantity }],
        notes: notesWithDueDate,
      });
    },
    [createMutation, user?.id]
  );

  const handleFulfillConfirm = useCallback(() => {
    if (selectedSampleId === null) return;
    fulfillMutation.mutate({
      requestId: selectedSampleId,
    });
  }, [fulfillMutation, selectedSampleId]);

  const handleDeleteConfirm = useCallback(() => {
    if (selectedSampleId === null) return;
    deleteMutation.mutate({
      requestId: selectedSampleId,
      reason: "Cancelled via Sample sheet-native surface",
    });
  }, [deleteMutation, selectedSampleId]);

  const handleApproveReturn = useCallback(() => {
    if (selectedSampleId === null) return;
    approveReturnMutation.mutate({
      requestId: selectedSampleId,
    });
  }, [approveReturnMutation, selectedSampleId]);

  const handleCompleteReturn = useCallback(() => {
    if (selectedSampleId === null) return;
    completeReturnMutation.mutate({
      requestId: selectedSampleId,
    });
  }, [completeReturnMutation, selectedSampleId]);

  const handleConfirmVendorReturn = useCallback(() => {
    if (selectedSampleId === null) return;
    confirmVendorReturnMutation.mutate({
      requestId: selectedSampleId,
    });
  }, [confirmVendorReturnMutation, selectedSampleId]);

  const handleReturnSubmit = useCallback(
    async (values: SampleReturnFormValues) => {
      if (selectedSampleId === null) {
        toast.error("You need to be logged in.");
        return;
      }
      if (returnDialogType === "sample") {
        await requestReturnMutation.mutateAsync({
          requestId: selectedSampleId,
          reason: values.reason,
          condition: values.condition,
          returnDate: values.returnDate,
        });
      } else {
        await requestVendorReturnMutation.mutateAsync({
          requestId: selectedSampleId,
          reason: values.reason,
        });
      }
    },
    [
      requestReturnMutation,
      requestVendorReturnMutation,
      returnDialogType,
      selectedSampleId,
    ]
  );

  const handleVendorShipSubmit = useCallback(
    async (values: VendorShipFormValues) => {
      if (selectedSampleId === null) {
        toast.error("You need to be logged in.");
        return;
      }
      await shipToVendorMutation.mutateAsync({
        requestId: selectedSampleId,
        trackingNumber: values.trackingNumber,
      });
    },
    [shipToVendorMutation, selectedSampleId]
  );

  const handleLocationSubmit = useCallback(
    async (values: LocationUpdateFormValues) => {
      if (selectedSampleId === null) {
        toast.error("You need to be logged in.");
        return;
      }
      await updateLocationMutation.mutateAsync({
        requestId: selectedSampleId,
        location: values.location,
        notes: values.notes,
      });
    },
    [updateLocationMutation, selectedSampleId]
  );

  const handleOpenLocationDialog = useCallback(() => {
    if (selectedRow) {
      setSelectedSampleLocation(selectedRow.location);
      setLocationDialogOpen(true);
    }
  }, [selectedRow]);

  // ============================================================================
  // Export
  // ============================================================================

  const { exportCSV, state: exportState } =
    useExport<Record<string, unknown>>();

  const handleExportCSV = () => {
    void exportCSV(rows as unknown as Record<string, unknown>[], {
      columns: EXPORT_COLUMNS as unknown as ExportColumn<
        Record<string, unknown>
      >[],
      filename: "samples",
      addTimestamp: true,
    });
  };

  // ============================================================================
  // Column definitions
  // ============================================================================

  const columnDefs = useMemo<ColDef<SamplePilotRow>[]>(
    () => [
      {
        field: "sampleId",
        headerName: "ID",
        minWidth: 70,
        maxWidth: 85,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params => `#${String(params.value ?? "")}`,
      },
      {
        field: "clientName",
        headerName: "Client",
        flex: 1.2,
        minWidth: 160,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "productSummary",
        headerName: "Products",
        flex: 1.5,
        minWidth: 200,
        cellClass: "powersheet-cell--locked",
      },
      {
        field: "status",
        headerName: "Status",
        minWidth: 160,
        maxWidth: 185,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params =>
          STATUS_LABEL_MAP[params.value as SampleStatus] ??
          String(params.value ?? ""),
      },
      {
        field: "requestedDate",
        headerName: "Requested",
        minWidth: 110,
        maxWidth: 130,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params =>
          formatOperationalDate(params.value as string | null | undefined),
      },
      {
        // DISC-SAM-003: dedicated column parsed from notes text
        field: "dueDate",
        headerName: "Due Date",
        minWidth: 110,
        maxWidth: 130,
        cellClass: "powersheet-cell--locked",
        headerTooltip:
          "Due date parsed from notes field (Due Date: YYYY-MM-DD)",
        valueFormatter: params =>
          formatOperationalDate(params.value as string | null | undefined),
      },
      {
        field: "location",
        headerName: "Location",
        minWidth: 130,
        maxWidth: 155,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params =>
          params.value
            ? LOCATION_LABEL_MAP[params.value as SampleLocation]
            : "-",
      },
      {
        field: "expirationDate",
        headerName: "Expires",
        minWidth: 110,
        maxWidth: 130,
        cellClass: "powersheet-cell--locked",
        valueFormatter: params => (params.value as string | null) ?? "-",
      },
    ],
    []
  );

  // ============================================================================
  // Status bar
  // ============================================================================

  const statusBarLeft = (
    <span>
      {allRows.length} total samples · {statusCounts.OUT} out ·{" "}
      {statusCounts.RETURN} in return
      {queueSelectionSummary
        ? ` · ${queueSelectionSummary.selectedCellCount} cells / ${queueSelectionSummary.selectedRowCount} rows selected`
        : ""}
    </span>
  );

  const statusBarCenter = (
    <span>
      {selectedRow
        ? `Selected Sample #${selectedRow.sampleId} — ${selectedRow.clientName}`
        : `${rows.length} visible rows`}
    </span>
  );

  // ============================================================================
  // Determine which workflow actions are valid for selected row
  // ============================================================================

  const selectedStatus = selectedRow?.status ?? null;

  const canFulfillSelected = canFulfill && selectedStatus === "PENDING";

  const canRequestReturnSelected =
    canRequestReturn && selectedStatus === "FULFILLED";

  const canApproveReturnSelected =
    canApproveReturn && selectedStatus === "RETURN_REQUESTED";

  const canCompleteReturnSelected =
    canRequestReturn && selectedStatus === "RETURN_APPROVED";

  const canRequestVendorReturnSelected =
    canManageVendorReturn &&
    selectedStatus !== null &&
    ["RETURNED", "FULFILLED"].includes(selectedStatus);

  const canShipToVendorSelected =
    canManageVendorReturn && selectedStatus === "VENDOR_RETURN_REQUESTED";

  const canConfirmVendorReturnSelected =
    canManageVendorReturn && selectedStatus === "SHIPPED_TO_VENDOR";

  const canUpdateLocationSelected = canTrackSamples && selectedRow !== null;

  const canDeleteSelected = canDeleteSamples && selectedRow !== null;

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="flex flex-col gap-2">
      {/* ── Command strip ── */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={searchTerm}
          onChange={event => setSearchTerm(event.target.value)}
          placeholder="Search client or product..."
          className="max-w-xs"
          aria-label="Search samples by client or product"
        />
        <Badge variant="outline" className="flex items-center gap-1">
          <Beaker className="h-3 w-3" />
          Samples sheet-native
        </Badge>
        <div className="ml-auto flex items-center gap-2">
          {canCreateSamples ? (
            <Button
              size="sm"
              onClick={() => setCreateDialogOpen(true)}
              aria-label="Create new sample request"
            >
              <Plus className="mr-2 h-4 w-4" />
              New Sample
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={handleExportCSV}
            disabled={exportState.isExporting || rows.length === 0}
            aria-label="Export samples to CSV"
          >
            <Download className="mr-2 h-4 w-4" />
            {exportState.isExporting ? "Exporting..." : "Export CSV"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void samplesQuery.refetch();
            }}
            aria-label="Refresh samples data"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ── Status tab filter ── */}
      <div
        className="flex flex-wrap gap-2"
        role="tablist"
        aria-label="Sample lane filter"
      >
        {(
          [
            { value: "ALL" as TabFilter, label: "All Samples" },
            { value: "OUT" as TabFilter, label: "Samples Out" },
            { value: "RETURN" as TabFilter, label: "Samples Return" },
          ] as const
        ).map(tab => (
          <Button
            key={tab.value}
            variant={tabFilter === tab.value ? "default" : "outline"}
            size="sm"
            role="tab"
            data-state={tabFilter === tab.value ? "active" : "inactive"}
            aria-selected={tabFilter === tab.value}
            onClick={() => setTabFilter(tab.value)}
          >
            {tab.label}
            {statusCounts[tab.value] > 0 && tab.value !== "ALL" ? (
              <Badge variant="secondary" className="ml-2">
                {statusCounts[tab.value]}
              </Badge>
            ) : null}
          </Button>
        ))}
      </div>

      {/* ── Row action bar (visible when a row is selected) ── */}
      {selectedRow ? (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
          <span className="text-sm font-medium text-foreground">
            Sample #{selectedRow.sampleId} — {selectedRow.clientName}
          </span>
          <Badge variant="outline">
            {STATUS_LABEL_MAP[selectedRow.status] ?? selectedRow.status}
          </Badge>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {/* DISC-SAM-001: Fulfill — wired for the first time */}
            {canFulfillSelected ? (
              <Button
                size="sm"
                onClick={() => setFulfillDialogOpen(true)}
                disabled={fulfillMutation.isPending}
              >
                Fulfill Request
              </Button>
            ) : null}
            {canRequestReturnSelected ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReturnDialogType("sample");
                  setReturnDialogOpen(true);
                }}
              >
                Request Return
              </Button>
            ) : null}
            {canApproveReturnSelected ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleApproveReturn}
                disabled={approveReturnMutation.isPending}
              >
                Approve Return
              </Button>
            ) : null}
            {canCompleteReturnSelected ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleCompleteReturn}
                disabled={completeReturnMutation.isPending}
              >
                Complete Return
              </Button>
            ) : null}
            {canRequestVendorReturnSelected ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReturnDialogType("vendor");
                  setReturnDialogOpen(true);
                }}
              >
                Vendor Return
              </Button>
            ) : null}
            {canShipToVendorSelected ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setVendorShipDialogOpen(true)}
              >
                Ship to Vendor
              </Button>
            ) : null}
            {canConfirmVendorReturnSelected ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleConfirmVendorReturn}
                disabled={confirmVendorReturnMutation.isPending}
              >
                Confirm Vendor Return
              </Button>
            ) : null}
            {canUpdateLocationSelected ? (
              <Button
                size="sm"
                variant="outline"
                onClick={handleOpenLocationDialog}
              >
                Update Location
              </Button>
            ) : null}
            {canDeleteSelected ? (
              <Button
                size="sm"
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={deleteMutation.isPending}
              >
                Cancel Sample
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* ── Two-column main layout: grid + expiring widget ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_300px]">
        <PowersheetGrid
          surfaceId="samples-queue"
          requirementIds={["SAM-001", "SAM-002", "SAM-003", "SAM-009"]}
          affordances={samplesAffordances}
          title="Sample Request Queue"
          description="All active sample requests with status, location, due date, and expiration. Select a row to access workflow actions."
          rows={rows}
          columnDefs={columnDefs}
          getRowId={row => row.identity.rowKey}
          selectedRowId={selectedRow?.identity.rowKey ?? null}
          onSelectedRowChange={row =>
            setSelectedSampleId(row?.sampleId ?? null)
          }
          onRowClicked={event => {
            const row = event.data;
            if (row) {
              setSelectedSampleId(row.sampleId);
            }
          }}
          selectionMode="cell-range"
          enableFillHandle={false}
          enableUndoRedo={false}
          onSelectionSummaryChange={setQueueSelectionSummary}
          isLoading={samplesQuery.isLoading}
          errorMessage={samplesQuery.error?.message ?? null}
          emptyTitle="No samples match this filter"
          emptyDescription="Adjust the search or tab filter, or create a new sample request."
          summary={
            <span>
              {rows.length} visible · {allRows.length} total
            </span>
          }
          minHeight={400}
        />

        {/* ── Expiring samples companion card (DISC-SAM-013 / SAM-013) ── */}
        <div className="flex flex-col gap-2">
          <ExpiringSamplesWidget daysAhead={30} limit={5} />
        </div>
      </div>

      {/* ── Status bar ── */}
      <WorkSurfaceStatusBar
        left={statusBarLeft}
        center={statusBarCenter}
        right={
          <KeyboardHintBar hints={queueKeyboardHints} className="text-xs" />
        }
      />

      {/* ── Inspector panel ── */}
      <InspectorPanel
        isOpen={selectedSampleId !== null}
        onClose={() => setSelectedSampleId(null)}
        title={
          selectedRow ? `Sample #${selectedRow.sampleId}` : "Sample Inspector"
        }
        subtitle={selectedRow?.clientName}
        headerActions={
          selectedRow ? (
            <Badge variant="outline">
              {STATUS_LABEL_MAP[selectedRow.status] ?? selectedRow.status}
            </Badge>
          ) : null
        }
        footer={
          selectedSampleId !== null && onOpenClassic ? (
            <Button
              variant="outline"
              className="w-full"
              onClick={() => onOpenClassic(selectedSampleId)}
            >
              <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
              Open Classic Detail
            </Button>
          ) : null
        }
      >
        {selectedRow ? (
          <div className="space-y-4">
            <InspectorSection title="Request Details">
              <InspectorField label="Sample ID">
                <p>#{selectedRow.sampleId}</p>
              </InspectorField>
              <InspectorField label="Client">
                <p>{selectedRow.clientName}</p>
              </InspectorField>
              <InspectorField label="Products">
                <p>{selectedRow.productSummary}</p>
              </InspectorField>
              <InspectorField label="Status">
                <p>
                  {STATUS_LABEL_MAP[selectedRow.status] ?? selectedRow.status}
                </p>
              </InspectorField>
              <InspectorField label="Lane">
                <p>
                  {selectedRow.lane === "OUT"
                    ? "Samples Out"
                    : "Samples Return"}
                </p>
              </InspectorField>
            </InspectorSection>

            <InspectorSection title="Dates">
              <InspectorField label="Requested">
                <p>{formatOperationalDate(selectedRow.requestedDate)}</p>
              </InspectorField>
              <InspectorField label="Due Date">
                {/* DISC-SAM-003 */}
                <p>{formatOperationalDate(selectedRow.dueDate)}</p>
              </InspectorField>
              {/* DISC-SAM-002: Editable expiration date */}
              <InspectorField label="Expires">
                {canTrackSamples ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !selectedRow.expirationDate && "text-muted-foreground"
                        )}
                        disabled={setExpirationDateMutation.isPending}
                      >
                        {setExpirationDateMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CalendarIcon className="mr-2 h-4 w-4" />
                        )}
                        {selectedRow.expirationDate
                          ? format(
                              new Date(selectedRow.expirationDate),
                              "MMM dd, yyyy"
                            )
                          : "Set expiration date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={
                          selectedRow.expirationDate
                            ? new Date(selectedRow.expirationDate)
                            : undefined
                        }
                        onSelect={date => {
                          if (date) {
                            setExpirationDateMutation.mutate({
                              requestId: selectedRow.sampleId,
                              expirationDate: format(date, "yyyy-MM-dd"),
                            });
                          }
                        }}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                ) : (
                  <p>{formatOperationalDate(selectedRow.expirationDate)}</p>
                )}
              </InspectorField>
            </InspectorSection>

            <InspectorSection title="Location & Tracking">
              <InspectorField label="Location">
                <p>
                  {selectedRow.location
                    ? LOCATION_LABEL_MAP[selectedRow.location]
                    : "—"}
                </p>
              </InspectorField>
              <InspectorField label="Vendor Tracking">
                <p>{selectedRow.vendorReturnTrackingNumber ?? "—"}</p>
              </InspectorField>
            </InspectorSection>

            {selectedRow.notes ? (
              <InspectorSection title="Notes">
                <InspectorField label="Notes">
                  <p className="whitespace-pre-wrap text-sm">
                    {selectedRow.notes}
                  </p>
                </InspectorField>
              </InspectorSection>
            ) : null}

            <InspectorSection title="Actions">
              {/* DISC-SAM-001: Fulfill */}
              {canFulfillSelected ? (
                <InspectorField label="Fulfill">
                  <Button
                    size="sm"
                    onClick={() => setFulfillDialogOpen(true)}
                    disabled={fulfillMutation.isPending}
                    className="w-full"
                  >
                    Fulfill Request
                  </Button>
                </InspectorField>
              ) : null}
              {canRequestReturnSelected ? (
                <InspectorField label="Return">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setReturnDialogType("sample");
                      setReturnDialogOpen(true);
                    }}
                  >
                    Request Return
                  </Button>
                </InspectorField>
              ) : null}
              {canUpdateLocationSelected ? (
                <InspectorField label="Location">
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full"
                    onClick={handleOpenLocationDialog}
                  >
                    Update Location
                  </Button>
                </InspectorField>
              ) : null}
            </InspectorSection>
          </div>
        ) : null}
      </InspectorPanel>

      {/* ── Dialogs ── */}

      {/* Create sample request */}
      <SampleForm
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreate}
        clients={clientOptions}
        productOptions={productOptions}
        onProductSearch={setProductSearch}
        isSubmitting={createMutation.isPending}
        isProductSearchLoading={productSearchLoading}
      />

      {/* DISC-SAM-001: Fulfill confirmation (inventory decrements with FOR UPDATE lock) */}
      <ConfirmDialog
        open={fulfillDialogOpen}
        onOpenChange={setFulfillDialogOpen}
        title="Fulfill Sample Request"
        description={
          selectedRow
            ? `This will fulfill Sample #${selectedRow.sampleId} for ${selectedRow.clientName} and decrement live inventory using a database lock. This action cannot be undone.`
            : "Fulfill this sample request? Live inventory will be decremented."
        }
        confirmLabel={
          fulfillMutation.isPending ? "Fulfilling..." : "Fulfill Request"
        }
        onConfirm={handleFulfillConfirm}
        variant="default"
      />

      {/* Cancel/delete confirmation */}
      <ConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Cancel Sample Request"
        description={
          selectedRow
            ? `Cancel Sample #${selectedRow.sampleId} for ${selectedRow.clientName}? This will mark the request as cancelled.`
            : "Cancel this sample request?"
        }
        confirmLabel={
          deleteMutation.isPending ? "Cancelling..." : "Cancel Sample"
        }
        onConfirm={handleDeleteConfirm}
        variant="destructive"
      />

      {/* Return / vendor-return dialog (sidecar) */}
      <SampleReturnDialog
        open={returnDialogOpen}
        onOpenChange={setReturnDialogOpen}
        onSubmit={handleReturnSubmit}
        type={returnDialogType}
        sampleId={selectedSampleId}
        isSubmitting={
          requestReturnMutation.isPending ||
          requestVendorReturnMutation.isPending
        }
      />

      {/* Vendor ship dialog (sidecar) */}
      <VendorShipDialog
        open={vendorShipDialogOpen}
        onOpenChange={setVendorShipDialogOpen}
        onSubmit={handleVendorShipSubmit}
        sampleId={selectedSampleId}
        isSubmitting={shipToVendorMutation.isPending}
      />

      {/* Location update dialog */}
      <LocationUpdateDialog
        open={locationDialogOpen}
        onOpenChange={setLocationDialogOpen}
        onSubmit={handleLocationSubmit}
        sampleId={selectedSampleId}
        currentLocation={selectedSampleLocation}
        isSubmitting={updateLocationMutation.isPending}
      />
    </div>
  );
}

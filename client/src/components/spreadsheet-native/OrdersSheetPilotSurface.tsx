import { useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import {
  ArrowLeft,
  Plus,
  RefreshCw,
  SquareArrowOutUpRight,
  Trash2,
  Truck,
  Wallet,
} from "lucide-react";
import { useLocation, useSearch } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import {
  buildOperationsWorkspacePath,
  buildSalesWorkspacePath,
  buildSheetNativeOrdersDocumentPath,
  buildSheetNativeOrdersPath,
} from "@/lib/workspaceRoutes";
import {
  extractItems,
  mapOrderLineItemsToPilotRows,
  mapOrdersToPilotRows,
  ordersQueueColumnPresets,
  useSpreadsheetSelectionParam,
} from "@/lib/spreadsheet-native";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
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
import OrderCreatorPage from "@/pages/OrderCreatorPage";
import { PowersheetGrid } from "./PowersheetGrid";
import type { PowersheetAffordance } from "./PowersheetGrid";
import type { PowersheetSelectionSummary } from "@/lib/powersheet/contracts";

const queueAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: false },
  { label: "Fill", available: false },
  { label: "Edit", available: false },
  { label: "Workflow actions", available: true },
];

const supportAffordances: PowersheetAffordance[] = [
  { label: "Select", available: true },
  { label: "Multi-select", available: true },
  { label: "Copy", available: true },
  { label: "Paste", available: false },
  { label: "Fill", available: false },
  { label: "Edit", available: false },
];

const queueKeyboardHints: KeyboardHint[] = [
  { key: "Click", label: "select row" },
  { key: "Shift+Click", label: "extend range" },
  { key: "\u2318+Click", label: "add to selection" },
  { key: "\u2318+C", label: "copy cells" },
  { key: "\u2318+A", label: "select all" },
];

const documentKeyboardHints: KeyboardHint[] = [
  { key: "Tab", label: "next cell" },
  { key: "Shift+Tab", label: "prev cell" },
  { key: "Enter", label: "next row" },
  { key: "Escape", label: "cancel edit" },
  { key: "\u2318+C", label: "copy" },
  { key: "\u2318+V", label: "paste" },
  { key: "\u2318+Z", label: "undo" },
];

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);

const formatDate = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? "-" : parsed.toLocaleString();
};

const parsePositiveIntegerParam = (value: string | null) => {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
};

interface OrdersSheetPilotSurfaceProps {
  onOpenClassic: (orderId?: number | null) => void;
}

export function OrdersSheetPilotSurface({
  onOpenClassic,
}: OrdersSheetPilotSurfaceProps) {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { selectedId: selectedOrderId, setSelectedId: setSelectedOrderId } =
    useSpreadsheetSelectionParam("orderId");
  const [searchTerm, setSearchTerm] = useState("");
  const [showDeleteDraftDialog, setShowDeleteDraftDialog] = useState(false);
  const [queueSelectionSummary, setQueueSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);
  const [supportSelectionSummary, setSupportSelectionSummary] =
    useState<PowersheetSelectionSummary | null>(null);

  const searchParams = useMemo(() => new URLSearchParams(search), [search]);
  const draftIdFromRoute = parsePositiveIntegerParam(
    searchParams.get("draftId")
  );
  const quoteIdFromRoute = parsePositiveIntegerParam(
    searchParams.get("quoteId")
  );
  const clientIdFromRoute = parsePositiveIntegerParam(
    searchParams.get("clientId")
  );
  const needIdFromRoute = parsePositiveIntegerParam(searchParams.get("needId"));
  const fromSalesSheet = searchParams.get("fromSalesSheet") === "true";
  const routeMode = searchParams.get("mode");
  const currentDocumentMode =
    searchParams.get("ordersView") === "document" ||
    draftIdFromRoute !== null ||
    quoteIdFromRoute !== null ||
    clientIdFromRoute !== null ||
    needIdFromRoute !== null ||
    fromSalesSheet;
  const queueQueryEnabled = !currentDocumentMode;
  const effectiveSelectedOrderId = queueQueryEnabled ? selectedOrderId : null;

  const openDocumentMode = (
    params?: Record<string, string | number | boolean | null | undefined>
  ) => {
    setLocation(buildSheetNativeOrdersDocumentPath(params));
  };

  const openQueueMode = (
    params?: Record<string, string | number | boolean | null | undefined>
  ) => {
    setLocation(buildSheetNativeOrdersPath(params));
  };

  const clientsQuery = trpc.clients.list.useQuery(
    { limit: 1000 },
    { enabled: queueQueryEnabled }
  );
  const draftsQuery = trpc.orders.getAll.useQuery(
    { isDraft: true },
    { enabled: queueQueryEnabled }
  );
  const confirmedQuery = trpc.orders.getAll.useQuery(
    { isDraft: false },
    { enabled: queueQueryEnabled }
  );
  const detailQuery = trpc.orders.getOrderWithLineItems.useQuery(
    { orderId: effectiveSelectedOrderId ?? 0 },
    { enabled: effectiveSelectedOrderId !== null }
  );
  const statusHistoryQuery = trpc.orders.getOrderStatusHistory.useQuery(
    { orderId: effectiveSelectedOrderId ?? 0 },
    { enabled: effectiveSelectedOrderId !== null }
  );
  const auditLogQuery = trpc.orders.getAuditLog.useQuery(
    { orderId: effectiveSelectedOrderId ?? 0 },
    { enabled: effectiveSelectedOrderId !== null }
  );
  const ledgerQuery = trpc.accounting.ledger.list.useQuery(
    {
      referenceType: "ORDER",
      referenceId: effectiveSelectedOrderId ?? undefined,
      limit: 25,
      offset: 0,
    },
    { enabled: effectiveSelectedOrderId !== null }
  );
  const deleteDraftMutation = trpc.orders.deleteDraftOrder.useMutation({
    onSuccess: () => {
      toast.success("Draft deleted");
      setShowDeleteDraftDialog(false);
      setSelectedOrderId(null);
      void draftsQuery.refetch();
      void confirmedQuery.refetch();
    },
    onError: error => {
      toast.error(error.message || "Failed to delete draft");
    },
  });

  const clientNamesById = useMemo(
    () =>
      new Map(
        extractItems(clientsQuery.data).map(client => [
          client.id,
          client.name || "Unknown Client",
        ])
      ),
    [clientsQuery.data]
  );

  const searchLower = searchTerm.trim().toLowerCase();

  const draftRows = useMemo(
    () =>
      mapOrdersToPilotRows({
        orders: extractItems(draftsQuery.data),
        clientNamesById,
        lane: "drafts",
      }).filter(row =>
        !searchLower
          ? true
          : row.orderNumber.toLowerCase().includes(searchLower) ||
            row.clientName.toLowerCase().includes(searchLower)
      ),
    [clientNamesById, draftsQuery.data, searchLower]
  );

  const confirmedRows = useMemo(
    () =>
      mapOrdersToPilotRows({
        orders: extractItems(confirmedQuery.data),
        clientNamesById,
        lane: "confirmed",
      }).filter(row =>
        !searchLower
          ? true
          : row.orderNumber.toLowerCase().includes(searchLower) ||
            row.clientName.toLowerCase().includes(searchLower)
      ),
    [clientNamesById, confirmedQuery.data, searchLower]
  );

  const queueRows = useMemo(
    () =>
      [...draftRows, ...confirmedRows].sort((left, right) => {
        if (left.lane !== right.lane) {
          return left.lane === "drafts" ? -1 : 1;
        }

        return (right.createdAt ?? "").localeCompare(left.createdAt ?? "");
      }),
    [confirmedRows, draftRows]
  );

  const selectedOrderRow =
    queueRows.find(row => row.orderId === effectiveSelectedOrderId) ?? null;

  const lineItemRows = useMemo(
    () => mapOrderLineItemsToPilotRows(detailQuery.data),
    [detailQuery.data]
  );

  const orderColumnDefs = useMemo<ColDef<(typeof queueRows)[number]>[]>(
    () => [
      {
        field: "stageLabel",
        headerName: "Stage",
        minWidth: 110,
        maxWidth: 130,
      },
      {
        field: "orderNumber",
        headerName: "Order",
        minWidth: 130,
        maxWidth: 150,
      },
      {
        field: "clientName",
        headerName: "Client",
        flex: 1.3,
        minWidth: 200,
      },
      {
        field: "lineItemCount",
        headerName: "Lines",
        minWidth: 90,
        maxWidth: 110,
      },
      {
        field: "total",
        headerName: "Total",
        minWidth: 120,
        maxWidth: 140,
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
      },
      {
        field: "nextStepLabel",
        headerName: "Next",
        minWidth: 140,
        maxWidth: 170,
      },
    ],
    []
  );

  const lineItemColumnDefs = useMemo<ColDef<(typeof lineItemRows)[number]>[]>(
    () => [
      {
        field: "productDisplayName",
        headerName: "Product",
        flex: 1.2,
        minWidth: 180,
      },
      {
        field: "batchSku",
        headerName: "Batch",
        minWidth: 120,
      },
      {
        field: "quantity",
        headerName: "Qty",
        minWidth: 100,
      },
      {
        field: "lineTotal",
        headerName: "Line Total",
        minWidth: 120,
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
      },
    ],
    []
  );

  const statusBarLeft = (
    <span>
      {draftRows.length} drafts · {confirmedRows.length} confirmed ·{" "}
      {ordersQueueColumnPresets.length} default queue columns
      {queueSelectionSummary
        ? ` · queue ${queueSelectionSummary.selectedCellCount} cells / ${queueSelectionSummary.selectedRowCount} rows`
        : ""}
      {supportSelectionSummary
        ? ` · support ${supportSelectionSummary.selectedCellCount} cells`
        : ""}
    </span>
  );

  const statusBarCenter = (
    <span>
      {selectedOrderRow
        ? `Selected ${selectedOrderRow.orderNumber} · ${selectedOrderRow.stageLabel} · ${selectedOrderRow.ageLabel} old`
        : "Select an order to load linked lines, evidence, and action context"}
      {queueSelectionSummary
        ? ` · queue selection visible${
            queueSelectionSummary.hasDiscontiguousSelection
              ? " · discontiguous"
              : ""
          }`
        : ""}
    </span>
  );

  const queueSelectionTouchesMultipleRows =
    (queueSelectionSummary?.selectedRowCount ?? 0) > 1;
  const workflowActionTargetLabel = selectedOrderRow
    ? `Workflow target: focused order ${selectedOrderRow.orderNumber}`
    : "Workflow target: select a focused order";
  const workflowActionGuardrail = queueSelectionTouchesMultipleRows
    ? "Spreadsheet selection spans multiple rows. Workflow actions stay locked until the focused row is the only selected row in scope."
    : "Workflow actions remain explicit row-scoped actions. Cell selections do not change handoff ownership.";

  const canOpenAccounting = selectedOrderRow?.lane === "confirmed";
  const canOpenShipping = Boolean(
    selectedOrderRow?.lane === "confirmed" && selectedOrderRow.invoiceId
  );
  const rowScopedActionsBlocked = queueSelectionTouchesMultipleRows;
  const classicDocumentParams = {
    draftId: draftIdFromRoute ?? undefined,
    quoteId: quoteIdFromRoute ?? undefined,
    clientId: clientIdFromRoute ?? undefined,
    needId: needIdFromRoute ?? undefined,
    mode: routeMode ?? undefined,
    fromSalesSheet: fromSalesSheet ? true : undefined,
  };
  const documentContextLabel =
    draftIdFromRoute !== null
      ? `Draft #${draftIdFromRoute}`
      : quoteIdFromRoute !== null
        ? `Quote #${quoteIdFromRoute}`
        : clientIdFromRoute !== null
          ? `Client #${clientIdFromRoute}`
          : fromSalesSheet
            ? "Sales Sheet import"
            : "New draft";

  if (currentDocumentMode) {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() =>
              openQueueMode({
                orderId: draftIdFromRoute ?? undefined,
              })
            }
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Queue
          </Button>
          <Badge variant="outline">Sheet-native Orders</Badge>
          <Badge variant="secondary">Document mode</Badge>
          <span className="text-sm text-muted-foreground">
            {documentContextLabel}
          </span>
          <div className="ml-auto flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() =>
                setLocation(
                  buildSalesWorkspacePath("create-order", {
                    ...classicDocumentParams,
                    classic: true,
                  })
                )
              }
            >
              <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
              Classic Composer
            </Button>
          </div>
        </div>

        <OrderCreatorPage surfaceVariant="sheet-native-orders" />

        <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            Keyboard:
          </span>
          <KeyboardHintBar hints={documentKeyboardHints} className="text-xs" />
          <span className="ml-auto text-xs text-muted-foreground">
            Spreadsheet edits stay in the grid. Finalize and handoffs use the
            buttons below.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={searchTerm}
          onChange={event => setSearchTerm(event.target.value)}
          placeholder="Search order or client"
          className="max-w-xs"
        />
        <Badge variant="outline">Pilot: queue + document + handoffs</Badge>
        <div className="ml-auto flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              void draftsQuery.refetch();
              void confirmedQuery.refetch();
              void detailQuery.refetch();
            }}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button size="sm" onClick={() => openDocumentMode()}>
            <Plus className="mr-2 h-4 w-4" />
            New Order
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
        <span className="text-sm font-medium text-foreground">
          {selectedOrderRow
            ? `${selectedOrderRow.orderNumber} selected`
            : "Queue evaluation active"}
        </span>
        <Badge
          variant={rowScopedActionsBlocked ? "secondary" : "outline"}
          className="max-w-full"
        >
          {workflowActionTargetLabel}
        </Badge>
        <span className="text-xs text-muted-foreground">
          Primary actions stay on-sheet. The document flow now stays inside the
          sheet-native Orders surface, while accounting and shipping remain
          explicit owner handoffs.
        </span>
        <span className="text-xs text-muted-foreground">
          {workflowActionGuardrail}
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={
              selectedOrderRow?.lane === "drafts" ? "default" : "outline"
            }
            disabled={rowScopedActionsBlocked}
            onClick={() =>
              openDocumentMode({
                draftId:
                  selectedOrderRow?.lane === "drafts"
                    ? selectedOrderRow.orderId
                    : undefined,
              })
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            {selectedOrderRow?.lane === "drafts" ? "Edit Draft" : "New Draft"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={
              selectedOrderRow?.lane !== "drafts" || rowScopedActionsBlocked
            }
            onClick={() => setShowDeleteDraftDialog(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Draft
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={
              !selectedOrderRow || !canOpenAccounting || rowScopedActionsBlocked
            }
            onClick={() => {
              if (!selectedOrderRow) {
                return;
              }

              setLocation(
                `/accounting?tab=payments&orderId=${selectedOrderRow.orderId}&from=sales`
              );
            }}
          >
            <Wallet className="mr-2 h-4 w-4" />
            Accounting
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={
              !selectedOrderRow || !canOpenShipping || rowScopedActionsBlocked
            }
            onClick={() => {
              if (!selectedOrderRow) {
                return;
              }

              setLocation(
                buildOperationsWorkspacePath("shipping", {
                  orderId: selectedOrderRow.orderId,
                })
              );
            }}
          >
            <Truck className="mr-2 h-4 w-4" />
            Shipping
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onOpenClassic(selectedOrderId)}
          >
            <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
            Classic
          </Button>
        </div>
      </div>

      <PowersheetGrid
        surfaceId="orders-queue"
        requirementIds={["ORD-WF-001", "ORD-WF-006", "ORD-WF-007"]}
        releaseGateIds={[
          "SALE-ORD-019",
          "SALE-ORD-023",
          "SALE-ORD-024",
          "SALE-ORD-026",
          "SALE-ORD-027",
        ]}
        affordances={queueAffordances}
        title="Orders Queue"
        description="One dominant queue keeps stage, client, lines, total, and next-step cues visible so the inspector is only for deeper context."
        rows={queueRows}
        columnDefs={orderColumnDefs}
        getRowId={row => row.identity.rowKey}
        selectedRowId={selectedOrderRow?.identity.rowKey ?? null}
        onSelectedRowChange={row => setSelectedOrderId(row?.orderId ?? null)}
        selectionMode="cell-range"
        enableFillHandle={false}
        enableUndoRedo={false}
        onSelectionSummaryChange={setQueueSelectionSummary}
        isLoading={draftsQuery.isLoading || confirmedQuery.isLoading}
        errorMessage={
          draftsQuery.error?.message ?? confirmedQuery.error?.message ?? null
        }
        emptyTitle="No orders match this queue"
        emptyDescription="Adjust the search or open the document sheet to create a new draft."
        summary={
          <span>
            {queueRows.length} visible orders · {draftRows.length} drafts ·{" "}
            {confirmedRows.length} confirmed
          </span>
        }
        antiDriftSummary="Queue release gates: spreadsheet selection parity, discoverability, and explicit workflow actions."
        minHeight={360}
      />

      {selectedOrderRow ? (
        <div className="grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Client
            </div>
            <div className="mt-1 text-sm font-medium">
              {selectedOrderRow.clientName}
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Stage
            </div>
            <div className="mt-1 text-sm font-medium">
              {selectedOrderRow.stageLabel} ·{" "}
              {selectedOrderRow.fulfillmentStatus}
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Invoice
            </div>
            <div className="mt-1 text-sm font-medium">
              {selectedOrderRow.invoiceStateLabel}
            </div>
          </div>
          <div className="rounded-lg border border-border/70 bg-card px-3 py-3">
            <div className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
              Next step
            </div>
            <div className="mt-1 text-sm font-medium">
              {selectedOrderRow.nextStepLabel}
            </div>
          </div>
        </div>
      ) : null}

      <PowersheetGrid
        surfaceId="orders-support-grid"
        requirementIds={["ORD-WF-002"]}
        releaseGateIds={["SALE-ORD-023", "SALE-ORD-026"]}
        affordances={supportAffordances}
        title="Selected Order Lines"
        description="This supporting table stays selection-driven and compact, which is closer to the final document-sheet model than a second full queue."
        rows={lineItemRows}
        columnDefs={lineItemColumnDefs}
        getRowId={row => row.identity.rowKey}
        selectionMode="cell-range"
        enableFillHandle={false}
        enableUndoRedo={false}
        onSelectionSummaryChange={setSupportSelectionSummary}
        isLoading={detailQuery.isLoading}
        errorMessage={detailQuery.error?.message ?? null}
        emptyTitle="No order selected"
        emptyDescription="Select a draft or confirmed row above to populate the linked line-item table."
        summary={
          selectedOrderRow ? (
            <span>
              {selectedOrderRow.orderNumber} · {lineItemRows.length} linked line
              items
            </span>
          ) : undefined
        }
        antiDriftSummary="Support-grid release gate: linked lines must share the same spreadsheet grammar and active-order synchronization."
        minHeight={220}
      />

      <WorkSurfaceStatusBar
        left={statusBarLeft}
        center={statusBarCenter}
        right={
          <KeyboardHintBar hints={queueKeyboardHints} className="text-xs" />
        }
      />

      <InspectorPanel
        isOpen={selectedOrderRow !== null}
        onClose={() => setSelectedOrderId(null)}
        title={selectedOrderRow?.orderNumber || "Order Inspector"}
        subtitle={selectedOrderRow?.clientName || "Select an order"}
        headerActions={
          selectedOrderRow ? (
            <Badge variant="outline">
              {selectedOrderRow.fulfillmentStatus}
            </Badge>
          ) : null
        }
      >
        {selectedOrderRow ? (
          <div className="space-y-4">
            <InspectorSection title="Selection Context">
              <InspectorField label="Client">
                <p>{selectedOrderRow.clientName}</p>
              </InspectorField>
              <InspectorField label="Order Type">
                <p>{selectedOrderRow.orderType}</p>
              </InspectorField>
              <InspectorField label="Total">
                <p>{formatCurrency(selectedOrderRow.total)}</p>
              </InspectorField>
              <InspectorField label="Created">
                <p>{formatDate(selectedOrderRow.createdAt)}</p>
              </InspectorField>
              <InspectorField label="Age">
                <p>{selectedOrderRow.ageLabel}</p>
              </InspectorField>
            </InspectorSection>

            <InspectorSection title="Evidence">
              <InspectorField label="Status Events">
                <p>{String(statusHistoryQuery.data?.length ?? 0)}</p>
              </InspectorField>
              <InspectorField label="Audit Entries">
                <p>{String(auditLogQuery.data?.length ?? 0)}</p>
              </InspectorField>
              <InspectorField label="GL Entries">
                <p>{String(ledgerQuery.data?.items?.length ?? 0)}</p>
              </InspectorField>
              <InspectorField label="Invoice">
                <p>
                  {selectedOrderRow.invoiceId
                    ? `Invoice #${selectedOrderRow.invoiceId}`
                    : "Not invoiced"}
                </p>
              </InspectorField>
            </InspectorSection>
          </div>
        ) : null}
        footer=
        {selectedOrderRow ? (
          <Button
            variant="outline"
            className="w-full"
            onClick={() => onOpenClassic(selectedOrderRow.orderId)}
          >
            <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
            Open Classic Sales Context
          </Button>
        ) : null}
      </InspectorPanel>

      <ConfirmDialog
        open={showDeleteDraftDialog}
        onOpenChange={setShowDeleteDraftDialog}
        title="Delete Draft Order?"
        description={
          selectedOrderRow?.lane === "drafts"
            ? `Delete ${selectedOrderRow.orderNumber}? This cannot be undone.`
            : "Delete the selected draft? This cannot be undone."
        }
        confirmLabel={
          deleteDraftMutation.isPending ? "Deleting..." : "Delete Draft"
        }
        variant="destructive"
        onConfirm={() => {
          if (selectedOrderRow?.lane !== "drafts") {
            return;
          }

          deleteDraftMutation.mutate({ orderId: selectedOrderRow.orderId });
        }}
      />
    </div>
  );
}

export default OrdersSheetPilotSurface;

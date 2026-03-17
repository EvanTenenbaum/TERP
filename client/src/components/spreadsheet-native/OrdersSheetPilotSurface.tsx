import { useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import {
  Plus,
  RefreshCw,
  SquareArrowOutUpRight,
  Truck,
  Wallet,
} from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  buildOperationsWorkspacePath,
  buildSalesWorkspacePath,
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
import { Input } from "@/components/ui/input";
import {
  InspectorField,
  InspectorPanel,
  InspectorSection,
} from "@/components/work-surface/InspectorPanel";
import { WorkSurfaceStatusBar } from "@/components/work-surface/WorkSurfaceStatusBar";
import { SpreadsheetPilotGrid } from "./SpreadsheetPilotGrid";

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

interface OrdersSheetPilotSurfaceProps {
  onOpenClassic: (orderId?: number | null) => void;
}

export function OrdersSheetPilotSurface({
  onOpenClassic,
}: OrdersSheetPilotSurfaceProps) {
  const [, setLocation] = useLocation();
  const { selectedId: selectedOrderId, setSelectedId: setSelectedOrderId } =
    useSpreadsheetSelectionParam("orderId");
  const [search, setSearch] = useState("");

  const clientsQuery = trpc.clients.list.useQuery({ limit: 1000 });
  const draftsQuery = trpc.orders.getAll.useQuery({ isDraft: true });
  const confirmedQuery = trpc.orders.getAll.useQuery({ isDraft: false });
  const detailQuery = trpc.orders.getOrderWithLineItems.useQuery(
    { orderId: selectedOrderId ?? 0 },
    { enabled: selectedOrderId !== null }
  );
  const statusHistoryQuery = trpc.orders.getOrderStatusHistory.useQuery(
    { orderId: selectedOrderId ?? 0 },
    { enabled: selectedOrderId !== null }
  );
  const auditLogQuery = trpc.orders.getAuditLog.useQuery(
    { orderId: selectedOrderId ?? 0 },
    { enabled: selectedOrderId !== null }
  );
  const ledgerQuery = trpc.accounting.ledger.list.useQuery(
    {
      referenceType: "ORDER",
      referenceId: selectedOrderId ?? undefined,
      limit: 25,
      offset: 0,
    },
    { enabled: selectedOrderId !== null }
  );

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

  const searchLower = search.trim().toLowerCase();

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
    queueRows.find(row => row.orderId === selectedOrderId) ?? null;

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
    </span>
  );

  const statusBarCenter = (
    <span>
      {selectedOrderRow
        ? `Selected ${selectedOrderRow.orderNumber} · ${selectedOrderRow.stageLabel} · ${selectedOrderRow.ageLabel} old`
        : "Select an order to load linked lines, evidence, and action context"}
    </span>
  );

  const canOpenAccounting = selectedOrderRow?.lane === "confirmed";
  const canOpenShipping = Boolean(
    selectedOrderRow?.lane === "confirmed" && selectedOrderRow.invoiceId
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={search}
          onChange={event => setSearch(event.target.value)}
          placeholder="Search order or client"
          className="max-w-xs"
        />
        <Badge variant="outline">Pilot: queue + linked detail</Badge>
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
          <Button
            size="sm"
            onClick={() => setLocation(buildSalesWorkspacePath("create-order"))}
          >
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
        <span className="text-xs text-muted-foreground">
          Primary actions stay on-sheet. Composer, payment, and shipping still
          hand off to owned adjacent surfaces.
        </span>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            variant={
              selectedOrderRow?.lane === "drafts" ? "default" : "outline"
            }
            onClick={() =>
              setLocation(
                buildSalesWorkspacePath("create-order", {
                  draftId:
                    selectedOrderRow?.lane === "drafts"
                      ? selectedOrderRow.orderId
                      : undefined,
                })
              )
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            {selectedOrderRow?.lane === "drafts"
              ? "Open Draft"
              : "Open Composer"}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!selectedOrderRow || !canOpenAccounting}
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
            disabled={!selectedOrderRow || !canOpenShipping}
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

      <SpreadsheetPilotGrid
        title="Orders Queue"
        description="One dominant queue keeps stage, client, lines, total, and next-step cues visible so the inspector is only for deeper context."
        rows={queueRows}
        columnDefs={orderColumnDefs}
        getRowId={row => row.identity.rowKey}
        selectedRowId={selectedOrderRow?.identity.rowKey ?? null}
        onSelectedRowChange={row => setSelectedOrderId(row?.orderId ?? null)}
        isLoading={draftsQuery.isLoading || confirmedQuery.isLoading}
        errorMessage={
          draftsQuery.error?.message ?? confirmedQuery.error?.message ?? null
        }
        emptyTitle="No orders match this queue"
        emptyDescription="Adjust the search or open the composer to create a new draft."
        summary={
          <span>
            {queueRows.length} visible orders · {draftRows.length} drafts ·{" "}
            {confirmedRows.length} confirmed
          </span>
        }
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

      <SpreadsheetPilotGrid
        title="Selected Order Lines"
        description="This supporting table stays selection-driven and compact, which is closer to the final document-sheet model than a second full queue."
        rows={lineItemRows}
        columnDefs={lineItemColumnDefs}
        getRowId={row => row.identity.rowKey}
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
        minHeight={220}
      />

      <WorkSurfaceStatusBar
        left={statusBarLeft}
        center={statusBarCenter}
        right={
          <span className="text-xs text-muted-foreground">
            Primary actions live next to selection. Use the inspector for deeper
            context and evidence, not for the happy path.
          </span>
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
    </div>
  );
}

export default OrdersSheetPilotSurface;

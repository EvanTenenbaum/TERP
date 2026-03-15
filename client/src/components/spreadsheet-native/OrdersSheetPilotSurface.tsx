import { useMemo, useState } from "react";
import type { ColDef } from "ag-grid-community";
import {
  FileText,
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
  salesOrdersWorkbookAdapter,
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

  const selectedOrderRow =
    draftRows.find(row => row.orderId === selectedOrderId) ||
    confirmedRows.find(row => row.orderId === selectedOrderId) ||
    null;

  const lineItemRows = useMemo(
    () => mapOrderLineItemsToPilotRows(detailQuery.data),
    [detailQuery.data]
  );

  const orderColumnDefs = useMemo<ColDef<(typeof draftRows)[number]>[]>(
    () => [
      {
        field: "orderNumber",
        headerName: "Order",
        minWidth: 130,
      },
      {
        field: "clientName",
        headerName: "Client",
        flex: 1.2,
        minWidth: 180,
      },
      {
        field: "fulfillmentStatus",
        headerName: "Status",
        minWidth: 170,
      },
      {
        field: "total",
        headerName: "Total",
        minWidth: 120,
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
      },
      {
        field: "createdAt",
        headerName: "Created",
        minWidth: 170,
        valueFormatter: params => formatDate(params.value ?? null),
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
        field: "unitPrice",
        headerName: "Unit Price",
        minWidth: 120,
        valueFormatter: params => formatCurrency(Number(params.value ?? 0)),
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
      {ordersQueueColumnPresets.length} fixed queue columns
    </span>
  );

  const statusBarCenter = (
    <span>
      {selectedOrderRow
        ? `Selected ${selectedOrderRow.orderNumber}`
        : "Select a draft or confirmed order to load the linked detail tables"}
    </span>
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
        <Badge variant="secondary">
          {salesOrdersWorkbookAdapter.sheets[0]?.archetype} sheet
        </Badge>
        <Badge variant="outline">limited queue + inspector evaluation</Badge>
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
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button
            size="sm"
            onClick={() => setLocation(buildSalesWorkspacePath("create-order"))}
          >
            <Plus className="mr-2 h-4 w-4" />
            Open Workbook Composer
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onOpenClassic(selectedOrderId)}
          >
            <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
            Classic Orders
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-amber-300/60 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        This internal sheet-native pilot is limited to queue browse, selected
        order inspection, and owned handoffs. Draft editing, create-order
        composition, returns, and advanced output flows still run in adjacent
        workbook surfaces.
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <SpreadsheetPilotGrid
          title="Drafts"
          description="Drafts stay visible as their own lane so the pilot can evaluate adjacent-table queue behavior without replacing the composer."
          rows={draftRows}
          columnDefs={orderColumnDefs}
          getRowId={row => row.identity.rowKey}
          selectedRowId={
            selectedOrderRow?.lane === "drafts"
              ? selectedOrderRow.identity.rowKey
              : null
          }
          onSelectedRowChange={row => setSelectedOrderId(row?.orderId ?? null)}
          isLoading={draftsQuery.isLoading}
          errorMessage={draftsQuery.error?.message ?? null}
          emptyTitle="No draft orders"
          emptyDescription="Drafts created in the composer will appear here."
          summary={<span>{draftRows.length} visible draft rows</span>}
          minHeight={300}
        />
        <SpreadsheetPilotGrid
          title="Confirmed"
          description="Confirmed work remains a separate lane so handoffs can be reviewed without rebuilding shipping inside the sheet."
          rows={confirmedRows}
          columnDefs={orderColumnDefs}
          getRowId={row => row.identity.rowKey}
          selectedRowId={
            selectedOrderRow?.lane === "confirmed"
              ? selectedOrderRow.identity.rowKey
              : null
          }
          onSelectedRowChange={row => setSelectedOrderId(row?.orderId ?? null)}
          isLoading={confirmedQuery.isLoading}
          errorMessage={confirmedQuery.error?.message ?? null}
          emptyTitle="No confirmed orders"
          emptyDescription="Confirmed orders ready for operations will appear here."
          summary={<span>{confirmedRows.length} visible confirmed rows</span>}
          minHeight={300}
        />
      </div>

      <SpreadsheetPilotGrid
        title="Selected Order Lines"
        description="The supporting table stays in sync with the active order so the pilot can evaluate linked-table behavior without replacing the draft composer."
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
        minHeight={260}
      />

      <WorkSurfaceStatusBar
        left={statusBarLeft}
        center={statusBarCenter}
        right={
          <span className="text-xs text-muted-foreground">
            Click a row to inspect it. Use the workbook composer or classic
            orders surface for draft editing and full order management.
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
            <InspectorSection title="Order Summary">
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
            </InspectorSection>

            <InspectorSection title="Linked Evidence">
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

            <InspectorSection title="Handoffs">
              <div className="flex flex-col gap-2">
                <Button
                  onClick={() =>
                    setLocation(
                      buildSalesWorkspacePath("create-order", {
                        draftId:
                          selectedOrderRow.lane === "drafts"
                            ? selectedOrderRow.orderId
                            : undefined,
                      })
                    )
                  }
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {selectedOrderRow.lane === "drafts"
                    ? "Open Draft Composer"
                    : "Open Composer"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setLocation(
                      `/accounting?tab=payments&orderId=${selectedOrderRow.orderId}&from=sales`
                    )
                  }
                >
                  <Wallet className="mr-2 h-4 w-4" />
                  Open Accounting Payment
                </Button>
                <Button
                  variant="outline"
                  onClick={() =>
                    setLocation(
                      buildOperationsWorkspacePath("shipping", {
                        orderId: selectedOrderRow.orderId,
                      })
                    )
                  }
                >
                  <Truck className="mr-2 h-4 w-4" />
                  Open Shipping Handoff
                </Button>
                <Button
                  variant="outline"
                  onClick={() => onOpenClassic(selectedOrderRow.orderId)}
                >
                  <SquareArrowOutUpRight className="mr-2 h-4 w-4" />
                  Open Classic Sales Context
                </Button>
              </div>
            </InspectorSection>
          </div>
        ) : null}
      </InspectorPanel>
    </div>
  );
}

export default OrdersSheetPilotSurface;

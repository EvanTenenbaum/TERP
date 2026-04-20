import { Fragment, useMemo, useState } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Badge } from "../components/ui/badge";
import { Download } from "lucide-react";

type PickListStatus = "all" | "pending" | "partial" | "fulfilled";

const STATUS_OPTIONS: { value: PickListStatus; label: string }[] = [
  { value: "all", label: "All open" },
  { value: "pending", label: "Pending" },
  { value: "partial", label: "Partial" },
  { value: "fulfilled", label: "Fulfilled" },
];

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export default function ShippingPickListPage() {
  const [status, setStatus] = useState<PickListStatus>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  const queryInput = useMemo(
    () => ({
      status: status === "all" ? undefined : status,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    }),
    [status, dateFrom, dateTo]
  );

  const { data, isLoading, isError, error } =
    trpc.orders.getPickList.useQuery(queryInput);

  const totals = useMemo(() => {
    if (!data) return { orders: 0, lineItems: 0 };
    return {
      orders: data.length,
      lineItems: data.reduce((sum, row) => sum + row.lineItems.length, 0),
    };
  }, [data]);

  const handleExport = () => {
    if (!data || data.length === 0) return;
    const header = [
      "Order ID",
      "Order Number",
      "Client",
      "Fulfillment Status",
      "Created",
      "SKU",
      "Product",
      "Quantity",
      "Unit",
    ];
    const rows: string[][] = [];
    for (const row of data) {
      const created = row.createdAt
        ? new Date(row.createdAt).toISOString()
        : "";
      if (row.lineItems.length === 0) {
        rows.push([
          String(row.orderId),
          row.orderNumber ?? "",
          row.clientName ?? "",
          row.fulfillmentStatus ?? "",
          created,
          "",
          "",
          "",
          "",
        ]);
        continue;
      }
      for (const item of row.lineItems) {
        rows.push([
          String(row.orderId),
          row.orderNumber ?? "",
          row.clientName ?? "",
          row.fulfillmentStatus ?? "",
          created,
          item.sku ?? "",
          item.productName ?? "",
          String(item.quantity),
          item.unit ?? "",
        ]);
      }
    }

    const csv = [header, ...rows]
      .map(cols => cols.map(csvEscape).join(","))
      .join("\r\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    anchor.href = url;
    anchor.download = `pick-list-${stamp}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold">Shipping Pick List</h1>
          <p className="text-sm text-muted-foreground">
            Open orders grouped for warehouse pick &amp; pack. {totals.orders}{" "}
            order{totals.orders === 1 ? "" : "s"}, {totals.lineItems} line item
            {totals.lineItems === 1 ? "" : "s"}.
          </p>
        </div>
        <Button
          onClick={handleExport}
          disabled={isLoading || !data || data.length === 0}
          variant="outline"
        >
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {data && data.length === 500 ? (
        <div className="mb-4 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Showing first 500 results — use filters to narrow results.
        </div>
      ) : null}

      <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <Label htmlFor="pick-status">Status</Label>
          <Select
            value={status}
            onValueChange={val => setStatus(val as PickListStatus)}
          >
            <SelectTrigger id="pick-status" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="pick-date-from">From</Label>
          <Input
            id="pick-date-from"
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <Label htmlFor="pick-date-to">To</Label>
          <Input
            id="pick-date-to"
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="mt-1"
          />
        </div>
        <div className="flex items-end">
          <Button
            variant="ghost"
            onClick={() => {
              setStatus("all");
              setDateFrom("");
              setDateTo("");
            }}
            className="w-full"
          >
            Reset filters
          </Button>
        </div>
      </div>

      {isError ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Failed to load pick list: {error?.message ?? "unknown error"}
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[120px]">Order</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="text-right">Qty</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    Loading pick list...
                  </TableCell>
                </TableRow>
              ) : data && data.length > 0 ? (
                data.map(row => (
                  <Fragment key={row.orderId}>
                    {row.lineItems.length === 0 ? (
                      <TableRow>
                        <TableCell className="font-mono text-xs">
                          {row.orderNumber ?? `#${row.orderId}`}
                        </TableCell>
                        <TableCell>{row.clientName ?? "—"}</TableCell>
                        <TableCell
                          colSpan={4}
                          className="text-muted-foreground italic"
                        >
                          No line items
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {row.fulfillmentStatus ?? "—"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ) : (
                      row.lineItems.map((item, idx) => (
                        <TableRow
                          key={`${row.orderId}-${item.batchId ?? "none"}-${item.sku ?? idx}`}
                        >
                          <TableCell className="font-mono text-xs">
                            {idx === 0
                              ? (row.orderNumber ?? `#${row.orderId}`)
                              : ""}
                          </TableCell>
                          <TableCell>
                            {idx === 0 ? (row.clientName ?? "—") : ""}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            {item.sku ?? "—"}
                          </TableCell>
                          <TableCell>{item.productName}</TableCell>
                          <TableCell className="text-right tabular-nums">
                            {item.quantity}
                          </TableCell>
                          <TableCell>{item.unit}</TableCell>
                          <TableCell>
                            {idx === 0 ? (
                              <Badge variant="secondary">
                                {row.fulfillmentStatus ?? "—"}
                              </Badge>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center text-muted-foreground py-8"
                  >
                    No open orders match the current filters.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

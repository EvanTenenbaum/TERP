/**
 * WS-005: Audit Modal Component
 * Displays the calculation breakdown for any auditable field
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Download, ChevronLeft, ChevronRight, Calculator } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { TableSkeleton, StatsSkeleton } from "@/components/ui/skeleton";

type AuditType = "CLIENT_TAB" | "INVENTORY" | "ORDER" | "VENDOR" | "ACCOUNT";

interface AuditModalProps {
  open: boolean;
  onClose: () => void;
  type: AuditType;
  entityId: number;
  entityName?: string;
}

export function AuditModal({
  open,
  onClose,
  type,
  entityId,
  entityName,
}: AuditModalProps) {
  const [dateRange, setDateRange] = useState<string>("all");
  const [page, setPage] = useState(1);

  // Calculate date filters
  const getDateFilter = () => {
    const now = new Date();
    switch (dateRange) {
      case "7d":
        return { dateFrom: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) };
      case "30d":
        return { dateFrom: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) };
      case "90d":
        return { dateFrom: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000) };
      case "1y":
        return { dateFrom: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000) };
      default:
        return {};
    }
  };

  // Client Tab Balance Query
  const clientTabQuery = trpc.audit.getClientTabBreakdown.useQuery(
    { clientId: entityId, page, pageSize: 20, ...getDateFilter() },
    { enabled: open && type === "CLIENT_TAB" }
  );

  // Inventory Query
  const inventoryQuery = trpc.audit.getInventoryBreakdown.useQuery(
    { batchId: entityId, page, pageSize: 20, ...getDateFilter() },
    { enabled: open && type === "INVENTORY" }
  );

  // Order Query
  const orderQuery = trpc.audit.getOrderBreakdown.useQuery(
    { orderId: entityId },
    { enabled: open && type === "ORDER" }
  );

  // Vendor Query
  const vendorQuery = trpc.audit.getVendorBalanceBreakdown.useQuery(
    { vendorId: entityId, page, pageSize: 20, ...getDateFilter() },
    { enabled: open && type === "VENDOR" }
  );

  const getTitle = () => {
    switch (type) {
      case "CLIENT_TAB":
        return `Tab Balance Breakdown: ${entityName || "Client"}`;
      case "INVENTORY":
        return `Inventory Breakdown: ${entityName || "Batch"}`;
      case "ORDER":
        return `Order Breakdown: ${entityName || "Order"}`;
      case "VENDOR":
        return `Vendor Balance Breakdown: ${entityName || "Vendor"}`;
      case "ACCOUNT":
        return `Account Balance Breakdown: ${entityName || "Account"}`;
      default:
        return "Audit Breakdown";
    }
  };

  const renderClientTabContent = () => {
    const data = clientTabQuery.data;
    if (!data) return null;

    return (
      <>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-sm text-gray-500">Current Balance</p>
            <p className="text-2xl font-bold">{formatCurrency(data.currentBalance)}</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-sm text-blue-600">Formula</p>
            <p className="text-sm font-mono">{data.formula}</p>
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between text-sm text-gray-500">
          <span>
            Total Orders: {formatCurrency(data.summary.totalOrders)} | 
            Total Payments: {formatCurrency(data.summary.totalPayments)}
          </span>
          <span>{data.totalTransactions} transactions</span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>By</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.transactions.map((t) => (
              <TableRow key={`txn-${t.date}-${t.reference}`}>
                <TableCell>{formatDate(t.date)}</TableCell>
                <TableCell>
                  <Badge variant={t.type === "ORDER" ? "default" : "secondary"}>
                    {t.type}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{t.reference}</TableCell>
                <TableCell>{t.createdBy}</TableCell>
                <TableCell className={`text-right ${t.amount >= 0 ? "text-red-600" : "text-green-600"}`}>
                  {t.amount >= 0 ? "+" : ""}{formatCurrency(t.amount)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(t.runningBalance)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {data.totalTransactions > 20 && (
          <div className="mt-4 flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <span className="text-sm text-gray-500">
              Page {page} of {Math.ceil(data.totalTransactions / 20)}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page * 20 >= data.totalTransactions}
            >
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </>
    );
  };

  const renderInventoryContent = () => {
    const data = inventoryQuery.data;
    if (!data) return null;

    return (
      <>
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-sm text-gray-500">Current Quantity</p>
            <p className="text-2xl font-bold">{data.currentQuantity}</p>
          </div>
          <div className="rounded-lg bg-amber-50 p-3">
            <p className="text-sm text-amber-600">Reserved</p>
            <p className="text-2xl font-bold">{data.reservedQuantity}</p>
          </div>
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-sm text-green-600">Available</p>
            <p className="text-2xl font-bold">{data.availableQuantity}</p>
          </div>
        </div>

        <div className="mb-2 rounded-lg bg-blue-50 p-3">
          <p className="text-sm text-blue-600">Formula</p>
          <p className="text-sm font-mono">{data.formula}</p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>By</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.movements.map((m) => (
              <TableRow key={`move-${m.date}-${m.type}`}>
                <TableCell>{formatDate(m.date)}</TableCell>
                <TableCell>
                  <Badge variant={m.quantity >= 0 ? "default" : "destructive"}>
                    {m.type}
                  </Badge>
                </TableCell>
                <TableCell>{m.description}</TableCell>
                <TableCell>{m.createdBy}</TableCell>
                <TableCell className={`text-right ${m.quantity >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {m.quantity >= 0 ? "+" : ""}{m.quantity}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {m.runningTotal}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </>
    );
  };

  const renderOrderContent = () => {
    const data = orderQuery.data;
    if (!data) return null;

    return (
      <>
        <div className="mb-4 grid grid-cols-3 gap-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-sm text-gray-500">Order Total</p>
            <p className="text-2xl font-bold">{formatCurrency(data.calculation.total)}</p>
          </div>
          <div className="rounded-lg bg-green-50 p-3">
            <p className="text-sm text-green-600">Amount Paid</p>
            <p className="text-2xl font-bold">{formatCurrency(data.calculation.amountPaid)}</p>
          </div>
          <div className="rounded-lg bg-red-50 p-3">
            <p className="text-sm text-red-600">Balance Due</p>
            <p className="text-2xl font-bold">{formatCurrency(data.calculation.balanceDue)}</p>
          </div>
        </div>

        <div className="mb-4 rounded-lg bg-blue-50 p-3">
          <p className="text-sm text-blue-600">Formula</p>
          <p className="text-sm font-mono">{data.formula}</p>
        </div>

        <h4 className="mb-2 font-semibold">Line Items</h4>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">Unit Price</TableHead>
              <TableHead className="text-right">Discount</TableHead>
              <TableHead className="text-right">Line Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.lineItems.map((li) => (
              <TableRow key={`line-${li.productName}`}>
                <TableCell>{li.productName}</TableCell>
                <TableCell className="text-right">{li.quantity}</TableCell>
                <TableCell className="text-right">{formatCurrency(li.unitPrice)}</TableCell>
                <TableCell className="text-right text-red-600">
                  {li.discount > 0 ? `-${formatCurrency(li.discount)}` : "-"}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(li.lineTotal)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-gray-50">
              <TableCell colSpan={3}></TableCell>
              <TableCell className="text-right font-medium">Subtotal</TableCell>
              <TableCell className="text-right font-bold">
                {formatCurrency(data.calculation.subtotal)}
              </TableCell>
            </TableRow>
            {data.calculation.discount > 0 && (
              <TableRow className="bg-gray-50">
                <TableCell colSpan={3}></TableCell>
                <TableCell className="text-right font-medium text-red-600">Discount</TableCell>
                <TableCell className="text-right font-bold text-red-600">
                  -{formatCurrency(data.calculation.discount)}
                </TableCell>
              </TableRow>
            )}
            <TableRow className="bg-gray-100">
              <TableCell colSpan={3}></TableCell>
              <TableCell className="text-right font-medium">Total</TableCell>
              <TableCell className="text-right font-bold">
                {formatCurrency(data.calculation.total)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>

        {data.payments.length > 0 && (
          <>
            <h4 className="mb-2 mt-4 font-semibold">Payments</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>By</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.payments.map((p) => (
                  <TableRow key={`payment-${p.date}-${p.method}`}>
                    <TableCell>{formatDate(p.date)}</TableCell>
                    <TableCell>{p.method}</TableCell>
                    <TableCell>{p.createdBy}</TableCell>
                    <TableCell className="text-right text-green-600">
                      {formatCurrency(p.amount)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </>
    );
  };

  const renderVendorContent = () => {
    const data = vendorQuery.data;
    if (!data) return null;

    return (
      <>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-gray-50 p-3">
            <p className="text-sm text-gray-500">Current Balance Owed</p>
            <p className="text-2xl font-bold">{formatCurrency(data.currentBalance)}</p>
          </div>
          <div className="rounded-lg bg-blue-50 p-3">
            <p className="text-sm text-blue-600">Formula</p>
            <p className="text-sm font-mono">{data.formula}</p>
          </div>
        </div>

        <div className="mb-2 flex items-center justify-between text-sm text-gray-500">
          <span>
            Total Bills: {formatCurrency(data.summary.totalBills)} | 
            Total Payments: {formatCurrency(data.summary.totalPayments)}
          </span>
          <span>{data.totalTransactions} transactions</span>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Reference</TableHead>
              <TableHead>By</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right">Balance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.transactions.map((t) => (
              <TableRow key={`vtx-${t.date}-${t.reference}`}>
                <TableCell>{formatDate(t.date)}</TableCell>
                <TableCell>
                  <Badge variant={t.type === "BILL" ? "default" : "secondary"}>
                    {t.type}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono text-sm">{t.reference}</TableCell>
                <TableCell>{t.createdBy}</TableCell>
                <TableCell className={`text-right ${t.amount >= 0 ? "text-red-600" : "text-green-600"}`}>
                  {t.amount >= 0 ? "+" : ""}{formatCurrency(t.amount)}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(t.runningBalance)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </>
    );
  };

  const isLoading =
    clientTabQuery.isLoading ||
    inventoryQuery.isLoading ||
    orderQuery.isLoading ||
    vendorQuery.isLoading;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-blue-600" />
            {getTitle()}
          </DialogTitle>
        </DialogHeader>

        {type !== "ORDER" && (
          <div className="flex items-center gap-4 mb-4">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="7d">Last 7 Days</SelectItem>
                <SelectItem value="30d">Last 30 Days</SelectItem>
                <SelectItem value="90d">Last 90 Days</SelectItem>
                <SelectItem value="1y">Last Year</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">
            <StatsSkeleton count={3} />
            <TableSkeleton rows={5} columns={5} />
          </div>
        ) : (
          <>
            {type === "CLIENT_TAB" && renderClientTabContent()}
            {type === "INVENTORY" && renderInventoryContent()}
            {type === "ORDER" && renderOrderContent()}
            {type === "VENDOR" && renderVendorContent()}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

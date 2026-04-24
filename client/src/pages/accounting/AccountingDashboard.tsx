import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowRight,
  AlertTriangle,
  Users,
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
} from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import {
  StatusBadge,
  AgingBadge,
  PayVendorModal,
  ReconciliationSummary,
} from "@/components/accounting";
import { GLReversalViewer } from "@/components/accounting/GLReversalViewer";
import { DataCardSection } from "@/components/data-cards";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/dateFormat";
import { formatInvoiceNumberForDisplay } from "@/lib/invoiceNumber";
import { usePermissions } from "@/hooks/usePermissions";
import { FreshnessBadge } from "@/components/ui/freshness-badge";

const OVERDUE_ALERT_THRESHOLD = 25;

interface OverdueInvoice {
  id: number;
  invoiceNumber: string;
  customerName?: string | null;
  customerId?: number | null;
  customerEmail?: string | null;
  customerPhone?: string | null;
  dueDate?: string | Date | null;
  daysOverdue: number;
  amountDue: string | number;
}

interface OverdueBill {
  id: number;
  billNumber: string;
  vendorName?: string | null;
  vendorId?: number | null;
  dueDate?: string | Date | null;
  daysOverdue: number;
  amountDue: string | number;
}

interface ExpenseBreakdownItem {
  categoryId: number;
  categoryName: string;
  totalAmount: string | number;
}

interface RecentInvoice {
  id: number;
  invoiceNumber: string;
  invoiceDate?: string | Date | null;
  totalAmount: string | number;
  status: string;
}

interface RecentBill {
  id: number;
  billNumber: string;
  billDate?: string | Date | null;
  totalAmount: string | number;
  status: string;
}

interface RecentPayment {
  id: number;
  paymentNumber: string;
  paymentDate?: string | Date | null;
  amount: string | number;
  paymentType: string;
}

export default function AccountingDashboard({
  embedded,
}: { embedded?: boolean } = {}) {
  // WS-002: Quick Action Modal State
  const [payVendorOpen, setPayVendorOpen] = useState(false);
  const utils = trpc.useUtils();
  
  // TER-1229: Check if user has accounting permissions for reconciliation view
  const { hasPermission } = usePermissions();

  // Fetch dashboard data
  // BUG-092 fix: Add error handling to prevent widgets stuck on "Loading..."
  const {
    data: arAging,
    isLoading: arAgingLoading,
    error: arAgingError,
  } = trpc.accounting.invoices.getARAging.useQuery(undefined, {
    retry: 2,
    retryDelay: 1000,
  });
  const {
    data: apAging,
    isLoading: apAgingLoading,
    error: apAgingError,
  } = trpc.accounting.bills.getAPAging.useQuery(undefined, {
    retry: 2,
    retryDelay: 1000,
  });
  const { data: recentInvoices } = trpc.accounting.invoices.list.useQuery({});
  const { data: recentBills } = trpc.accounting.bills.list.useQuery({});
  const { data: recentPayments } = trpc.accounting.payments.list.useQuery({});
  const { data: expenseBreakdown } =
    trpc.accounting.expenses.getBreakdownByCategory.useQuery({});

  // Wave 5C: New AR/AP Dashboard endpoints
  // BUG-092 fix: Add error/loading tracking
  const arSummaryQuery = trpc.accounting.arApDashboard.getARSummary.useQuery(
    undefined,
    {
      retry: 2,
      retryDelay: 1000,
    }
  );
  const { data: arSummary } = arSummaryQuery;
  const { data: apSummary } =
    trpc.accounting.arApDashboard.getAPSummary.useQuery(undefined, {
      retry: 2,
      retryDelay: 1000,
    });
  const { data: overdueInvoices } =
    trpc.accounting.arApDashboard.getOverdueInvoices.useQuery({ limit: 5 });
  const { data: overdueBills } =
    trpc.accounting.arApDashboard.getOverdueBills.useQuery({ limit: 5 });

  const checkOverdueMutation = trpc.invoices.checkOverdue.useMutation({
    onSuccess: async result => {
      await Promise.all([
        utils.accounting.arApDashboard.getOverdueInvoices.invalidate(),
        utils.accounting.arApDashboard.getOverdueBills.invalidate(),
        utils.accounting.invoices.getARAging.invalidate(),
        utils.accounting.invoices.list.invalidate(),
      ]);
      toast.success(
        `Overdue check complete. Updated ${result.overdueCount} invoice(s).`
      );
    },
    onError: err => {
      toast.error(err.message || "Failed to check overdue invoices");
    },
  });

  const formatCurrency = (amount: string | number | undefined) => {
    if (amount === undefined) return "$0.00";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  // Calculate totals - extract from paginated response objects { items: [], pagination: { total } }
  const invoiceList = recentInvoices?.items ?? [];
  const billList = recentBills?.items ?? [];
  // Get recent items (last 5)
  const recentInvoicesList = invoiceList.slice(0, 5);
  const recentBillsList = billList.slice(0, 5);
  const recentPaymentsList = (recentPayments?.items ?? []).slice(0, 5);
  const overdueInvoiceCount = overdueInvoices?.pagination?.total || 0;
  const overdueBillCount = overdueBills?.pagination?.total || 0;

  const navigateTo = (path: string) => {
    window.location.href = path;
  };

  return (
    <div className="flex flex-col gap-4 p-3" data-testid="accounting-dashboard">
      {!embedded && <BackButton label="Back to Accounting" to="/accounting" />}
      <Card className="overflow-hidden border-slate-200 bg-gradient-to-br from-slate-50 via-background to-amber-50/35 shadow-sm">
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className="w-fit border-slate-300 bg-white/80 text-slate-700"
                >
                  Finance control center
                </Badge>
                <FreshnessBadge
                  queryResult={arSummaryQuery}
                  cadence="live"
                />
              </div>
              <div className="space-y-1">
                <h1 className="text-xl font-semibold tracking-tight">
                  Accounting Dashboard
                </h1>
                <p className="max-w-2xl text-sm text-muted-foreground">
                  Start with the cash-moving work, then drop into invoices,
                  bills, and ledger analysis only when you need it.
                </p>
              </div>
            </div>
            {/* TER-1295: Single primary action per header region. "Pay
                Supplier" is the page-level primary task (not a destructive
                operation), so it uses the default primary variant. The
                destructive variant is reserved for the overdue-alert
                escalation path below. */}
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => setPayVendorOpen(true)}>
                Pay Supplier
              </Button>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-emerald-200 bg-white/90 p-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Receivables
              </p>
              <p className="mt-2 text-2xl font-semibold text-emerald-700">
                {formatCurrency(arSummary?.totalAR)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className={overdueInvoiceCount > 0 ? "text-destructive font-bold" : ""}>
                  {overdueInvoiceCount} overdue invoice
                  {overdueInvoiceCount === 1 ? "" : "s"}
                </span>{" "}
                ready for follow-up
              </p>
            </div>
            <div className="rounded-xl border border-red-200 bg-white/90 p-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Payables
              </p>
              <p className="mt-2 text-2xl font-semibold text-destructive">
                {formatCurrency(apSummary?.totalAP)}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                <span className={overdueBillCount > 0 ? "text-destructive font-bold" : ""}>
                  {overdueBillCount} overdue bill
                  {overdueBillCount === 1 ? "" : "s"}
                </span>{" "}
                need attention
              </p>
            </div>
            {/* TER-1327: Replaced "Queue pressure" UI-artifact stat
                (recentInvoicesList.length + recentBillsList.length +
                recentPaymentsList.length) with a real finance signal — the
                combined count of overdue invoices and bills that need
                follow-up. Uses already-fetched overdueInvoices/overdueBills
                pagination totals; no new tRPC calls. */}
            <div className="rounded-xl border border-slate-200 bg-white/90 p-3 shadow-sm">
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                Items needing attention
              </p>
              <p
                className={`mt-2 text-2xl font-semibold ${
                  overdueInvoiceCount + overdueBillCount > 0
                    ? "text-destructive"
                    : "text-slate-900"
                }`}
              >
                {overdueInvoiceCount + overdueBillCount}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Overdue invoices and bills requiring follow-up.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TER-1229: Reconciliation summary for Accountant role users */}
      {hasPermission("accounting:manage") && <ReconciliationSummary />}

      {overdueInvoiceCount > OVERDUE_ALERT_THRESHOLD && (
        <Card className="border-red-200 bg-destructive/10/70 shadow-sm">
          <CardContent className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm font-semibold text-destructive">
                  {overdueInvoiceCount} overdue invoices need attention
                </p>
                <p className="text-sm text-destructive/80">
                  The overdue queue is above the alert threshold of{" "}
                  {OVERDUE_ALERT_THRESHOLD}. Work oldest items first or open the
                  invoice queue now.
                </p>
              </div>
            </div>
            <Button
              variant="destructive"
              onClick={() =>
                navigateTo("/accounting?tab=invoices&status=OVERDUE")
              }
            >
              Open Overdue Queue
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-3 xl:grid-cols-[1.5fr_1fr]">
        <Card className="border-green-200 bg-[var(--success-bg)]/60 shadow-sm">
          <CardHeader className="space-y-2">
            <Badge
              variant="outline"
              className="w-fit border-green-300 bg-white/80 text-[var(--success)]"
            >
              Record Payment
            </Badge>
            <div className="grid gap-2 lg:grid-cols-2">
              <div className="rounded-md border border-green-200 bg-background/90 p-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm">Record payment</CardTitle>
                    <CardDescription className="mt-1">
                      Record incoming cash against open invoices first.
                    </CardDescription>
                  </div>
                  <ArrowDownCircle className="h-5 w-5 text-[var(--success)]" />
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-lg font-semibold text-emerald-700">
                    {formatCurrency(arSummary?.totalAR)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className={overdueInvoiceCount > 0 ? "text-destructive font-bold" : ""}>
                      {overdueInvoiceCount} overdue invoice
                      {overdueInvoiceCount === 1 ? "" : "s"}
                    </span>{" "}
                    ready for follow-up
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-green-200 bg-[var(--success-bg)] text-[var(--success)]"
                  >
                    Primary action lives above
                  </Badge>
                  <Button
                    variant="outline"
                    onClick={() => navigateTo("/accounting?tab=invoices")}
                  >
                    Review invoices
                  </Button>
                </div>
              </div>

              <div className="rounded-md border border-amber-200 bg-background/90 p-2.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-sm">Pay supplier</CardTitle>
                    <CardDescription className="mt-1">
                      Clear open bills and log outgoing payments without leaving
                      finance.
                    </CardDescription>
                  </div>
                  <ArrowUpCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="mt-2 space-y-1">
                  <p className="text-lg font-semibold text-destructive">
                    {formatCurrency(apSummary?.totalAP)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    <span className={overdueBillCount > 0 ? "text-destructive font-bold" : ""}>
                      {overdueBillCount} overdue bill
                      {overdueBillCount === 1 ? "" : "s"}
                    </span>{" "}
                    need attention
                  </p>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-amber-200 bg-amber-50 text-amber-700"
                  >
                    Primary action lives above
                  </Badge>
                  <Button
                    variant="outline"
                    onClick={() => navigateTo("/accounting?tab=bills")}
                  >
                    Review bills
                  </Button>
                </div>
              </div>
            </div>
          </CardHeader>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="space-y-2">
            <CardTitle>More finance tasks</CardTitle>
            <CardDescription>
              Use these after the payment queues are under control.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 sm:grid-cols-2">
            <Button
              variant="outline"
              className="justify-between"
              onClick={() => navigateTo("/accounting?tab=payments")}
            >
              Open payments
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="justify-between"
              onClick={() => navigateTo("/accounting?tab=general-ledger")}
            >
              Post journal entry
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="justify-between"
              onClick={() => navigateTo("/accounting?tab=expenses")}
            >
              Record expense
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              className="justify-between"
              onClick={() => navigateTo("/accounting?tab=bank-transactions")}
            >
              Review bank activity
              <ArrowRight className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* AR/AP Aging - BUG-092 fix: Proper loading/error states */}
      <div className="grid gap-2 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>AR Aging</CardTitle>
          </CardHeader>
          <CardContent>
            {arAgingError ? (
              <p className="text-sm text-destructive">
                Unable to load AR aging data
              </p>
            ) : arAgingLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : arAging ? (
              <div className="flex flex-wrap gap-3">
                <AgingBadge
                  bucket="current"
                  amount={arAging.current}
                  count={arAging.currentCount}
                />
                <AgingBadge
                  bucket="30"
                  amount={arAging.days30}
                  count={arAging.days30Count}
                />
                <AgingBadge
                  bucket="60"
                  amount={arAging.days60}
                  count={arAging.days60Count}
                />
                <AgingBadge
                  bucket="90"
                  amount={arAging.days90}
                  count={arAging.days90Count}
                />
                <AgingBadge
                  bucket="90+"
                  amount={arAging.days90Plus}
                  count={arAging.days90PlusCount}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No AR data available
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AP Aging</CardTitle>
          </CardHeader>
          <CardContent>
            {apAgingError ? (
              <p className="text-sm text-destructive">
                Unable to load AP aging data
              </p>
            ) : apAgingLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : apAging ? (
              <div className="flex flex-wrap gap-3">
                <AgingBadge
                  bucket="current"
                  amount={apAging.current}
                  count={apAging.currentCount}
                />
                <AgingBadge
                  bucket="30"
                  amount={apAging.days30}
                  count={apAging.days30Count}
                />
                <AgingBadge
                  bucket="60"
                  amount={apAging.days60}
                  count={apAging.days60Count}
                />
                <AgingBadge
                  bucket="90"
                  amount={apAging.days90}
                  count={apAging.days90Count}
                />
                <AgingBadge
                  bucket="90+"
                  amount={apAging.days90Plus}
                  count={apAging.days90PlusCount}
                />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No AP data available
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Wave 5C: Top Debtors & Overdue Items */}
      <div className="grid gap-2 md:grid-cols-2">
        {/* Top Debtors */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Debtors
            </CardTitle>
            <CardDescription>
              Clients with highest outstanding balances
            </CardDescription>
          </CardHeader>
          <CardContent>
            {arSummary?.topDebtors && arSummary.topDebtors.length > 0 ? (
              <div className="space-y-3">
                {arSummary.topDebtors.slice(0, 5).map((debtor, index) => (
                  <div
                    key={debtor.clientId}
                    className="flex items-start justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <div className="space-y-1">
                        <span className="block text-sm font-medium truncate max-w-[150px]">
                          {debtor.clientName}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          Current{" "}
                          {formatCurrency(debtor.agingBreakdown.current)} · 30{" "}
                          {formatCurrency(debtor.agingBreakdown.days30)} · 60{" "}
                          {formatCurrency(debtor.agingBreakdown.days60)} · 90{" "}
                          {formatCurrency(debtor.agingBreakdown.days90)} · 90+{" "}
                          {formatCurrency(debtor.agingBreakdown.days90Plus)}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm font-mono font-bold text-destructive">
                      {formatCurrency(debtor.totalOwed)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No outstanding balances
              </p>
            )}
          </CardContent>
        </Card>

        {/* Top Vendors Owed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Top Suppliers Owed
            </CardTitle>
            <CardDescription>
              Suppliers with highest outstanding payables
            </CardDescription>
          </CardHeader>
          <CardContent>
            {apSummary?.byVendor && apSummary.byVendor.length > 0 ? (
              <div className="space-y-3">
                {apSummary.byVendor.slice(0, 5).map((vendor, index) => (
                  <div
                    key={vendor.vendorId}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-medium truncate max-w-[150px]">
                        {vendor.vendorName}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-mono font-bold text-destructive">
                        {formatCurrency(vendor.totalOwed)}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {vendor.billCount} bill
                        {vendor.billCount !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No outstanding payables
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Overdue Items */}
      <Tabs defaultValue="overdue-invoices" className="w-full">
        <div className="flex items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger
              value="overdue-invoices"
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4 text-destructive" />
              Overdue Invoices ({overdueInvoices?.pagination?.total || 0})
            </TabsTrigger>
            <TabsTrigger
              value="overdue-bills"
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4 text-[var(--warning)]" />
              Overdue Bills ({overdueBills?.pagination?.total || 0})
            </TabsTrigger>
          </TabsList>
          <Button
            variant="outline"
            size="sm"
            data-testid="check-overdue-btn"
            onClick={() => checkOverdueMutation.mutate()}
            disabled={checkOverdueMutation.isPending}
          >
            {checkOverdueMutation.isPending ? "Checking..." : "Check Overdue"}
          </Button>
        </div>
        <TabsContent value="overdue-invoices">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              {overdueInvoices?.items && overdueInvoices.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Days Overdue</TableHead>
                      <TableHead className="text-right">Amount Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueInvoices.items.map((invoice: OverdueInvoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono">
                          {formatInvoiceNumberForDisplay(invoice.invoiceNumber)}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">
                              {invoice.customerName ||
                                `Client #${invoice.customerId}`}
                            </span>
                            {invoice.customerPhone || invoice.customerEmail ? (
                              <div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
                                {invoice.customerPhone ? (
                                  <a
                                    href={`tel:${invoice.customerPhone}`}
                                    className="text-primary hover:underline"
                                  >
                                    {invoice.customerPhone}
                                  </a>
                                ) : null}
                                {invoice.customerPhone &&
                                invoice.customerEmail ? (
                                  <span>|</span>
                                ) : null}
                                {invoice.customerEmail ? (
                                  <a
                                    href={`mailto:${invoice.customerEmail}`}
                                    className="max-w-[220px] truncate text-primary hover:underline"
                                  >
                                    {invoice.customerEmail}
                                  </a>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                No contact on file
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{formatDate(invoice.dueDate)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              invoice.daysOverdue > 60
                                ? "destructive"
                                : invoice.daysOverdue > 30
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {invoice.daysOverdue} days
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-destructive">
                          {formatCurrency(invoice.amountDue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No overdue invoices
                </p>
              )}
              {overdueInvoices?.pagination?.total &&
                overdueInvoices.pagination.total > 5 && (
                  <div className="mt-2 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        (window.location.href =
                          "/accounting?tab=invoices&status=OVERDUE")
                      }
                    >
                      View All {overdueInvoices.pagination.total} Overdue
                      Invoices
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="overdue-bills">
          <Card className="shadow-sm">
            <CardContent className="pt-6">
              {overdueBills?.items && overdueBills.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Bill #</TableHead>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Days Overdue</TableHead>
                      <TableHead className="text-right">Amount Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueBills.items.map((bill: OverdueBill) => (
                      <TableRow key={bill.id}>
                        <TableCell className="font-mono">
                          {bill.billNumber}
                        </TableCell>
                        <TableCell>
                          {bill.vendorName || `Supplier #${bill.vendorId}`}
                        </TableCell>
                        <TableCell>{formatDate(bill.dueDate)}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              bill.daysOverdue > 60
                                ? "destructive"
                                : bill.daysOverdue > 30
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {bill.daysOverdue} days
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-destructive">
                          {formatCurrency(bill.amountDue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No overdue bills
                </p>
              )}
              {overdueBills?.pagination?.total &&
                overdueBills.pagination.total > 5 && (
                  <div className="mt-2 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        (window.location.href =
                          "/accounting?tab=bills&status=OVERDUE")
                      }
                    >
                      View All {overdueBills.pagination.total} Overdue Bills
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Tabs defaultValue="queue-focus" className="w-full">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Finance detail</h2>
            <p className="text-sm text-muted-foreground">
              Keep the dashboard focused on payment work by default. Open
              analysis only when you need to inspect deeper finance detail.
            </p>
          </div>
          <TabsList>
            <TabsTrigger value="queue-focus">Keep queues in focus</TabsTrigger>
            <TabsTrigger value="analysis">Open analysis</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="queue-focus">
          <Card className="border-dashed shadow-sm">
            <CardHeader>
              <CardTitle>Queue-first landing</CardTitle>
              <CardDescription>
                The payment queues, overdue work, and recent activity stay
                visible above. Open analysis only when you need dashboard
                metrics, expense mix, or GL corrections.
              </CardDescription>
            </CardHeader>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-3">
          <DataCardSection moduleId="accounting" />

          {expenseBreakdown &&
            Array.isArray(expenseBreakdown) &&
            expenseBreakdown.length > 0 && (
              <Card className="shadow-sm">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Expense Breakdown by Category</CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      (window.location.href = "/accounting/expenses")
                    }
                  >
                    View All
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                    {expenseBreakdown
                      .slice(0, 6)
                      .map((item: ExpenseBreakdownItem) => (
                        <div
                          key={item.categoryId}
                          className="flex items-center justify-between p-3 border rounded-lg"
                        >
                          <span className="text-sm font-medium">
                            {item.categoryName}
                          </span>
                          <span className="text-sm font-mono font-bold">
                            {formatCurrency(item.totalAmount)}
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            )}

          <GLReversalViewer limit={25} />
        </TabsContent>
      </Tabs>

      {/* WS-002: Quick Action Modals */}
      <PayVendorModal open={payVendorOpen} onOpenChange={setPayVendorOpen} />

      {/* Recent Activity */}
      <div className="grid gap-2 md:grid-cols-3">
        {/* Recent Invoices */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (window.location.href = "/accounting/invoices")}
            >
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentInvoicesList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent invoices
              </p>
            ) : (
              <div className="space-y-3">
                {recentInvoicesList.map((invoice: RecentInvoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="font-mono font-medium">
                        {formatInvoiceNumberForDisplay(invoice.invoiceNumber)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(invoice.invoiceDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono">
                        {formatCurrency(invoice.totalAmount)}
                      </p>
                      <StatusBadge status={invoice.status} type="invoice" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Bills */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Bills</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (window.location.href = "/accounting/bills")}
            >
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentBillsList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent bills</p>
            ) : (
              <div className="space-y-3">
                {recentBillsList.map((bill: RecentBill) => (
                  <div
                    key={bill.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="font-mono font-medium">{bill.billNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(bill.billDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono">
                        {formatCurrency(bill.totalAmount)}
                      </p>
                      <StatusBadge status={bill.status} type="bill" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Payments</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (window.location.href = "/accounting/payments")}
            >
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentPaymentsList.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No recent payments
              </p>
            ) : (
              <div className="space-y-3">
                {recentPaymentsList.map((payment: RecentPayment) => (
                  <div
                    key={payment.id}
                    className="flex items-center justify-between text-sm"
                  >
                    <div>
                      <p className="font-mono font-medium">
                        {payment.paymentNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(payment.paymentDate)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono">
                        {formatCurrency(payment.amount)}
                      </p>
                      <StatusBadge
                        status={payment.paymentType}
                        type="payment"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

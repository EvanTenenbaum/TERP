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
  ReceivePaymentModal,
  PayVendorModal,
} from "@/components/accounting";
import { GLReversalViewer } from "@/components/accounting/GLReversalViewer";
import { DataCardSection } from "@/components/data-cards";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/dateFormat";

interface OverdueInvoice {
  id: number;
  invoiceNumber: string;
  customerName?: string | null;
  customerId?: number | null;
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
  // WS-001 & WS-002: Quick Action Modal State
  const [receivePaymentOpen, setReceivePaymentOpen] = useState(false);
  const [payVendorOpen, setPayVendorOpen] = useState(false);
  const utils = trpc.useUtils();

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
  const { data: arSummary } =
    trpc.accounting.arApDashboard.getARSummary.useQuery(undefined, {
      retry: 2,
      retryDelay: 1000,
    });
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
    <div className="flex flex-col gap-6 p-6" data-testid="accounting-dashboard">
      {!embedded && <BackButton label="Back to Accounting" to="/accounting" />}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">
          Accounting Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Start with the two finance actions that move cash today, then work
          through invoices, bills, and ledger detail.
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Card className="border-green-200 bg-green-50/60">
          <CardHeader className="space-y-2">
            <Badge
              variant="outline"
              className="w-fit border-green-300 bg-white/80 text-green-700"
            >
              Start here
            </Badge>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-xl border border-green-200 bg-background/90 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">Receive payment</CardTitle>
                    <CardDescription className="mt-1">
                      Record incoming cash against open invoices first.
                    </CardDescription>
                  </div>
                  <ArrowDownCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="mt-4 space-y-1">
                  <p className="text-2xl font-semibold text-green-700">
                    {formatCurrency(arSummary?.totalAR)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {overdueInvoiceCount} overdue invoice
                    {overdueInvoiceCount === 1 ? "" : "s"} ready for follow-up
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    className="bg-green-600 hover:bg-green-700"
                    onClick={() => setReceivePaymentOpen(true)}
                  >
                    Receive Payment
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigateTo("/accounting?tab=invoices")}
                  >
                    Review invoices
                  </Button>
                </div>
              </div>

              <div className="rounded-xl border border-amber-200 bg-background/90 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-xl">Pay supplier</CardTitle>
                    <CardDescription className="mt-1">
                      Clear open bills and log outgoing payments without leaving
                      finance.
                    </CardDescription>
                  </div>
                  <ArrowUpCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="mt-4 space-y-1">
                  <p className="text-2xl font-semibold text-amber-700">
                    {formatCurrency(apSummary?.totalAP)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {overdueBillCount} overdue bill
                    {overdueBillCount === 1 ? "" : "s"} need attention
                  </p>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button
                    variant="destructive"
                    onClick={() => setPayVendorOpen(true)}
                  >
                    Pay Supplier
                  </Button>
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

        <Card>
          <CardHeader>
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
      <div className="grid gap-4 md:grid-cols-2">
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
                <AgingBadge bucket="current" amount={arAging.current} />
                <AgingBadge bucket="30" amount={arAging.days30} />
                <AgingBadge bucket="60" amount={arAging.days60} />
                <AgingBadge bucket="90" amount={arAging.days90} />
                <AgingBadge bucket="90+" amount={arAging.days90Plus} />
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
                <AgingBadge bucket="current" amount={apAging.current} />
                <AgingBadge bucket="30" amount={apAging.days30} />
                <AgingBadge bucket="60" amount={apAging.days60} />
                <AgingBadge bucket="90" amount={apAging.days90} />
                <AgingBadge bucket="90+" amount={apAging.days90Plus} />
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
      <div className="grid gap-4 md:grid-cols-2">
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
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-6">
                        #{index + 1}
                      </span>
                      <span className="text-sm font-medium truncate max-w-[150px]">
                        {debtor.clientName}
                      </span>
                    </div>
                    <span className="text-sm font-mono font-bold text-red-600">
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
                      <span className="text-sm font-mono font-bold text-orange-600">
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
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Overdue Invoices ({overdueInvoices?.pagination?.total || 0})
            </TabsTrigger>
            <TabsTrigger
              value="overdue-bills"
              className="flex items-center gap-2"
            >
              <AlertTriangle className="h-4 w-4 text-orange-500" />
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
          <Card>
            <CardContent className="pt-6">
              {overdueInvoices?.items && overdueInvoices.items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Days Overdue</TableHead>
                      <TableHead className="text-right">Amount Due</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {overdueInvoices.items.map((invoice: OverdueInvoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-mono">
                          {invoice.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          {invoice.customerName ||
                            `Client #${invoice.customerId}`}
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
                        <TableCell className="text-right font-mono font-bold text-red-600">
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
                  <div className="mt-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        (window.location.href =
                          "/accounting/invoices?status=OVERDUE")
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
          <Card>
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
                        <TableCell className="text-right font-mono font-bold text-orange-600">
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
                  <div className="mt-4 text-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        (window.location.href =
                          "/accounting/bills?status=OVERDUE")
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
          <Card className="border-dashed">
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

        <TabsContent value="analysis" className="space-y-6">
          <DataCardSection moduleId="accounting" />

          {expenseBreakdown &&
            Array.isArray(expenseBreakdown) &&
            expenseBreakdown.length > 0 && (
              <Card>
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

      {/* WS-001 & WS-002: Quick Action Modals */}
      <ReceivePaymentModal
        open={receivePaymentOpen}
        onOpenChange={setReceivePaymentOpen}
      />
      <PayVendorModal open={payVendorOpen} onOpenChange={setPayVendorOpen} />

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent Invoices */}
        <Card>
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
                        {invoice.invoiceNumber}
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
        <Card>
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
        <Card>
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

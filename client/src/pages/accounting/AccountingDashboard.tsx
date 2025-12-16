import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Wallet,
  FileText,
  Receipt,
  Plus,
  ArrowRight
} from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { format } from "date-fns";
import { StatusBadge, AgingBadge } from "@/components/accounting";
import { DataCardSection } from "@/components/data-cards";


export default function AccountingDashboard() {

  // Fetch dashboard data
  const { data: totalCash } = trpc.accounting.bankAccounts.getTotalCashBalance.useQuery();
  const { data: arAging } = trpc.accounting.invoices.getARAging.useQuery();
  const { data: apAging } = trpc.accounting.bills.getAPAging.useQuery();
  const { data: recentInvoices } = trpc.accounting.invoices.list.useQuery({});
  const { data: recentBills } = trpc.accounting.bills.list.useQuery({});
  const { data: recentPayments } = trpc.accounting.payments.list.useQuery({});
  const { data: expenseBreakdown } = trpc.accounting.expenses.getBreakdownByCategory.useQuery({});
  const { data: outstandingReceivables } = trpc.accounting.invoices.getOutstandingReceivables.useQuery();
  const { data: outstandingPayables } = trpc.accounting.bills.getOutstandingPayables.useQuery();

  const formatCurrency = (amount: string | number | undefined) => {
    if (amount === undefined) return "$0.00";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const formatDate = (dateStr: Date | string) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return format(date, "MMM dd, yyyy");
  };

  // Calculate totals - extract from paginated response objects { invoices: [], total: number }
  const invoiceList = recentInvoices?.invoices ?? [];
  const billList = recentBills?.bills ?? [];
  const receivablesList = outstandingReceivables?.invoices ?? [];
  const payablesList = outstandingPayables?.bills ?? [];

  const totalReceivables = receivablesList.reduce((sum: number, inv: any) => 
    sum + parseFloat(inv.amountDue), 0
  );
  const totalPayables = payablesList.reduce((sum: number, bill: any) => 
    sum + parseFloat(bill.amountDue), 0
  );

  // Get recent items (last 5)
  const recentInvoicesList = invoiceList.slice(0, 5);
  const recentBillsList = billList.slice(0, 5);
  const recentPaymentsList = (recentPayments?.payments ?? []).slice(0, 5);

  return (
    <div className="flex flex-col gap-6 p-6">
      <BackButton label="Back to Accounting" to="/accounting" />
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Accounting Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of your financial health and key metrics
        </p>
      </div>

      {/* Financial Overview */}
      <DataCardSection moduleId="accounting" />

      {/* AR/AP Aging */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>AR Aging</CardTitle>
          </CardHeader>
          <CardContent>
            {arAging ? (
              <div className="flex flex-wrap gap-3">
                <AgingBadge bucket="current" amount={arAging.current} />
                <AgingBadge bucket="30" amount={arAging.days30} />
                <AgingBadge bucket="60" amount={arAging.days60} />
                <AgingBadge bucket="90" amount={arAging.days90} />
                <AgingBadge bucket="90+" amount={arAging.days90Plus} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading...</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>AP Aging</CardTitle>
          </CardHeader>
          <CardContent>
            {apAging ? (
              <div className="flex flex-wrap gap-3">
                <AgingBadge bucket="current" amount={apAging.current} />
                <AgingBadge bucket="30" amount={apAging.days30} />
                <AgingBadge bucket="60" amount={apAging.days60} />
                <AgingBadge bucket="90" amount={apAging.days90} />
                <AgingBadge bucket="90+" amount={apAging.days90Plus} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Loading...</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown */}
      {expenseBreakdown && Array.isArray(expenseBreakdown) && expenseBreakdown.length > 0 && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Expense Breakdown by Category</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => window.location.href = "/accounting/expenses"}>
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {expenseBreakdown.slice(0, 6).map((item: any) => (
                <div key={item.categoryId} className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">{item.categoryName}</span>
                  <span className="text-sm font-mono font-bold">{formatCurrency(item.totalAmount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => window.location.href = "/accounting/general-ledger"}
            >
              <Plus className="h-5 w-5" />
              <span>Post Journal Entry</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => window.location.href = "/accounting/invoices"}
            >
              <FileText className="h-5 w-5" />
              <span>Create Invoice</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => window.location.href = "/accounting/bills"}
            >
              <Receipt className="h-5 w-5" />
              <span>Create Bill</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-20 flex-col gap-2"
              onClick={() => window.location.href = "/accounting/expenses"}
            >
              <Receipt className="h-5 w-5" />
              <span>Record Expense</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Recent Invoices */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent Invoices</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => window.location.href = "/accounting/invoices"}>
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentInvoicesList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent invoices</p>
            ) : (
              <div className="space-y-3">
                {recentInvoicesList.map((invoice: any) => (
                  <div key={invoice.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-mono font-medium">{invoice.invoiceNumber}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(invoice.invoiceDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono">{formatCurrency(invoice.totalAmount)}</p>
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
            <Button variant="ghost" size="sm" onClick={() => window.location.href = "/accounting/bills"}>
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentBillsList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent bills</p>
            ) : (
              <div className="space-y-3">
                {recentBillsList.map((bill: any) => (
                  <div key={bill.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-mono font-medium">{bill.billNumber}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(bill.billDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono">{formatCurrency(bill.totalAmount)}</p>
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
            <Button variant="ghost" size="sm" onClick={() => window.location.href = "/accounting/payments"}>
              View All
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {recentPaymentsList.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent payments</p>
            ) : (
              <div className="space-y-3">
                {recentPaymentsList.map((payment: any) => (
                  <div key={payment.id} className="flex items-center justify-between text-sm">
                    <div>
                      <p className="font-mono font-medium">{payment.paymentNumber}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(payment.paymentDate)}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono">{formatCurrency(payment.amount)}</p>
                      <StatusBadge status={payment.paymentType} type="payment" />
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


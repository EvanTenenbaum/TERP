import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDate } from "@/lib/dateFormat";

export function ReconciliationSummary() {
  const { data: reconciliationData, isLoading } =
    trpc.accounting.arApDashboard.getReconciliationSummary.useQuery();

  const formatCurrency = (amount: number | string | undefined) => {
    if (amount === undefined) return "$0.00";
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  if (isLoading) {
    return (
      <Card className="border-blue-200 bg-blue-50/60 shadow-sm">
        <CardHeader>
          <Badge
            variant="outline"
            className="w-fit border-blue-300 bg-white/80 text-blue-700"
          >
            Reconciliation State
          </Badge>
          <CardTitle>Loading...</CardTitle>
        </CardHeader>
      </Card>
    );
  }

  if (!reconciliationData) {
    return null;
  }

  const totalUnrecordedPayments =
    (reconciliationData.unrecordedPayments.ar.count || 0) +
    (reconciliationData.unrecordedPayments.ap.count || 0);

  const needsAttentionCount =
    (reconciliationData.invoices30PlusOverdue.count || 0) +
    totalUnrecordedPayments;

  return (
    <Card className="border-blue-200 bg-blue-50/60 shadow-sm">
      <CardHeader className="space-y-2">
        <Badge
          variant="outline"
          className="w-fit border-blue-300 bg-white/80 text-blue-700"
        >
          Reconciliation State
        </Badge>
        <CardTitle>Accounting Reconciliation Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 md:grid-cols-3">
          {/* Outstanding Invoices */}
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Outstanding Invoices
            </p>
            <p className="mt-2 text-2xl font-semibold text-slate-900">
              {reconciliationData.outstandingInvoices.count}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {formatCurrency(
                reconciliationData.outstandingInvoices.totalAmount
              )}{" "}
              total receivables
            </p>
          </div>

          {/* Unrecorded Payments */}
          <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Unrecorded Payments
            </p>
            <p className="mt-2 text-2xl font-semibold text-orange-700">
              {totalUnrecordedPayments}
            </p>
            <div className="mt-1 space-y-0.5 text-sm text-muted-foreground">
              <p>
                AR: {reconciliationData.unrecordedPayments.ar.count} (
                {formatCurrency(
                  reconciliationData.unrecordedPayments.ar.totalAmount
                )}
                )
              </p>
              <p>
                AP: {reconciliationData.unrecordedPayments.ap.count} (
                {formatCurrency(
                  reconciliationData.unrecordedPayments.ap.totalAmount
                )}
                )
              </p>
            </div>
          </div>

          {/* Last Reconciled */}
          <div className="rounded-md border border-slate-200 bg-white p-3">
            <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Last Reconciled
            </p>
            <p className="mt-2 flex items-center gap-2 text-lg font-semibold text-slate-900">
              <Clock className="h-5 w-5 text-slate-500" />
              {reconciliationData.lastReconciledAt
                ? formatDate(reconciliationData.lastReconciledAt)
                : "Never"}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Most recent reconciliation
            </p>
          </div>
        </div>

        {/* Needs Attention Section */}
        {needsAttentionCount > 0 ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="mt-0.5 h-5 w-5 text-red-600" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-900">
                  {needsAttentionCount} item
                  {needsAttentionCount === 1 ? "" : "s"} need attention
                </p>
                <ul className="mt-2 space-y-1 text-sm text-red-800">
                  {reconciliationData.invoices30PlusOverdue.count > 0 && (
                    <li>
                      • {reconciliationData.invoices30PlusOverdue.count} invoice
                      {reconciliationData.invoices30PlusOverdue.count === 1
                        ? ""
                        : "s"}{" "}
                      overdue 30+ days (
                      {formatCurrency(
                        reconciliationData.invoices30PlusOverdue.totalAmount
                      )}
                      )
                    </li>
                  )}
                  {reconciliationData.unrecordedPayments.ar.count > 0 && (
                    <li>
                      • {reconciliationData.unrecordedPayments.ar.count} AR
                      payment
                      {reconciliationData.unrecordedPayments.ar.count === 1
                        ? ""
                        : "s"}{" "}
                      without matching invoice
                      {reconciliationData.unrecordedPayments.ar.count === 1
                        ? ""
                        : "s"}
                    </li>
                  )}
                  {reconciliationData.unrecordedPayments.ap.count > 0 && (
                    <li>
                      • {reconciliationData.unrecordedPayments.ap.count} AP
                      payment
                      {reconciliationData.unrecordedPayments.ap.count === 1
                        ? ""
                        : "s"}{" "}
                      without matching bill
                      {reconciliationData.unrecordedPayments.ap.count === 1
                        ? ""
                        : "s"}
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="rounded-md border border-green-200 bg-green-50 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <p className="text-sm font-semibold text-green-900">
                All reconciliation items are current
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

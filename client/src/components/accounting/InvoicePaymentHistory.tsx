/**
 * FEAT-007: Invoice Payment History Component
 *
 * Displays payment history for an invoice, showing all payments made against it.
 */

import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Calendar, User, CreditCard } from "lucide-react";
import { format } from "date-fns";

interface InvoicePaymentHistoryProps {
  invoiceId: number;
  className?: string;
}

export function InvoicePaymentHistory({
  invoiceId,
  className,
}: InvoicePaymentHistoryProps) {
  const { data: payments, isLoading } =
    trpc.payments.getInvoicePaymentHistory.useQuery({ invoiceId });

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "-";
    return format(new Date(date), "MMM dd, yyyy");
  };

  const getMethodBadge = (method: string) => {
    const variants: Record<string, "default" | "secondary" | "outline"> = {
      CASH: "default",
      CHECK: "secondary",
      WIRE: "outline",
      ACH: "outline",
      CREDIT_CARD: "secondary",
      DEBIT_CARD: "secondary",
      OTHER: "outline",
    };
    return (
      <Badge variant={variants[method] || "outline"} className="text-xs">
        {method.replace("_", " ")}
      </Badge>
    );
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!payments || payments.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4" />
            Payment History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No payments recorded for this invoice yet.
          </p>
        </CardContent>
      </Card>
    );
  }

  const totalPaid = payments.reduce(
    (sum, p) => sum + parseFloat(p.allocatedAmount || "0"),
    0
  );

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <DollarSign className="h-4 w-4" />
            Payment History
          </CardTitle>
          <Badge variant="secondary" className="font-medium">
            Total: {formatCurrency(totalPaid)}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Payment #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Method</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead>Recorded By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.allocationId}>
                <TableCell className="font-medium">
                  {payment.paymentNumber || "-"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm">
                    <Calendar className="h-3 w-3 text-muted-foreground" />
                    {formatDate(payment.paymentDate)}
                  </div>
                </TableCell>
                <TableCell>
                  {payment.paymentMethod
                    ? getMethodBadge(payment.paymentMethod)
                    : "-"}
                </TableCell>
                <TableCell className="text-right font-medium text-green-600">
                  {formatCurrency(payment.allocatedAmount)}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <User className="h-3 w-3" />
                    {payment.recordedBy}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {/* Notes section if any payment has notes */}
        {payments.some((p) => p.notes) && (
          <div className="mt-4 border-t pt-3">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              Notes:
            </p>
            {payments
              .filter((p) => p.notes)
              .map((p) => (
                <p key={p.allocationId} className="text-sm text-muted-foreground">
                  {p.paymentNumber}: {p.notes}
                </p>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

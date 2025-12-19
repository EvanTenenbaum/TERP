import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, CheckCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClientPaymentsTabProps {
  clientId: number;
}

export function ClientPaymentsTab({ clientId }: ClientPaymentsTabProps) {
  const [paymentSearch, setPaymentSearch] = useState("");

  // Fetch transactions
  const {
    data: transactions,
    isLoading: transactionsLoading,
  } = trpc.clients.transactions.list.useQuery({
    clientId,
  });

  // Format currency
  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  // Format date
  const formatDate = (date: string | Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get transaction type badge
  const getTransactionTypeBadge = (type: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      INVOICE: "default",
      PAYMENT: "default",
      QUOTE: "secondary",
      ORDER: "outline",
      REFUND: "destructive",
      CREDIT: "outline",
    };
    return <Badge variant={variants[type] || "outline"}>{type}</Badge>;
  };

  // Filter paid transactions for payment history
  const paidTransactions =
    transactions?.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (txn: any) => txn.paymentStatus === "PAID" && txn.paymentDate
    ) || [];

  // Filter by payment search
  const filteredPayments = paidTransactions.filter(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (txn: any) => {
      if (!paymentSearch) return true;
      return (
        txn.transactionNumber
          ?.toLowerCase()
          .includes(paymentSearch.toLowerCase()) ||
        txn.transactionType?.toLowerCase().includes(paymentSearch.toLowerCase())
      );
    }
  );

  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>
            All completed payments for this client
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search payments..."
            value={paymentSearch}
            onChange={e => setPaymentSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Payments Table */}
        {transactionsLoading ? (
          <div className="text-center py-8 text-muted-foreground">
            Loading payments...
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-lg font-medium">No payments found</p>
            <p className="text-sm mt-2">
              Payments will appear here once transactions are marked as
              paid
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction #</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Transaction Date</TableHead>
                  <TableHead>Payment Date</TableHead>
                  <TableHead className="text-right">
                    Amount Paid
                  </TableHead>
                  <TableHead className="text-right">
                    Transaction Amount
                  </TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {filteredPayments.map((txn: any) => (
                  <TableRow key={txn.id}>
                    <TableCell className="font-medium">
                      {txn.transactionNumber || "-"}
                    </TableCell>
                    <TableCell>
                      {getTransactionTypeBadge(txn.transactionType)}
                    </TableCell>
                    <TableCell>
                      {formatDate(txn.transactionDate)}
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatDate(txn.paymentDate)}
                    </TableCell>
                    <TableCell className="text-right font-medium text-green-600">
                      {formatCurrency(txn.paymentAmount || txn.amount)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(txn.amount)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-green-600 font-medium">
                          Paid
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

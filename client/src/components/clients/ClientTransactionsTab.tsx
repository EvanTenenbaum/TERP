import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface ClientTransactionsTabProps {
  clientId: number;
  clientTeriCode: string;
}

export function ClientTransactionsTab({ clientId, clientTeriCode }: ClientTransactionsTabProps) {
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [transactionSearch, setTransactionSearch] = useState("");

  // Fetch transactions
  const {
    data: transactions,
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = trpc.clients.transactions.list.useQuery({
    clientId,
    search: transactionSearch || undefined,
  });

  const createTransactionMutation =
    trpc.clients.transactions.create.useMutation({
      onSuccess: () => {
        refetchTransactions();
        setTransactionDialogOpen(false);
      },
    });

  const recordPaymentMutation =
    trpc.clients.transactions.recordPayment.useMutation();

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

  // Get payment status badge
  const getPaymentStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      PAID: "default",
      PENDING: "secondary",
      OVERDUE: "destructive",
      PARTIAL: "outline",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
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

  // Handle record payment
  const handleRecordPayment = async (
    transactionId: number,
    paymentAmount: number,
    paymentDate: Date
  ) => {
    await recordPaymentMutation.mutateAsync({
      transactionId,
      paymentAmount,
      paymentDate,
    });
    refetchTransactions();
    setPaymentDialogOpen(false);
    setSelectedTransaction(null);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <CardDescription>
                All transactions (invoices, quotes, orders, etc.)
              </CardDescription>
            </div>
            <Button onClick={() => setTransactionDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={transactionSearch}
              onChange={e => setTransactionSearch(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Transactions Table */}
          {transactionsLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading transactions...
            </div>
          ) : !transactions || transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-lg font-medium">No transactions found</p>
              <p className="text-sm mt-2">
                Add a transaction to get started
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Transaction #</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead>Payment Status</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                  {transactions.map((txn: any) => (
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
                      <TableCell className="text-right font-medium">
                        {formatCurrency(txn.amount)}
                      </TableCell>
                      <TableCell>
                        {getPaymentStatusBadge(txn.paymentStatus)}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {txn.notes || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        {txn.paymentStatus !== "PAID" && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedTransaction(txn);
                              setPaymentDialogOpen(true);
                            }}
                          >
                            Record Payment
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for transaction{" "}
              {selectedTransaction?.transactionNumber}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const paymentAmount = parseFloat(
                formData.get("paymentAmount") as string
              );
              const paymentDate = new Date(
                formData.get("paymentDate") as string
              );
              handleRecordPayment(
                selectedTransaction.id,
                paymentAmount,
                paymentDate
              );
            }}
          >
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="paymentAmount">Payment Amount</Label>
                <Input
                  id="paymentAmount"
                  name="paymentAmount"
                  type="number"
                  step="0.01"
                  defaultValue={selectedTransaction?.amount || ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentDate">Payment Date</Label>
                <Input
                  id="paymentDate"
                  name="paymentDate"
                  type="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setPaymentDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit">Record Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog
        open={transactionDialogOpen}
        onOpenChange={setTransactionDialogOpen}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add Transaction</DialogTitle>
            <DialogDescription>
              Create a new transaction for {clientTeriCode}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={e => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              createTransactionMutation.mutate({
                clientId: clientId,
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                transactionType: formData.get("transactionType") as any,
                transactionNumber:
                  (formData.get("transactionNumber") as string) || undefined,
                transactionDate: new Date(
                  formData.get("transactionDate") as string
                ),
                amount: parseFloat(formData.get("amount") as string),
                paymentStatus:
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  (formData.get("paymentStatus") as any) || "PENDING",
                notes: (formData.get("notes") as string) || undefined,
              });
            }}
          >
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="transactionType">Transaction Type *</Label>
                <Select name="transactionType" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INVOICE">Invoice</SelectItem>
                    <SelectItem value="PAYMENT">Payment</SelectItem>
                    <SelectItem value="QUOTE">Quote</SelectItem>
                    <SelectItem value="ORDER">Order</SelectItem>
                    <SelectItem value="REFUND">Refund</SelectItem>
                    <SelectItem value="CREDIT">Credit</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="transactionNumber">Transaction Number</Label>
                <Input
                  id="transactionNumber"
                  name="transactionNumber"
                  placeholder="e.g., INV-001"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transactionDate">Transaction Date *</Label>
                <Input
                  id="transactionDate"
                  name="transactionDate"
                  type="date"
                  defaultValue={new Date().toISOString().split("T")[0]}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="amount">Amount *</Label>
                <Input
                  id="amount"
                  name="amount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentStatus">Payment Status</Label>
                <Select name="paymentStatus" defaultValue="PENDING">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="PAID">Paid</SelectItem>
                    <SelectItem value="OVERDUE">Overdue</SelectItem>
                    <SelectItem value="PARTIAL">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  name="notes"
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setTransactionDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createTransactionMutation.isPending}
              >
                {createTransactionMutation.isPending
                  ? "Creating..."
                  : "Create Transaction"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

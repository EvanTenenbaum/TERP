import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { FreeformNoteWidget } from "@/components/dashboard/widgets-v2";
import {
  ArrowLeft,
  Edit,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Calendar,
  Search,
  Plus,
  CheckCircle,
  XCircle,
} from "lucide-react";

interface ClientProfilePageProps {
  clientId: number;
}

export default function ClientProfilePage({ clientId }: ClientProfilePageProps) {
  const [activeTab, setActiveTab] = useState("overview");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<any>(null);
  const [transactionSearch, setTransactionSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");

  // Fetch client data
  const { data: client, isLoading: clientLoading } = trpc.clients.getById.useQuery({
    clientId,
  });

  // Fetch transactions
  const { data: transactions, isLoading: transactionsLoading, refetch: refetchTransactions } =
    trpc.clients.transactions.list.useQuery({
      clientId,
      search: transactionSearch || undefined,
    });

  // Fetch activity log
  const { data: activities } = trpc.clients.activity.list.useQuery({
    clientId,
  });

  // Fetch client note ID
  const { data: noteId } = trpc.clients.notes.getNoteId.useQuery({
    clientId,
  });

  // Mutations
  const updateClientMutation = trpc.clients.update.useMutation();
  const recordPaymentMutation = trpc.clients.transactions.recordPayment.useMutation();

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-lg font-medium">Loading client...</div>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <div className="text-lg font-medium">Client not found</div>
        </div>
      </div>
    );
  }

  // Get client type badges
  const getClientTypeBadges = () => {
    const badges: { label: string; variant: "default" | "secondary" | "outline" }[] = [];
    if (client.isBuyer) badges.push({ label: "Buyer", variant: "default" });
    if (client.isSeller) badges.push({ label: "Seller", variant: "secondary" });
    if (client.isBrand) badges.push({ label: "Brand", variant: "outline" });
    if (client.isReferee) badges.push({ label: "Referee", variant: "secondary" });
    if (client.isContractor) badges.push({ label: "Contractor", variant: "outline" });
    return badges;
  };

  // Format currency
  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  // Format percentage
  const formatPercentage = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return `${num.toFixed(2)}%`;
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
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      PAID: "default",
      PENDING: "secondary",
      OVERDUE: "destructive",
      PARTIAL: "outline",
    };
    return (
      <Badge variant={variants[status] || "outline"}>
        {status}
      </Badge>
    );
  };

  // Get transaction type badge
  const getTransactionTypeBadge = (type: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      INVOICE: "default",
      PAYMENT: "default",
      QUOTE: "secondary",
      ORDER: "outline",
      REFUND: "destructive",
      CREDIT: "outline",
    };
    return (
      <Badge variant={variants[type] || "outline"}>
        {type}
      </Badge>
    );
  };

  // Filter paid transactions for payment history
  const paidTransactions = transactions?.filter((txn: any) => 
    txn.paymentStatus === "PAID" && txn.paymentDate
  ) || [];

  // Filter by payment search
  const filteredPayments = paidTransactions.filter((txn: any) => {
    if (!paymentSearch) return true;
    return (
      txn.transactionNumber?.toLowerCase().includes(paymentSearch.toLowerCase()) ||
      txn.transactionType?.toLowerCase().includes(paymentSearch.toLowerCase())
    );
  });

  // Handle record payment
  const handleRecordPayment = async (transactionId: number, paymentAmount: number, paymentDate: Date) => {
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
    <div className="space-y-6">
      {/* Breadcrumb and Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => window.history.back()}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Clients
        </Button>
      </div>

      {/* Client Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <CardTitle className="text-3xl">{client.teriCode}</CardTitle>
                <div className="flex gap-2">
                  {getClientTypeBadges().map((badge, idx) => (
                    <Badge key={idx} variant={badge.variant}>
                      {badge.label}
                    </Badge>
                  ))}
                </div>
              </div>
              <CardDescription className="text-base">
                {client.name}
              </CardDescription>
              {client.email && (
                <p className="text-sm text-muted-foreground">{client.email}</p>
              )}
              {client.phone && (
                <p className="text-sm text-muted-foreground">{client.phone}</p>
              )}
            </div>
            <Button onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Client
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(client.totalSpent || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Profit</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(client.totalProfit || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Profit Margin</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(client.avgProfitMargin || 0)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Owed</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${parseFloat(client.totalOwed as string) > 0 ? "text-destructive" : ""}`}>
              {formatCurrency(client.totalOwed || 0)}
            </div>
            {client.oldestDebtDays && client.oldestDebtDays > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Oldest: {client.oldestDebtDays} days
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabbed Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="transactions">Transactions</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">TERI Code</Label>
                  <p className="text-base">{client.teriCode}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                  <p className="text-base">{client.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                  <p className="text-base">{client.email || "-"}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                  <p className="text-base">{client.phone || "-"}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">Address</Label>
                  <p className="text-base">{client.address || "-"}</p>
                </div>
                <div className="col-span-2">
                  <Label className="text-sm font-medium text-muted-foreground">Tags</Label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {client.tags && Array.isArray(client.tags) && client.tags.length > 0 ? (
                      (client.tags as string[]).map((tag, idx) => (
                        <Badge key={idx} variant="outline">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-muted-foreground">No tags</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              {activities && activities.length > 0 ? (
                <div className="space-y-3">
                  {activities.slice(0, 5).map((activity: any) => (
                    <div key={activity.id} className="flex items-start gap-3 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1">
                        <p className="font-medium">{activity.activityType.replace(/_/g, " ")}</p>
                        <p className="text-muted-foreground">
                          by {activity.userName || "Unknown"} • {formatDate(activity.createdAt)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No activity yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transactions Tab */}
        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Transaction History</CardTitle>
                  <CardDescription>All transactions (invoices, quotes, orders, etc.)</CardDescription>
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
                  onChange={(e) => setTransactionSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Transactions Table */}
              {transactionsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading transactions...</div>
              ) : !transactions || transactions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-lg font-medium">No transactions found</p>
                  <p className="text-sm mt-2">Add a transaction to get started</p>
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
                      {transactions.map((txn: any) => (
                        <TableRow key={txn.id}>
                          <TableCell className="font-medium">{txn.transactionNumber || "-"}</TableCell>
                          <TableCell>{getTransactionTypeBadge(txn.transactionType)}</TableCell>
                          <TableCell>{formatDate(txn.transactionDate)}</TableCell>
                          <TableCell className="text-right font-medium">
                            {formatCurrency(txn.amount)}
                          </TableCell>
                          <TableCell>{getPaymentStatusBadge(txn.paymentStatus)}</TableCell>
                          <TableCell className="max-w-xs truncate">{txn.notes || "-"}</TableCell>
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
        </TabsContent>

        {/* Payments Tab */}
        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>All completed payments for this client</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search payments..."
                  value={paymentSearch}
                  onChange={(e) => setPaymentSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Payments Table */}
              {transactionsLoading ? (
                <div className="text-center py-8 text-muted-foreground">Loading payments...</div>
              ) : filteredPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-lg font-medium">No payments found</p>
                  <p className="text-sm mt-2">Payments will appear here once transactions are marked as paid</p>
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
                        <TableHead className="text-right">Amount Paid</TableHead>
                        <TableHead className="text-right">Transaction Amount</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map((txn: any) => (
                        <TableRow key={txn.id}>
                          <TableCell className="font-medium">{txn.transactionNumber || "-"}</TableCell>
                          <TableCell>{getTransactionTypeBadge(txn.transactionType)}</TableCell>
                          <TableCell>{formatDate(txn.transactionDate)}</TableCell>
                          <TableCell className="font-medium">{formatDate(txn.paymentDate)}</TableCell>
                          <TableCell className="text-right font-medium text-green-600">
                            {formatCurrency(txn.paymentAmount || txn.amount)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(txn.amount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <CheckCircle className="h-4 w-4 text-green-600" />
                              <span className="text-green-600 font-medium">Paid</span>
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
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Notes</CardTitle>
              <CardDescription>Freeform notes for this client</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[600px]">
                <FreeformNoteWidget noteId={noteId || undefined} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Record Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Record a payment for transaction {selectedTransaction?.transactionNumber}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const paymentAmount = parseFloat(formData.get("paymentAmount") as string);
              const paymentDate = new Date(formData.get("paymentDate") as string);
              handleRecordPayment(selectedTransaction.id, paymentAmount, paymentDate);
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
              <Button type="button" variant="outline" onClick={() => setPaymentDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Record Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}


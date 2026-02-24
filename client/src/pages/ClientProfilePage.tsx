import { useState } from "react";
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { PageErrorBoundary } from "@/components/common/PageErrorBoundary";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FreeformNoteWidget } from "@/components/dashboard/widgets-v2";
import { CreditStatusCard } from "@/components/credit/CreditStatusCard";
import { PricingConfigTab } from "@/components/pricing/PricingConfigTab";
import { ClientNeedsTab } from "@/components/needs/ClientNeedsTab";
import { CommunicationTimeline } from "@/components/clients/CommunicationTimeline";
import { AddCommunicationModal } from "@/components/clients/AddCommunicationModal";
import { PurchasePatternsWidget } from "@/components/clients/PurchasePatternsWidget";
import { ClientCalendarTab } from "@/components/clients/ClientCalendarTab";
import { SupplierProfileSection } from "@/components/clients/SupplierProfileSection";
import { CommentWidget } from "@/components/comments/CommentWidget";
import { LiveCatalogConfig } from "@/components/vip-portal/LiveCatalogConfig";
import { VIPPortalSettings } from "@/components/clients/VIPPortalSettings";
import { CustomerWishlistCard } from "@/components/clients/CustomerWishlistCard";
import { BackButton } from "@/components/common/BackButton";
import { AuditIcon } from "@/components/audit";
import { PageSkeleton } from "@/components/ui/skeleton-loaders";
import { useCreditVisibility } from "@/hooks/useCreditVisibility";
import { useOptimisticLocking } from "@/hooks/useOptimisticLocking";
import {
  Edit,
  DollarSign,
  TrendingUp,
  AlertCircle,
  Calendar,
  Search,
  Plus,
  CheckCircle,
  Settings,
  BookOpen,
} from "lucide-react";
import { useLocation } from "wouter";

// TER-289: Typed interfaces to replace `any` in transaction/activity callbacks
interface ClientTransaction {
  id: number;
  transactionNumber?: string | null;
  transactionType: string;
  transactionDate?: string | Date | null;
  amount?: string | number | null;
  paymentAmount?: string | number | null;
  paymentStatus?: string | null;
  paymentDate?: string | Date | null;
  notes?: string | null;
}

interface ClientActivity {
  id: number;
  activityType: string;
  description?: string | null;
  createdAt?: string | Date | null;
}

type TransactionType =
  | "INVOICE"
  | "PAYMENT"
  | "QUOTE"
  | "ORDER"
  | "REFUND"
  | "CREDIT";

export default function ClientProfilePage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const clientId = parseInt(params.id || "0", 10);
  const [activeTab, setActiveTab] = useState("overview");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [transactionDialogOpen, setTransactionDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<ClientTransaction | null>(null);
  const [transactionSearch, setTransactionSearch] = useState("");
  const [paymentSearch, setPaymentSearch] = useState("");
  const [communicationModalOpen, setCommunicationModalOpen] = useState(false);
  const [newTag, setNewTag] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);

  // Credit visibility settings
  const { shouldShowCreditWidgetInProfile } = useCreditVisibility();

  // BUG-090 fix: Get utils for cache invalidation
  const utils = trpc.useUtils();

  // ST-026: Optimistic locking for concurrent edit detection
  const { handleMutationError, ConflictDialogComponent } = useOptimisticLocking(
    {
      entityType: "Client",
      onRefresh: () => refetchClient(),
      onDiscard: () => setEditDialogOpen(false),
    }
  );

  // Fetch client data
  const {
    data: client,
    isLoading: clientLoading,
    isError,
    refetch: refetchClient,
  } = trpc.clients.getById.useQuery({
    clientId,
  });

  // Fetch transactions
  const {
    data: transactions,
    isLoading: transactionsLoading,
    refetch: refetchTransactions,
  } = trpc.clients.transactions.list.useQuery({
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
  // BUG-090 fix: Add proper cache invalidation and refetch on success
  // ST-026: Add optimistic locking error handling
  const updateClientMutation = trpc.clients.update.useMutation({
    onSuccess: () => {
      // Invalidate all client-related caches to ensure fresh data
      utils.clients.getById.invalidate({ clientId });
      utils.clients.list.invalidate();
      // Refetch the current client to show updated data
      refetchClient();
      setEditDialogOpen(false);
    },
    onError: error => {
      // ST-026: Handle concurrent edit conflicts
      if (!handleMutationError(error)) {
        // If it's not an optimistic lock error, show generic error
        console.error("Error updating client:", error);
      }
    },
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
  const addTagMutation = trpc.clients.tags.add.useMutation({
    onSuccess: () => {
      refetchClient();
      setNewTag("");
      setShowTagInput(false);
    },
  });

  if (clientLoading) {
    return <PageSkeleton variant="dashboard" />;
  }

  if (isError || !client) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <div className="text-lg font-medium">Client not found</div>
          <p className="text-sm text-muted-foreground mt-2">
            The client you are looking for does not exist or could not be
            loaded.
          </p>
        </div>
      </div>
    );
  }

  // Get client type badges
  const getClientTypeBadges = () => {
    const badges: {
      label: string;
      variant: "default" | "secondary" | "outline";
    }[] = [];
    if (client.isBuyer) badges.push({ label: "Buyer", variant: "default" });
    if (client.isSeller) badges.push({ label: "Seller", variant: "secondary" });
    if (client.isBrand) badges.push({ label: "Brand", variant: "outline" });
    if (client.isReferee)
      badges.push({ label: "Referee", variant: "secondary" });
    if (client.isContractor)
      badges.push({ label: "Contractor", variant: "outline" });
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

  // Filter paid transactions for payment history
  const paidTransactions =
    transactions?.filter(
      (txn: ClientTransaction) =>
        txn.paymentStatus === "PAID" && txn.paymentDate
    ) || [];

  // Filter by payment search
  const filteredPayments = paidTransactions.filter((txn: ClientTransaction) => {
    if (!paymentSearch) return true;
    return (
      txn.transactionNumber
        ?.toLowerCase()
        .includes(paymentSearch.toLowerCase()) ||
      txn.transactionType?.toLowerCase().includes(paymentSearch.toLowerCase())
    );
  });

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

  const handleAddTag = async () => {
    const tag = newTag.trim();
    if (!tag) return;
    await addTagMutation.mutateAsync({ clientId, tag });
  };

  return (
    <PageErrorBoundary pageName="ClientProfile">
      <div className="space-y-6">
        {/* Breadcrumb and Header */}
        <BackButton label="Back to Clients" to="/clients" />

        {/* Client Header */}
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <CardTitle className="text-3xl" data-testid="client-id">
                    {client.teriCode}
                  </CardTitle>
                  <div className="flex gap-2">
                    {getClientTypeBadges().map(badge => (
                      <Badge key={badge.label} variant={badge.variant}>
                        {badge.label}
                      </Badge>
                    ))}
                  </div>
                </div>
                <CardDescription className="text-base">
                  {client.name}
                </CardDescription>
                {client.email && (
                  <p className="text-sm text-muted-foreground">
                    {client.email}
                  </p>
                )}
                {client.phone && (
                  <p className="text-sm text-muted-foreground">
                    {client.phone}
                  </p>
                )}
              </div>
              <div className="flex gap-2">
                {client.vipPortalEnabled && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      setLocation(`/clients/${clientId}/vip-portal-config`)
                    }
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    VIP Portal Config
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => setLocation(`/clients/${clientId}/ledger`)}
                >
                  <BookOpen className="h-4 w-4 mr-2" />
                  View Ledger
                </Button>
                <Button onClick={() => setEditDialogOpen(true)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Client
                </Button>
              </div>
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
              <div className="text-2xl font-bold">
                {formatCurrency(client.totalSpent || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Profit
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(client.totalProfit || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Avg Profit Margin
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatPercentage(client.avgProfitMargin || 0)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Amount Owed</CardTitle>
              <div className="flex items-center gap-1">
                <AuditIcon
                  type="client"
                  entityId={clientId}
                  fieldName="totalOwed"
                />
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${parseFloat(client.totalOwed as string) > 0 ? "text-destructive" : ""}`}
                data-testid="total-owed"
              >
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
          <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0 scrollbar-hide">
            <TabsList className="inline-flex w-full min-w-max md:w-auto h-auto gap-1">
              <TabsTrigger
                value="overview"
                className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
              >
                Overview
              </TabsTrigger>
              {client.isSeller && (
                <TabsTrigger
                  value="supplier"
                  className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
                >
                  Supplier
                </TabsTrigger>
              )}
              <TabsTrigger
                value="transactions"
                data-testid="transactions-tab"
                className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
              >
                Transactions
              </TabsTrigger>
              <TabsTrigger
                value="payments"
                className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
              >
                Payments
              </TabsTrigger>
              <TabsTrigger
                value="pricing"
                className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
              >
                Pricing
              </TabsTrigger>
              <TabsTrigger
                value="needs"
                className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
              >
                Needs
              </TabsTrigger>
              <TabsTrigger
                value="communications"
                className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
              >
                Comms
              </TabsTrigger>
              <TabsTrigger
                value="calendar"
                className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
              >
                Calendar
              </TabsTrigger>
              <TabsTrigger
                value="notes"
                className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
              >
                Notes
              </TabsTrigger>
              <TabsTrigger
                value="live-catalog"
                className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2"
              >
                Catalog
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            {/* Credit Status Card (only for buyers with visibility enabled) */}
            {client.isBuyer && shouldShowCreditWidgetInProfile && (
              <CreditStatusCard
                clientId={clientId}
                clientName={client.name}
                showOverrideButton={true}
                showRecalculateButton={true}
              />
            )}

            {/* Purchase Patterns Widget (only for buyers) */}
            {client.isBuyer && <PurchasePatternsWidget clientId={clientId} />}

            {/* VIP Portal Settings (only for buyers) */}
            {client.isBuyer && (
              <VIPPortalSettings
                clientId={clientId}
                clientName={client.name}
                vipPortalEnabled={client.vipPortalEnabled || false}
                vipPortalLastLogin={client.vipPortalLastLogin}
              />
            )}

            {/* Customer Wishlist (WS-015) - only for buyers */}
            {client.isBuyer && (
              <CustomerWishlistCard
                clientId={clientId}
                wishlist={client.wishlist || ""}
                version={client.version}
                onRefresh={refetchClient}
              />
            )}

            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      TERI Code
                    </Label>
                    <p className="text-base">{client.teriCode}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Name
                    </Label>
                    <p className="text-base">{client.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Email
                    </Label>
                    <p className="text-base">{client.email || "-"}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-muted-foreground">
                      Phone
                    </Label>
                    <p className="text-base">{client.phone || "-"}</p>
                  </div>
                  <div className="col-span-2" data-testid="tags-section">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Address
                    </Label>
                    <p className="text-base">{client.address || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-sm font-medium text-muted-foreground">
                      Tags
                    </Label>
                    <div
                      className="flex flex-wrap gap-2 mt-1"
                      data-testid="tags-list"
                    >
                      {client.tags &&
                      Array.isArray(client.tags) &&
                      client.tags.length > 0 ? (
                        (client.tags as string[]).map(tag => (
                          <Badge key={tag} variant="outline">
                            {tag}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-muted-foreground">No tags</span>
                      )}
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {showTagInput ? (
                        <>
                          <Input
                            data-testid="tag-input"
                            value={newTag}
                            onChange={e => setNewTag(e.target.value)}
                            placeholder="Enter tag"
                            className="w-48"
                          />
                          <Button
                            size="sm"
                            data-testid="save-tag-btn"
                            onClick={handleAddTag}
                            disabled={
                              addTagMutation.isPending || !newTag.trim()
                            }
                          >
                            {addTagMutation.isPending
                              ? "Saving..."
                              : "Save Tag"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setShowTagInput(false);
                              setNewTag("");
                            }}
                          >
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          data-testid="add-tag-btn"
                          onClick={() => setShowTagInput(true)}
                        >
                          Add Tag
                        </Button>
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
                    {activities.slice(0, 5).map((activity: ClientActivity) => (
                      <div
                        key={activity.id}
                        className="flex items-start gap-3 text-sm"
                      >
                        <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium">
                            {activity.activityType.replace(/_/g, " ")}
                          </p>
                          <p className="text-muted-foreground">
                            by {activity.userName || "Unknown"} •{" "}
                            {activity.createdAt
                              ? formatDate(activity.createdAt)
                              : "-"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">
                    No activity yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Comments */}
            <Card>
              <CardHeader>
                <CardTitle>Comments</CardTitle>
                <CardDescription>
                  Team notes and discussions about this client
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CommentWidget
                  commentableType="client"
                  commentableId={clientId}
                />
              </CardContent>
            </Card>
          </TabsContent>

          {/* Supplier Tab (only for sellers) */}
          {client.isSeller && (
            <TabsContent value="supplier" className="space-y-4">
              <SupplierProfileSection
                clientId={clientId}
                clientName={client.name}
              />
            </TabsContent>
          )}

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Transaction History</CardTitle>
                    <CardDescription>
                      All transactions (invoices, quotes, orders, etc.)
                    </CardDescription>
                  </div>
                  <Button
                    data-testid="add-transaction-btn"
                    onClick={() => setTransactionDialogOpen(true)}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Transaction
                  </Button>
                </div>
              </CardHeader>
              <CardContent
                className="space-y-4"
                data-testid="transactions-list"
              >
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
                          <TableHead>Audit</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {transactions.map((txn: ClientTransaction) => (
                          <TableRow
                            key={txn.id}
                            data-testid={`transaction-row-${txn.id}`}
                            data-status={txn.paymentStatus}
                          >
                            <TableCell className="font-medium">
                              {txn.transactionNumber || "-"}
                            </TableCell>
                            <TableCell>
                              {getTransactionTypeBadge(txn.transactionType)}
                            </TableCell>
                            <TableCell>
                              {txn.transactionDate
                                ? formatDate(txn.transactionDate)
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right font-medium">
                              {txn.amount !== null && txn.amount !== undefined
                                ? formatCurrency(txn.amount)
                                : "-"}
                            </TableCell>
                            <TableCell>
                              {getPaymentStatusBadge(
                                txn.paymentStatus || "PENDING"
                              )}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {txn.notes || "-"}
                            </TableCell>
                            <TableCell>
                              <AuditIcon
                                entityType="transaction"
                                entityId={txn.id}
                                size="sm"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              {txn.paymentStatus !== "PAID" && (
                                <Button
                                  data-testid="record-payment-btn"
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
                        {filteredPayments.map((txn: ClientTransaction) => (
                          <TableRow key={txn.id}>
                            <TableCell className="font-medium">
                              {txn.transactionNumber || "-"}
                            </TableCell>
                            <TableCell>
                              {getTransactionTypeBadge(txn.transactionType)}
                            </TableCell>
                            <TableCell>
                              {txn.transactionDate
                                ? formatDate(txn.transactionDate)
                                : "-"}
                            </TableCell>
                            <TableCell className="font-medium">
                              {txn.paymentDate
                                ? formatDate(txn.paymentDate)
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right font-medium text-green-600">
                              {(txn.paymentAmount ?? txn.amount) !== null &&
                              (txn.paymentAmount ?? txn.amount) !== undefined
                                ? formatCurrency(
                                    txn.paymentAmount ?? txn.amount ?? 0
                                  )
                                : "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              {txn.amount !== null && txn.amount !== undefined
                                ? formatCurrency(txn.amount)
                                : "-"}
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
          </TabsContent>
          {/* Pricing Tab */}
          <TabsContent value="pricing">
            <PricingConfigTab clientId={clientId} />
          </TabsContent>

          {/* Notes Tab */}
          {/* Needs & History Tab */}
          <TabsContent value="needs" className="space-y-4">
            <ClientNeedsTab clientId={clientId} />
          </TabsContent>

          {/* Communications Tab */}
          <TabsContent value="communications" className="space-y-4">
            <CommunicationTimeline
              clientId={clientId}
              onAddClick={() => setCommunicationModalOpen(true)}
            />
          </TabsContent>

          <TabsContent value="calendar" className="space-y-4">
            <ClientCalendarTab clientId={clientId} />
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Client Notes</CardTitle>
                <CardDescription>
                  Freeform notes for this client
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[600px]">
                  <FreeformNoteWidget noteId={noteId || undefined} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Live Catalog Tab */}
          <TabsContent value="live-catalog" className="space-y-4">
            <LiveCatalogConfig clientId={clientId} />
          </TabsContent>
        </Tabs>

        {/* Add Communication Modal */}
        <AddCommunicationModal
          clientId={clientId}
          open={communicationModalOpen}
          onOpenChange={setCommunicationModalOpen}
          onSuccess={() => {
            // Refetch communications will happen automatically via tRPC
          }}
        />

        {/* Record Payment Dialog */}
        <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
          <DialogContent data-testid="payment-form">
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
                <Button type="submit" data-testid="submit-payment-btn">
                  Record Payment
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Edit Client Dialog */}
        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="w-full sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Edit Client</DialogTitle>
              <DialogDescription>
                Update client information for {client.teriCode}
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={e => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                updateClientMutation.mutate({
                  clientId: client.id,
                  version: client.version, // ST-026: Include version for optimistic locking
                  name: formData.get("name") as string,
                  email: (formData.get("email") as string) || undefined,
                  phone: (formData.get("phone") as string) || undefined,
                  address: (formData.get("address") as string) || undefined,
                  isBuyer: formData.get("isBuyer") === "on",
                  isSeller: formData.get("isSeller") === "on",
                  isBrand: formData.get("isBrand") === "on",
                  isReferee: formData.get("isReferee") === "on",
                  isContractor: formData.get("isContractor") === "on",
                });
              }}
            >
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Client Name *</Label>
                  <Input
                    id="edit-name"
                    name="name"
                    defaultValue={client.name}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-email">Email</Label>
                  <Input
                    id="edit-email"
                    name="email"
                    type="email"
                    defaultValue={client.email || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-phone">Phone</Label>
                  <Input
                    id="edit-phone"
                    name="phone"
                    defaultValue={client.phone || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-address">Address</Label>
                  <Textarea
                    id="edit-address"
                    name="address"
                    defaultValue={client.address || ""}
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Client Types</Label>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit-isBuyer"
                        name="isBuyer"
                        checked={client.isBuyer || false}
                      />
                      <Label
                        htmlFor="edit-isBuyer"
                        className="font-normal cursor-pointer"
                      >
                        Buyer
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit-isSeller"
                        name="isSeller"
                        checked={client.isSeller || false}
                      />
                      <Label
                        htmlFor="edit-isSeller"
                        className="font-normal cursor-pointer"
                      >
                        Seller
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit-isBrand"
                        name="isBrand"
                        checked={client.isBrand || false}
                      />
                      <Label
                        htmlFor="edit-isBrand"
                        className="font-normal cursor-pointer"
                      >
                        Brand
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit-isReferee"
                        name="isReferee"
                        checked={client.isReferee || false}
                      />
                      <Label
                        htmlFor="edit-isReferee"
                        className="font-normal cursor-pointer"
                      >
                        Referee
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="edit-isContractor"
                        name="isContractor"
                        checked={client.isContractor || false}
                      />
                      <Label
                        htmlFor="edit-isContractor"
                        className="font-normal cursor-pointer"
                      >
                        Contractor
                      </Label>
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={updateClientMutation.isPending}>
                  {updateClientMutation.isPending
                    ? "Saving..."
                    : "Save Changes"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Add Transaction Dialog */}
        <Dialog
          open={transactionDialogOpen}
          onOpenChange={setTransactionDialogOpen}
        >
          <DialogContent
            className="w-full sm:max-w-2xl"
            data-testid="transaction-form"
          >
            <DialogHeader>
              <DialogTitle>Add Transaction</DialogTitle>
              <DialogDescription>
                Create a new transaction for {client.teriCode}
              </DialogDescription>
            </DialogHeader>
            <form
              onSubmit={e => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                createTransactionMutation.mutate({
                  clientId: client.id,
                  transactionType: formData.get(
                    "transactionType"
                  ) as TransactionType,
                  transactionNumber:
                    (formData.get("transactionNumber") as string) || undefined,
                  transactionDate: new Date(
                    formData.get("transactionDate") as string
                  ),
                  amount: Number(formData.get("amount") as string),
                  paymentStatus:
                    (formData.get("paymentStatus") as
                      | "PENDING"
                      | "PAID"
                      | "PARTIAL"
                      | "OVERDUE") || "PENDING",
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
                  data-testid="save-transaction-btn"
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

        {/* ST-026: Conflict dialog for concurrent edit detection */}
        {ConflictDialogComponent}
      </div>
    </PageErrorBoundary>
  );
}

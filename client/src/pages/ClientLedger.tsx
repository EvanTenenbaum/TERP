/**
 * Client Ledger Page (MEET-010-FE)
 *
 * Comprehensive client ledger view showing all transactions
 * (orders, payments, purchases, adjustments) with running balance.
 *
 * Features:
 * - Client selector with search
 * - Date range and transaction type filters
 * - Ledger table with running balance
 * - Summary section (totals)
 * - Add adjustment dialog
 * - Export functionality (CSV)
 */

import { useState, useMemo, useEffect } from "react";
import { useSearchParams, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { ClientCombobox, type ClientOption } from "@/components/ui/client-combobox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PageErrorBoundary } from "@/components/common/PageErrorBoundary";
import { TableSkeleton } from "@/components/ui/skeleton-loaders";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  CalendarIcon,
  Download,
  Plus,
  Filter,
  BookOpen,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { useLocation } from "wouter";

// ============================================================================
// Types
// ============================================================================

interface LedgerTransaction {
  id: string;
  date: Date | string;
  type: string;
  description: string;
  referenceType?: string;
  referenceId?: number;
  debitAmount?: number;
  creditAmount?: number;
  runningBalance: number;
  createdBy: string;
}

type AdjustmentType = "CREDIT" | "DEBIT";

// ============================================================================
// Constants
// ============================================================================

const ADJUSTMENT_TYPES = [
  { value: "CREDIT", label: "Credit Adjustment", description: "Decrease what they owe" },
  { value: "DEBIT", label: "Debit Adjustment", description: "Increase what they owe" },
] as const;

const ITEMS_PER_PAGE = 50;

// ============================================================================
// Helper Components
// ============================================================================

function TransactionTypeBadge({ type }: { type: string }) {
  const variants: Record<string, { className: string; label: string }> = {
    SALE: { className: "bg-blue-100 text-blue-700 border-blue-200", label: "Sale" },
    PURCHASE: { className: "bg-purple-100 text-purple-700 border-purple-200", label: "Purchase" },
    PAYMENT_RECEIVED: { className: "bg-green-100 text-green-700 border-green-200", label: "Payment Received" },
    PAYMENT_SENT: { className: "bg-orange-100 text-orange-700 border-orange-200", label: "Payment Sent" },
    CREDIT: { className: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "Credit" },
    DEBIT: { className: "bg-red-100 text-red-700 border-red-200", label: "Debit" },
  };

  const variant = variants[type] || { className: "bg-gray-100 text-gray-700 border-gray-200", label: type };

  return (
    <Badge variant="outline" className={variant.className}>
      {variant.label}
    </Badge>
  );
}

function ReferenceLink({
  referenceType,
  referenceId,
}: {
  referenceType?: string;
  referenceId?: number;
}) {
  const [, setLocation] = useLocation();

  if (!referenceType || !referenceId) {
    return <span className="text-muted-foreground">-</span>;
  }

  const getLink = () => {
    switch (referenceType) {
      case "ORDER":
        return `/orders?id=${referenceId}`;
      case "PAYMENT":
        return `/accounting/payments?id=${referenceId}`;
      case "PURCHASE_ORDER":
        return `/purchase-orders?id=${referenceId}`;
      default:
        return null;
    }
  };

  const link = getLink();

  if (!link) {
    return (
      <span className="text-sm text-muted-foreground">
        {referenceType} #{referenceId}
      </span>
    );
  }

  return (
    <Button
      variant="link"
      size="sm"
      className="h-auto p-0 text-sm"
      onClick={() => setLocation(link)}
    >
      {referenceType} #{referenceId}
      <ExternalLink className="h-3 w-3 ml-1" />
    </Button>
  );
}

// ============================================================================
// Add Adjustment Dialog
// ============================================================================

interface AddAdjustmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  clientName: string;
  onSuccess: () => void;
}

function AddAdjustmentDialog({
  open,
  onOpenChange,
  clientId,
  clientName,
  onSuccess,
}: AddAdjustmentDialogProps) {
  const [type, setType] = useState<AdjustmentType>("CREDIT");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [showConfirm, setShowConfirm] = useState(false);

  const addAdjustment = trpc.clientLedger.addLedgerAdjustment.useMutation({
    onSuccess: () => {
      toast.success("Adjustment added successfully");
      onSuccess();
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to add adjustment: ${error.message}`);
    },
  });

  const resetForm = () => {
    setType("CREDIT");
    setAmount("");
    setNotes("");
  };

  const handleSubmit = () => {
    if (!notes.trim()) {
      toast.error("Notes are required for adjustments");
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid positive amount");
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirm = () => {
    addAdjustment.mutate({
      clientId,
      transactionType: type,
      amount: parseFloat(amount),
      description: notes.trim(),
    });
    setShowConfirm(false);
  };

  const selectedType = ADJUSTMENT_TYPES.find((t) => t.value === type);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Add Ledger Adjustment</DialogTitle>
            <DialogDescription>
              Add a manual adjustment for <strong>{clientName}</strong>
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="adjustment-type">Adjustment Type *</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as AdjustmentType)}
              >
                <SelectTrigger id="adjustment-type">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {ADJUSTMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex flex-col">
                        <span>{t.label}</span>
                        <span className="text-xs text-muted-foreground">
                          {t.description}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustment-amount">Amount *</Label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="adjustment-amount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adjustment-notes">Notes *</Label>
              <Textarea
                id="adjustment-notes"
                placeholder="Reason for adjustment (required)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
              <p className="text-xs text-muted-foreground">
                Please provide a detailed reason for this adjustment.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!amount || !notes.trim() || addAdjustment.isPending}
            >
              {addAdjustment.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Adjustment"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showConfirm}
        onOpenChange={setShowConfirm}
        title="Confirm Adjustment"
        description={
          <div className="space-y-2">
            <p>Are you sure you want to add this adjustment?</p>
            <div className="bg-muted p-3 rounded-md text-sm space-y-1">
              <p>
                <strong>Type:</strong> {selectedType?.label}
              </p>
              <p>
                <strong>Amount:</strong> {formatCurrency(parseFloat(amount) || 0)}
              </p>
              <p>
                <strong>Client:</strong> {clientName}
              </p>
            </div>
          </div>
        }
        confirmLabel="Confirm Adjustment"
        onConfirm={handleConfirm}
        isLoading={addAdjustment.isPending}
      />
    </>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function ClientLedger() {
  const [, setLocation] = useLocation();
  const [searchParams] = useSearchParams();
  const params = useParams<{ clientId?: string }>();

  // Get clientId from URL path or query param
  const clientIdFromUrl = params.clientId || searchParams.get("clientId");
  const initialClientId = clientIdFromUrl ? parseInt(clientIdFromUrl, 10) : null;

  // State
  const [selectedClientId, setSelectedClientId] = useState<number | null>(initialClientId);

  // Update selected client when URL changes
  useEffect(() => {
    if (initialClientId && initialClientId !== selectedClientId) {
      setSelectedClientId(initialClientId);
    }
  }, [initialClientId]);
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Fetch clients for dropdown
  const { data: clientsData, isLoading: clientsLoading } = trpc.clients.list.useQuery({
    limit: 1000,
  });

  // Transform clients data for combobox
  const clientOptions: ClientOption[] = useMemo(() => {
    if (!clientsData?.items) return [];
    return clientsData.items.map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      clientType: client.isBuyer ? "buyer" : client.isSeller ? "seller" : undefined,
    }));
  }, [clientsData]);

  // Fetch transaction types
  const { data: transactionTypes } = trpc.clientLedger.getTransactionTypes.useQuery();

  // Fetch ledger data
  const {
    data: ledgerData,
    isLoading: ledgerLoading,
    refetch: refetchLedger,
  } = trpc.clientLedger.getLedger.useQuery(
    {
      clientId: selectedClientId!,
      startDate: dateRange.from,
      endDate: dateRange.to,
      transactionTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
      limit: ITEMS_PER_PAGE,
      offset: page * ITEMS_PER_PAGE,
    },
    {
      enabled: !!selectedClientId,
    }
  );

  // Export mutation
  const exportLedger = trpc.clientLedger.exportLedger.useQuery(
    {
      clientId: selectedClientId!,
      startDate: dateRange.from,
      endDate: dateRange.to,
      transactionTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
    },
    {
      enabled: false, // Only run manually
    }
  );

  // Get selected client name
  const selectedClient = clientOptions.find((c) => c.id === selectedClientId);

  // Handle export
  const handleExport = async () => {
    if (!selectedClientId) {
      toast.error("Please select a client first");
      return;
    }

    setIsExporting(true);
    try {
      const result = await exportLedger.refetch();
      if (result.data) {
        // Create blob and download
        const blob = new Blob([result.data.content], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", result.data.filename);
        link.style.visibility = "hidden";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`Exported ${result.data.totalTransactions} transactions`);
      }
    } catch (error) {
      toast.error("Failed to export ledger");
    } finally {
      setIsExporting(false);
    }
  };

  // Handle type filter toggle
  const handleTypeToggle = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setPage(0);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setDateRange({ from: undefined, to: undefined });
    setSelectedTypes([]);
    setPage(0);
  };

  // Calculate pagination
  const totalPages = ledgerData ? Math.ceil(ledgerData.totalCount / ITEMS_PER_PAGE) : 0;
  const hasFilters = dateRange.from || dateRange.to || selectedTypes.length > 0;

  return (
    <PageErrorBoundary pageName="ClientLedger">
      <div className="flex flex-col gap-6 p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
              Client Ledger
            </h1>
            <p className="text-muted-foreground mt-1">
              View all transactions and balance history for a client
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleExport}
              disabled={!selectedClientId || isExporting}
            >
              {isExporting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Download className="h-4 w-4 mr-2" />
              )}
              Export CSV
            </Button>
            <Button
              onClick={() => setShowAdjustmentDialog(true)}
              disabled={!selectedClientId}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Adjustment
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              {/* Client Selector */}
              <div className="space-y-2">
                <Label>Client</Label>
                <ClientCombobox
                  value={selectedClientId}
                  onValueChange={(id) => {
                    setSelectedClientId(id);
                    setPage(0);
                  }}
                  clients={clientOptions}
                  isLoading={clientsLoading}
                  placeholder="Select a client..."
                />
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <Label>Date Range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd")} -{" "}
                            {format(dateRange.to, "LLL dd, yyyy")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, yyyy")
                        )
                      ) : (
                        <span>Select date range</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => {
                        setDateRange({ from: range?.from, to: range?.to });
                        setPage(0);
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* Transaction Type Filter */}
              <div className="space-y-2">
                <Label>Transaction Types</Label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" className="w-full justify-between">
                      <div className="flex items-center">
                        <Filter className="h-4 w-4 mr-2" />
                        {selectedTypes.length > 0
                          ? `${selectedTypes.length} selected`
                          : "All types"}
                      </div>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56">
                    <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {transactionTypes?.map((type) => (
                      <DropdownMenuCheckboxItem
                        key={type.value}
                        checked={selectedTypes.includes(type.value)}
                        onCheckedChange={() => handleTypeToggle(type.value)}
                      >
                        <div className="flex flex-col">
                          <span>{type.label}</span>
                          <span className="text-xs text-muted-foreground">
                            {type.direction}
                          </span>
                        </div>
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Clear Filters */}
              <div className="space-y-2">
                <Label className="invisible">Actions</Label>
                <Button
                  variant="ghost"
                  onClick={handleClearFilters}
                  disabled={!hasFilters}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content */}
        {!selectedClientId ? (
          <Card>
            <CardContent className="py-16">
              <EmptyState
                icon={<BookOpen className="h-12 w-12" />}
                title="Select a Client"
                description="Choose a client from the dropdown above to view their ledger history."
              />
            </CardContent>
          </Card>
        ) : ledgerLoading ? (
          <Card>
            <CardContent className="py-8">
              <TableSkeleton rows={10} columns={7} />
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Total Transactions
                  </CardTitle>
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {ledgerData?.totalCount || 0}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
                  <TrendingUp className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {formatCurrency(ledgerData?.summary?.totalDebits || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
                  <TrendingDown className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {formatCurrency(ledgerData?.summary?.totalCredits || 0)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Current Balance
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div
                    className={cn(
                      "text-2xl font-bold",
                      (ledgerData?.currentBalance || 0) > 0
                        ? "text-red-600"
                        : (ledgerData?.currentBalance || 0) < 0
                          ? "text-green-600"
                          : ""
                    )}
                  >
                    {formatCurrency(ledgerData?.currentBalance || 0)}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {ledgerData?.balanceDescription}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Ledger Table */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Ledger History</CardTitle>
                    <CardDescription>
                      {selectedClient?.name} - Showing{" "}
                      {ledgerData?.transactions?.length || 0} of{" "}
                      {ledgerData?.totalCount || 0} transactions
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {!ledgerData?.transactions?.length ? (
                  <div className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No transactions found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {hasFilters
                        ? "Try adjusting your filters"
                        : "This client has no ledger entries yet"}
                    </p>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead className="min-w-[200px]">
                              Description
                            </TableHead>
                            <TableHead>Reference</TableHead>
                            <TableHead className="text-right">Debit</TableHead>
                            <TableHead className="text-right">Credit</TableHead>
                            <TableHead className="text-right">Balance</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {ledgerData.transactions.map((txn: LedgerTransaction) => (
                            <TableRow key={txn.id}>
                              <TableCell className="whitespace-nowrap">
                                {formatDate(txn.date)}
                              </TableCell>
                              <TableCell>
                                <TransactionTypeBadge type={txn.type} />
                              </TableCell>
                              <TableCell className="max-w-[300px] truncate">
                                {txn.description}
                              </TableCell>
                              <TableCell>
                                <ReferenceLink
                                  referenceType={txn.referenceType}
                                  referenceId={txn.referenceId}
                                />
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {txn.debitAmount ? (
                                  <span className="text-red-600">
                                    {formatCurrency(txn.debitAmount)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono">
                                {txn.creditAmount ? (
                                  <span className="text-green-600">
                                    {formatCurrency(txn.creditAmount)}
                                  </span>
                                ) : (
                                  <span className="text-muted-foreground">-</span>
                                )}
                              </TableCell>
                              <TableCell className="text-right font-mono font-bold">
                                <span
                                  className={cn(
                                    txn.runningBalance > 0
                                      ? "text-red-600"
                                      : txn.runningBalance < 0
                                        ? "text-green-600"
                                        : ""
                                  )}
                                >
                                  {formatCurrency(txn.runningBalance)}
                                </span>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Summary Footer */}
                    <div className="mt-4 pt-4 border-t">
                      <div className="flex justify-end">
                        <div className="grid grid-cols-3 gap-8 text-sm">
                          <div className="text-right">
                            <p className="text-muted-foreground">Total Debits</p>
                            <p className="font-mono font-bold text-red-600">
                              {formatCurrency(ledgerData.summary?.totalDebits || 0)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-muted-foreground">Total Credits</p>
                            <p className="font-mono font-bold text-green-600">
                              {formatCurrency(ledgerData.summary?.totalCredits || 0)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-muted-foreground">Balance</p>
                            <p
                              className={cn(
                                "font-mono font-bold",
                                (ledgerData.currentBalance || 0) > 0
                                  ? "text-red-600"
                                  : (ledgerData.currentBalance || 0) < 0
                                    ? "text-green-600"
                                    : ""
                              )}
                            >
                              {formatCurrency(ledgerData.currentBalance || 0)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex items-center justify-between mt-4 pt-4 border-t">
                        <p className="text-sm text-muted-foreground">
                          Page {page + 1} of {totalPages}
                        </p>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage((p) => Math.max(0, p - 1))}
                            disabled={page === 0}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              setPage((p) => Math.min(totalPages - 1, p + 1))
                            }
                            disabled={page >= totalPages - 1}
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* Add Adjustment Dialog */}
        {selectedClientId && selectedClient && (
          <AddAdjustmentDialog
            open={showAdjustmentDialog}
            onOpenChange={setShowAdjustmentDialog}
            clientId={selectedClientId}
            clientName={selectedClient.name}
            onSuccess={() => refetchLedger()}
          />
        )}
      </div>
    </PageErrorBoundary>
  );
}

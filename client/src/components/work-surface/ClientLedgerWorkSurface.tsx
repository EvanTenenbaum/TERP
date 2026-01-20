/**
 * ClientLedgerWorkSurface (UXS-502)
 *
 * Work Surface implementation for client ledger accounting.
 * Integrates keyboard navigation, save state, and inspector panel patterns.
 *
 * Features:
 * - Client selection with search
 * - Transaction list with keyboard navigation
 * - Date range and type filtering
 * - Inspector panel for transaction details
 * - Add adjustment workflow
 * - Export functionality
 */

import React, { useState, useCallback, useRef, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { cn, formatCurrency, formatDate } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import {
  BookOpen,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Download,
  Plus,
  Filter,
  Calendar,
  User,
  Search,
  ExternalLink,
  X,
  Hash,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { ClientCombobox, type ClientOption } from '@/components/ui/client-combobox';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useWorkSurfaceKeyboard, type KeyboardConfig } from '@/hooks/work-surface/useWorkSurfaceKeyboard';
import { useSaveState } from '@/hooks/work-surface/useSaveState';
import { InspectorPanel } from '@/components/work-surface/InspectorPanel';
import { WorkSurfaceStatusBar } from '@/components/work-surface/WorkSurfaceStatusBar';

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

type AdjustmentType = 'CREDIT' | 'DEBIT';

// ============================================================================
// Constants
// ============================================================================

const ADJUSTMENT_TYPES = [
  { value: 'CREDIT', label: 'Credit Adjustment', description: 'Decrease what they owe' },
  { value: 'DEBIT', label: 'Debit Adjustment', description: 'Increase what they owe' },
] as const;

const ITEMS_PER_PAGE = 50;

// ============================================================================
// Transaction Type Badge
// ============================================================================

function TransactionTypeBadge({ type }: { type: string }) {
  const variants: Record<string, { className: string; label: string }> = {
    SALE: { className: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Sale' },
    PURCHASE: { className: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Purchase' },
    PAYMENT_RECEIVED: { className: 'bg-green-100 text-green-700 border-green-200', label: 'Payment Received' },
    PAYMENT_SENT: { className: 'bg-orange-100 text-orange-700 border-orange-200', label: 'Payment Sent' },
    CREDIT: { className: 'bg-emerald-100 text-emerald-700 border-emerald-200', label: 'Credit' },
    DEBIT: { className: 'bg-red-100 text-red-700 border-red-200', label: 'Debit' },
  };

  const variant = variants[type] || { className: 'bg-gray-100 text-gray-700 border-gray-200', label: type };

  return (
    <Badge variant="outline" className={variant.className}>
      {variant.label}
    </Badge>
  );
}

// ============================================================================
// Transaction Row
// ============================================================================

interface TransactionRowProps {
  transaction: LedgerTransaction;
  isFocused: boolean;
  isSelected: boolean;
  onClick: () => void;
  onDoubleClick: () => void;
}

function TransactionRow({ transaction, isFocused, isSelected, onClick, onDoubleClick }: TransactionRowProps) {
  return (
    <tr
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        'cursor-pointer transition-colors',
        isFocused && 'bg-blue-50 ring-2 ring-inset ring-blue-400',
        isSelected && !isFocused && 'bg-blue-100',
        !isFocused && !isSelected && 'hover:bg-gray-50'
      )}
      role="row"
      tabIndex={-1}
      aria-selected={isSelected}
    >
      <td className="px-4 py-3 whitespace-nowrap text-sm">
        {formatDate(transaction.date)}
      </td>
      <td className="px-4 py-3">
        <TransactionTypeBadge type={transaction.type} />
      </td>
      <td className="px-4 py-3 text-sm max-w-[300px] truncate">
        {transaction.description}
      </td>
      <td className="px-4 py-3 text-sm">
        {transaction.referenceType && transaction.referenceId ? (
          <span className="text-blue-600 hover:underline">
            {transaction.referenceType} #{transaction.referenceId}
          </span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm">
        {transaction.debitAmount ? (
          <span className="text-red-600">{formatCurrency(transaction.debitAmount)}</span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-mono text-sm">
        {transaction.creditAmount ? (
          <span className="text-green-600">{formatCurrency(transaction.creditAmount)}</span>
        ) : (
          <span className="text-gray-400">-</span>
        )}
      </td>
      <td className="px-4 py-3 text-right font-mono font-bold text-sm">
        <span
          className={cn(
            transaction.runningBalance > 0
              ? 'text-red-600'
              : transaction.runningBalance < 0
              ? 'text-green-600'
              : ''
          )}
        >
          {formatCurrency(transaction.runningBalance)}
        </span>
      </td>
    </tr>
  );
}

// ============================================================================
// Transaction Inspector
// ============================================================================

interface TransactionInspectorProps {
  transaction: LedgerTransaction;
  onClose: () => void;
  onNavigateToReference: () => void;
}

function TransactionInspector({ transaction, onClose, onNavigateToReference }: TransactionInspectorProps) {
  const hasReference = transaction.referenceType && transaction.referenceId;

  return (
    <InspectorPanel title="Transaction Details" onClose={onClose}>
      <div className="space-y-6">
        {/* Type and Date */}
        <div className="flex items-start justify-between">
          <TransactionTypeBadge type={transaction.type} />
          <span className="text-sm text-gray-500">
            {formatDate(transaction.date)}
          </span>
        </div>

        {/* Description */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
          <p className="text-sm">{transaction.description}</p>
        </div>

        {/* Amounts */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Debit</h4>
            {transaction.debitAmount ? (
              <p className="text-lg font-semibold text-red-600">
                {formatCurrency(transaction.debitAmount)}
              </p>
            ) : (
              <p className="text-gray-400">-</p>
            )}
          </div>
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Credit</h4>
            {transaction.creditAmount ? (
              <p className="text-lg font-semibold text-green-600">
                {formatCurrency(transaction.creditAmount)}
              </p>
            ) : (
              <p className="text-gray-400">-</p>
            )}
          </div>
        </div>

        {/* Running Balance */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Running Balance</h4>
          <p
            className={cn(
              'text-xl font-bold',
              transaction.runningBalance > 0
                ? 'text-red-600'
                : transaction.runningBalance < 0
                ? 'text-green-600'
                : ''
            )}
          >
            {formatCurrency(transaction.runningBalance)}
          </p>
        </div>

        {/* Reference */}
        {hasReference && (
          <div>
            <h4 className="text-sm font-medium text-gray-500 mb-1">Reference</h4>
            <Button variant="outline" size="sm" onClick={onNavigateToReference}>
              <ExternalLink className="w-4 h-4 mr-2" />
              {transaction.referenceType} #{transaction.referenceId}
            </Button>
          </div>
        )}

        {/* Created By */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Created By</h4>
          <p className="text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-gray-400" />
            {transaction.createdBy}
          </p>
        </div>

        {/* Transaction ID */}
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-1">Transaction ID</h4>
          <p className="text-sm font-mono text-gray-600">{transaction.id}</p>
        </div>
      </div>
    </InspectorPanel>
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
  const [type, setType] = useState<AdjustmentType>('CREDIT');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const addAdjustment = trpc.clientLedger.addLedgerAdjustment.useMutation({
    onSuccess: () => {
      toast.success('Adjustment added successfully');
      onSuccess();
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(`Failed to add adjustment: ${error.message}`);
    },
  });

  const resetForm = () => {
    setType('CREDIT');
    setAmount('');
    setNotes('');
  };

  const handleSubmit = () => {
    if (!notes.trim()) {
      toast.error('Notes are required for adjustments');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error('Please enter a valid positive amount');
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
                'Add Adjustment'
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
              <p><strong>Type:</strong> {selectedType?.label}</p>
              <p><strong>Amount:</strong> {formatCurrency(parseFloat(amount) || 0)}</p>
              <p><strong>Client:</strong> {clientName}</p>
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
// Summary Cards
// ============================================================================

interface SummaryCardsProps {
  totalCount: number;
  totalDebits: number;
  totalCredits: number;
  currentBalance: number;
  balanceDescription?: string;
}

function SummaryCards({ totalCount, totalDebits, totalCredits, currentBalance, balanceDescription }: SummaryCardsProps) {
  return (
    <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
          <BookOpen className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{totalCount}</div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
          <TrendingUp className="h-4 w-4 text-red-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-red-600">
            {formatCurrency(totalDebits)}
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
            {formatCurrency(totalCredits)}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Current Balance</CardTitle>
          <DollarSign className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              'text-2xl font-bold',
              currentBalance > 0 ? 'text-red-600' : currentBalance < 0 ? 'text-green-600' : ''
            )}
          >
            {formatCurrency(currentBalance)}
          </div>
          {balanceDescription && (
            <p className="text-xs text-muted-foreground mt-1">{balanceDescription}</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function ClientLedgerWorkSurface() {
  // State
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [focusedRowIndex, setFocusedRowIndex] = useState(0);
  const [selectedTransactionId, setSelectedTransactionId] = useState<string | null>(null);
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [inspectorTransaction, setInspectorTransaction] = useState<LedgerTransaction | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Save state
  const { saveState, setSaving, setSaved, setError, SaveStateIndicator } = useSaveState();

  // Queries
  const { data: clientsData, isLoading: clientsLoading } = trpc.clients.list.useQuery({
    limit: 1000,
  });

  const { data: transactionTypes } = trpc.clientLedger.getTransactionTypes.useQuery();

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

  const exportQuery = trpc.clientLedger.exportLedger.useQuery(
    {
      clientId: selectedClientId!,
      startDate: dateRange.from,
      endDate: dateRange.to,
      transactionTypes: selectedTypes.length > 0 ? selectedTypes : undefined,
    },
    {
      enabled: false,
    }
  );

  // Transform clients for combobox
  const clientOptions: ClientOption[] = useMemo(() => {
    if (!clientsData?.items) return [];
    return clientsData.items.map((client) => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      clientType: client.isBuyer ? 'buyer' : client.isSeller ? 'seller' : undefined,
    }));
  }, [clientsData]);

  // Get selected client
  const selectedClient = useMemo(() => {
    return clientOptions.find((c) => c.id === selectedClientId);
  }, [clientOptions, selectedClientId]);

  // Get transactions
  const transactions = useMemo(() => {
    return ledgerData?.transactions || [];
  }, [ledgerData]);

  // Pagination
  const totalPages = ledgerData ? Math.ceil(ledgerData.totalCount / ITEMS_PER_PAGE) : 0;
  const hasFilters = dateRange.from || dateRange.to || selectedTypes.length > 0;

  // Handlers
  const handleClientChange = useCallback((id: number | null) => {
    setSelectedClientId(id);
    setPage(0);
    setFocusedRowIndex(0);
    setSelectedTransactionId(null);
  }, []);

  const handleTypeToggle = useCallback((type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setPage(0);
    setFocusedRowIndex(0);
  }, []);

  const handleClearFilters = useCallback(() => {
    setDateRange({ from: undefined, to: undefined });
    setSelectedTypes([]);
    setPage(0);
    setFocusedRowIndex(0);
  }, []);

  const handleExport = useCallback(async () => {
    if (!selectedClientId) {
      toast.error('Please select a client first');
      return;
    }

    setIsExporting(true);
    try {
      const result = await exportQuery.refetch();
      if (result.data) {
        const blob = new Blob([result.data.content], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', result.data.filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        toast.success(`Exported ${result.data.totalTransactions} transactions`);
      }
    } catch (error) {
      toast.error('Failed to export ledger');
    } finally {
      setIsExporting(false);
    }
  }, [selectedClientId, exportQuery]);

  const openInspector = useCallback((transaction: LedgerTransaction) => {
    setInspectorTransaction(transaction);
    setSelectedTransactionId(transaction.id);
  }, []);

  const closeInspector = useCallback(() => {
    setInspectorTransaction(null);
  }, []);

  const navigateToReference = useCallback(() => {
    if (inspectorTransaction?.referenceType && inspectorTransaction?.referenceId) {
      const type = inspectorTransaction.referenceType;
      const id = inspectorTransaction.referenceId;
      let path = '';
      switch (type) {
        case 'ORDER':
          path = `/orders?id=${id}`;
          break;
        case 'PAYMENT':
          path = `/accounting/payments?id=${id}`;
          break;
        case 'PURCHASE_ORDER':
          path = `/purchase-orders?id=${id}`;
          break;
      }
      if (path) {
        window.location.href = path;
      }
    }
  }, [inspectorTransaction]);

  // Keyboard configuration
  const keyboardConfig: KeyboardConfig = useMemo(() => ({
    onArrowUp: () => {
      setFocusedRowIndex((prev) => Math.max(0, prev - 1));
    },
    onArrowDown: () => {
      setFocusedRowIndex((prev) => Math.min(transactions.length - 1, prev + 1));
    },
    onEnter: () => {
      if (transactions[focusedRowIndex]) {
        openInspector(transactions[focusedRowIndex]);
      }
    },
    onEscape: () => {
      if (inspectorTransaction) {
        closeInspector();
      } else {
        setSelectedTransactionId(null);
      }
    },
    onTab: () => {
      // Move to next page if at end
      if (focusedRowIndex === transactions.length - 1 && page < totalPages - 1) {
        setPage((p) => p + 1);
        setFocusedRowIndex(0);
      }
    },
    onCmdK: () => {
      searchInputRef.current?.focus();
    },
    customBindings: {
      'a': () => setShowAdjustmentDialog(true),
      'e': () => handleExport(),
      '[': () => setPage((p) => Math.max(0, p - 1)),
      ']': () => setPage((p) => Math.min(totalPages - 1, p + 1)),
      'c': () => handleClearFilters(),
    },
  }), [
    focusedRowIndex,
    transactions,
    page,
    totalPages,
    inspectorTransaction,
    openInspector,
    closeInspector,
    handleExport,
    handleClearFilters,
  ]);

  useWorkSurfaceKeyboard(keyboardConfig, { containerRef });

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-background" tabIndex={0}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-6 border-b">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight flex items-center gap-3">
            <BookOpen className="w-8 h-8 text-blue-600" />
            Client Ledger
          </h1>
          <p className="text-muted-foreground mt-1">
            View all transactions and balance history for a client
          </p>
        </div>
        <div className="flex items-center gap-2">
          {SaveStateIndicator}
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
            Export (E)
          </Button>
          <Button
            onClick={() => setShowAdjustmentDialog(true)}
            disabled={!selectedClientId}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Adjustment (A)
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mx-6 mt-6">
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
                onValueChange={handleClientChange}
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
                      'w-full justify-start text-left font-normal',
                      !dateRange.from && 'text-muted-foreground'
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {format(dateRange.from, 'LLL dd')} -{' '}
                          {format(dateRange.to, 'LLL dd, yyyy')}
                        </>
                      ) : (
                        format(dateRange.from, 'LLL dd, yyyy')
                      )
                    ) : (
                      <span>Select date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
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
              <Select
                value={selectedTypes.length > 0 ? selectedTypes[0] : 'all'}
                onValueChange={(v) => {
                  if (v === 'all') {
                    setSelectedTypes([]);
                  } else {
                    handleTypeToggle(v);
                  }
                }}
              >
                <SelectTrigger>
                  <div className="flex items-center">
                    <Filter className="h-4 w-4 mr-2" />
                    {selectedTypes.length > 0 ? `${selectedTypes.length} selected` : 'All types'}
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {transactionTypes?.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                Clear Filters (C)
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden flex flex-col px-6 pb-6 mt-6">
        {!selectedClientId ? (
          <Card className="flex-1 flex items-center justify-center">
            <div className="text-center py-16">
              <BookOpen className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-lg font-medium">Select a Client</p>
              <p className="text-sm text-muted-foreground">
                Choose a client from the dropdown above to view their ledger history.
              </p>
            </div>
          </Card>
        ) : ledgerLoading ? (
          <Card className="flex-1 flex items-center justify-center">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </Card>
        ) : (
          <div className="flex flex-col gap-6 flex-1 overflow-hidden">
            {/* Summary Cards */}
            <SummaryCards
              totalCount={ledgerData?.totalCount || 0}
              totalDebits={ledgerData?.summary?.totalDebits || 0}
              totalCredits={ledgerData?.summary?.totalCredits || 0}
              currentBalance={ledgerData?.currentBalance || 0}
              balanceDescription={ledgerData?.balanceDescription}
            />

            {/* Ledger Table */}
            <Card className="flex-1 overflow-hidden flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Ledger History</CardTitle>
                    <CardDescription>
                      {selectedClient?.name} - Showing {transactions.length} of{' '}
                      {ledgerData?.totalCount || 0} transactions
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden flex flex-col">
                {transactions.length === 0 ? (
                  <div className="text-center py-12 flex-1 flex flex-col items-center justify-center">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-lg font-medium">No transactions found</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {hasFilters
                        ? 'Try adjusting your filters'
                        : 'This client has no ledger entries yet'}
                    </p>
                  </div>
                ) : (
                  <div className="flex-1 overflow-auto">
                    <table className="w-full" role="grid">
                      <thead className="sticky top-0 bg-background border-b">
                        <tr>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Date</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Type</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Description</th>
                          <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Reference</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Debit</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Credit</th>
                          <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Balance</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((txn, index) => (
                          <TransactionRow
                            key={txn.id}
                            transaction={txn}
                            isFocused={focusedRowIndex === index}
                            isSelected={selectedTransactionId === txn.id}
                            onClick={() => setSelectedTransactionId(txn.id)}
                            onDoubleClick={() => openInspector(txn)}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

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
                        Previous ([)
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={page >= totalPages - 1}
                      >
                        Next (])
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Status Bar */}
      <WorkSurfaceStatusBar
        left={selectedClient ? `Client: ${selectedClient.name}` : 'No client selected'}
        center={`Row ${focusedRowIndex + 1} of ${transactions.length}`}
        right="↑↓ Navigate • Enter Inspect • A Adjust • E Export • [ ] Page"
      />

      {/* Inspector */}
      {inspectorTransaction && (
        <TransactionInspector
          transaction={inspectorTransaction}
          onClose={closeInspector}
          onNavigateToReference={navigateToReference}
        />
      )}

      {/* Adjustment Dialog */}
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
  );
}

export default ClientLedgerWorkSurface;

/**
 * Intake Receipts Page
 * FEAT-008: Intake Verification System (MEET-064-FE)
 *
 * Provides UI for:
 * - Viewing and filtering intake receipts
 * - Creating new intake receipts with line items
 * - Viewing receipt details and verification status
 * - Stacker verification with actual quantities
 * - Discrepancy management and resolution
 * - Receipt finalization
 */

import { useState, useMemo } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Separator } from '@/components/ui/separator';
import { ClientCombobox } from '@/components/ui/client-combobox';
import { PageErrorBoundary } from '@/components/common/PageErrorBoundary';
import { TableSkeleton } from '@/components/ui/skeleton-loaders';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Search,
  PlusCircle,
  ClipboardList,
  Package,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  Clock,
  CheckCircle2,
  FileCheck,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

type ReceiptStatus = 'PENDING' | 'FARMER_VERIFIED' | 'STACKER_VERIFIED' | 'FINALIZED' | 'DISPUTED';
type VerificationStatus = 'PENDING' | 'VERIFIED' | 'DISCREPANCY';
type ResolutionType = 'ACCEPTED' | 'ADJUSTED' | 'REJECTED';

interface LineItem {
  productName: string;
  quantity: number;
  unit: string;
  expectedPrice?: number | null;
}

interface VerificationItem {
  itemId: number;
  actualQuantity: number;
  status: VerificationStatus;
  notes?: string;
}

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

function IntakeStatusBadge({ status }: { status: ReceiptStatus }) {
  const config: Record<ReceiptStatus, { label: string; className: string; icon: React.ReactNode }> = {
    PENDING: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: <Clock className="h-3 w-3" />,
    },
    FARMER_VERIFIED: {
      label: 'Farmer Verified',
      className: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: <Check className="h-3 w-3" />,
    },
    STACKER_VERIFIED: {
      label: 'Stacker Verified',
      className: 'bg-green-100 text-green-800 border-green-200',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    FINALIZED: {
      label: 'Finalized',
      className: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: <FileCheck className="h-3 w-3" />,
    },
    DISPUTED: {
      label: 'Disputed',
      className: 'bg-red-100 text-red-800 border-red-200',
      icon: <AlertTriangle className="h-3 w-3" />,
    },
  };

  const { label, className, icon } = config[status] || config.PENDING;

  return (
    <Badge variant="outline" className={`gap-1 ${className}`}>
      {icon}
      {label}
    </Badge>
  );
}

function VerificationStatusBadge({ status }: { status: VerificationStatus }) {
  const config: Record<VerificationStatus, { label: string; className: string }> = {
    PENDING: {
      label: 'Pending',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    },
    VERIFIED: {
      label: 'Verified',
      className: 'bg-green-100 text-green-800 border-green-200',
    },
    DISCREPANCY: {
      label: 'Discrepancy',
      className: 'bg-red-100 text-red-800 border-red-200',
    },
  };

  const { label, className } = config[status] || config.PENDING;

  return (
    <Badge variant="outline" className={className}>
      {label}
    </Badge>
  );
}

// ============================================================================
// CREATE RECEIPT DIALOG
// ============================================================================

interface CreateReceiptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

function CreateReceiptDialog({ open, onOpenChange, onSuccess }: CreateReceiptDialogProps) {
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<LineItem[]>([{ productName: '', quantity: 1, unit: 'lb' }]);

  // Fetch clients for supplier selection
  const { data: clientsData, isLoading: loadingClients } = trpc.clients.list.useQuery({ limit: 1000 });
  const clients = useMemo(() => {
    const raw = Array.isArray(clientsData) ? clientsData : (clientsData?.items ?? []);
    // Filter to suppliers/vendors if there's a clientType field
    return raw.map((c: any) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone,
      clientType: c.clientType,
    }));
  }, [clientsData]);

  const createReceiptMutation = trpc.intakeReceipts.createReceipt.useMutation({
    onSuccess: (data) => {
      toast.success(`Receipt ${data.receiptNumber} created successfully!`);
      // Reset form
      setSupplierId(null);
      setNotes('');
      setItems([{ productName: '', quantity: 1, unit: 'lb' }]);
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to create receipt');
    },
  });

  const handleAddItem = () => {
    setItems([...items, { productName: '', quantity: 1, unit: 'lb' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleItemChange = (index: number, field: keyof LineItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    setItems(newItems);
  };

  const handleSubmit = () => {
    if (!supplierId) {
      toast.error('Please select a supplier');
      return;
    }

    const validItems = items.filter((item) => item.productName.trim() && item.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Please add at least one valid item');
      return;
    }

    createReceiptMutation.mutate({
      supplierId,
      items: validItems,
      notes: notes || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            New Intake Receipt
          </DialogTitle>
          <DialogDescription>
            Create a new intake receipt for supplier deliveries.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Supplier Selection */}
          <div className="space-y-2">
            <Label htmlFor="supplier">Supplier *</Label>
            <ClientCombobox
              value={supplierId}
              onValueChange={setSupplierId}
              clients={clients}
              isLoading={loadingClients}
              placeholder="Select supplier..."
              emptyText="No suppliers found"
            />
          </div>

          {/* Line Items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Items *</Label>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <PlusCircle className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            </div>

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="flex gap-2 items-start p-3 border rounded-lg bg-muted/30">
                  <div className="flex-1 space-y-2">
                    <Input
                      placeholder="Product name"
                      value={item.productName}
                      onChange={(e) => handleItemChange(index, 'productName', e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Input
                        type="number"
                        placeholder="Qty"
                        min="0"
                        step="0.01"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)}
                        className="w-24"
                      />
                      <Select
                        value={item.unit}
                        onValueChange={(value) => handleItemChange(index, 'unit', value)}
                      >
                        <SelectTrigger className="w-24">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lb">lb</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                          <SelectItem value="oz">oz</SelectItem>
                          <SelectItem value="g">g</SelectItem>
                          <SelectItem value="units">units</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input
                        type="number"
                        placeholder="Price (optional)"
                        min="0"
                        step="0.01"
                        value={item.expectedPrice || ''}
                        onChange={(e) => handleItemChange(index, 'expectedPrice', parseFloat(e.target.value) || null)}
                        className="w-32"
                      />
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(index)}
                    disabled={items.length === 1}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea
              id="notes"
              placeholder="Any additional notes about this delivery..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={createReceiptMutation.isPending}>
            {createReceiptMutation.isPending ? 'Creating...' : 'Create Receipt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// STACKER VERIFICATION SECTION
// ============================================================================

interface StackerVerificationSectionProps {
  receiptId: number;
  items: any[];
  onSuccess: () => void;
}

function StackerVerificationSection({ receiptId, items, onSuccess }: StackerVerificationSectionProps) {
  const [verifications, setVerifications] = useState<Record<number, { actualQty: number; notes: string }>>(() => {
    const initial: Record<number, { actualQty: number; notes: string }> = {};
    items.forEach((item) => {
      initial[item.id] = {
        actualQty: parseFloat(item.expectedQuantity) || 0,
        notes: '',
      };
    });
    return initial;
  });

  const verifyMutation = trpc.intakeReceipts.verifyAsStacker.useMutation({
    onSuccess: (data) => {
      if (data.discrepancies.length > 0) {
        toast.warning(`Verification complete with ${data.discrepancies.length} discrepancy(ies)`);
      } else {
        toast.success('Verification complete - all quantities match!');
      }
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'Verification failed');
    },
  });

  const handleVerificationChange = (itemId: number, field: 'actualQty' | 'notes', value: any) => {
    setVerifications((prev) => ({
      ...prev,
      [itemId]: { ...prev[itemId], [field]: value },
    }));
  };

  const handleSubmitVerification = () => {
    const verificationItems: VerificationItem[] = items.map((item) => {
      const expected = parseFloat(item.expectedQuantity) || 0;
      const actual = verifications[item.id]?.actualQty || 0;
      const hasDiscrepancy = Math.abs(expected - actual) > 0.0001;

      return {
        itemId: item.id,
        actualQuantity: actual,
        status: hasDiscrepancy ? 'DISCREPANCY' as const : 'VERIFIED' as const,
        notes: verifications[item.id]?.notes || undefined,
      };
    });

    verifyMutation.mutate({
      receiptId,
      verifications: verificationItems,
    });
  };

  return (
    <div className="space-y-4">
      <h4 className="font-semibold flex items-center gap-2">
        <Package className="h-4 w-4" />
        Stacker Verification
      </h4>
      <p className="text-sm text-muted-foreground">
        Enter the actual quantities received for each item.
      </p>

      <div className="space-y-3">
        {items.map((item) => {
          const expected = parseFloat(item.expectedQuantity) || 0;
          const actual = verifications[item.id]?.actualQty || 0;
          const hasDiscrepancy = Math.abs(expected - actual) > 0.0001;

          return (
            <div
              key={item.id}
              className={`p-3 border rounded-lg ${hasDiscrepancy ? 'border-red-300 bg-red-50' : 'bg-muted/30'}`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{item.productName}</span>
                {hasDiscrepancy && (
                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-200">
                    Discrepancy
                  </Badge>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-muted-foreground">Expected</Label>
                  <div className="font-medium">
                    {expected} {item.unit}
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Actual *</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={actual}
                    onChange={(e) =>
                      handleVerificationChange(item.id, 'actualQty', parseFloat(e.target.value) || 0)
                    }
                    className={hasDiscrepancy ? 'border-red-300' : ''}
                  />
                </div>
              </div>
              {hasDiscrepancy && (
                <div className="mt-2">
                  <Label className="text-xs text-muted-foreground">Discrepancy Notes</Label>
                  <Input
                    placeholder="Explain the discrepancy..."
                    value={verifications[item.id]?.notes || ''}
                    onChange={(e) => handleVerificationChange(item.id, 'notes', e.target.value)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <Button onClick={handleSubmitVerification} disabled={verifyMutation.isPending} className="w-full">
        {verifyMutation.isPending ? 'Verifying...' : 'Complete Verification'}
      </Button>
    </div>
  );
}

// ============================================================================
// DISCREPANCY RESOLUTION DIALOG
// ============================================================================

interface DiscrepancyResolutionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  discrepancy: any;
  onSuccess: () => void;
}

function DiscrepancyResolutionDialog({
  open,
  onOpenChange,
  discrepancy,
  onSuccess,
}: DiscrepancyResolutionDialogProps) {
  const [resolution, setResolution] = useState<ResolutionType>('ACCEPTED');
  const [notes, setNotes] = useState('');

  const resolveMutation = trpc.intakeReceipts.resolveDiscrepancy.useMutation({
    onSuccess: () => {
      toast.success('Discrepancy resolved');
      setResolution('ACCEPTED');
      setNotes('');
      onOpenChange(false);
      onSuccess();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to resolve discrepancy');
    },
  });

  const handleSubmit = () => {
    resolveMutation.mutate({
      discrepancyId: discrepancy.id,
      resolution,
      notes: notes || undefined,
    });
  };

  if (!discrepancy) return null;

  const expected = parseFloat(discrepancy.expectedQuantity) || 0;
  const actual = parseFloat(discrepancy.actualQuantity) || 0;
  const difference = actual - expected;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Resolve Discrepancy
          </DialogTitle>
          <DialogDescription>
            Choose how to resolve this quantity discrepancy.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-3 gap-4 text-center p-4 bg-muted/50 rounded-lg">
            <div>
              <div className="text-sm text-muted-foreground">Expected</div>
              <div className="text-lg font-bold">{expected}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Actual</div>
              <div className="text-lg font-bold">{actual}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Difference</div>
              <div className={`text-lg font-bold ${difference >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {difference > 0 ? '+' : ''}
                {difference.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Resolution *</Label>
            <Select value={resolution} onValueChange={(v) => setResolution(v as ResolutionType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACCEPTED">Accept actual quantity</SelectItem>
                <SelectItem value="ADJUSTED">Adjust to expected quantity</SelectItem>
                <SelectItem value="REJECTED">Reject delivery</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea
              placeholder="Explain your resolution decision..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={resolveMutation.isPending}>
            {resolveMutation.isPending ? 'Resolving...' : 'Resolve'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// RECEIPT DETAIL SHEET
// ============================================================================

interface ReceiptDetailSheetProps {
  receiptId: number | null;
  onClose: () => void;
  onRefresh: () => void;
}

function ReceiptDetailSheet({ receiptId, onClose, onRefresh }: ReceiptDetailSheetProps) {
  const [showFinalizeConfirm, setShowFinalizeConfirm] = useState(false);
  const [selectedDiscrepancy, setSelectedDiscrepancy] = useState<any>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);

  const { data: receipt, isLoading, refetch } = trpc.intakeReceipts.getReceipt.useQuery(
    { id: receiptId! },
    { enabled: !!receiptId }
  );

  const finalizeMutation = trpc.intakeReceipts.finalizeReceipt.useMutation({
    onSuccess: () => {
      toast.success('Receipt finalized successfully!');
      setShowFinalizeConfirm(false);
      refetch();
      onRefresh();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to finalize receipt');
    },
  });

  const handleCopyShareLink = () => {
    if (receipt?.shareableToken) {
      const url = `${window.location.origin}/intake/verify/${receipt.shareableToken}`;
      navigator.clipboard.writeText(url);
      setCopiedUrl(true);
      toast.success('Share link copied to clipboard!');
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleRefresh = () => {
    refetch();
    onRefresh();
  };

  if (!receiptId) return null;

  const canVerifyAsStacker =
    receipt?.status === 'PENDING' || receipt?.status === 'FARMER_VERIFIED';
  const canFinalize =
    receipt?.status === 'STACKER_VERIFIED' &&
    (receipt?.discrepancies || []).filter((d: any) => !d.resolution).length === 0;
  const unresolvedDiscrepancies = (receipt?.discrepancies || []).filter((d: any) => !d.resolution);

  // Calculate totals
  const totalExpectedQty = (receipt?.items || []).reduce(
    (sum: number, item: any) => sum + (parseFloat(item.expectedQuantity) || 0),
    0
  );

  return (
    <>
      <Sheet open={!!receiptId} onOpenChange={(open) => !open && onClose()}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-3">
              <span>{receipt?.receiptNumber || 'Loading...'}</span>
              {receipt && <IntakeStatusBadge status={receipt.status as ReceiptStatus} />}
            </SheetTitle>
          </SheetHeader>

          {isLoading ? (
            <div className="mt-6">
              <TableSkeleton rows={5} columns={3} />
            </div>
          ) : receipt ? (
            <div className="mt-6 space-y-6">
              {/* Receipt Info */}
              <div>
                <h3 className="font-semibold mb-2">Receipt Information</h3>
                <div className="text-sm space-y-1">
                  <div>
                    <span className="text-muted-foreground">Supplier:</span>{' '}
                    {receipt.supplier?.name || 'Unknown'}
                  </div>
                  <div>
                    <span className="text-muted-foreground">Created:</span>{' '}
                    {receipt.createdAt ? format(new Date(receipt.createdAt), 'MMM d, yyyy h:mm a') : 'N/A'}
                  </div>
                  {receipt.creator && (
                    <div>
                      <span className="text-muted-foreground">Created by:</span> {receipt.creator.name}
                    </div>
                  )}
                  {receipt.farmerVerifiedAt && (
                    <div>
                      <span className="text-muted-foreground">Farmer verified:</span>{' '}
                      {format(new Date(receipt.farmerVerifiedAt), 'MMM d, yyyy h:mm a')}
                    </div>
                  )}
                  {receipt.stackerVerifiedAt && (
                    <div>
                      <span className="text-muted-foreground">Stacker verified:</span>{' '}
                      {format(new Date(receipt.stackerVerifiedAt), 'MMM d, yyyy h:mm a')}
                    </div>
                  )}
                  {receipt.finalizedAt && (
                    <div>
                      <span className="text-muted-foreground">Finalized:</span>{' '}
                      {format(new Date(receipt.finalizedAt), 'MMM d, yyyy h:mm a')}
                    </div>
                  )}
                </div>
              </div>

              {/* Share Link */}
              {receipt.status === 'PENDING' && receipt.shareableToken && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-blue-800">Share with Farmer</div>
                      <div className="text-sm text-blue-600">
                        Send this link for farmer verification
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleCopyShareLink}>
                      {copiedUrl ? (
                        <>
                          <Check className="h-4 w-4 mr-1" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-1" />
                          Copy Link
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              <Separator />

              {/* Items Table */}
              <div>
                <h3 className="font-semibold mb-2">Items ({receipt.items?.length || 0})</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Actual</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {receipt.items?.map((item: any) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.productName}</TableCell>
                        <TableCell className="text-right">
                          {item.expectedQuantity} {item.unit}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.actualQuantity ? `${item.actualQuantity} ${item.unit}` : '-'}
                        </TableCell>
                        <TableCell>
                          <VerificationStatusBadge status={item.verificationStatus as VerificationStatus} />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <div className="text-right text-sm text-muted-foreground mt-2">
                  Total Expected: {totalExpectedQty.toFixed(2)}
                </div>
              </div>

              {/* Notes */}
              {receipt.notes && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2">Notes</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{receipt.notes}</p>
                  </div>
                </>
              )}

              {/* Discrepancies */}
              {(receipt.discrepancies?.length || 0) > 0 && (
                <>
                  <Separator />
                  <div>
                    <h3 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-500" />
                      Discrepancies ({receipt.discrepancies.length})
                    </h3>
                    <div className="space-y-2">
                      {receipt.discrepancies.map((d: any) => {
                        const item = receipt.items?.find((i: any) => i.id === d.itemId);
                        return (
                          <div
                            key={d.id}
                            className={`p-3 border rounded-lg ${d.resolution ? 'bg-gray-50' : 'bg-amber-50 border-amber-200'}`}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">{item?.productName || 'Unknown Item'}</div>
                                <div className="text-sm text-muted-foreground">
                                  Expected: {d.expectedQuantity} | Actual: {d.actualQuantity} | Diff:{' '}
                                  {d.difference}
                                </div>
                                {d.resolution && (
                                  <Badge variant="outline" className="mt-1">
                                    Resolved: {d.resolution}
                                  </Badge>
                                )}
                              </div>
                              {!d.resolution && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedDiscrepancy(d)}
                                >
                                  Resolve
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}

              <Separator />

              {/* Stacker Verification Section */}
              {canVerifyAsStacker && (
                <StackerVerificationSection
                  receiptId={receipt.id}
                  items={receipt.items || []}
                  onSuccess={handleRefresh}
                />
              )}

              {/* Finalization */}
              {canFinalize && (
                <div className="space-y-3">
                  <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="font-medium text-green-800">Ready to Finalize</div>
                    <div className="text-sm text-green-600">
                      All verifications complete. Finalize to complete the intake process.
                    </div>
                  </div>
                  <Button onClick={() => setShowFinalizeConfirm(true)} className="w-full">
                    <FileCheck className="h-4 w-4 mr-2" />
                    Finalize Receipt
                  </Button>
                </div>
              )}

              {/* Status Messages */}
              {receipt.status === 'DISPUTED' && unresolvedDiscrepancies.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="font-medium text-amber-800">Resolve Discrepancies</div>
                  <div className="text-sm text-amber-600">
                    {unresolvedDiscrepancies.length} discrepancy(ies) need resolution before finalizing.
                  </div>
                </div>
              )}

              {receipt.status === 'FINALIZED' && (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="font-medium text-gray-800">Receipt Finalized</div>
                  <div className="text-sm text-gray-600">
                    This receipt has been completed and cannot be modified.
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Finalize Confirmation Dialog */}
      <AlertDialog open={showFinalizeConfirm} onOpenChange={setShowFinalizeConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Finalize Receipt?</AlertDialogTitle>
            <AlertDialogDescription>
              This will complete the intake process. The receipt cannot be modified after finalization.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => receipt && finalizeMutation.mutate({ receiptId: receipt.id })}
              disabled={finalizeMutation.isPending}
            >
              {finalizeMutation.isPending ? 'Finalizing...' : 'Finalize'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Discrepancy Resolution Dialog */}
      <DiscrepancyResolutionDialog
        open={!!selectedDiscrepancy}
        onOpenChange={(open) => !open && setSelectedDiscrepancy(null)}
        discrepancy={selectedDiscrepancy}
        onSuccess={handleRefresh}
      />
    </>
  );
}

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================

export default function IntakeReceipts() {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<number | null>(null);

  // Fetch receipts
  const { data: receiptsData, isLoading, refetch } = trpc.intakeReceipts.listReceipts.useQuery({
    status: statusFilter === 'ALL' ? undefined : (statusFilter as ReceiptStatus),
    search: searchQuery || undefined,
    limit: 100,
  });

  const receipts = receiptsData?.items || [];
  const totalCount = receiptsData?.total || 0;

  // Calculate statistics
  const stats = useMemo(() => {
    const all = receipts || [];
    return {
      total: totalCount,
      pending: all.filter((r: any) => r.status === 'PENDING').length,
      awaitingVerification: all.filter(
        (r: any) => r.status === 'PENDING' || r.status === 'FARMER_VERIFIED'
      ).length,
      disputed: all.filter((r: any) => r.status === 'DISPUTED').length,
      finalized: all.filter((r: any) => r.status === 'FINALIZED').length,
    };
  }, [receipts, totalCount]);

  return (
    <PageErrorBoundary pageName="IntakeReceipts">
      <div className="container mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Intake Receipts</h1>
            <p className="text-muted-foreground mt-1">
              Manage supplier deliveries and verification workflow
            </p>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Intake Receipt
          </Button>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Receipts</p>
                  <p className="text-2xl font-bold">{stats.total}</p>
                </div>
                <ClipboardList className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Awaiting Verification</p>
                  <p className="text-2xl font-bold">{stats.awaitingVerification}</p>
                </div>
                <Clock className="h-8 w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Disputed</p>
                  <p className="text-2xl font-bold">{stats.disputed}</p>
                </div>
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Finalized</p>
                  <p className="text-2xl font-bold">{stats.finalized}</p>
                </div>
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                  <Input
                    placeholder="Search by receipt number..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="FARMER_VERIFIED">Farmer Verified</SelectItem>
                  <SelectItem value="STACKER_VERIFIED">Stacker Verified</SelectItem>
                  <SelectItem value="DISPUTED">Disputed</SelectItem>
                  <SelectItem value="FINALIZED">Finalized</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Receipts Table */}
        <Card>
          <CardHeader>
            <CardTitle>Receipts ({receipts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <TableSkeleton rows={10} columns={6} />
            ) : receipts.length === 0 ? (
              <EmptyState
                variant="invoices"
                title="No intake receipts"
                description={
                  searchQuery || statusFilter !== 'ALL'
                    ? 'No receipts match your filters. Try adjusting your search or status filter.'
                    : 'Create your first intake receipt to start tracking supplier deliveries.'
                }
                action={
                  !searchQuery && statusFilter === 'ALL'
                    ? {
                        label: 'New Intake Receipt',
                        onClick: () => setShowCreateDialog(true),
                      }
                    : undefined
                }
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Receipt #</TableHead>
                    <TableHead>Supplier</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Items</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipts.map((receipt: any) => (
                    <TableRow
                      key={receipt.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setSelectedReceiptId(receipt.id)}
                    >
                      <TableCell className="font-medium">{receipt.receiptNumber}</TableCell>
                      <TableCell>{receipt.supplierName || 'Unknown'}</TableCell>
                      <TableCell>
                        {receipt.createdAt
                          ? format(new Date(receipt.createdAt), 'MMM d, yyyy')
                          : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <IntakeStatusBadge status={receipt.status as ReceiptStatus} />
                      </TableCell>
                      <TableCell className="text-right">-</TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Create Receipt Dialog */}
        <CreateReceiptDialog
          open={showCreateDialog}
          onOpenChange={setShowCreateDialog}
          onSuccess={() => refetch()}
        />

        {/* Receipt Detail Sheet */}
        <ReceiptDetailSheet
          receiptId={selectedReceiptId}
          onClose={() => setSelectedReceiptId(null)}
          onRefresh={() => refetch()}
        />
      </div>
    </PageErrorBoundary>
  );
}

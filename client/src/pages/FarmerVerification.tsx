/**
 * Farmer Verification Page
 * FEAT-008: Intake Verification System (MEET-065-FE)
 *
 * Public page accessible via shareable link for farmer/supplier verification.
 * Does NOT require authentication.
 *
 * Route: /verify/:token
 */

import { useState } from 'react';
import { useParams } from 'wouter';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
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
import { TableSkeleton } from '@/components/ui/skeleton-loaders';
import {
  ClipboardList,
  Package,
  Check,
  CheckCircle2,
  Clock,
  FileCheck,
  AlertTriangle,
  XCircle,
  Building2,
} from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

type ReceiptStatus = 'PENDING' | 'FARMER_VERIFIED' | 'STACKER_VERIFIED' | 'FINALIZED' | 'DISPUTED';

// ============================================================================
// STATUS BADGE COMPONENT
// ============================================================================

function IntakeStatusBadge({ status }: { status: ReceiptStatus }) {
  const config: Record<ReceiptStatus, { label: string; className: string; icon: React.ReactNode }> = {
    PENDING: {
      label: 'Pending Verification',
      className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      icon: <Clock className="h-3 w-3" />,
    },
    FARMER_VERIFIED: {
      label: 'Verified by You',
      className: 'bg-green-100 text-green-800 border-green-200',
      icon: <CheckCircle2 className="h-3 w-3" />,
    },
    STACKER_VERIFIED: {
      label: 'Processing',
      className: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: <Check className="h-3 w-3" />,
    },
    FINALIZED: {
      label: 'Completed',
      className: 'bg-gray-100 text-gray-800 border-gray-200',
      icon: <FileCheck className="h-3 w-3" />,
    },
    DISPUTED: {
      label: 'Under Review',
      className: 'bg-amber-100 text-amber-800 border-amber-200',
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function FarmerVerification() {
  const params = useParams();
  const token = params.token as string;

  const [acknowledged, setAcknowledged] = useState(false);
  const [notes, setNotes] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fetch receipt by token (public API)
  const { data: receipt, isLoading, error, refetch } = trpc.intakeReceipts.getReceiptByToken.useQuery(
    { token },
    { enabled: !!token }
  );

  // Verify mutation
  const verifyMutation = trpc.intakeReceipts.verifyAsFarmer.useMutation({
    onSuccess: () => {
      toast.success('Receipt verified successfully!');
      setShowConfirmDialog(false);
      refetch();
    },
    onError: (error) => {
      toast.error(error.message || 'Verification failed');
    },
  });

  const handleVerify = () => {
    if (!acknowledged) {
      toast.error('Please acknowledge the receipt before verifying');
      return;
    }
    setShowConfirmDialog(true);
  };

  const confirmVerification = () => {
    verifyMutation.mutate({
      token,
      acknowledged: true,
      notes: notes || undefined,
    });
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <ClipboardList className="h-12 w-12 text-primary" />
              </div>
              <CardTitle>Loading Receipt...</CardTitle>
            </CardHeader>
            <CardContent>
              <TableSkeleton rows={5} columns={3} />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !receipt) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <XCircle className="h-12 w-12 text-red-500" />
              </div>
              <CardTitle>Receipt Not Found</CardTitle>
              <CardDescription>
                {error?.message || 'This verification link may be invalid or expired.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-muted-foreground">
                If you believe this is an error, please contact the sender.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Already verified state
  const alreadyVerified = receipt.status !== 'PENDING';

  // Calculate totals
  const totalExpectedQty = (receipt.items || []).reduce(
    (sum: number, item: any) => sum + (parseFloat(item.expectedQuantity) || 0),
    0
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header Card */}
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-primary/10 rounded-full">
                <ClipboardList className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl">Delivery Verification</CardTitle>
            <CardDescription>
              Please review and verify your delivery receipt
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Receipt Details Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">{receipt.receiptNumber}</CardTitle>
                <CardDescription>
                  {receipt.createdAt
                    ? format(new Date(receipt.createdAt), 'MMMM d, yyyy')
                    : 'Date not available'}
                </CardDescription>
              </div>
              <IntakeStatusBadge status={receipt.status as ReceiptStatus} />
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Supplier Info */}
            {receipt.supplierName && (
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <Building2 className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Supplier</div>
                  <div className="font-medium">{receipt.supplierName}</div>
                </div>
              </div>
            )}

            <Separator />

            {/* Items Table */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Package className="h-4 w-4" />
                <h3 className="font-semibold">Delivery Items</h3>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {receipt.items?.map((item: any, index: number) => (
                    <TableRow key={`page-item-${index}`}>
                      <TableCell className="font-medium">{item.productName}</TableCell>
                      <TableCell className="text-right">
                        {item.expectedQuantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.expectedPrice ? `$${parseFloat(item.expectedPrice).toFixed(2)}` : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="text-right text-sm text-muted-foreground mt-2 pr-2">
                Total Quantity: <span className="font-medium">{totalExpectedQty.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes */}
            {receipt.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap bg-muted/50 p-3 rounded-lg">
                    {receipt.notes}
                  </p>
                </div>
              </>
            )}

            {/* Verification Section */}
            <Separator />

            {alreadyVerified ? (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 mx-auto mb-2" />
                <h3 className="font-semibold text-green-800">Already Verified</h3>
                <p className="text-sm text-green-600 mt-1">
                  {receipt.farmerVerifiedAt
                    ? `Verified on ${format(new Date(receipt.farmerVerifiedAt), 'MMMM d, yyyy at h:mm a')}`
                    : 'This receipt has been verified.'}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">Verification Required</h3>
                  <p className="text-sm text-blue-600">
                    Please review the items above and confirm that they match your delivery.
                  </p>
                </div>

                {/* Acknowledgement Checkbox */}
                <div className="flex items-start space-x-3 p-4 border rounded-lg">
                  <Checkbox
                    id="acknowledge"
                    checked={acknowledged}
                    onCheckedChange={(checked) => setAcknowledged(checked === true)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor="acknowledge"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      I confirm this receipt is accurate
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      By checking this box, I acknowledge that the items and quantities listed above
                      accurately represent my delivery.
                    </p>
                  </div>
                </div>

                {/* Optional Notes */}
                <div className="space-y-2">
                  <Label htmlFor="notes">Additional Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any notes about this delivery..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>

                {/* Verify Button */}
                <Button
                  onClick={handleVerify}
                  disabled={!acknowledged || verifyMutation.isPending}
                  className="w-full"
                  size="lg"
                >
                  {verifyMutation.isPending ? (
                    'Verifying...'
                  ) : (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Verify Receipt
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          <p>This is an automated verification request.</p>
          <p>If you have questions, please contact the sender.</p>
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Verification</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to verify that the items in receipt <strong>{receipt.receiptNumber}</strong> are
              accurate. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmVerification} disabled={verifyMutation.isPending}>
              {verifyMutation.isPending ? 'Verifying...' : 'Confirm Verification'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

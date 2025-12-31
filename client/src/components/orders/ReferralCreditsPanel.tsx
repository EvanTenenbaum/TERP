/**
 * WS-004: Referral Credits Panel
 * Displays pending/available referral credits and allows applying them to an order
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Gift, DollarSign, Check, AlertCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/utils";

interface ReferralCreditsPanelProps {
  clientId: number;
  orderId: number;
  orderTotal: number;
  onCreditsApplied?: (appliedAmount: number, newTotal: number) => void;
}

export function ReferralCreditsPanel({
  clientId,
  orderId,
  orderTotal,
  onCreditsApplied,
}: ReferralCreditsPanelProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedCreditIds, setSelectedCreditIds] = useState<number[]>([]);

  const { data: creditsData, refetch } = trpc.referrals.getPendingCredits.useQuery(
    { clientId },
    { enabled: !!clientId }
  );

  const applyCredits = trpc.referrals.applyCreditsToOrder.useMutation({
    onSuccess: (result) => {
      refetch();
      setShowConfirmDialog(false);
      onCreditsApplied?.(result.appliedAmount, result.orderNewTotal);
    },
  });

  if (!creditsData || (creditsData.totalPending === 0 && creditsData.totalAvailable === 0)) {
    return null;
  }

  const handleApplyCredits = () => {
    applyCredits.mutate({
      orderId,
      creditIds: selectedCreditIds.length > 0 ? selectedCreditIds : undefined,
    });
  };

  const toggleCreditSelection = (creditId: number) => {
    setSelectedCreditIds((prev) =>
      prev.includes(creditId)
        ? prev.filter((id) => id !== creditId)
        : [...prev, creditId]
    );
  };

  const availableCredits = creditsData.credits.filter((c) => c.status === "AVAILABLE");
  const pendingCredits = creditsData.credits.filter((c) => c.status === "PENDING");

  return (
    <>
      <Card className="border-green-200 bg-green-50">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-green-700">
            <Gift className="h-5 w-5" />
            Referral Credits Available
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Available Credits */}
            {creditsData.totalAvailable > 0 && (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-lg font-semibold text-green-700">
                    {formatCurrency(creditsData.totalAvailable)}
                  </p>
                  <p className="text-sm text-green-600">
                    Available to apply ({availableCredits.length} referral{availableCredits.length !== 1 ? "s" : ""})
                  </p>
                </div>
                <Button
                  onClick={() => setShowConfirmDialog(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Apply Credits
                </Button>
              </div>
            )}

            {/* Pending Credits */}
            {creditsData.totalPending > 0 && (
              <div className="flex items-center gap-2 text-amber-600">
                <AlertCircle className="h-4 w-4" />
                <span className="text-sm">
                  {formatCurrency(creditsData.totalPending)} pending (awaiting order finalization)
                </span>
              </div>
            )}

            {/* Credit Details */}
            <div className="mt-2 space-y-1">
              {availableCredits.slice(0, 3).map((credit) => (
                <div
                  key={credit.id}
                  className="flex items-center justify-between text-sm text-green-600"
                >
                  <span>From: {credit.referredClientName}</span>
                  <Badge variant="outline" className="bg-green-100">
                    {formatCurrency(credit.creditAmount)}
                  </Badge>
                </div>
              ))}
              {availableCredits.length > 3 && (
                <p className="text-xs text-green-500">
                  +{availableCredits.length - 3} more credits
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Apply Referral Credits</DialogTitle>
            <DialogDescription>
              Select which credits to apply to this order, or apply all available credits.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-4">
            {availableCredits.map((credit) => (
              <div
                key={credit.id}
                className={`flex items-center justify-between rounded-lg border p-3 cursor-pointer transition-colors ${
                  selectedCreditIds.includes(credit.id)
                    ? "border-green-500 bg-green-50"
                    : "border-gray-200 hover:border-green-300"
                }`}
                onClick={() => toggleCreditSelection(credit.id)}
              >
                <div>
                  <p className="font-medium">{credit.referredClientName}</p>
                  <p className="text-sm text-gray-500">
                    Order: {credit.referredOrderNumber}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-green-600">
                    {formatCurrency(credit.creditAmount)}
                  </span>
                  {selectedCreditIds.includes(credit.id) && (
                    <Check className="h-5 w-5 text-green-600" />
                  )}
                </div>
              </div>
            ))}

            <div className="mt-4 rounded-lg bg-gray-50 p-3">
              <div className="flex justify-between text-sm">
                <span>Order Total:</span>
                <span>{formatCurrency(orderTotal)}</span>
              </div>
              <div className="flex justify-between text-sm text-green-600">
                <span>Credits to Apply:</span>
                <span>
                  -{formatCurrency(
                    selectedCreditIds.length > 0
                      ? availableCredits
                          .filter((c) => selectedCreditIds.includes(c.id))
                          .reduce((sum, c) => sum + c.creditAmount, 0)
                      : Math.min(creditsData.totalAvailable, orderTotal)
                  )}
                </span>
              </div>
              <div className="mt-2 flex justify-between font-semibold border-t pt-2">
                <span>New Total:</span>
                <span>
                  {formatCurrency(
                    Math.max(
                      0,
                      orderTotal -
                        (selectedCreditIds.length > 0
                          ? availableCredits
                              .filter((c) => selectedCreditIds.includes(c.id))
                              .reduce((sum, c) => sum + c.creditAmount, 0)
                          : Math.min(creditsData.totalAvailable, orderTotal))
                    )
                  )}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleApplyCredits}
              disabled={applyCredits.isPending}
              className="bg-green-600 hover:bg-green-700"
            >
              {applyCredits.isPending ? "Applying..." : "Apply Credits"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

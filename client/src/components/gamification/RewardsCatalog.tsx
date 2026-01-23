/**
 * Rewards Catalog Component
 * Sprint 5 Track B: MEET-045
 *
 * Displays available rewards that can be redeemed with points.
 */

import React, { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Gift,
  Coins,
  Percent,
  Truck,
  Crown,
  Star,
  ShoppingCart,
  Check,
  AlertCircle,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RewardsCatalogProps {
  clientId: number;
  compact?: boolean;
}

// Reward type icons
const REWARD_ICONS = {
  MARKUP_DISCOUNT: Percent,
  FIXED_DISCOUNT: ShoppingCart,
  FREE_SHIPPING: Truck,
  PRIORITY_SERVICE: Crown,
  EXCLUSIVE_ACCESS: Star,
  CUSTOM: Gift,
};

export const RewardsCatalog = React.memo(function RewardsCatalog({
  clientId,
  compact = false,
}: RewardsCatalogProps) {
  const { toast } = useToast();
  const [selectedReward, setSelectedReward] = useState<number | null>(null);
  const [redeemNotes, setRedeemNotes] = useState("");
  const [isRedeeming, setIsRedeeming] = useState(false);

  const utils = trpc.useUtils();

  // Fetch rewards catalog
  const {
    data: catalogData,
    isLoading,
    error,
    refetch,
  } = trpc.gamification.rewards.listCatalog.useQuery({ clientId });

  // Redeem mutation
  const redeemMutation = trpc.gamification.rewards.redeem.useMutation({
    onSuccess: (data: { newBalance: number }) => {
      toast({
        title: "Reward Redeemed!",
        description: `You now have ${data.newBalance.toLocaleString()} points remaining.`,
      });
      // Note: invalidation calls will work once trpc types are regenerated
      void utils.invalidate();
      setSelectedReward(null);
      setRedeemNotes("");
    },
    onError: (error: { message: string }) => {
      toast({
        title: "Redemption Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRedeem = useCallback(async () => {
    if (!selectedReward) return;
    setIsRedeeming(true);
    try {
      await redeemMutation.mutateAsync({
        clientId,
        rewardId: selectedReward,
        notes: redeemNotes || undefined,
      });
    } finally {
      setIsRedeeming(false);
    }
  }, [clientId, selectedReward, redeemNotes, redeemMutation]);

  interface RewardItem {
    id: number;
    code: string;
    name: string;
    description: string;
    pointsCost: number;
    rewardType: string;
    rewardValue: string | number;
    icon: string | null;
    color: string | null;
    imageUrl: string | null;
    isActive: boolean;
    availableFrom: Date | string | null;
    availableUntil: Date | string | null;
    quantityAvailable: number | null;
    quantityRedeemed: number;
    minTierRequired: string | null;
    minAchievementsRequired: number | null;
    canAfford: boolean;
    inStock: boolean;
  }
  const selectedRewardData = catalogData?.rewards.find(
    (r: RewardItem) => r.id === selectedReward
  );

  return (
    <>
      <Card className={compact ? "border-0 shadow-none" : ""}>
        <CardHeader className={compact ? "px-0 pt-0" : ""}>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-purple-500" />
                Rewards Catalog
              </CardTitle>
              <CardDescription>
                Redeem your points for exclusive rewards
              </CardDescription>
            </div>
            {catalogData && (
              <div className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-yellow-500" />
                <span className="font-bold text-lg">
                  {catalogData.clientPoints.toLocaleString()}
                </span>
                <span className="text-muted-foreground text-sm">points</span>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className={compact ? "px-0" : ""}>
          {/* Loading State */}
          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={`skeleton-${i}`} className="h-48" />
              ))}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="text-center py-8 text-red-600">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>Error loading rewards: {error.message}</p>
              <Button
                variant="outline"
                onClick={() => refetch()}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Rewards Grid */}
          {!isLoading && !error && catalogData && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogData.rewards.map((reward: RewardItem) => {
                const Icon =
                  REWARD_ICONS[
                    reward.rewardType as keyof typeof REWARD_ICONS
                  ] ?? Gift;
                const canAfford = reward.canAfford;
                const inStock = reward.inStock;
                const isAvailable = canAfford && inStock;

                return (
                  <Card
                    key={reward.id}
                    className={cn(
                      "relative transition-all duration-200",
                      isAvailable
                        ? "hover:shadow-lg hover:border-primary cursor-pointer"
                        : "opacity-60"
                    )}
                    onClick={() => isAvailable && setSelectedReward(reward.id)}
                  >
                    {/* Status Badges */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {!inStock && (
                        <Badge variant="destructive" className="text-xs">
                          Out of Stock
                        </Badge>
                      )}
                      {reward.minTierRequired && (
                        <Badge variant="secondary" className="text-xs">
                          {reward.minTierRequired}+
                        </Badge>
                      )}
                    </div>

                    <CardHeader className="pb-3">
                      <div
                        className={cn(
                          "w-12 h-12 rounded-lg flex items-center justify-center mb-2",
                          isAvailable
                            ? "bg-primary/10 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                      <CardTitle className="text-base">{reward.name}</CardTitle>
                      <CardDescription className="text-xs line-clamp-2">
                        {reward.description}
                      </CardDescription>
                    </CardHeader>

                    <CardContent className="pb-3">
                      {/* Reward Value */}
                      <div className="flex items-baseline gap-1 mb-2">
                        <span className="text-2xl font-bold text-primary">
                          {reward.rewardType === "MARKUP_DISCOUNT" ||
                          reward.rewardType === "FIXED_DISCOUNT"
                            ? `${Number(reward.rewardValue)}${
                                reward.rewardType === "MARKUP_DISCOUNT"
                                  ? "%"
                                  : ""
                              }`
                            : ""}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {reward.rewardType === "MARKUP_DISCOUNT"
                            ? "off markup"
                            : reward.rewardType === "FIXED_DISCOUNT"
                              ? "off order"
                              : ""}
                        </span>
                      </div>

                      {/* Availability info */}
                      {reward.availableUntil && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          Expires{" "}
                          {new Date(reward.availableUntil).toLocaleDateString()}
                        </div>
                      )}
                      {reward.quantityAvailable !== null && (
                        <div className="text-xs text-muted-foreground">
                          {reward.quantityAvailable -
                            (reward.quantityRedeemed ?? 0)}{" "}
                          left
                        </div>
                      )}
                    </CardContent>

                    <CardFooter className="pt-0">
                      <div className="w-full flex items-center justify-between">
                        <div className="flex items-center gap-1">
                          <Coins className="h-4 w-4 text-yellow-500" />
                          <span
                            className={cn(
                              "font-bold",
                              canAfford ? "text-foreground" : "text-red-500"
                            )}
                          >
                            {reward.pointsCost.toLocaleString()}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          disabled={!isAvailable}
                          onClick={e => {
                            e.stopPropagation();
                            setSelectedReward(reward.id);
                          }}
                        >
                          {isAvailable
                            ? "Redeem"
                            : canAfford
                              ? "Unavailable"
                              : "Need More Points"}
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Empty State */}
          {!isLoading && !error && catalogData?.rewards.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Gift className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No rewards available</p>
              <p className="text-sm">Check back later for new rewards!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Redemption Confirmation Dialog */}
      <Dialog
        open={!!selectedReward}
        onOpenChange={() => setSelectedReward(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Redemption</DialogTitle>
            <DialogDescription>
              You are about to redeem the following reward:
            </DialogDescription>
          </DialogHeader>

          {selectedRewardData && (
            <div className="py-4">
              <div className="flex items-start gap-4 p-4 bg-muted rounded-lg">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                  {(() => {
                    const Icon =
                      REWARD_ICONS[
                        selectedRewardData.rewardType as keyof typeof REWARD_ICONS
                      ] ?? Gift;
                    return <Icon className="h-6 w-6 text-primary" />;
                  })()}
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold">{selectedRewardData.name}</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedRewardData.description}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Coins className="h-4 w-4 text-yellow-500" />
                    <span className="font-bold">
                      {selectedRewardData.pointsCost.toLocaleString()} points
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4">
                <label className="text-sm font-medium">Notes (optional)</label>
                <Textarea
                  value={redeemNotes}
                  onChange={e => setRedeemNotes(e.target.value)}
                  placeholder="Any special instructions or notes..."
                  className="mt-1"
                />
              </div>

              <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-700 dark:text-yellow-300">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm">
                    After redemption, you will have{" "}
                    <strong>
                      {(
                        (catalogData?.clientPoints ?? 0) -
                        selectedRewardData.pointsCost
                      ).toLocaleString()}
                    </strong>{" "}
                    points remaining.
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSelectedReward(null)}
              disabled={isRedeeming}
            >
              Cancel
            </Button>
            <Button onClick={handleRedeem} disabled={isRedeeming}>
              {isRedeeming ? (
                "Redeeming..."
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Confirm Redemption
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
});

export default RewardsCatalog;

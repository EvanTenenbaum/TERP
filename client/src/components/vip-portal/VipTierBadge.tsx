/**
 * Sprint 5 Track A - Task 5.A.1: MEET-043 - VIP Status (Debt Cycling Tiers)
 *
 * VIP Tier Badge Component
 * Displays the client's VIP tier status with visual indicators:
 * - Tier badge with color and icon
 * - Progress to next tier
 * - Key metrics (payment speed, volume, loyalty)
 */

import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Award,
  Crown,
  Gem,
  Medal,
  Star,
  Clock,
  DollarSign,
  Heart,
  ChevronRight,
  Info,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";

interface VipTierBadgeProps {
  clientId: number;
  variant?: "compact" | "card" | "full";
  showMetrics?: boolean;
  showProgress?: boolean;
}

// Map tier names to icons
const tierIcons: Record<string, React.ElementType> = {
  diamond: Gem,
  platinum: Crown,
  gold: Star,
  silver: Medal,
  bronze: Medal,
};

// Get icon component for tier
function getTierIcon(tierName: string | undefined): React.ElementType {
  if (!tierName) return Award;
  const name = tierName.toLowerCase();
  return tierIcons[name] || Award;
}

export function VipTierBadge({
  clientId,
  variant = "compact",
  showMetrics = false,
  showProgress = true,
}: VipTierBadgeProps) {
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: vipStatus, isLoading } =
    trpc.vipTiers.getClientStatusDetailed.useQuery(
      { clientId },
      { enabled: clientId > 0 }
    );

  if (isLoading) {
    return (
      <Badge variant="secondary" className="animate-pulse">
        Loading...
      </Badge>
    );
  }

  if (!vipStatus) {
    return null;
  }

  const TierIcon = getTierIcon(vipStatus.currentTier?.name);
  const tierColor = vipStatus.currentTier?.color || "#6B7280";
  const tierName = vipStatus.currentTier?.displayName || "Standard";

  // Compact variant - just a badge
  if (variant === "compact") {
    return (
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogTrigger asChild>
          <Badge
            variant="secondary"
            className="cursor-pointer hover:opacity-80 transition-opacity text-base gap-1 px-3 py-1"
            style={{
              backgroundColor: `${tierColor}20`,
              color: tierColor,
              borderColor: tierColor,
            }}
          >
            <TierIcon className="h-4 w-4" />
            {tierName}
          </Badge>
        </DialogTrigger>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TierIcon className="h-5 w-5" style={{ color: tierColor }} />
              Your VIP Status
            </DialogTitle>
            <DialogDescription>
              {vipStatus.currentTier?.description ||
                "Your current VIP tier and benefits"}
            </DialogDescription>
          </DialogHeader>
          <VipTierDetails vipStatus={vipStatus} />
        </DialogContent>
      </Dialog>
    );
  }

  // Card variant - small card with key info
  if (variant === "card") {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">VIP Status</CardTitle>
          <Award className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 mb-2">
            <TierIcon className="h-5 w-5" style={{ color: tierColor }} />
            <span className="text-lg font-bold" style={{ color: tierColor }}>
              {tierName}
            </span>
          </div>

          {showProgress && vipStatus.nextTier && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress to {vipStatus.nextTier.displayName}</span>
                <span>{Math.round(vipStatus.progress)}%</span>
              </div>
              <Progress value={vipStatus.progress} className="h-2" />
            </div>
          )}

          {!vipStatus.nextTier && (
            <p className="text-xs text-muted-foreground">Top tier achieved!</p>
          )}

          {showMetrics && vipStatus.metrics && (
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="text-xs text-muted-foreground">Speed</div>
                <div className="text-sm font-medium">
                  {vipStatus.metrics.paymentSpeedScore}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Volume</div>
                <div className="text-sm font-medium">
                  {vipStatus.metrics.volumeScore}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Loyalty</div>
                <div className="text-sm font-medium">
                  {vipStatus.metrics.loyaltyScore}
                </div>
              </div>
            </div>
          )}

          <Button
            variant="ghost"
            size="sm"
            className="w-full mt-2 text-xs"
            onClick={() => setDetailsOpen(true)}
          >
            View Details
            <ChevronRight className="h-3 w-3 ml-1" />
          </Button>

          <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <TierIcon className="h-5 w-5" style={{ color: tierColor }} />
                  Your VIP Status
                </DialogTitle>
                <DialogDescription>
                  {vipStatus.currentTier?.description ||
                    "Your current VIP tier and benefits"}
                </DialogDescription>
              </DialogHeader>
              <VipTierDetails vipStatus={vipStatus} />
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    );
  }

  // Full variant - detailed display
  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="p-3 rounded-full"
              style={{ backgroundColor: `${tierColor}20` }}
            >
              <TierIcon className="h-8 w-8" style={{ color: tierColor }} />
            </div>
            <div>
              <CardTitle className="text-2xl" style={{ color: tierColor }}>
                {tierName}
              </CardTitle>
              <CardDescription>
                {vipStatus.currentTier?.description || "VIP Member"}
              </CardDescription>
            </div>
          </div>
          {vipStatus.isManualOverride && (
            <Badge variant="outline" className="text-xs">
              <Info className="h-3 w-3 mr-1" />
              Manual Override
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <VipTierDetails vipStatus={vipStatus} />
      </CardContent>
    </Card>
  );
}

// Detailed tier information component
function VipTierDetails({ vipStatus }: { vipStatus: VipStatusData }) {
  const tierColor = vipStatus.currentTier?.color || "#6B7280";
  const formatCurrency = (value: number) =>
    `$${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  return (
    <div className="space-y-6">
      {/* Score Breakdown */}
      <div>
        <h4 className="text-sm font-medium mb-3">Performance Metrics</h4>
        <div className="space-y-3">
          <MetricBar
            icon={Clock}
            label="Payment Speed"
            value={vipStatus.metrics?.paymentSpeedScore || 0}
            description={`Avg ${vipStatus.metrics?.avgDaysToPay || 0} days to pay`}
            color="#3B82F6"
          />
          <MetricBar
            icon={DollarSign}
            label="Volume"
            value={vipStatus.metrics?.volumeScore || 0}
            description={`${formatCurrency(vipStatus.metrics?.ytdSpend || 0)} YTD`}
            color="#10B981"
          />
          <MetricBar
            icon={Heart}
            label="Loyalty"
            value={vipStatus.metrics?.loyaltyScore || 0}
            description={`${vipStatus.metrics?.accountAgeDays || 0} days active`}
            color="#F59E0B"
          />
        </div>

        <div className="mt-4 p-3 rounded-lg bg-muted/50">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Overall Score</span>
            <span className="text-lg font-bold" style={{ color: tierColor }}>
              {vipStatus.metrics?.overallScore || 0}/100
            </span>
          </div>
        </div>
      </div>

      {/* Progress to Next Tier */}
      {vipStatus.nextTier && (
        <div>
          <h4 className="text-sm font-medium mb-2">
            Progress to {vipStatus.nextTier.displayName}
          </h4>
          <Progress value={vipStatus.progress} className="h-3" />
          <p className="text-xs text-muted-foreground mt-1">
            {Math.round(vipStatus.progress)}% complete
          </p>
        </div>
      )}

      {/* Current Tier Benefits */}
      {vipStatus.currentTier && (
        <div>
          <h4 className="text-sm font-medium mb-2">Your Benefits</h4>
          <div className="grid grid-cols-2 gap-2">
            {vipStatus.currentTier.prioritySupport && (
              <BenefitItem label="Priority Support" active />
            )}
            {vipStatus.currentTier.freeShipping && (
              <BenefitItem label="Free Shipping" active />
            )}
            {vipStatus.currentTier.earlyAccessToProducts && (
              <BenefitItem label="Early Access" active />
            )}
            {vipStatus.currentTier.dedicatedRep && (
              <BenefitItem label="Dedicated Rep" active />
            )}
            {parseFloat(
              String(vipStatus.currentTier.discountPercentage || "0")
            ) > 0 && (
              <BenefitItem
                label={`${vipStatus.currentTier.discountPercentage}% Discount`}
                active
              />
            )}
            {parseFloat(
              String(vipStatus.currentTier.creditLimitMultiplier || "1")
            ) > 1 && (
              <BenefitItem
                label={`${((parseFloat(String(vipStatus.currentTier.creditLimitMultiplier)) - 1) * 100).toFixed(0)}% Credit Boost`}
                active
              />
            )}
          </div>
        </div>
      )}

      {/* Statistics */}
      <div>
        <h4 className="text-sm font-medium mb-2">Statistics</h4>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">YTD Spend</span>
            <span className="font-medium">
              {formatCurrency(vipStatus.metrics?.ytdSpend || 0)}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">YTD Orders</span>
            <span className="font-medium">
              {vipStatus.metrics?.ytdOrders || 0}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">On-Time Rate</span>
            <span className="font-medium">
              {vipStatus.metrics?.onTimePaymentRate || 0}%
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">All Time Spend</span>
            <span className="font-medium">
              {formatCurrency(vipStatus.metrics?.lifetimeSpend || 0)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Metric bar component
function MetricBar({
  icon: Icon,
  label,
  value,
  description,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  description: string;
  color: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4" style={{ color }} />
          <span className="font-medium">{label}</span>
        </div>
        <span className="font-bold">{value}/100</span>
      </div>
      <Progress value={value} className="h-2" />
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  );
}

// Benefit item component
function BenefitItem({ label, active }: { label: string; active: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 p-2 rounded text-sm",
        active ? "bg-green-50 text-green-700" : "bg-muted text-muted-foreground"
      )}
    >
      <div
        className={cn(
          "h-2 w-2 rounded-full",
          active ? "bg-green-500" : "bg-muted-foreground"
        )}
      />
      {label}
    </div>
  );
}

// Type for VIP status data
interface VipStatusData {
  clientId: number;
  currentTier: {
    id: number;
    name: string;
    displayName: string;
    description: string | null;
    level: number;
    color: string;
    icon: string | null;
    prioritySupport: boolean | null;
    freeShipping: boolean | null;
    earlyAccessToProducts: boolean | null;
    dedicatedRep: boolean | null;
    discountPercentage: string | null;
    creditLimitMultiplier: string | null;
  } | null;
  nextTier: {
    id: number;
    displayName: string;
  } | null;
  metrics: {
    paymentSpeedScore: number;
    volumeScore: number;
    loyaltyScore: number;
    overallScore: number;
    avgDaysToPay: number;
    onTimePaymentRate: number;
    ytdSpend: number;
    ytdOrders: number;
    lifetimeSpend: number;
    lifetimeOrders: number;
    accountAgeDays: number;
  } | null;
  progress: number;
  isManualOverride: boolean;
  lastUpdated: Date | null;
}

export default VipTierBadge;

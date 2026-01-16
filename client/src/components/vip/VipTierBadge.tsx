/**
 * VIP Tier Badge Component (FEAT-019)
 * Displays visual indicator of client's VIP tier status
 */

import React from "react";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Crown,
  Star,
  Award,
  Medal,
  Gem,
  Shield,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

// VIP Tier type definition
export interface VipTier {
  id: number;
  name: string;
  displayName: string;
  description?: string | null;
  level: number;
  color: string;
  icon?: string | null;
  discountPercentage?: string | number | null;
  prioritySupport?: boolean;
  freeShipping?: boolean;
}

// Predefined tier configurations for default styling
const DEFAULT_TIERS: Record<string, { icon: LucideIcon; className: string }> = {
  bronze: {
    icon: Medal,
    className: "bg-amber-700 hover:bg-amber-600 text-white",
  },
  silver: {
    icon: Star,
    className: "bg-slate-400 hover:bg-slate-300 text-white",
  },
  gold: {
    icon: Crown,
    className: "bg-amber-500 hover:bg-amber-400 text-white",
  },
  platinum: {
    icon: Gem,
    className: "bg-slate-600 hover:bg-slate-500 text-white",
  },
  diamond: {
    icon: Gem,
    className: "bg-cyan-400 hover:bg-cyan-300 text-slate-900",
  },
  elite: {
    icon: Crown,
    className: "bg-purple-600 hover:bg-purple-500 text-white",
  },
};

// Map icon names to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  crown: Crown,
  star: Star,
  award: Award,
  medal: Medal,
  gem: Gem,
  shield: Shield,
};

export interface VipTierBadgeProps {
  tier?: VipTier | null;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  showIcon?: boolean;
  className?: string;
}

export const VipTierBadge = React.memo(function VipTierBadge({
  tier,
  size = "md",
  showTooltip = true,
  showIcon = true,
  className,
}: VipTierBadgeProps) {
  if (!tier) {
    return null;
  }

  const tierKey = tier.name.toLowerCase();
  const defaultConfig = DEFAULT_TIERS[tierKey];
  const IconComponent = tier.icon
    ? ICON_MAP[tier.icon.toLowerCase()] || Star
    : defaultConfig?.icon || Star;

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-0.5",
    lg: "text-base px-3 py-1",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const badgeContent = (
    <Badge
      className={cn(
        "font-semibold inline-flex items-center gap-1",
        sizeClasses[size],
        defaultConfig?.className || "bg-primary hover:bg-primary/90",
        className
      )}
      style={
        !defaultConfig
          ? {
              backgroundColor: tier.color,
              color: isLightColor(tier.color) ? "#1a1a1a" : "#ffffff",
            }
          : undefined
      }
    >
      {showIcon && <IconComponent className={iconSizes[size]} />}
      {tier.displayName}
    </Badge>
  );

  if (!showTooltip || !tier.description) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-2">
            <p className="font-semibold">{tier.displayName}</p>
            {tier.description && (
              <p className="text-sm text-muted-foreground">{tier.description}</p>
            )}
            <div className="text-xs space-y-1">
              {tier.discountPercentage && Number(tier.discountPercentage) > 0 && (
                <p>Tier Discount: {tier.discountPercentage}%</p>
              )}
              {tier.prioritySupport && <p>Priority Support</p>}
              {tier.freeShipping && <p>Free Shipping</p>}
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

/**
 * VIP Tier Progress Indicator
 * Shows progress to next tier
 */
export interface VipTierProgressProps {
  currentTier?: VipTier | null;
  nextTier?: VipTier | null;
  progress: number; // 0-100
  showDetails?: boolean;
  className?: string;
}

export const VipTierProgress = React.memo(function VipTierProgress({
  currentTier,
  nextTier,
  progress,
  showDetails = false,
  className,
}: VipTierProgressProps) {
  const clampedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          {currentTier && <VipTierBadge tier={currentTier} size="sm" />}
        </div>
        {nextTier && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>Next:</span>
            <VipTierBadge tier={nextTier} size="sm" showTooltip={false} />
          </div>
        )}
      </div>
      <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${clampedProgress}%`,
            backgroundColor: nextTier?.color || currentTier?.color || "#6B7280",
          }}
        />
      </div>
      {showDetails && (
        <p className="text-xs text-muted-foreground text-center">
          {clampedProgress.toFixed(0)}% to {nextTier?.displayName || "next tier"}
        </p>
      )}
    </div>
  );
});

/**
 * Utility function to determine if a color is light
 */
function isLightColor(hexColor: string): boolean {
  const hex = hexColor.replace("#", "");
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5;
}

export default VipTierBadge;

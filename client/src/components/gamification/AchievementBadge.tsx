/**
 * Achievement Badge Component
 * Sprint 5 Track B: MEET-045
 *
 * Displays individual achievement badges with medal styling.
 */

import React from "react";
import {
  Award,
  Trophy,
  Medal,
  Star,
  Crown,
  Target,
  Zap,
  Heart,
  Gift,
  Users,
  TrendingUp,
  ShoppingCart,
  Clock,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

type MedalType = "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
type AchievementCategory =
  | "SPENDING"
  | "ORDERS"
  | "LOYALTY"
  | "REFERRALS"
  | "ENGAGEMENT"
  | "SPECIAL";

interface AchievementBadgeProps {
  name: string;
  description: string;
  medal: MedalType;
  category: AchievementCategory;
  icon?: string;
  color?: string;
  earnedAt?: Date | string;
  pointsAwarded?: number;
  size?: "sm" | "md" | "lg";
  showTooltip?: boolean;
  isPinned?: boolean;
  onClick?: () => void;
}

// Medal color schemes
const MEDAL_COLORS: Record<
  MedalType,
  { bg: string; border: string; text: string; glow: string }
> = {
  BRONZE: {
    bg: "bg-amber-100",
    border: "border-amber-400",
    text: "text-amber-700",
    glow: "shadow-amber-200",
  },
  SILVER: {
    bg: "bg-gray-100",
    border: "border-gray-400",
    text: "text-gray-600",
    glow: "shadow-gray-200",
  },
  GOLD: {
    bg: "bg-yellow-100",
    border: "border-yellow-400",
    text: "text-yellow-700",
    glow: "shadow-yellow-200",
  },
  PLATINUM: {
    bg: "bg-purple-100",
    border: "border-purple-400",
    text: "text-purple-700",
    glow: "shadow-purple-200",
  },
};

// Category icons
const CATEGORY_ICONS: Record<AchievementCategory, React.ReactNode> = {
  SPENDING: <ShoppingCart className="h-full w-full" />,
  ORDERS: <Target className="h-full w-full" />,
  LOYALTY: <Heart className="h-full w-full" />,
  REFERRALS: <Users className="h-full w-full" />,
  ENGAGEMENT: <Zap className="h-full w-full" />,
  SPECIAL: <Star className="h-full w-full" />,
};

// Icon name mapping
const ICON_MAP: Record<string, React.ReactNode> = {
  award: <Award className="h-full w-full" />,
  trophy: <Trophy className="h-full w-full" />,
  medal: <Medal className="h-full w-full" />,
  star: <Star className="h-full w-full" />,
  crown: <Crown className="h-full w-full" />,
  target: <Target className="h-full w-full" />,
  zap: <Zap className="h-full w-full" />,
  heart: <Heart className="h-full w-full" />,
  gift: <Gift className="h-full w-full" />,
  users: <Users className="h-full w-full" />,
  "trending-up": <TrendingUp className="h-full w-full" />,
  "shopping-cart": <ShoppingCart className="h-full w-full" />,
  clock: <Clock className="h-full w-full" />,
};

// Size configurations
const SIZE_CONFIG = {
  sm: { container: "w-10 h-10", icon: "w-5 h-5", text: "text-xs" },
  md: { container: "w-14 h-14", icon: "w-7 h-7", text: "text-sm" },
  lg: { container: "w-20 h-20", icon: "w-10 h-10", text: "text-base" },
};

export const AchievementBadge = React.memo(function AchievementBadge({
  name,
  description,
  medal,
  category,
  icon = "award",
  earnedAt,
  pointsAwarded,
  size = "md",
  showTooltip = true,
  isPinned = false,
  onClick,
}: AchievementBadgeProps) {
  const colors = MEDAL_COLORS[medal];
  const sizeConfig = SIZE_CONFIG[size];
  const displayIcon = ICON_MAP[icon] ?? CATEGORY_ICONS[category];

  const badgeContent = (
    <div
      className={cn(
        "relative rounded-full border-2 flex items-center justify-center cursor-pointer transition-all duration-200",
        "hover:scale-110 hover:shadow-lg",
        colors.bg,
        colors.border,
        colors.text,
        colors.glow,
        sizeConfig.container,
        isPinned && "ring-2 ring-primary ring-offset-2",
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className={sizeConfig.icon}>{displayIcon}</div>

      {/* Medal indicator */}
      <div
        className={cn(
          "absolute -bottom-1 -right-1 rounded-full flex items-center justify-center",
          "text-[8px] font-bold",
          medal === "PLATINUM" && "bg-purple-500 text-white w-4 h-4",
          medal === "GOLD" && "bg-yellow-500 text-white w-4 h-4",
          medal === "SILVER" && "bg-gray-400 text-white w-4 h-4",
          medal === "BRONZE" && "bg-amber-600 text-white w-4 h-4"
        )}
      >
        {medal === "PLATINUM" && "P"}
        {medal === "GOLD" && "G"}
        {medal === "SILVER" && "S"}
        {medal === "BRONZE" && "B"}
      </div>

      {/* Pinned indicator */}
      {isPinned && (
        <div className="absolute -top-1 -left-1 w-4 h-4 bg-primary text-primary-foreground rounded-full flex items-center justify-center">
          <Star className="w-2 h-2" />
        </div>
      )}
    </div>
  );

  if (!showTooltip) {
    return badgeContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
        <TooltipContent className="max-w-xs">
          <div className="space-y-1">
            <div className="font-semibold flex items-center gap-2">
              {name}
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded",
                  colors.bg,
                  colors.text
                )}
              >
                {medal}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">{description}</p>
            {earnedAt && (
              <p className="text-xs text-muted-foreground">
                Earned:{" "}
                {new Date(earnedAt).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </p>
            )}
            {pointsAwarded !== undefined && pointsAwarded > 0 && (
              <p className="text-xs font-medium text-primary">
                +{pointsAwarded.toLocaleString()} points
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
});

/**
 * Medal Summary Component
 * Shows a count summary of medals by type
 */
interface MedalSummaryProps {
  bronzeCount: number;
  silverCount: number;
  goldCount: number;
  platinumCount: number;
  size?: "sm" | "md" | "lg";
}

export const MedalSummary = React.memo(function MedalSummary({
  bronzeCount,
  silverCount,
  goldCount,
  platinumCount,
  size = "md",
}: MedalSummaryProps) {
  const medals = [
    { type: "PLATINUM" as const, count: platinumCount, label: "Platinum" },
    { type: "GOLD" as const, count: goldCount, label: "Gold" },
    { type: "SILVER" as const, count: silverCount, label: "Silver" },
    { type: "BRONZE" as const, count: bronzeCount, label: "Bronze" },
  ];

  const sizeConfig = SIZE_CONFIG[size];

  return (
    <div className="flex items-center gap-3">
      {medals.map(({ type, count }) => {
        const colors = MEDAL_COLORS[type];
        return (
          <div key={type} className="flex items-center gap-1">
            <div
              className={cn(
                "rounded-full flex items-center justify-center",
                colors.bg,
                colors.text,
                size === "sm" && "w-6 h-6",
                size === "md" && "w-8 h-8",
                size === "lg" && "w-10 h-10"
              )}
            >
              <Medal
                className={cn(
                  size === "sm" && "w-3 h-3",
                  size === "md" && "w-4 h-4",
                  size === "lg" && "w-5 h-5"
                )}
              />
            </div>
            <span className={cn("font-medium", sizeConfig.text)}>{count}</span>
          </div>
        );
      })}
    </div>
  );
});

export default AchievementBadge;

/**
 * Points Display Component
 * Sprint 5 Track B: MEET-045
 *
 * Displays client's points balance, history, and statistics.
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Coins,
  TrendingUp,
  Gift,
  Award,
  Users,
  Clock,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

interface PointsDisplayProps {
  clientId: number;
  showHistory?: boolean;
  compact?: boolean;
}

// Transaction type icons and colors
const TRANSACTION_STYLES = {
  EARNED_ACHIEVEMENT: {
    icon: Award,
    color: "text-yellow-600",
    bg: "bg-yellow-50",
  },
  EARNED_PURCHASE: {
    icon: TrendingUp,
    color: "text-green-600",
    bg: "bg-green-50",
  },
  EARNED_REFERRAL: { icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
  EARNED_BONUS: { icon: Gift, color: "text-purple-600", bg: "bg-purple-50" },
  REDEEMED: { icon: Gift, color: "text-red-600", bg: "bg-red-50" },
  EXPIRED: { icon: Clock, color: "text-gray-600", bg: "bg-gray-50" },
  ADJUSTED: { icon: TrendingUp, color: "text-orange-600", bg: "bg-orange-50" },
};

export const PointsDisplay = React.memo(function PointsDisplay({
  clientId,
  showHistory = true,
  compact = false,
}: PointsDisplayProps) {
  const [showFullHistory, setShowFullHistory] = useState(false);

  // Fetch points balance
  const { data: balance, isLoading: balanceLoading } =
    trpc.gamification.points.getBalance.useQuery({ clientId });

  // Fetch points history
  const { data: history, isLoading: historyLoading } =
    trpc.gamification.points.getHistory.useQuery(
      { clientId, limit: showFullHistory ? 25 : 5 },
      { enabled: showHistory }
    );

  return (
    <Card className={compact ? "border-0 shadow-none" : ""}>
      <CardHeader className={cn(compact ? "px-0 pt-0" : "", "pb-3")}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Coins className="h-5 w-5 text-yellow-500" />
              Reward Points
            </CardTitle>
            {!compact && (
              <CardDescription>
                Earn points from purchases and achievements
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className={compact ? "px-0" : ""}>
        {/* Balance Display */}
        {balanceLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {/* Current Balance */}
            <div className="col-span-2 sm:col-span-1 bg-primary/5 rounded-lg p-4 text-center">
              <div className="text-3xl font-bold text-primary">
                {(balance?.currentBalance ?? 0).toLocaleString()}
              </div>
              <div className="text-sm text-muted-foreground">
                Available Points
              </div>
            </div>

            {/* Lifetime Earned */}
            <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 text-center">
              <div className="text-xl font-semibold text-green-700 dark:text-green-300">
                {(balance?.lifetimeEarned ?? 0).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">
                Lifetime Earned
              </div>
            </div>

            {/* Lifetime Redeemed */}
            <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 text-center">
              <div className="text-xl font-semibold text-blue-700 dark:text-blue-300">
                {(balance?.lifetimeRedeemed ?? 0).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Redeemed</div>
            </div>

            {/* Expired */}
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 text-center">
              <div className="text-xl font-semibold text-gray-600 dark:text-gray-400">
                {(balance?.lifetimeExpired ?? 0).toLocaleString()}
              </div>
              <div className="text-xs text-muted-foreground">Expired</div>
            </div>
          </div>
        )}

        {/* Points History */}
        {showHistory && (
          <Collapsible open={showFullHistory} onOpenChange={setShowFullHistory}>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium">Recent Activity</h4>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm">
                  {showFullHistory ? (
                    <>
                      Show Less <ChevronUp className="ml-1 h-4 w-4" />
                    </>
                  ) : (
                    <>
                      Show More <ChevronDown className="ml-1 h-4 w-4" />
                    </>
                  )}
                </Button>
              </CollapsibleTrigger>
            </div>

            {historyLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : history?.entries.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No points activity yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Show first 5 items always */}
                {history?.entries
                  .slice(0, 5)
                  .map((entry: PointsHistoryEntry) => (
                    <PointsHistoryItem key={entry.id} entry={entry} />
                  ))}

                {/* Show remaining items in collapsible */}
                <CollapsibleContent className="space-y-2">
                  {history?.entries
                    .slice(5)
                    .map((entry: PointsHistoryEntry) => (
                      <PointsHistoryItem key={entry.id} entry={entry} />
                    ))}
                </CollapsibleContent>
              </div>
            )}

            {/* Total count indicator */}
            {history && history.totalCount > (showFullHistory ? 25 : 5) && (
              <div className="mt-3 text-center text-sm text-muted-foreground">
                Showing{" "}
                {Math.min(showFullHistory ? 25 : 5, history.entries.length)} of{" "}
                {history.totalCount} transactions
              </div>
            )}
          </Collapsible>
        )}
      </CardContent>
    </Card>
  );
});

// Points History Item Component
interface PointsHistoryEntry {
  id: number;
  transactionType: string;
  points: number;
  balanceAfter: number;
  description: string;
  createdAt: Date | string;
  expiresAt?: Date | string | null;
}

const PointsHistoryItem = React.memo(function PointsHistoryItem({
  entry,
}: {
  entry: PointsHistoryEntry;
}) {
  const style =
    TRANSACTION_STYLES[
      entry.transactionType as keyof typeof TRANSACTION_STYLES
    ] ?? TRANSACTION_STYLES.ADJUSTED;
  const Icon = style.icon;
  const isPositive = entry.points > 0;

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 rounded-lg",
        style.bg,
        "dark:bg-opacity-20"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "p-2 rounded-full bg-white dark:bg-gray-800",
            style.color
          )}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div>
          <div className="font-medium text-sm">{entry.description}</div>
          <div className="text-xs text-muted-foreground">
            {new Date(entry.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>
        </div>
      </div>
      <div className="text-right">
        <div
          className={cn(
            "font-semibold",
            isPositive ? "text-green-600" : "text-red-600"
          )}
        >
          {isPositive ? "+" : ""}
          {entry.points.toLocaleString()}
        </div>
        <div className="text-xs text-muted-foreground">
          Balance: {entry.balanceAfter.toLocaleString()}
        </div>
      </div>
    </div>
  );
});

export default PointsDisplay;

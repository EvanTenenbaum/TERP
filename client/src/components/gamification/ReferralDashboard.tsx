/**
 * Referral Dashboard Component
 * Sprint 5 Track B: FEAT-006
 *
 * Displays referral code, stats, and couch tax tracking.
 */

import React, { useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import {
  Users,
  Copy,
  Check,
  Clock,
  Gift,
  TrendingUp,
  UserPlus,
  CheckCircle,
  XCircle,
  AlertCircle,
  Share2,
} from "lucide-react";

interface ReferralDashboardProps {
  clientId: number;
  showReferralList?: boolean;
  compact?: boolean;
}

// Status badge variants
const STATUS_STYLES = {
  PENDING: { variant: "secondary" as const, icon: Clock, label: "Pending" },
  CONVERTED: {
    variant: "default" as const,
    icon: CheckCircle,
    label: "Converted",
  },
  COUCH_TAX_ACTIVE: {
    variant: "default" as const,
    icon: TrendingUp,
    label: "Active",
  },
  COMPLETED: { variant: "outline" as const, icon: Check, label: "Completed" },
  CANCELLED: {
    variant: "destructive" as const,
    icon: XCircle,
    label: "Cancelled",
  },
};

export const ReferralDashboard = React.memo(function ReferralDashboard({
  clientId,
  showReferralList = true,
  compact = false,
}: ReferralDashboardProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);

  // Fetch referral code
  const { data: codeData, isLoading: codeLoading } =
    trpc.gamification.referrals.getCode.useQuery({ clientId });

  // Fetch referral dashboard
  const {
    data: dashboardData,
    isLoading: dashboardLoading,
    error,
  } = trpc.gamification.referrals.getDashboard.useQuery({ clientId });

  const handleCopyCode = useCallback(async () => {
    if (!codeData?.code) return;
    try {
      await navigator.clipboard.writeText(codeData.code);
      setCopied(true);
      toast({
        title: "Code Copied!",
        description: "Share your referral code with friends.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({
        title: "Copy Failed",
        description: "Please manually copy the code.",
        variant: "destructive",
      });
    }
  }, [codeData?.code, toast]);

  const handleShare = useCallback(async () => {
    if (!codeData?.code) return;
    const shareText = `Use my referral code ${codeData.code} to get started!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Referral Code",
          text: shareText,
        });
      } catch {
        // User cancelled or share failed
      }
    } else {
      handleCopyCode();
    }
  }, [codeData?.code, handleCopyCode]);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);

  return (
    <Card className={compact ? "border-0 shadow-none" : ""}>
      <CardHeader className={compact ? "px-0 pt-0" : ""}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Referral Program
            </CardTitle>
            <CardDescription>
              Refer friends and earn rewards on their orders
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className={compact ? "px-0" : ""}>
        {/* Referral Code Section */}
        <div className="mb-6">
          <label className="text-sm font-medium text-muted-foreground">
            Your Referral Code
          </label>
          {codeLoading ? (
            <Skeleton className="h-12 w-full mt-2" />
          ) : (
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 relative">
                <Input
                  value={codeData?.code ?? ""}
                  readOnly
                  className="text-lg font-mono font-bold tracking-wider pr-10"
                />
                {copied && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Check className="h-5 w-5 text-green-500" />
                  </div>
                )}
              </div>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={handleCopyCode}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Copy Code</TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="default" size="icon" onClick={handleShare}>
                      <Share2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Share</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
        </div>

        {/* Loading State */}
        {dashboardLoading && (
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-6 text-red-600">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Error loading referral data: {error.message}</p>
          </div>
        )}

        {/* Stats Grid */}
        {!dashboardLoading && !error && dashboardData && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {/* Total Referrals */}
              <div className="bg-blue-50 dark:bg-blue-950 rounded-lg p-4 text-center">
                <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                  {dashboardData.totalReferrals}
                </div>
                <div className="text-xs text-muted-foreground">Referrals</div>
              </div>

              {/* Total Revenue */}
              <div className="bg-green-50 dark:bg-green-950 rounded-lg p-4 text-center">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                  {formatCurrency(dashboardData.totalRevenue)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Referral Revenue
                </div>
              </div>

              {/* Total Earned */}
              <div className="bg-purple-50 dark:bg-purple-950 rounded-lg p-4 text-center">
                <Gift className="h-6 w-6 text-purple-600 dark:text-purple-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                  {formatCurrency(dashboardData.totalEarned)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Total Earned
                </div>
              </div>

              {/* Pending Payouts */}
              <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-4 text-center">
                <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400 mx-auto mb-1" />
                <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                  {formatCurrency(dashboardData.pendingPayouts)}
                </div>
                <div className="text-xs text-muted-foreground">
                  Pending Payout
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="mb-6 p-4 bg-muted rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <Gift className="h-4 w-4" />
                How Couch Tax Works
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>1. Share your referral code with friends</li>
                <li>
                  2. When they sign up and make their first order, you both win!
                </li>
                <li>3. Earn 5% on their first 3 orders (Couch Tax)</li>
                <li>4. Payouts are processed automatically</li>
              </ul>
            </div>

            {/* Referral List */}
            {showReferralList && dashboardData.referrals.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Your Referrals</h4>
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Referred</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-center">Progress</TableHead>
                        <TableHead className="text-right">Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dashboardData.referrals.map(
                        (referral: {
                          id: number;
                          referredName: string;
                          status: string;
                          convertedAt: Date | string | null;
                          couchTaxPercent: number;
                          ordersCompleted: number;
                          orderLimit: number;
                          createdAt: Date | string;
                        }) => {
                          const statusStyle =
                            STATUS_STYLES[
                              referral.status as keyof typeof STATUS_STYLES
                            ] ?? STATUS_STYLES.PENDING;
                          const StatusIcon = statusStyle.icon;
                          const progress =
                            referral.orderLimit > 0
                              ? (referral.ordersCompleted /
                                  referral.orderLimit) *
                                100
                              : 0;

                          return (
                            <TableRow key={referral.id}>
                              <TableCell>
                                <div className="font-medium">
                                  {referral.referredName}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {referral.couchTaxPercent}% couch tax
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge
                                  variant={statusStyle.variant}
                                  className="gap-1"
                                >
                                  <StatusIcon className="h-3 w-3" />
                                  {statusStyle.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress
                                    value={progress}
                                    className="h-2 flex-1"
                                  />
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                                    {referral.ordersCompleted}/
                                    {referral.orderLimit}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="text-right text-sm text-muted-foreground">
                                {new Date(
                                  referral.createdAt
                                ).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          );
                        }
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Empty Referrals State */}
            {showReferralList && dashboardData.referrals.length === 0 && (
              <div className="text-center py-8 text-muted-foreground border rounded-lg">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p className="font-medium">No referrals yet</p>
                <p className="text-sm">Share your code to start earning!</p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={handleShare}
                >
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Your Code
                </Button>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

export default ReferralDashboard;

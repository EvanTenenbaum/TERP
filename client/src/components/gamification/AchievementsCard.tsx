/**
 * Achievements Card Component
 * Sprint 5 Track B: MEET-045
 *
 * Displays a client's achievements with medal summary and achievement grid.
 */

import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Award,
  Trophy,
  Star,
  Target,
  ShoppingCart,
  Heart,
  Users,
  Zap,
  Lock,
} from "lucide-react";
import { AchievementBadge, MedalSummary } from "./AchievementBadge";
import { cn } from "@/lib/utils";

type AchievementCategory =
  | "ALL"
  | "SPENDING"
  | "ORDERS"
  | "LOYALTY"
  | "REFERRALS"
  | "ENGAGEMENT"
  | "SPECIAL";

interface AchievementsCardProps {
  clientId: number;
  showProgress?: boolean;
  compact?: boolean;
}

const CATEGORY_OPTIONS: {
  value: AchievementCategory;
  label: string;
  icon: React.ReactNode;
}[] = [
  { value: "ALL", label: "All", icon: <Award className="h-4 w-4" /> },
  {
    value: "SPENDING",
    label: "Spending",
    icon: <ShoppingCart className="h-4 w-4" />,
  },
  { value: "ORDERS", label: "Orders", icon: <Target className="h-4 w-4" /> },
  { value: "LOYALTY", label: "Loyalty", icon: <Heart className="h-4 w-4" /> },
  {
    value: "REFERRALS",
    label: "Referrals",
    icon: <Users className="h-4 w-4" />,
  },
  { value: "ENGAGEMENT", label: "Activity", icon: <Zap className="h-4 w-4" /> },
  { value: "SPECIAL", label: "Special", icon: <Star className="h-4 w-4" /> },
];

export const AchievementsCard = React.memo(function AchievementsCard({
  clientId,
  showProgress = true,
  compact = false,
}: AchievementsCardProps) {
  const [category, setCategory] = useState<AchievementCategory>("ALL");

  // Fetch client's achievements
  const {
    data: achievementsData,
    isLoading,
    error,
  } = trpc.gamification.achievements.getForClient.useQuery({
    clientId,
    includeProgress: showProgress,
  });

  // Fetch all achievement definitions to show unearned ones
  const { data: allAchievements } =
    trpc.gamification.achievements.list.useQuery({
      includeSecret: false,
    });

  // Filter achievements by category
  const filteredAchievements = useMemo(() => {
    if (!achievementsData?.achievements) return [];
    if (category === "ALL") return achievementsData.achievements;
    return achievementsData.achievements.filter(
      (a: { category: string }) => a.category === category
    );
  }, [achievementsData?.achievements, category]);

  // Get unearned achievements for progress display
  const unearnedAchievements = useMemo(() => {
    if (!allAchievements || !achievementsData?.achievements) return [];
    const earnedIds = new Set(
      achievementsData.achievements.map(
        (a: { achievementId: number }) => a.achievementId
      )
    );
    return allAchievements.filter(
      (a: { id: number; category: string }) =>
        !earnedIds.has(a.id) && (category === "ALL" || a.category === category)
    );
  }, [allAchievements, achievementsData?.achievements, category]);

  return (
    <Card className={compact ? "border-0 shadow-none" : ""}>
      <CardHeader className={compact ? "px-0 pt-0" : ""}>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-500" />
              Achievements
            </CardTitle>
            <CardDescription>Earn medals and unlock rewards</CardDescription>
          </div>
          {achievementsData?.summary && (
            <Badge variant="secondary" className="text-lg px-3 py-1">
              {achievementsData.summary.totalAchievements} Earned
            </Badge>
          )}
        </div>

        {/* Medal Summary */}
        {achievementsData?.summary && (
          <div className="mt-4">
            <MedalSummary
              bronzeCount={achievementsData.summary.bronzeCount}
              silverCount={achievementsData.summary.silverCount}
              goldCount={achievementsData.summary.goldCount}
              platinumCount={achievementsData.summary.platinumCount}
            />
          </div>
        )}

        {/* Markup Discount Info */}
        {achievementsData?.summary?.achievementMarkupDiscount !== undefined &&
          achievementsData.summary.achievementMarkupDiscount > 0 && (
            <div className="mt-3 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                <Star className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Achievement Bonus:{" "}
                  {achievementsData.summary.achievementMarkupDiscount.toFixed(
                    1
                  )}
                  % markup discount
                </span>
              </div>
            </div>
          )}
      </CardHeader>

      <CardContent className={compact ? "px-0" : ""}>
        {/* Category Tabs */}
        <Tabs
          value={category}
          onValueChange={v => setCategory(v as AchievementCategory)}
          className="mb-4"
        >
          <TabsList className="flex flex-wrap h-auto gap-1">
            {CATEGORY_OPTIONS.map(opt => (
              <TabsTrigger
                key={opt.value}
                value={opt.value}
                className="gap-1 text-xs"
              >
                {opt.icon}
                <span className="hidden sm:inline">{opt.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton
                // eslint-disable-next-line react/no-array-index-key
                key={`achievement-skeleton-${i}`} className="w-14 h-14 rounded-full" />
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="text-center py-8 text-red-600">
            <p>Error loading achievements: {error.message}</p>
          </div>
        )}

        {/* Achievements Grid */}
        {!isLoading && !error && (
          <div className="space-y-6">
            {/* Earned Achievements */}
            {filteredAchievements.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3">
                  Earned ({filteredAchievements.length})
                </h4>
                <div className="flex flex-wrap gap-3">
                  {filteredAchievements.map(
                    (achievement: {
                      id: number;
                      name: string;
                      description: string;
                      medal: string;
                      category: string;
                      icon: string;
                      earnedAt: Date | string;
                      pointsAwarded: number;
                      isPinned: boolean;
                    }) => (
                      <AchievementBadge
                        key={achievement.id}
                        name={achievement.name}
                        description={achievement.description}
                        medal={
                          achievement.medal as
                            | "BRONZE"
                            | "SILVER"
                            | "GOLD"
                            | "PLATINUM"
                        }
                        category={
                          achievement.category as
                            | "SPENDING"
                            | "ORDERS"
                            | "LOYALTY"
                            | "REFERRALS"
                            | "ENGAGEMENT"
                            | "SPECIAL"
                        }
                        icon={achievement.icon}
                        earnedAt={achievement.earnedAt}
                        pointsAwarded={achievement.pointsAwarded}
                        isPinned={achievement.isPinned}
                      />
                    )
                  )}
                </div>
              </div>
            )}

            {/* Unearned Achievements (locked) */}
            {showProgress && unearnedAchievements.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Locked ({unearnedAchievements.length})
                </h4>
                <div className="flex flex-wrap gap-3">
                  {unearnedAchievements
                    .slice(0, 12)
                    .map(
                      (achievement: {
                        id: number;
                        name: string;
                        description: string;
                      }) => (
                        <div
                          key={achievement.id}
                          className={cn(
                            "w-14 h-14 rounded-full border-2 border-dashed border-muted",
                            "flex items-center justify-center",
                            "bg-muted/30 text-muted-foreground/50",
                            "cursor-help"
                          )}
                          title={`${achievement.name}: ${achievement.description}`}
                        >
                          <Lock className="h-5 w-5" />
                        </div>
                      )
                    )}
                  {unearnedAchievements.length > 12 && (
                    <div className="w-14 h-14 rounded-full border-2 border-dashed border-muted flex items-center justify-center text-sm text-muted-foreground">
                      +{unearnedAchievements.length - 12}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Empty State */}
            {filteredAchievements.length === 0 &&
              unearnedAchievements.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>No achievements in this category yet.</p>
                  <p className="text-sm">
                    Keep engaging to unlock achievements!
                  </p>
                </div>
              )}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export default AchievementsCard;

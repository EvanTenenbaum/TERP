import { memo, useState } from "react";
import { useLocation } from "wouter";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Boxes,
  CircleDot,
  ShoppingCart,
  UserCheck,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatDistanceToNow } from "date-fns";

/**
 * TER-1056 — Dashboard Activity Feed
 *
 * Shows the last 50 events (orders / payments / inventory / user actions)
 * merged from the server. Filter by type via tabs. Auto-refreshes every 60
 * seconds so the owner can leave it open and see fresh activity without
 * manual reload.
 */

const FILTER_TABS: Array<{
  value: "all" | "orders" | "payments" | "inventory" | "user_actions";
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "orders", label: "Orders" },
  { value: "payments", label: "Payments" },
  { value: "inventory", label: "Inventory" },
  { value: "user_actions", label: "Users" },
];

type FilterType = (typeof FILTER_TABS)[number]["value"];

type ActivityType = "order" | "payment" | "inventory" | "user_action";

interface FeedItem {
  id: string;
  type: ActivityType;
  title: string;
  subtitle: string;
  timestamp: string;
  href?: string;
  amount?: number;
}

const ICONS: Record<ActivityType, LucideIcon> = {
  order: ShoppingCart,
  payment: Wallet,
  inventory: Boxes,
  user_action: UserCheck,
};

const ACCENT_CLASSES: Record<ActivityType, string> = {
  order: "bg-blue-50 text-blue-700 border-blue-200",
  payment: "bg-emerald-50 text-emerald-700 border-emerald-200",
  inventory: "bg-amber-50 text-amber-700 border-amber-200",
  user_action: "bg-slate-50 text-slate-700 border-slate-200",
};

function formatAmount(value: number | undefined): string | null {
  if (value === undefined || value === null || Number.isNaN(value)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function formatRelative(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";
  return formatDistanceToNow(date, { addSuffix: true });
}

export const ActivityFeedWidget = memo(function ActivityFeedWidget() {
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState<FilterType>("all");

  const { data, isLoading, error } = trpc.activity.getFeed.useQuery(
    { limit: 50, offset: 0, type: filter },
    { refetchInterval: 60000, placeholderData: prev => prev }
  );

  const items: FeedItem[] = (data?.items ?? []) as FeedItem[];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-lg font-semibold">Recent Activity</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Last 50 events · auto-refresh every 60s
          </p>
        </div>
        {data?.generatedAt && (
          <Badge
            variant="outline"
            className="rounded-full px-2 py-0.5 text-[11px] font-normal"
          >
            <CircleDot className="h-2.5 w-2.5 mr-1 text-emerald-500" />
            Live
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <Tabs
          value={filter}
          onValueChange={value => setFilter(value as FilterType)}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-5">
            {FILTER_TABS.map(tab => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="text-xs"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value={filter} className="mt-3">
            {error ? (
              <EmptyState
                variant="generic"
                size="sm"
                title="Unable to load activity"
                description="The activity feed could not be loaded right now."
              />
            ) : isLoading && items.length === 0 ? (
              <div className="space-y-2">
                {["s1", "s2", "s3", "s4", "s5", "s6"].map(key => (
                  <Skeleton key={key} className="h-12 w-full" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                variant="generic"
                size="sm"
                title="No recent activity"
                description="Nothing has happened yet in this category."
              />
            ) : (
              <ol className="divide-y">
                {items.map(item => {
                  const Icon = ICONS[item.type];
                  const accent = ACCENT_CLASSES[item.type];
                  const amount = formatAmount(item.amount);
                  const relative = formatRelative(item.timestamp);
                  const clickable = Boolean(item.href);

                  return (
                    <li
                      key={item.id}
                      className={`flex items-start gap-3 py-2.5 ${
                        clickable
                          ? "cursor-pointer hover:bg-muted/40 -mx-2 px-2 rounded"
                          : ""
                      }`}
                      onClick={() => item.href && setLocation(item.href)}
                      role={clickable ? "button" : undefined}
                      tabIndex={clickable ? 0 : -1}
                      onKeyDown={event => {
                        if (
                          clickable &&
                          (event.key === "Enter" || event.key === " ")
                        ) {
                          event.preventDefault();
                          if (item.href) setLocation(item.href);
                        }
                      }}
                    >
                      <div
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${accent}`}
                      >
                        <Icon className="h-4 w-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium truncate">
                            {item.title}
                          </p>
                          {amount && (
                            <span className="text-xs font-mono text-muted-foreground shrink-0">
                              {amount}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center justify-between gap-2 mt-0.5">
                          <p className="text-xs text-muted-foreground truncate">
                            {item.subtitle}
                          </p>
                          {relative && (
                            <span className="text-[11px] text-muted-foreground shrink-0">
                              {relative}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
});

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import CreditsPage from "@/pages/CreditsPage";
import CreditSettingsPage from "@/pages/CreditSettingsPage";
import { useQueryTabState } from "@/hooks/useQueryTabState";
import { useWorkspaceHomeTelemetry } from "@/hooks/useWorkspaceHomeTelemetry";
import { CREDITS_WORKSPACE } from "@/config/workspaces";
import { trpc } from "@/lib/trpc";
import {
  LinearWorkspacePanel,
  LinearWorkspaceShell,
} from "@/components/layout/LinearWorkspaceShell";
import {
  ArrowRight,
  CreditCard,
  Shield,
  SlidersHorizontal,
} from "lucide-react";

type CreditsTab = (typeof CREDITS_WORKSPACE.tabs)[number]["value"];
const CREDITS_TABS = CREDITS_WORKSPACE.tabs.map(
  tab => tab.value
) as readonly CreditsTab[];

function formatCurrency(amount: number | undefined) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount ?? 0);
}

function CreditsWorkspaceDashboard({
  onOpenAdjustments,
  onOpenCapacity,
}: {
  onOpenAdjustments: () => void;
  onOpenCapacity: () => void;
}) {
  const { data: summary, isLoading } = trpc.credits.getSummary.useQuery();

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight">
          Client Credit Dashboard
        </h2>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Start with the two decisions operators actually need to make:
          adjust a client&apos;s carrying capacity, or issue and apply a
          post-sale credit adjustment back to invoices.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="border-sky-200 bg-sky-50/70">
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>Client credit capacity</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Adjust exposure guardrails, visibility, and override policy
                  when a client&apos;s carrying capacity changes.
                </p>
              </div>
              <Shield className="h-5 w-5 text-sky-700" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-sky-200 bg-background/90 p-3 text-sm text-muted-foreground">
              Capacity answers “How much can this client carry?” and should
              stay separate from one-off financial adjustments.
            </div>
            <Button onClick={onOpenCapacity}>
              Open Capacity Settings
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/70">
          <CardHeader className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <CardTitle>Issued credit adjustments</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Issue, review, and apply return, refund, pricing, or
                  goodwill adjustments without mixing them up with capacity
                  policy.
                </p>
              </div>
              <CreditCard className="h-5 w-5 text-emerald-700" />
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">
                  Open adjustment balance
                </p>
                <p className="text-2xl font-semibold text-emerald-700">
                  {isLoading
                    ? "Loading..."
                    : formatCurrency(summary?.totalCreditsRemaining)}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">
                  Issued adjustments
                </p>
                <p className="text-2xl font-semibold">
                  {isLoading ? "Loading..." : summary?.creditCount ?? 0}
                </p>
              </div>
            </div>
            <Button onClick={onOpenAdjustments}>
              Review Issued Adjustments
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Adjustment balance</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {isLoading
                ? "Loading..."
                : formatCurrency(summary?.totalCreditsRemaining)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Still available to apply back to invoices.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Adjustments used</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {isLoading
                ? "Loading..."
                : formatCurrency(summary?.totalCreditsUsed)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Already consumed against invoice balances.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Expiring soon</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold">
              {isLoading
                ? "Loading..."
                : formatCurrency(summary?.expiringWithin30Days.totalAmount)}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              {isLoading
                ? "Review upcoming expirations."
                : `${summary?.expiringWithin30Days.count ?? 0} open adjustments in the next 30 days.`}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardHeader className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle>Keep the concepts separate</CardTitle>
              <p className="text-sm text-muted-foreground">
                Client credit capacity is a policy surface. Issued adjustments
                are operational balances created after returns, refunds,
                goodwill, or billing corrections.
              </p>
            </div>
            <SlidersHorizontal className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
      </Card>
    </div>
  );
}

export default function CreditsWorkspacePage() {
  const { activeTab, setActiveTab } = useQueryTabState<CreditsTab>({
    defaultTab: "dashboard",
    validTabs: CREDITS_TABS,
  });
  useWorkspaceHomeTelemetry("credits", activeTab);

  return (
    <LinearWorkspaceShell
      title={CREDITS_WORKSPACE.title}
      description={CREDITS_WORKSPACE.description}
      section="Finance"
      activeTab={activeTab}
      tabs={CREDITS_WORKSPACE.tabs}
      onTabChange={tab => setActiveTab(tab)}
      meta={[
        {
          label: "Capacity",
          value: "Client limits, exposure, and order guardrails",
        },
        {
          label: "Adjustments",
          value: "Issued adjustments that can be applied back to invoices",
        },
      ]}
      commandStrip={
        <>
          <Button
            size="sm"
            variant={activeTab === "dashboard" ? "outline" : "ghost"}
            onClick={() => setActiveTab("dashboard")}
          >
            Open Dashboard
          </Button>
          <Button
            size="sm"
            variant={activeTab === "adjustments" ? "outline" : "ghost"}
            onClick={() => setActiveTab("adjustments")}
          >
            Open Issued Adjustments
          </Button>
          <Button
            size="sm"
            variant={activeTab === "capacity" ? "outline" : "ghost"}
            onClick={() => setActiveTab("capacity")}
          >
            Open Capacity Settings
          </Button>
        </>
      }
    >
      <LinearWorkspacePanel value="dashboard">
        <CreditsWorkspaceDashboard
          onOpenAdjustments={() => setActiveTab("adjustments")}
          onOpenCapacity={() => setActiveTab("capacity")}
        />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="adjustments">
        <CreditsPage embedded />
      </LinearWorkspacePanel>
      <LinearWorkspacePanel value="capacity">
        <CreditSettingsPage embedded />
      </LinearWorkspacePanel>
    </LinearWorkspaceShell>
  );
}

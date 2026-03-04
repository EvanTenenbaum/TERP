import {
  InventorySnapshotWidget,
  AgingInventoryWidget,
} from "@/components/dashboard/widgets-v2";
import { OwnerCashDecisionPanel } from "@/components/dashboard/owner/OwnerCashDecisionPanel";
import { OwnerDebtPositionWidget } from "@/components/dashboard/owner/OwnerDebtPositionWidget";
import { OwnerVendorsNeedPaymentWidget } from "@/components/dashboard/owner/OwnerVendorsNeedPaymentWidget";
import { OwnerQuickCardsWidget } from "@/components/dashboard/owner/OwnerQuickCardsWidget";
import { OwnerAppointmentsWidget } from "@/components/dashboard/owner/OwnerAppointmentsWidget";
import { Badge } from "@/components/ui/badge";

export default function OwnerCommandCenterDashboard() {
  const now = new Date();
  const updatedAt = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const todayLabel = now.toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-5">
      {/* Header: identity + date + freshness */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <Badge
            variant="outline"
            className="rounded-full border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-800 mb-2"
          >
            OWNER COMMAND CENTER
          </Badge>
          <p className="text-sm text-muted-foreground">
            {todayLabel} &mdash; here&apos;s what needs your attention today.
          </p>
        </div>
        <Badge
          variant="outline"
          className="rounded-full px-3 py-1 font-normal text-xs shrink-0"
        >
          Live &middot; Updated {updatedAt}
        </Badge>
      </div>

      {/* Row 1: Daily pulse — today's sales + appointments + cash */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <OwnerQuickCardsWidget />
        </div>
        <div className="lg:col-span-4">
          <OwnerAppointmentsWidget />
        </div>
        <div className="lg:col-span-4">
          <OwnerCashDecisionPanel />
        </div>
      </div>

      {/* Row 2: Money in vs. money out */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <OwnerDebtPositionWidget />
        </div>
        <div className="lg:col-span-7">
          <OwnerVendorsNeedPaymentWidget />
        </div>
      </div>

      {/* Row 3: Inventory health */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <InventorySnapshotWidget />
        </div>
        <div className="lg:col-span-6">
          <AgingInventoryWidget />
        </div>
      </div>
    </div>
  );
}

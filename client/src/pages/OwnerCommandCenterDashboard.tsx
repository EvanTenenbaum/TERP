import {
  InventorySnapshotWidget,
  AgingInventoryWidget,
} from "@/components/dashboard/widgets-v2";
import { OwnerCashDecisionPanel } from "@/components/dashboard/owner/OwnerCashDecisionPanel";
import { OwnerDebtPositionWidget } from "@/components/dashboard/owner/OwnerDebtPositionWidget";
import { OwnerVendorsNeedPaymentWidget } from "@/components/dashboard/owner/OwnerVendorsNeedPaymentWidget";
import { OwnerQuickCardsWidget } from "@/components/dashboard/owner/OwnerQuickCardsWidget";
import { Badge } from "@/components/ui/badge";

export default function OwnerCommandCenterDashboard() {
  const now = new Date();
  const updatedAt = now.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  const todayLabel = now.toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Badge
          variant="outline"
          className="rounded-full border-emerald-300 bg-emerald-50 px-3 py-1 text-emerald-800"
        >
          TERP OWNER COMMAND CENTER
        </Badge>
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge
            variant="outline"
            className="rounded-full px-3 py-1 font-normal"
          >
            Updated {updatedAt}
          </Badge>
          <Badge
            variant="outline"
            className="rounded-full px-3 py-1 font-normal"
          >
            {todayLabel}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <InventorySnapshotWidget />
        </div>
        <div className="lg:col-span-4">
          <AgingInventoryWidget />
        </div>
        <div className="lg:col-span-3">
          <OwnerCashDecisionPanel />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <OwnerDebtPositionWidget />
        </div>
        <div className="lg:col-span-4">
          <OwnerVendorsNeedPaymentWidget />
        </div>
        <div className="lg:col-span-3">
          <OwnerQuickCardsWidget />
        </div>
      </div>
    </div>
  );
}

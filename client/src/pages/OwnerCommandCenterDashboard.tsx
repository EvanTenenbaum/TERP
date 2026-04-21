import {
  InventorySnapshotWidget,
  AgingInventoryWidget,
  OperationalKpisWidget,
} from "@/components/dashboard/widgets-v2";
import { OwnerCashDecisionPanel } from "@/components/dashboard/owner/OwnerCashDecisionPanel";
import { OwnerDebtPositionWidget } from "@/components/dashboard/owner/OwnerDebtPositionWidget";
import { OwnerVendorsNeedPaymentWidget } from "@/components/dashboard/owner/OwnerVendorsNeedPaymentWidget";
import { OwnerQuickCardsWidget } from "@/components/dashboard/owner/OwnerQuickCardsWidget";
import { OwnerAppointmentsWidget } from "@/components/dashboard/owner/OwnerAppointmentsWidget";
import { OwnerSkuStatusBrowserWidget } from "@/components/dashboard/owner/OwnerSkuStatusBrowserWidget";
import { Badge } from "@/components/ui/badge";
import { ComponentErrorBoundary } from "@/components/ErrorBoundary";

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

      {/* Operational KPI row (TER-1055) */}
      <ComponentErrorBoundary name="Operational KPIs">
        <OperationalKpisWidget />
      </ComponentErrorBoundary>

      {/* Row 1: Daily pulse — today's sales + appointments + cash */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <ComponentErrorBoundary name="Quick Cards">
            <OwnerQuickCardsWidget />
          </ComponentErrorBoundary>
        </div>
        <div className="lg:col-span-4">
          <ComponentErrorBoundary name="Appointments">
            <OwnerAppointmentsWidget />
          </ComponentErrorBoundary>
        </div>
        <div className="lg:col-span-4">
          <ComponentErrorBoundary name="Cash Decision">
            <OwnerCashDecisionPanel />
          </ComponentErrorBoundary>
        </div>
      </div>

      {/* Row 2: Money in vs. money out */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <ComponentErrorBoundary name="Debt Position">
            <OwnerDebtPositionWidget />
          </ComponentErrorBoundary>
        </div>
        <div className="lg:col-span-7">
          <ComponentErrorBoundary name="Vendors Needing Payment">
            <OwnerVendorsNeedPaymentWidget />
          </ComponentErrorBoundary>
        </div>
      </div>

      {/* Row 3: Inventory health */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="lg:col-span-6">
          <ComponentErrorBoundary name="Inventory Snapshot">
            <InventorySnapshotWidget />
          </ComponentErrorBoundary>
        </div>
        <div className="lg:col-span-6">
          <ComponentErrorBoundary name="Aging Inventory">
            <AgingInventoryWidget />
          </ComponentErrorBoundary>
        </div>
      </div>

      {/* Row 4: SKU Status Browser (hidden by default, collapsed) */}
      <div>
        <ComponentErrorBoundary name="SKU Status Browser">
          <OwnerSkuStatusBrowserWidget />
        </ComponentErrorBoundary>
      </div>
    </div>
  );
}

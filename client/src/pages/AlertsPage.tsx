/**
 * AlertsPage
 * NAV-017: Full page view for alerts management
 *
 * Uses the AlertsPanel component with full variant
 */

import { AlertsPanel } from "@/components/alerts/AlertsPanel";
import { BackButton } from "@/components/common/BackButton";
import { Bell } from "lucide-react";

export default function AlertsPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BackButton to="/" label="Back to Dashboard" />
          <div className="flex items-center gap-2">
            <Bell className="h-6 w-6 text-muted-foreground" />
            <h1 className="text-2xl font-semibold">Alerts</h1>
          </div>
        </div>
      </div>
      <AlertsPanel variant="full" maxHeight="calc(100vh - 200px)" />
    </div>
  );
}

/**
 * AlertsPage
 * NAV-017: Full page view for alerts management
 *
 * Uses the AlertsPanel component with full variant
 */

import { AlertsPanel } from "@/components/alerts/AlertsPanel";

export default function AlertsPage() {
  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <AlertsPanel variant="full" maxHeight="calc(100vh - 200px)" />
    </div>
  );
}

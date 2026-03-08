/**
 * DashboardV3 - TER-616/617
 *
 * Replaced customizable widget grid with fixed SimpleDashboard layout.
 * Widget configuration/customization UI removed per TER-616.
 */

import { SimpleDashboard } from "@/components/dashboard/SimpleDashboard";

export default function DashboardV3() {
  return <SimpleDashboard />;
}

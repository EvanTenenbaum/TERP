import OwnerCommandCenterDashboard from "./OwnerCommandCenterDashboard";

/**
 * DashboardHomePage - TER-1236
 *
 * Unified dashboard page using OwnerCommandCenterDashboard.
 * Previously featured a feature-flagged choice between DashboardV3 and
 * OwnerCommandCenterDashboard. TER-1236 consolidated to the operational
 * KPI-focused dashboard only.
 */

export default function DashboardHomePage() {
  return <OwnerCommandCenterDashboard />;
}

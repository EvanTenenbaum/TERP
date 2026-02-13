import DashboardV3 from "./DashboardV3";
import OwnerCommandCenterDashboard from "./OwnerCommandCenterDashboard";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { FEATURE_FLAGS } from "@/lib/constants/featureFlags";

export default function DashboardHomePage() {
  const { enabled, isLoading, error } = useFeatureFlag(
    FEATURE_FLAGS.ownerCommandCenterDashboard
  );

  if (error) {
    return <DashboardV3 />;
  }

  if (isLoading) {
    return <DashboardV3 />;
  }

  return enabled ? <OwnerCommandCenterDashboard /> : <DashboardV3 />;
}

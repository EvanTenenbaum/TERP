import { Suspense } from "react";
import DashboardV3 from "./DashboardV3";
import OwnerCommandCenterDashboard from "./OwnerCommandCenterDashboard";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { FEATURE_FLAGS } from "@/lib/constants/featureFlags";

/**
 * DashboardHomePage
 *
 * TER-639 FIX: Wraps the dashboard selection in a Suspense boundary so that
 * rapid navigation (where the feature-flag query may still be in-flight when
 * the component mounts) never results in an empty/broken render.
 *
 * The inner component always returns a concrete element — DashboardV3 is used
 * as the stable fallback during loading and error states, guaranteeing the
 * dashboard is always rendered regardless of navigation timing.
 */

function DashboardContent() {
  const { enabled, isLoading, error } = useFeatureFlag(
    FEATURE_FLAGS.ownerCommandCenterDashboard
  );

  // Always render DashboardV3 as the stable fallback — both during the async
  // feature-flag load and if the flag query errors. This prevents blank renders
  // after rapid page transitions.
  if (error || isLoading) {
    return <DashboardV3 />;
  }

  return enabled ? <OwnerCommandCenterDashboard /> : <DashboardV3 />;
}

export default function DashboardHomePage() {
  // Suspense boundary ensures React never suspends to a blank state during
  // rapid navigation — DashboardV3 is rendered immediately as the fallback.
  return (
    <Suspense fallback={<DashboardV3 />}>
      <DashboardContent />
    </Suspense>
  );
}

import { useEffect } from "react";
import { useFeatureFlags } from "@/hooks/useFeatureFlag";
import { FEATURE_FLAGS } from "@/lib/constants/featureFlags";

interface SpreadsheetPilotAvailability {
  availabilityReady: boolean;
  sheetPilotEnabled: boolean;
}

const PILOT_FLAG_REFETCH_INTERVAL_MS = 15_000;

export function useSpreadsheetPilotAvailability(
  pilotSurfaceSupported: boolean
): SpreadsheetPilotAvailability {
  const { flags, isLoading, error, refetch } = useFeatureFlags();
  const pilotFlagEnabled = flags[FEATURE_FLAGS.spreadsheetNativePilot] ?? false;

  useEffect(() => {
    if (!pilotSurfaceSupported || !pilotFlagEnabled) {
      return;
    }

    const intervalId = window.setInterval(() => {
      void refetch();
    }, PILOT_FLAG_REFETCH_INTERVAL_MS);

    return () => window.clearInterval(intervalId);
  }, [pilotFlagEnabled, pilotSurfaceSupported, refetch]);

  if (!pilotSurfaceSupported) {
    return {
      availabilityReady: true,
      sheetPilotEnabled: false,
    };
  }

  return {
    availabilityReady: !isLoading || Boolean(error),
    sheetPilotEnabled: pilotFlagEnabled,
  };
}

import { useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { trackWorkspaceHomeVisit } from "@/lib/navigation/routeUsageTelemetry";

export function useWorkspaceHomeTelemetry(workspace: string, tab: string) {
  const [location] = useLocation();
  const trackedKeysRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const dedupeKey = `${workspace}|${location}|${tab}`;
    if (trackedKeysRef.current.has(dedupeKey)) {
      return;
    }

    trackWorkspaceHomeVisit({
      workspace,
      path: location,
      tab,
    });

    trackedKeysRef.current.add(dedupeKey);
  }, [location, tab, workspace]);
}

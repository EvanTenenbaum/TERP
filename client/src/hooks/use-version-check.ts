import { useEffect, useRef, useState } from "react";
import versionInfo from "../../version.json";

interface VersionInfo {
  version: string;
  commit: string;
  date: string;
  branch: string;
  phase: string;
  buildTime: string;
}

const VERSION_CHECK_INTERVAL = 60000; // 60 seconds

export function useVersionCheck() {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [serverVersion, setServerVersion] = useState<VersionInfo | null>(null);
  const currentVersion = useRef<string>(versionInfo.commit);
  const intervalRef = useRef<number | null>(null);
  const hasShownToast = useRef(false);

  useEffect(() => {
    const checkVersion = async () => {
      try {
        // Add timestamp to bust cache
        const response = await fetch(`/version.json?t=${Date.now()}`, {
          cache: "no-store",
        });

        if (!response.ok) {
          return;
        }

        const serverVersionInfo: VersionInfo = await response.json();

        // Compare commit hashes
        if (
          serverVersionInfo.commit &&
          serverVersionInfo.commit !== currentVersion.current
        ) {
          setServerVersion(serverVersionInfo);
          setHasUpdate(true);
          // Don't show multiple toasts - let the component handle it
        }
      } catch {
        // Silently fail - network errors shouldn't interrupt the app
      }
    };

    // Check immediately on mount
    checkVersion();

    // Then check every 60 seconds
    intervalRef.current = window.setInterval(checkVersion, VERSION_CHECK_INTERVAL);

    return () => {
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const resetUpdateStatus = () => {
    setHasUpdate(false);
    hasShownToast.current = false;
  };

  return {
    hasUpdate,
    serverVersion,
    currentVersion: currentVersion.current,
    resetUpdateStatus,
  };
}


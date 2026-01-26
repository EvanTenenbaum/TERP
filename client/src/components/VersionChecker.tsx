import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { useVersionCheck } from "@/hooks/use-version-check";

export function VersionChecker() {
  const { hasUpdate, resetUpdateStatus: _resetUpdateStatus } =
    useVersionCheck();
  const toastIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (hasUpdate) {
      // Only show one toast - use the toast ID to prevent duplicates
      if (toastIdRef.current === null) {
        toastIdRef.current = toast.info("Update Available 🚀", {
          description: "A new version is available. Click to reload.",
          duration: Infinity, // Don't auto-dismiss
          action: {
            label: "Reload",
            onClick: () => {
              window.location.reload();
            },
          },
        });
      }
    } else {
      // If update status was reset, dismiss the toast
      if (toastIdRef.current !== null) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = null;
      }
    }
  }, [hasUpdate]);

  // This component doesn't render anything
  return null;
}

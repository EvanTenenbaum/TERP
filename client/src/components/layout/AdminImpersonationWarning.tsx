/**
 * Admin Impersonation Warning Banner (TER-1219)
 * 
 * Displays a persistent warning banner in the main TERP app when an admin
 * has active VIP impersonation sessions.
 * 
 * Purpose: Safety reminder to prevent admins from forgetting they have
 * active impersonation sessions open in other tabs.
 */

import { Button } from "@/components/ui/button";
import { AlertTriangle, ExternalLink, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/hooks/useAuth";

export function AdminImpersonationWarning() {
  const { user } = useAuth();

  // Query for active impersonation sessions for the current admin user
  // Only run if user is authenticated and has permission
  const { data } = trpc.vipPortalAdmin.audit.getActiveSessions.useQuery(
    {
      adminUserId: user?.id,
      limit: 1, // We only need to know if ANY exist
    },
    {
      enabled: !!user?.id,
      refetchInterval: 10000, // Re-check every 10 seconds
      retry: false, // Don't retry if user doesn't have permission
    }
  );

  // Get the first active session (if any)
  const activeSession = data?.sessions && data.sessions.length > 0 ? data.sessions[0] : null;

  // Only show if there's an active impersonation session
  if (!activeSession) {
    return null;
  }

  const handleViewSession = () => {
    // Open the VIP portal dashboard (where the impersonation session is active)
    window.open("/vip-portal/dashboard", "_blank");
  };

  return (
    <>
      {/* Warning Banner - Fixed at top, below AppHeader */}
      <div className="fixed top-0 left-0 right-0 z-[90] bg-gradient-to-r from-orange-500 via-orange-600 to-orange-500 text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-2">
            {/* Left side - Warning icon and message */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-7 h-7 rounded-full bg-white/20">
                <Eye className="h-4 w-4" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <span className="font-semibold text-xs sm:text-sm flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  ACTIVE IMPERSONATION SESSION
                </span>
                <span className="text-xs opacity-90">
                  You have an active VIP impersonation session
                </span>
              </div>
            </div>

            {/* Right side - View session button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleViewSession}
              className="bg-white text-[var(--warning)] hover:bg-[var(--warning-bg)] font-semibold text-xs h-7 px-3"
            >
              <ExternalLink className="h-3.5 w-3.5 mr-1" />
              <span className="hidden sm:inline">View Session</span>
              <span className="sm:hidden">View</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind fixed banner */}
      <div className="h-[42px] sm:h-[36px]" />
    </>
  );
}

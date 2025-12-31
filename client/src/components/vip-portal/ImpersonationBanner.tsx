/**
 * Enhanced Impersonation Banner (FEATURE-012)
 * 
 * A prominent, non-dismissible banner displayed during admin impersonation sessions.
 * 
 * Features:
 * - High-contrast amber/red styling for visibility
 * - Non-dismissible (no X button)
 * - Shows client name and session info
 * - "End Session" button that properly terminates the session
 * - Audit warning message
 * - Sticky positioning at top of viewport
 */

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Shield, LogOut, AlertTriangle, Eye } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

interface ImpersonationBannerProps {
  clientName: string;
  sessionGuid: string | null;
  onEndSession: () => void;
}

export function ImpersonationBanner({ 
  clientName, 
  sessionGuid,
  onEndSession 
}: ImpersonationBannerProps) {
  const [showEndDialog, setShowEndDialog] = useState(false);
  const [isEnding, setIsEnding] = useState(false);

  // End session mutation
  const endSessionMutation = trpc.vipPortalAdmin.audit.endSession.useMutation({
    onSuccess: () => {
      toast.success("Impersonation session ended");
      onEndSession();
    },
    onError: (error) => {
      console.error("Failed to end session:", error);
      // Still end the session locally even if server call fails
      onEndSession();
    },
  });

  const handleEndSession = async () => {
    setIsEnding(true);
    
    if (sessionGuid) {
      // Notify server to end the session
      endSessionMutation.mutate({ sessionGuid });
    } else {
      // No session GUID, just end locally
      onEndSession();
    }
  };

  return (
    <>
      {/* Main Banner - Fixed at top, high z-index */}
      <div className="fixed top-0 left-0 right-0 z-[100] bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between py-2.5">
            {/* Left side - Icon and warning */}
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white/20">
                <Eye className="h-5 w-5" />
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
                <span className="font-bold text-sm sm:text-base">
                  ADMIN IMPERSONATION MODE
                </span>
                <span className="text-xs sm:text-sm opacity-90">
                  Viewing as <strong>{clientName}</strong>
                </span>
              </div>
            </div>

            {/* Center - Audit warning (hidden on mobile) */}
            <div className="hidden md:flex items-center gap-2 text-xs bg-white/10 px-3 py-1.5 rounded-full">
              <Shield className="h-4 w-4" />
              <span>All actions are being logged for audit</span>
            </div>

            {/* Right side - End session button */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowEndDialog(true)}
              className="bg-white text-amber-700 hover:bg-amber-50 font-semibold shadow-sm"
              disabled={isEnding}
            >
              <LogOut className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">End Session</span>
              <span className="sm:hidden">Exit</span>
            </Button>
          </div>
        </div>
        
        {/* Mobile audit warning */}
        <div className="md:hidden bg-amber-700/50 px-4 py-1.5 text-center text-xs">
          <Shield className="h-3 w-3 inline mr-1" />
          All actions are being logged for audit
        </div>
      </div>

      {/* Spacer to prevent content from being hidden behind fixed banner */}
      <div className="h-[52px] md:h-[44px]" />

      {/* End Session Confirmation Dialog */}
      <AlertDialog open={showEndDialog} onOpenChange={setShowEndDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              End Impersonation Session?
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to end your impersonation session as <strong>{clientName}</strong>.
              </p>
              <p>
                This tab will be closed and you will be returned to the admin panel.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isEnding}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEndSession}
              disabled={isEnding}
              className="bg-amber-600 hover:bg-amber-700"
            >
              {isEnding ? "Ending..." : "End Session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

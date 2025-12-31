/**
 * VIP Portal Impersonation Token Exchange Page (FEATURE-012)
 * 
 * This page handles the one-time token exchange for admin impersonation.
 * 
 * Flow:
 * 1. Admin clicks "Login as Client" in VIPImpersonationManager
 * 2. Backend creates session and returns one-time token
 * 3. New tab opens to this page with token in URL
 * 4. This page exchanges the one-time token for a session token
 * 5. Session is stored in sessionStorage (tab-specific)
 * 6. User is redirected to VIP Dashboard
 */

import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, CheckCircle, Shield } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useVIPPortalAuth } from "@/hooks/useVIPPortalAuth";

type ExchangeState = "loading" | "success" | "error" | "expired" | "invalid";

export default function ImpersonatePage() {
  const [, setLocation] = useLocation();
  const searchString = useSearch();
  const { setupImpersonationSession } = useVIPPortalAuth();
  
  const [state, setState] = useState<ExchangeState>("loading");
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [clientName, setClientName] = useState<string>("");

  // Extract token from URL
  const params = new URLSearchParams(searchString);
  const oneTimeToken = params.get("token");

  // Exchange token mutation
  const exchangeTokenMutation = trpc.vipPortalAdmin.audit.exchangeToken.useMutation({
    onSuccess: (data) => {
      setClientName(data.clientName);
      
      // Set up the impersonation session in sessionStorage
      setupImpersonationSession({
        sessionToken: data.sessionToken,
        clientId: data.clientId,
        clientName: data.clientName,
        sessionGuid: data.sessionGuid,
      });
      
      setState("success");
      
      // Redirect to VIP Dashboard after a brief delay
      setTimeout(() => {
        setLocation("/vip-portal");
      }, 1500);
    },
    onError: (error) => {
      if (error.message.includes("expired")) {
        setState("expired");
        setErrorMessage("This impersonation link has expired. Please request a new one.");
      } else if (error.message.includes("invalid") || error.message.includes("not found")) {
        setState("invalid");
        setErrorMessage("This impersonation link is invalid or has already been used.");
      } else {
        setState("error");
        setErrorMessage(error.message || "Failed to authenticate. Please try again.");
      }
    },
  });

  // Exchange token on mount
  useEffect(() => {
    if (!oneTimeToken) {
      setState("invalid");
      setErrorMessage("No authentication token provided.");
      return;
    }

    // Exchange the one-time token for a session
    exchangeTokenMutation.mutate({ oneTimeToken });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oneTimeToken]);

  const _handleClose = () => {
    window.close();
    // If window.close() doesn't work, show a message
    setTimeout(() => {
      setErrorMessage("Please close this tab manually.");
    }, 100);
  };

  const handleRetry = () => {
    // Close this tab and let admin try again from the manager
    window.close();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {state === "loading" && (
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            )}
            {state === "success" && (
              <CheckCircle className="h-12 w-12 text-green-500" />
            )}
            {(state === "error" || state === "expired" || state === "invalid") && (
              <AlertTriangle className="h-12 w-12 text-destructive" />
            )}
          </div>
          <CardTitle>
            {state === "loading" && "Authenticating..."}
            {state === "success" && "Authentication Successful"}
            {state === "error" && "Authentication Failed"}
            {state === "expired" && "Link Expired"}
            {state === "invalid" && "Invalid Link"}
          </CardTitle>
          <CardDescription>
            {state === "loading" && "Setting up your impersonation session..."}
            {state === "success" && `Logged in as ${clientName}`}
            {(state === "error" || state === "expired" || state === "invalid") && errorMessage}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {state === "loading" && (
            <div className="text-center text-sm text-muted-foreground">
              <p>Please wait while we verify your access...</p>
            </div>
          )}
          
          {state === "success" && (
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <Shield className="h-5 w-5 text-amber-600" />
                <span className="text-sm text-amber-700 dark:text-amber-400">
                  Impersonation mode active - all actions are logged
                </span>
              </div>
              <p className="text-center text-sm text-muted-foreground">
                Redirecting to VIP Portal...
              </p>
            </div>
          )}
          
          {(state === "error" || state === "expired" || state === "invalid") && (
            <div className="space-y-3">
              <Button 
                variant="outline" 
                className="w-full"
                onClick={handleRetry}
              >
                Close and Try Again
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Return to the admin panel to request a new impersonation link.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

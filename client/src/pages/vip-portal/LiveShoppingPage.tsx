/**
 * VIP Portal Live Shopping Page
 *
 * Entry point for VIP customers to:
 * 1. Join a live shopping session via room code
 * 2. View their active session if one exists
 * 3. Participate in the three-status shopping workflow
 */

import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useVIPPortalAuth } from "@/hooks/useVIPPortalAuth";
import { LiveShoppingSession } from "@/components/vip-portal/LiveShoppingSession";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { toast } from "sonner";
import {
  Video,
  ArrowLeft,
  Loader2,
  ShoppingCart,
  AlertCircle,
  Radio,
} from "lucide-react";

interface LiveShoppingPageProps {
  onBack?: () => void;
}

export default function LiveShoppingPage({ onBack }: LiveShoppingPageProps) {
  const { clientId, sessionToken, isInitialized } = useVIPPortalAuth();
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [activeSession, setActiveSession] = useState<{
    id: number;
    roomCode: string;
    title: string;
    hostName: string;
    status: string;
  } | null>(null);
  const [isSessionActive, setIsSessionActive] = useState(false);

  // Check for active sessions
  const { data: activeSessions, isLoading: checkingActive } =
    trpc.vipPortalLiveShopping.getActiveSession?.useQuery(
      { clientId: clientId! },
      {
        enabled: !!clientId && isInitialized,
        refetchInterval: 10000, // Check every 10 seconds
      }
    ) ?? { data: undefined, isLoading: false };

  // Join session mutation
  const joinSessionMutation =
    trpc.vipPortalLiveShopping.joinSession.useMutation({
      onSuccess: (data) => {
        setActiveSession({
          id: data.session.id,
          roomCode: data.session.roomCode,
          title: data.session.title,
          hostName: data.session.hostName || "Host",
          status: data.session.status,
        });
        setIsSessionActive(true);
        toast.success("Joined session successfully!");
      },
      onError: (error) => {
        toast.error(error.message || "Failed to join session");
      },
    });

  // Auto-join if active session found
  useEffect(() => {
    if (activeSessions?.session && !activeSession) {
      setActiveSession({
        id: activeSessions.session.id,
        roomCode: activeSessions.session.roomCode,
        title: activeSessions.session.title || "Live Shopping Session",
        hostName: activeSessions.session.hostName || "Staff",
        status: activeSessions.session.status,
      });
      // Don't auto-enter, let user click to join
    }
  }, [activeSessions, activeSession]);

  const handleJoinByCode = () => {
    if (!roomCodeInput.trim()) {
      toast.error("Please enter a room code");
      return;
    }
    joinSessionMutation.mutate({ roomCode: roomCodeInput.trim() });
  };

  const handleEnterSession = () => {
    if (activeSession) {
      setIsSessionActive(true);
    }
  };

  const handleExitSession = () => {
    setIsSessionActive(false);
  };

  // Loading state
  if (!isInitialized) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Active session view
  if (isSessionActive && activeSession && sessionToken) {
    return (
      <LiveShoppingSession
        sessionId={activeSession.id}
        roomCode={activeSession.roomCode}
        onClose={handleExitSession}
      />
    );
  }

  // Join/Select session view
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-10 border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Video className="h-5 w-5" />
              Live Shopping
            </h1>
            <p className="text-sm text-muted-foreground">
              Join your personalized shopping session
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Active Session Card */}
        {activeSession && (
          <Card className="border-green-200 bg-green-50/50">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Radio className="h-5 w-5 text-green-600 animate-pulse" />
                <CardTitle className="text-green-800">
                  Active Session Available
                </CardTitle>
              </div>
              <CardDescription>
                You have an active live shopping session with {activeSession.hostName}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">{activeSession.title}</p>
                  <p className="text-sm text-muted-foreground">
                    Host: {activeSession.hostName}
                  </p>
                  <p className="text-xs text-green-600 font-medium mt-1">
                    Status: {activeSession.status}
                  </p>
                </div>
                <Button
                  size="lg"
                  onClick={handleEnterSession}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Enter Session
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Join by Room Code */}
        <Card>
          <CardHeader>
            <CardTitle>Join Session</CardTitle>
            <CardDescription>
              Enter the room code provided by your sales representative
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Enter room code..."
                value={roomCodeInput}
                onChange={(e) => setRoomCodeInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleJoinByCode()}
                className="font-mono"
              />
              <Button
                onClick={handleJoinByCode}
                disabled={joinSessionMutation.isPending || !roomCodeInput.trim()}
              >
                {joinSessionMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Join"
                )}
              </Button>
            </div>
            {joinSessionMutation.isError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>
                  {joinSessionMutation.error?.message || "Failed to join session"}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>How Live Shopping Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col items-center text-center p-4 rounded-lg bg-amber-50">
                <div className="text-3xl mb-2">1</div>
                <h3 className="font-medium text-amber-800">Request Samples</h3>
                <p className="text-sm text-muted-foreground">
                  Mark items you want to see up close
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4 rounded-lg bg-blue-50">
                <div className="text-3xl mb-2">2</div>
                <h3 className="font-medium text-blue-800">Show Interest</h3>
                <p className="text-sm text-muted-foreground">
                  Discuss pricing and negotiate
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-4 rounded-lg bg-green-50">
                <div className="text-3xl mb-2">3</div>
                <h3 className="font-medium text-green-800">Ready to Buy</h3>
                <p className="text-sm text-muted-foreground">
                  Confirm items for your order
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* No Active Session Notice */}
        {!activeSession && !checkingActive && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>No Active Sessions</AlertTitle>
            <AlertDescription>
              You don't have any active live shopping sessions. Enter a room code
              to join a session, or contact your sales representative to schedule one.
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  );
}

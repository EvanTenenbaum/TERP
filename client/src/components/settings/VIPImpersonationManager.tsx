// @ts-nocheck - TEMPORARY: Type mismatch errors, needs Wave 1 fix
/**
 * VIP Portal Impersonation Manager (FEATURE-012)
 * 
 * Admin tool for managing VIP portal impersonation sessions.
 * Provides:
 * - List of all VIP-enabled clients with search
 * - One-click impersonation with audit logging
 * - Active session monitoring
 * - Session history and audit log viewing
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { 
  Search, 
  ExternalLink, 
  Eye, 
  Clock, 
  Shield, 
  AlertTriangle,
  XCircle,
  History,
  User,
  Building2,
  RefreshCw,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";

interface Client {
  id: number;
  name: string;
  email?: string;
  vipPortalEnabled: boolean;
  vipPortalLastLogin?: Date | null;
}

interface ImpersonationSession {
  id: number;
  sessionGuid: string;
  adminUserId: number;
  clientId: number;
  startAt: Date;
  endAt?: Date | null;
  status: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  revokedBy?: number | null;
  revokedAt?: Date | null;
  revokeReason?: string | null;
}

export function VIPImpersonationManager() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedSessionForHistory, setSelectedSessionForHistory] = useState<ImpersonationSession | null>(null);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [sessionToRevoke, setSessionToRevoke] = useState<ImpersonationSession | null>(null);
  const [revokeReason, setRevokeReason] = useState("");

  // Fetch VIP-enabled clients
  const { data: clientsData, isLoading: clientsLoading, refetch: refetchClients } = 
    trpc.vipPortalAdmin.clients.listVipClients.useQuery({ limit: 100 });

  // Fetch active impersonation sessions
  const { data: activeSessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = 
    trpc.vipPortalAdmin.audit.getActiveSessions.useQuery({ limit: 50 });

  // Fetch session history
  const { data: historyData, isLoading: historyLoading, refetch: refetchHistory } = 
    trpc.vipPortalAdmin.audit.getSessionHistory.useQuery({ limit: 100 });

  // Create impersonation session mutation
  const createSessionMutation = trpc.vipPortalAdmin.audit.createImpersonationSession.useMutation({
    onSuccess: (data) => {
      // Open the VIP portal in a new tab with the one-time token
      const portalUrl = `/vip-portal/auth/impersonate?token=${encodeURIComponent(data.oneTimeToken)}`;
      window.open(portalUrl, "_blank");
      toast.success(`Impersonation session started for ${data.clientName}`);
      refetchSessions();
      setShowConfirmDialog(false);
      setSelectedClient(null);
    },
    onError: (error) => {
      toast.error(`Failed to start impersonation: ${error.message}`);
    },
  });

  // Revoke session mutation
  const revokeSessionMutation = trpc.vipPortalAdmin.audit.revokeSession.useMutation({
    onSuccess: () => {
      toast.success("Session revoked successfully");
      refetchSessions();
      refetchHistory();
      setShowRevokeDialog(false);
      setSessionToRevoke(null);
      setRevokeReason("");
    },
    onError: (error) => {
      toast.error(`Failed to revoke session: ${error.message}`);
    },
  });

  // Filter clients by search query
  const filteredClients = clientsData?.clients?.filter((client: Client) =>
    client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const handleImpersonateClick = (client: Client) => {
    setSelectedClient(client);
    setShowConfirmDialog(true);
  };

  const handleConfirmImpersonate = () => {
    if (selectedClient) {
      createSessionMutation.mutate({ clientId: selectedClient.id });
    }
  };

  const handleRevokeClick = (session: ImpersonationSession) => {
    setSessionToRevoke(session);
    setShowRevokeDialog(true);
  };

  const handleConfirmRevoke = () => {
    if (sessionToRevoke) {
      revokeSessionMutation.mutate({
        sessionGuid: sessionToRevoke.sessionGuid,
        reason: revokeReason || undefined,
      });
    }
  };

  const handleViewHistory = (session: ImpersonationSession) => {
    setSelectedSessionForHistory(session);
    setShowHistoryDialog(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return <Badge className="bg-green-500">Active</Badge>;
      case "ENDED":
        return <Badge variant="secondary">Ended</Badge>;
      case "REVOKED":
        return <Badge variant="destructive">Revoked</Badge>;
      case "EXPIRED":
        return <Badge variant="outline">Expired</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-primary" />
            <CardTitle>VIP Portal Impersonation Manager</CardTitle>
          </div>
          <CardDescription>
            Access client VIP portals for support and troubleshooting. All sessions are fully audited.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="clients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="clients" className="gap-2">
            <Building2 className="h-4 w-4" />
            VIP Clients
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2">
            <Eye className="h-4 w-4" />
            Active Sessions
            {activeSessionsData?.sessions?.length ? (
              <Badge variant="secondary" className="ml-1">
                {activeSessionsData.sessions.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            Audit History
          </TabsTrigger>
        </TabsList>

        {/* VIP Clients Tab */}
        <TabsContent value="clients">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-lg">VIP-Enabled Clients</CardTitle>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1 sm:w-64">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search clients..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={() => refetchClients()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {clientsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchQuery ? "No clients match your search" : "No VIP-enabled clients found"}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Client</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Last Login</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredClients.map((client: Client) => (
                      <TableRow key={client.id}>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.email || "-"}</TableCell>
                        <TableCell>
                          {client.vipPortalLastLogin ? (
                            <span className="text-sm text-muted-foreground">
                              {formatDistanceToNow(new Date(client.vipPortalLastLogin), { addSuffix: true })}
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">Never</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => handleImpersonateClick(client)}
                            disabled={createSessionMutation.isPending}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            Login as Client
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Active Sessions Tab */}
        <TabsContent value="active">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Active Impersonation Sessions</CardTitle>
                <Button variant="outline" size="icon" onClick={() => refetchSessions()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {sessionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !activeSessionsData?.sessions?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  No active impersonation sessions
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Admin</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {activeSessionsData.sessions.map((session: ImpersonationSession) => (
                      <TableRow key={session.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            User #{session.adminUserId}
                          </div>
                        </TableCell>
                        <TableCell>Client #{session.clientId}</TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3" />
                            {formatDistanceToNow(new Date(session.startAt), { addSuffix: true })}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(session.status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewHistory(session)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleRevokeClick(session)}
                              disabled={revokeSessionMutation.isPending}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit History Tab */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Session History</CardTitle>
                <Button variant="outline" size="icon" onClick={() => refetchHistory()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : !historyData?.sessions?.length ? (
                <div className="text-center py-8 text-muted-foreground">
                  No session history found
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session ID</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Client</TableHead>
                      <TableHead>Started</TableHead>
                      <TableHead>Ended</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {historyData.sessions.map((session: ImpersonationSession) => (
                      <TableRow key={session.id}>
                        <TableCell className="font-mono text-xs">
                          {session.sessionGuid.substring(0, 8)}...
                        </TableCell>
                        <TableCell>User #{session.adminUserId}</TableCell>
                        <TableCell>Client #{session.clientId}</TableCell>
                        <TableCell className="text-sm">
                          {format(new Date(session.startAt), "MMM d, HH:mm")}
                        </TableCell>
                        <TableCell className="text-sm">
                          {session.endAt 
                            ? format(new Date(session.endAt), "MMM d, HH:mm")
                            : "-"
                          }
                        </TableCell>
                        <TableCell>{getStatusBadge(session.status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewHistory(session)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Confirm Impersonation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Confirm Impersonation
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You are about to access the VIP portal as <strong>{selectedClient?.name}</strong>.
              </p>
              <p className="text-amber-600">
                All actions during this session will be logged for audit purposes.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmImpersonate}
              disabled={createSessionMutation.isPending}
            >
              {createSessionMutation.isPending ? "Starting..." : "Start Impersonation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke Session Dialog */}
      <AlertDialog open={showRevokeDialog} onOpenChange={setShowRevokeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-destructive">
              <XCircle className="h-5 w-5" />
              Revoke Session
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-4">
              <p>
                This will immediately terminate the impersonation session. The user will be logged out.
              </p>
              <div className="space-y-2">
                <label className="text-sm font-medium">Reason (optional)</label>
                <Input
                  placeholder="Enter reason for revocation..."
                  value={revokeReason}
                  onChange={(e) => setRevokeReason(e.target.value)}
                />
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmRevoke}
              disabled={revokeSessionMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revokeSessionMutation.isPending ? "Revoking..." : "Revoke Session"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Session Details Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Session Details</DialogTitle>
            <DialogDescription>
              Detailed information about this impersonation session
            </DialogDescription>
          </DialogHeader>
          {selectedSessionForHistory && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Session ID:</span>
                  <p className="font-mono">{selectedSessionForHistory.sessionGuid}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>
                  <p>{getStatusBadge(selectedSessionForHistory.status)}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Admin User:</span>
                  <p>User #{selectedSessionForHistory.adminUserId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Client:</span>
                  <p>Client #{selectedSessionForHistory.clientId}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Started:</span>
                  <p>{format(new Date(selectedSessionForHistory.startAt), "PPpp")}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Ended:</span>
                  <p>
                    {selectedSessionForHistory.endAt 
                      ? format(new Date(selectedSessionForHistory.endAt), "PPpp")
                      : "Still active"
                    }
                  </p>
                </div>
                {selectedSessionForHistory.ipAddress && (
                  <div>
                    <span className="text-muted-foreground">IP Address:</span>
                    <p className="font-mono">{selectedSessionForHistory.ipAddress}</p>
                  </div>
                )}
                {selectedSessionForHistory.revokeReason && (
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Revoke Reason:</span>
                    <p className="text-destructive">{selectedSessionForHistory.revokeReason}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

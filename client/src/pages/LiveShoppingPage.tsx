/**
 * Live Shopping Page
 *
 * Staff-facing page for managing real-time sales sessions with clients.
 * Part of FEATURE-016: Live Shopping Module
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import {
  Video,
  Plus,
  Play,
  ExternalLink,
  Loader2,
  Calendar,
  ShoppingCart,
} from "lucide-react";

type SessionStatus =
  | "SCHEDULED"
  | "ACTIVE"
  | "PAUSED"
  | "ENDED"
  | "CONVERTED"
  | "CANCELLED";

const statusConfig: Record<
  SessionStatus,
  {
    label: string;
    variant: "default" | "secondary" | "destructive" | "outline";
  }
> = {
  SCHEDULED: { label: "Scheduled", variant: "secondary" },
  ACTIVE: { label: "Active", variant: "default" },
  PAUSED: { label: "Paused", variant: "outline" },
  ENDED: { label: "Ended", variant: "secondary" },
  CONVERTED: { label: "Converted", variant: "default" },
  CANCELLED: { label: "Cancelled", variant: "destructive" },
};

export default function LiveShoppingPage() {
  const { toast } = useToast();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<SessionStatus | "all">(
    "all"
  );

  // Form state for creating new session
  const [newSession, setNewSession] = useState({
    clientId: "",
    title: "",
    scheduledAt: "",
    internalNotes: "",
  });

  // Fetch sessions
  const {
    data: sessionsData,
    isLoading: sessionsLoading,
    refetch: refetchSessions,
  } = trpc.liveShopping.listSessions.useQuery({
    status: statusFilter === "all" ? undefined : statusFilter,
    limit: 50,
  });

  // Fetch clients for dropdown
  const { data: clientsData } = trpc.clients.list.useQuery({ limit: 200 });

  // Create session mutation
  const createSessionMutation = trpc.liveShopping.createSession.useMutation({
    onSuccess: data => {
      toast({
        title: "Session Created",
        description: `Session created successfully. Room code: ${data.roomCode}`,
      });
      setCreateDialogOpen(false);
      setNewSession({
        clientId: "",
        title: "",
        scheduledAt: "",
        internalNotes: "",
      });
      refetchSessions();
    },
    onError: error => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleCreateSession = () => {
    if (!newSession.clientId) {
      toast({
        title: "Client Required",
        description: "Please select a client for this session.",
        variant: "destructive",
      });
      return;
    }

    createSessionMutation.mutate({
      clientId: parseInt(newSession.clientId),
      title: newSession.title || undefined,
      scheduledAt: newSession.scheduledAt || undefined,
      internalNotes: newSession.internalNotes || undefined,
    });
  };

  const sessions = sessionsData || [];

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Video className="h-8 w-8" />
            Live Shopping
          </h1>
          <p className="text-muted-foreground">
            Manage real-time sales sessions with your clients
          </p>
        </div>
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Session
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Create Live Shopping Session</DialogTitle>
              <DialogDescription>
                Start a new real-time sales session with a client.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="client">Client *</Label>
                <Select
                  value={newSession.clientId}
                  onValueChange={value =>
                    setNewSession({ ...newSession, clientId: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    {clientsData?.items?.map(client => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="title">Session Title (Optional)</Label>
                <Input
                  id="title"
                  placeholder="e.g., Q4 Restock Review"
                  value={newSession.title}
                  onChange={e =>
                    setNewSession({ ...newSession, title: e.target.value })
                  }
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="scheduledAt">Schedule For (Optional)</Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  value={newSession.scheduledAt}
                  onChange={e =>
                    setNewSession({
                      ...newSession,
                      scheduledAt: e.target.value,
                    })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Leave blank to start immediately
                </p>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="notes">Internal Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Notes visible only to staff..."
                  value={newSession.internalNotes}
                  onChange={e =>
                    setNewSession({
                      ...newSession,
                      internalNotes: e.target.value,
                    })
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setCreateDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateSession}
                disabled={
                  createSessionMutation.isPending || !newSession.clientId
                }
              >
                {createSessionMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Session"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Sessions
            </CardTitle>
            <Play className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.filter(s => s.status === "ACTIVE").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            <Calendar className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.filter(s => s.status === "SCHEDULED").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Sessions
            </CardTitle>
            <Video className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Converted</CardTitle>
            <ShoppingCart className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {sessions.filter(s => s.status === "CONVERTED").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sessions Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Sessions</CardTitle>
              <CardDescription>
                View and manage all live shopping sessions
              </CardDescription>
            </div>
            <Select
              value={statusFilter}
              onValueChange={value =>
                setStatusFilter(value as SessionStatus | "all")
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active</SelectItem>
                <SelectItem value="SCHEDULED">Scheduled</SelectItem>
                <SelectItem value="PAUSED">Paused</SelectItem>
                <SelectItem value="ENDED">Ended</SelectItem>
                <SelectItem value="CONVERTED">Converted</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {sessionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No sessions found</p>
              <p className="text-sm">Create a new session to get started</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Host</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.map(session => {
                  const status = session.status as SessionStatus;
                  const config = statusConfig[status] || statusConfig.ENDED;
                  return (
                    <TableRow key={session.id}>
                      <TableCell>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </TableCell>
                      <TableCell className="font-medium">
                        {session.title}
                      </TableCell>
                      <TableCell>{session.clientName}</TableCell>
                      <TableCell>{session.hostName}</TableCell>
                      <TableCell>{session.itemCount}</TableCell>
                      <TableCell>
                        {session.scheduledAt
                          ? format(
                              new Date(session.scheduledAt),
                              "MMM d, h:mm a"
                            )
                          : session.createdAt
                            ? format(
                                new Date(session.createdAt),
                                "MMM d, h:mm a"
                              )
                            : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          disabled
                          title="Session detail view planned for post-MVP"
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

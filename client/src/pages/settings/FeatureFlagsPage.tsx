/**
 * Feature Flags Admin Page
 *
 * Allows administrators to manage feature flags, including:
 * - Viewing all flags and their status
 * - Toggling system-wide enable/disable
 * - Managing role and user overrides
 * - Viewing audit history
 */

import React, { useState } from "react";
import { trpc } from "../../lib/trpc";
import { useToast } from "../../hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Switch } from "../../components/ui/switch";
import { Badge } from "../../components/ui/badge";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../../components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../../components/ui/tabs";
import {
  Check,
  Flag,
  History,
  Loader2,
  Plus,
  RefreshCw,
  Settings,
  Shield,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function FeatureFlagsPage() {
  const { toast } = useToast();
  const [selectedFlag, setSelectedFlag] = useState<number | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isOverrideDialogOpen, setIsOverrideDialogOpen] = useState(false);

  // Queries
  const {
    data: flags,
    isLoading,
    refetch,
  } = trpc.featureFlags.getAll.useQuery();
  const { data: auditHistory, refetch: refetchAudit } =
    trpc.featureFlags.getAuditHistory.useQuery({ limit: 50 });
  const { data: users } = trpc.userManagement.listUsers.useQuery();
  const { data: rolesData } = trpc.rbacRoles.list.useQuery({
    includeSystemRoles: true,
  });

  // Mutations
  const toggleMutation = trpc.featureFlags.toggleSystemEnabled.useMutation({
    onSuccess: () => {
      toast({
        title: "Flag updated",
        description: "System enabled status changed.",
      });
      refetch();
      refetchAudit();
    },
    onError: error => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const createMutation = trpc.featureFlags.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Flag created",
        description: "New feature flag has been created.",
      });
      setIsCreateDialogOpen(false);
      refetch();
      refetchAudit();
    },
    onError: error => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const invalidateCachesMutation =
    trpc.featureFlags.invalidateAllCaches.useMutation({
      onSuccess: () => {
        toast({
          title: "Caches cleared",
          description: "All feature flag caches have been invalidated.",
        });
      },
    });

  const seedDefaultsMutation = trpc.featureFlags.seedDefaults.useMutation({
    onSuccess: result => {
      toast({
        title: "Seed complete",
        description: `Created ${result.created} flags, skipped ${result.skipped} existing.`,
      });
      refetch();
    },
    onError: error => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const toggleDefaultMutation = trpc.featureFlags.update.useMutation({
    onSuccess: () => {
      toast({
        title: "Flag updated",
        description: "Default enabled status changed.",
      });
      refetch();
      refetchAudit();
    },
    onError: error => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleToggle = (id: number, currentEnabled: boolean) => {
    toggleMutation.mutate({ id, enabled: !currentEnabled });
  };

  const handleToggleDefault = (id: number, currentEnabled: boolean) => {
    toggleDefaultMutation.mutate({ id, defaultEnabled: !currentEnabled });
  };

  const handleOpenOverrides = (flagId: number) => {
    setSelectedFlag(flagId);
    setIsOverrideDialogOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const selectedFlagData = flags?.find(f => f.id === selectedFlag);

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Feature Flags</h1>
          <p className="text-muted-foreground">
            Manage feature availability across the application
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => seedDefaultsMutation.mutate()}
            disabled={seedDefaultsMutation.isPending}
          >
            <Settings
              className={`h-4 w-4 mr-2 ${seedDefaultsMutation.isPending ? "animate-spin" : ""}`}
            />
            Seed Defaults
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => invalidateCachesMutation.mutate()}
            disabled={invalidateCachesMutation.isPending}
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${invalidateCachesMutation.isPending ? "animate-spin" : ""}`}
            />
            Clear Caches
          </Button>
          <Dialog
            open={isCreateDialogOpen}
            onOpenChange={setIsCreateDialogOpen}
          >
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="h-4 w-4 mr-2" />
                New Flag
              </Button>
            </DialogTrigger>
            <CreateFlagDialog
              onSubmit={data => createMutation.mutate(data)}
              isLoading={createMutation.isPending}
            />
          </Dialog>
        </div>
      </div>

      <Tabs defaultValue="flags">
        <TabsList>
          <TabsTrigger value="flags">
            <Flag className="h-4 w-4 mr-2" />
            Flags ({flags?.length || 0})
          </TabsTrigger>
          <TabsTrigger value="audit">
            <History className="h-4 w-4 mr-2" />
            Audit History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flags" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Flag</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>System</TableHead>
                    <TableHead>Default</TableHead>
                    <TableHead>Depends On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {flags?.map(flag => (
                    <TableRow key={flag.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{flag.name}</div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {flag.key}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {flag.module ? (
                          <Badge variant="outline">{flag.module}</Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={flag.systemEnabled}
                          onCheckedChange={() =>
                            handleToggle(flag.id, flag.systemEnabled)
                          }
                          disabled={toggleMutation.isPending}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={flag.defaultEnabled}
                          onCheckedChange={() =>
                            handleToggleDefault(flag.id, flag.defaultEnabled)
                          }
                          disabled={toggleDefaultMutation.isPending}
                        />
                      </TableCell>
                      <TableCell>
                        {flag.dependsOn ? (
                          <Badge
                            variant="outline"
                            className="font-mono text-xs"
                          >
                            {flag.dependsOn}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleOpenOverrides(flag.id)}
                          title="Manage Overrides"
                        >
                          <Users className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!flags || flags.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Flag className="h-8 w-8" />
                          <p>No feature flags defined yet</p>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsCreateDialogOpen(true)}
                          >
                            Create your first flag
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Audit History</CardTitle>
              <CardDescription>Recent changes to feature flags</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Flag</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Actor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditHistory?.map(entry => (
                    <TableRow key={entry.id}>
                      <TableCell className="text-muted-foreground">
                        {formatDistanceToNow(new Date(entry.createdAt), {
                          addSuffix: true,
                        })}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {entry.flagKey}
                      </TableCell>
                      <TableCell>
                        <ActionBadge action={entry.action} />
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {entry.actorOpenId}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!auditHistory || auditHistory.length === 0) && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No audit history yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Override Management Dialog */}
      <Dialog
        open={isOverrideDialogOpen}
        onOpenChange={setIsOverrideDialogOpen}
      >
        <DialogContent className="w-full sm:max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Manage Overrides: {selectedFlagData?.name}
            </DialogTitle>
            <DialogDescription>
              Configure user and role-specific overrides for this feature flag.
              Overrides take precedence over the default value.
            </DialogDescription>
          </DialogHeader>
          {selectedFlag && (
            <OverrideManagement
              flagId={selectedFlag}
              flagKey={selectedFlagData?.key || ""}
              users={users || []}
              roles={rolesData?.roles || []}
              onUpdate={() => {
                refetchAudit();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Override Management Component
// ============================================================================

interface OverrideManagementProps {
  flagId: number;
  flagKey: string;
  users: Array<{
    id: number;
    openId: string;
    name: string | null;
    email: string | null;
  }>;
  roles: Array<{ id: number; name: string; description: string | null }>;
  onUpdate: () => void;
}

function OverrideManagement({
  flagId,
  flagKey: _flagKey,
  users,
  roles,
  onUpdate,
}: OverrideManagementProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<"users" | "roles">("users");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [_selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [userSearchQuery, setUserSearchQuery] = useState("");

  // Queries for existing overrides
  const { data: roleOverrides, refetch: refetchRoleOverrides } =
    trpc.featureFlags.getRoleOverrides.useQuery({ flagId });

  // Mutations
  const setUserOverrideMutation = trpc.featureFlags.setUserOverride.useMutation(
    {
      onSuccess: () => {
        toast({
          title: "User override set",
          description: "The user override has been saved.",
        });
        setSelectedUserId("");
        onUpdate();
      },
      onError: error => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    }
  );

  const removeUserOverrideMutation =
    trpc.featureFlags.removeUserOverride.useMutation({
      onSuccess: () => {
        toast({
          title: "Override removed",
          description: "The user override has been removed.",
        });
        onUpdate();
      },
      onError: error => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const setRoleOverrideMutation = trpc.featureFlags.setRoleOverride.useMutation(
    {
      onSuccess: () => {
        toast({
          title: "Role override set",
          description: "The role override has been saved.",
        });
        setSelectedRoleId("");
        refetchRoleOverrides();
        onUpdate();
      },
      onError: error => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    }
  );

  const removeRoleOverrideMutation =
    trpc.featureFlags.removeRoleOverride.useMutation({
      onSuccess: () => {
        toast({
          title: "Override removed",
          description: "The role override has been removed.",
        });
        refetchRoleOverrides();
        onUpdate();
      },
      onError: error => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  // Filter users based on search query
  const filteredUsers = users.filter(
    user =>
      user.name?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.email?.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      user.openId?.toLowerCase().includes(userSearchQuery.toLowerCase())
  );

  const handleSetUserOverride = (userOpenId: string, enabled: boolean) => {
    setUserOverrideMutation.mutate({ flagId, userOpenId, enabled });
  };

  const _handleRemoveUserOverride = (userOpenId: string) => {
    removeUserOverrideMutation.mutate({ flagId, userOpenId });
  };

  const handleSetRoleOverride = (roleId: number, enabled: boolean) => {
    setRoleOverrideMutation.mutate({ flagId, roleId, enabled });
  };

  const handleRemoveRoleOverride = (roleId: number) => {
    removeRoleOverrideMutation.mutate({ flagId, roleId });
  };

  // Check if a role has an override
  const getRoleOverride = (roleId: number) => {
    return roleOverrides?.find(o => o.roleId === roleId);
  };

  return (
    <div className="space-y-4">
      <Tabs
        value={activeTab}
        onValueChange={v => setActiveTab(v as "users" | "roles")}
      >
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">
            <User className="h-4 w-4 mr-2" />
            User Overrides
          </TabsTrigger>
          <TabsTrigger value="roles">
            <Shield className="h-4 w-4 mr-2" />
            Role Overrides
          </TabsTrigger>
        </TabsList>

        {/* User Overrides Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add User Override</CardTitle>
              <CardDescription>
                Search for a user and set their override for this flag
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Search users by name, email, or ID..."
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                  />
                </div>
              </div>

              {userSearchQuery && (
                <div className="border rounded-md max-h-48 overflow-y-auto">
                  {filteredUsers.length === 0 ? (
                    <div className="p-4 text-center text-muted-foreground">
                      No users found
                    </div>
                  ) : (
                    filteredUsers.slice(0, 10).map(user => (
                      <div
                        key={user.openId}
                        className="flex items-center justify-between p-3 border-b last:border-b-0 hover:bg-muted/50"
                      >
                        <div>
                          <div className="font-medium">
                            {user.name || "Unknown"}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {user.email}
                          </div>
                          <div className="text-xs text-muted-foreground font-mono">
                            {user.openId}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-green-50 hover:bg-green-100 text-green-700"
                            onClick={() =>
                              handleSetUserOverride(user.openId, true)
                            }
                            disabled={setUserOverrideMutation.isPending}
                          >
                            <Check className="h-3 w-3 mr-1" />
                            Enable
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="bg-red-50 hover:bg-red-100 text-red-700"
                            onClick={() =>
                              handleSetUserOverride(user.openId, false)
                            }
                            disabled={setUserOverrideMutation.isPending}
                          >
                            <X className="h-3 w-3 mr-1" />
                            Disable
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                  {filteredUsers.length > 10 && (
                    <div className="p-2 text-center text-sm text-muted-foreground bg-muted/30">
                      Showing 10 of {filteredUsers.length} users. Refine your
                      search.
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Quick Override by User ID
              </CardTitle>
              <CardDescription>
                Directly enter a user's OpenID to set an override
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter user OpenID..."
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  className="flex-1"
                />
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-green-50 hover:bg-green-100 text-green-700"
                  onClick={() => handleSetUserOverride(selectedUserId, true)}
                  disabled={
                    !selectedUserId || setUserOverrideMutation.isPending
                  }
                >
                  <Check className="h-3 w-3 mr-1" />
                  Enable
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="bg-red-50 hover:bg-red-100 text-red-700"
                  onClick={() => handleSetUserOverride(selectedUserId, false)}
                  disabled={
                    !selectedUserId || setUserOverrideMutation.isPending
                  }
                >
                  <X className="h-3 w-3 mr-1" />
                  Disable
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Role Overrides Tab */}
        <TabsContent value="roles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Role Overrides</CardTitle>
              <CardDescription>
                Set overrides for entire roles. Users with multiple roles get
                the most permissive override.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Override Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map(role => {
                    const override = getRoleOverride(role.id);
                    return (
                      <TableRow key={role.id}>
                        <TableCell className="font-medium">
                          {role.name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {role.description || "—"}
                        </TableCell>
                        <TableCell>
                          {override ? (
                            override.enabled ? (
                              <Badge className="bg-green-500">
                                <Check className="h-3 w-3 mr-1" />
                                Enabled
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <X className="h-3 w-3 mr-1" />
                                Disabled
                              </Badge>
                            )
                          ) : (
                            <Badge variant="outline">No Override</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50"
                              onClick={() =>
                                handleSetRoleOverride(role.id, true)
                              }
                              disabled={setRoleOverrideMutation.isPending}
                              title="Enable for this role"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                              onClick={() =>
                                handleSetRoleOverride(role.id, false)
                              }
                              disabled={setRoleOverrideMutation.isPending}
                              title="Disable for this role"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            {override && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                                onClick={() =>
                                  handleRemoveRoleOverride(role.id)
                                }
                                disabled={removeRoleOverrideMutation.isPending}
                                title="Remove override"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {roles.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-8 text-muted-foreground"
                      >
                        No roles available
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

function ActionBadge({ action }: { action: string }) {
  const variants: Record<
    string,
    {
      variant: "default" | "secondary" | "destructive" | "outline";
      label: string;
    }
  > = {
    created: { variant: "default", label: "Created" },
    updated: { variant: "secondary", label: "Updated" },
    deleted: { variant: "destructive", label: "Deleted" },
    enabled: { variant: "default", label: "Enabled" },
    disabled: { variant: "secondary", label: "Disabled" },
    override_added: { variant: "outline", label: "Override Added" },
    override_removed: { variant: "outline", label: "Override Removed" },
    user_override_set: { variant: "outline", label: "User Override Set" },
    user_override_removed: {
      variant: "outline",
      label: "User Override Removed",
    },
    role_override_set: { variant: "outline", label: "Role Override Set" },
    role_override_removed: {
      variant: "outline",
      label: "Role Override Removed",
    },
  };

  const config = variants[action] || {
    variant: "outline" as const,
    label: action,
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}

interface CreateFlagDialogProps {
  onSubmit: (data: {
    key: string;
    name: string;
    description?: string;
    module?: string;
    systemEnabled: boolean;
    defaultEnabled: boolean;
    dependsOn?: string;
  }) => void;
  isLoading: boolean;
}

function CreateFlagDialog({ onSubmit, isLoading }: CreateFlagDialogProps) {
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [module, setModule] = useState("");
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [defaultEnabled, setDefaultEnabled] = useState(false);
  const [dependsOn, setDependsOn] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      key,
      name,
      description: description || undefined,
      module: module || undefined,
      systemEnabled,
      defaultEnabled,
      dependsOn: dependsOn || undefined,
    });
  };

  return (
    <DialogContent>
      <form onSubmit={handleSubmit}>
        <DialogHeader>
          <DialogTitle>Create Feature Flag</DialogTitle>
          <DialogDescription>
            Add a new feature flag to control feature availability.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="key">Key</Label>
            <Input
              id="key"
              placeholder="my-feature"
              value={key}
              onChange={e =>
                setKey(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))
              }
              required
            />
            <p className="text-xs text-muted-foreground">
              Lowercase alphanumeric with hyphens only
            </p>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              placeholder="My Feature"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What this flag controls..."
              value={description}
              onChange={e => setDescription(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="module">Module (optional)</Label>
            <Input
              id="module"
              placeholder="module-accounting"
              value={module}
              onChange={e => setModule(e.target.value)}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="dependsOn">Depends On (optional)</Label>
            <Input
              id="dependsOn"
              placeholder="parent-flag-key"
              value={dependsOn}
              onChange={e => setDependsOn(e.target.value)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="systemEnabled">System Enabled</Label>
            <Switch
              id="systemEnabled"
              checked={systemEnabled}
              onCheckedChange={setSystemEnabled}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label htmlFor="defaultEnabled">Default Enabled</Label>
            <Switch
              id="defaultEnabled"
              checked={defaultEnabled}
              onCheckedChange={setDefaultEnabled}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="submit" disabled={isLoading || !key || !name}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Create Flag
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
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
import { Shield, Plus, Edit2, Trash2, Eye, Save, X, Users } from "lucide-react";
import { toast } from "sonner";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Role Management Component
 *
 * Allows administrators to:
 * - View all roles with permission and user counts
 * - Create new custom roles
 * - Edit existing custom roles (system roles are protected)
 * - Delete custom roles
 * - View role details including all assigned permissions
 */

interface EditableRole {
  id: number;
  name: string;
  description: string | null;
  isSystemRole: boolean;
}

interface RoleWithCounts {
  id: number;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  permissionCount: number;
  userCount: number;
  createdAt: Date;
  updatedAt: Date;
}

interface RolePermission {
  permissionId: number;
  permissionName: string;
  permissionModule: string;
  permissionDescription: string | null;
}

export function RoleManagement() {
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [editingRole, setEditingRole] = useState<EditableRole | null>(null);
  const [viewingRoleId, setViewingRoleId] = useState<number | null>(null);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [deleteRoleInfo, setDeleteRoleInfo] = useState<{
    roleId: number;
    roleName: string;
  } | null>(null);

  const utils = trpc.useUtils();

  // Fetch all roles
  const { data: rolesData, isLoading: rolesLoading } =
    trpc.rbacRoles.list.useQuery({
      limit: 100,
      offset: 0,
      includeSystemRoles: true,
    });

  // Fetch role details when viewing
  const { data: roleDetails, isLoading: roleDetailsLoading } =
    trpc.rbacRoles.getById.useQuery(
      { roleId: viewingRoleId ?? 0 },
      { enabled: !!viewingRoleId }
    );

  // Mutations
  const createRoleMutation = trpc.rbacRoles.create.useMutation({
    onSuccess: () => {
      toast.success("Role created successfully");
      utils.rbacRoles.list.invalidate();
      setNewRoleName("");
      setNewRoleDescription("");
      setShowCreateDialog(false);
    },
    onError: error => {
      toast.error(`Failed to create role: ${error.message}`);
    },
  });

  const updateRoleMutation = trpc.rbacRoles.update.useMutation({
    onSuccess: () => {
      toast.success("Role updated successfully");
      utils.rbacRoles.list.invalidate();
      utils.rbacRoles.getById.invalidate();
      setEditingRole(null);
    },
    onError: error => {
      toast.error(`Failed to update role: ${error.message}`);
    },
  });

  const deleteRoleMutation = trpc.rbacRoles.delete.useMutation({
    onSuccess: () => {
      toast.success("Role deleted successfully");
      utils.rbacRoles.list.invalidate();
    },
    onError: error => {
      toast.error(`Failed to delete role: ${error.message}`);
    },
  });

  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      toast.error("Role name is required");
      return;
    }

    createRoleMutation.mutate({
      name: newRoleName.trim(),
      description: newRoleDescription.trim() || undefined,
    });
  };

  const handleUpdateRole = () => {
    if (!editingRole || !editingRole.name.trim()) {
      toast.error("Role name is required");
      return;
    }

    updateRoleMutation.mutate({
      roleId: editingRole.id,
      name: editingRole.name.trim(),
      description: editingRole.description?.trim() || undefined,
    });
  };

  const handleDeleteRole = (
    roleId: number,
    roleName: string,
    isSystemRole: boolean
  ) => {
    if (isSystemRole) {
      toast.error("System roles cannot be deleted");
      return;
    }

    setDeleteRoleInfo({ roleId, roleName });
  };

  const confirmDeleteRole = () => {
    if (deleteRoleInfo) {
      deleteRoleMutation.mutate({ roleId: deleteRoleInfo.roleId });
      setDeleteRoleInfo(null);
    }
  };

  const roles = rolesData?.roles || [];

  if (rolesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading roles...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Create Role Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Role Management
          </CardTitle>
          <CardDescription>
            Create and manage roles to organize permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create New Role
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Role</DialogTitle>
                <DialogDescription>
                  Create a custom role to group permissions together
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="role-name">Role Name *</Label>
                  <Input
                    id="role-name"
                    placeholder="e.g., Sales Manager"
                    value={newRoleName}
                    onChange={e => setNewRoleName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role-description">Description</Label>
                  <Textarea
                    id="role-description"
                    placeholder="Describe what this role is for..."
                    value={newRoleDescription}
                    onChange={e => setNewRoleDescription(e.target.value)}
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowCreateDialog(false);
                    setNewRoleName("");
                    setNewRoleDescription("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleCreateRole}
                  disabled={createRoleMutation.isPending}
                >
                  Create Role
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Roles List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            All Roles
          </CardTitle>
          <CardDescription>
            View and manage all system and custom roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          {roles.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No roles found.
            </div>
          ) : (
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Role Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-center">Type</TableHead>
                    <TableHead className="text-center">Permissions</TableHead>
                    <TableHead className="text-center">Users</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role: RoleWithCounts) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">
                        {editingRole?.id === role.id ? (
                          <Input
                            value={editingRole.name}
                            onChange={e =>
                              setEditingRole({
                                ...editingRole,
                                name: e.target.value,
                              })
                            }
                            className="max-w-xs"
                          />
                        ) : (
                          role.name
                        )}
                      </TableCell>
                      <TableCell>
                        {editingRole?.id === role.id ? (
                          <Textarea
                            value={editingRole.description || ""}
                            onChange={e =>
                              setEditingRole({
                                ...editingRole,
                                description: e.target.value,
                              })
                            }
                            rows={2}
                            className="max-w-md"
                          />
                        ) : (
                          <span className="text-muted-foreground">
                            {role.description || "No description"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {role.isSystemRole ? (
                          <Badge variant="default">System</Badge>
                        ) : (
                          <Badge variant="secondary">Custom</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline">
                          {role.permissionCount || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className="flex items-center gap-1 w-fit mx-auto"
                        >
                          <Users className="h-3 w-3" />
                          {role.userCount || 0}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {editingRole?.id === role.id ? (
                            <>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={handleUpdateRole}
                                disabled={updateRoleMutation.isPending}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingRole(null)}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Dialog
                                open={viewingRoleId === role.id}
                                onOpenChange={open => {
                                  if (open) {
                                    setViewingRoleId(role.id);
                                  } else {
                                    setViewingRoleId(null);
                                  }
                                }}
                              >
                                <DialogTrigger asChild>
                                  <Button size="sm" variant="ghost">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="w-full sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle>{role.name}</DialogTitle>
                                    <DialogDescription>
                                      {role.description || "No description"}
                                    </DialogDescription>
                                  </DialogHeader>
                                  {roleDetailsLoading ? (
                                    <div className="py-8 text-center text-muted-foreground">
                                      Loading role details...
                                    </div>
                                  ) : roleDetails ? (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <div className="text-sm font-medium text-muted-foreground">
                                            Type
                                          </div>
                                          <div className="mt-1">
                                            {roleDetails.isSystemRole ? (
                                              <Badge variant="default">
                                                System Role
                                              </Badge>
                                            ) : (
                                              <Badge variant="secondary">
                                                Custom Role
                                              </Badge>
                                            )}
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-sm font-medium text-muted-foreground">
                                            Users Assigned
                                          </div>
                                          <div className="mt-1 flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            {roleDetails.userCount}
                                          </div>
                                        </div>
                                      </div>

                                      <div>
                                        <h4 className="font-semibold mb-3">
                                          Assigned Permissions (
                                          {roleDetails.permissions.length})
                                        </h4>
                                        {roleDetails.permissions.length ===
                                        0 ? (
                                          <div className="text-center py-4 text-muted-foreground">
                                            No permissions assigned to this role
                                          </div>
                                        ) : (
                                          <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {roleDetails.permissions.map(
                                              (permission: RolePermission) => (
                                                <div
                                                  key={permission.permissionId}
                                                  className="p-3 border rounded-lg"
                                                >
                                                  <div className="flex items-start justify-between">
                                                    <div className="flex-1">
                                                      <div className="font-medium flex items-center gap-2">
                                                        {
                                                          permission.permissionName
                                                        }
                                                        <Badge
                                                          variant="outline"
                                                          className="text-xs"
                                                        >
                                                          {
                                                            permission.permissionModule
                                                          }
                                                        </Badge>
                                                      </div>
                                                      {permission.permissionDescription && (
                                                        <div className="text-sm text-muted-foreground mt-1">
                                                          {
                                                            permission.permissionDescription
                                                          }
                                                        </div>
                                                      )}
                                                    </div>
                                                  </div>
                                                </div>
                                              )
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  ) : null}
                                </DialogContent>
                              </Dialog>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingRole(role)}
                                disabled={role.isSystemRole}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleDeleteRole(
                                    role.id,
                                    role.name,
                                    role.isSystemRole
                                  )
                                }
                                disabled={
                                  role.isSystemRole ||
                                  deleteRoleMutation.isPending
                                }
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteRoleInfo}
        onOpenChange={open => !open && setDeleteRoleInfo(null)}
        title="Delete Role"
        description={`Are you sure you want to delete the role "${deleteRoleInfo?.roleName}"? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={confirmDeleteRole}
        isLoading={deleteRoleMutation.isPending}
      />
    </div>
  );
}

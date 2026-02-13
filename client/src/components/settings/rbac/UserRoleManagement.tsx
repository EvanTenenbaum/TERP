/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import { UserPlus, Shield, X, Plus, Eye } from "lucide-react";
import { toast } from "sonner";

import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * User Role Management Component
 * 
 * Allows administrators to:
 * - View all users and their assigned roles
 * - Assign roles to users
 * - Remove roles from users
 * - View user details including permission overrides
 */
export function UserRoleManagement() {
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [removeRoleInfo, setRemoveRoleInfo] = useState<{ userId: string; roleId: number; roleName: string } | null>(null);

  const utils = trpc.useUtils();

  // Fetch users with their roles
  const { data: usersData, isLoading: usersLoading } = trpc.rbacUsers.list.useQuery({
    limit: 100,
    offset: 0,
    search: searchTerm || undefined,
  });

  // Fetch all available roles
  const { data: rolesData, isLoading: rolesLoading } = trpc.rbacRoles.list.useQuery({
    limit: 100,
    offset: 0,
  });

  // Fetch user details when viewing
  const { data: userDetails, isLoading: userDetailsLoading } = trpc.rbacUsers.getById.useQuery(
    { userId: viewingUserId || "" },
    { enabled: !!viewingUserId }
  );

  // Mutations
  const assignRoleMutation = trpc.rbacUsers.assignRole.useMutation({
    onSuccess: () => {
      toast.success("Role assigned successfully");
      utils.rbacUsers.list.invalidate();
      utils.rbacUsers.getById.invalidate();
      setSelectedUserId("");
      setSelectedRoleId("");
    },
    onError: (error) => {
      toast.error(`Failed to assign role: ${error.message}`);
    },
  });

  const removeRoleMutation = trpc.rbacUsers.removeRole.useMutation({
    onSuccess: () => {
      toast.success("Role removed successfully");
      utils.rbacUsers.list.invalidate();
      utils.rbacUsers.getById.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to remove role: ${error.message}`);
    },
  });

  const handleAssignRole = () => {
    if (!selectedUserId || !selectedRoleId) {
      toast.error("Please select both a user and a role");
      return;
    }

    assignRoleMutation.mutate({
      userId: selectedUserId,
      roleId: parseInt(selectedRoleId),
    });
  };

  const handleRemoveRole = (userId: string, roleId: number, roleName: string) => {
    setRemoveRoleInfo({ userId, roleId, roleName });
  };

  const confirmRemoveRole = () => {
    if (removeRoleInfo) {
      removeRoleMutation.mutate({ userId: removeRoleInfo.userId, roleId: removeRoleInfo.roleId });
      setRemoveRoleInfo(null);
    }
  };

  const users = usersData?.users || [];
  const roles = rolesData?.roles || [];

  if (usersLoading || rolesLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading users and roles...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assign Role Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Assign Role to User
          </CardTitle>
          <CardDescription>
            Grant roles to users to control their permissions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="user-select">Select User</Label>
              <Input
                id="user-select"
                placeholder="Enter User ID (e.g., user_123)"
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role-select">Select Role</Label>
              <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                <SelectTrigger id="role-select">
                  <SelectValue placeholder="Choose a role" />
                </SelectTrigger>
                <SelectContent>
                  {roles.map((role: any) => (
                    <SelectItem key={role.id} value={role.id.toString()}>
                      {role.name}
                      {role.isSystemRole && (
                        <Badge variant="outline" className="ml-2">
                          System
                        </Badge>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAssignRole}
                disabled={!selectedUserId || !selectedRoleId || assignRoleMutation.isPending}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Assign Role
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Users */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Users and Their Roles
          </CardTitle>
          <CardDescription>
            View and manage role assignments for all users
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Search by User ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
              />
            </div>

            {users.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No users found. Users will appear here once roles are assigned.
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>User ID</TableHead>
                      <TableHead>Assigned Roles</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((user) => (
                      <TableRow key={user.userId}>
                        <TableCell className="font-mono text-sm">
                          {user.userId}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-2">
                            {user.roles.map((role) => (
                              <Badge
                                key={role.roleId}
                                variant="secondary"
                                className="flex items-center gap-1"
                              >
                                {role.roleName}
                                <button
                                  onClick={() =>
                                    handleRemoveRole(user.userId, role.roleId, role.roleName)
                                  }
                                  className="ml-1 hover:text-destructive"
                                  disabled={removeRoleMutation.isPending}
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewingUserId(user.userId)}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                View Details
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="w-full sm:max-w-2xl max-h-[80vh] overflow-y-auto">
                              <DialogHeader>
                                <DialogTitle>User Details</DialogTitle>
                                <DialogDescription>
                                  User ID: {user.userId}
                                </DialogDescription>
                              </DialogHeader>
                              {userDetailsLoading ? (
                                <div className="py-8 text-center text-muted-foreground">
                                  Loading user details...
                                </div>
                              ) : userDetails ? (
                                <div className="space-y-6">
                                  {/* Roles Section */}
                                  <div>
                                    <h4 className="font-semibold mb-3">Assigned Roles</h4>
                                    <div className="space-y-2">
                                      {userDetails.roles.map((role: any) => (
                                        <div
                                          key={role.roleId}
                                          className="p-3 border rounded-lg"
                                        >
                                          <div className="flex items-center justify-between">
                                            <div>
                                              <div className="font-medium">{role.roleName}</div>
                                              {role.roleDescription && (
                                                <div className="text-sm text-muted-foreground">
                                                  {role.roleDescription}
                                                </div>
                                              )}
                                            </div>
                                            <Badge variant="outline">
                                              Assigned {new Date(role.assignedAt).toLocaleDateString()}
                                            </Badge>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Permission Overrides Section */}
                                  {userDetails.permissionOverrides.length > 0 && (
                                    <div>
                                      <h4 className="font-semibold mb-3">Permission Overrides</h4>
                                      <div className="space-y-2">
                                        {userDetails.permissionOverrides.map((override: any) => (
                                          <div
                                            key={override.permissionId}
                                            className="p-3 border rounded-lg"
                                          >
                                            <div className="flex items-center justify-between">
                                              <div>
                                                <div className="font-medium flex items-center gap-2">
                                                  {override.permissionName}
                                                  <Badge
                                                    variant={override.granted ? "default" : "destructive"}
                                                  >
                                                    {override.granted ? "Granted" : "Revoked"}
                                                  </Badge>
                                                </div>
                                                {override.permissionDescription && (
                                                  <div className="text-sm text-muted-foreground">
                                                    {override.permissionDescription}
                                                  </div>
                                                )}
                                              </div>
                                            </div>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              ) : null}
                            </DialogContent>
                          </Dialog>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!removeRoleInfo}
        onOpenChange={(open) => !open && setRemoveRoleInfo(null)}
        title="Remove Role"
        description={`Are you sure you want to remove the "${removeRoleInfo?.roleName}" role from this user?`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmRemoveRole}
        isLoading={removeRoleMutation.isPending}
      />
    </div>
  );
}

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
import { Key, Shield, Plus, X, Eye, Search } from "lucide-react";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

/**
 * Permission Assignment Component
 * 
 * Allows administrators to:
 * - View all permissions organized by module
 * - Assign permissions to roles
 * - Remove permissions from roles
 * - Search and filter permissions
 * - View permission details including role assignments
 */
export function PermissionAssignment() {
  const [selectedRoleId, setSelectedRoleId] = useState<string>("");
  const [selectedPermissionId, setSelectedPermissionId] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedModule, setSelectedModule] = useState<string>("all");
  const [viewingPermissionId, setViewingPermissionId] = useState<number | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());
  const [removePermissionInfo, setRemovePermissionInfo] = useState<{ roleId: number; roleName: string; permissionId: number } | null>(null);

  const utils = trpc.useUtils();

  // Fetch permissions with filtering
  const { data: permissionsData, isLoading: permissionsLoading } = trpc.rbacPermissions.list.useQuery({
    limit: 500,
    offset: 0,
    search: searchTerm || undefined,
    module: selectedModule !== "all" ? selectedModule : undefined,
  });

  // Fetch all modules for filtering
  const { data: modulesData } = trpc.rbacPermissions.getModules.useQuery();

  // Fetch all roles for assignment
  const { data: rolesData } = trpc.rbacRoles.list.useQuery({
    limit: 100,
    offset: 0,
  });

  // Fetch permission details when viewing
  const { data: permissionDetails, isLoading: permissionDetailsLoading } =
    trpc.rbacPermissions.getById.useQuery(
      { permissionId: viewingPermissionId! },
      { enabled: !!viewingPermissionId }
    );

  // Mutations
  const assignPermissionMutation = trpc.rbacRoles.assignPermission.useMutation({
    onSuccess: () => {
      toast.success("Permission assigned successfully");
      utils.rbacPermissions.list.invalidate();
      utils.rbacPermissions.getById.invalidate();
      utils.rbacRoles.getById.invalidate();
      setSelectedRoleId("");
      setSelectedPermissionId("");
    },
    onError: (error) => {
      toast.error(`Failed to assign permission: ${error.message}`);
    },
  });

  const removePermissionMutation = trpc.rbacRoles.removePermission.useMutation({
    onSuccess: () => {
      toast.success("Permission removed successfully");
      utils.rbacPermissions.list.invalidate();
      utils.rbacPermissions.getById.invalidate();
      utils.rbacRoles.getById.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to remove permission: ${error.message}`);
    },
  });

  const bulkAssignMutation = trpc.rbacRoles.bulkAssignPermissions.useMutation({
    onSuccess: (data) => {
      toast.success(`Successfully assigned ${data.assignedCount} permissions`);
      utils.rbacPermissions.list.invalidate();
      utils.rbacRoles.getById.invalidate();
      setSelectedPermissions(new Set());
      setBulkMode(false);
      setSelectedRoleId("");
    },
    onError: (error) => {
      toast.error(`Failed to assign permissions: ${error.message}`);
    },
  });

  const handleAssignPermission = () => {
    if (!selectedRoleId || !selectedPermissionId) {
      toast.error("Please select both a role and a permission");
      return;
    }

    assignPermissionMutation.mutate({
      roleId: parseInt(selectedRoleId),
      permissionId: parseInt(selectedPermissionId),
    });
  };

  const handleBulkAssign = () => {
    if (!selectedRoleId || selectedPermissions.size === 0) {
      toast.error("Please select a role and at least one permission");
      return;
    }

    bulkAssignMutation.mutate({
      roleId: parseInt(selectedRoleId),
      permissionIds: Array.from(selectedPermissions),
    });
  };

  const confirmRemovePermission = () => {
    if (removePermissionInfo) {
      removePermissionMutation.mutate({
        roleId: removePermissionInfo.roleId,
        permissionId: removePermissionInfo.permissionId,
      });
      setRemovePermissionInfo(null);
    }
  };

  const togglePermissionSelection = (permissionId: number) => {
    const newSelection = new Set(selectedPermissions);
    if (newSelection.has(permissionId)) {
      newSelection.delete(permissionId);
    } else {
      newSelection.add(permissionId);
    }
    setSelectedPermissions(newSelection);
  };

  const permissions = permissionsData?.permissions || [];
  const modules = modulesData?.modules || [];
  const roles = rolesData?.roles || [];

  // Group permissions by module for display
  const permissionsByModule = permissions.reduce((acc: any, permission: any) => {
    const module = permission.module || "other";
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push(permission);
    return acc;
  }, {});

  if (permissionsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading permissions...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Assignment Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Permission Assignment
          </CardTitle>
          <CardDescription>
            Assign permissions to roles to control access
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Checkbox
                id="bulk-mode"
                checked={bulkMode}
                onCheckedChange={(checked) => {
                  setBulkMode(checked as boolean);
                  setSelectedPermissions(new Set());
                }}
              />
              <Label htmlFor="bulk-mode" className="cursor-pointer">
                Bulk Assignment Mode
              </Label>
            </div>

            {bulkMode ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bulk-role-select">Select Role</Label>
                  <Select value={selectedRoleId} onValueChange={setSelectedRoleId}>
                    <SelectTrigger id="bulk-role-select">
                      <SelectValue placeholder="Choose a role" />
                    </SelectTrigger>
                    <SelectContent>
                      {roles.map((role: any) => (
                        <SelectItem key={role.id} value={role.id.toString()}>
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end gap-2">
                  <Button
                    onClick={handleBulkAssign}
                    disabled={!selectedRoleId || selectedPermissions.size === 0 || bulkAssignMutation.isPending}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Assign {selectedPermissions.size} Permission{selectedPermissions.size !== 1 ? 's' : ''}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setBulkMode(false);
                      setSelectedPermissions(new Set());
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-4">
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
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label htmlFor="permission-select">Select Permission</Label>
                  <Select value={selectedPermissionId} onValueChange={setSelectedPermissionId}>
                    <SelectTrigger id="permission-select">
                      <SelectValue placeholder="Choose a permission" />
                    </SelectTrigger>
                    <SelectContent>
                      {permissions.map((permission: any) => (
                        <SelectItem key={permission.id} value={permission.id.toString()}>
                          {permission.name} ({permission.module})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleAssignPermission}
                    disabled={!selectedRoleId || !selectedPermissionId || assignPermissionMutation.isPending}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Assign
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Search and Filter Permissions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="search">Search Permissions</Label>
              <Input
                id="search"
                placeholder="Search by name or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-filter">Filter by Module</Label>
              <Select value={selectedModule} onValueChange={setSelectedModule}>
                <SelectTrigger id="module-filter">
                  <SelectValue placeholder="All modules" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Modules</SelectItem>
                  {modules.map((module: string) => (
                    <SelectItem key={module} value={module}>
                      {module}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Permissions List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            All Permissions
            {bulkMode && selectedPermissions.size > 0 && (
              <Badge variant="secondary">
                {selectedPermissions.size} selected
              </Badge>
            )}
          </CardTitle>
          <CardDescription>
            {permissions.length} permissions found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {permissions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No permissions found matching your filters.
            </div>
          ) : (
            <div className="space-y-6">
              {Object.entries(permissionsByModule).map(([module, modulePermissions]: [string, any]) => (
                <div key={module}>
                  <h3 className="text-lg font-semibold mb-3 capitalize flex items-center gap-2">
                    {module}
                    <Badge variant="outline">{modulePermissions.length}</Badge>
                  </h3>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {bulkMode && <TableHead className="w-12"></TableHead>}
                          <TableHead>Permission Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-center">Roles</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {modulePermissions.map((permission: any) => (
                          <TableRow key={permission.id}>
                            {bulkMode && (
                              <TableCell>
                                <Checkbox
                                  checked={selectedPermissions.has(permission.id)}
                                  onCheckedChange={() => togglePermissionSelection(permission.id)}
                                />
                              </TableCell>
                            )}
                            <TableCell className="font-mono text-sm">
                              {permission.name}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {permission.description || "No description"}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant="outline">{permission.roleCount || 0}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => setViewingPermissionId(permission.id)}
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                                  <DialogHeader>
                                    <DialogTitle className="font-mono">{permission.name}</DialogTitle>
                                    <DialogDescription>
                                      {permission.description || "No description"}
                                    </DialogDescription>
                                  </DialogHeader>
                                  {permissionDetailsLoading ? (
                                    <div className="py-8 text-center text-muted-foreground">
                                      Loading permission details...
                                    </div>
                                  ) : permissionDetails ? (
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-2 gap-4">
                                        <div>
                                          <div className="text-sm font-medium text-muted-foreground">
                                            Module
                                          </div>
                                          <div className="mt-1">
                                            <Badge variant="outline">{permissionDetails.module}</Badge>
                                          </div>
                                        </div>
                                        <div>
                                          <div className="text-sm font-medium text-muted-foreground">
                                            User Overrides
                                          </div>
                                          <div className="mt-1">
                                            {permissionDetails.userOverrideCount}
                                          </div>
                                        </div>
                                      </div>

                                      <div>
                                        <h4 className="font-semibold mb-3">
                                          Assigned to Roles ({permissionDetails.roles.length})
                                        </h4>
                                        {permissionDetails.roles.length === 0 ? (
                                          <div className="text-center py-4 text-muted-foreground">
                                            Not assigned to any roles
                                          </div>
                                        ) : (
                                          <div className="space-y-2 max-h-96 overflow-y-auto">
                                            {permissionDetails.roles.map((role: any) => (
                                              <div
                                                key={role.roleId}
                                                className="p-3 border rounded-lg flex items-center justify-between"
                                              >
                                                <div className="flex-1">
                                                  <div className="font-medium flex items-center gap-2">
                                                    {role.roleName}
                                                    {role.isSystemRole && (
                                                      <Badge variant="default" className="text-xs">
                                                        System
                                                      </Badge>
                                                    )}
                                                  </div>
                                                  {role.roleDescription && (
                                                    <div className="text-sm text-muted-foreground mt-1">
                                                      {role.roleDescription}
                                                    </div>
                                                  )}
                                                </div>
                                                <Button
                                                  size="sm"
                                                  variant="ghost"
                                                  onClick={() => {
                                                    setRemovePermissionInfo({
                                                      roleId: role.roleId,
                                                      roleName: role.roleName,
                                                      permissionId: permission.id,
                                                    });
                                                  }}
                                                  disabled={removePermissionMutation.isPending}
                                                >
                                                  <X className="h-4 w-4" />
                                                </Button>
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                      </div>
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
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!removePermissionInfo}
        onOpenChange={(open) => !open && setRemovePermissionInfo(null)}
        title="Remove Permission"
        description={`Are you sure you want to remove this permission from "${removePermissionInfo?.roleName}"?`}
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmRemovePermission}
        isLoading={removePermissionMutation.isPending}
      />
    </div>
  );
}

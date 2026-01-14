import React, { useState, useMemo, useRef } from "react";
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
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Trash2,
  Key,
  UserPlus,
  Shield,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  LogIn,
  Lock,
} from "lucide-react";
import { useLocation, Link } from "wouter";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  getAuthErrorInfo,
  isAuthError,
  getErrorCode,
} from "@/lib/errorHandling";

// Type for user from the API
interface User {
  id: number;
  openId: string;
  email: string | null;
  name: string | null;
  role: "user" | "admin";
  lastSignedIn: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
}

export function UserManagement() {
  const [, setLocation] = useLocation();

  // Form state
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [resetUsername, setResetUsername] = useState("");
  const [resetPassword, setResetPassword] = useState("");

  // Delete confirmation state
  const [deleteConfirm, setDeleteConfirm] = useState<{
    open: boolean;
    user: User | null;
    reason: string;
  }>({ open: false, user: null, reason: "" });

  // Search/filter/pagination state
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Show role assignment CTA after user creation
  const [showAssignRole, setShowAssignRole] = useState<number | null>(null);

  // Ref for focus management
  const deleteButtonRef = useRef<React.ElementRef<"button">>(null);

  const utils = trpc.useUtils();
  const {
    data: users,
    isLoading,
    error,
  } = trpc.userManagement.listUsers.useQuery();

  const createUser = trpc.userManagement.createUser.useMutation({
    onSuccess: data => {
      utils.userManagement.listUsers.invalidate();
      setNewUsername("");
      setNewPassword("");
      setNewName("");
      toast.success("User created successfully!", {
        description: `${data.user.name} (${data.user.username}) has been added.`,
      });
      // Show option to assign role
      if (data.user.id) {
        setShowAssignRole(data.user.id);
      }
    },
    onError: error => {
      toast.error("Failed to create user", {
        description: error.message,
      });
    },
  });

  const deleteUser = trpc.userManagement.deleteUser.useMutation({
    onSuccess: () => {
      utils.userManagement.listUsers.invalidate();
      toast.success("User deleted successfully");
      setDeleteConfirm({ open: false, user: null, reason: "" });
    },
    onError: error => {
      toast.error("Failed to delete user", {
        description: error.message,
      });
    },
  });

  const resetPasswordMutation = trpc.userManagement.resetPassword.useMutation({
    onSuccess: () => {
      setResetUsername("");
      setResetPassword("");
      toast.success("Password reset successfully");
    },
    onError: error => {
      toast.error("Failed to reset password", {
        description: error.message,
      });
    },
  });

  // Filter users based on search and role
  const filteredUsers = useMemo(() => {
    if (!users) return [];

    return users.filter(user => {
      const matchesSearch =
        !searchQuery ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.name?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === "all" || user.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, searchQuery, roleFilter]);

  // Paginate filtered users
  const paginatedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    const end = start + pageSize;
    return filteredUsers.slice(start, end);
  }, [filteredUsers, page, pageSize]);

  const totalPages = Math.ceil(filteredUsers.length / pageSize);

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      toast.error("Validation error", {
        description: "Username and password are required",
      });
      return;
    }
    createUser.mutate({
      username: newUsername,
      password: newPassword,
      name: newName || undefined,
    });
  };

  const handleDeleteUser = () => {
    if (deleteConfirm.user) {
      deleteUser.mutate({
        username: deleteConfirm.user.email || "",
        reason: deleteConfirm.reason || undefined,
      });
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUsername || !resetPassword) {
      toast.error("Validation error", {
        description: "Username and new password are required",
      });
      return;
    }
    resetPasswordMutation.mutate({
      username: resetUsername,
      newPassword: resetPassword,
    });
  };

  const handleNavigateToRoles = (userId: string) => {
    setLocation(`/settings?tab=rbac&userId=${userId}`);
  };

  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };

  const handleRoleFilterChange = (value: string) => {
    setRoleFilter(value);
    setPage(1);
  };

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-10 w-32" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-36" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={`skeleton-${i}`} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // BUG-046: Differentiated error state for auth vs other errors
  if (error) {
    const errorCode = getErrorCode(error);

    // Handle auth errors with specific UI
    if (isAuthError(error)) {
      const authError = getAuthErrorInfo(error);

      return (
        <Card className="max-w-lg mx-auto mt-8">
          <CardHeader>
            <div className="flex items-center gap-2">
              {authError.type === "NOT_LOGGED_IN" || authError.type === "SESSION_EXPIRED" ? (
                <LogIn className="h-5 w-5 text-yellow-600" />
              ) : (
                <Lock className="h-5 w-5 text-destructive" />
              )}
              <CardTitle>{authError.title}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert variant={authError.type === "PERMISSION_DENIED" ? "destructive" : "default"}>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>
                {authError.type === "NOT_LOGGED_IN" && "Login Required"}
                {authError.type === "SESSION_EXPIRED" && "Session Expired"}
                {authError.type === "DEMO_USER_RESTRICTED" && "Demo Mode Restriction"}
                {authError.type === "PERMISSION_DENIED" && "Access Denied"}
              </AlertTitle>
              <AlertDescription>{authError.message}</AlertDescription>
            </Alert>

            {authError.action && (
              <div className="flex justify-center">
                {authError.action.href ? (
                  <Link href={authError.action.href}>
                    <Button>
                      {authError.type === "NOT_LOGGED_IN" || authError.type === "SESSION_EXPIRED" ? (
                        <LogIn className="h-4 w-4 mr-2" />
                      ) : null}
                      {authError.action.label}
                    </Button>
                  </Link>
                ) : (
                  <Button onClick={authError.action.onClick}>
                    {authError.action.label}
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      );
    }

    // Handle other errors with retry option
    return (
      <Card className="max-w-lg mx-auto mt-8">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>Failed to Load Users</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error.message}</AlertDescription>
          </Alert>
          <div className="flex justify-center">
            <Button onClick={() => utils.userManagement.listUsers.invalidate()}>
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            Create New User
          </CardTitle>
          <CardDescription>
            Add a new user account with username and password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleCreateUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="new-username">Username *</Label>
                <Input
                  id="new-username"
                  value={newUsername}
                  onChange={e => setNewUsername(e.target.value)}
                  placeholder="username"
                  required
                  aria-describedby="username-hint"
                />
                <p id="username-hint" className="text-xs text-muted-foreground">
                  Minimum 3 characters
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Password *</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="password"
                  required
                  aria-describedby="password-hint"
                />
                <p id="password-hint" className="text-xs text-muted-foreground">
                  Minimum 4 characters
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-name">Display Name</Label>
                <Input
                  id="new-name"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create User"
              )}
            </Button>
          </form>

          {/* Role assignment CTA after user creation */}
          {showAssignRole && (
            <div className="mt-4 p-4 bg-muted rounded-lg flex items-center justify-between">
              <p className="text-sm">
                User created! Would you like to assign roles now?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowAssignRole(null)}
                >
                  Later
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    handleNavigateToRoles(String(showAssignRole));
                    setShowAssignRole(null);
                  }}
                >
                  <Shield className="h-4 w-4 mr-1" />
                  Assign Roles
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Reset Password
          </CardTitle>
          <CardDescription>Reset a user's password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reset-username">Username</Label>
                <Input
                  id="reset-username"
                  value={resetUsername}
                  onChange={e => setResetUsername(e.target.value)}
                  placeholder="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reset-password">New Password</Label>
                <Input
                  id="reset-password"
                  type="password"
                  value={resetPassword}
                  onChange={e => setResetPassword(e.target.value)}
                  placeholder="new password"
                  required
                  aria-describedby="reset-password-hint"
                />
                <p
                  id="reset-password-hint"
                  className="text-xs text-muted-foreground"
                >
                  Minimum 4 characters
                </p>
              </div>
            </div>
            <Button type="submit" disabled={resetPasswordMutation.isPending}>
              {resetPasswordMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Reset Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Users</CardTitle>
          <CardDescription>
            Manage user accounts ({filteredUsers.length} user
            {filteredUsers.length !== 1 ? "s" : ""})
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Search and filter controls */}
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={searchQuery}
                onChange={e => handleSearchChange(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={roleFilter} onValueChange={handleRoleFilterChange}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="user">User</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={String(pageSize)}
              onValueChange={v => setPageSize(Number(v))}
            >
              <SelectTrigger className="w-full sm:w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 / page</SelectItem>
                <SelectItem value="25">25 / page</SelectItem>
                <SelectItem value="50">50 / page</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            {paginatedUsers && paginatedUsers.length > 0 ? (
              <div className="border rounded-lg divide-y">
                {paginatedUsers.map(user => (
                  <div
                    key={user.openId}
                    className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">
                          {user.name || "Unnamed User"}
                        </span>
                        <Badge
                          variant={
                            user.role === "admin" ? "default" : "secondary"
                          }
                        >
                          {user.role}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground truncate">
                        {user.email}
                      </div>
                      {user.lastSignedIn && (
                        <div className="text-xs text-muted-foreground">
                          Last login:{" "}
                          {new Date(user.lastSignedIn).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleNavigateToRoles(user.openId)}
                        title="Manage roles"
                      >
                        <Shield className="h-4 w-4 mr-1" />
                        Roles
                      </Button>
                      <Button
                        ref={deleteButtonRef}
                        variant="destructive"
                        size="sm"
                        onClick={() =>
                          setDeleteConfirm({ open: true, user, reason: "" })
                        }
                        disabled={deleteUser.isPending}
                        title="Delete user"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery || roleFilter !== "all"
                  ? "No users match your filters"
                  : "No users found"}
              </div>
            )}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {(page - 1) * pageSize + 1}-
                {Math.min(page * pageSize, filteredUsers.length)} of{" "}
                {filteredUsers.length}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                <span className="text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Enhanced Delete User Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirm.open}
        onOpenChange={open => {
          if (!open) {
            setDeleteConfirm({ open: false, user: null, reason: "" });
            // Return focus to the delete button
            setTimeout(() => deleteButtonRef.current?.focus(), 0);
          }
        }}
        title="Delete User"
        description={
          deleteConfirm.user ? (
            <div className="space-y-4">
              <p>Are you sure you want to delete this user?</p>
              <div className="bg-muted p-3 rounded-lg text-sm">
                <p>
                  <strong>Name:</strong> {deleteConfirm.user.name || "Unnamed"}
                </p>
                <p>
                  <strong>Email:</strong> {deleteConfirm.user.email}
                </p>
                <p>
                  <strong>Role:</strong> {deleteConfirm.user.role}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="delete-reason">
                  Reason for deletion (optional)
                </Label>
                <Textarea
                  id="delete-reason"
                  placeholder="Enter reason..."
                  value={deleteConfirm.reason}
                  onChange={e =>
                    setDeleteConfirm({
                      ...deleteConfirm,
                      reason: e.target.value,
                    })
                  }
                  rows={2}
                />
              </div>
              <p className="text-destructive text-sm">
                This action cannot be undone.
              </p>
            </div>
          ) : (
            ""
          )
        }
        confirmLabel="Delete User"
        variant="destructive"
        onConfirm={handleDeleteUser}
        isLoading={deleteUser.isPending}
      />
    </div>
  );
}

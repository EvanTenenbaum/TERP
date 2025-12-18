import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Trash2, Key, UserPlus } from "lucide-react";

export function UserManagement() {
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newName, setNewName] = useState("");
  const [resetUsername, setResetUsername] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [userToDelete, setUserToDelete] = useState<string | null>(null);

  const utils = trpc.useUtils();
  const { data: users, isLoading } = trpc.userManagement.listUsers.useQuery();

  const createUser = trpc.userManagement.createUser.useMutation({
    onSuccess: () => {
      utils.userManagement.listUsers.invalidate();
      setNewUsername("");
      setNewPassword("");
      setNewName("");
      alert("User created successfully!");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const deleteUser = trpc.userManagement.deleteUser.useMutation({
    onSuccess: () => {
      utils.userManagement.listUsers.invalidate();
      alert("User deleted successfully!");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const resetPasswordMutation = trpc.userManagement.resetPassword.useMutation({
    onSuccess: () => {
      setResetUsername("");
      setResetPassword("");
      alert("Password reset successfully!");
    },
    onError: (error) => {
      alert(`Error: ${error.message}`);
    },
  });

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername || !newPassword) {
      alert("Username and password are required");
      return;
    }
    createUser.mutate({
      username: newUsername,
      password: newPassword,
      name: newName || undefined,
    });
  };

  const handleDeleteUser = () => {
    if (userToDelete) {
      deleteUser.mutate({ username: userToDelete });
      setUserToDelete(null);
    }
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUsername || !resetPassword) {
      alert("Username and new password are required");
      return;
    }
    resetPasswordMutation.mutate({
      username: resetUsername,
      newPassword: resetPassword,
    });
  };

  if (isLoading) {
    return <div>Loading users...</div>;
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
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="username"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-password">Password *</Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="password"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="new-name">Display Name</Label>
                <Input
                  id="new-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="Optional"
                />
              </div>
            </div>
            <Button type="submit" disabled={createUser.isPending}>
              {createUser.isPending ? "Creating..." : "Create User"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Reset Password
          </CardTitle>
          <CardDescription>
            Reset a user's password
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reset-username">Username</Label>
                <Input
                  id="reset-username"
                  value={resetUsername}
                  onChange={(e) => setResetUsername(e.target.value)}
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
                  onChange={(e) => setResetPassword(e.target.value)}
                  placeholder="new password"
                  required
                />
              </div>
            </div>
            <Button type="submit" disabled={resetPasswordMutation.isPending}>
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Users</CardTitle>
          <CardDescription>
            Manage user accounts
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {users && users.length > 0 ? (
              <div className="border rounded-lg divide-y">
                {users.map((user) => (
                  <div
                    key={user.openId}
                    className="flex items-center justify-between p-4 hover:bg-gray-50"
                  >
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                      {user.lastSignedIn && (
                        <div className="text-xs text-gray-400">
                          Last login: {new Date(user.lastSignedIn).toLocaleString()}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setUserToDelete(user.email || "")}
                      disabled={deleteUser.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                No users found
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Delete User Confirmation */}
      <ConfirmDialog
        open={userToDelete !== null}
        onOpenChange={(open) => !open && setUserToDelete(null)}
        title="Delete User"
        description={`Are you sure you want to delete user "${userToDelete}"? This action cannot be undone.`}
        confirmLabel="Delete User"
        variant="destructive"
        onConfirm={handleDeleteUser}
        isLoading={deleteUser.isPending}
      />
    </div>
  );
}


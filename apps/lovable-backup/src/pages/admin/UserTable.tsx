import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { mockUsers } from "@/lib/mockData";
import type { User } from "@/types/entities";
import { toast } from "sonner";

export default function UserTable() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const columns = [
    { key: "id", label: "User ID" },
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "role_id", label: "Role" },
    {
      key: "status",
      label: "Status",
      render: (user: User) => (
        <StatusBadge
          status={user.status === "Active" ? "success" : "neutral"}
          label={user.status}
        />
      )
    },
    {
      key: "last_login",
      label: "Last Login",
      render: (user: User) => user.last_login ? new Date(user.last_login).toLocaleString() : "Never"
    }
  ];

  const filteredUsers = mockUsers.filter(user => {
    if (searchQuery) {
      return user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">User Management</h1>
          <p className="text-sm text-muted-foreground">Manage system users</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => toast.success("Export generated")}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={() => toast.success("Invite user modal would open")}>
            <Plus className="h-4 w-4 mr-2" />
            Invite User
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search users..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        data={filteredUsers}
        onRowClick={(user) => navigate(`/admin/users/${user.id}`)}
      />
    </div>
  );
}

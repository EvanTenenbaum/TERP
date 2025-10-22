import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DataTable } from "@/components/data/DataTable";
import { Badge } from "@/components/ui/badge";
import { mockAuditLog, mockUsers } from "@/lib/mockData";

export default function AuditLog() {
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("all");

  const columns = [
    {
      key: "timestamp",
      label: "Time",
      render: (log: any) => new Date(log.timestamp).toLocaleString()
    },
    {
      key: "user_id",
      label: "User",
      render: (log: any) => {
        const user = mockUsers.find(u => u.id === log.user_id);
        return user?.name || log.user_id;
      }
    },
    {
      key: "action",
      label: "Action",
      render: (log: any) => (
        <Badge variant={log.action === "CREATE" ? "default" : log.action === "UPDATE" ? "secondary" : "destructive"}>
          {log.action}
        </Badge>
      )
    },
    { key: "entity_type", label: "Entity Type" },
    { key: "entity_id", label: "Entity ID" }
  ];

  const filteredLogs = mockAuditLog.filter(log => {
    const matchesSearch = log.entity_id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = actionFilter === "all" || log.action === actionFilter;
    return matchesSearch && matchesAction;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="mb-1">Audit Log</h1>
        <p className="text-sm text-muted-foreground">System activity and change history</p>
      </div>

      <div className="flex gap-3">
        <Input
          placeholder="Search audit log..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-sm"
        />
        <Select value={actionFilter} onValueChange={setActionFilter}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="CREATE">Create</SelectItem>
            <SelectItem value="UPDATE">Update</SelectItem>
            <SelectItem value="DELETE">Delete</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="p-6">
        <DataTable
          columns={columns}
          data={filteredLogs}
        />
      </Card>
    </div>
  );
}

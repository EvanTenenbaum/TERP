import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Download, RefreshCw, Archive } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DataTable } from "@/components/data/DataTable";
import { StatusBadge } from "@/components/common/StatusBadge";
import { NewClientModal } from "@/components/modals/CommonModals";
import { mockClients } from "@/lib/mockData";
import type { Client } from "@/types/entities";
import { toast } from "sonner";

export default function ClientList() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);
  const [showNewModal, setShowNewModal] = useState(false);

  const columns = [
    { key: "id", label: "Client ID" },
    { key: "name", label: "Name" },
    { key: "license_number", label: "License" },
    {
      key: "credit_limit",
      label: "Credit Limit",
      render: (client: Client) => `$${client.credit_limit.toLocaleString()}`
    },
    {
      key: "current_balance",
      label: "Current Balance",
      render: (client: Client) => `$${client.current_balance.toLocaleString()}`
    },
    {
      key: "status",
      label: "Status",
      render: (client: Client) => (
        <StatusBadge status={client.status === "Active" ? "success" : "neutral"} label={client.status} />
      )
    }
  ];

  const filteredClients = mockClients.filter(client => {
    if (!showArchived && client.archived) return false;
    if (searchQuery) {
      return client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        client.id.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">Clients</h1>
          <p className="text-sm text-muted-foreground">Manage client accounts</p>
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
          <Button variant="outline" onClick={() => setShowArchived(!showArchived)}>
            <Archive className="h-4 w-4 mr-2" />
            {showArchived ? "Hide" : "Show"} Archived
          </Button>
          <Button onClick={() => setShowNewModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Client
          </Button>
        </div>
      </div>

      <Input
        placeholder="Search clients..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="max-w-sm"
      />

      <DataTable
        columns={columns}
        data={filteredClients}
        onRowClick={(client) => navigate(`/clients/${client.id}`)}
      />

      <NewClientModal
        open={showNewModal}
        onOpenChange={setShowNewModal}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}

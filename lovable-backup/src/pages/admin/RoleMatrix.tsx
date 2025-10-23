import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { mockRoles } from "@/lib/mockData";

const permissions = [
  { id: "sales.view", label: "View Sales", category: "Sales" },
  { id: "sales.create", label: "Create Sales", category: "Sales" },
  { id: "sales.edit", label: "Edit Sales", category: "Sales" },
  { id: "inventory.view", label: "View Inventory", category: "Inventory" },
  { id: "inventory.edit", label: "Edit Inventory", category: "Inventory" },
  { id: "clients.view", label: "View Clients", category: "Clients" },
  { id: "clients.edit", label: "Edit Clients", category: "Clients" },
  { id: "reports.view", label: "View Reports", category: "Reports" },
  { id: "admin.*", label: "Admin Access", category: "Admin" }
];

export default function RoleMatrix() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="mb-1">Role & Permissions Matrix</h1>
        <p className="text-sm text-muted-foreground">Configure role-based access control</p>
      </div>

      <Card className="p-6 overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left p-3 font-semibold">Permission</th>
              {mockRoles.map(role => (
                <th key={role.id} className="text-center p-3 font-semibold">{role.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {permissions.map(perm => (
              <tr key={perm.id} className="border-b hover:bg-muted/50">
                <td className="p-3">
                  <div>
                    <p className="font-medium">{perm.label}</p>
                    <p className="text-xs text-muted-foreground">{perm.category}</p>
                  </div>
                </td>
                {mockRoles.map(role => {
                  const hasPermission = role.permissions.some(p => 
                    p.entity === perm.category && p.actions.includes("admin")
                  );
                  return (
                    <td key={role.id} className="text-center p-3">
                      <Checkbox checked={hasPermission} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

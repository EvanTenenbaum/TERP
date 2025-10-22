import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Archive, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AddNoteModal } from "@/components/modals/CommonModals";
import { mockClients, mockOrders } from "@/lib/mockData";
import { toast } from "sonner";

export default function ClientProfile() {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const [showNoteModal, setShowNoteModal] = useState(false);
  
  const client = mockClients.find(c => c.id === clientId);
  const clientOrders = mockOrders.filter(o => o.client_id === clientId);

  if (!client) {
    return <div>Client not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/clients")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="mb-1">{client.name}</h1>
          <p className="text-sm text-muted-foreground">{client.id}</p>
        </div>
        <Button variant="outline" onClick={() => setShowNoteModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Note
        </Button>
        <Button variant="outline" onClick={() => toast.success("Client archived")}>
          <Archive className="h-4 w-4 mr-2" />
          Archive
        </Button>
      </div>

      <Card className="p-6">
        <h3 className="mb-4">Client Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">License Number</p>
            <p className="font-medium">{client.license_number}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{client.contact_email}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Phone</p>
            <p className="font-medium">{client.contact_phone}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Credit Limit</p>
            <p className="font-medium">${client.credit_limit.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Current Balance</p>
            <p className="font-medium">${client.current_balance.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium">{client.status}</p>
          </div>
        </div>
      </Card>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">Orders</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="alerts">Alerts</TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <Card className="p-6">
            <h3 className="mb-4">Recent Orders</h3>
            {clientOrders.length > 0 ? (
              <div className="space-y-2">
                {clientOrders.map(order => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-md bg-panel cursor-pointer hover:bg-panel/80" onClick={() => navigate(`/sales/orders/${order.id}`)}>
                    <div>
                      <p className="font-medium">{order.id}</p>
                      <p className="text-sm text-muted-foreground">{order.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">${order.total.toLocaleString()}</p>
                      <p className="text-sm text-muted-foreground">{new Date(order.updated_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No orders yet</p>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Invoices for this client</p>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Client notes</p>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card className="p-6">
            <p className="text-sm text-muted-foreground">Client alerts</p>
          </Card>
        </TabsContent>
      </Tabs>

      <AddNoteModal
        open={showNoteModal}
        onOpenChange={setShowNoteModal}
        clientId={client.id}
      />
    </div>
  );
}

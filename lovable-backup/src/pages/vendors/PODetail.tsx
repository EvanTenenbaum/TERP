import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, Archive, Plus, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/common/StatusBadge";
import { POWorkflowActions } from "@/components/vendors/POWorkflowActions";
import { BillModal } from "@/components/vendors/BillModal";
import { mockPurchaseOrders, mockVendors } from "@/lib/mockData";
import { POStatus } from "@/types/entities";
import { toast } from "sonner";

export default function PODetail() {
  const { poId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("lines");
  const [showBillModal, setShowBillModal] = useState(false);
  
  const po = mockPurchaseOrders.find(p => p.id === poId);
  const vendor = po ? mockVendors.find(v => v.id === po.vendor_id) : null;

  if (!po) {
    return <div>Purchase Order not found</div>;
  }

  const [poStatus, setPoStatus] = useState<POStatus>(po.status);

  const handleStatusChange = (newStatus: string) => {
    setPoStatus(newStatus as POStatus);
    toast.success(`PO status changed to ${newStatus}`);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate("/vendors")}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="mb-1">{po.id}</h1>
            <StatusBadge
              status={poStatus === "Received" ? "success" : "info"}
              label={poStatus}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            Created {new Date(po.created_at).toLocaleDateString()}
          </p>
        </div>
        
        <POWorkflowActions
          po={{ ...po, status: poStatus }}
          onStatusChange={handleStatusChange}
        />

        {poStatus === "Received" && (
          <Button variant="outline" onClick={() => setShowBillModal(true)}>
            Create Bill
          </Button>
        )}
        
        <Button variant="outline">
          <Archive className="h-4 w-4 mr-2" />
          Archive
        </Button>
        
        <Button>
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6 hover-scale">
          <h3 className="text-sm text-muted-foreground mb-2">Vendor</h3>
          <p className="font-semibold text-lg">{vendor?.name || po.vendor_id}</p>
          <p className="text-sm text-muted-foreground mt-1">{vendor?.contact_email}</p>
          <Button
            variant="link"
            className="px-0 mt-2"
            onClick={() => navigate(`/vendors/${po.vendor_id}`)}
          >
            View Vendor Profile →
          </Button>
        </Card>

        <Card className="p-6 hover-scale">
          <h3 className="text-sm text-muted-foreground mb-2">PO Total</h3>
          <p className="font-semibold text-2xl">${po.total.toLocaleString()}</p>
          <p className="text-xs text-muted-foreground mt-2">
            {po.line_count || 0} line items
          </p>
        </Card>

        <Card className="p-6 hover-scale">
          <h3 className="text-sm text-muted-foreground mb-2">Expected Delivery</h3>
          <p className="font-semibold text-lg">
            {new Date(po.expected_delivery).toLocaleDateString()}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            {po.status === "Received" ? "Completed" : "Pending"}
          </p>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="lines">Line Items</TabsTrigger>
          <TabsTrigger value="receiving">Receiving</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="lines" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">PO Lines</h3>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Line
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              Line items for this purchase order will be displayed here
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="receiving">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Receiving Log</h3>
            <p className="text-sm text-muted-foreground">
              Receiving history will be displayed here
            </p>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Audit Trail</h3>
            <div className="space-y-3">
              <div className="flex items-start gap-3 pb-3 border-b border-border">
                <div className="w-2 h-2 rounded-full bg-primary mt-1.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium">PO created</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(po.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <BillModal
        open={showBillModal}
        onClose={() => setShowBillModal(false)}
        vendorId={po.vendor_id}
        poId={po.id}
      />
    </div>
  );
}

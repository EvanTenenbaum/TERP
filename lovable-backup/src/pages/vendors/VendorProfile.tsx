import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Archive, Plus, Edit } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable } from "@/components/data/DataTable";
import { mockVendors, mockPurchaseOrders, mockBills } from "@/lib/mockData";
import { toast } from "sonner";

export default function VendorProfile() {
  const { vendorId } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("info");
  
  const vendor = mockVendors.find(v => v.id === vendorId);
  const vendorPOs = mockPurchaseOrders.filter(po => po.vendor_id === vendorId);
  const vendorBills = mockBills.filter(b => b.vendor_id === vendorId);

  if (!vendor) {
    return <div>Vendor not found</div>;
  }

  const poColumns = [
    { key: "id", label: "PO #" },
    { key: "status", label: "Status" },
    { key: "created_at", label: "Created" },
    { key: "expected_delivery", label: "Expected" },
    { key: "total", label: "Total" }
  ];

  const billColumns = [
    { key: "id", label: "Bill #" },
    { key: "status", label: "Status" },
    { key: "due_date", label: "Due Date" },
    { key: "grand_total", label: "Total" },
    { key: "balance", label: "Balance" }
  ];

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
            <h1 className="mb-1">{vendor.name}</h1>
            <StatusBadge
              status={vendor.status === "Active" ? "success" : "error"}
              label={vendor.status}
            />
          </div>
          <p className="text-sm text-muted-foreground">{vendor.id} • {vendor.license_number}</p>
        </div>
        <Button onClick={() => navigate(`/vendors/${vendorId}/po/new`)}>
          <Plus className="h-4 w-4 mr-2" />
          New PO
        </Button>
        <Button variant="outline">
          <Archive className="h-4 w-4 mr-2" />
          Archive
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="info">Information</TabsTrigger>
          <TabsTrigger value="pos">Purchase Orders ({vendorPOs.length})</TabsTrigger>
          <TabsTrigger value="bills">Bills ({vendorBills.length})</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="info" className="space-y-4">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Vendor Information</h3>
              <Button variant="outline" size="sm">
                <Edit className="h-4 w-4 mr-2" />
                Edit
              </Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">License Number</p>
                <p className="font-medium">{vendor.license_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{vendor.contact_email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Phone</p>
                <p className="font-medium">{vendor.contact_phone}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Credit Terms</p>
                <p className="font-medium">{vendor.credit_terms}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Status</p>
                <p className="font-medium">{vendor.status}</p>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="pos">
          <Card className="p-6">
            <DataTable
              data={vendorPOs}
              columns={poColumns}
              onRowClick={(po) => navigate(`/vendors/po/${po.id}`)}
            />
          </Card>
        </TabsContent>

        <TabsContent value="bills">
          <Card className="p-6">
            <DataTable
              data={vendorBills}
              columns={billColumns}
              onRowClick={(bill) => navigate(`/finance/bills/${bill.id}`)}
            />
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Notes</h3>
              <Button variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add Note
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">No notes yet</p>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Activity History</h3>
            <p className="text-sm text-muted-foreground">Activity history will appear here</p>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

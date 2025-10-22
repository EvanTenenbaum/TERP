import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Save, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/common/StatusBadge";
import { mockBills, mockVendors } from "@/lib/mockData";
import { RecordPaymentModal } from "@/components/modals/CommonModals";

export default function BillDetail() {
  const { billId } = useParams();
  const navigate = useNavigate();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [activeTab, setActiveTab] = useState("details");
  
  const bill = mockBills.find(b => b.id === billId);
  const vendor = bill ? mockVendors.find(v => v.id === bill.vendor_id) : null;

  if (!bill) {
    return <div>Bill not found</div>;
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/finance/ap")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="mb-1">{bill.id}</h1>
            <StatusBadge
              status={bill.status === "Paid" ? "success" : bill.status === "Received" ? "warning" : "info"}
              label={bill.status}
            />
          </div>
          <p className="text-sm text-muted-foreground">Due {new Date(bill.due_date).toLocaleDateString()}</p>
        </div>
        {bill.balance > 0 && (
          <Button onClick={() => setShowPaymentModal(true)}>
            <DollarSign className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        )}
        <Button variant="outline">
          <Save className="h-4 w-4 mr-2" />
          Save
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6 hover-scale">
          <h3 className="text-sm text-muted-foreground mb-2">Vendor</h3>
          <p className="font-semibold text-lg">{vendor?.name || bill.vendor_id}</p>
          <Button variant="link" className="px-0 mt-2" onClick={() => navigate(`/vendors/${bill.vendor_id}`)}>
            View Vendor →
          </Button>
        </Card>
        <Card className="p-6 hover-scale">
          <h3 className="text-sm text-muted-foreground mb-2">Total</h3>
          <p className="font-semibold text-2xl">${bill.grand_total.toLocaleString()}</p>
        </Card>
        <Card className="p-6 hover-scale">
          <h3 className="text-sm text-muted-foreground mb-2">Balance</h3>
          <p className="font-semibold text-2xl">${bill.balance.toLocaleString()}</p>
          {bill.balance === 0 && <p className="text-xs text-success mt-2">Paid in full</p>}
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="payments">Payments</TabsTrigger>
        </TabsList>
        <TabsContent value="details">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Bill Details</h3>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Issue Date</p>
                <p className="font-medium">{new Date(bill.issue_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Due Date</p>
                <p className="font-medium">{new Date(bill.due_date).toLocaleDateString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">PO Reference</p>
                <p className="font-medium">{bill.po_id}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Subtotal</p>
                <p className="font-medium">${bill.subtotal.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tax</p>
                <p className="font-medium">${bill.tax.toLocaleString()}</p>
              </div>
            </div>
          </Card>
        </TabsContent>
        <TabsContent value="payments">
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Payment History</h3>
            <p className="text-sm text-muted-foreground">Payment history will appear here</p>
          </Card>
        </TabsContent>
      </Tabs>

      <RecordPaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        invoiceId={bill.id}
        maxAmount={bill.balance}
      />
    </div>
  );
}

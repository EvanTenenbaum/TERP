import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RecordPaymentModal } from "@/components/modals/CommonModals";
import { mockInvoices, mockClients } from "@/lib/mockData";

export default function InvoiceDetail() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  
  const invoice = mockInvoices.find(i => i.id === invoiceId);
  const client = invoice ? mockClients.find(c => c.id === invoice.client_id) : null;

  if (!invoice) {
    return <div>Invoice not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/finance/ar")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="mb-1">{invoice.id}</h1>
          <p className="text-sm text-muted-foreground">Invoice Details</p>
        </div>
        <Button onClick={() => setShowPaymentModal(true)}>
          <DollarSign className="h-4 w-4 mr-2" />
          Record Payment
        </Button>
      </div>

      <Card className="p-6">
        <h3 className="mb-4">Invoice Summary</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">Client</p>
            <p className="font-medium">{client?.name || invoice.client_id}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Issue Date</p>
            <p className="font-medium">{invoice.issue_date}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Due Date</p>
            <p className="font-medium">{invoice.due_date}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium">{invoice.status}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Grand Total</p>
            <p className="font-medium">${invoice.grand_total.toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Balance</p>
            <p className="font-medium">${invoice.balance.toLocaleString()}</p>
          </div>
        </div>
      </Card>

      <RecordPaymentModal
        open={showPaymentModal}
        onOpenChange={setShowPaymentModal}
        invoiceId={invoice.id}
        maxAmount={invoice.balance}
      />
    </div>
  );
}

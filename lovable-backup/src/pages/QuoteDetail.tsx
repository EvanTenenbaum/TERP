import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Mail, FileText, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/data/DataTable";
import { Textarea } from "@/components/ui/textarea";
import { ConvertQuoteButton } from "@/components/quotes/ConvertQuoteButton";
import { toast } from "sonner";

interface QuoteLineItem {
  id: string;
  product: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export default function QuoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [notes, setNotes] = useState("");

  const quote = {
    id,
    quoteNumber: "Q-1234",
    client: "Acme Corp",
    clientEmail: "contact@acmecorp.com",
    status: "open" as const,
    date: "2025-01-10",
    expiryDate: "2025-02-10",
    subtotal: 42000,
    tax: 3000,
    total: 45000,
    lineItems: [
      { id: "1", product: "Premium Flower - Strain A", quantity: 100, unitPrice: 250, total: 25000 },
      { id: "2", product: "Concentrate - Type B", quantity: 50, unitPrice: 340, total: 17000 },
    ] as QuoteLineItem[],
    history: [
      { timestamp: "2025-01-10 10:30 AM", user: "Sarah Johnson", action: "Created quote", details: "Initial draft created" },
      { timestamp: "2025-01-10 02:15 PM", user: "Sarah Johnson", action: "Sent to client", details: "Email sent to contact@acmecorp.com" },
    ],
  };

  const lineItemColumns = [
    { key: "product", label: "Product" },
    { 
      key: "quantity", 
      label: "Quantity",
      className: "text-right" 
    },
    { 
      key: "unitPrice", 
      label: "Unit Price",
      className: "text-right",
      render: (item: QuoteLineItem) => `$${item.unitPrice.toLocaleString()}`
    },
    { 
      key: "total", 
      label: "Total",
      className: "text-right font-semibold",
      render: (item: QuoteLineItem) => `$${item.total.toLocaleString()}`
    },
  ];

  const handleConvertToOrder = () => {
    toast.success("Quote converted to order");
    navigate("/sales/orders");
  };

  const handleSendToClient = () => {
    toast.success(`Quote sent to ${quote.clientEmail}`);
  };

  const handleClose = () => {
    toast.success("Quote marked as closed");
    navigate("/quotes");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/quotes")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="mb-1">{quote.quoteNumber}</h1>
            <p className="text-sm text-muted-foreground">{quote.client}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {quote.status === "open" && (
            <>
              <Button variant="outline" onClick={handleSendToClient}>
                <Mail className="h-4 w-4 mr-2" />
                Send to Client
              </Button>
              <Button variant="outline" onClick={handleClose}>
                <X className="h-4 w-4 mr-2" />
                Close Quote
              </Button>
              <ConvertQuoteButton
                quoteId={quote.id || ""}
                clientId="CL-001"
                expiresAt={quote.expiryDate}
                lines={quote.lineItems.map(item => ({
                  id: item.id,
                  inventory_id: item.id,
                  inventory_name: item.product,
                  qty: item.quantity,
                  unit_price: item.unitPrice,
                  line_total: item.total
                }))}
                notes={notes}
              />
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Status</p>
          <StatusBadge 
            status={quote.status === "open" ? "info" : "neutral"} 
            label={quote.status.toUpperCase()} 
          />
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Quote Date</p>
          <p className="text-lg font-semibold">{quote.date}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Expiry Date</p>
          <p className="text-lg font-semibold">{quote.expiryDate}</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
          <p className="text-lg font-semibold">${quote.total.toLocaleString()}</p>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="items" className="space-y-4">
        <TabsList>
          <TabsTrigger value="items">Line Items</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="items" className="space-y-4">
          <Card className="p-6">
            <h3 className="mb-4">Quote Items</h3>
            <DataTable
              columns={lineItemColumns}
              data={quote.lineItems}
              emptyMessage="No line items"
            />
            
            <div className="mt-6 pt-6 border-t border-border">
              <div className="flex justify-end">
                <div className="w-64 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${quote.subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tax</span>
                    <span className="font-medium">${quote.tax.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-lg font-semibold pt-2 border-t border-border">
                    <span>Total</span>
                    <span>${quote.total.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notes">
          <Card className="p-6">
            <h3 className="mb-4">Internal Notes</h3>
            <Textarea
              placeholder="Add notes about this quote..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={6}
            />
            <div className="mt-4 flex justify-end">
              <Button onClick={() => toast.success("Notes saved")}>Save Notes</Button>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="p-6">
            <h3 className="mb-4">Quote History</h3>
            <div className="space-y-4">
              {quote.history.map((event, idx) => (
                <div key={idx} className="flex gap-4 p-4 rounded-md bg-panel">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-1">
                      <p className="font-medium">{event.action}</p>
                      <p className="text-xs text-muted-foreground">{event.timestamp}</p>
                    </div>
                    <p className="text-sm text-muted-foreground">{event.details}</p>
                    <p className="text-xs text-muted-foreground mt-1">by {event.user}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

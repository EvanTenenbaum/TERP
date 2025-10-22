import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, RefreshCw } from "lucide-react";
import { AgingReport as AgingReportComponent } from "@/components/reports/AgingReport";
import { mockInvoices, mockBills, mockClients, mockVendors } from "@/lib/mockData";
import { toast } from "sonner";

export default function AgingReport() {
  const handleExport = () => {
    toast.success("Export generated");
  };

  // Transform invoices for AR report
  const arDocuments = mockInvoices.map((inv) => ({
    id: inv.id,
    date: inv.issue_date,
    balance: inv.balance,
    client_name: mockClients.find(c => c.id === inv.client_id)?.name || inv.client_id
  }));

  // Transform bills for AP report
  const apDocuments = mockBills.map((bill) => ({
    id: bill.id,
    date: bill.issue_date,
    balance: bill.balance,
    vendor_name: mockVendors.find(v => v.id === bill.vendor_id)?.name || bill.vendor_id
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1">Aging Report</h1>
          <p className="text-sm text-muted-foreground">View AR and AP aging buckets</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      <Tabs defaultValue="ar" className="space-y-6">
        <TabsList>
          <TabsTrigger value="ar">Accounts Receivable</TabsTrigger>
          <TabsTrigger value="ap">Accounts Payable</TabsTrigger>
        </TabsList>

        <TabsContent value="ar">
          <AgingReportComponent
            documents={arDocuments}
            title="Accounts Receivable Aging"
            entityField="client_name"
          />
        </TabsContent>

        <TabsContent value="ap">
          <AgingReportComponent
            documents={apDocuments}
            title="Accounts Payable Aging"
            entityField="vendor_name"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

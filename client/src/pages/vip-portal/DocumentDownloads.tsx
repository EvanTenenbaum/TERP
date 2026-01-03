import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { trpc } from "@/lib/trpc";
import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type InvoiceListResponse = RouterOutputs["vipPortal"]["ar"]["getInvoices"];
type BillListResponse = RouterOutputs["vipPortal"]["ap"]["getBills"];

interface DocumentDownloadsProps {
  clientId: number;
}

const formatCurrency = (value: number | string): string =>
  `$${Number(value).toFixed(2)}`;

const DocumentDownloads = React.memo(function DocumentDownloads({
  clientId,
}: DocumentDownloadsProps) {
  const { data: invoiceData } = trpc.vipPortal.ar.getInvoices.useQuery({ clientId });
  const { data: billData } = trpc.vipPortal.ap.getBills.useQuery({ clientId });

  const [selectedInvoiceId, setSelectedInvoiceId] = useState<number | null>(null);
  const [selectedBillId, setSelectedBillId] = useState<number | null>(null);

  const downloadInvoice = trpc.vipPortal.documents.downloadInvoicePdf.useMutation();
  const downloadBill = trpc.vipPortal.documents.downloadBillPdf.useMutation();

  const invoices = useMemo(
    () => invoiceData?.invoices ?? ([] as InvoiceListResponse["invoices"]),
    [invoiceData]
  );
  const bills = useMemo(
    () => billData?.bills ?? ([] as BillListResponse["bills"]),
    [billData]
  );

  useEffect(() => {
    if (invoices.length > 0 && selectedInvoiceId === null) {
      setSelectedInvoiceId(invoices[0]?.id ?? null);
    }
  }, [invoices, selectedInvoiceId]);

  useEffect(() => {
    if (bills.length > 0 && selectedBillId === null) {
      setSelectedBillId(bills[0]?.id ?? null);
    }
  }, [bills, selectedBillId]);

  const handleInvoiceDownload = useCallback(async () => {
    if (!selectedInvoiceId) return;
    const result = await downloadInvoice.mutateAsync({ invoiceId: selectedInvoiceId });
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${result.pdf}`;
    link.download = result.fileName;
    link.click();
  }, [downloadInvoice, selectedInvoiceId]);

  const handleBillDownload = useCallback(async () => {
    if (!selectedBillId) return;
    const result = await downloadBill.mutateAsync({ billId: selectedBillId });
    const link = document.createElement("a");
    link.href = `data:application/pdf;base64,${result.pdf}`;
    link.download = result.fileName;
    link.click();
  }, [downloadBill, selectedBillId]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Invoice PDFs
          </CardTitle>
          <CardDescription>
            Download a professional PDF for any invoice linked to your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={selectedInvoiceId?.toString()}
            onValueChange={(value) => setSelectedInvoiceId(Number(value))}
            disabled={invoices.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an invoice" />
            </SelectTrigger>
            <SelectContent>
              {invoices.map((invoice) => (
                <SelectItem key={invoice.id} value={invoice.id.toString()}>
                  {invoice.invoiceNumber} · Due {new Date(invoice.dueDate).toLocaleDateString()} ·{" "}
                  {formatCurrency(invoice.amountDue)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleInvoiceDownload}
            disabled={downloadInvoice.isPending || !selectedInvoiceId}
            className="w-full"
          >
            {downloadInvoice.isPending ? "Preparing PDF..." : "Download Invoice PDF"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Bill PDFs
          </CardTitle>
          <CardDescription>
            Export bill details with full line items and totals for your records.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <Select
            value={selectedBillId?.toString()}
            onValueChange={(value) => setSelectedBillId(Number(value))}
            disabled={bills.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a bill" />
            </SelectTrigger>
            <SelectContent>
              {bills.map((bill) => (
                <SelectItem key={bill.id} value={bill.id.toString()}>
                  {bill.billNumber} · Due {new Date(bill.dueDate).toLocaleDateString()} ·{" "}
                  {formatCurrency(bill.amountDue)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            onClick={handleBillDownload}
            disabled={downloadBill.isPending || !selectedBillId}
            className="w-full"
          >
            {downloadBill.isPending ? "Preparing PDF..." : "Download Bill PDF"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
});

export default DocumentDownloads;

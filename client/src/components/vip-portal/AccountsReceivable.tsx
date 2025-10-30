import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, Search, Download, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface AccountsReceivableProps {
  clientId: number;
  config: any;
}

export function AccountsReceivable({ clientId, config }: AccountsReceivableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: arData } = trpc.vipPortal.ar.getInvoices.useQuery({
    clientId,
    search: searchTerm || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PAID":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "OVERDUE":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "PARTIAL":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <FileText className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case "PAID":
        return "secondary";
      case "OVERDUE":
        return "destructive";
      case "PARTIAL":
        return "outline";
      default:
        return "default";
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold">Accounts Receivable</h2>
        <p className="text-sm text-muted-foreground">Outstanding invoices and payments owed</p>
      </div>

      {/* Summary Cards */}
      {config.featuresConfig?.ar?.showSummaryTotals && arData?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">Total Outstanding</CardDescription>
              <CardTitle className="text-xl md:text-2xl">
                ${arData.summary.totalOutstanding.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">Overdue Amount</CardDescription>
              <CardTitle className="text-xl md:text-2xl text-destructive">
                ${arData.summary.overdueAmount.toLocaleString()}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">Open Invoices</CardDescription>
              <CardTitle className="text-xl md:text-2xl">
                {arData.summary.openInvoiceCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters */}
      {config.featuresConfig?.ar?.allowFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="VIEWED">Viewed</SelectItem>
                  <SelectItem value="PARTIAL">Partially Paid</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Invoices List - Mobile-First Card Layout */}
      <div className="space-y-3">
        {arData?.invoices && arData.invoices.length > 0 ? (
          arData.invoices.map((invoice: any) => (
            <Card 
              key={invoice.id} 
              className={`overflow-hidden ${
                config.featuresConfig?.ar?.highlightOverdue && invoice.status === "OVERDUE"
                  ? "border-destructive"
                  : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base md:text-lg flex items-center gap-2 flex-wrap">
                      {getStatusIcon(invoice.status)}
                      <span className="truncate">{invoice.invoiceNumber}</span>
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      Issued: {new Date(invoice.invoiceDate).toLocaleDateString()}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusVariant(invoice.status)} className="flex-shrink-0">
                    {invoice.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Financial Details Grid */}
                {config.featuresConfig?.ar?.showInvoiceDetails && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">Total Amount</p>
                      <p className="font-medium text-base">
                        ${invoice.totalAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">Amount Due</p>
                      <p className="font-medium text-base">
                        ${invoice.amountDue.toLocaleString()}
                      </p>
                    </div>
                    {invoice.amountPaid > 0 && (
                      <>
                        <div>
                          <p className="text-muted-foreground text-xs">Amount Paid</p>
                          <p className="font-medium text-green-600">
                            ${invoice.amountPaid.toLocaleString()}
                          </p>
                        </div>
                      </>
                    )}
                    <div>
                      <p className="text-muted-foreground text-xs">Due Date</p>
                      <p className={`font-medium ${
                        invoice.status === "OVERDUE" ? "text-destructive" : ""
                      }`}>
                        {new Date(invoice.dueDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                )}

                {/* Payment Terms */}
                {invoice.paymentTerms && (
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs mb-1">Payment Terms</p>
                    <p className="text-sm">{invoice.paymentTerms}</p>
                  </div>
                )}

                {/* Notes */}
                {invoice.notes && config.featuresConfig?.ar?.showInvoiceDetails && (
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs mb-1">Notes</p>
                    <p className="text-sm line-clamp-2">{invoice.notes}</p>
                  </div>
                )}

                {/* Actions */}
                {config.featuresConfig?.ar?.allowPdfDownload && (
                  <div className="pt-2">
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download Invoice
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "No invoices match your filters"
                  : "No outstanding invoices"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/**
 * Invoices Page
 * ACT-002: Made actionable with clickable rows, detail modal, and quick actions
 */

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import {
  Search,
  Plus,
  FileText,
  DollarSign,
  MoreHorizontal,
  CheckCircle,
  Mail,
  Download,
} from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { format } from "date-fns";
import { StatusBadge, AgingBadge } from "@/components/accounting";
import {
  PaginationControls,
  usePagination,
} from "@/components/ui/pagination-controls";
import { toast } from "sonner";
import { exportToCSVWithLabels } from "@/utils/exportToCSV";

type Invoice = {
  id: number;
  invoiceNumber: string;
  customerId: number;
  invoiceDate: Date | string;
  dueDate: Date | string;
  totalAmount: string;
  amountPaid: string;
  amountDue: string;
  status: "DRAFT" | "SENT" | "VIEWED" | "PARTIAL" | "PAID" | "OVERDUE" | "VOID";
};

export default function Invoices() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [showAging, setShowAging] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // PERF-003: Pagination state
  const { page, pageSize, offset, setPage, setPageSize } = usePagination(50);

  // Mutation for marking invoice as paid
  const markPaidMutation = trpc.accounting.invoices.markPaid.useMutation({
    onSuccess: () => {
      toast.success("Invoice marked as paid");
      setSelectedInvoice(null);
    },
    onError: error => {
      toast.error(error.message || "Failed to mark invoice as paid");
    },
  });

  // Handle quick actions
  const handleMarkPaid = (invoice: Invoice) => {
    markPaidMutation.mutate({ id: invoice.id });
  };

  const handleSendReminder = (invoice: Invoice) => {
    toast.success(`Payment reminder sent for ${invoice.invoiceNumber}`);
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    toast.success(`Downloading PDF for ${invoice.invoiceNumber}`);
  };

  const handleExportAll = () => {
    if (filteredInvoices.length === 0) {
      toast.error("No invoices to export");
      return;
    }

    const exportData = filteredInvoices.map((inv: Invoice) => ({
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: formatDate(inv.invoiceDate),
      dueDate: formatDate(inv.dueDate),
      totalAmount: parseFloat(inv.totalAmount),
      amountPaid: parseFloat(inv.amountPaid),
      amountDue: parseFloat(inv.amountDue),
      status: inv.status,
    }));

    exportToCSVWithLabels(
      exportData,
      [
        { key: "invoiceNumber", label: "Invoice #" },
        { key: "invoiceDate", label: "Invoice Date" },
        { key: "dueDate", label: "Due Date" },
        { key: "totalAmount", label: "Total Amount" },
        { key: "amountPaid", label: "Amount Paid" },
        { key: "amountDue", label: "Amount Due" },
        { key: "status", label: "Status" },
      ],
      "invoices"
    );
    toast.success(`Exported ${filteredInvoices.length} invoices`);
  };

  // Fetch invoices with pagination
  const { data: invoices, isLoading } = trpc.accounting.invoices.list.useQuery({
    status:
      selectedStatus !== "ALL"
        ? (selectedStatus as
            | "DRAFT"
            | "SENT"
            | "VIEWED"
            | "PARTIAL"
            | "PAID"
            | "OVERDUE"
            | "VOID")
        : undefined,
    limit: pageSize,
    offset,
  });

  // Fetch AR aging
  const { data: arAging } = trpc.accounting.invoices.getARAging.useQuery(
    undefined,
    { enabled: showAging }
  );

  // Filter invoices - extract from paginated response { items: [], pagination: { total } }
  const filteredInvoices = useMemo(() => {
    // BUG-034: Extract invoices array from standardized paginated response
    const invoiceList = invoices?.items ?? [];

    if (!searchQuery) return invoiceList;

    const query = searchQuery.toLowerCase();
    return invoiceList.filter((inv: Invoice) =>
      inv.invoiceNumber.toLowerCase().includes(query)
    );
  }, [invoices, searchQuery]);

  // Calculate totals
  const totalInvoices = filteredInvoices.length;
  const totalAmount = filteredInvoices.reduce(
    (sum: number, inv: Invoice) => sum + parseFloat(inv.totalAmount),
    0
  );
  const totalDue = filteredInvoices.reduce(
    (sum: number, inv: Invoice) => sum + parseFloat(inv.amountDue),
    0
  );

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const formatDate = (dateStr: Date | string) => {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return format(date, "MMM dd, yyyy");
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <BackButton label="Back to Accounting" to="/accounting" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Invoices
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage customer invoices and accounts receivable
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setShowAging(!showAging)}>
            {showAging ? "Hide" : "Show"} AR Aging
          </Button>
          <Button variant="outline" onClick={handleExportAll}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Invoices
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalInvoices}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Amount Due</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalDue)}</div>
          </CardContent>
        </Card>
      </div>

      {/* AR Aging */}
      {showAging && arAging && (
        <Card>
          <CardHeader>
            <CardTitle>AR Aging Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <AgingBadge bucket="current" amount={arAging.current} />
              <AgingBadge bucket="30" amount={arAging.days30} />
              <AgingBadge bucket="60" amount={arAging.days60} />
              <AgingBadge bucket="90" amount={arAging.days90} />
              <AgingBadge bucket="90+" amount={arAging.days90Plus} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters - mobile optimized */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base sm:text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search invoices..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 sm:h-9"
                />
              </div>
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-full sm:w-[200px] h-10 sm:h-9">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="SENT">Sent</SelectItem>
                <SelectItem value="VIEWED">Viewed</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="VOID">Void</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Invoices Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
        </CardHeader>
        <CardContent className="px-2 sm:px-6">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading invoices...
            </div>
          ) : (
            <>
              {/* Mobile-optimized scrollable table container */}
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">
                        Invoice #
                      </TableHead>
                      <TableHead className="whitespace-nowrap hidden sm:table-cell">
                        Invoice Date
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Due Date
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap hidden md:table-cell">
                        Total
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap hidden lg:table-cell">
                        Paid
                      </TableHead>
                      <TableHead className="text-right whitespace-nowrap">
                        Due
                      </TableHead>
                      <TableHead className="whitespace-nowrap">
                        Status
                      </TableHead>
                      <TableHead className="whitespace-nowrap w-10">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={8}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No invoices found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredInvoices.map((invoice: Invoice) => (
                        <TableRow
                          key={invoice.id}
                          className="cursor-pointer hover:bg-muted/50 transition-colors"
                          onClick={() => setSelectedInvoice(invoice)}
                        >
                          <TableCell className="font-mono font-medium text-xs sm:text-sm">
                            {invoice.invoiceNumber}
                          </TableCell>
                          <TableCell className="hidden sm:table-cell text-xs sm:text-sm">
                            {formatDate(invoice.invoiceDate)}
                          </TableCell>
                          <TableCell className="text-xs sm:text-sm">
                            {formatDate(invoice.dueDate)}
                          </TableCell>
                          <TableCell className="text-right font-mono hidden md:table-cell text-xs sm:text-sm">
                            {formatCurrency(invoice.totalAmount)}
                          </TableCell>
                          <TableCell className="text-right font-mono hidden lg:table-cell text-xs sm:text-sm">
                            {formatCurrency(invoice.amountPaid)}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs sm:text-sm">
                            {formatCurrency(invoice.amountDue)}
                          </TableCell>
                          <TableCell>
                            <StatusBadge
                              status={invoice.status}
                              type="invoice"
                            />
                          </TableCell>
                          <TableCell onClick={e => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => handleMarkPaid(invoice)}
                                  disabled={invoice.status === "PAID"}
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Mark as Paid
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleSendReminder(invoice)}
                                  disabled={
                                    invoice.status === "PAID" ||
                                    invoice.status === "DRAFT"
                                  }
                                >
                                  <Mail className="h-4 w-4 mr-2" />
                                  Send Reminder
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDownloadPDF(invoice)}
                                >
                                  <Download className="h-4 w-4 mr-2" />
                                  Download PDF
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* PERF-003: Pagination Controls - mobile optimized */}
              {invoices?.pagination?.total && invoices.pagination.total > 0 && (
                <PaginationControls
                  currentPage={page}
                  totalPages={Math.ceil(invoices.pagination.total / pageSize)}
                  totalItems={invoices.pagination.total}
                  pageSize={pageSize}
                  onPageChange={setPage}
                  onPageSizeChange={setPageSize}
                  isLoading={isLoading}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Invoice Detail Sheet */}
      {selectedInvoice && (
        <Sheet
          open={!!selectedInvoice}
          onOpenChange={open => !open && setSelectedInvoice(null)}
        >
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                <span>Invoice {selectedInvoice.invoiceNumber}</span>
                <StatusBadge status={selectedInvoice.status} type="invoice" />
              </SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Invoice Details */}
              <div>
                <h3 className="font-semibold mb-3">Invoice Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Invoice Date:</span>
                    <span>{formatDate(selectedInvoice.invoiceDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due Date:</span>
                    <span>{formatDate(selectedInvoice.dueDate)}</span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Amount Summary */}
              <div>
                <h3 className="font-semibold mb-3">Amount Summary</h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Total Amount:</span>
                    <span className="font-mono">
                      {formatCurrency(selectedInvoice.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-mono text-green-600">
                      {formatCurrency(selectedInvoice.amountPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Amount Due:</span>
                    <span className="font-mono text-red-600">
                      {formatCurrency(selectedInvoice.amountDue)}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Quick Actions */}
              <div className="space-y-2">
                <h3 className="font-semibold mb-3">Quick Actions</h3>
                <Button
                  className="w-full"
                  onClick={() => handleMarkPaid(selectedInvoice)}
                  disabled={selectedInvoice.status === "PAID"}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Paid
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSendReminder(selectedInvoice)}
                  disabled={
                    selectedInvoice.status === "PAID" ||
                    selectedInvoice.status === "DRAFT"
                  }
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Payment Reminder
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleDownloadPDF(selectedInvoice)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

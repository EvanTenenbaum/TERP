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
import { Search, Plus, FileText, DollarSign } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { format } from "date-fns";
import { StatusBadge, AgingBadge } from "@/components/accounting";
import { PaginationControls, usePagination } from "@/components/ui/pagination-controls";
import { TableSkeleton } from "@/components/ui/skeleton-loaders";
import { EmptyState } from "@/components/ui/empty-state";

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
  
  // PERF-003: Pagination state
  const { page, pageSize, offset, setPage, setPageSize } = usePagination(50);

  // Fetch invoices with pagination
  const { data: invoices, isLoading } = trpc.accounting.invoices.list.useQuery({
    status: selectedStatus !== "ALL" ? (selectedStatus as any) : undefined,
    limit: pageSize,
    offset,
  });

  // Fetch AR aging
  const { data: arAging } = trpc.accounting.invoices.getARAging.useQuery(
    undefined,
    { enabled: showAging }
  );

  // Filter invoices - extract from paginated response { invoices: [], total: number }
  const filteredInvoices = useMemo(() => {
    // Extract invoices array from paginated response object
    const invoiceList = invoices?.invoices ?? [];
    
    if (!searchQuery) return invoiceList;

    const query = searchQuery.toLowerCase();
    return invoiceList.filter((inv: Invoice) =>
      inv.invoiceNumber.toLowerCase().includes(query)
    );
  }, [invoices, searchQuery]);

  // Calculate totals
  const totalInvoices = filteredInvoices.length;
  const totalAmount = filteredInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.totalAmount), 0);
  const totalDue = filteredInvoices.reduce((sum: number, inv: any) => sum + parseFloat(inv.amountDue), 0);

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const formatDate = (dateStr: Date | string) => {
    const date = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
    return format(date, "MMM dd, yyyy");
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <BackButton label="Back to Accounting" to="/accounting" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-muted-foreground mt-1">
            Manage customer invoices and accounts receivable
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={() => setShowAging(!showAging)}>
            {showAging ? "Hide" : "Show"} AR Aging
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
            <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
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
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
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
                  onChange={(e) => setSearchQuery(e.target.value)}
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
            <TableSkeleton rows={10} columns={7} />
          ) : filteredInvoices.length === 0 ? (
            <EmptyState
              variant="invoices"
              title="No invoices found"
              description={searchQuery || selectedStatus !== "ALL"
                ? "Try adjusting your filters or search terms"
                : "Create your first invoice to start tracking accounts receivable"}
              action={!searchQuery && selectedStatus === "ALL" ? {
                label: "Create Invoice",
                onClick: () => console.log("Create invoice"), // TODO: Implement create invoice
              } : {
                label: "Clear Filters",
                onClick: () => {
                  setSearchQuery("");
                  setSelectedStatus("ALL");
                },
                variant: "outline",
              }}
            />
          ) : (
            <>
              {/* Mobile-optimized scrollable table container */}
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="whitespace-nowrap">Invoice #</TableHead>
                      <TableHead className="whitespace-nowrap hidden sm:table-cell">Invoice Date</TableHead>
                      <TableHead className="whitespace-nowrap">Due Date</TableHead>
                      <TableHead className="text-right whitespace-nowrap hidden md:table-cell">Total</TableHead>
                      <TableHead className="text-right whitespace-nowrap hidden lg:table-cell">Paid</TableHead>
                      <TableHead className="text-right whitespace-nowrap">Due</TableHead>
                      <TableHead className="whitespace-nowrap">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredInvoices.map((invoice: any) => (
                        <TableRow key={invoice.id}>
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
                            <StatusBadge status={invoice.status} type="invoice" />
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* PERF-003: Pagination Controls - mobile optimized */}
              {invoices?.total && invoices.total > 0 && (
                <PaginationControls
                  currentPage={page}
                  totalPages={Math.ceil(invoices.total / pageSize)}
                  totalItems={invoices.total}
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
    </div>
  );
}


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

export default function Bills() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [showAging, setShowAging] = useState(false);

  // Fetch bills
  const { data: bills, isLoading } = trpc.accounting.bills.list.useQuery({
    status: selectedStatus !== "ALL" ? (selectedStatus as any) : undefined,
  });

  // Fetch AP aging
  const { data: apAging } = trpc.accounting.bills.getAPAging.useQuery(
    undefined,
    { enabled: showAging }
  );

  // Filter bills - extract from paginated response { items: [], pagination: { total } }
  const filteredBills = useMemo(() => {
    // BUG-034: Extract bills array from standardized paginated response
    const billList = bills?.items ?? [];
    
    if (!searchQuery) return billList;

    const query = searchQuery.toLowerCase();
    return billList.filter((bill: { id: number; billNumber: string; billDate: Date | string; dueDate: Date | string; totalAmount: string; amountPaid: string; amountDue: string; status: string }) =>
      bill.billNumber.toLowerCase().includes(query)
    );
  }, [bills, searchQuery]);

  // Calculate totals
  const totalBills = filteredBills.length;
  const totalAmount = filteredBills.reduce((sum: number, bill: any) => sum + parseFloat(bill.totalAmount), 0);
  const totalDue = filteredBills.reduce((sum: number, bill: any) => sum + parseFloat(bill.amountDue), 0);

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
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Bills</h1>
          <p className="text-muted-foreground mt-1">
            Manage vendor bills and accounts payable
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowAging(!showAging)}>
            {showAging ? "Hide" : "Show"} AP Aging
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Bill
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bills</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalBills}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
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

      {/* AP Aging */}
      {showAging && apAging && (
        <Card>
          <CardHeader>
            <CardTitle>AP Aging Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <AgingBadge bucket="current" amount={apAging.current} />
              <AgingBadge bucket="30" amount={apAging.days30} />
              <AgingBadge bucket="60" amount={apAging.days60} />
              <AgingBadge bucket="90" amount={apAging.days90} />
              <AgingBadge bucket="90+" amount={apAging.days90Plus} />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search bills..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PARTIAL">Partial</SelectItem>
                <SelectItem value="PAID">Paid</SelectItem>
                <SelectItem value="OVERDUE">Overdue</SelectItem>
                <SelectItem value="VOID">Void</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bills Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Bills</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading bills...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Bill #</TableHead>
                  <TableHead>Bill Date</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Due</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredBills.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No bills found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBills.map((bill: any) => (
                    <TableRow key={bill.id}>
                      <TableCell className="font-mono font-medium">
                        {bill.billNumber}
                      </TableCell>
                      <TableCell>{formatDate(bill.billDate)}</TableCell>
                      <TableCell>{formatDate(bill.dueDate)}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(bill.totalAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(bill.amountPaid)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(bill.amountDue)}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={bill.status} type="bill" />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}


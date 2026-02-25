/**
 * Bills Page - ARCH-004 Bill Status State Machine UI
 *
 * Features:
 * - List all bills with filtering
 * - Bill detail sheet with status transitions
 * - State machine enforcement for status changes
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
import { Separator } from "@/components/ui/separator";
import { Search, Plus, FileText, DollarSign } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import {
  StatusBadge,
  AgingBadge,
  BillStatusActions,
  BillStatusTimeline,
} from "@/components/accounting";
import type { BillStatus } from "@/components/accounting/BillStatusActions";
import { formatDate } from "@/lib/dateFormat";
import { toast } from "sonner";

// Bill type definition
type Bill = {
  id: number;
  billNumber: string;
  vendorId: number;
  vendorName?: string;
  billDate: Date | string;
  dueDate: Date | string;
  totalAmount: string;
  amountPaid: string;
  amountDue: string;
  status: BillStatus;
};

export default function Bills({ embedded }: { embedded?: boolean } = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [showAging, setShowAging] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);

  // Fetch bills
  const {
    data: bills,
    isLoading,
    refetch,
  } = trpc.accounting.bills.list.useQuery({
    status:
      selectedStatus !== "ALL" ? (selectedStatus as BillStatus) : undefined,
  });

  // Fetch AP aging
  const { data: apAging } = trpc.accounting.bills.getAPAging.useQuery(
    undefined,
    { enabled: showAging }
  );

  // ARCH-004: Update bill status mutation
  const updateBillStatus = trpc.accounting.bills.updateStatus.useMutation({
    onSuccess: () => {
      toast.success("Bill status updated successfully");
      refetch();
      // Update selected bill to reflect new status
      if (selectedBill) {
        const updatedBills = bills?.items ?? [];
        const updatedBill = updatedBills.find(
          (b: Bill) => b.id === selectedBill.id
        );
        if (updatedBill) {
          setSelectedBill(updatedBill);
        }
      }
    },
    onError: error => {
      // ARCH-004: Show state machine validation errors
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  // Filter bills - extract from paginated response { items: [], pagination: { total } }
  const filteredBills = useMemo(() => {
    const billList = (bills?.items ?? []) as Bill[];

    if (!searchQuery) return billList;

    const query = searchQuery.toLowerCase();
    return billList.filter(bill =>
      bill.billNumber.toLowerCase().includes(query)
    );
  }, [bills, searchQuery]);

  // Calculate totals
  const totalBills = filteredBills.length;
  const totalAmount = filteredBills.reduce(
    (sum, bill) => sum + parseFloat(bill.totalAmount),
    0
  );
  const totalDue = filteredBills.reduce(
    (sum, bill) => sum + parseFloat(bill.amountDue),
    0
  );

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const handleStatusChange = (billId: number, newStatus: BillStatus) => {
    updateBillStatus.mutate({ id: billId, status: newStatus });
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {!embedded && <BackButton label="Back to Accounting" to="/accounting" />}
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Bills
          </h1>
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
                  onChange={e => setSearchQuery(e.target.value)}
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
            <div className="text-center py-8 text-muted-foreground">
              Loading bills...
            </div>
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
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No bills found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredBills.map(bill => (
                    <TableRow
                      key={bill.id}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setSelectedBill(bill)}
                    >
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

      {/* ARCH-004: Bill Detail Sheet with Status Transitions */}
      {selectedBill && (
        <Sheet
          open={!!selectedBill}
          onOpenChange={open => !open && setSelectedBill(null)}
        >
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                <span>Bill {selectedBill.billNumber}</span>
                <StatusBadge status={selectedBill.status} type="bill" />
              </SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Status Timeline */}
              <div>
                <h3 className="font-semibold mb-3">Status Progress</h3>
                <BillStatusTimeline currentStatus={selectedBill.status} />
              </div>

              <Separator />

              {/* Bill Details */}
              <div>
                <h3 className="font-semibold mb-3">Bill Details</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Bill Date:</span>
                    <span>{formatDate(selectedBill.billDate)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Due Date:</span>
                    <span>{formatDate(selectedBill.dueDate)}</span>
                  </div>
                  {selectedBill.vendorName && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendor:</span>
                      <span>{selectedBill.vendorName}</span>
                    </div>
                  )}
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
                      {formatCurrency(selectedBill.totalAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Amount Paid:</span>
                    <span className="font-mono text-green-600">
                      {formatCurrency(selectedBill.amountPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between font-semibold">
                    <span>Amount Due:</span>
                    <span className="font-mono text-red-600">
                      {formatCurrency(selectedBill.amountDue)}
                    </span>
                  </div>
                </div>
              </div>

              <Separator />

              {/* ARCH-004: Status Actions */}
              <div>
                <h3 className="font-semibold mb-3">Status Actions</h3>
                <BillStatusActions
                  currentStatus={selectedBill.status}
                  billNumber={selectedBill.billNumber}
                  onStatusChange={newStatus =>
                    handleStatusChange(selectedBill.id, newStatus)
                  }
                  isUpdating={updateBillStatus.isPending}
                />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}

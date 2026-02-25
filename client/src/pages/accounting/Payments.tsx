import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DollarSign, ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { format } from "date-fns";
import { StatusBadge } from "@/components/accounting";
import { FilterSortSearchPanel } from "@/components/ui/filter-sort-search-panel";

type PaymentSortField =
  | "paymentDate"
  | "amount"
  | "paymentType"
  | "paymentNumber";

type Payment = {
  id: number;
  paymentNumber: string;
  paymentDate: Date | string;
  paymentType: "RECEIVED" | "SENT" | string;
  paymentMethod: string;
  amount: string;
  referenceNumber?: string | null;
};

export default function Payments() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<"ALL" | "RECEIVED" | "SENT">(
    "ALL"
  );
  const [sortField, setSortField] = useState<PaymentSortField>("paymentDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Fetch payments
  const { data: payments, isLoading } = trpc.accounting.payments.list.useQuery({
    paymentType: selectedType !== "ALL" ? selectedType : undefined,
  });

  // Filter payments - extract from paginated response { items: [], pagination: { total } }
  const filteredPayments = useMemo(() => {
    // BUG-034: Extract payments array from standardized paginated response
    const paymentList = (payments?.items ?? []) as Payment[];
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const searched = normalizedQuery
      ? paymentList.filter((payment: Payment) =>
          payment.paymentNumber.toLowerCase().includes(normalizedQuery)
        )
      : paymentList;

    return [...searched].sort((a: Payment, b: Payment) => {
      let comparison = 0;
      switch (sortField) {
        case "paymentDate":
          comparison =
            new Date(a.paymentDate).getTime() -
            new Date(b.paymentDate).getTime();
          break;
        case "amount":
          comparison =
            parseFloat(a.amount as string) - parseFloat(b.amount as string);
          break;
        case "paymentType":
          comparison = String(a.paymentType || "").localeCompare(
            String(b.paymentType || "")
          );
          break;
        case "paymentNumber":
          comparison = String(a.paymentNumber || "").localeCompare(
            String(b.paymentNumber || "")
          );
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [payments, searchQuery, sortDirection, sortField]);

  // Calculate totals
  const totalPayments = filteredPayments.length;
  const totalReceived = filteredPayments
    .filter((p: Payment) => p.paymentType === "RECEIVED")
    .reduce((sum: number, p: Payment) => sum + parseFloat(p.amount), 0);
  const totalSent = filteredPayments
    .filter((p: Payment) => p.paymentType === "SENT")
    .reduce((sum: number, p: Payment) => sum + parseFloat(p.amount), 0);

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

  const handleClearAllFilters = () => {
    setSearchQuery("");
    setSelectedType("ALL");
    setSortField("paymentDate");
    setSortDirection("desc");
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <BackButton label="Back to Accounting" to="/accounting" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Payments
          </h1>
          <p className="text-muted-foreground mt-1">
            View all payment transactions (received and sent)
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Payments
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPayments}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Received</CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalReceived)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sent</CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalSent)}
            </div>
          </CardContent>
        </Card>
      </div>

      <FilterSortSearchPanel
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search payments..."
        filters={[
          {
            id: "type",
            label: "Type",
            value: selectedType,
            onChange: value =>
              setSelectedType(value as "ALL" | "RECEIVED" | "SENT"),
            allValue: "ALL",
            allLabel: "All Types",
            options: [
              { value: "RECEIVED", label: "Received" },
              { value: "SENT", label: "Sent" },
            ],
          },
        ]}
        sort={{
          field: sortField,
          onFieldChange: value => setSortField(value as PaymentSortField),
          fieldOptions: [
            { value: "paymentDate", label: "Payment Date" },
            { value: "amount", label: "Amount" },
            { value: "paymentType", label: "Type" },
            { value: "paymentNumber", label: "Payment #" },
          ],
          direction: sortDirection,
          onDirectionChange: setSortDirection,
          directionLabels: {
            asc: "Ascending",
            desc: "Descending",
          },
        }}
        resultCount={filteredPayments.length}
        resultLabel={filteredPayments.length === 1 ? "payment" : "payments"}
        onClearAll={handleClearAllFilters}
      />

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Payments</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading payments...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment: Payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono font-medium">
                        {payment.paymentNumber}
                      </TableCell>
                      <TableCell>{formatDate(payment.paymentDate)}</TableCell>
                      <TableCell>
                        <StatusBadge
                          status={payment.paymentType}
                          type="payment"
                        />
                      </TableCell>
                      <TableCell>
                        <StatusBadge
                          status={payment.paymentMethod}
                          type="paymentMethod"
                        />
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(payment.amount)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {payment.referenceNumber || "-"}
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

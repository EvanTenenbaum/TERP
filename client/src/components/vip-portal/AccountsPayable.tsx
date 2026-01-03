import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Receipt,
  Search,
  Download,
  AlertCircle,
  CheckCircle,
  Clock,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import type { JSX } from "react";

type PayableStatus =
  | "PAID"
  | "OVERDUE"
  | "PARTIAL"
  | "PENDING"
  | "APPROVED"
  | string;

interface PayableFeatures {
  showSummaryTotals?: boolean;
  allowFilters?: boolean;
  showInvoiceDetails?: boolean;
  highlightOverdue?: boolean;
}

interface AccountsPayableConfig {
  featuresConfig?: {
    ap?: PayableFeatures;
  };
}

interface PayableSummary {
  totalOwed?: number;
  overdueAmount?: number;
  openBillCount?: number;
}

interface PayableBill {
  id: number;
  billNumber: string;
  billDate: string | Date;
  totalAmount: number | string;
  amountDue: number | string;
  amountPaid: number | string;
  dueDate: string | Date;
  status: PayableStatus;
  paymentTerms?: string | null;
  notes?: string | null;
}

interface AccountsPayableData {
  summary?: PayableSummary;
  bills?: PayableBill[];
}

interface AccountsPayableProps {
  clientId: number;
  config: { featuresConfig?: { ap?: PayableFeatures } | null };
}

export function AccountsPayable({
  clientId,
  config,
}: AccountsPayableProps): JSX.Element {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: apResponse, isLoading } = trpc.vipPortal.ap.getBills.useQuery({
    clientId,
    search: searchTerm || undefined,
    status: statusFilter !== "all" ? statusFilter : undefined,
  });
  const apData = apResponse as AccountsPayableData | undefined;

  const getStatusIcon = (status: PayableStatus) => {
    switch (status) {
      case "PAID":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "OVERDUE":
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "PARTIAL":
        return <Clock className="h-4 w-4 text-yellow-500" />;
      default:
        return <Receipt className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusVariant = (
    status: PayableStatus
  ): "default" | "secondary" | "destructive" | "outline" => {
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

  const summary = useMemo(() => apData?.summary, [apData]);
  const bills = useMemo(() => apData?.bills ?? [], [apData]);
  const showPayableDetails =
    config.featuresConfig?.ap?.showInvoiceDetails ??
    (config.featuresConfig?.ap as { showBillDetails?: boolean } | undefined)
      ?.showBillDetails ??
    false;
  const allowPayableDownload =
    (config.featuresConfig?.ap as { allowPdfDownload?: boolean } | undefined)
      ?.allowPdfDownload ?? false;

  if (isLoading) {
    return (
      <div className="space-y-4 md:space-y-6">
        <Skeleton className="h-6 w-40" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="p-4">
              <Skeleton className="h-4 w-24 mb-3" />
              <Skeleton className="h-6 w-28" />
            </Card>
          ))}
        </div>
        <Card>
          <CardContent className="space-y-3 pt-6">
            {Array.from({ length: 2 }).map((_, index) => (
              <div key={index} className="space-y-2">
                <Skeleton className="h-5 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl md:text-2xl font-bold">Accounts Payable</h2>
        <p className="text-sm text-muted-foreground">
          Bills and payments you owe
        </p>
      </div>

      {/* Summary Cards */}
      {config.featuresConfig?.ap?.showSummaryTotals && summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">Total Owed</CardDescription>
              <CardTitle className="text-xl md:text-2xl">
                {formatCurrency(summary.totalOwed)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">
                Overdue Amount
              </CardDescription>
              <CardTitle className="text-xl md:text-2xl text-destructive">
                {formatCurrency(summary.overdueAmount)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardDescription className="text-xs">Open Bills</CardDescription>
              <CardTitle className="text-xl md:text-2xl">
                {summary.openBillCount}
              </CardTitle>
            </CardHeader>
          </Card>
        </div>
      )}

      {/* Filters */}
      {config.featuresConfig?.ap?.allowFilters && (
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search bills..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="PARTIAL">Partially Paid</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bills List - Mobile-First Card Layout */}
      <div className="space-y-3">
        {bills.length > 0 ? (
          bills.map(bill => (
            <Card
              key={bill.id}
              className={`overflow-hidden ${
                config.featuresConfig?.ap?.highlightOverdue &&
                bill.status === "OVERDUE"
                  ? "border-destructive"
                  : ""
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base md:text-lg flex items-center gap-2 flex-wrap">
                      {getStatusIcon(bill.status)}
                      <span className="truncate">{bill.billNumber}</span>
                    </CardTitle>
                    <CardDescription className="text-sm mt-1">
                      Date: {formatDate(bill.billDate)}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={getStatusVariant(bill.status)}
                    className="flex-shrink-0"
                  >
                    {bill.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Financial Details Grid */}
                {showPayableDetails && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-muted-foreground text-xs">
                        Total Amount
                      </p>
                      <p className="font-medium text-base">
                        {formatCurrency(bill.totalAmount)}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-xs">
                        Amount Due
                      </p>
                      <p className="font-medium text-base">
                        {formatCurrency(bill.amountDue)}
                      </p>
                    </div>
                    {(typeof bill.amountPaid === "string"
                      ? parseFloat(bill.amountPaid)
                      : (bill.amountPaid ?? 0)) > 0 && (
                      <div>
                        <p className="text-muted-foreground text-xs">
                          Amount Paid
                        </p>
                        <p className="font-medium text-green-600">
                          {formatCurrency(bill.amountPaid)}
                        </p>
                      </div>
                    )}
                    <div>
                      <p className="text-muted-foreground text-xs">Due Date</p>
                      <p
                        className={`font-medium ${
                          bill.status === "OVERDUE" ? "text-destructive" : ""
                        }`}
                      >
                        {formatDate(bill.dueDate)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Payment Terms */}
                {bill.paymentTerms && (
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs mb-1">
                      Payment Terms
                    </p>
                    <p className="text-sm">{bill.paymentTerms}</p>
                  </div>
                )}

                {/* Notes */}
                {bill.notes && showPayableDetails && (
                  <div className="text-sm">
                    <p className="text-muted-foreground text-xs mb-1">Notes</p>
                    <p className="text-sm line-clamp-2">{bill.notes}</p>
                  </div>
                )}

                {/* Actions */}
                {allowPayableDownload && (
                  <div className="pt-2">
                    <Button variant="outline" size="sm" className="w-full">
                      <Download className="h-4 w-4 mr-2" />
                      Download Bill
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card>
            <CardContent className="text-center py-12">
              <Receipt className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all"
                  ? "No bills match your filters"
                  : "No outstanding bills"}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

import { memo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

interface VendorNeedingPaymentData {
  vendorClientId: number;
  vendorName: string;
  amountDue: number;
  soldOutBatches: number;
  oldestDueDays: number;
}

export const OwnerVendorsNeedPaymentWidget = memo(
  function OwnerVendorsNeedPaymentWidget() {
    const [, setLocation] = useLocation();
    const {
      data: response,
      isLoading,
      error,
    } = trpc.dashboard.getVendorsNeedingPayment.useQuery(
      {},
      { refetchInterval: 60000 }
    );

    const data = response?.data || [];

    const formatCurrency = (value: number) => {
      return `$${value.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    };

    const formatDueDays = (days: number) => {
      if (days === 0) return "-";
      return `${days}d`;
    };

    const totalDue = data.reduce(
      (sum: number, v: VendorNeedingPaymentData) => sum + v.amountDue,
      0
    );
    const hasOverdueVendors = data.some(
      (v: VendorNeedingPaymentData) => v.oldestDueDays > 30
    );

    return (
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-2">
          <div>
            <CardTitle className="text-lg font-semibold">
              Suppliers Waiting to Be Paid
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              You&apos;ve sold their product — now they need to get paid.
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLocation("/accounting/bills")}
            className="text-xs"
          >
            Pay Bills <ArrowRight className="h-3 w-3 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : error ? (
            <EmptyState
              variant="generic"
              size="sm"
              title="Unable to load supplier payment data"
              description="Please refresh to retry loading payables"
            />
          ) : data.length > 0 ? (
            <div className="space-y-3">
              {/* Plain-language summary banner */}
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-sm text-amber-800">
                <span className="font-semibold">
                  {data.length} supplier{data.length !== 1 ? "s" : ""}
                </span>{" "}
                {data.length === 1 ? "needs" : "need"} payment totaling{" "}
                <span className="font-semibold font-mono">
                  {formatCurrency(totalDue)}
                </span>
                {hasOverdueVendors && (
                  <span className="block mt-1 text-amber-700 text-xs">
                    Some have been waiting over 30 days — pay these first.
                  </span>
                )}
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Supplier</TableHead>
                    <TableHead className="text-right">Amount Due</TableHead>
                    <TableHead className="text-right">Waiting</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((vendor: VendorNeedingPaymentData) => (
                    <TableRow
                      key={vendor.vendorClientId}
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setLocation("/accounting/bills")}
                    >
                      <TableCell>
                        <p className="font-medium">{vendor.vendorName}</p>
                        <p className="text-xs text-muted-foreground">
                          {vendor.soldOutBatches} sold-out batch
                          {vendor.soldOutBatches !== 1 ? "es" : ""}
                        </p>
                      </TableCell>
                      <TableCell className="text-right font-mono text-red-600 font-semibold">
                        {formatCurrency(vendor.amountDue)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {vendor.oldestDueDays > 0 ? (
                          <span
                            className={
                              vendor.oldestDueDays > 30
                                ? "text-red-600 font-semibold"
                                : ""
                            }
                          >
                            {formatDueDays(vendor.oldestDueDays)}
                          </span>
                        ) : (
                          <span>—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <p className="font-medium text-sm">All suppliers are paid up.</p>
              <p className="text-xs mt-1">
                No sold-out batches with outstanding balances.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
);

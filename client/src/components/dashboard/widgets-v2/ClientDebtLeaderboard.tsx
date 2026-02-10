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

export const ClientDebtLeaderboard = memo(function ClientDebtLeaderboard() {
  const [, setLocation] = useLocation();
  const { data: response, isLoading } =
    trpc.dashboard.getVendorsNeedingPayment.useQuery(
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-lg font-semibold">
            Vendors Who Need To Get Paid
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Sold-out batches with unpaid vendor payables.
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/accounting/bills")}
          className="text-xs"
        >
          View All <ArrowRight className="h-3 w-3 ml-1" />
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : data.length > 0 ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Vendor</TableHead>
                <TableHead className="text-right">Amount Due</TableHead>
                <TableHead className="text-right">Sold-Out Batches</TableHead>
                <TableHead className="text-right">Oldest Due</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((vendor: VendorNeedingPaymentData, index: number) => (
                <TableRow
                  key={vendor.vendorClientId}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => setLocation("/accounting/bills")}
                >
                  <TableCell className="text-muted-foreground font-medium">
                    {index + 1}
                  </TableCell>
                  <TableCell className="font-medium">
                    {vendor.vendorName}
                  </TableCell>
                  <TableCell className="text-right font-mono text-red-600">
                    {formatCurrency(vendor.amountDue)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {vendor.soldOutBatches}
                  </TableCell>
                  <TableCell className="text-right font-mono text-muted-foreground">
                    {formatDueDays(vendor.oldestDueDays)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No unpaid sold-out vendor payables found
          </div>
        )}
      </CardContent>
    </Card>
  );
});

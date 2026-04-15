import type { inferRouterOutputs } from "@trpc/server";
import type { AppRouter } from "../../../../server/routers";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { cn, formatCurrency } from "@/lib/utils";

type RouterOutputs = inferRouterOutputs<AppRouter>;
type RangeComplianceResponse =
  RouterOutputs["vendorPayables"]["getRangeCompliance"];
type RangeComplianceItem = RangeComplianceResponse["items"][number];

const formatUnits = (value: number) =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: value % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);

function getStatusBadgeProps(
  status: RangeComplianceItem["rangeComplianceStatus"]
): {
  label: string;
  variant?: "default" | "secondary";
  className?: string;
} {
  switch (status) {
    case "BELOW_RANGE":
      return {
        label: "Below Range",
        className: "border-amber-200 bg-amber-100 text-amber-800",
      };
    case "ABOVE_RANGE":
      return {
        label: "Above Range",
        className: "border-blue-200 bg-blue-100 text-blue-800",
      };
    case "IN_RANGE":
      return {
        label: "In Range",
        variant: "default",
      };
    default:
      return {
        label: "Unknown",
        variant: "secondary",
      };
  }
}

function LoadingState() {
  return (
    <Card data-testid="consignment-range-loading">
      <CardHeader className="space-y-3">
        <Skeleton className="h-5 w-56" />
        <Skeleton className="h-4 w-72" />
        <div className="grid gap-2 md:grid-cols-3">
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
          <Skeleton className="h-16 rounded-xl" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}

export function ConsignmentRangePanel({
  vendorClientId,
}: {
  vendorClientId: number;
}) {
  const rangeQuery = trpc.vendorPayables.getRangeCompliance.useQuery({
    vendorClientId,
  });

  if (rangeQuery.isLoading || rangeQuery.isPending) {
    return <LoadingState />;
  }

  const data = rangeQuery.data;
  const items = data?.items ?? [];

  if (!data || !items.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Consignment Range Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No consignment range data available
          </p>
        </CardContent>
      </Card>
    );
  }

  const summary = data.summary;
  const summaryLine = `${summary.inRangeCount} of ${summary.totalBatchCount} batches in range · ${formatUnits(summary.belowRangeUnitsSold)} units below range`;
  const secondarySummary = `${summary.totalBatchCount} consigned batches · ${formatUnits(summary.inRangeUnitsSold)} units in range · ${formatUnits(summary.outOfRangeUnitsSold)} units out of range`;

  return (
    <Card>
      <CardHeader className="space-y-4">
        <div>
          <CardTitle className="text-base">
            Consignment Range Compliance
          </CardTitle>
          <p className="mt-2 text-sm font-medium">{summaryLine}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            {secondarySummary}
          </p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-muted/20 p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Total Consigned
            </p>
            <p className="mt-1 text-lg font-semibold">
              {summary.totalBatchCount} batches
            </p>
            <p className="text-xs text-muted-foreground">
              {formatUnits(summary.totalUnitsSold)} units sold
            </p>
          </div>
          <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/60 p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Sold In Range
            </p>
            <p className="mt-1 text-lg font-semibold">
              {summary.inRangeCount} batches
            </p>
            <p className="text-xs text-muted-foreground">
              {formatUnits(summary.inRangeUnitsSold)} units
            </p>
          </div>
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/60 p-3">
            <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Sold Out Of Range
            </p>
            <p className="mt-1 text-lg font-semibold">
              {summary.outOfRangeCount} batches
            </p>
            <p className="text-xs text-muted-foreground">
              {formatUnits(summary.outOfRangeUnitsSold)} units
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Batch / Product</TableHead>
              <TableHead>Agreed Range</TableHead>
              <TableHead>Avg Sale Price</TableHead>
              <TableHead className="text-right">Units Sold</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => {
              const badge = getStatusBadgeProps(item.rangeComplianceStatus);

              return (
                <TableRow
                  key={item.batchId}
                  className={cn(
                    item.rangeComplianceStatus === "BELOW_RANGE" &&
                      "bg-amber-50/40"
                  )}
                >
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      <div className="font-medium">{item.batchCode}</div>
                      <div className="text-sm text-muted-foreground">
                        {item.productName}
                      </div>
                      {item.belowRangeReason ? (
                        <div className="text-xs text-muted-foreground">
                          Reason: {item.belowRangeReason}
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      <div>
                        {formatCurrency(item.agreedRangeMin)} -{" "}
                        {formatCurrency(item.agreedRangeMax)}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Payable due {formatCurrency(item.payableAmountDue)}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="align-top">
                    {formatCurrency(item.actualAvgSalePrice)}
                  </TableCell>
                  <TableCell className="text-right align-top">
                    {formatUnits(item.unitsSold)}
                  </TableCell>
                  <TableCell className="align-top">
                    <div className="space-y-1">
                      <Badge
                        variant={badge.variant}
                        className={badge.className}
                      >
                        {badge.label}
                      </Badge>
                      {item.rangeComplianceStatus === "BELOW_RANGE" &&
                      item.belowRangeReason ? (
                        <div className="text-xs text-muted-foreground">
                          Captured for settlement follow-up
                        </div>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

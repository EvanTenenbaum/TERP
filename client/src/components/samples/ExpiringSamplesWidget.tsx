import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Clock } from "lucide-react";
import { format, differenceInDays, isPast } from "date-fns";
import { trpc } from "@/lib/trpc";

interface ExpiringSample {
  id: number;
  products: Array<{ productId: number; quantity: string }> | null;
  expirationDate: Date | string | null;
  clientId: number;
  sampleRequestStatus: string;
}

interface ExpiringSamplesWidgetProps {
  daysAhead?: number;
  limit?: number;
}

export const ExpiringSamplesWidget = React.memo(function ExpiringSamplesWidget({
  daysAhead = 30,
  limit = 5,
}: ExpiringSamplesWidgetProps) {
  const { data: expiringSamples, isLoading } = trpc.samples.getExpiring.useQuery(
    { daysAhead },
    { staleTime: 5 * 60 * 1000 }
  );

  const displayedSamples = useMemo(() => {
    if (!expiringSamples) return [];
    return expiringSamples.slice(0, limit);
  }, [expiringSamples, limit]);

  const getExpirationStatus = (expirationDate: Date | string | null): {
    variant: "destructive" | "secondary" | "outline";
    label: string;
  } => {
    if (!expirationDate) return { variant: "outline", label: "No date" };

    const parsed = new Date(expirationDate);
    const daysUntil = differenceInDays(parsed, new Date());

    if (isPast(parsed)) {
      return { variant: "destructive", label: "Expired" };
    }
    if (daysUntil <= 7) {
      return { variant: "destructive", label: `${daysUntil}d left` };
    }
    return { variant: "secondary", label: `${daysUntil}d left` };
  };

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Expiring Samples</h3>
        </div>
        <div className="space-y-2">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-10 bg-muted animate-pulse rounded" />
          ))}
        </div>
      </Card>
    );
  }

  if (!displayedSamples.length) {
    return (
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-4">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-semibold">Expiring Samples</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          No samples expiring in the next {daysAhead} days.
        </p>
      </Card>
    );
  }

  const expiredCount = displayedSamples.filter(s => {
    if (!s.expirationDate) return false;
    return isPast(new Date(s.expirationDate));
  }).length;

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className={`h-5 w-5 ${expiredCount > 0 ? "text-red-500" : "text-yellow-500"}`} />
          <h3 className="font-semibold">Expiring Samples</h3>
        </div>
        <Badge variant={expiredCount > 0 ? "destructive" : "secondary"}>
          {displayedSamples.length} sample{displayedSamples.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      <div className="space-y-2">
        {displayedSamples.map(sample => {
          const status = getExpirationStatus(sample.expirationDate);
          const products = sample.products || [];
          const productSummary = products.length > 0
            ? `Product #${products[0].productId}${products.length > 1 ? ` +${products.length - 1} more` : ""}`
            : "No products";

          return (
            <div
              key={sample.id}
              className="flex items-center justify-between py-2 border-b last:border-b-0"
            >
              <div>
                <p className="text-sm font-medium">Sample #{sample.id}</p>
                <p className="text-xs text-muted-foreground">{productSummary}</p>
              </div>
              <div className="text-right">
                <Badge variant={status.variant}>{status.label}</Badge>
                {sample.expirationDate && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(sample.expirationDate), "MMM dd, yyyy")}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {expiringSamples && expiringSamples.length > limit && (
        <p className="text-xs text-muted-foreground mt-3 text-center">
          +{expiringSamples.length - limit} more samples expiring soon
        </p>
      )}
    </Card>
  );
});

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Loader2 } from "lucide-react";
import { useTopStrainFamilies } from "@/hooks/useStrainHooks";
import { memo } from "react";

/**
 * Top Strain Families Widget
 * Shows the best-selling strain families with sales metrics
 */
export const TopStrainFamiliesWidget = memo(function TopStrainFamiliesWidget() {
  const { data: topFamilies, isLoading, error } = useTopStrainFamilies(10);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Strain Families
          </CardTitle>
          <CardDescription>Best-selling strain families</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Strain Families
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Failed to load data</p>
        </CardContent>
      </Card>
    );
  }

  if (!topFamilies || topFamilies.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Top Strain Families
          </CardTitle>
          <CardDescription>Best-selling strain families</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No sales data yet</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate max sales for progress bars
  // LINT-005: Use correct camelCase property names from TopStrainFamily type
  const maxSales = Math.max(...topFamilies.map(f => Number(f.totalSales)));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Top Strain Families
        </CardTitle>
        <CardDescription>Best-selling strain families by sales</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* LINT-005: Let TypeScript infer type from hook return */}
        {topFamilies.map((family, index) => {
          const sales = Number(family.totalSales);
          const percentage = (sales / maxSales) * 100;

          return (
            <div key={family.familyId} className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    #{index + 1}
                  </Badge>
                  <span className="font-medium">{family.familyName}</span>
                </div>
                <span className="text-sm font-semibold">
                  $
                  {sales.toLocaleString("en-US", {
                    minimumFractionDigits: 0,
                    maximumFractionDigits: 0,
                  })}
                </span>
              </div>
              <Progress value={percentage} className="h-2" />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{family.orderCount} orders</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
});

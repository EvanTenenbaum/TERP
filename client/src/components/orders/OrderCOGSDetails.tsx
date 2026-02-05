import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export interface OrderCOGSLineItem {
  id: number;
  productDisplayName: string | null;
  quantity: string;
  cogsPerUnit: string;
  marginPercent: string;
  unitPrice: string;
  lineTotal: string;
  isSample: boolean;
}

export interface OrderCOGSDetailsProps {
  lineItems: OrderCOGSLineItem[];
}

const formatCurrency = (value: number): string => {
  if (!Number.isFinite(value)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

const parseNumber = (value: string): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const OrderCOGSDetails = React.memo(function OrderCOGSDetails({
  lineItems,
}: OrderCOGSDetailsProps): React.JSX.Element {
  const nonSampleItems = useMemo(
    () => lineItems.filter(item => !item.isSample),
    [lineItems]
  );

  const totals = useMemo(() => {
    const totalRevenue = nonSampleItems.reduce(
      (sum, item) => sum + parseNumber(item.lineTotal),
      0
    );
    const totalCogs = nonSampleItems.reduce((sum, item) => {
      const quantity = parseNumber(item.quantity);
      const cogsPerUnit = parseNumber(item.cogsPerUnit);
      return sum + quantity * cogsPerUnit;
    }, 0);
    const margin = totalRevenue - totalCogs;
    const marginPercent = totalRevenue > 0 ? (margin / totalRevenue) * 100 : 0;

    return {
      totalRevenue,
      totalCogs,
      margin,
      marginPercent,
    };
  }, [nonSampleItems]);

  if (lineItems.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>COGS Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No line items available.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>COGS Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Item</TableHead>
              <TableHead className="text-right">Qty</TableHead>
              <TableHead className="text-right">COGS/Unit</TableHead>
              <TableHead className="text-right">Revenue</TableHead>
              <TableHead className="text-right">Margin %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {lineItems.map(item => {
              const quantity = parseNumber(item.quantity);
              const cogs = parseNumber(item.cogsPerUnit);
              const revenue = parseNumber(item.lineTotal);
              const marginPercent = parseNumber(item.marginPercent);

              return (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.productDisplayName || "Unnamed item"}
                    {item.isSample && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (Sample)
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">{quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(cogs)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(revenue)}
                  </TableCell>
                  <TableCell className="text-right">
                    {marginPercent.toFixed(2)}%
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <div className="grid gap-2 md:grid-cols-4 text-sm">
          <div>
            <p className="text-muted-foreground">Total Revenue</p>
            <p className="font-semibold">
              {formatCurrency(totals.totalRevenue)}
            </p>
          </div>
          <div>
            <p className="text-muted-foreground">Total COGS</p>
            <p className="font-semibold">{formatCurrency(totals.totalCogs)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Gross Margin</p>
            <p className="font-semibold">{formatCurrency(totals.margin)}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Margin %</p>
            <p className="font-semibold">{totals.marginPercent.toFixed(2)}%</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});

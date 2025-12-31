import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

interface RevenueTrend {
  name: string;
  revenue: number;
  orders: number;
}

interface RevenueTrendsTableProps {
  data: RevenueTrend[];
  maxRows?: number;
}

export function RevenueTrendsTable({ data, maxRows = 6 }: RevenueTrendsTableProps) {
  const displayData = maxRows ? data.slice(0, maxRows) : data;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Period</TableHead>
          <TableHead className="text-right">Revenue</TableHead>
          <TableHead className="text-right">Orders</TableHead>
          <TableHead className="text-right">Avg Order</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {displayData.map((row) => (
          <TableRow key={row.name}>
            <TableCell className="font-medium">{row.name}</TableCell>
            <TableCell className="text-right">{formatCurrency(row.revenue)}</TableCell>
            <TableCell className="text-right">{row.orders}</TableCell>
            <TableCell className="text-right">
              {formatCurrency(row.orders > 0 ? row.revenue / row.orders : 0)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

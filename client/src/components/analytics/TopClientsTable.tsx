import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";

interface TopClient {
  clientId: number;
  clientName: string;
  totalRevenue: number;
  orderCount: number;
  averageOrderValue: number;
}

interface TopClientsTableProps {
  clients: TopClient[];
}

export function TopClientsTable({ clients }: TopClientsTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rank</TableHead>
          <TableHead>Client</TableHead>
          <TableHead className="text-right">Total Revenue</TableHead>
          <TableHead className="text-right">Orders</TableHead>
          <TableHead className="text-right">Avg Order</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {clients.map((client, index) => (
          <TableRow key={client.clientId}>
            <TableCell className="font-medium">{index + 1}</TableCell>
            <TableCell>{client.clientName}</TableCell>
            <TableCell className="text-right">
              {formatCurrency(client.totalRevenue)}
            </TableCell>
            <TableCell className="text-right">{client.orderCount}</TableCell>
            <TableCell className="text-right">
              {formatCurrency(client.averageOrderValue)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

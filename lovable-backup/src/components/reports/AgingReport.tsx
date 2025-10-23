import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { calculateAging } from "@/lib/financeOperations";

interface Document {
  id: string;
  date: string;
  balance: number;
  client_name?: string;
  vendor_name?: string;
}

interface AgingReportProps {
  documents: Document[];
  title: string;
  entityField: "client_name" | "vendor_name";
}

export function AgingReport({ documents, title, entityField }: AgingReportProps) {
  const aging = calculateAging(documents);

  const groupedDocs = documents.reduce((acc, doc) => {
    const key = doc[entityField] || "Unknown";
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(doc);
    return acc;
  }, {} as Record<string, Document[]>);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-5 gap-4">
            <div className="text-center">
              <div className="text-sm text-muted-foreground">Current</div>
              <div className="text-2xl font-bold">${aging.current.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">1-30 Days</div>
              <div className="text-2xl font-bold">${aging.days_30.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">31-60 Days</div>
              <div className="text-2xl font-bold">${aging.days_60.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">61-90 Days</div>
              <div className="text-2xl font-bold">${aging.days_90.toFixed(2)}</div>
            </div>
            <div className="text-center">
              <div className="text-sm text-muted-foreground">90+ Days</div>
              <div className="text-2xl font-bold text-destructive">${aging.days_90_plus.toFixed(2)}</div>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{entityField === "client_name" ? "Client" : "Vendor"}</TableHead>
                <TableHead className="text-right">Current</TableHead>
                <TableHead className="text-right">1-30</TableHead>
                <TableHead className="text-right">31-60</TableHead>
                <TableHead className="text-right">61-90</TableHead>
                <TableHead className="text-right">90+</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Object.entries(groupedDocs).map(([entity, docs]) => {
                const entityAging = calculateAging(docs);
                return (
                  <TableRow key={entity}>
                    <TableCell className="font-medium">{entity}</TableCell>
                    <TableCell className="text-right">${entityAging.current.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${entityAging.days_30.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${entityAging.days_60.toFixed(2)}</TableCell>
                    <TableCell className="text-right">${entityAging.days_90.toFixed(2)}</TableCell>
                    <TableCell className="text-right text-destructive">${entityAging.days_90_plus.toFixed(2)}</TableCell>
                    <TableCell className="text-right font-bold">${entityAging.total.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

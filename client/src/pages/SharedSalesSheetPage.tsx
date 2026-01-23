/**
 * SharedSalesSheetPage
 * Public page for viewing a shared sales sheet via token
 * No authentication required
 */

import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileText, Clock, Package } from "lucide-react";

export default function SharedSalesSheetPage() {
  const [, params] = useRoute("/shared/sales-sheet/:token");
  const token = params?.token || "";

  const { data: sheet, isLoading, error } = trpc.salesSheets.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
          <p className="mt-4 text-muted-foreground">Loading sales sheet...</p>
        </div>
      </div>
    );
  }

  if (error || !sheet) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Link Not Valid</CardTitle>
            <CardDescription>
              This sales sheet link has expired or is no longer available.
              Please contact your sales representative for an updated link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const formatDate = (date: Date | string | null) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-primary text-primary-foreground py-6">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="flex items-center gap-3">
            <FileText className="h-8 w-8" />
            <div>
              <h1 className="text-2xl font-bold">Sales Sheet</h1>
              <p className="text-primary-foreground/80">
                Prepared for {sheet.clientName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-4xl mx-auto px-4 py-8">
        {/* Summary Card */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Order Summary</CardTitle>
                <CardDescription>
                  Created on {formatDate(sheet.createdAt)}
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {formatCurrency(Number(sheet.totalValue))}
                </p>
                <p className="text-sm text-muted-foreground">
                  {sheet.itemCount} items
                </p>
              </div>
            </div>
          </CardHeader>
          {sheet.expiresAt && (
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>This link expires on {formatDate(sheet.expiresAt)}</span>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Items Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Available Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">Category</TableHead>
                  <TableHead className="text-right">Qty Available</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sheet.items.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-muted-foreground">
                      {index + 1}
                    </TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-center">
                      {item.category ? (
                        <Badge variant="outline">{item.category}</Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {item.quantity.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(item.price)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <Separator className="my-4" />

            {/* Total */}
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(Number(sheet.totalValue))}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            Interested in placing an order? Contact your sales representative.
          </p>
          <p className="mt-2">Powered by TERP</p>
        </div>
      </div>
    </div>
  );
}

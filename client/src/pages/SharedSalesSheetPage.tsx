/**
 * SharedSalesSheetPage
 * Public page for viewing a shared sales sheet via token.
 * No authentication required — this is a PUBLIC endpoint.
 *
 * SECURITY: only render fields that are explicitly included in the
 * getByToken router response. Never reference vendor, batchSku, cogs*,
 * basePrice, priceMarkup, or appliedRules here — those are stripped
 * server-side and must not appear in the client-facing view.
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
import { buildProductIdentityLines } from "@/lib/productIdentity";
import { formatCurrency } from "@/lib/statusTokens";
import { FileText, Clock, Package, CalendarDays } from "lucide-react";

/**
 * The client-safe shape returned by salesSheets.getByToken.
 * Internal fields (vendor, batchSku, cogs*, basePrice, priceMarkup,
 * appliedRules) are intentionally absent — they are stripped at the
 * router layer and must never be added here.
 */
interface PublicSheetItem {
  id: number;
  name: string;
  category?: string;
  subcategory?: string;
  brand?: string;
  strain?: string;
  quantity: number;
  price: number;
  imageUrl?: string;
}

const formatDate = (date: Date | string | null | undefined): string => {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export default function SharedSalesSheetPage() {
  const [, params] = useRoute("/shared/sales-sheet/:token");
  const token = params?.token ?? "";

  const {
    data: sheet,
    isLoading,
    error,
  } = trpc.salesSheets.getByToken.useQuery(
    { token },
    { enabled: !!token, retry: false }
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-12 w-12 mx-auto text-muted-foreground animate-pulse" />
          <p className="mt-4 text-muted-foreground">
            Loading sales catalogue...
          </p>
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
              This sales catalogue link has expired or is no longer available.
              Please contact your sales representative for an updated link.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  // Treat items as the public shape — no internal fields present.
  const items = sheet.items as PublicSheetItem[];
  const hasImages = items.some(item => Boolean(item.imageUrl));

  const catalogueTotal = items.reduce(
    (sum, i) => sum + i.price * i.quantity,
    0
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Header — client name and date visible for professional presentation */}
      <div className="bg-primary text-primary-foreground py-6">
        <div className="container max-w-4xl mx-auto px-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 shrink-0" />
              <div>
                <h1 className="text-2xl font-bold">Sales Catalogue</h1>
                <p className="text-primary-foreground/80">
                  Prepared for {sheet.clientName}
                </p>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="flex items-center gap-1.5 text-primary-foreground/70 text-sm">
                <CalendarDays className="h-4 w-4" />
                <span>Shared on {formatDate(sheet.createdAt)}</span>
              </div>
              {sheet.expiresAt ? (
                <p className="text-primary-foreground/60 text-xs mt-1">
                  Valid until {formatDate(sheet.expiresAt)}
                </p>
              ) : null}
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
                <CardTitle>Catalogue Summary</CardTitle>
                <CardDescription>
                  {sheet.itemCount} {sheet.itemCount === 1 ? "item" : "items"}
                </CardDescription>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">
                  {formatCurrency(catalogueTotal)}
                </p>
                <p className="text-sm text-muted-foreground">total value</p>
              </div>
            </div>
          </CardHeader>
          {sheet.expiresAt ? (
            <CardContent className="pt-0">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>This link expires on {formatDate(sheet.expiresAt)}</span>
              </div>
            </CardContent>
          ) : null}
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
                  {hasImages ? (
                    <TableHead className="w-20 text-center">Image</TableHead>
                  ) : null}
                  <TableHead>Item</TableHead>
                  <TableHead className="text-center">Type</TableHead>
                  <TableHead className="text-right">Qty Available</TableHead>
                  <TableHead className="text-right">Unit Price</TableHead>
                  <TableHead className="text-right">Line Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item, index) => {
                  const identityLines = buildProductIdentityLines({
                    brand: item.brand,
                    category: item.category,
                    subcategory: item.subcategory,
                    // vendor intentionally omitted — supplier names are internal
                  });

                  return (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      {hasImages ? (
                        <TableCell className="align-middle">
                          {item.imageUrl ? (
                            <div className="mx-auto h-14 w-14 overflow-hidden rounded-md border border-border/70 bg-muted/30">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="h-full w-full object-cover"
                                loading="lazy"
                              />
                            </div>
                          ) : (
                            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border border-dashed border-border/70 text-[10px] text-muted-foreground">
                              No image
                            </div>
                          )}
                        </TableCell>
                      ) : null}
                      <TableCell>
                        {/* Product identity: name (strain) → brand (grower) → category (type) */}
                        <div className="space-y-0.5">
                          <p className="font-medium">{item.name}</p>
                          {identityLines.secondary ? (
                            <p className="text-xs text-muted-foreground">
                              {identityLines.secondary}
                            </p>
                          ) : null}
                          {identityLines.tertiary ? (
                            <p className="text-xs text-muted-foreground/80">
                              {identityLines.tertiary}
                            </p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {item.subcategory ?? item.category ? (
                          <Badge variant="outline">
                            {item.subcategory ?? item.category}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {item.quantity.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.price)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(item.price * item.quantity)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>

            <Separator className="my-4" />

            {/* Total */}
            <div className="flex justify-end">
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(catalogueTotal)}
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
          <p className="mt-2">
            Pricing and availability are subject to final confirmation.
          </p>
          <p className="mt-2">Powered by TERP</p>
        </div>
      </div>
    </div>
  );
}

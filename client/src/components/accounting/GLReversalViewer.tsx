/**
 * GL Reversal Viewer Component
 * TER-43: Integrate GL Reversal Visibility Components
 *
 * Displays GL reversal entries with clear visual indicators
 * Used in AR/AP and accounting views to show voided/reversed entries
 */

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeftRight, XCircle, AlertTriangle } from "lucide-react";
import { formatDate } from "@/lib/dateFormat";

interface GLReversalViewerProps {
  referenceType?: "INVOICE" | "PAYMENT" | "REVERSAL" | "PAYMENT_VOID";
  referenceId?: number;
  limit?: number;
  showTitle?: boolean;
}

interface LedgerEntry {
  id: number;
  entryNumber: string;
  entryDate: Date | string;
  accountId: number;
  accountName?: string;
  debit: string;
  credit: string;
  description: string | null;
  referenceType: string | null;
  referenceId: number | null;
  isManual: boolean;
}

/**
 * Format currency for display
 */
function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (num === 0) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(num);
}

/**
 * Check if entry is a reversal
 */
function isReversalEntry(entry: LedgerEntry): boolean {
  return (
    entry.referenceType === "REVERSAL" ||
    entry.referenceType === "PAYMENT_VOID" ||
    (entry.description?.toLowerCase().includes("reversal") ?? false) ||
    (entry.description?.toLowerCase().includes("void") ?? false)
  );
}

/**
 * Get badge variant for reference type
 */
function getReferenceTypeBadge(referenceType: string | null): {
  variant: "default" | "secondary" | "destructive" | "outline";
  label: string;
} {
  switch (referenceType) {
    case "REVERSAL":
      return { variant: "destructive", label: "Reversal" };
    case "PAYMENT_VOID":
      return { variant: "destructive", label: "Payment Void" };
    case "INVOICE":
      return { variant: "default", label: "Invoice" };
    case "PAYMENT":
      return { variant: "secondary", label: "Payment" };
    default:
      return { variant: "outline", label: referenceType ?? "Unknown" };
  }
}

export function GLReversalViewer({
  referenceType,
  referenceId,
  limit = 20,
  showTitle = true,
}: GLReversalViewerProps) {
  // Query GL entries
  const {
    data: entries,
    isLoading,
    error,
  } = trpc.accounting.ledger.list.useQuery(
    {
      referenceType,
      referenceId,
      limit,
    },
    {
      retry: 2,
      staleTime: 30 * 1000,
    }
  );

  // Separate reversals from regular entries
  const { reversalEntries, regularEntries } = useMemo(() => {
    const items = entries?.items || [];
    const reversals: LedgerEntry[] = [];
    const regulars: LedgerEntry[] = [];

    items.forEach((entry: LedgerEntry) => {
      if (isReversalEntry(entry)) {
        reversals.push(entry);
      } else {
        regulars.push(entry);
      }
    });

    return { reversalEntries: reversals, regularEntries: regulars };
  }, [entries]);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">
            Loading GL entries...
          </p>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="flex items-center justify-center gap-2 text-destructive">
            <AlertTriangle className="h-4 w-4" />
            <p className="text-sm">Failed to load GL entries</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const hasReversals = reversalEntries.length > 0;
  const totalEntries = (entries?.items || []).length;

  if (totalEntries === 0) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-muted-foreground text-center">
            No GL entries found
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      {showTitle && (
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5" />
            GL Entries
            {hasReversals && (
              <Badge variant="destructive" className="ml-2">
                <XCircle className="h-3 w-3 mr-1" />
                {reversalEntries.length} Reversal
                {reversalEntries.length !== 1 ? "s" : ""}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {/* Reversal Warning Banner */}
        {hasReversals && (
          <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-2 text-destructive">
              <XCircle className="h-4 w-4" />
              <span className="text-sm font-medium">
                This document has been voided. Reversing entries have been
                posted to the GL.
              </span>
            </div>
          </div>
        )}

        {/* GL Entries Table */}
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entry #</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Description</TableHead>
              <TableHead className="text-right">Debit</TableHead>
              <TableHead className="text-right">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {/* Show reversals first, highlighted */}
            {reversalEntries.map(entry => {
              const badge = getReferenceTypeBadge(entry.referenceType);
              return (
                <TableRow
                  key={entry.id}
                  className="bg-destructive/5 hover:bg-destructive/10"
                >
                  <TableCell className="font-mono text-sm">
                    {entry.entryNumber}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(entry.entryDate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">
                    {entry.description}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-destructive">
                    {formatCurrency(entry.debit)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm text-destructive">
                    {formatCurrency(entry.credit)}
                  </TableCell>
                </TableRow>
              );
            })}

            {/* Regular entries */}
            {regularEntries.map(entry => {
              const badge = getReferenceTypeBadge(entry.referenceType);
              return (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-sm">
                    {entry.entryNumber}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(entry.entryDate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={badge.variant}>{badge.label}</Badge>
                  </TableCell>
                  <TableCell className="text-sm max-w-[200px] truncate">
                    {entry.description}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(entry.debit)}
                  </TableCell>
                  <TableCell className="text-right font-mono text-sm">
                    {formatCurrency(entry.credit)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        {/* Totals */}
        <div className="mt-4 pt-4 border-t flex justify-end gap-8">
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Debits</p>
            <p className="font-mono font-bold">
              {formatCurrency(
                (entries?.items || []).reduce(
                  (sum: number, e: LedgerEntry) =>
                    sum + parseFloat(e.debit || "0"),
                  0
                )
              )}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Total Credits</p>
            <p className="font-mono font-bold">
              {formatCurrency(
                (entries?.items || []).reduce(
                  (sum: number, e: LedgerEntry) =>
                    sum + parseFloat(e.credit || "0"),
                  0
                )
              )}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact version for inline display in invoice/payment details
 */
export function GLReversalBadge({
  referenceType,
  referenceId,
}: {
  referenceType: string;
  referenceId: number;
}) {
  const { data: entries } = trpc.accounting.ledger.list.useQuery(
    {
      referenceType,
      referenceId,
      limit: 10,
    },
    {
      retry: 1,
      staleTime: 60 * 1000,
    }
  );

  const hasReversal = useMemo(() => {
    return (entries?.items || []).some((e: LedgerEntry) => isReversalEntry(e));
  }, [entries]);

  if (!hasReversal) return null;

  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" />
      GL Reversed
    </Badge>
  );
}

export default GLReversalViewer;

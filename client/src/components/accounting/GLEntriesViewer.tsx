/**
 * GLEntriesViewer Component
 * Displays general ledger entries for any reference (order, invoice, return, etc.)
 * Part of TERP-0012: Accounting UI Flows
 */

import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  BookOpen,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { format } from "date-fns";

type ReferenceType =
  | "ORDER"
  | "INVOICE"
  | "PAYMENT"
  | "RETURN"
  | "CREDIT_MEMO"
  | "BILL"
  | "ADJUSTMENT";

interface GLEntriesViewerProps {
  referenceType: ReferenceType;
  referenceId: number;
  title?: string;
  showTitle?: boolean;
  compact?: boolean;
  maxEntries?: number;
}

interface GLEntry {
  id: number;
  entryNumber: string;
  entryDate: string | Date | null;
  accountId: number;
  accountNumber?: string;
  accountName?: string;
  debit: string;
  credit: string;
  description: string;
  isReversed?: boolean;
  reversedByEntryId?: number | null;
  isReversal?: boolean;
  reversesEntryId?: number | null;
}

export function GLEntriesViewer({
  referenceType,
  referenceId,
  title = "Ledger Entries",
  showTitle = true,
  compact = false,
  maxEntries = 50,
}: GLEntriesViewerProps) {
  const {
    data: result,
    isLoading,
    error,
  } = trpc.accounting.ledger.list.useQuery({
    referenceType,
    referenceId,
    limit: maxEntries,
  });

  const entries: GLEntry[] = (result?.items ?? []) as GLEntry[];

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (numValue === 0) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(numValue);
  };

  const totalDebits = entries.reduce(
    (sum, e) => sum + parseFloat(e.debit || "0"),
    0
  );
  const totalCredits = entries.reduce(
    (sum, e) => sum + parseFloat(e.credit || "0"),
    0
  );
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  if (isLoading) {
    return (
      <div className="space-y-2 p-4">
        {showTitle && <Skeleton className="h-5 w-32" />}
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/4" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load ledger entries: {error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="p-4 text-center text-muted-foreground border rounded-lg">
        <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No ledger entries found.</p>
        <p className="text-xs mt-1">
          Entries are created when transactions are posted.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showTitle && (
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <BookOpen className="h-4 w-4" />
            {title}
            <Badge variant="secondary" className="text-xs">
              {entries.length}
            </Badge>
          </h4>
          <Badge variant={isBalanced ? "outline" : "destructive"}>
            {isBalanced ? "Balanced" : "Unbalanced"}
          </Badge>
        </div>
      )}

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {!compact && <TableHead className="w-24">Date</TableHead>}
              {!compact && <TableHead className="w-24">Entry #</TableHead>}
              <TableHead>Account</TableHead>
              {!compact && <TableHead>Description</TableHead>}
              <TableHead className="text-right w-28">Debit</TableHead>
              <TableHead className="text-right w-28">Credit</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(entry => (
              <TableRow
                key={entry.id}
                className={
                  entry.isReversed
                    ? "opacity-50 line-through"
                    : entry.isReversal
                      ? "bg-orange-50 dark:bg-orange-950/20"
                      : ""
                }
              >
                {!compact && (
                  <TableCell className="font-mono text-xs">
                    {entry.entryDate
                      ? format(new Date(entry.entryDate), "MMM d")
                      : "-"}
                  </TableCell>
                )}
                {!compact && (
                  <TableCell className="font-mono text-xs">
                    <div className="flex items-center gap-1">
                      {entry.entryNumber}
                      {entry.isReversal && (
                        <Badge variant="outline" className="text-[10px] px-1">
                          REV
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                )}
                <TableCell>
                  <div className="flex flex-col">
                    <span
                      className={`font-medium ${compact ? "text-xs" : "text-sm"}`}
                    >
                      {entry.accountName ??
                        entry.accountNumber ??
                        `Account ${entry.accountId}`}
                    </span>
                    {!compact && entry.accountNumber && entry.accountName && (
                      <span className="text-xs text-muted-foreground">
                        {entry.accountNumber}
                      </span>
                    )}
                  </div>
                </TableCell>
                {!compact && (
                  <TableCell className="text-xs text-muted-foreground max-w-[150px] truncate">
                    {entry.description}
                  </TableCell>
                )}
                <TableCell className="text-right font-mono">
                  <div className="flex items-center justify-end gap-1">
                    {parseFloat(entry.debit) > 0 && (
                      <>
                        <ArrowUpRight className="h-3 w-3 text-green-600" />
                        <span className="text-green-700 dark:text-green-400">
                          {formatCurrency(entry.debit)}
                        </span>
                      </>
                    )}
                    {parseFloat(entry.debit) === 0 && "-"}
                  </div>
                </TableCell>
                <TableCell className="text-right font-mono">
                  <div className="flex items-center justify-end gap-1">
                    {parseFloat(entry.credit) > 0 && (
                      <>
                        <ArrowDownRight className="h-3 w-3 text-red-600" />
                        <span className="text-red-700 dark:text-red-400">
                          {formatCurrency(entry.credit)}
                        </span>
                      </>
                    )}
                    {parseFloat(entry.credit) === 0 && "-"}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {/* Totals Row */}
            <TableRow className="bg-muted/50 font-semibold">
              {!compact && <TableCell colSpan={2} />}
              <TableCell className={compact ? "" : ""}>
                <span className="text-sm">Totals</span>
              </TableCell>
              {!compact && <TableCell />}
              <TableCell className="text-right font-mono">
                {formatCurrency(totalDebits)}
              </TableCell>
              <TableCell className="text-right font-mono">
                {formatCurrency(totalCredits)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default GLEntriesViewer;

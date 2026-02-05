import React, { useMemo, useState, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

interface GLReversalViewerProps {
  limit?: number;
}

interface LedgerEntryItem {
  id: number;
  entryNumber: string;
  entryDate: Date | string;
  debit: string;
  credit: string;
  description?: string | null;
  isPosted: boolean;
}

const formatCurrency = (value: string): string => {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) return "$0.00";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(numberValue);
};

const formatDate = (value: Date | string): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US");
};

export const GLReversalViewer = React.memo(function GLReversalViewer({
  limit = 25,
}: GLReversalViewerProps): React.JSX.Element {
  const [search, setSearch] = useState("");
  const [showPostedOnly, setShowPostedOnly] = useState(false);

  const { data, isLoading, error, refetch } =
    trpc.accounting.ledger.list.useQuery({
      referenceType: "REVERSAL",
      limit,
      isPosted: showPostedOnly ? true : undefined,
    });

  const entries = useMemo<LedgerEntryItem[]>(() => {
    const items = data?.items ?? [];
    return items
      .filter(
        item =>
          typeof item?.id === "number" &&
          typeof item?.entryNumber === "string" &&
          typeof item?.entryDate !== "undefined" &&
          typeof item?.debit === "string" &&
          typeof item?.credit === "string"
      )
      .map(item => ({
        id: item.id,
        entryNumber: item.entryNumber,
        entryDate: item.entryDate,
        debit: item.debit,
        credit: item.credit,
        description: item.description,
        isPosted: item.isPosted,
      }));
  }, [data?.items]);

  const filteredEntries = useMemo(() => {
    if (!search.trim()) return entries;
    const lower = search.toLowerCase();
    return entries.filter(
      entry =>
        entry.entryNumber.toLowerCase().includes(lower) ||
        entry.description?.toLowerCase().includes(lower)
    );
  }, [entries, search]);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>GL Reversals</CardTitle>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <Input
            placeholder="Filter by entry number or description"
            value={search}
            onChange={event => setSearch(event.target.value)}
            className="md:max-w-sm"
          />
          <div className="flex items-center gap-2">
            <Switch
              checked={showPostedOnly}
              onCheckedChange={setShowPostedOnly}
              id="posted-only"
            />
            <Label htmlFor="posted-only">Posted only</Label>
          </div>
        </div>

        {error ? (
          <p className="text-sm text-destructive">
            Unable to load GL reversals.
          </p>
        ) : isLoading ? (
          <p className="text-sm text-muted-foreground">Loading reversals...</p>
        ) : filteredEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No reversal entries found.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Entry</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Debit</TableHead>
                <TableHead className="text-right">Credit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEntries.map(entry => (
                <TableRow key={entry.id}>
                  <TableCell className="font-medium">
                    {entry.entryNumber}
                  </TableCell>
                  <TableCell>{formatDate(entry.entryDate)}</TableCell>
                  <TableCell>{entry.description || "Reversal entry"}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(entry.debit)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(entry.credit)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
});

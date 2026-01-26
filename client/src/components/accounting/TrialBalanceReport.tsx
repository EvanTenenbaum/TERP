/**
 * TrialBalanceReport Component
 * Displays a trial balance report for a fiscal period
 * Part of TERP-0012 Phase 3: Financial Reports
 */

import React from "react";
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
  TableFooter,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Scale } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { FiscalPeriodSelector } from "./FiscalPeriodSelector";

interface TrialBalanceReportProps {
  defaultFiscalPeriodId?: number;
  onFiscalPeriodChange?: (periodId: number) => void;
  showPeriodSelector?: boolean;
}

interface TrialBalanceAccount {
  accountId: number;
  accountNumber: string;
  accountName: string;
  accountType: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
  totalDebit: number;
  totalCredit: number;
  balance: number;
}

export function TrialBalanceReport({
  defaultFiscalPeriodId,
  onFiscalPeriodChange,
  showPeriodSelector = true,
}: TrialBalanceReportProps) {
  const [fiscalPeriodId, setFiscalPeriodId] = React.useState<
    number | undefined
  >(defaultFiscalPeriodId);

  const {
    data: trialBalance,
    isLoading,
    error,
  } = trpc.accounting.ledger.getTrialBalance.useQuery(
    { fiscalPeriodId: fiscalPeriodId ?? 0 },
    { enabled: !!fiscalPeriodId }
  );

  const handlePeriodChange = (newPeriodId: number) => {
    setFiscalPeriodId(newPeriodId);
    onFiscalPeriodChange?.(newPeriodId);
  };

  const formatCurrency = (value: number | undefined) => {
    if (value === undefined || value === null || value === 0) return "-";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  // Trial balance returns an array directly, not { accounts: [...] }
  const accounts = (trialBalance ?? []) as TrialBalanceAccount[];

  const totalDebits = accounts.reduce(
    (sum, acc) => sum + (acc.totalDebit || 0),
    0
  );
  const totalCredits = accounts.reduce(
    (sum, acc) => sum + (acc.totalCredit || 0),
    0
  );
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Scale className="h-5 w-5" />
              Trial Balance
            </CardTitle>
            <CardDescription>
              Summary of all account balances for the period
            </CardDescription>
          </div>
          {showPeriodSelector && (
            <div className="w-48">
              <FiscalPeriodSelector
                value={fiscalPeriodId}
                onChange={handlePeriodChange}
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        {!fiscalPeriodId ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Select a fiscal period to view the trial balance.
            </AlertDescription>
          </Alert>
        ) : isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-3/4" />
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load trial balance: {error.message}
            </AlertDescription>
          </Alert>
        ) : accounts.length === 0 ? (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              No accounts found for this period.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {/* Balance Status */}
            <div className="mb-4 flex items-center gap-2">
              {isBalanced ? (
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Balanced
                </Badge>
              ) : (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Out of Balance:{" "}
                  {formatCurrency(Math.abs(totalDebits - totalCredits))}
                </Badge>
              )}
            </div>

            {/* Trial Balance Table */}
            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-24">Account #</TableHead>
                    <TableHead>Account Name</TableHead>
                    <TableHead className="w-24">Type</TableHead>
                    <TableHead className="text-right w-32">Debit</TableHead>
                    <TableHead className="text-right w-32">Credit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map(account => (
                    <TableRow key={account.accountId}>
                      <TableCell className="font-mono text-sm">
                        {account.accountNumber}
                      </TableCell>
                      <TableCell>{account.accountName}</TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="text-xs">
                          {account.accountType}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(account.totalDebit)}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(account.totalCredit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow className="font-semibold">
                    <TableCell colSpan={3}>Total</TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(totalDebits)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(totalCredits)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default TrialBalanceReport;

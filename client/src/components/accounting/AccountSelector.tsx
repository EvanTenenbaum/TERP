import * as React from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";

export type AccountType =
  | "ASSET"
  | "LIABILITY"
  | "EQUITY"
  | "REVENUE"
  | "EXPENSE";

interface AccountSelectorProps {
  value?: number;
  onChange?: (accountId: number) => void;
  accountType?: AccountType;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * AccountSelector - Dropdown for selecting accounts from chart of accounts
 *
 * Features:
 * - Fetches accounts from API
 * - Optional filtering by account type
 * - Shows account number and name
 * - Hierarchical display (indented for sub-accounts)
 * - Loading state
 */
export function AccountSelector({
  value,
  onChange,
  accountType,
  placeholder = "Select account...",
  disabled = false,
  className,
}: AccountSelectorProps) {
  const { data: accounts, isLoading } = trpc.accounting.accounts.list.useQuery({
    accountType,
    isActive: true,
  });

  // LINT-001: Move hooks before any conditional returns to avoid rules-of-hooks violation
  // PERF-003: Extract items from paginated response and sort by account number
  const sortedAccounts = React.useMemo(() => {
    const items = accounts?.items ?? [];
    if (!items.length) return [];
    return [...items].sort((a, b) =>
      a.accountNumber.localeCompare(b.accountNumber)
    );
  }, [accounts]);

  // Group accounts by type for better organization
  const groupedAccounts = React.useMemo(() => {
    if (!sortedAccounts.length) return {};

    return sortedAccounts.reduce(
      (acc, account) => {
        const type = account.accountType;
        if (!acc[type]) {
          acc[type] = [];
        }
        acc[type].push(account);
        return acc;
      },
      {} as Record<string, typeof sortedAccounts>
    );
  }, [sortedAccounts]);

  if (isLoading) {
    return <Skeleton className="h-10 w-full" />;
  }

  const accountTypeLabels: Record<AccountType, string> = {
    ASSET: "Assets",
    LIABILITY: "Liabilities",
    EQUITY: "Equity",
    REVENUE: "Revenue",
    EXPENSE: "Expenses",
  };

  const selectedAccount = sortedAccounts.find(acc => acc.id === value);

  return (
    <Select
      value={value?.toString()}
      onValueChange={val => onChange?.(parseInt(val, 10))}
      disabled={disabled || !sortedAccounts || sortedAccounts.length === 0}
    >
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder}>
          {selectedAccount && (
            <span className="font-mono">
              {selectedAccount.accountNumber} - {selectedAccount.accountName}
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="max-h-[300px]">
        {accountType
          ? // Show flat list if filtered by type
            sortedAccounts.map(account => (
              <SelectItem key={account.id} value={account.id.toString()}>
                <span className="font-mono">
                  {account.accountNumber} - {account.accountName}
                </span>
              </SelectItem>
            ))
          : // Show grouped by type if no filter
            Object.entries(groupedAccounts).map(([type, typeAccounts]) => (
              <React.Fragment key={type}>
                <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">
                  {accountTypeLabels[type as AccountType]}
                </div>
                {typeAccounts.map(account => (
                  <SelectItem key={account.id} value={account.id.toString()}>
                    <span className="font-mono">
                      {account.accountNumber} - {account.accountName}
                    </span>
                  </SelectItem>
                ))}
              </React.Fragment>
            ))}
        {(!sortedAccounts || sortedAccounts.length === 0) && (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            No accounts found
          </div>
        )}
      </SelectContent>
    </Select>
  );
}

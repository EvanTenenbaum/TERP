import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
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
import { Plus, Building2, DollarSign } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";

// BUG-034: Define proper type for bank account
type BankAccount = {
  id: number;
  accountName: string;
  accountNumber: string;
  accountType: string;
  bankName: string;
  currentBalance: string;
  isActive: boolean;
};

export default function BankAccounts({
  embedded,
}: { embedded?: boolean } = {}) {
  // Fetch bank accounts
  const { data: accounts, isLoading } =
    trpc.accounting.bankAccounts.list.useQuery({});
  const { data: totalCash } =
    trpc.accounting.bankAccounts.getTotalCashBalance.useQuery();

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const getAccountTypeBadge = (type: string) => {
    const colors: Record<string, string> = {
      CHECKING: "bg-blue-100 text-blue-700 border-blue-200",
      SAVINGS: "bg-green-100 text-green-700 border-green-200",
      CREDIT_CARD: "bg-purple-100 text-purple-700 border-purple-200",
      MONEY_MARKET: "bg-orange-100 text-orange-700 border-orange-200",
      OTHER: "bg-gray-100 text-gray-700 border-gray-200",
    };

    return (
      <Badge variant="outline" className={colors[type] || colors.OTHER}>
        {type.replace("_", " ")}
      </Badge>
    );
  };

  // BUG-034: Extract from paginated response
  const accountList = accounts?.items ?? [];
  const activeAccounts = accountList.filter(
    (a: BankAccount) => a.isActive
  ).length;

  return (
    <div className="flex flex-col gap-6 p-6">
      {!embedded && <BackButton label="Back to Accounting" to="/accounting" />}
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Bank Accounts
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage bank accounts and cash balances
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Account
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Accounts
            </CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{accountList.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Accounts
            </CardTitle>
            <Building2 className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAccounts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Cash Balance
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalCash || 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Bank Accounts</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading accounts...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Name</TableHead>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Bank Name</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accountList.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No bank accounts found
                    </TableCell>
                  </TableRow>
                ) : (
                  accountList.map((account: BankAccount) => (
                    <TableRow key={account.id}>
                      <TableCell className="font-medium">
                        {account.accountName}
                      </TableCell>
                      <TableCell className="font-mono">
                        {account.accountNumber}
                      </TableCell>
                      <TableCell>
                        {getAccountTypeBadge(account.accountType)}
                      </TableCell>
                      <TableCell>{account.bankName}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(account.currentBalance)}
                      </TableCell>
                      <TableCell>
                        {account.isActive ? (
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-700 border-green-200"
                          >
                            Active
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-gray-100 text-gray-700 border-gray-200"
                          >
                            Inactive
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

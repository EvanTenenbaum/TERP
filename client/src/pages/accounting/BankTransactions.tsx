import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  Plus,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle,
  type LucideIcon,
} from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { format } from "date-fns";

// BUG-034: Define proper type for bank transaction
type BankTransaction = {
  id: number;
  transactionDate: Date | string;
  transactionType: string;
  description: string | null;
  referenceNumber: string | null;
  amount: string;
  isReconciled: boolean;
};

export default function BankTransactions() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<string>("ALL");
  const [selectedReconciled, setSelectedReconciled] = useState<string>("ALL");

  // Fetch transactions
  const { data: transactions, isLoading } =
    trpc.accounting.bankTransactions.list.useQuery({
      transactionType:
        selectedType !== "ALL"
          ? (selectedType as "DEPOSIT" | "WITHDRAWAL" | "TRANSFER" | "FEE")
          : undefined,
      isReconciled:
        selectedReconciled === "YES"
          ? true
          : selectedReconciled === "NO"
            ? false
            : undefined,
    });

  // Filter transactions - BUG-034: Extract from standardized paginated response
  const filteredTransactions = useMemo(() => {
    // BUG-034: transactions is now a UnifiedPaginatedResponse with items array
    const txList = transactions?.items ?? [];

    if (!searchQuery) return txList;

    const query = searchQuery.toLowerCase();
    return txList.filter(
      (tx: BankTransaction) =>
        (tx.description && tx.description.toLowerCase().includes(query)) ||
        (tx.referenceNumber && tx.referenceNumber.toLowerCase().includes(query))
    );
  }, [transactions, searchQuery]);

  // Calculate totals
  const totalTransactions = filteredTransactions.length;
  const totalDeposits = filteredTransactions
    .filter((tx: BankTransaction) => tx.transactionType === "DEPOSIT")
    .reduce(
      (sum: number, tx: BankTransaction) => sum + parseFloat(tx.amount),
      0
    );
  const totalWithdrawals = filteredTransactions
    .filter((tx: BankTransaction) => tx.transactionType === "WITHDRAWAL")
    .reduce(
      (sum: number, tx: BankTransaction) => sum + parseFloat(tx.amount),
      0
    );

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const formatDate = (dateStr: Date | string) => {
    const date = typeof dateStr === "string" ? new Date(dateStr) : dateStr;
    return format(date, "MMM dd, yyyy");
  };

  const getTransactionTypeBadge = (type: string) => {
    const config: Record<
      string,
      { icon: LucideIcon; className: string; label: string }
    > = {
      DEPOSIT: {
        icon: ArrowDownCircle,
        className: "bg-green-100 text-green-700 border-green-200",
        label: "Deposit",
      },
      WITHDRAWAL: {
        icon: ArrowUpCircle,
        className: "bg-red-100 text-red-700 border-red-200",
        label: "Withdrawal",
      },
      TRANSFER: {
        icon: ArrowDownCircle,
        className: "bg-blue-100 text-blue-700 border-blue-200",
        label: "Transfer",
      },
      FEE: {
        icon: ArrowUpCircle,
        className: "bg-orange-100 text-orange-700 border-orange-200",
        label: "Fee",
      },
    };

    const { icon: Icon, className, label } = config[type] || config.DEPOSIT;

    return (
      <Badge variant="outline" className={className}>
        <Icon className="mr-1 h-3 w-3" />
        {label}
      </Badge>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <BackButton label="Back to Accounting" to="/accounting" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Bank Transactions
          </h1>
          <p className="text-muted-foreground mt-1">
            View and reconcile bank transactions
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          New Transaction
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Transactions
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTransactions}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Deposits
            </CardTitle>
            <ArrowDownCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalDeposits)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Withdrawals
            </CardTitle>
            <ArrowUpCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalWithdrawals)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search transactions..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Types</SelectItem>
                <SelectItem value="DEPOSIT">Deposit</SelectItem>
                <SelectItem value="WITHDRAWAL">Withdrawal</SelectItem>
                <SelectItem value="TRANSFER">Transfer</SelectItem>
                <SelectItem value="FEE">Fee</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={selectedReconciled}
              onValueChange={setSelectedReconciled}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="YES">Reconciled</SelectItem>
                <SelectItem value="NO">Unreconciled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Transactions Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading transactions...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reconciled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredTransactions.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No transactions found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredTransactions.map((tx: BankTransaction) => (
                    <TableRow key={tx.id}>
                      <TableCell>{formatDate(tx.transactionDate)}</TableCell>
                      <TableCell>
                        {getTransactionTypeBadge(tx.transactionType)}
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {tx.description || "-"}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {tx.referenceNumber || "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(tx.amount)}
                      </TableCell>
                      <TableCell>
                        {tx.isReconciled ? (
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-700 border-green-200"
                          >
                            <CheckCircle className="mr-1 h-3 w-3" />
                            Yes
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-gray-100 text-gray-700 border-gray-200"
                          >
                            No
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

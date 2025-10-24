import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, Plus, BookOpen, CalendarIcon, FileText } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { JournalEntryForm, AccountSelector, FiscalPeriodSelector } from "@/components/accounting";

type LedgerEntry = {
  id: number;
  entryNumber: string;
  entryDate: string;
  accountId: number;
  debitAmount: string;
  creditAmount: string;
  description: string;
  fiscalPeriodId: number;
  status: "DRAFT" | "POSTED" | "VOID";
  referenceType: string | null;
  referenceId: number | null;
  createdAt: string;
};

export default function GeneralLedger() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<number | undefined>();
  const [selectedPeriod, setSelectedPeriod] = useState<number | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  });
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [showTrialBalance, setShowTrialBalance] = useState(false);

  // Fetch ledger entries
  const { data: entries, isLoading, refetch } = trpc.accounting.ledger.list.useQuery({
    accountId: selectedAccount,
    fiscalPeriodId: selectedPeriod,
    // Note: API expects Date objects, not strings
    startDate: dateRange.from,
    endDate: dateRange.to,
  });

  // Fetch trial balance
  const { data: trialBalance } = trpc.accounting.ledger.getTrialBalance.useQuery(
    { fiscalPeriodId: selectedPeriod! },
    { enabled: showTrialBalance && !!selectedPeriod }
  );

  // Post journal entry mutation
  const postJournalEntry = trpc.accounting.ledger.postJournalEntry.useMutation({
    onSuccess: () => {
      toast.success("Journal entry posted successfully");
      setShowPostDialog(false);
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to post journal entry: ${error.message}`);
    },
  });

  // Filter entries by search query
  const filteredEntries = useMemo(() => {
    if (!entries) return [];

    // entries is an array, not a paginated response
    const entryList = Array.isArray(entries) ? entries : [];

    if (!searchQuery) return entryList;

    const query = searchQuery.toLowerCase();
    return entryList.filter(
      (entry: any) =>
        entry.entryNumber.toLowerCase().includes(query) ||
        (entry.description && entry.description.toLowerCase().includes(query))
    );
  }, [entries, searchQuery]);

  // Calculate summary statistics
  const totalDebits = useMemo(() => {
    if (!filteredEntries) return 0;
    return filteredEntries.reduce((sum: number, entry: LedgerEntry) => sum + parseFloat(entry.debitAmount), 0);
  }, [filteredEntries]);

  const totalCredits = useMemo(() => {
    if (!filteredEntries) return 0;
    return filteredEntries.reduce((sum: number, entry: LedgerEntry) => sum + parseFloat(entry.creditAmount), 0);
  }, [filteredEntries]);

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), "MMM dd, yyyy");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DRAFT":
        return <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">Draft</Badge>;
      case "POSTED":
        return <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">Posted</Badge>;
      case "VOID":
        return <Badge variant="outline" className="bg-red-100 text-red-700 border-red-200">Void</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">General Ledger</h1>
          <p className="text-muted-foreground mt-1">
            View and manage all journal entries and transactions
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowTrialBalance(!showTrialBalance)}
          >
            <FileText className="mr-2 h-4 w-4" />
            {showTrialBalance ? "Hide" : "Show"} Trial Balance
          </Button>
          <Button onClick={() => setShowPostDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Post Journal Entry
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Entries</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{filteredEntries.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Debits</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalDebits)}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCredits)}</div>
            {Math.abs(totalDebits - totalCredits) > 0.01 && (
              <p className="text-xs text-red-600 mt-1">
                Out of balance by {formatCurrency(Math.abs(totalDebits - totalCredits))}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search entries..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <AccountSelector
              value={selectedAccount}
              onChange={setSelectedAccount}
              placeholder="All Accounts"
            />
            <FiscalPeriodSelector
              value={selectedPeriod}
              onChange={setSelectedPeriod}
              placeholder="All Periods"
              showStatus={false}
            />
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="DRAFT">Draft</SelectItem>
                <SelectItem value="POSTED">Posted</SelectItem>
                <SelectItem value="VOID">Void</SelectItem>
              </SelectContent>
            </Select>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal",
                    !dateRange.from && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd")} -{" "}
                        {format(dateRange.to, "LLL dd, yyyy")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, yyyy")
                    )
                  ) : (
                    <span>Date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange.from}
                  selected={{ from: dateRange.from, to: dateRange.to }}
                  onSelect={(range) =>
                    setDateRange({ from: range?.from, to: range?.to })
                  }
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>
          </div>
        </CardContent>
      </Card>

      {/* Trial Balance */}
      {showTrialBalance && selectedPeriod && trialBalance && (
        <Card>
          <CardHeader>
            <CardTitle>Trial Balance</CardTitle>
            <CardDescription>
              Summary of all account balances for the selected fiscal period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Account Number</TableHead>
                  <TableHead>Account Name</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {trialBalance.map((item: any) => (
                  <TableRow key={item.accountId}>
                    <TableCell className="font-mono">{item.accountNumber}</TableCell>
                    <TableCell>{item.accountName}</TableCell>
                    <TableCell className="text-right font-mono">
                      {parseFloat(item.debitBalance) > 0 ? formatCurrency(item.debitBalance) : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {parseFloat(item.creditBalance) > 0 ? formatCurrency(item.creditBalance) : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(
                      trialBalance.reduce((sum: number, item: any) => sum + parseFloat(item.debitBalance), 0)
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(
                      trialBalance.reduce((sum: number, item: any) => sum + parseFloat(item.creditBalance), 0)
                    )}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Ledger Entries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ledger Entries</CardTitle>
          <CardDescription>
            All journal entries and transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading entries...</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entry Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Debit</TableHead>
                  <TableHead className="text-right">Credit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEntries.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No ledger entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry: LedgerEntry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono font-medium">
                        {entry.entryNumber}
                      </TableCell>
                      <TableCell>{formatDate(entry.entryDate)}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {entry.description}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(entry.debitAmount) > 0
                          ? formatCurrency(entry.debitAmount)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(entry.creditAmount) > 0
                          ? formatCurrency(entry.creditAmount)
                          : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.status)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Post Journal Entry Dialog */}
      <Dialog open={showPostDialog} onOpenChange={setShowPostDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Post Journal Entry</DialogTitle>
            <DialogDescription>
              Create a new double-entry journal entry
            </DialogDescription>
          </DialogHeader>
          <JournalEntryForm
            onSubmit={(data) => {
              postJournalEntry.mutate({
                entryDate: data.entryDate,
                debitAccountId: data.debitAccountId,
                creditAccountId: data.creditAccountId,
                amount: data.amount,
                description: data.description,
                fiscalPeriodId: data.fiscalPeriodId,
              });
            }}
            onCancel={() => setShowPostDialog(false)}
            isSubmitting={postJournalEntry.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}


import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FilterSortSearchPanel } from "@/components/ui/filter-sort-search-panel";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Plus, BookOpen, CalendarIcon, FileText } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  JournalEntryForm,
  AccountSelector,
  FiscalPeriodSelector,
} from "@/components/accounting";

type LedgerEntry = {
  id: number;
  entryNumber: string;
  entryDate: string | Date;
  accountId: number;
  debit: string;
  credit: string;
  description: string | null;
  fiscalPeriodId: number;
  isPosted: boolean;
  referenceType: string | null;
  referenceId: number | null;
  createdAt: string | Date;
};

// BUG-034: Type for trial balance items (matches API response)
type TrialBalanceItem = {
  accountId: number;
  accountNumber: string;
  accountName: string;
  accountType: string;
  totalDebit: number;
  totalCredit: number;
  balance: number;
};

type LedgerSortField = "entryDate" | "debit" | "credit" | "entryNumber";

const LEDGER_STATUS_OPTIONS = [
  { value: "POSTED", label: "Posted" },
  { value: "DRAFT", label: "Draft" },
];

const LEDGER_SORT_OPTIONS = [
  { value: "entryDate", label: "Entry Date" },
  { value: "debit", label: "Debit Amount" },
  { value: "credit", label: "Credit Amount" },
  { value: "entryNumber", label: "Entry Number" },
];

export default function GeneralLedger() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccount, setSelectedAccount] = useState<number | undefined>();
  const [selectedPeriod, setSelectedPeriod] = useState<number | undefined>();
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [sortField, setSortField] = useState<LedgerSortField>("entryDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [showPostDialog, setShowPostDialog] = useState(false);
  const [showTrialBalance, setShowTrialBalance] = useState(false);

  // Fetch ledger entries
  const {
    data: entries,
    isLoading,
    refetch,
  } = trpc.accounting.ledger.list.useQuery({
    accountId: selectedAccount,
    fiscalPeriodId: selectedPeriod,
    // Note: API expects Date objects, not strings
    startDate: dateRange.from,
    endDate: dateRange.to,
  });

  // Fetch trial balance - use safe default when selectedPeriod is undefined
  const { data: trialBalance } =
    trpc.accounting.ledger.getTrialBalance.useQuery(
      { fiscalPeriodId: selectedPeriod ?? 0 },
      { enabled: showTrialBalance && !!selectedPeriod }
    );

  // Post journal entry mutation
  const postJournalEntry = trpc.accounting.ledger.postJournalEntry.useMutation({
    onSuccess: () => {
      toast.success("Journal entry posted successfully");
      setShowPostDialog(false);
      refetch();
    },
    onError: error => {
      toast.error(`Failed to post journal entry: ${error.message}`);
    },
  });

  // Filter entries by search query - BUG-034: Extract from paginated response
  const filteredEntries = useMemo(() => {
    if (!entries) return [];

    // BUG-034: entries is now a UnifiedPaginatedResponse with items array
    const entryList = entries?.items ?? [];
    const normalizedQuery = searchQuery.trim().toLowerCase();

    const searched = normalizedQuery
      ? entryList.filter(
          (entry: LedgerEntry) =>
            entry.entryNumber.toLowerCase().includes(normalizedQuery) ||
            (entry.description &&
              entry.description.toLowerCase().includes(normalizedQuery))
        )
      : entryList;

    const statusFiltered =
      selectedStatus === "ALL"
        ? searched
        : searched.filter((entry: LedgerEntry) =>
            selectedStatus === "POSTED" ? entry.isPosted : !entry.isPosted
          );

    const directionMultiplier = sortDirection === "asc" ? 1 : -1;

    return [...statusFiltered].sort((a: LedgerEntry, b: LedgerEntry) => {
      let comparison = 0;

      if (sortField === "entryDate") {
        comparison =
          new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime();
      } else if (sortField === "debit") {
        comparison = parseFloat(a.debit) - parseFloat(b.debit);
      } else if (sortField === "credit") {
        comparison = parseFloat(a.credit) - parseFloat(b.credit);
      } else if (sortField === "entryNumber") {
        comparison = a.entryNumber.localeCompare(b.entryNumber);
      }

      if (comparison === 0) {
        comparison =
          new Date(a.entryDate).getTime() - new Date(b.entryDate).getTime();
      }

      return comparison * directionMultiplier;
    });
  }, [entries, searchQuery, selectedStatus, sortDirection, sortField]);

  // Calculate summary statistics - BUG-034: Use debit/credit field names
  const totalDebits = useMemo(() => {
    if (!filteredEntries) return 0;
    return filteredEntries.reduce(
      (sum: number, entry: LedgerEntry) => sum + parseFloat(entry.debit),
      0
    );
  }, [filteredEntries]);

  const totalCredits = useMemo(() => {
    if (!filteredEntries) return 0;
    return filteredEntries.reduce(
      (sum: number, entry: LedgerEntry) => sum + parseFloat(entry.credit),
      0
    );
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

  const handleClearAllFilters = () => {
    setSearchQuery("");
    setSelectedAccount(undefined);
    setSelectedPeriod(undefined);
    setSelectedStatus("ALL");
    setDateRange({ from: undefined, to: undefined });
    setSortField("entryDate");
    setSortDirection("desc");
  };

  // BUG-034: Updated to use isPosted boolean instead of status string
  const getStatusBadge = (isPosted: boolean) => {
    if (isPosted) {
      return (
        <Badge
          variant="outline"
          className="bg-green-100 text-green-700 border-green-200"
        >
          Posted
        </Badge>
      );
    }
    return (
      <Badge
        variant="outline"
        className="bg-gray-100 text-gray-700 border-gray-200"
      >
        Draft
      </Badge>
    );
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      <BackButton label="Back to Accounting" to="/accounting" />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            General Ledger
          </h1>
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
            <div className="text-2xl font-bold">
              {formatCurrency(totalDebits)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Credits</CardTitle>
            <BookOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalCredits)}
            </div>
            {Math.abs(totalDebits - totalCredits) > 0.01 && (
              <p className="text-xs text-red-600 mt-1">
                Out of balance by{" "}
                {formatCurrency(Math.abs(totalDebits - totalCredits))}
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <FilterSortSearchPanel
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search entries..."
        filters={[
          {
            id: "status",
            label: "Status",
            value: selectedStatus,
            options: LEDGER_STATUS_OPTIONS,
            onChange: setSelectedStatus,
            allValue: "ALL",
            allLabel: "All Statuses",
          },
        ]}
        sort={{
          field: sortField,
          fieldOptions: LEDGER_SORT_OPTIONS,
          onFieldChange: value => setSortField(value as LedgerSortField),
          direction: sortDirection,
          onDirectionChange: setSortDirection,
          directionLabels: {
            asc: "Lowest First",
            desc: "Highest First",
          },
        }}
        onClearAll={handleClearAllFilters}
        resultCount={filteredEntries.length}
        resultLabel={filteredEntries.length === 1 ? "entry" : "entries"}
      />

      <Card>
        <CardHeader>
          <CardTitle>Additional Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
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
                  onSelect={range =>
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
                {trialBalance.map((item: TrialBalanceItem) => (
                  <TableRow key={item.accountId}>
                    <TableCell className="font-mono">
                      {item.accountNumber}
                    </TableCell>
                    <TableCell>{item.accountName}</TableCell>
                    <TableCell className="text-right font-mono">
                      {item.totalDebit > 0
                        ? formatCurrency(item.totalDebit)
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {item.totalCredit > 0
                        ? formatCurrency(item.totalCredit)
                        : "-"}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow className="font-bold bg-muted/50">
                  <TableCell colSpan={2}>Total</TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(
                      trialBalance.reduce(
                        (sum: number, item: TrialBalanceItem) =>
                          sum + item.totalDebit,
                        0
                      )
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono">
                    {formatCurrency(
                      trialBalance.reduce(
                        (sum: number, item: TrialBalanceItem) =>
                          sum + item.totalCredit,
                        0
                      )
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
            <div className="text-center py-8 text-muted-foreground">
              Loading entries...
            </div>
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
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No ledger entries found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEntries.map((entry: LedgerEntry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="font-mono font-medium">
                        {entry.entryNumber}
                      </TableCell>
                      <TableCell>
                        {formatDate(String(entry.entryDate))}
                      </TableCell>
                      <TableCell className="max-w-md truncate">
                        {entry.description}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(entry.debit) > 0
                          ? formatCurrency(entry.debit)
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {parseFloat(entry.credit) > 0
                          ? formatCurrency(entry.credit)
                          : "-"}
                      </TableCell>
                      <TableCell>{getStatusBadge(entry.isPosted)}</TableCell>
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
            onSubmit={data => {
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

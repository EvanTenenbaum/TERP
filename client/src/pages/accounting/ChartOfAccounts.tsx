import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
  DialogFooter,
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Plus,
  Edit,
  DollarSign,
  ChevronRight,
  ChevronDown,
} from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { toast } from "sonner";
import { FilterSortSearchPanel } from "@/components/ui/filter-sort-search-panel";
import type { AccountType } from "@/components/accounting";

type Account = {
  id: number;
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  normalBalance: "DEBIT" | "CREDIT";
  parentAccountId: number | null;
  isActive: boolean;
  description: string | null;
};

type AccountSortField = "accountNumber" | "accountName" | "normalBalance";

/** Shape emitted by CreateAccountDialog / EditAccountDialog onSubmit */
type AccountFormData = {
  accountNumber: string;
  accountName: string;
  accountType: AccountType;
  normalBalance: "DEBIT" | "CREDIT";
  description?: string;
  parentAccountId?: number;
  isActive?: boolean;
};

export default function ChartOfAccounts({ embedded }: { embedded?: boolean } = {}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState<AccountType | "ALL">("ALL");
  const [sortField, setSortField] = useState<AccountSortField>("accountNumber");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [expandedTypes, setExpandedTypes] = useState<Set<AccountType>>(
    new Set<AccountType>(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"])
  );

  // Fetch accounts
  const {
    data: accounts,
    isLoading,
    refetch,
  } = trpc.accounting.accounts.list.useQuery({});

  const _utils = trpc.useUtils();

  // Create account mutation
  const createAccount = trpc.accounting.accounts.create.useMutation({
    onSuccess: () => {
      toast.success("Account created successfully");
      setShowCreateDialog(false);
      refetch();
    },
    onError: error => {
      toast.error(`Failed to create account: ${error.message}`);
    },
  });

  // Update account mutation
  const updateAccount = trpc.accounting.accounts.update.useMutation({
    onSuccess: () => {
      toast.success("Account updated successfully");
      setEditingAccount(null);
      refetch();
    },
    onError: error => {
      toast.error(`Failed to update account: ${error.message}`);
    },
  });

  // PERF-003: Extract items from paginated response
  const accountsList = useMemo(() => accounts?.items ?? [], [accounts]);

  // Filter and group accounts
  const groupedAccounts = useMemo(() => {
    if (!accountsList.length) return {};

    let filtered = accountsList;

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (acc: Account) =>
          acc.accountNumber.toLowerCase().includes(query) ||
          acc.accountName.toLowerCase().includes(query)
      );
    }

    // Apply type filter
    if (selectedType !== "ALL") {
      filtered = filtered.filter(
        (acc: Account) => acc.accountType === selectedType
      );
    }

    // Group by account type
    const grouped = filtered.reduce(
      (acc: Partial<Record<AccountType, Account[]>>, account: Account) => {
        const type = account.accountType;
        if (!acc[type]) {
          acc[type] = [];
        }
        (acc[type] as Account[]).push(account);
        return acc;
      },
      {} as Partial<Record<AccountType, Account[]>>
    );

    // Sort accounts within each group by account number
    Object.keys(grouped).forEach(type => {
      const accounts = grouped[type as AccountType];
      if (accounts) {
        accounts.sort((a: Account, b: Account) => {
          let comparison = 0;
          switch (sortField) {
            case "accountNumber":
              comparison = a.accountNumber.localeCompare(b.accountNumber);
              break;
            case "accountName":
              comparison = a.accountName.localeCompare(b.accountName);
              break;
            case "normalBalance":
              comparison = a.normalBalance.localeCompare(b.normalBalance);
              break;
          }
          return sortDirection === "asc" ? comparison : -comparison;
        });
      }
    });

    return grouped;
  }, [accountsList, searchQuery, selectedType, sortDirection, sortField]);

  const accountTypeLabels: Record<AccountType, string> = {
    ASSET: "Assets",
    LIABILITY: "Liabilities",
    EQUITY: "Equity",
    REVENUE: "Revenue",
    EXPENSE: "Expenses",
  };

  const accountTypeOrder: AccountType[] = [
    "ASSET",
    "LIABILITY",
    "EQUITY",
    "REVENUE",
    "EXPENSE",
  ];

  const toggleTypeExpansion = (type: AccountType) => {
    setExpandedTypes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(type)) {
        newSet.delete(type);
      } else {
        newSet.add(type);
      }
      return newSet;
    });
  };

  const getTypeColor = (type: AccountType) => {
    switch (type) {
      case "ASSET":
        return "bg-green-100 text-green-700 border-green-200";
      case "LIABILITY":
        return "bg-red-100 text-red-700 border-red-200";
      case "EQUITY":
        return "bg-blue-100 text-blue-700 border-blue-200";
      case "REVENUE":
        return "bg-purple-100 text-purple-700 border-purple-200";
      case "EXPENSE":
        return "bg-orange-100 text-orange-700 border-orange-200";
    }
  };

  // PERF-003: Use pagination total or items length
  const totalAccounts = accounts?.pagination?.total ?? accountsList.length;
  const activeAccounts = accountsList.filter(
    (acc: Account) => acc.isActive
  ).length;

  const visibleAccounts = Object.values(groupedAccounts).reduce(
    (sum, accountsByType) => sum + (accountsByType?.length ?? 0),
    0
  );

  const handleClearAllFilters = () => {
    setSearchQuery("");
    setSelectedType("ALL");
    setSortField("accountNumber");
    setSortDirection("asc");
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {!embedded && <BackButton label="Back to Accounting" to="/accounting" />}
      {/* Header - mobile optimized */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Chart of Accounts
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            Manage your account structure and classifications
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className="w-full sm:w-auto"
        >
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
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAccounts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Active Accounts
            </CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeAccounts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Account Types</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Object.keys(groupedAccounts).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <FilterSortSearchPanel
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        searchPlaceholder="Search accounts..."
        filters={[
          {
            id: "accountType",
            label: "Type",
            value: selectedType,
            onChange: value => setSelectedType(value as AccountType | "ALL"),
            allValue: "ALL",
            allLabel: "All Types",
            options: [
              { value: "ASSET", label: "Assets" },
              { value: "LIABILITY", label: "Liabilities" },
              { value: "EQUITY", label: "Equity" },
              { value: "REVENUE", label: "Revenue" },
              { value: "EXPENSE", label: "Expenses" },
            ],
          },
        ]}
        sort={{
          field: sortField,
          onFieldChange: value => setSortField(value as AccountSortField),
          fieldOptions: [
            { value: "accountNumber", label: "Account Number" },
            { value: "accountName", label: "Account Name" },
            { value: "normalBalance", label: "Normal Balance" },
          ],
          direction: sortDirection,
          onDirectionChange: setSortDirection,
          directionLabels: {
            asc: "Ascending",
            desc: "Descending",
          },
        }}
        resultCount={visibleAccounts}
        resultLabel={visibleAccounts === 1 ? "account" : "accounts"}
        onClearAll={handleClearAllFilters}
      />

      {/* Accounts Table */}
      <Card>
        <CardHeader>
          <CardTitle>Accounts</CardTitle>
          <CardDescription>
            Hierarchical view of all accounts grouped by type
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading accounts...
            </div>
          ) : (
            <div className="space-y-4">
              {accountTypeOrder.map(type => {
                const typeAccounts = groupedAccounts[type] || [];
                if (typeAccounts.length === 0) return null;

                const isExpanded = expandedTypes.has(type);

                return (
                  <div key={type} className="border rounded-lg overflow-hidden">
                    {/* Type Header */}
                    <button
                      onClick={() => toggleTypeExpansion(type)}
                      className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {isExpanded ? (
                          <ChevronDown className="h-5 w-5" />
                        ) : (
                          <ChevronRight className="h-5 w-5" />
                        )}
                        <span className="font-semibold text-lg">
                          {accountTypeLabels[type]}
                        </span>
                        <Badge variant="outline" className={getTypeColor(type)}>
                          {typeAccounts.length} accounts
                        </Badge>
                      </div>
                    </button>

                    {/* Accounts List - mobile optimized with horizontal scroll */}
                    {isExpanded && (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="whitespace-nowrap">
                                Account #
                              </TableHead>
                              <TableHead className="whitespace-nowrap">
                                Name
                              </TableHead>
                              <TableHead className="whitespace-nowrap hidden sm:table-cell">
                                Balance
                              </TableHead>
                              <TableHead className="whitespace-nowrap">
                                Status
                              </TableHead>
                              <TableHead className="text-right whitespace-nowrap">
                                Actions
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {typeAccounts.map((account: Account) => (
                              <TableRow key={account.id}>
                                <TableCell className="font-mono font-medium text-xs sm:text-sm">
                                  {account.accountNumber}
                                </TableCell>
                                <TableCell className="text-xs sm:text-sm max-w-[120px] sm:max-w-none truncate">
                                  {account.accountName}
                                </TableCell>
                                <TableCell className="hidden sm:table-cell">
                                  <Badge variant="outline" className="text-xs">
                                    {account.normalBalance}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Badge
                                    variant="outline"
                                    className={`text-xs ${
                                      account.isActive
                                        ? "bg-green-100 text-green-700 border-green-200"
                                        : "bg-gray-100 text-gray-700 border-gray-200"
                                    }`}
                                  >
                                    {account.isActive ? "Active" : "Inactive"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setEditingAccount(account)}
                                    className="h-8 w-8 p-0"
                                    aria-label={`Edit ${account.accountName}`}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </div>
                );
              })}

              {Object.keys(groupedAccounts).length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No accounts found matching your filters
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Account Dialog */}
      <CreateAccountDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={(data) => createAccount.mutate(data as AccountFormData)}
        isSubmitting={createAccount.isPending}
      />

      {/* Edit Account Dialog */}
      {editingAccount && (
        <EditAccountDialog
          account={editingAccount}
          open={!!editingAccount}
          onOpenChange={open => !open && setEditingAccount(null)}
          onSubmit={(data) =>
            updateAccount.mutate({ id: editingAccount.id, ...(data as AccountFormData) })
          }
          isSubmitting={updateAccount.isPending}
        />
      )}
    </div>
  );
}

// Create Account Dialog Component
function CreateAccountDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState({
    accountNumber: "",
    accountName: "",
    accountType: "ASSET" as AccountType,
    normalBalance: "DEBIT" as "DEBIT" | "CREDIT",
    description: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Account</DialogTitle>
            <DialogDescription>
              Add a new account to your chart of accounts
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                value={formData.accountNumber}
                onChange={e =>
                  setFormData({ ...formData, accountNumber: e.target.value })
                }
                placeholder="e.g., 1000"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                value={formData.accountName}
                onChange={e =>
                  setFormData({ ...formData, accountName: e.target.value })
                }
                placeholder="e.g., Cash"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="accountType">Account Type</Label>
              <Select
                value={formData.accountType}
                onValueChange={value =>
                  setFormData({
                    ...formData,
                    accountType: value as AccountType,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ASSET">Asset</SelectItem>
                  <SelectItem value="LIABILITY">Liability</SelectItem>
                  <SelectItem value="EQUITY">Equity</SelectItem>
                  <SelectItem value="REVENUE">Revenue</SelectItem>
                  <SelectItem value="EXPENSE">Expense</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="normalBalance">Normal Balance</Label>
              <Select
                value={formData.normalBalance}
                onValueChange={value =>
                  setFormData({
                    ...formData,
                    normalBalance: value as "DEBIT" | "CREDIT",
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEBIT">Debit</SelectItem>
                  <SelectItem value="CREDIT">Credit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter account description..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Account Dialog Component
function EditAccountDialog({
  account,
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: {
  account: Account;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: Record<string, unknown>) => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState({
    accountName: account.accountName,
    description: account.description || "",
    isActive: account.isActive,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Edit Account</DialogTitle>
            <DialogDescription>
              Update account details for {account.accountNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="accountName">Account Name</Label>
              <Input
                id="accountName"
                value={formData.accountName}
                onChange={e =>
                  setFormData({ ...formData, accountName: e.target.value })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Enter account description..."
                rows={3}
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={e =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
                className="h-4 w-4"
              />
              <Label htmlFor="isActive" className="cursor-pointer">
                Active
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update Account"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

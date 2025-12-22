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
import { Search, Plus, Receipt, DollarSign, AlertCircle } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { format } from "date-fns";

// BUG-034: Define proper types for expenses
type Expense = {
  id: number;
  expenseNumber: string;
  expenseDate: Date | string;
  description: string | null;
  amount: string;
  isReimbursable: boolean;
  isReimbursed: boolean;
};

type ExpenseCategory = {
  id: number;
  categoryName: string;
};

type ExpenseBreakdown = {
  categoryId: number;
  categoryName: string;
  totalAmount: number;
  expenseCount: number;
};

export default function Expenses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    number | undefined
  >();
  const [showReimbursable, setShowReimbursable] = useState(false);

  // Fetch expenses
  const { data: expenses, isLoading } = trpc.accounting.expenses.list.useQuery({
    categoryId: selectedCategory,
  });

  // Fetch categories
  const { data: categories } = trpc.accounting.expenseCategories.list.useQuery(
    {}
  );

  // Fetch pending reimbursements
  const { data: pendingReimbursements } =
    trpc.accounting.expenses.getPendingReimbursements.useQuery(undefined, {
      enabled: showReimbursable,
    });

  // Fetch expense breakdown
  const { data: breakdown } =
    trpc.accounting.expenses.getBreakdownByCategory.useQuery({});

  // Filter expenses - BUG-034: Extract from standardized paginated response
  const filteredExpenses = useMemo(() => {
    // BUG-034: expenses is now a UnifiedPaginatedResponse with items array
    const expenseList = expenses?.items ?? [];

    if (!searchQuery) return expenseList;

    const query = searchQuery.toLowerCase();
    return expenseList.filter(
      (exp: Expense) =>
        (exp.expenseNumber &&
          exp.expenseNumber.toLowerCase().includes(query)) ||
        (exp.description && exp.description.toLowerCase().includes(query))
    );
  }, [expenses, searchQuery]);

  // Calculate totals
  const totalExpenses = filteredExpenses.length;
  const totalAmount = filteredExpenses.reduce(
    (sum: number, exp: Expense) => sum + parseFloat(exp.amount),
    0
  );
  const reimbursableExpenses = filteredExpenses.filter(
    (exp: Expense) => exp.isReimbursable && !exp.isReimbursed
  ).length;

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

  // BUG-034: Extract from paginated response
  const categoryList = categories?.items ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <BackButton label="Back to Accounting" to="/accounting" />
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Expenses
          </h1>
          <p className="text-muted-foreground mt-1">
            Track and manage business expenses
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setShowReimbursable(!showReimbursable)}
          >
            {showReimbursable ? "Hide" : "Show"} Pending Reimbursements
          </Button>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            New Expense
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalExpenses}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(totalAmount)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Reimbursements
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {reimbursableExpenses}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expense Breakdown by Category */}
      {breakdown && Array.isArray(breakdown) && breakdown.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Expense Breakdown by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {breakdown.map((item: ExpenseBreakdown) => (
                <div
                  key={item.categoryId}
                  className="flex items-center justify-between p-3 border rounded-lg"
                >
                  <span className="text-sm font-medium">
                    {item.categoryName}
                  </span>
                  <span className="text-sm font-mono">
                    {formatCurrency(item.totalAmount)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Reimbursements */}
      {showReimbursable &&
        pendingReimbursements &&
        Array.isArray(pendingReimbursements) && (
          <Card>
            <CardHeader>
              <CardTitle>Pending Reimbursements</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Expense #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingReimbursements.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center py-4 text-muted-foreground"
                      >
                        No pending reimbursements
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingReimbursements.map((exp: Expense) => (
                      <TableRow key={exp.id}>
                        <TableCell className="font-mono">
                          {exp.expenseNumber}
                        </TableCell>
                        <TableCell>{formatDate(exp.expenseDate)}</TableCell>
                        <TableCell>{exp.description}</TableCell>
                        <TableCell className="text-right font-mono">
                          {formatCurrency(exp.amount)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

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
                  placeholder="Search expenses..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
            <Select
              value={selectedCategory?.toString() || "ALL"}
              onValueChange={val =>
                setSelectedCategory(val === "ALL" ? undefined : parseInt(val))
              }
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Categories</SelectItem>
                {categoryList.map((cat: ExpenseCategory) => (
                  <SelectItem key={cat.id} value={cat.id.toString()}>
                    {cat.categoryName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading expenses...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Expense #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Reimbursable</TableHead>
                  <TableHead>Reimbursed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No expenses found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredExpenses.map((expense: Expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-mono font-medium">
                        {expense.expenseNumber}
                      </TableCell>
                      <TableCell>{formatDate(expense.expenseDate)}</TableCell>
                      <TableCell className="max-w-md truncate">
                        {expense.description}
                      </TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(expense.amount)}
                      </TableCell>
                      <TableCell>
                        {expense.isReimbursable ? (
                          <Badge
                            variant="outline"
                            className="bg-blue-100 text-blue-700 border-blue-200"
                          >
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
                      <TableCell>
                        {expense.isReimbursed ? (
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-700 border-green-200"
                          >
                            Yes
                          </Badge>
                        ) : expense.isReimbursable ? (
                          <Badge
                            variant="outline"
                            className="bg-orange-100 text-orange-700 border-orange-200"
                          >
                            Pending
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-gray-100 text-gray-700 border-gray-200"
                          >
                            N/A
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

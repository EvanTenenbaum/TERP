import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { AddClientWizard } from "@/components/clients/AddClientWizard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Filter, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { DataCardSection } from "@/components/data-cards";

export default function ClientsListPage() {
  const [, setLocation] = useLocation();
  const [addClientOpen, setAddClientOpen] = useState(false);
  
  // Filters and search state
  const [search, setSearch] = useState("");
  const [clientTypes, setClientTypes] = useState<("buyer" | "seller" | "brand" | "referee" | "contractor")[]>([]);
  const [hasDebt, setHasDebt] = useState<boolean | undefined>(undefined);
  const [page, setPage] = useState(0);
  const limit = 50;

  // Fetch clients
  const { data: clients, isLoading } = trpc.clients.list.useQuery({
    limit,
    offset: page * limit,
    search: search || undefined,
    clientTypes: clientTypes.length > 0 ? clientTypes : undefined,
    hasDebt,
  });

  // Fetch total count for pagination
  const { data: totalCount } = trpc.clients.count.useQuery({
    search: search || undefined,
    clientTypes: clientTypes.length > 0 ? clientTypes : undefined,
    hasDebt,
  });

  const totalPages = Math.ceil((totalCount || 0) / limit);

  // Toggle client type filter
  const toggleClientType = (type: "buyer" | "seller" | "brand" | "referee" | "contractor") => {
    setClientTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
    setPage(0); // Reset to first page
  };

  // Toggle debt filter
  const toggleDebtFilter = (value: boolean | undefined) => {
    setHasDebt(value);
    setPage(0);
  };

  // Get client type badges
  const getClientTypeBadges = (client: any) => {
    const badges: { label: string; variant: "default" | "secondary" | "outline" | "destructive" }[] = [];
    if (client.isBuyer) badges.push({ label: "Buyer", variant: "default" });
    if (client.isSeller) badges.push({ label: "Seller", variant: "secondary" });
    if (client.isBrand) badges.push({ label: "Brand", variant: "outline" });
    if (client.isReferee) badges.push({ label: "Referee", variant: "secondary" });
    if (client.isContractor) badges.push({ label: "Contractor", variant: "outline" });
    return badges;
  };

  // Format currency
  const formatCurrency = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  // Format percentage
  const formatPercentage = (value: string | number) => {
    const num = typeof value === "string" ? parseFloat(value) : value;
    return `${num.toFixed(2)}%`;
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Client Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage all clients, track transactions, and monitor debt
          </p>
        </div>
        <Button onClick={() => setAddClientOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Client
        </Button>
      </div>

      {/* Client Statistics */}
      <DataCardSection moduleId="clients" />

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filters</CardTitle>
          <CardDescription>Find clients by TERI code, type, or debt status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by TERI code..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                className="pl-9"
              />
            </div>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            {/* Client Type Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Client Types
                  {clientTypes.length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {clientTypes.length}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Filter by Type</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={clientTypes.includes("buyer")}
                  onCheckedChange={() => toggleClientType("buyer")}
                >
                  Buyer
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={clientTypes.includes("seller")}
                  onCheckedChange={() => toggleClientType("seller")}
                >
                  Seller
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={clientTypes.includes("brand")}
                  onCheckedChange={() => toggleClientType("brand")}
                >
                  Brand
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={clientTypes.includes("referee")}
                  onCheckedChange={() => toggleClientType("referee")}
                >
                  Referee
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={clientTypes.includes("contractor")}
                  onCheckedChange={() => toggleClientType("contractor")}
                >
                  Contractor
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Debt Filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Debt Status
                  {hasDebt !== undefined && <Badge variant="secondary" className="ml-2">1</Badge>}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48">
                <DropdownMenuLabel>Filter by Debt</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={hasDebt === undefined}
                  onCheckedChange={() => toggleDebtFilter(undefined)}
                >
                  All Clients
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={hasDebt === true}
                  onCheckedChange={() => toggleDebtFilter(true)}
                >
                  Has Debt
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={hasDebt === false}
                  onCheckedChange={() => toggleDebtFilter(false)}
                >
                  No Debt
                </DropdownMenuCheckboxItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Clear Filters */}
            {(clientTypes.length > 0 || hasDebt !== undefined || search) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setClientTypes([]);
                  setHasDebt(undefined);
                  setSearch("");
                  setPage(0);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clients ({totalCount || 0})</CardTitle>
          <CardDescription>
            Showing {page * limit + 1}-{Math.min((page + 1) * limit, totalCount || 0)} of {totalCount || 0}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading clients...</div>
          ) : !clients || clients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-lg font-medium">No clients found</p>
              <p className="text-sm mt-2">Try adjusting your filters or add a new client</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>TERI Code</TableHead>
                    <TableHead>Client Types</TableHead>
                    <TableHead className="text-right">Total Spent</TableHead>
                    <TableHead className="text-right">Total Profit</TableHead>
                    <TableHead className="text-right">Avg Margin</TableHead>
                    <TableHead className="text-right">Amount Owed</TableHead>
                    <TableHead className="text-right">Oldest Debt</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client: any) => (
                    <TableRow
                      key={client.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setLocation(`/clients/${client.id}`)}
                    >
                      <TableCell className="font-medium">{client.teriCode}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {getClientTypeBadges(client).map((badge, idx) => (
                            <Badge key={idx} variant={badge.variant}>
                              {badge.label}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(client.totalSpent || 0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(client.totalProfit || 0)}</TableCell>
                      <TableCell className="text-right">{formatPercentage(client.avgProfitMargin || 0)}</TableCell>
                      <TableCell className="text-right">
                        <span className={client.totalOwed && parseFloat(client.totalOwed as string) > 0 ? "text-destructive font-medium" : ""}>
                          {formatCurrency(client.totalOwed || 0)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        {client.oldestDebtDays && client.oldestDebtDays > 0 ? (
                          <span className="text-destructive font-medium">{client.oldestDebtDays}d</span>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {client.tags && Array.isArray(client.tags) && client.tags.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {(client.tags as string[]).slice(0, 2).map((tag, idx) => (
                              <Badge key={idx} variant="outline">
                                {tag}
                              </Badge>
                            ))}
                            {(client.tags as string[]).length > 2 && (
                              <Badge variant="outline">+{(client.tags as string[]).length - 2}</Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setLocation(`/clients/${client.id}`);
                          }}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Page {page + 1} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Client Wizard */}
      <AddClientWizard
        open={addClientOpen}
        onOpenChange={setAddClientOpen}
        onSuccess={(clientId) => {
          // Navigate to client profile
          setLocation(`/clients/${clientId}`);
        }}
      />
    </div>
  );
}
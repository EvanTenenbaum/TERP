/**
 * Cash Locations Page (MEET-002-FE, MEET-003-FE, MEET-004-FE)
 * Multi-location cash management with ledger and shift tracking
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Skeleton, StatsSkeleton, TableSkeleton } from "@/components/ui/skeleton";
import { BackButton } from "@/components/common/BackButton";
import {
  Plus,
  Edit2,
  ArrowLeftRight,
  DollarSign,
  MapPin,
  Download,
  Clock,
  AlertTriangle,
  CheckCircle2,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  CalendarDays,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Types
type CashLocation = {
  id: number;
  name: string;
  currentBalance: number;
  isActive: boolean;
  createdAt: Date | null;
  updatedAt: Date | null;
};

type Transaction = {
  id: number;
  locationId: number;
  transactionType: string;
  amount: number;
  description: string | null;
  referenceType: string | null;
  referenceId: number | null;
  transferToLocationId: number | null;
  transferFromLocationId: number | null;
  createdByName: string | null;
  createdAt: Date | null;
};

type Shift = {
  id: number;
  locationId: number;
  shiftStart: Date | null;
  shiftEnd: Date | null;
  startingBalance: number;
  expectedBalance: number;
  actualCount: number;
  variance: number;
  status: string;
  notes: string | null;
  resetByName: string | null;
  resetAt: Date | null;
};

// Format currency helper
function formatCurrency(amount: number | string): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(num);
}

// Format date helper
function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// Format datetime helper
function formatDateTime(date: Date | string | null): string {
  if (!date) return "-";
  return new Date(date).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function CashLocations() {
  const utils = trpc.useUtils();

  // State
  const [selectedLocation, setSelectedLocation] = useState<CashLocation | null>(null);
  const [activeTab, setActiveTab] = useState<string>("locations");

  // Dialog states
  const [showAddLocationDialog, setShowAddLocationDialog] = useState(false);
  const [showEditLocationDialog, setShowEditLocationDialog] = useState(false);
  const [showTransferDialog, setShowTransferDialog] = useState(false);
  const [showAddTransactionDialog, setShowAddTransactionDialog] = useState(false);
  const [showCloseShiftDialog, setShowCloseShiftDialog] = useState(false);

  // Form states
  const [newLocationName, setNewLocationName] = useState("");
  const [newLocationBalance, setNewLocationBalance] = useState("");
  const [editLocationName, setEditLocationName] = useState("");
  const [editLocationActive, setEditLocationActive] = useState(true);
  const [transferFrom, setTransferFrom] = useState<string>("");
  const [transferTo, setTransferTo] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferNotes, setTransferNotes] = useState("");
  const [transactionType, setTransactionType] = useState<"IN" | "OUT">("IN");
  const [transactionAmount, setTransactionAmount] = useState("");
  const [transactionDescription, setTransactionDescription] = useState("");
  const [actualCashCount, setActualCashCount] = useState("");
  const [closeShiftNotes, setCloseShiftNotes] = useState("");
  const [dateFilter, setDateFilter] = useState<{ start?: Date; end?: Date }>({});
  const [typeFilter, setTypeFilter] = useState<string>("");

  // Queries
  const { data: locationsData, isLoading: locationsLoading } = trpc.cashAudit.listLocations.useQuery({
    includeInactive: true,
    limit: 100,
    offset: 0,
  });

  const locations = locationsData?.items ?? [];
  const activeLocations = locations.filter((l: CashLocation) => l.isActive);

  // Ledger query (only when location is selected and on ledger tab)
  const { data: ledgerData, isLoading: ledgerLoading } = trpc.cashAudit.getLocationLedger.useQuery(
    {
      locationId: selectedLocation?.id ?? 0,
      startDate: dateFilter.start,
      endDate: dateFilter.end,
      transactionType: typeFilter as "IN" | "OUT" | "TRANSFER" | undefined || undefined,
      limit: 100,
      offset: 0,
    },
    {
      enabled: !!selectedLocation && activeTab === "ledger",
    }
  );

  // Shift payments query (only when location is selected and on shift tab)
  const { data: shiftData, isLoading: shiftLoading } = trpc.cashAudit.getShiftPayments.useQuery(
    {
      locationId: selectedLocation?.id ?? 0,
    },
    {
      enabled: !!selectedLocation && activeTab === "shift",
    }
  );

  // Shift history query
  const { data: shiftHistoryData, isLoading: shiftHistoryLoading } = trpc.cashAudit.getShiftHistory.useQuery(
    {
      locationId: selectedLocation?.id ?? 0,
      limit: 20,
      offset: 0,
    },
    {
      enabled: !!selectedLocation && activeTab === "shift",
    }
  );

  // Mutations
  const createLocationMutation = trpc.cashAudit.createLocation.useMutation({
    onSuccess: () => {
      toast.success("Location created successfully");
      setShowAddLocationDialog(false);
      setNewLocationName("");
      setNewLocationBalance("");
      utils.cashAudit.listLocations.invalidate();
      utils.cashAudit.getCashDashboard.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to create location: ${error.message}`);
    },
  });

  const updateLocationMutation = trpc.cashAudit.updateLocation.useMutation({
    onSuccess: () => {
      toast.success("Location updated successfully");
      setShowEditLocationDialog(false);
      setSelectedLocation(null);
      utils.cashAudit.listLocations.invalidate();
      utils.cashAudit.getCashDashboard.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to update location: ${error.message}`);
    },
  });

  const transferMutation = trpc.cashAudit.transferBetweenLocations.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Transferred ${formatCurrency(data.amount)} from ${data.fromLocation.name} to ${data.toLocation.name}`
      );
      setShowTransferDialog(false);
      setTransferFrom("");
      setTransferTo("");
      setTransferAmount("");
      setTransferNotes("");
      utils.cashAudit.listLocations.invalidate();
      utils.cashAudit.getLocationLedger.invalidate();
      utils.cashAudit.getCashDashboard.invalidate();
    },
    onError: (error) => {
      toast.error(`Transfer failed: ${error.message}`);
    },
  });

  const recordTransactionMutation = trpc.cashAudit.recordTransaction.useMutation({
    onSuccess: (data) => {
      toast.success(
        `${data.transactionType === "IN" ? "Received" : "Paid out"} ${formatCurrency(data.amount)}`
      );
      setShowAddTransactionDialog(false);
      setTransactionAmount("");
      setTransactionDescription("");
      setTransactionType("IN");
      utils.cashAudit.listLocations.invalidate();
      utils.cashAudit.getLocationLedger.invalidate();
      utils.cashAudit.getShiftPayments.invalidate();
      utils.cashAudit.getCashDashboard.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to record transaction: ${error.message}`);
    },
  });

  const resetShiftMutation = trpc.cashAudit.resetShift.useMutation({
    onSuccess: (data) => {
      if (data.isCleanAudit) {
        toast.success("Shift closed successfully - No variance");
      } else {
        const varianceType = data.variance > 0 ? "over" : "short";
        toast.warning(
          `Shift closed with ${formatCurrency(Math.abs(data.variance))} ${varianceType}`
        );
      }
      setShowCloseShiftDialog(false);
      setActualCashCount("");
      setCloseShiftNotes("");
      utils.cashAudit.listLocations.invalidate();
      utils.cashAudit.getShiftPayments.invalidate();
      utils.cashAudit.getShiftHistory.invalidate();
      utils.cashAudit.getCashDashboard.invalidate();
    },
    onError: (error) => {
      toast.error(`Failed to close shift: ${error.message}`);
    },
  });

  // Export handler
  const handleExport = async () => {
    if (!selectedLocation) return;

    try {
      const exportData = await utils.cashAudit.exportLedger.fetch({
        locationId: selectedLocation.id,
        startDate: dateFilter.start,
        endDate: dateFilter.end,
        transactionType: typeFilter as "IN" | "OUT" | "TRANSFER" | undefined || undefined,
      });

      // Create and download CSV
      const blob = new Blob([exportData.csv], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = exportData.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      toast.success(`Exported ${exportData.summary.transactionCount} transactions`);
    } catch (error) {
      toast.error("Failed to export ledger");
    }
  };

  // Handlers
  const handleCreateLocation = () => {
    if (!newLocationName.trim()) {
      toast.error("Location name is required");
      return;
    }
    createLocationMutation.mutate({
      name: newLocationName.trim(),
      initialBalance: parseFloat(newLocationBalance) || 0,
    });
  };

  const handleUpdateLocation = () => {
    if (!selectedLocation || !editLocationName.trim()) return;
    updateLocationMutation.mutate({
      locationId: selectedLocation.id,
      name: editLocationName.trim(),
      isActive: editLocationActive,
    });
  };

  const handleTransfer = () => {
    if (!transferFrom || !transferTo || !transferAmount) {
      toast.error("Please fill in all transfer fields");
      return;
    }
    if (transferFrom === transferTo) {
      toast.error("Source and destination must be different");
      return;
    }
    transferMutation.mutate({
      fromLocationId: parseInt(transferFrom),
      toLocationId: parseInt(transferTo),
      amount: parseFloat(transferAmount),
      description: transferNotes || undefined,
    });
  };

  const handleRecordTransaction = () => {
    if (!selectedLocation || !transactionAmount || !transactionDescription.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    recordTransactionMutation.mutate({
      locationId: selectedLocation.id,
      transactionType: transactionType,
      amount: parseFloat(transactionAmount),
      description: transactionDescription.trim(),
    });
  };

  const handleCloseShift = () => {
    if (!selectedLocation || !actualCashCount) {
      toast.error("Please enter the actual cash count");
      return;
    }
    resetShiftMutation.mutate({
      locationId: selectedLocation.id,
      actualCashCount: parseFloat(actualCashCount),
      notes: closeShiftNotes || undefined,
    });
  };

  const openEditDialog = (location: CashLocation) => {
    setSelectedLocation(location);
    setEditLocationName(location.name);
    setEditLocationActive(location.isActive);
    setShowEditLocationDialog(true);
  };

  const selectLocation = (location: CashLocation) => {
    setSelectedLocation(location);
    setActiveTab("ledger");
  };

  // Summary stats
  const totalBalance = locations.reduce(
    (sum: number, loc: CashLocation) => sum + (loc.isActive ? loc.currentBalance : 0),
    0
  );

  return (
    <div className="flex flex-col gap-6 p-6">
      <BackButton label="Back to Accounting" to="/accounting" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Cash Locations
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage cash locations, track transactions, and reconcile shifts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowTransferDialog(true)}
            disabled={activeLocations.length < 2}
          >
            <ArrowLeftRight className="mr-2 h-4 w-4" />
            Transfer
          </Button>
          <Button onClick={() => setShowAddLocationDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Location
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      {locationsLoading ? (
        <StatsSkeleton count={3} />
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Locations</CardTitle>
              <MapPin className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{locations.length}</div>
              <p className="text-xs text-muted-foreground">
                {activeLocations.length} active
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Cash Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono">
                {formatCurrency(totalBalance)}
              </div>
              <p className="text-xs text-muted-foreground">
                Across all active locations
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {selectedLocation ? selectedLocation.name : "Select Location"}
              </CardTitle>
              <DollarSign className="h-4 w-4 text-primary" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-mono text-primary">
                {selectedLocation
                  ? formatCurrency(selectedLocation.currentBalance)
                  : "-"}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedLocation ? "Current balance" : "Click a location to view details"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="ledger" disabled={!selectedLocation}>
            Ledger
          </TabsTrigger>
          <TabsTrigger value="shift" disabled={!selectedLocation}>
            Shift
          </TabsTrigger>
        </TabsList>

        {/* Locations Tab */}
        <TabsContent value="locations">
          <Card>
            <CardHeader>
              <CardTitle>All Cash Locations</CardTitle>
              <CardDescription>
                Click a location to view ledger and shift details
              </CardDescription>
            </CardHeader>
            <CardContent>
              {locationsLoading ? (
                <TableSkeleton rows={5} columns={5} />
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Current Balance</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {locations.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No cash locations found. Create your first location to get started.
                        </TableCell>
                      </TableRow>
                    ) : (
                      locations.map((location: CashLocation) => (
                        <TableRow
                          key={location.id}
                          className={cn(
                            "cursor-pointer hover:bg-muted/50",
                            selectedLocation?.id === location.id && "bg-muted"
                          )}
                          onClick={() => selectLocation(location)}
                        >
                          <TableCell className="font-medium">{location.name}</TableCell>
                          <TableCell className="text-right font-mono">
                            {formatCurrency(location.currentBalance)}
                          </TableCell>
                          <TableCell>
                            {location.isActive ? (
                              <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-gray-100 text-gray-700 border-gray-200">
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>{formatDate(location.updatedAt)}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                openEditDialog(location);
                              }}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Ledger Tab */}
        <TabsContent value="ledger">
          {selectedLocation && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{selectedLocation.name} - Transaction Ledger</CardTitle>
                    <CardDescription>
                      View and manage transactions for this location
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExport}
                    >
                      <Download className="mr-2 h-4 w-4" />
                      Export CSV
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => setShowAddTransactionDialog(true)}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Transaction
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Type:</Label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[120px]">
                        <SelectValue placeholder="All" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All</SelectItem>
                        <SelectItem value="IN">In</SelectItem>
                        <SelectItem value="OUT">Out</SelectItem>
                        <SelectItem value="TRANSFER">Transfer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {ledgerData?.summary && (
                    <div className="flex items-center gap-4 ml-auto text-sm">
                      <span className="text-green-600">
                        In: {formatCurrency(ledgerData.summary.totalIn)}
                      </span>
                      <span className="text-red-600">
                        Out: {formatCurrency(ledgerData.summary.totalOut)}
                      </span>
                      <span className={ledgerData.summary.netChange >= 0 ? "text-green-600" : "text-red-600"}>
                        Net: {formatCurrency(ledgerData.summary.netChange)}
                      </span>
                    </div>
                  )}
                </div>

                {ledgerLoading ? (
                  <TableSkeleton rows={8} columns={7} />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead className="text-right">In</TableHead>
                        <TableHead className="text-right">Out</TableHead>
                        <TableHead className="text-right">Balance</TableHead>
                        <TableHead>By</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(ledgerData?.transactions?.items ?? []).length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            No transactions found
                          </TableCell>
                        </TableRow>
                      ) : (
                        (() => {
                          // Calculate running balance (transactions are in DESC order by date)
                          const transactions = ledgerData?.transactions?.items ?? [];
                          const currentBalance = selectedLocation?.currentBalance ?? 0;
                          let runningBalance = currentBalance;
                          const balances: number[] = [];

                          // First pass: calculate balances for each row
                          // Start from current balance and work backwards
                          for (let i = 0; i < transactions.length; i++) {
                            balances[i] = runningBalance;
                            const tx = transactions[i];
                            // Reverse the transaction to get previous balance
                            if (tx.transactionType === "IN") {
                              runningBalance -= tx.amount;
                            } else if (tx.transactionType === "OUT") {
                              runningBalance += tx.amount;
                            } else if (tx.transactionType === "TRANSFER") {
                              // Transfers: incoming if transferFromLocationId is set, outgoing if transferToLocationId is set
                              if (tx.transferFromLocationId) {
                                runningBalance -= tx.amount; // Incoming transfer
                              } else if (tx.transferToLocationId) {
                                runningBalance += tx.amount; // Outgoing transfer
                              }
                            }
                          }

                          return transactions.map((tx: Transaction, idx: number) => (
                            <TableRow key={tx.id}>
                              <TableCell>{formatDateTime(tx.createdAt)}</TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  {tx.transactionType === "IN" && (
                                    <ArrowDownLeft className="h-4 w-4 text-green-600" />
                                  )}
                                  {tx.transactionType === "OUT" && (
                                    <ArrowUpRight className="h-4 w-4 text-red-600" />
                                  )}
                                  {tx.transactionType === "TRANSFER" && (
                                    <ArrowLeftRight className="h-4 w-4 text-blue-600" />
                                  )}
                                  <span className="capitalize">{tx.transactionType.toLowerCase()}</span>
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[300px] truncate">
                                {tx.description || "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-green-600">
                                {tx.transactionType === "IN" || (tx.transactionType === "TRANSFER" && tx.transferFromLocationId)
                                  ? formatCurrency(tx.amount)
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono text-red-600">
                                {tx.transactionType === "OUT" || (tx.transactionType === "TRANSFER" && tx.transferToLocationId)
                                  ? formatCurrency(tx.amount)
                                  : "-"}
                              </TableCell>
                              <TableCell className="text-right font-mono font-medium">
                                {formatCurrency(balances[idx])}
                              </TableCell>
                              <TableCell>{tx.createdByName || "-"}</TableCell>
                            </TableRow>
                          ));
                        })()
                      )}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Shift Tab */}
        <TabsContent value="shift">
          {selectedLocation && (
            <div className="space-y-6">
              {/* Current Shift */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Clock className="h-5 w-5" />
                        Current Shift - {selectedLocation.name}
                      </CardTitle>
                      <CardDescription>
                        {shiftData
                          ? `Started ${formatDateTime(shiftData.shiftStart)}`
                          : "Loading shift data..."}
                      </CardDescription>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setShowCloseShiftDialog(true)}
                      disabled={!shiftData}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Close Shift
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {shiftLoading ? (
                    <StatsSkeleton count={4} />
                  ) : shiftData ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Starting Balance</p>
                        <p className="text-xl font-semibold font-mono">
                          {formatCurrency(shiftData.startingBalance)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Total Received</p>
                        <p className="text-xl font-semibold font-mono text-green-600">
                          +{formatCurrency(shiftData.totalReceived)}
                        </p>
                      </div>
                      <div className="rounded-lg border p-4">
                        <p className="text-sm text-muted-foreground">Total Paid Out</p>
                        <p className="text-xl font-semibold font-mono text-red-600">
                          -{formatCurrency(shiftData.totalPaidOut)}
                        </p>
                      </div>
                      <div className="rounded-lg border-2 border-primary p-4 bg-primary/5">
                        <p className="text-sm text-muted-foreground">Expected Balance</p>
                        <p className="text-xl font-bold font-mono text-primary">
                          {formatCurrency(shiftData.expectedBalance)}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">No active shift</p>
                  )}

                  {/* Recent shift transactions */}
                  {shiftData && shiftData.transactions.length > 0 && (
                    <div className="mt-6">
                      <h4 className="font-medium mb-3">Recent Shift Transactions</h4>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Description</TableHead>
                            <TableHead className="text-right">Amount</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {shiftData.transactions.slice(0, 5).map((tx: Transaction) => (
                            <TableRow key={tx.id}>
                              <TableCell>{formatDateTime(tx.createdAt)}</TableCell>
                              <TableCell>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    tx.transactionType === "IN"
                                      ? "bg-green-100 text-green-700 border-green-200"
                                      : tx.transactionType === "OUT"
                                      ? "bg-red-100 text-red-700 border-red-200"
                                      : "bg-blue-100 text-blue-700 border-blue-200"
                                  )}
                                >
                                  {tx.transactionType}
                                </Badge>
                              </TableCell>
                              <TableCell>{tx.description || "-"}</TableCell>
                              <TableCell
                                className={cn(
                                  "text-right font-mono",
                                  tx.transactionType === "IN" ? "text-green-600" : "text-red-600"
                                )}
                              >
                                {tx.transactionType === "IN" ? "+" : "-"}
                                {formatCurrency(tx.amount)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Shift History */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Shift History
                  </CardTitle>
                  {shiftHistoryData?.statistics && (
                    <CardDescription>
                      Clean audit rate:{" "}
                      <span className="font-medium">
                        {shiftHistoryData.statistics.cleanAuditRate.toFixed(1)}%
                      </span>
                      {" | "}
                      Total variance:{" "}
                      <span
                        className={cn(
                          "font-medium",
                          shiftHistoryData.statistics.totalVariance >= 0
                            ? "text-green-600"
                            : "text-red-600"
                        )}
                      >
                        {formatCurrency(shiftHistoryData.statistics.totalVariance)}
                      </span>
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  {shiftHistoryLoading ? (
                    <TableSkeleton rows={5} columns={7} />
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead className="text-right">Starting</TableHead>
                          <TableHead className="text-right">Expected</TableHead>
                          <TableHead className="text-right">Actual</TableHead>
                          <TableHead className="text-right">Variance</TableHead>
                          <TableHead>Closed By</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(shiftHistoryData?.shifts?.items ?? []).length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                              No shift history found
                            </TableCell>
                          </TableRow>
                        ) : (
                          (shiftHistoryData?.shifts?.items ?? [])
                            .filter((shift: Shift) => shift.status === "CLOSED")
                            .map((shift: Shift) => (
                              <TableRow key={shift.id}>
                                <TableCell>{formatDate(shift.shiftStart)}</TableCell>
                                <TableCell>
                                  {shift.shiftStart && shift.shiftEnd ? (
                                    <>
                                      {formatDateTime(shift.shiftStart)} -{" "}
                                      {formatDateTime(shift.shiftEnd)}
                                    </>
                                  ) : (
                                    "-"
                                  )}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {formatCurrency(shift.startingBalance)}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {formatCurrency(shift.expectedBalance)}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                  {formatCurrency(shift.actualCount)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    {shift.variance === 0 ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                                    ) : (
                                      <AlertTriangle
                                        className={cn(
                                          "h-4 w-4",
                                          shift.variance > 0 ? "text-green-600" : "text-red-600"
                                        )}
                                      />
                                    )}
                                    <span
                                      className={cn(
                                        "font-mono",
                                        shift.variance === 0
                                          ? "text-green-600"
                                          : shift.variance > 0
                                          ? "text-green-600"
                                          : "text-red-600"
                                      )}
                                    >
                                      {shift.variance >= 0 ? "+" : ""}
                                      {formatCurrency(shift.variance)}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>{shift.resetByName || "-"}</TableCell>
                              </TableRow>
                            ))
                        )}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Location Dialog */}
      <Dialog open={showAddLocationDialog} onOpenChange={setShowAddLocationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Cash Location</DialogTitle>
            <DialogDescription>
              Create a new cash location to track funds
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Location Name</Label>
              <Input
                id="name"
                placeholder="e.g., Main Register, Safe, Petty Cash"
                value={newLocationName}
                onChange={(e) => setNewLocationName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="balance">Initial Balance</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="balance"
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  value={newLocationBalance}
                  onChange={(e) => setNewLocationBalance(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddLocationDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateLocation}
              disabled={createLocationMutation.isPending}
            >
              {createLocationMutation.isPending ? "Creating..." : "Create Location"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Location Dialog */}
      <Dialog open={showEditLocationDialog} onOpenChange={setShowEditLocationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Cash Location</DialogTitle>
            <DialogDescription>
              Update location name or status
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Location Name</Label>
              <Input
                id="edit-name"
                value={editLocationName}
                onChange={(e) => setEditLocationName(e.target.value)}
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Active Status</Label>
                <p className="text-sm text-muted-foreground">
                  Inactive locations are hidden from transfers
                </p>
              </div>
              <Switch
                checked={editLocationActive}
                onCheckedChange={setEditLocationActive}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditLocationDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleUpdateLocation}
              disabled={updateLocationMutation.isPending}
            >
              {updateLocationMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog */}
      <Dialog open={showTransferDialog} onOpenChange={setShowTransferDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Transfer Funds</DialogTitle>
            <DialogDescription>
              Move cash between locations
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>From Location</Label>
              <Select value={transferFrom} onValueChange={setTransferFrom}>
                <SelectTrigger>
                  <SelectValue placeholder="Select source" />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations.map((loc: CashLocation) => (
                    <SelectItem key={loc.id} value={loc.id.toString()}>
                      {loc.name} ({formatCurrency(loc.currentBalance)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>To Location</Label>
              <Select value={transferTo} onValueChange={setTransferTo}>
                <SelectTrigger>
                  <SelectValue placeholder="Select destination" />
                </SelectTrigger>
                <SelectContent>
                  {activeLocations
                    .filter((loc: CashLocation) => loc.id.toString() !== transferFrom)
                    .map((loc: CashLocation) => (
                      <SelectItem key={loc.id} value={loc.id.toString()}>
                        {loc.name} ({formatCurrency(loc.currentBalance)})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  value={transferAmount}
                  onChange={(e) => setTransferAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Reason for transfer..."
                value={transferNotes}
                onChange={(e) => setTransferNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTransferDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleTransfer}
              disabled={transferMutation.isPending}
            >
              {transferMutation.isPending ? "Transferring..." : "Transfer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Transaction Dialog */}
      <Dialog open={showAddTransactionDialog} onOpenChange={setShowAddTransactionDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Transaction</DialogTitle>
            <DialogDescription>
              Add a cash in or out transaction for {selectedLocation?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Transaction Type</Label>
              <Select
                value={transactionType}
                onValueChange={(v) => setTransactionType(v as "IN" | "OUT")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="IN">
                    <div className="flex items-center gap-2">
                      <ArrowDownLeft className="h-4 w-4 text-green-600" />
                      Cash In
                    </div>
                  </SelectItem>
                  <SelectItem value="OUT">
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="h-4 w-4 text-red-600" />
                      Cash Out
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  value={transactionAmount}
                  onChange={(e) => setTransactionAmount(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                placeholder="Enter transaction details..."
                value={transactionDescription}
                onChange={(e) => setTransactionDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddTransactionDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRecordTransaction}
              disabled={recordTransactionMutation.isPending}
            >
              {recordTransactionMutation.isPending ? "Recording..." : "Record Transaction"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Close Shift Dialog */}
      <Dialog open={showCloseShiftDialog} onOpenChange={setShowCloseShiftDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close Shift</DialogTitle>
            <DialogDescription>
              Enter the actual cash count to reconcile the shift
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            {shiftData && (
              <div className="rounded-lg bg-muted p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Expected Balance:</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(shiftData.expectedBalance)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Location Balance:</span>
                  <span className="font-mono font-medium">
                    {formatCurrency(shiftData.location.currentBalance)}
                  </span>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Actual Cash Count</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="pl-7"
                  value={actualCashCount}
                  onChange={(e) => setActualCashCount(e.target.value)}
                />
              </div>
            </div>
            {actualCashCount && shiftData && (
              <div
                className={cn(
                  "rounded-lg p-4 flex items-center gap-3",
                  parseFloat(actualCashCount) === shiftData.expectedBalance
                    ? "bg-green-100 dark:bg-green-900/30"
                    : parseFloat(actualCashCount) > shiftData.expectedBalance
                    ? "bg-amber-100 dark:bg-amber-900/30"
                    : "bg-red-100 dark:bg-red-900/30"
                )}
              >
                {parseFloat(actualCashCount) === shiftData.expectedBalance ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600" />
                ) : (
                  <AlertTriangle
                    className={cn(
                      "h-5 w-5",
                      parseFloat(actualCashCount) > shiftData.expectedBalance
                        ? "text-amber-600"
                        : "text-red-600"
                    )}
                  />
                )}
                <div>
                  <p className="font-medium">
                    {parseFloat(actualCashCount) === shiftData.expectedBalance
                      ? "Perfect Match!"
                      : parseFloat(actualCashCount) > shiftData.expectedBalance
                      ? `Over by ${formatCurrency(parseFloat(actualCashCount) - shiftData.expectedBalance)}`
                      : `Short by ${formatCurrency(shiftData.expectedBalance - parseFloat(actualCashCount))}`}
                  </p>
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label>Notes (Optional)</Label>
              <Textarea
                placeholder="Add any notes about this shift..."
                value={closeShiftNotes}
                onChange={(e) => setCloseShiftNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCloseShiftDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleCloseShift}
              disabled={resetShiftMutation.isPending}
            >
              {resetShiftMutation.isPending ? "Closing..." : "Close Shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

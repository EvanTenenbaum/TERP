import React, { useState } from "react";
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
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Plus,
  Calendar as CalendarIcon,
  Lock,
  Unlock,
  XCircle,
  AlertTriangle,
} from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDate as formatDateUtil } from "@/lib/dateFormat";

type FiscalPeriod = {
  id: number;
  periodName: string;
  startDate: Date | string;
  endDate: Date | string;
  fiscalYear: number;
  status: "OPEN" | "CLOSED" | "LOCKED";
  createdAt: Date | string;
};

type CreatePeriodInput = {
  periodName: string;
  fiscalYear: number;
  startDate: Date;
  endDate: Date;
};

export default function FiscalPeriods({
  embedded,
}: { embedded?: boolean } = {}) {
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  // ACC-005: Confirmation dialog state for period status changes
  const [confirmAction, setConfirmAction] = useState<{
    type: "close" | "lock" | "reopen";
    period: FiscalPeriod;
  } | null>(null);

  // Fetch fiscal periods
  const {
    data: periods,
    isLoading,
    refetch,
  } = trpc.accounting.fiscalPeriods.list.useQuery({
    status:
      selectedStatus !== "ALL"
        ? (selectedStatus as "OPEN" | "CLOSED" | "LOCKED")
        : undefined,
  });

  const { data: currentPeriod } =
    trpc.accounting.fiscalPeriods.getCurrent.useQuery();

  // Create period mutation
  const createPeriod = trpc.accounting.fiscalPeriods.create.useMutation({
    onSuccess: () => {
      toast.success("Fiscal period created successfully");
      setShowCreateDialog(false);
      refetch();
    },
    onError: error => {
      toast.error(`Failed to create fiscal period: ${error.message}`);
    },
  });

  // Close period mutation
  const closePeriod = trpc.accounting.fiscalPeriods.close.useMutation({
    onSuccess: () => {
      toast.success("Fiscal period closed successfully");
      refetch();
    },
    onError: error => {
      toast.error(`Failed to close fiscal period: ${error.message}`);
    },
  });

  // Lock period mutation
  const lockPeriod = trpc.accounting.fiscalPeriods.lock.useMutation({
    onSuccess: () => {
      toast.success("Fiscal period locked successfully");
      refetch();
    },
    onError: error => {
      toast.error(`Failed to lock fiscal period: ${error.message}`);
    },
  });

  // Reopen period mutation
  const reopenPeriod = trpc.accounting.fiscalPeriods.reopen.useMutation({
    onSuccess: () => {
      toast.success("Fiscal period reopened successfully");
      refetch();
    },
    onError: error => {
      toast.error(`Failed to reopen fiscal period: ${error.message}`);
    },
  });

  const getStatusBadge = (status: string, isCurrent: boolean = false) => {
    let badge;
    switch (status) {
      case "OPEN":
        badge = (
          <Badge
            variant="outline"
            className="bg-green-100 text-green-700 border-green-200"
          >
            Open
          </Badge>
        );
        break;
      case "CLOSED":
        badge = (
          <Badge
            variant="outline"
            className="bg-gray-100 text-gray-700 border-gray-200"
          >
            Closed
          </Badge>
        );
        break;
      case "LOCKED":
        badge = (
          <Badge
            variant="outline"
            className="bg-red-100 text-red-700 border-red-200"
          >
            Locked
          </Badge>
        );
        break;
      default:
        badge = <Badge variant="outline">{status}</Badge>;
    }

    return (
      <div className="flex items-center gap-2">
        {badge}
        {isCurrent && (
          <Badge
            variant="outline"
            className="bg-blue-100 text-blue-700 border-blue-200"
          >
            Current
          </Badge>
        )}
      </div>
    );
  };

  // ACC-005: Handle confirmation dialog actions
  const handleConfirmAction = () => {
    if (!confirmAction) return;

    const { type, period } = confirmAction;
    switch (type) {
      case "close":
        closePeriod.mutate({ id: period.id });
        break;
      case "lock":
        lockPeriod.mutate({ id: period.id });
        break;
      case "reopen":
        reopenPeriod.mutate({ id: period.id });
        break;
    }
    setConfirmAction(null);
  };

  const getActionButtons = (period: FiscalPeriod) => {
    switch (period.status) {
      case "OPEN":
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmAction({ type: "close", period })}
            disabled={closePeriod.isPending}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Close
          </Button>
        );
      case "CLOSED":
        return (
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmAction({ type: "lock", period })}
              disabled={lockPeriod.isPending}
            >
              <Lock className="mr-2 h-4 w-4" />
              Lock
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setConfirmAction({ type: "reopen", period })}
              disabled={reopenPeriod.isPending}
            >
              <Unlock className="mr-2 h-4 w-4" />
              Reopen
            </Button>
          </div>
        );
      case "LOCKED":
        return (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setConfirmAction({ type: "reopen", period })}
            disabled={reopenPeriod.isPending}
          >
            <Unlock className="mr-2 h-4 w-4" />
            Reopen
          </Button>
        );
    }
  };

  const totalPeriods = periods?.length || 0;
  const openPeriods = periods?.filter(p => p.status === "OPEN").length || 0;
  const closedPeriods = periods?.filter(p => p.status === "CLOSED").length || 0;
  const lockedPeriods = periods?.filter(p => p.status === "LOCKED").length || 0;

  return (
    <div className="flex flex-col gap-6 p-6">
      {!embedded && <BackButton label="Back to Accounting" to="/accounting" />}
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Fiscal Periods
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage accounting periods and their status
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Period
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Periods</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPeriods}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open</CardTitle>
            <CalendarIcon className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openPeriods}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed</CardTitle>
            <CalendarIcon className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{closedPeriods}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Locked</CardTitle>
            <CalendarIcon className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{lockedPeriods}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All Statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="OPEN">Open</SelectItem>
              <SelectItem value="CLOSED">Closed</SelectItem>
              <SelectItem value="LOCKED">Locked</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Periods Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fiscal Periods</CardTitle>
          <CardDescription>
            All fiscal periods and their current status
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">
              Loading periods...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Period Name</TableHead>
                  <TableHead>Fiscal Year</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!periods || periods.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={6}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No fiscal periods found
                    </TableCell>
                  </TableRow>
                ) : (
                  periods.map((period: FiscalPeriod) => {
                    const isCurrent = currentPeriod?.id === period.id;
                    return (
                      <TableRow
                        key={period.id}
                        className={cn(isCurrent && "bg-blue-50")}
                      >
                        <TableCell className="font-medium">
                          {period.periodName}
                        </TableCell>
                        <TableCell>{period.fiscalYear}</TableCell>
                        <TableCell>
                          {formatDateUtil(period.startDate, "long")}
                        </TableCell>
                        <TableCell>
                          {formatDateUtil(period.endDate, "long")}
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(period.status, isCurrent)}
                        </TableCell>
                        <TableCell className="text-right">
                          {getActionButtons(period)}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Period Dialog */}
      <CreatePeriodDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={data => createPeriod.mutate(data)}
        isSubmitting={createPeriod.isPending}
      />

      {/* ACC-005: Period Status Change Confirmation Dialog */}
      <AlertDialog
        open={!!confirmAction}
        onOpenChange={() => setConfirmAction(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {confirmAction?.type === "lock" && (
                <Lock className="h-5 w-5 text-red-500" />
              )}
              {confirmAction?.type === "close" && (
                <XCircle className="h-5 w-5 text-amber-500" />
              )}
              {confirmAction?.type === "reopen" && (
                <Unlock className="h-5 w-5 text-green-500" />
              )}
              {confirmAction?.type === "close" && "Close Fiscal Period?"}
              {confirmAction?.type === "lock" && "Lock Fiscal Period?"}
              {confirmAction?.type === "reopen" && "Reopen Fiscal Period?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              {confirmAction?.type === "close" && (
                <>
                  <p>
                    You are about to close{" "}
                    <strong>{confirmAction.period.periodName}</strong>.
                  </p>
                  <p className="text-amber-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Closing a period will prevent new transactions from being
                    posted to it.
                  </p>
                </>
              )}
              {confirmAction?.type === "lock" && (
                <>
                  <p>
                    You are about to lock{" "}
                    <strong>{confirmAction.period.periodName}</strong>.
                  </p>
                  <p className="text-red-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Locking a period permanently prevents any modifications.
                    This action should only be taken after reconciliation is
                    complete.
                  </p>
                </>
              )}
              {confirmAction?.type === "reopen" && (
                <>
                  <p>
                    You are about to reopen{" "}
                    <strong>{confirmAction.period.periodName}</strong>.
                  </p>
                  <p className="text-amber-600 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Reopening a period will allow transactions to be posted to
                    it again.
                  </p>
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmAction}
              className={cn(
                confirmAction?.type === "lock" && "bg-red-600 hover:bg-red-700",
                confirmAction?.type === "close" &&
                  "bg-amber-600 hover:bg-amber-700",
                confirmAction?.type === "reopen" &&
                  "bg-green-600 hover:bg-green-700"
              )}
            >
              {confirmAction?.type === "close" && "Close Period"}
              {confirmAction?.type === "lock" && "Lock Period"}
              {confirmAction?.type === "reopen" && "Reopen Period"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Create Period Dialog Component
function CreatePeriodDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreatePeriodInput) => void;
  isSubmitting: boolean;
}) {
  const [formData, setFormData] = useState({
    periodName: "",
    fiscalYear: new Date().getFullYear(),
    startDate: undefined as Date | undefined,
    endDate: undefined as Date | undefined,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.startDate || !formData.endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    onSubmit({
      periodName: formData.periodName,
      fiscalYear: formData.fiscalYear,
      startDate: formData.startDate,
      endDate: formData.endDate,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Fiscal Period</DialogTitle>
            <DialogDescription>
              Add a new fiscal period to your accounting system
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="periodName">Period Name</Label>
              <Input
                id="periodName"
                value={formData.periodName}
                onChange={e =>
                  setFormData({ ...formData, periodName: e.target.value })
                }
                placeholder="e.g., Q1 2024"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="fiscalYear">Fiscal Year</Label>
              <Input
                id="fiscalYear"
                type="number"
                value={formData.fiscalYear}
                onChange={e =>
                  setFormData({
                    ...formData,
                    fiscalYear: parseInt(e.target.value),
                  })
                }
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !formData.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startDate
                      ? format(formData.startDate, "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.startDate}
                    onSelect={date =>
                      setFormData({ ...formData, startDate: date })
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="grid gap-2">
              <Label>End Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !formData.endDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.endDate
                      ? format(formData.endDate, "PPP")
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.endDate}
                    onSelect={date =>
                      setFormData({ ...formData, endDate: date })
                    }
                    disabled={date =>
                      formData.startDate ? date < formData.startDate : false
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
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
              {isSubmitting ? "Creating..." : "Create Period"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

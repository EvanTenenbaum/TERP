/**
 * Time Clock Page
 * MEET-048: Hour Tracking Frontend
 *
 * Features:
 * - Clock In/Out
 * - Break management
 * - Current status display
 * - Timesheet view with weekly summary
 */

import { useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import {
  Clock,
  PlayCircle,
  PauseCircle,
  StopCircle,
  Coffee,
  Calendar,
  TrendingUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BackButton } from "@/components/common/BackButton";
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks } from "date-fns";

export default function TimeClockPage() {
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [reportGroupBy, setReportGroupBy] = useState<
    "day" | "week" | "employee"
  >("day");

  // Get current clock status
  const {
    data: status,
    isLoading: statusLoading,
    isError: statusError,
    error: statusErrorDetails,
    refetch: refetchStatus,
  } = trpc.hourTracking.getCurrentStatus.useQuery();

  // Get timesheet for selected week
  const weekStart = startOfWeek(selectedWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(selectedWeek, { weekStartsOn: 1 });

  const {
    data: timesheet,
    isLoading: timesheetLoading,
    isError: timesheetError,
    error: timesheetErrorDetails,
    refetch: refetchTimesheet,
  } = trpc.hourTracking.getTimesheet.useQuery({
    startDate: format(weekStart, "yyyy-MM-dd"),
    endDate: format(weekEnd, "yyyy-MM-dd"),
  });

  // Combined error state
  const hasError = statusError || timesheetError;

  // Mutations
  const clockIn = trpc.hourTracking.clockIn.useMutation({
    onSuccess: result => {
      toast.success(
        `Clocked in at ${new Date(result.clockInTime).toLocaleTimeString()}`
      );
      refetchStatus();
      refetchTimesheet();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const clockOut = trpc.hourTracking.clockOut.useMutation({
    onSuccess: result => {
      toast.success(`Clocked out! Total time: ${result.totalHours}`);
      refetchStatus();
      refetchTimesheet();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const startBreak = trpc.hourTracking.startBreak.useMutation({
    onSuccess: () => {
      toast.success("Break started");
      refetchStatus();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const endBreak = trpc.hourTracking.endBreak.useMutation({
    onSuccess: result => {
      toast.success(`Break ended. Duration: ${result.breakDuration}`);
      refetchStatus();
    },
    onError: error => {
      toast.error(error.message);
    },
  });

  const isLoading =
    clockIn.isPending ||
    clockOut.isPending ||
    startBreak.isPending ||
    endBreak.isPending;

  const handleClockIn = () => {
    clockIn.mutate({});
  };

  const handleClockOut = () => {
    clockOut.mutate({});
  };

  const handleBreakToggle = () => {
    if (status?.isOnBreak) {
      endBreak.mutate();
    } else {
      startBreak.mutate();
    }
  };

  const navigateWeek = (direction: "prev" | "next") => {
    setSelectedWeek(prev =>
      direction === "prev" ? subWeeks(prev, 1) : addWeeks(prev, 1)
    );
  };

  const goToCurrentWeek = () => {
    setSelectedWeek(new Date());
  };

  const getStatusBadge = () => {
    if (statusLoading) return <Badge variant="secondary">Loading...</Badge>;

    if (!status?.isClockedIn) {
      return (
        <Badge variant="outline" className="text-gray-600">
          Not Clocked In
        </Badge>
      );
    }

    if (status.isOnBreak) {
      return (
        <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
          On Break
        </Badge>
      );
    }

    return (
      <Badge variant="default" className="bg-green-500">
        Working
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Clock className="h-6 w-6 text-blue-600" />
              Time Clock
            </h1>
            <p className="text-muted-foreground">
              Track your work hours and manage timesheets
            </p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {/* QA-W5-003/004 FIX: Error state display */}
      {hasError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error Loading Data</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>
              {statusError
                ? statusErrorDetails?.message || "Failed to load clock status"
                : timesheetErrorDetails?.message || "Failed to load timesheet"}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetchStatus();
                refetchTimesheet();
              }}
              className="ml-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Clock In/Out Widget */}
      <Card className="border-2">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Status Info */}
            <div className="flex-1">
              {statusLoading ? (
                <div className="animate-pulse">
                  <div className="h-8 bg-gray-200 rounded w-48 mb-2" />
                  <div className="h-4 bg-gray-100 rounded w-32" />
                </div>
              ) : status?.isClockedIn && status.currentEntry ? (
                <div className="space-y-2">
                  <div className="text-3xl font-bold text-gray-900">
                    {status.currentEntry.workedTime}
                  </div>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>
                      Clocked in at:{" "}
                      {new Date(
                        status.currentEntry.clockIn
                      ).toLocaleTimeString()}
                    </p>
                    {status.currentEntry.totalBreakTime !== "0h 0m" && (
                      <p>Break time: {status.currentEntry.totalBreakTime}</p>
                    )}
                  </div>
                  {status.isOnBreak && (
                    <div className="flex items-center gap-2 text-yellow-600">
                      <Coffee className="h-4 w-4" />
                      <span className="text-sm font-medium">
                        Currently on break
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-1">
                  <div className="text-xl font-semibold text-gray-700">
                    Ready to start your day?
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Click Clock In to begin tracking your hours
                  </p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              {!status?.isClockedIn ? (
                <Button
                  size="lg"
                  onClick={handleClockIn}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {clockIn.isPending ? (
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  ) : (
                    <PlayCircle className="h-5 w-5 mr-2" />
                  )}
                  Clock In
                </Button>
              ) : (
                <>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleBreakToggle}
                    disabled={isLoading}
                    className={
                      status.isOnBreak ? "border-green-500 text-green-600" : ""
                    }
                  >
                    {startBreak.isPending || endBreak.isPending ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : status.isOnBreak ? (
                      <PlayCircle className="h-5 w-5 mr-2" />
                    ) : (
                      <PauseCircle className="h-5 w-5 mr-2" />
                    )}
                    {status.isOnBreak ? "End Break" : "Start Break"}
                  </Button>
                  <Button
                    size="lg"
                    variant="destructive"
                    onClick={handleClockOut}
                    disabled={isLoading || !!status.isOnBreak}
                  >
                    {clockOut.isPending ? (
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    ) : (
                      <StopCircle className="h-5 w-5 mr-2" />
                    )}
                    Clock Out
                  </Button>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Summary Cards */}
      {timesheet && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Regular Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {timesheet.summary.regularHours}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Overtime Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {timesheet.summary.overtimeHours}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Hours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {timesheet.summary.grandTotal}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Days Worked
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {timesheet.entries.length}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Timesheet Table */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <CardTitle>Weekly Timesheet</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={goToCurrentWeek}>
                This Week
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigateWeek("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground ml-2">
                {format(weekStart, "MMM d")} - {format(weekEnd, "MMM d, yyyy")}
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {timesheetLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div
                  key={i}
                  className="h-12 bg-gray-100 animate-pulse rounded"
                />
              ))}
            </div>
          ) : !timesheet?.entries?.length ? (
            <div className="text-center py-8 text-muted-foreground">
              <Clock className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p>No time entries for this week</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Clock In</TableHead>
                  <TableHead>Clock Out</TableHead>
                  <TableHead>Break</TableHead>
                  <TableHead>Regular</TableHead>
                  <TableHead>Overtime</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {timesheet.entries.map(entry => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      {format(new Date(entry.entryDate), "EEE, MMM d")}
                    </TableCell>
                    <TableCell>
                      {entry.clockIn
                        ? format(new Date(entry.clockIn), "h:mm a")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {entry.clockOut
                        ? format(new Date(entry.clockOut), "h:mm a")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {entry.totalBreakMinutes
                        ? `${Math.floor(entry.totalBreakMinutes / 60)}h ${entry.totalBreakMinutes % 60}m`
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {entry.regularHours
                        ? `${Math.floor(entry.regularHours / 60)}h ${entry.regularHours % 60}m`
                        : "-"}
                    </TableCell>
                    <TableCell className="text-orange-600">
                      {entry.overtimeHours && entry.overtimeHours > 0
                        ? `${Math.floor(entry.overtimeHours / 60)}h ${entry.overtimeHours % 60}m`
                        : "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {entry.formattedTotal || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          entry.status === "completed" ||
                          entry.status === "approved"
                            ? "default"
                            : entry.status === "active"
                              ? "secondary"
                              : "outline"
                        }
                        className={
                          entry.status === "approved"
                            ? "bg-green-500"
                            : entry.status === "active"
                              ? "bg-blue-100 text-blue-800"
                              : ""
                        }
                      >
                        {entry.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-muted-foreground" />
            <CardTitle>Reports</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <span className="text-sm text-muted-foreground">Group by:</span>
            <Select
              value={reportGroupBy}
              onValueChange={v =>
                setReportGroupBy(v as "day" | "week" | "employee")
              }
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-sm text-muted-foreground">
            Select a report grouping to view detailed time tracking analytics.
            Manager reports include all team members.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

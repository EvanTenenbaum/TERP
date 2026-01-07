import { useState } from "react";
import { Plus, Check, X, Calendar, Clock, User, Trash2, AlertCircle, RefreshCw } from "lucide-react";
import { trpc } from "../../lib/trpc";
import TimeOffRequestForm from "./TimeOffRequestForm";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { toast } from "sonner";

interface TimeOffRequest {
  id: number;
  userId: number;
  timeOffType: string;
  startDate: Date | string;
  endDate: Date | string;
  startTime: string | null;
  endTime: string | null;
  isFullDay: boolean;
  status: string;
  notes: string | null;
  responseNotes: string | null;
  createdAt: Date | string;
  userName: string | null;
}

interface TimeOffRequestsListProps {
  isAdmin?: boolean;
}

const TIME_OFF_COLORS: Record<string, string> = {
  vacation: "bg-blue-500",
  sick: "bg-red-500",
  personal: "bg-purple-500",
};

const TIME_OFF_LABELS: Record<string, string> = {
  vacation: "Vacation",
  sick: "Sick Leave",
  personal: "Personal Time",
};

export default function TimeOffRequestsList({ isAdmin = false }: TimeOffRequestsListProps) {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  // BUG-007: State for confirmation dialogs (replaces window.confirm)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [requestToHandle, setRequestToHandle] = useState<number | null>(null);

  const { data, isLoading, error, refetch } = trpc.timeOffRequests.list.useQuery({
    status: statusFilter as "pending" | "approved" | "rejected",
    limit: 50,
  });

  const { data: myPendingCount } = trpc.timeOffRequests.getMyPendingCount.useQuery();
  const { data: teamPendingCount } = trpc.timeOffRequests.getTeamPendingCount.useQuery(
    undefined,
    { enabled: isAdmin }
  );

  const approveMutation = trpc.timeOffRequests.approve.useMutation({
    onSuccess: () => {
      toast.success("Time-off request approved");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  const rejectMutation = trpc.timeOffRequests.reject.useMutation({
    onSuccess: () => {
      toast.success("Time-off request rejected");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  const cancelMutation = trpc.timeOffRequests.cancel.useMutation({
    onSuccess: () => {
      toast.success("Time-off request cancelled");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to cancel: ${error.message}`);
    },
  });

  // BUG-007: Show confirm dialog instead of window.confirm
  const handleApprove = (requestId: number) => {
    setRequestToHandle(requestId);
    setApproveDialogOpen(true);
  };

  // BUG-007: Actual approve action after confirmation
  const confirmApprove = async () => {
    if (requestToHandle !== null) {
      try {
        await approveMutation.mutateAsync({ requestId: requestToHandle });
      } catch {
        // Error handled by mutation onError
      }
    }
    setRequestToHandle(null);
  };

  // BUG-007: Handle approve dialog close - reset state
  const handleApproveDialogChange = (open: boolean) => {
    setApproveDialogOpen(open);
    if (!open) {
      setRequestToHandle(null);
    }
  };

  // BUG-007: Show prompt dialog instead of globalThis.prompt
  const handleReject = (requestId: number) => {
    setRequestToHandle(requestId);
    setRejectDialogOpen(true);
  };

  // BUG-007: Actual reject action after prompt
  const confirmReject = async (reason: string) => {
    if (requestToHandle !== null && reason.trim()) {
      try {
        await rejectMutation.mutateAsync({ requestId: requestToHandle, responseNotes: reason });
      } catch {
        // Error handled by mutation onError
      }
    }
    setRequestToHandle(null);
  };

  // BUG-007: Handle reject dialog close - reset state
  const handleRejectDialogChange = (open: boolean) => {
    setRejectDialogOpen(open);
    if (!open) {
      setRequestToHandle(null);
    }
  };

  // BUG-007: Show confirm dialog instead of window.confirm
  const handleCancel = (requestId: number) => {
    setRequestToHandle(requestId);
    setCancelDialogOpen(true);
  };

  // BUG-007: Actual cancel action after confirmation
  const confirmCancel = async () => {
    if (requestToHandle !== null) {
      try {
        await cancelMutation.mutateAsync({ requestId: requestToHandle });
      } catch {
        // Error handled by mutation onError
      }
    }
    setRequestToHandle(null);
  };

  // BUG-007: Handle cancel dialog close - reset state
  const handleCancelDialogChange = (open: boolean) => {
    setCancelDialogOpen(open);
    if (!open) {
      setRequestToHandle(null);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateRange = (startDate: Date | string, endDate: Date | string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (start.toDateString() === end.toDateString()) {
      return formatDate(start);
    }

    return `${formatDate(start)} - ${formatDate(end)}`;
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${styles[status] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getDayCount = (startDate: Date | string, endDate: Date | string) => {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  // BUG-055: Added proper error handling with retry capability
  if (error) {
    console.error('[TimeOffRequestsList] Error:', error);
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-8 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-2 text-sm font-medium text-red-800">Failed to load time off requests</h3>
        <p className="mt-1 text-sm text-red-600">{error.message || 'An unexpected error occurred'}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 inline-flex items-center gap-2 rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-200"
        >
          <RefreshCw className="h-4 w-4" />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Time Off Requests</h3>
          {isAdmin && teamPendingCount && teamPendingCount.count > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-orange-500 px-2 py-0.5 text-xs font-bold text-white">
              {teamPendingCount.count} pending
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={() => setIsFormOpen(true)}
            className="inline-flex items-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" />
            Request Time Off
          </button>
        </div>
      </div>

      {/* My pending requests indicator */}
      {myPendingCount && myPendingCount.count > 0 && statusFilter !== "pending" && (
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3 text-sm text-yellow-800">
          You have {myPendingCount.count} pending time-off request(s).{" "}
          <button
            onClick={() => setStatusFilter("pending")}
            className="font-medium underline hover:no-underline"
          >
            View pending
          </button>
        </div>
      )}

      {/* Requests list */}
      {data?.requests && data.requests.length > 0 ? (
        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {data.requests.map((request: TimeOffRequest) => (
            <div
              key={request.id}
              className="flex items-center justify-between p-4"
            >
              <div className="flex items-start gap-4">
                {/* Type indicator */}
                <div className="mt-1 flex flex-col items-center">
                  <div
                    className={`h-10 w-10 rounded-lg ${TIME_OFF_COLORS[request.timeOffType] || "bg-gray-500"} flex items-center justify-center text-white font-medium text-sm`}
                  >
                    {getDayCount(request.startDate, request.endDate)}d
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {TIME_OFF_LABELS[request.timeOffType] || request.timeOffType}
                    </span>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {isAdmin && (
                      <span className="flex items-center gap-1">
                        <User className="h-4 w-4" />
                        {request.userName}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDateRange(request.startDate, request.endDate)}
                    </span>
                    {!request.isFullDay && request.startTime && request.endTime && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {request.startTime.slice(0, 5)} - {request.endTime.slice(0, 5)}
                      </span>
                    )}
                  </div>

                  {request.notes && (
                    <p className="text-sm text-gray-500 line-clamp-1">
                      {request.notes}
                    </p>
                  )}

                  {request.responseNotes && (
                    <p className="text-sm text-gray-600 italic">
                      Response: {request.responseNotes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {request.status === "pending" && (
                  <>
                    {isAdmin && (
                      <>
                        <button
                          onClick={() => handleApprove(request.id)}
                          disabled={approveMutation.isPending}
                          className="rounded-md bg-green-50 p-2 text-green-600 hover:bg-green-100 disabled:opacity-50"
                          title="Approve"
                        >
                          <Check className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => handleReject(request.id)}
                          disabled={rejectMutation.isPending}
                          className="rounded-md bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:opacity-50"
                          title="Reject"
                        >
                          <X className="h-5 w-5" />
                        </button>
                      </>
                    )}
                    {!isAdmin && (
                      <button
                        onClick={() => handleCancel(request.id)}
                        disabled={cancelMutation.isPending}
                        className="rounded-md bg-gray-50 p-2 text-gray-600 hover:bg-gray-100 disabled:opacity-50"
                        title="Cancel Request"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            No {statusFilter} time-off requests
          </p>
        </div>
      )}

      {/* Pagination info */}
      {data?.total && data.total > 0 && (
        <p className="text-sm text-gray-500">
          Showing {data.requests.length} of {data.total} requests
        </p>
      )}

      {/* Time Off Request Form Modal */}
      <TimeOffRequestForm
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmitted={() => refetch()}
      />

      {/* BUG-007: Approve Confirmation Dialog (replaces window.confirm) */}
      <ConfirmDialog
        open={approveDialogOpen}
        onOpenChange={handleApproveDialogChange}
        title="Approve Request"
        description="Are you sure you want to approve this time-off request?"
        confirmLabel="Approve"
        variant="default"
        onConfirm={confirmApprove}
        isLoading={approveMutation.isPending}
      />

      {/* BUG-007: Reject Prompt Dialog (replaces globalThis.prompt) */}
      <PromptDialog
        open={rejectDialogOpen}
        onOpenChange={handleRejectDialogChange}
        title="Reject Request"
        description="Please enter a reason for rejecting this time-off request:"
        placeholder="Enter rejection reason..."
        confirmLabel="Reject"
        variant="destructive"
        onConfirm={confirmReject}
        isLoading={rejectMutation.isPending}
      />

      {/* BUG-007: Cancel Confirmation Dialog (replaces window.confirm) */}
      <ConfirmDialog
        open={cancelDialogOpen}
        onOpenChange={handleCancelDialogChange}
        title="Cancel Request"
        description="Are you sure you want to cancel this time-off request?"
        confirmLabel="Cancel Request"
        variant="destructive"
        onConfirm={confirmCancel}
        isLoading={cancelMutation.isPending}
      />
    </div>
  );
}

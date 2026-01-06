import React, { useState } from "react";
import { Check, X, Clock, Calendar, User, ChevronRight } from "lucide-react";
import { trpc } from "../../lib/trpc";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { PromptDialog } from "@/components/ui/prompt-dialog";
import { toast } from "sonner";

interface AppointmentRequest {
  id: number;
  calendarId: number;
  appointmentTypeId: number;
  requestedById: number;
  requestedSlot: Date | string;
  status: string;
  notes: string | null;
  responseNotes: string | null;
  createdAt: Date | string;
  calendarName: string | null;
  appointmentTypeName: string | null;
  appointmentTypeColor: string | null;
  appointmentTypeDuration: number | null;
  clientName: string | null;
}

interface AppointmentRequestsListProps {
  onSelectRequest: (requestId: number) => void;
}

export default function AppointmentRequestsList({
  onSelectRequest,
}: AppointmentRequestsListProps) {
  const [statusFilter, setStatusFilter] = useState<string>("pending");

  // BUG-007: State for approve confirmation dialog (replaces window.confirm)
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [requestToApprove, setRequestToApprove] = useState<number | null>(null);

  // BUG-007: State for reject prompt dialog (replaces globalThis.prompt)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [requestToReject, setRequestToReject] = useState<number | null>(null);

  const { data, isLoading, refetch } = trpc.appointmentRequests.list.useQuery({
    status: statusFilter as "pending" | "approved" | "rejected" | "cancelled",
    limit: 50,
  });

  const { data: pendingCount } = trpc.appointmentRequests.getPendingCount.useQuery({});

  const approveMutation = trpc.appointmentRequests.approve.useMutation({
    onSuccess: () => {
      toast.success("Request approved successfully");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to approve: ${error.message}`);
    },
  });

  const rejectMutation = trpc.appointmentRequests.reject.useMutation({
    onSuccess: () => {
      toast.success("Request rejected");
      refetch();
    },
    onError: (error) => {
      toast.error(`Failed to reject: ${error.message}`);
    },
  });

  // BUG-007: Show confirm dialog instead of window.confirm
  const handleQuickApprove = (e: React.MouseEvent, requestId: number) => {
    e.stopPropagation();
    setRequestToApprove(requestId);
    setApproveDialogOpen(true);
  };

  // BUG-007: Actual approve action after confirmation
  const confirmApprove = async () => {
    if (requestToApprove !== null) {
      try {
        await approveMutation.mutateAsync({ requestId: requestToApprove });
      } catch {
        // Error handled by mutation onError
      }
    }
    setRequestToApprove(null);
  };

  // BUG-007: Handle dialog close - reset state to prevent stale data
  const handleApproveDialogChange = (open: boolean) => {
    setApproveDialogOpen(open);
    if (!open) {
      setRequestToApprove(null);
    }
  };

  // BUG-007: Show prompt dialog instead of globalThis.prompt
  const handleQuickReject = (e: React.MouseEvent, requestId: number) => {
    e.stopPropagation();
    setRequestToReject(requestId);
    setRejectDialogOpen(true);
  };

  // BUG-007: Actual reject action after prompt
  const confirmReject = async (reason: string) => {
    if (requestToReject !== null && reason.trim()) {
      try {
        await rejectMutation.mutateAsync({ requestId: requestToReject, responseNotes: reason });
      } catch {
        // Error handled by mutation onError
      }
    }
    setRequestToReject(null);
  };

  // BUG-007: Handle reject dialog close - reset state
  const handleRejectDialogChange = (open: boolean) => {
    setRejectDialogOpen(open);
    if (!open) {
      setRequestToReject(null);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
      cancelled: "bg-gray-100 text-gray-800",
    };
    return (
      <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${styles[status] || styles.pending}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with count and filter */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-semibold text-gray-900">Appointment Requests</h3>
          {pendingCount && pendingCount.count > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-red-500 px-2 py-0.5 text-xs font-bold text-white">
              {pendingCount.count}
            </span>
          )}
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      {/* Requests list */}
      {data?.requests && data.requests.length > 0 ? (
        <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
          {data.requests.map((request: AppointmentRequest) => (
            <div
              key={request.id}
              onClick={() => onSelectRequest(request.id)}
              className="flex cursor-pointer items-center justify-between p-4 hover:bg-gray-50"
            >
              <div className="flex items-start gap-4">
                {/* Color indicator */}
                <div
                  className="mt-1 h-10 w-1 rounded-full"
                  style={{ backgroundColor: request.appointmentTypeColor || "#3B82F6" }}
                />

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">
                      {request.appointmentTypeName || "Appointment"}
                    </span>
                    {getStatusBadge(request.status)}
                  </div>

                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <span className="flex items-center gap-1">
                      <User className="h-4 w-4" />
                      {request.clientName}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {formatDate(request.requestedSlot)}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {formatTime(request.requestedSlot)}
                    </span>
                  </div>

                  {request.notes && (
                    <p className="text-sm text-gray-500 line-clamp-1">
                      {request.notes}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {request.status === "pending" && (
                  <>
                    <button
                      onClick={(e) => handleQuickApprove(e, request.id)}
                      disabled={approveMutation.isPending}
                      className="rounded-md bg-green-50 p-2 text-green-600 hover:bg-green-100 disabled:opacity-50"
                      title="Approve"
                    >
                      <Check className="h-5 w-5" />
                    </button>
                    <button
                      onClick={(e) => handleQuickReject(e, request.id)}
                      disabled={rejectMutation.isPending}
                      className="rounded-md bg-red-50 p-2 text-red-600 hover:bg-red-100 disabled:opacity-50"
                      title="Reject"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </>
                )}
                <ChevronRight className="h-5 w-5 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center">
          <Calendar className="mx-auto h-12 w-12 text-gray-400" />
          <p className="mt-2 text-sm text-gray-500">
            No {statusFilter} appointment requests
          </p>
        </div>
      )}

      {/* Pagination info */}
      {data?.total && data.total > 0 && (
        <p className="text-sm text-gray-500">
          Showing {data.requests.length} of {data.total} requests
        </p>
      )}

      {/* BUG-007: Approve Confirmation Dialog (replaces window.confirm) */}
      <ConfirmDialog
        open={approveDialogOpen}
        onOpenChange={handleApproveDialogChange}
        title="Approve Request"
        description="Are you sure you want to approve this appointment request?"
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
        description="Please enter a reason for rejecting this appointment request:"
        placeholder="Enter rejection reason..."
        confirmLabel="Reject"
        variant="destructive"
        onConfirm={confirmReject}
        isLoading={rejectMutation.isPending}
      />
    </div>
  );
}

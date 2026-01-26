import { useState } from "react";
import { X, Check, Calendar, User, Phone, Mail, FileText } from "lucide-react";
import { trpc } from "../../lib/trpc";
import { toast } from "sonner";

interface AppointmentRequestModalProps {
  requestId: number | null;
  isOpen: boolean;
  onClose: () => void;
  onAction: () => void;
}

export default function AppointmentRequestModal({
  requestId,
  isOpen,
  onClose,
  onAction,
}: AppointmentRequestModalProps) {
  const [responseNotes, setResponseNotes] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  // LINT-007: Avoid non-null assertion by using -1 as fallback (query is disabled when requestId is null)
  const { data: request, isLoading } =
    trpc.appointmentRequests.getById.useQuery(
      { id: requestId ?? -1 },
      { enabled: isOpen && !!requestId }
    );

  const approveMutation = trpc.appointmentRequests.approve.useMutation({
    onSuccess: () => {
      onAction();
      onClose();
    },
  });

  const rejectMutation = trpc.appointmentRequests.reject.useMutation({
    onSuccess: () => {
      onAction();
      onClose();
    },
  });

  const handleApprove = async () => {
    if (!requestId) return;
    await approveMutation.mutateAsync({
      requestId,
      responseNotes: responseNotes || undefined,
    });
  };

  const handleReject = async () => {
    if (!requestId || !responseNotes.trim()) {
      toast.error("Please enter a reason for rejection");
      return;
    }
    await rejectMutation.mutateAsync({
      requestId,
      responseNotes,
    });
  };

  const formatDateTime = (date: Date | string) => {
    const d = new Date(date);
    return d.toLocaleString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
      approved: "bg-green-100 text-green-800 border-green-200",
      rejected: "bg-red-100 text-red-800 border-red-200",
      cancelled: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return (
      <span
        className={`inline-flex items-center rounded-md border px-3 py-1 text-sm font-medium ${styles[status] || styles.pending}`}
      >
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-xl font-semibold text-gray-900">
            Appointment Request
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          </div>
        ) : request ? (
          <div className="p-6">
            {/* Status */}
            <div className="mb-6 flex items-center justify-between">
              {getStatusBadge(request.status)}
              {request.appointmentTypeDuration && (
                <span className="text-sm text-gray-500">
                  Duration: {request.appointmentTypeDuration} min
                </span>
              )}
            </div>

            {/* Appointment Type */}
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div
                  className="h-12 w-1 rounded-full"
                  style={{
                    backgroundColor: request.appointmentTypeColor || "#3B82F6",
                  }}
                />
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {request.appointmentTypeName || "Appointment"}
                  </h3>
                  {request.appointmentTypeDescription && (
                    <p className="text-sm text-gray-500">
                      {request.appointmentTypeDescription}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Date & Time */}
            <div className="mb-6 rounded-lg bg-gray-50 p-4">
              <div className="flex items-center gap-3 text-gray-700">
                <Calendar className="h-5 w-5 text-gray-400" />
                <span className="font-medium">
                  {formatDateTime(request.requestedSlot)}
                </span>
              </div>
            </div>

            {/* Client Info */}
            <div className="mb-6 space-y-3">
              <h4 className="font-medium text-gray-900">Client Information</h4>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-gray-600">
                  <User className="h-4 w-4" />
                  <span>{request.clientName}</span>
                </div>
                {request.clientEmail && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Mail className="h-4 w-4" />
                    <a
                      href={`mailto:${request.clientEmail}`}
                      className="text-blue-600 hover:underline"
                    >
                      {request.clientEmail}
                    </a>
                  </div>
                )}
                {request.clientPhone && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Phone className="h-4 w-4" />
                    <a
                      href={`tel:${request.clientPhone}`}
                      className="text-blue-600 hover:underline"
                    >
                      {request.clientPhone}
                    </a>
                  </div>
                )}
              </div>
            </div>

            {/* Client Notes */}
            {request.notes && (
              <div className="mb-6">
                <h4 className="mb-2 font-medium text-gray-900">Client Notes</h4>
                <div className="rounded-lg border border-gray-200 bg-white p-3">
                  <p className="text-gray-600">{request.notes}</p>
                </div>
              </div>
            )}

            {/* Response Notes (if already responded) */}
            {request.responseNotes && (
              <div className="mb-6">
                <h4 className="mb-2 font-medium text-gray-900">
                  Response Notes
                </h4>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <p className="text-gray-600">{request.responseNotes}</p>
                </div>
              </div>
            )}

            {/* Action Section for pending requests */}
            {request.status === "pending" && (
              <div className="space-y-4 border-t border-gray-200 pt-4">
                {isRejecting ? (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        <FileText className="mr-1 inline h-4 w-4" />
                        Reason for Rejection *
                      </label>
                      <textarea
                        value={responseNotes}
                        onChange={e => setResponseNotes(e.target.value)}
                        rows={3}
                        required
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-red-500 focus:outline-none focus:ring-1 focus:ring-red-500"
                        placeholder="Please provide a reason..."
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsRejecting(false)}
                        className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={
                          rejectMutation.isPending || !responseNotes.trim()
                        }
                        className="flex-1 rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {rejectMutation.isPending
                          ? "Rejecting..."
                          : "Confirm Rejection"}
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        Response Notes (optional)
                      </label>
                      <textarea
                        value={responseNotes}
                        onChange={e => setResponseNotes(e.target.value)}
                        rows={2}
                        className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder="Add any notes for the client..."
                      />
                    </div>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setIsRejecting(true)}
                        className="flex-1 rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
                      >
                        <X className="mr-1 inline h-4 w-4" />
                        Reject
                      </button>
                      <button
                        onClick={handleApprove}
                        disabled={approveMutation.isPending}
                        className="flex-1 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                      >
                        <Check className="mr-1 inline h-4 w-4" />
                        {approveMutation.isPending ? "Approving..." : "Approve"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Close button for non-pending requests */}
            {request.status !== "pending" && (
              <div className="border-t border-gray-200 pt-4">
                <button
                  onClick={onClose}
                  className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="p-8 text-center text-gray-500">Request not found</div>
        )}
      </div>
    </div>
  );
}

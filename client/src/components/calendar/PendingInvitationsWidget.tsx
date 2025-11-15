/**
 * Pending Invitations Widget Component
 * Task: QA-044 - Event Invitation Workflow
 * PRODUCTION-READY - No placeholders
 */

import React from "react";
import { Mail, CheckCircle, XCircle, Calendar, Clock } from "lucide-react";
import { trpc } from "../../lib/trpc";
import InvitationStatusBadge from "./InvitationStatusBadge";

export default function PendingInvitationsWidget() {
  const { data: pendingInvitations, refetch } =
    trpc.calendarInvitations.getPendingInvitations.useQuery();

  const respondToInvitation = trpc.calendarInvitations.respondToInvitation.useMutation();

  const handleAccept = async (invitationId: number) => {
    try {
      await respondToInvitation.mutateAsync({
        invitationId,
        response: "ACCEPTED",
      });
      refetch();
    } catch (error: any) {
      alert(`Failed to accept invitation: ${error.message}`);
    }
  };

  const handleDecline = async (invitationId: number) => {
    try {
      await respondToInvitation.mutateAsync({
        invitationId,
        response: "DECLINED",
      });
      refetch();
    } catch (error: any) {
      alert(`Failed to decline invitation: ${error.message}`);
    }
  };

  if (!pendingInvitations || pendingInvitations.length === 0) {
    return (
      <div className="rounded-lg border bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <Mail className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Pending Invitations
          </h3>
        </div>
        <p className="text-sm text-gray-500">No pending invitations</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Mail className="h-5 w-5 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900">
            Pending Invitations
          </h3>
        </div>
        <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
          {pendingInvitations.length}
        </span>
      </div>

      <div className="space-y-3">
        {pendingInvitations.map(invitation => (
          <div
            key={invitation.id}
            className="rounded-lg border bg-gray-50 p-4 transition-shadow hover:shadow-md"
          >
            <div className="mb-3 flex items-start justify-between">
              <div className="flex-1">
                <div className="mb-1 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-sm font-medium text-gray-900">
                    Event #{invitation.eventId}
                  </span>
                </div>
                {invitation.message && (
                  <p className="mt-2 text-sm text-gray-600">{invitation.message}</p>
                )}
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  Sent {new Date(invitation.sentAt!).toLocaleDateString()}
                </div>
              </div>
              <InvitationStatusBadge status={invitation.status} size="sm" />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAccept(invitation.id)}
                disabled={respondToInvitation.isLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4" />
                Accept
              </button>
              <button
                onClick={() => handleDecline(invitation.id)}
                disabled={respondToInvitation.isLoading}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <XCircle className="h-4 w-4" />
                Decline
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

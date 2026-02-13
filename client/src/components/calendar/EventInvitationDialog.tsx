/**
 * Event Invitation Dialog Component
 * Task: QA-044 - Event Invitation Workflow
 * PRODUCTION-READY - No placeholders
 */

import React, { useState } from "react";
import { X, UserPlus, Users, Send, Loader2 } from "lucide-react";
import { trpc } from "../../lib/trpc";
import InvitationStatusBadge from "./InvitationStatusBadge";
import { ClientCombobox } from "@/components/ui/client-combobox";

interface EventInvitationDialogProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: number;
  eventTitle: string;
}

type InviteeType = "USER" | "CLIENT" | "EXTERNAL";

interface Invitee {
  inviteeType: InviteeType;
  userId?: number;
  clientId?: number;
  externalEmail?: string;
  externalName?: string;
  role: "ORGANIZER" | "REQUIRED" | "OPTIONAL" | "OBSERVER";
}

export default function EventInvitationDialog({
  isOpen,
  onClose,
  eventId,
  eventTitle,
}: EventInvitationDialogProps) {
  const [inviteeType, setInviteeType] = useState<InviteeType>("USER");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [externalEmail, setExternalEmail] = useState("");
  const [externalName, setExternalName] = useState("");
  const [role, setRole] = useState<
    "ORGANIZER" | "REQUIRED" | "OPTIONAL" | "OBSERVER"
  >("REQUIRED");
  const [message, setMessage] = useState("");
  const [invitees, setInvitees] = useState<Invitee[]>([]);

  // Queries
  const { data: users } = trpc.userManagement.listUsers.useQuery();
  const { data: clientsData } = trpc.clients.list.useQuery({});
  const clients: Array<{ id: number; name: string }> =
    (clientsData as { clients?: Array<{ id: number; name: string }> })
      ?.clients ?? [];
  const { data: existingInvitations, refetch: refetchInvitations } =
    trpc.calendarInvitations.getInvitationsByEvent.useQuery({ eventId });

  // Mutations
  const bulkSendInvitations =
    trpc.calendarInvitations.bulkSendInvitations.useMutation();

  // Add invitee to list
  const handleAddInvitee = () => {
    if (inviteeType === "USER" && !selectedUserId) {
      console.error("Please select a user");
      return;
    }
    if (inviteeType === "CLIENT" && !selectedClientId) {
      console.error("Please select a client");
      return;
    }
    if (inviteeType === "EXTERNAL" && !externalEmail) {
      console.error("Please enter an email address");
      return;
    }

    const newInvitee: Invitee = {
      inviteeType,
      userId:
        inviteeType === "USER" ? (selectedUserId ?? undefined) : undefined,
      clientId:
        inviteeType === "CLIENT" ? (selectedClientId ?? undefined) : undefined,
      externalEmail: inviteeType === "EXTERNAL" ? externalEmail : undefined,
      externalName: inviteeType === "EXTERNAL" ? externalName : undefined,
      role,
    };

    setInvitees([...invitees, newInvitee]);

    // Reset form
    setSelectedUserId(null);
    setSelectedClientId(null);
    setExternalEmail("");
    setExternalName("");
    setRole("REQUIRED");
  };

  // Remove invitee from list
  const handleRemoveInvitee = (index: number) => {
    setInvitees(invitees.filter((_, i) => i !== index));
  };

  // Send invitations
  const handleSendInvitations = async () => {
    if (invitees.length === 0) {
      console.error("Please add at least one invitee");
      return;
    }

    try {
      await bulkSendInvitations.mutateAsync({
        eventId,
        invitees: invitees.map(inv => ({
          inviteeType: inv.inviteeType,
          userId: inv.userId,
          clientId: inv.clientId,
          externalEmail: inv.externalEmail,
          externalName: inv.externalName,
          role: inv.role,
        })),
        message: message || undefined,
      });

      console.info(`Successfully sent ${invitees.length} invitation(s)`);
      setInvitees([]);
      setMessage("");
      refetchInvitations();
      onClose();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to send invitations: ${errorMessage}`);
    }
  };

  // Get display name for invitee
  const getInviteeName = (invitee: Invitee): string => {
    if (invitee.inviteeType === "USER" && invitee.userId) {
      const user = users?.find(u => u.id === invitee.userId);
      return user?.name || `User #${invitee.userId}`;
    }
    if (invitee.inviteeType === "CLIENT" && invitee.clientId) {
      const client = clients?.find(
        (c: { id: number; name: string }) => c.id === invitee.clientId
      );
      return client?.name || `Client #${invitee.clientId}`;
    }
    if (invitee.inviteeType === "EXTERNAL") {
      return invitee.externalName || invitee.externalEmail || "External";
    }
    return "Unknown";
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-3xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <UserPlus className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                Send Invitations
              </h2>
              <p className="text-sm text-gray-600">{eventTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[70vh] overflow-y-auto p-6">
          {/* Existing Invitations */}
          {existingInvitations && existingInvitations.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-medium text-gray-700">
                Existing Invitations
              </h3>
              <div className="space-y-2">
                {existingInvitations.map(inv => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between rounded-lg border bg-gray-50 px-4 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900">
                        {inv.inviteeType === "USER" && `User #${inv.userId}`}
                        {inv.inviteeType === "CLIENT" &&
                          `Client #${inv.clientId}`}
                        {inv.inviteeType === "EXTERNAL" && inv.externalEmail}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({inv.role})
                      </span>
                    </div>
                    <InvitationStatusBadge status={inv.status} size="sm" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Add Invitee Form */}
          <div className="mb-6 rounded-lg border bg-gray-50 p-4">
            <h3 className="mb-4 text-sm font-medium text-gray-700">
              Add Invitees
            </h3>

            {/* Invitee Type Selection */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Invitee Type
              </label>
              <div className="flex gap-2">
                <button
                  onClick={() => setInviteeType("USER")}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium ${
                    inviteeType === "USER"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  User
                </button>
                <button
                  onClick={() => setInviteeType("CLIENT")}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium ${
                    inviteeType === "CLIENT"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  Client
                </button>
                <button
                  onClick={() => setInviteeType("EXTERNAL")}
                  className={`flex-1 rounded-lg border px-4 py-2 text-sm font-medium ${
                    inviteeType === "EXTERNAL"
                      ? "border-blue-500 bg-blue-50 text-blue-700"
                      : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  External
                </button>
              </div>
            </div>

            {/* Invitee Selection */}
            {inviteeType === "USER" && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Select User
                </label>
                <select
                  value={selectedUserId || ""}
                  onChange={e => setSelectedUserId(Number(e.target.value))}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Choose a user...</option>
                  {users?.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.name} ({user.email})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {inviteeType === "CLIENT" && (
              <div className="mb-4">
                <label className="mb-2 block text-sm font-medium text-gray-700">
                  Select Client
                </label>
                <ClientCombobox
                  value={selectedClientId}
                  onValueChange={setSelectedClientId}
                  clients={(clients ?? []).map(
                    (client: { id: number; name: string }) => ({
                      id: client.id,
                      name: client.name,
                    })
                  )}
                  placeholder="Choose a client..."
                  emptyText="No clients found"
                />
              </div>
            )}

            {inviteeType === "EXTERNAL" && (
              <>
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={externalEmail}
                    onChange={e => setExternalEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div className="mb-4">
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={externalName}
                    onChange={e => setExternalName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </>
            )}

            {/* Role Selection */}
            <div className="mb-4">
              <label className="mb-2 block text-sm font-medium text-gray-700">
                Role
              </label>
              <select
                value={role}
                onChange={e =>
                  setRole(
                    e.target.value as
                      | "ORGANIZER"
                      | "REQUIRED"
                      | "OPTIONAL"
                      | "OBSERVER"
                  )
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
              >
                <option value="REQUIRED">Required</option>
                <option value="OPTIONAL">Optional</option>
                <option value="OBSERVER">Observer</option>
                <option value="ORGANIZER">Organizer</option>
              </select>
            </div>

            <button
              onClick={handleAddInvitee}
              className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              Add to List
            </button>
          </div>

          {/* Invitees List */}
          {invitees.length > 0 && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-medium text-gray-700">
                Invitees to Send ({invitees.length})
              </h3>
              <div className="space-y-2">
                {invitees.map((invitee, index) => (
                  <div
                    key={`invitee-${invitee.inviteeType}-${getInviteeName(invitee)}`}
                    className="flex items-center justify-between rounded-lg border bg-white px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {getInviteeName(invitee)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {invitee.inviteeType} • {invitee.role}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => handleRemoveInvitee(index)}
                      className="rounded-lg p-1 text-red-600 hover:bg-red-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Message */}
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Message (Optional)
            </label>
            <textarea
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={3}
              placeholder="Add a personal message to the invitation..."
              className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t bg-gray-50 px-6 py-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSendInvitations}
            disabled={invitees.length === 0 || bulkSendInvitations.isPending}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {bulkSendInvitations.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4" />
                Send Invitations
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

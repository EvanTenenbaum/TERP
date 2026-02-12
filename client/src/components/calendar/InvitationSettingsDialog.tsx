/**
 * Invitation Settings Dialog Component
 * Task: QA-044 - Event Invitation Workflow
 * PRODUCTION-READY - No placeholders
 */

import React, { useState, useEffect } from "react";
import { X, Settings, Bell, CheckCircle, Loader2 } from "lucide-react";
import { trpc } from "../../lib/trpc";

interface InvitationSettingsDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InvitationSettingsDialog({
  isOpen,
  onClose,
}: InvitationSettingsDialogProps) {
  const [autoAcceptAll, setAutoAcceptAll] = useState(false);
  const [autoAcceptFromOrganizers, setAutoAcceptFromOrganizers] = useState<
    number[]
  >([]);
  const [autoAcceptByEventType, setAutoAcceptByEventType] = useState<string[]>(
    []
  );
  const [autoAcceptByModule, setAutoAcceptByModule] = useState<string[]>([]);
  const [notifyOnInvitation, setNotifyOnInvitation] = useState(true);
  const [notifyOnAutoAccept, setNotifyOnAutoAccept] = useState(true);

  // Queries
  const { data: settings, refetch } =
    trpc.calendarInvitations.getInvitationSettings.useQuery();
  const { data: users } = trpc.userManagement.listUsers.useQuery();

  // Mutations
  const updateSettings =
    trpc.calendarInvitations.updateInvitationSettings.useMutation();

  // Load settings
  useEffect(() => {
    if (settings) {
      setAutoAcceptAll(settings.autoAcceptAll);
      setAutoAcceptFromOrganizers(
        (settings.autoAcceptFromOrganizers as number[]) || []
      );
      setAutoAcceptByEventType(
        (settings.autoAcceptByEventType as string[]) || []
      );
      setAutoAcceptByModule((settings.autoAcceptByModule as string[]) || []);
      setNotifyOnInvitation(settings.notifyOnInvitation);
      setNotifyOnAutoAccept(settings.notifyOnAutoAccept);
    }
  }, [settings]);

  // Save settings
  const handleSave = async () => {
    try {
      await updateSettings.mutateAsync({
        autoAcceptAll,
        autoAcceptFromOrganizers,
        autoAcceptByEventType,
        autoAcceptByModule,
        notifyOnInvitation,
        notifyOnAutoAccept,
      });
      refetch();
      console.info("Settings saved successfully");
      onClose();
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      console.error(`Failed to save settings: ${errorMessage}`);
    }
  };

  // Toggle organizer in auto-accept list
  const toggleOrganizer = (userId: number) => {
    if (autoAcceptFromOrganizers.includes(userId)) {
      setAutoAcceptFromOrganizers(
        autoAcceptFromOrganizers.filter(id => id !== userId)
      );
    } else {
      setAutoAcceptFromOrganizers([...autoAcceptFromOrganizers, userId]);
    }
  };

  // Toggle event type in auto-accept list
  const toggleEventType = (type: string) => {
    if (autoAcceptByEventType.includes(type)) {
      setAutoAcceptByEventType(autoAcceptByEventType.filter(t => t !== type));
    } else {
      setAutoAcceptByEventType([...autoAcceptByEventType, type]);
    }
  };

  // Toggle module in auto-accept list
  const toggleModule = (module: string) => {
    if (autoAcceptByModule.includes(module)) {
      setAutoAcceptByModule(autoAcceptByModule.filter(m => m !== module));
    } else {
      setAutoAcceptByModule([...autoAcceptByModule, module]);
    }
  };

  const eventTypes = [
    "MEETING",
    "TASK",
    "DEADLINE",
    "REMINDER",
    "CALL",
    "EMAIL",
    "APPOINTMENT",
    "REVIEW",
    "TRAINING",
    "OTHER",
  ];

  const modules = [
    "GENERAL",
    "SALES",
    "INVENTORY",
    "ACCOUNTING",
    "CLIENTS",
    "VENDORS",
    "ORDERS",
    "COLLECTIONS",
    "COMPLIANCE",
    "HR",
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <Settings className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900">
              Invitation Settings
            </h2>
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
          {/* Auto-Accept All */}
          <div className="mb-6 rounded-lg border bg-gray-50 p-4">
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={autoAcceptAll}
                onChange={e => setAutoAcceptAll(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <div className="text-sm font-medium text-gray-900">
                  Auto-accept all invitations
                </div>
                <div className="text-xs text-gray-500">
                  Automatically accept all event invitations
                </div>
              </div>
            </label>
          </div>

          {/* Auto-Accept from Specific Organizers */}
          {!autoAcceptAll && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-medium text-gray-700">
                Auto-accept from specific organizers
              </h3>
              <div className="space-y-2 rounded-lg border bg-gray-50 p-4">
                {users?.map(user => (
                  <label key={user.id} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={autoAcceptFromOrganizers.includes(user.id)}
                      onChange={() => toggleOrganizer(user.id)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">{user.name}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Auto-Accept by Event Type */}
          {!autoAcceptAll && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-medium text-gray-700">
                Auto-accept by event type
              </h3>
              <div className="grid grid-cols-2 gap-2 rounded-lg border bg-gray-50 p-4">
                {eventTypes.map(type => (
                  <label key={type} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={autoAcceptByEventType.includes(type)}
                      onChange={() => toggleEventType(type)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">{type}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Auto-Accept by Module */}
          {!autoAcceptAll && (
            <div className="mb-6">
              <h3 className="mb-3 text-sm font-medium text-gray-700">
                Auto-accept by module
              </h3>
              <div className="grid grid-cols-2 gap-2 rounded-lg border bg-gray-50 p-4">
                {modules.map(module => (
                  <label key={module} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={autoAcceptByModule.includes(module)}
                      onChange={() => toggleModule(module)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-900">{module}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Notification Preferences */}
          <div className="mb-6">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-medium text-gray-700">
              <Bell className="h-4 w-4" />
              Notification Preferences
            </h3>
            <div className="space-y-3 rounded-lg border bg-gray-50 p-4">
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={notifyOnInvitation}
                  onChange={e => setNotifyOnInvitation(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Notify on new invitations
                  </div>
                  <div className="text-xs text-gray-500">
                    Receive notifications when you receive new event invitations
                  </div>
                </div>
              </label>
              <label className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={notifyOnAutoAccept}
                  onChange={e => setNotifyOnAutoAccept(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    Notify on auto-accept
                  </div>
                  <div className="text-xs text-gray-500">
                    Receive notifications when invitations are auto-accepted
                  </div>
                </div>
              </label>
            </div>
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
            onClick={handleSave}
            disabled={updateSettings.isPending}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {updateSettings.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

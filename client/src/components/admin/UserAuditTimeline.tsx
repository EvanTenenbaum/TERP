import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  History,
  User,
  Shield,
  Key,
  LogIn,
  LogOut,
  UserPlus,
  Trash2,
  Clock,
} from "lucide-react";

interface UserAuditTimelineProps {
  userId: number;
}

/**
 * Format action type to human-readable string
 */
function formatAction(action: string): {
  label: string;
  icon: React.ReactNode;
} {
  const actionMap: Record<string, { label: string; icon: React.ReactNode }> = {
    USER_LOGIN: { label: "Logged in", icon: <LogIn className="h-4 w-4" /> },
    USER_LOGOUT: { label: "Logged out", icon: <LogOut className="h-4 w-4" /> },
    PERMISSION_CHANGED: {
      label: "Permissions changed",
      icon: <Shield className="h-4 w-4" />,
    },
    CONFIG_CHANGED: {
      label: "Profile updated",
      icon: <User className="h-4 w-4" />,
    },
    "user.create": {
      label: "Account created",
      icon: <UserPlus className="h-4 w-4" />,
    },
    "user.delete": {
      label: "Account deleted",
      icon: <Trash2 className="h-4 w-4" />,
    },
    "user.password_reset": {
      label: "Password reset",
      icon: <Key className="h-4 w-4" />,
    },
    "password.change": {
      label: "Password changed",
      icon: <Key className="h-4 w-4" />,
    },
    "profile.update": {
      label: "Profile updated",
      icon: <User className="h-4 w-4" />,
    },
  };

  // Check for action in metadata style (e.g., "user.create")
  if (actionMap[action]) {
    return actionMap[action];
  }

  // Default
  return {
    label: action.replace(/_/g, " ").toLowerCase(),
    icon: <History className="h-4 w-4" />,
  };
}

/**
 * UserAuditTimeline Component
 *
 * Displays audit trail for a specific user (UX-055)
 */
export function UserAuditTimeline({ userId }: UserAuditTimelineProps) {
  const [actionFilter, setActionFilter] = useState<string | null>(null);

  const {
    data: auditLogs,
    isLoading,
    error,
  } = trpc.auditLogs.getUserHistory.useQuery({
    userId,
    action: actionFilter,
    limit: 50,
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-9 w-40" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={`skeleton-${i}`} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <p>Failed to load activity history</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold flex items-center gap-2">
          <History className="h-4 w-4" />
          Activity History
        </h3>
        <Select
          value={actionFilter || "all"}
          onValueChange={v => setActionFilter(v === "all" ? null : v)}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All actions" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All actions</SelectItem>
            <SelectItem value="user.create">Created</SelectItem>
            <SelectItem value="CONFIG_CHANGED">Updated</SelectItem>
            <SelectItem value="user.delete">Deleted</SelectItem>
            <SelectItem value="user.password_reset">Password Reset</SelectItem>
            <SelectItem value="PERMISSION_CHANGED">Permissions</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {auditLogs && auditLogs.length > 0 ? (
          auditLogs.map(log => {
            // Get action from metadata if available, otherwise from log.action
            const actionKey =
              (log.metadata as { action?: string })?.action || log.action;
            const { label, icon } = formatAction(actionKey);

            return (
              <div
                key={log.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="mt-0.5 text-muted-foreground">{icon}</div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    by {log.actorName || `User #${log.actorId}` || "System"}
                  </p>
                  {log.reason && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Reason:{" "}
                      {typeof log.reason === "string"
                        ? log.reason
                        : JSON.stringify(log.reason)}
                    </p>
                  )}
                </div>
                <time className="text-xs text-muted-foreground flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {log.createdAt
                    ? new Date(log.createdAt).toLocaleString()
                    : "Unknown"}
                </time>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No activity recorded
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Invitation Status Badge Component
 * Task: QA-044 - Event Invitation Workflow
 * PRODUCTION-READY - No placeholders
 */

import React from "react";
import { CheckCircle, XCircle, Clock, Send, Ban, AlertCircle } from "lucide-react";

interface InvitationStatusBadgeProps {
  status:
    | "DRAFT"
    | "PENDING"
    | "ACCEPTED"
    | "DECLINED"
    | "AUTO_ACCEPTED"
    | "CANCELLED"
    | "EXPIRED";
  size?: "sm" | "md" | "lg";
}

export default function InvitationStatusBadge({
  status,
  size = "md",
}: InvitationStatusBadgeProps) {
  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    md: "text-sm px-2.5 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const iconSizes = {
    sm: 12,
    md: 14,
    lg: 16,
  };

  const statusConfig = {
    DRAFT: {
      label: "Draft",
      color: "bg-gray-100 text-gray-700 border-gray-300",
      icon: Clock,
    },
    PENDING: {
      label: "Pending",
      color: "bg-yellow-100 text-yellow-700 border-yellow-300",
      icon: Send,
    },
    ACCEPTED: {
      label: "Accepted",
      color: "bg-green-100 text-green-700 border-green-300",
      icon: CheckCircle,
    },
    DECLINED: {
      label: "Declined",
      color: "bg-red-100 text-red-700 border-red-300",
      icon: XCircle,
    },
    AUTO_ACCEPTED: {
      label: "Auto-Accepted",
      color: "bg-blue-100 text-blue-700 border-blue-300",
      icon: CheckCircle,
    },
    CANCELLED: {
      label: "Cancelled",
      color: "bg-gray-100 text-gray-600 border-gray-300",
      icon: Ban,
    },
    EXPIRED: {
      label: "Expired",
      color: "bg-orange-100 text-orange-700 border-orange-300",
      icon: AlertCircle,
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${config.color} ${sizeClasses[size]}`}
    >
      <Icon size={iconSizes[size]} />
      {config.label}
    </span>
  );
}

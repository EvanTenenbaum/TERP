import { memo } from "react";
import { trpc } from "@/lib/trpc";
import { Card } from "@/components/ui/card";
import {
  FileText,
  Edit,
  MessageSquare,
  Share2,
  Archive,
  ArchiveRestore,
  Pin,
  PinOff,
  FileCheck,
  Loader2,
  Clock,
  AlertCircle,
  RefreshCw
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ActivityLogPanelProps {
  noteId: number;
}

const activityIcons = {
  CREATED: FileText,
  UPDATED: Edit,
  COMMENTED: MessageSquare,
  SHARED: Share2,
  ARCHIVED: Archive,
  RESTORED: ArchiveRestore,
  PINNED: Pin,
  UNPINNED: PinOff,
  TEMPLATE_APPLIED: FileCheck,
};

const activityColors = {
  CREATED: "text-green-600",
  UPDATED: "text-blue-600",
  COMMENTED: "text-purple-600",
  SHARED: "text-orange-600",
  ARCHIVED: "text-gray-600",
  RESTORED: "text-green-600",
  PINNED: "text-yellow-600",
  UNPINNED: "text-gray-600",
  TEMPLATE_APPLIED: "text-indigo-600",
};

const activityLabels = {
  CREATED: "created this note",
  UPDATED: "updated this note",
  COMMENTED: "added a comment",
  SHARED: "shared this note",
  ARCHIVED: "archived this note",
  RESTORED: "restored this note",
  PINNED: "pinned this note",
  UNPINNED: "unpinned this note",
  TEMPLATE_APPLIED: "applied a template",
};

export const ActivityLogPanel = memo(function ActivityLogPanel({ noteId }: ActivityLogPanelProps) {
  const { data: activities, isLoading, error, refetch } = trpc.freeformNotes.activity.list.useQuery(
    { noteId, limit: 50 },
    { refetchInterval: false } // Manual refresh only (performance optimization)
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // BUG-056: Added proper error handling with retry capability
  if (error) {
    console.error('[ActivityLogPanel] Error:', error);
    return (
      <div className="text-center py-8">
        <AlertCircle className="h-12 w-12 mx-auto mb-2 text-destructive" />
        <p className="text-sm font-medium text-destructive">Failed to load activity</p>
        <p className="text-xs text-muted-foreground mt-1">{error.message || 'An unexpected error occurred'}</p>
        <button
          onClick={() => refetch()}
          className="mt-3 inline-flex items-center gap-1 text-sm text-primary hover:underline"
        >
          <RefreshCw className="h-3 w-3" />
          Retry
        </button>
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-2 opacity-50" />
        <p>No activity yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {activities.map((activity) => {
        const Icon = activityIcons[activity.activityType];
        const color = activityColors[activity.activityType];
        const label = activityLabels[activity.activityType];

        return (
          <Card key={activity.id} className="p-3">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-full bg-muted ${color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm">
                  <span className="font-semibold">{activity.userName || 'Unknown User'}</span>
                  {' '}
                  <span className="text-muted-foreground">{label}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                </p>
                {activity.metadata ? (
                  <div className="mt-2 text-xs text-muted-foreground bg-muted p-2 rounded">
                    <pre className="whitespace-pre-wrap">
                      {JSON.stringify(activity.metadata, null, 2)}
                    </pre>
                  </div>
                ) : null}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
});
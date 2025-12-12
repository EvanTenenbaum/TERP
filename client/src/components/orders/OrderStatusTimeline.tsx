import { trpc } from '@/lib/trpc';
import { format } from 'date-fns';
import { CheckCircle2, Circle } from 'lucide-react';

interface OrderStatusTimelineProps {
  orderId: number;
}

export function OrderStatusTimeline({ orderId }: OrderStatusTimelineProps) {
  const { data: history, isLoading } = trpc.orders.getOrderStatusHistory.useQuery({ orderId });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading history...</div>;
  }

  if (!history || history.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No status history available
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {history.map((entry, index) => (
        <div key={entry.id} className="flex gap-3">
          <div className="flex flex-col items-center">
            {index === history.length - 1 ? (
              <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
            ) : (
              <Circle className="h-5 w-5 text-gray-400 flex-shrink-0" />
            )}
            {index < history.length - 1 && (
              <div className="w-0.5 h-full bg-gray-200 my-1 flex-1" />
            )}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <span className="font-medium">{entry.fulfillmentStatus}</span>
              <span className="text-sm text-muted-foreground">
                {format(new Date(entry.changedAt), 'MMM d, h:mm a')}
              </span>
            </div>
            {entry.changedByName && (
              <div className="text-sm text-muted-foreground mt-1">
                by {entry.changedByName}
              </div>
            )}
            {entry.notes && (
              <p className="text-sm text-muted-foreground mt-1">{entry.notes}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}


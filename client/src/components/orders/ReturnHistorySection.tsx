import { trpc } from '@/lib/trpc';
import { format } from 'date-fns';
import { PackageX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface ReturnHistorySectionProps {
  orderId: number;
}

export function ReturnHistorySection({ orderId }: ReturnHistorySectionProps) {
  const { data: returns, isLoading } = trpc.orders.getOrderReturns.useQuery({ orderId });

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading returns...</div>;
  }

  if (!returns || returns.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-4">
        No returns for this order
      </div>
    );
  }

  const getReasonLabel = (reason: string) => {
    const labels: Record<string, string> = {
      DEFECTIVE: 'Defective',
      WRONG_ITEM: 'Wrong Item',
      NOT_AS_DESCRIBED: 'Not as Described',
      CUSTOMER_CHANGED_MIND: 'Customer Changed Mind',
      OTHER: 'Other',
    };
    return labels[reason] || reason;
  };

  const getReasonColor = (reason: string) => {
    const colors: Record<string, string> = {
      DEFECTIVE: 'bg-red-100 text-red-800 border-red-300',
      WRONG_ITEM: 'bg-orange-100 text-orange-800 border-orange-300',
      NOT_AS_DESCRIBED: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      CUSTOMER_CHANGED_MIND: 'bg-blue-100 text-blue-800 border-blue-300',
      OTHER: 'bg-gray-100 text-gray-800 border-gray-300',
    };
    return colors[reason] || colors.OTHER;
  };

  return (
    <div className="space-y-3">
      {returns.map((returnRecord) => {
        const items = JSON.parse(returnRecord.items as string) as Array<{ batchId: number; quantity: number }>;
        return (
          <div key={returnRecord.id} className="border rounded-lg p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <PackageX className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="font-medium">Return #{returnRecord.id}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(returnRecord.processedAt), 'MMM d, yyyy h:mm a')}
                  </div>
                </div>
              </div>
              <Badge variant="outline" className={getReasonColor(returnRecord.reason)}>
                {getReasonLabel(returnRecord.reason)}
              </Badge>
            </div>
            
            <div className="space-y-2">
              <div className="text-sm">
                <span className="text-muted-foreground">Items returned:</span>
                <span className="ml-2 font-medium">{items.length}</span>
              </div>
              
              {returnRecord.processedByName && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Processed by:</span>
                  <span className="ml-2">{returnRecord.processedByName}</span>
                </div>
              )}
              
              {returnRecord.notes && (
                <div className="text-sm mt-2 p-2 bg-muted/50 rounded">
                  <span className="text-muted-foreground">Notes:</span>
                  <p className="mt-1">{returnRecord.notes}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}


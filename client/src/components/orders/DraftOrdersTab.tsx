import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { FileText, CheckCircle2, Search } from 'lucide-react';
import { format } from 'date-fns';
import { EmptyState } from '@/components/ui/EmptyState';
import { OrderListSkeleton } from '@/components/ui/skeletons';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DraftOrdersTabProps {
  draftStats: { total: number };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  draftOrders: any[];
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filteredDrafts: any[];
  loadingDrafts: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleViewOrder: (order: any) => void;
  setLocation: (path: string) => void;
  getClientName: (id: number) => string;
}

export function DraftOrdersTab({
  draftStats,
  draftOrders,
  searchQuery,
  setSearchQuery,
  filteredDrafts,
  loadingDrafts,
  handleViewOrder,
  setLocation,
  getClientName
}: DraftOrdersTabProps) {
  return (
    <div className="space-y-6">
      {/* Draft Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Draft Orders</p>
                <p className="text-2xl font-bold">{draftStats.total}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Value</p>
                <p className="text-2xl font-bold">
                  ${draftOrders?.reduce((sum, o) => sum + parseFloat(o.total), 0).toLocaleString('en-US', { minimumFractionDigits: 2 }) || '0.00'}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              placeholder="Search by order number or client name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
              aria-label="Search draft orders"
            />
          </div>
        </CardContent>
      </Card>

      {/* Draft Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Draft Orders ({filteredDrafts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingDrafts ? (
            <OrderListSkeleton count={3} />
          ) : filteredDrafts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No draft orders"
              description={
                searchQuery
                  ? "No draft orders match your search. Try a different search term."
                  : "Create a draft order to save work in progress without reducing inventory."
              }
              actionLabel={!searchQuery ? "Create Draft Order" : undefined}
              onAction={!searchQuery ? () => setLocation("/orders/create") : undefined}
              className="py-12"
            />
          ) : (
            <div className="space-y-3">
              {filteredDrafts.map((order) => (
                <div
                  key={order.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleViewOrder(order)}
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{order.orderNumber}</h3>
                        <Badge variant="secondary">Draft</Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <div>Client: {getClientName(order.clientId)}</div>
                        <div>
                          Created: {order.createdAt ? format(new Date(order.createdAt), 'MMM d, yyyy h:mm a') : 'N/A'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">
                        ${parseFloat(order.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {(order.items as any[])?.length || 0} items
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, CheckSquare } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { format } from 'date-fns';
import { EmptyState } from '@/components/ui/EmptyState';
import { OrderListSkeleton } from '@/components/ui/skeletons';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { DataCardSection } from '@/components/data-cards';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface ConfirmedOrdersTabProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  statusFilter: string;
  setStatusFilter: (status: string) => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  filteredConfirmed: any[];
  loadingConfirmed: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  handleViewOrder: (order: any) => void;
  getClientName: (id: number) => string;
}

export function ConfirmedOrdersTab({
  searchQuery,
  setSearchQuery,
  statusFilter,
  setStatusFilter,
  filteredConfirmed,
  loadingConfirmed,
  handleViewOrder,
  getClientName
}: ConfirmedOrdersTabProps) {
  return (
    <div className="space-y-6">
      {/* Confirmed Statistics Cards */}
      <DataCardSection moduleId="orders" />

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search by order number or client name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  aria-label="Search confirmed orders"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" aria-label="Filter by fulfillment status">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="PACKED">Packed</SelectItem>
                <SelectItem value="SHIPPED">Shipped</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Confirmed Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Confirmed Orders ({filteredConfirmed.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingConfirmed ? (
            <OrderListSkeleton count={5} />
          ) : filteredConfirmed.length === 0 ? (
            <EmptyState
              icon={CheckSquare}
              title="No confirmed orders found"
              description={
                searchQuery
                  ? "No confirmed orders match your search."
                  : "Orders will appear here once confirmed."
              }
              className="py-12"
            />
          ) : (
            <div className="space-y-3">
              {filteredConfirmed.map((order) => (
                <div
                  key={order.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => handleViewOrder(order)}
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="font-semibold text-lg">{order.orderNumber}</h3>
                        <OrderStatusBadge status={order.fulfillmentStatus || 'PENDING'} />
                        {order.saleStatus && (
                          <Badge variant="outline" className="text-xs">
                            {order.saleStatus}
                          </Badge>
                        )}
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

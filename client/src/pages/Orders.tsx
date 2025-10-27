import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { OrderStatusBadge } from '@/components/orders/OrderStatusBadge';
import { OrderStatusTimeline } from '@/components/orders/OrderStatusTimeline';
import { ShipOrderModal } from '@/components/orders/ShipOrderModal';
import { ProcessReturnModal } from '@/components/orders/ProcessReturnModal';
import { ReturnHistorySection } from '@/components/orders/ReturnHistorySection';
import { 
  Search, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock,
  Eye,
  PlusCircle,
  PackageX
} from 'lucide-react';
import { format } from 'date-fns';
import { useLocation } from 'wouter';

export default function Orders() {
  const [, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showShipModal, setShowShipModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  
  // Apply URL params on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    
    if (status && ['PENDING', 'PACKED', 'SHIPPED'].includes(status)) {
      setStatusFilter(status);
    }
  }, []);

  // Fetch clients for name lookup
  const { data: clients } = trpc.clients.list.useQuery({ limit: 1000 });
  
  // Helper to get client name
  const getClientName = (clientId: number) => {
    const client = clients?.find(c => c.id === clientId);
    return client?.name || 'Unknown';
  };

  // Fetch all SALE orders
  const { data: orders, isLoading, refetch } = trpc.orders.getAll.useQuery({
    orderType: 'SALE',
    saleStatus: statusFilter === 'ALL' ? undefined : statusFilter,
  });

  // Filter orders by search query
  const filteredOrders = orders?.filter((order) => {
    const searchLower = searchQuery.toLowerCase();
    const clientName = getClientName(order.clientId);
    return (
      order.orderNumber.toLowerCase().includes(searchLower) ||
      clientName.toLowerCase().includes(searchLower)
    );
  }) || [];
  
  // Calculate statistics
  const stats = {
    pending: orders?.filter(o => o.fulfillmentStatus === 'PENDING').length || 0,
    packed: orders?.filter(o => o.fulfillmentStatus === 'PACKED').length || 0,
    shipped: orders?.filter(o => o.fulfillmentStatus === 'SHIPPED').length || 0,
    total: orders?.length || 0,
  };

  const handleViewOrder = (order: any) => {
    setSelectedOrder(order);
  };

  const handleCloseDetail = () => {
    setSelectedOrder(null);
  };

  const handleStatusChange = () => {
    setShowShipModal(true);
  };

  const handleStatusChangeSuccess = () => {
    refetch();
    setSelectedOrder(null);
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground mt-1">
            Manage sales orders and track fulfillment status
          </p>
        </div>
        <Button onClick={() => setLocation('/orders/create')}>
          <PlusCircle className="h-4 w-4 mr-2" />
          New Order
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter('PENDING')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Pending</p>
                <p className="text-2xl font-bold">{stats.pending}</p>
              </div>
              <Clock className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter('PACKED')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Packed</p>
                <p className="text-2xl font-bold">{stats.packed}</p>
              </div>
              <Package className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter('SHIPPED')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Shipped</p>
                <p className="text-2xl font-bold">{stats.shipped}</p>
              </div>
              <Truck className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter('ALL')}>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order number or client name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-48">
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

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Orders ({filteredOrders.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-12 text-muted-foreground">
              Loading orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              No orders found
            </div>
          ) : (
            <div className="space-y-3">
              {filteredOrders.map((order) => (
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
                        {(order.items as any[])?.length || 0} items
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={(e) => {
                      e.stopPropagation();
                      handleViewOrder(order);
                    }}>
                      <Eye className="h-4 w-4 mr-2" />
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Detail Sheet */}
      <Sheet open={!!selectedOrder} onOpenChange={handleCloseDetail}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedOrder && (
            <>
              <SheetHeader>
                <SheetTitle>Order {selectedOrder.orderNumber}</SheetTitle>
              </SheetHeader>
              
              <div className="mt-6 space-y-6">
                {/* Status Section */}
                <div>
                  <h3 className="font-semibold mb-3">Fulfillment Status</h3>
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <OrderStatusBadge 
                      status={selectedOrder.fulfillmentStatus || 'PENDING'} 
                      className="text-base px-4 py-2"
                    />
                    <div className="flex gap-2">
                      {selectedOrder.fulfillmentStatus === 'SHIPPED' && (
                        <Button variant="outline" onClick={() => setShowReturnModal(true)}>
                          <PackageX className="h-4 w-4 mr-2" />
                          Process Return
                        </Button>
                      )}
                      {selectedOrder.fulfillmentStatus !== 'SHIPPED' && (
                        <Button onClick={handleStatusChange}>
                          {selectedOrder.fulfillmentStatus === 'PENDING' ? (
                            <>
                              <Package className="h-4 w-4 mr-2" />
                              Mark as Packed
                            </>
                          ) : (
                            <>
                              <Truck className="h-4 w-4 mr-2" />
                              Mark as Shipped
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Status Timeline */}
                <div>
                  <h3 className="font-semibold mb-3">Status History</h3>
                  <OrderStatusTimeline orderId={selectedOrder.id} />
                </div>

                <Separator />

                {/* Order Details */}
                <div>
                  <h3 className="font-semibold mb-3">Order Details</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Client:</span>
                      <span className="font-medium">{getClientName(selectedOrder.clientId)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Status:</span>
                      <Badge variant="outline">{selectedOrder.saleStatus}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Terms:</span>
                      <span>{selectedOrder.paymentTerms || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{selectedOrder.createdAt ? format(new Date(selectedOrder.createdAt), 'MMM d, yyyy h:mm a') : 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Order Items */}
                <div>
                  <h3 className="font-semibold mb-3">Order Items</h3>
                  <div className="space-y-2">
                    {(selectedOrder.items as any[])?.map((item: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium">{item.displayName}</div>
                            <div className="text-sm text-muted-foreground">
                              Qty: {item.quantity} × ${item.unitPrice.toFixed(2)}
                            </div>
                          </div>
                          <div className="font-semibold">
                            ${item.lineTotal.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                {/* Totals */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal:</span>
                    <span>${parseFloat(selectedOrder.subtotal).toFixed(2)}</span>
                  </div>
                  {parseFloat(selectedOrder.tax) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax:</span>
                      <span>${parseFloat(selectedOrder.tax).toFixed(2)}</span>
                    </div>
                  )}
                  {parseFloat(selectedOrder.discount) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Discount:</span>
                      <span>-${parseFloat(selectedOrder.discount).toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span>${parseFloat(selectedOrder.total).toFixed(2)}</span>
                  </div>
                </div>

                {selectedOrder.notes && (
                  <>
                    <Separator />
                    <div>
                      <h3 className="font-semibold mb-2">Notes</h3>
                      <p className="text-sm text-muted-foreground">{selectedOrder.notes}</p>
                    </div>
                  </>
                )}

                {/* Returns History */}
                <Separator />
                <div>
                  <h3 className="font-semibold mb-3">Returns History</h3>
                  <ReturnHistorySection orderId={selectedOrder.id} />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      {/* Ship Order Modal */}
      {selectedOrder && (
        <ShipOrderModal
          orderId={selectedOrder.id}
          currentStatus={selectedOrder.fulfillmentStatus || 'PENDING'}
          open={showShipModal}
          onClose={() => setShowShipModal(false)}
          onSuccess={handleStatusChangeSuccess}
        />
      )}

      {/* Process Return Modal */}
      {selectedOrder && (
        <ProcessReturnModal
          orderId={selectedOrder.id}
          orderItems={(selectedOrder.items as any[])?.map((item: any) => ({
            batchId: item.batchId,
            displayName: item.displayName,
            quantity: item.quantity,
          })) || []}
          open={showReturnModal}
          onClose={() => setShowReturnModal(false)}
          onSuccess={handleStatusChangeSuccess}
        />
      )}
    </div>
  );
}


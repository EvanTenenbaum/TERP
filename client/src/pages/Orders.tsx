import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  PackageX,
  Download,
  FileText,
  CheckSquare
} from 'lucide-react';
import { format } from 'date-fns';
import { useLocation } from 'wouter';
import { exportToCSVWithLabels } from '@/utils/exportToCSV';
import { toast } from 'sonner';

export default function Orders() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<'draft' | 'confirmed'>('confirmed');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showShipModal, setShowShipModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  
  // Fetch clients for name lookup
  const { data: clients } = trpc.clients.list.useQuery({ limit: 1000 });
  
  // Helper to get client name
  const getClientName = (clientId: number) => {
    const client = clients?.find(c => c.id === clientId);
    return client?.name || 'Unknown';
  };

  // Fetch draft orders
  const { data: draftOrders, isLoading: loadingDrafts, refetch: refetchDrafts } = trpc.orders.getAll.useQuery({
    isDraft: true,
  });

  // Fetch confirmed orders
  const { data: confirmedOrders, isLoading: loadingConfirmed, refetch: refetchConfirmed } = trpc.orders.getAll.useQuery({
    isDraft: false,
    fulfillmentStatus: statusFilter === 'ALL' ? undefined : statusFilter,
  });

  // Filter orders by search query
  const filteredDrafts = draftOrders?.filter((order) => {
    const searchLower = searchQuery.toLowerCase();
    const clientName = getClientName(order.clientId);
    return (
      order.orderNumber.toLowerCase().includes(searchLower) ||
      clientName.toLowerCase().includes(searchLower)
    );
  }) || [];

  const filteredConfirmed = confirmedOrders?.filter((order) => {
    const searchLower = searchQuery.toLowerCase();
    const clientName = getClientName(order.clientId);
    return (
      order.orderNumber.toLowerCase().includes(searchLower) ||
      clientName.toLowerCase().includes(searchLower)
    );
  }) || [];
  
  // Calculate statistics
  const draftStats = {
    total: draftOrders?.length || 0,
  };

  const confirmedStats = {
    pending: confirmedOrders?.filter(o => o.fulfillmentStatus === 'PENDING').length || 0,
    packed: confirmedOrders?.filter(o => o.fulfillmentStatus === 'PACKED').length || 0,
    shipped: confirmedOrders?.filter(o => o.fulfillmentStatus === 'SHIPPED').length || 0,
    total: confirmedOrders?.length || 0,
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
    refetchConfirmed();
    setSelectedOrder(null);
  };

  const handleConfirmDraft = () => {
    setShowConfirmModal(true);
  };

  const handleEditDraft = () => {
    if (selectedOrder) {
      setLocation(`/orders/create?draftId=${selectedOrder.id}`);
    }
  };

  // Export handler
  const handleExport = () => {
    const ordersToExport = activeTab === 'draft' ? filteredDrafts : filteredConfirmed;
    
    if (!ordersToExport || ordersToExport.length === 0) {
      toast.error('No orders to export');
      return;
    }
    
    try {
      const exportData = ordersToExport.map(order => ({
        id: order.id,
        orderNumber: order.orderNumber,
        clientName: getClientName(order.clientId),
        totalAmount: parseFloat(order.total),
        status: order.isDraft ? 'DRAFT' : order.fulfillmentStatus,
        paymentStatus: order.saleStatus || 'N/A',
        createdAt: order.createdAt ? format(new Date(order.createdAt), 'yyyy-MM-dd') : '',
        confirmedAt: order.confirmedAt ? format(new Date(order.confirmedAt), 'yyyy-MM-dd') : '',
      }));
      
      exportToCSVWithLabels(
        exportData,
        [
          { key: 'id', label: 'Order ID' },
          { key: 'orderNumber', label: 'Order Number' },
          { key: 'clientName', label: 'Client' },
          { key: 'totalAmount', label: 'Total Amount' },
          { key: 'status', label: 'Status' },
          { key: 'paymentStatus', label: 'Payment Status' },
          { key: 'createdAt', label: 'Created Date' },
          { key: 'confirmedAt', label: 'Confirmed Date' },
        ],
        `${activeTab}-orders`
      );
      toast.success(`Exported ${ordersToExport.length} orders`);
    } catch (error: any) {
      toast.error(error.message || 'Export failed');
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground mt-1">
            Manage draft and confirmed orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleExport}
            variant="outline"
            disabled={(activeTab === 'draft' ? filteredDrafts : filteredConfirmed).length === 0}
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={() => setLocation('/orders/create')}>
            <PlusCircle className="h-4 w-4 mr-2" />
            New Order
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'draft' | 'confirmed')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="draft" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Draft Orders ({draftStats.total})
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="flex items-center gap-2">
            <CheckSquare className="h-4 w-4" />
            Confirmed Orders ({confirmedStats.total})
          </TabsTrigger>
        </TabsList>

        {/* Draft Orders Tab */}
        <TabsContent value="draft" className="space-y-6">
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
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by order number or client name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
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
                <div className="text-center py-12 text-muted-foreground">
                  Loading draft orders...
                </div>
              ) : filteredDrafts.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No draft orders found
                </div>
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
        </TabsContent>

        {/* Confirmed Orders Tab */}
        <TabsContent value="confirmed" className="space-y-6">
          {/* Confirmed Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setStatusFilter('PENDING')}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Pending</p>
                    <p className="text-2xl font-bold">{confirmedStats.pending}</p>
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
                    <p className="text-2xl font-bold">{confirmedStats.packed}</p>
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
                    <p className="text-2xl font-bold">{confirmedStats.shipped}</p>
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
                    <p className="text-2xl font-bold">{confirmedStats.total}</p>
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

          {/* Confirmed Orders List */}
          <Card>
            <CardHeader>
              <CardTitle>Confirmed Orders ({filteredConfirmed.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {loadingConfirmed ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading orders...
                </div>
              ) : filteredConfirmed.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No confirmed orders found
                </div>
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
        </TabsContent>
      </Tabs>

      {/* Order Detail Sheet (reusing existing component structure) */}
      {selectedOrder && (
        <Sheet open={!!selectedOrder} onOpenChange={(open) => !open && handleCloseDetail()}>
          <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle className="flex items-center gap-3">
                <span>{selectedOrder.orderNumber}</span>
                {selectedOrder.isDraft ? (
                  <Badge variant="secondary">Draft</Badge>
                ) : (
                  <OrderStatusBadge status={selectedOrder.fulfillmentStatus || 'PENDING'} />
                )}
              </SheetTitle>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              {/* Client Info */}
              <div>
                <h3 className="font-semibold mb-2">Client Information</h3>
                <div className="text-sm space-y-1">
                  <div>Name: {getClientName(selectedOrder.clientId)}</div>
                  <div>
                    Created: {selectedOrder.createdAt ? format(new Date(selectedOrder.createdAt), 'MMM d, yyyy h:mm a') : 'N/A'}
                  </div>
                  {selectedOrder.confirmedAt && (
                    <div>
                      Confirmed: {format(new Date(selectedOrder.confirmedAt), 'MMM d, yyyy h:mm a')}
                    </div>
                  )}
                </div>
              </div>

              <Separator />

              {/* Order Items */}
              <div>
                <h3 className="font-semibold mb-2">Order Items</h3>
                <div className="space-y-2">
                  {(selectedOrder.items as any[])?.map((item: any, index: number) => (
                    <div key={index} className="flex justify-between text-sm">
                      <div>
                        <div className="font-medium">{item.displayName}</div>
                        <div className="text-muted-foreground">
                          Qty: {item.quantity} × ${item.unitPrice.toFixed(2)}
                        </div>
                      </div>
                      <div className="font-medium">
                        ${item.lineTotal.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Order Total */}
              <div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total</span>
                  <span>${parseFloat(selectedOrder.total).toFixed(2)}</span>
                </div>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                {selectedOrder.isDraft ? (
                  <>
                    <Button className="w-full" onClick={handleEditDraft}>
                      Edit Draft
                    </Button>
                    <Button className="w-full" variant="default" onClick={handleConfirmDraft}>
                      Confirm Order
                    </Button>
                  </>
                ) : (
                  <>
                    {selectedOrder.fulfillmentStatus === 'PENDING' && (
                      <Button className="w-full" onClick={handleStatusChange}>
                        Mark as Packed
                      </Button>
                    )}
                    {selectedOrder.fulfillmentStatus === 'PACKED' && (
                      <Button className="w-full" onClick={handleStatusChange}>
                        Mark as Shipped
                      </Button>
                    )}
                    <Button
                      className="w-full"
                      variant="outline"
                      onClick={() => setShowReturnModal(true)}
                    >
                      <PackageX className="h-4 w-4 mr-2" />
                      Process Return
                    </Button>
                  </>
                )}
              </div>

              {/* Status Timeline (for confirmed orders) */}
              {!selectedOrder.isDraft && (
                <>
                  <Separator />
                  <OrderStatusTimeline order={selectedOrder} />
                </>
              )}

              {/* Return History (for confirmed orders) */}
              {!selectedOrder.isDraft && (
                <>
                  <Separator />
                  <ReturnHistorySection orderId={selectedOrder.id} />
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      )}

      {/* Ship Order Modal */}
      {showShipModal && selectedOrder && (
        <ShipOrderModal
          open={showShipModal}
          onOpenChange={setShowShipModal}
          order={selectedOrder}
          onSuccess={handleStatusChangeSuccess}
        />
      )}

      {/* Process Return Modal */}
      {showReturnModal && selectedOrder && (
        <ProcessReturnModal
          open={showReturnModal}
          onOpenChange={setShowReturnModal}
          order={selectedOrder}
          onSuccess={() => {
            refetchConfirmed();
            setSelectedOrder(null);
          }}
        />
      )}

      {/* TODO: Confirm Draft Modal - to be implemented */}
      {showConfirmModal && selectedOrder && (
        <div>Confirm Draft Modal - Coming in Phase 5</div>
      )}
    </div>
  );
}

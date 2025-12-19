import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { ConfirmDraftModal } from '@/components/orders/ConfirmDraftModal';
import { DeleteDraftModal } from '@/components/orders/DeleteDraftModal';
import { DraftOrdersTab } from '@/components/orders/DraftOrdersTab';
import { ConfirmedOrdersTab } from '@/components/orders/ConfirmedOrdersTab';
import { 
  Download,
  FileText,
  CheckSquare,
  PlusCircle,
  PackageX
} from 'lucide-react';
import { format } from 'date-fns';
import { useLocation } from 'wouter';
import { exportToCSVWithLabels } from '@/utils/exportToCSV';
import { toast } from 'sonner';

export default function Orders() {
  const [, setLocation] = useLocation();
  
  // Initialize filters from URL parameters
  const getInitialStatusFilter = () => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('status');
    if (status && ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].includes(status)) {
      return status;
    }
    return 'ALL';
  };
  
  const [activeTab, setActiveTab] = useState<'draft' | 'confirmed'>('confirmed');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(getInitialStatusFilter);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showShipModal, setShowShipModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
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
  }, {
    refetchOnMount: 'always',
    staleTime: 0,
    gcTime: 0,
  });

  // Filter orders by search query
  const filteredDrafts = draftOrders?.filter((order) => {
    if (!searchQuery) return true; // Show all if no search query
    try {
      const searchLower = searchQuery.toLowerCase();
      const orderNumber = order.orderNumber || '';
      const clientName = getClientName(order.clientId) || '';
      return (
        orderNumber.toLowerCase().includes(searchLower) ||
        clientName.toLowerCase().includes(searchLower)
      );
    } catch (error) {
      console.error('Error filtering draft order:', error, order);
      return true; // Include order if filter fails
    }
  }) || [];

  const filteredConfirmed = confirmedOrders?.filter((order) => {
    if (!searchQuery) return true; // Show all if no search query
    try {
      const searchLower = searchQuery.toLowerCase();
      const orderNumber = order.orderNumber || '';
      const clientName = getClientName(order.clientId) || '';
      return (
        orderNumber.toLowerCase().includes(searchLower) ||
        clientName.toLowerCase().includes(searchLower)
      );
    } catch (error) {
      console.error('Error filtering confirmed order:', error, order);
      return true; // Include order if filter fails
    }
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

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const handleDeleteDraft = () => {
    setShowDeleteModal(true);
  };

  // Export handler
  const handleExport = () => {
    const ordersToExport = activeTab === 'draft' ? filteredDrafts : filteredConfirmed;
    
    if (!ordersToExport || ordersToExport.length === 0) {
      toast.error('No orders to export');
      return;
    }
    
    // Check if clients data is loaded
    if (!clients) {
      toast.error('Client data is still loading. Please try again.');
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

        <TabsContent value="draft">
          <DraftOrdersTab
            draftStats={draftStats}
            draftOrders={draftOrders || []}
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            filteredDrafts={filteredDrafts}
            loadingDrafts={loadingDrafts}
            handleViewOrder={handleViewOrder}
            setLocation={setLocation}
            getClientName={getClientName}
          />
        </TabsContent>

        <TabsContent value="confirmed">
          <ConfirmedOrdersTab
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            filteredConfirmed={filteredConfirmed}
            loadingConfirmed={loadingConfirmed}
            handleViewOrder={handleViewOrder}
            getClientName={getClientName}
          />
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
                  {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
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
                    <Button className="w-full" variant="destructive" onClick={handleDeleteDraft}>
                      Delete Draft
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
                  <OrderStatusTimeline orderId={selectedOrder.id} />
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
          orderId={selectedOrder.id}
          currentStatus={selectedOrder.fulfillmentStatus || 'PENDING'}
          open={showShipModal}
          onClose={() => setShowShipModal(false)}
          onSuccess={handleStatusChangeSuccess}
        />
      )}

      {/* Process Return Modal */}
      {showReturnModal && selectedOrder && (
        <ProcessReturnModal
          orderId={selectedOrder.id}
          orderItems={selectedOrder.items || []}
          open={showReturnModal}
          onClose={() => setShowReturnModal(false)}
          onSuccess={() => {
            refetchConfirmed();
            setSelectedOrder(null);
          }}
        />
      )}

      {/* Confirm Draft Modal */}
      {showConfirmModal && selectedOrder && (
        <ConfirmDraftModal
          orderId={selectedOrder.id}
          orderNumber={selectedOrder.orderNumber}
          totalAmount={selectedOrder.totalAmount}
          open={showConfirmModal}
          onClose={() => setShowConfirmModal(false)}
          onSuccess={() => {
            refetchDrafts();
            refetchConfirmed();
            setSelectedOrder(null);
            setShowConfirmModal(false);
          }}
        />
      )}

      {/* Delete Draft Modal */}
      {showDeleteModal && selectedOrder && (
        <DeleteDraftModal
          orderId={selectedOrder.id}
          orderNumber={selectedOrder.orderNumber}
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onSuccess={() => {
            refetchDrafts();
            setSelectedOrder(null);
            setShowDeleteModal(false);
          }}
        />
      )}
    </div>
  );
}

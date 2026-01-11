import { useState, useEffect } from 'react';
import { trpc } from '@/lib/trpc';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PageErrorBoundary } from '@/components/common/PageErrorBoundary';
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
import { ConfirmDraftModal } from '@/components/orders/ConfirmDraftModal';
import { DeleteDraftModal } from '@/components/orders/DeleteDraftModal';
// FEAT-008: Import Edit Invoice Dialog
import { EditInvoiceDialog } from '@/components/orders/EditInvoiceDialog';
import {
  Search,
  CheckCircle2,
  PlusCircle,
  PackageX,
  Download,
  FileText,
  CheckSquare,
  Receipt,
} from 'lucide-react';
import { format } from 'date-fns';
import { useLocation } from 'wouter';
import { exportToCSVWithLabels } from '@/utils/exportToCSV';
import { toast } from 'sonner';
import { DataCardSection } from '@/components/data-cards';
import { TableSkeleton } from '@/components/ui/skeleton-loaders';
import { EmptyState } from '@/components/ui/empty-state';

const ORDERS_FILTER_KEY = "terp-orders-filters";

/**
 * Load orders filters from localStorage
 * CHAOS-023: Filter persistence
 */
function loadOrdersFiltersFromStorage(): { activeTab: 'draft' | 'confirmed'; statusFilter: string } | null {
  try {
    const stored = localStorage.getItem(ORDERS_FILTER_KEY);
    if (!stored) return null;
    return JSON.parse(stored);
  } catch {
    return null;
  }
}

/**
 * Save orders filters to localStorage
 */
function saveOrdersFiltersToStorage(filters: { activeTab: 'draft' | 'confirmed'; statusFilter: string }): void {
  try {
    localStorage.setItem(ORDERS_FILTER_KEY, JSON.stringify(filters));
  } catch {
    // Silently fail
  }
}

export default function Orders() {
  const [, setLocation] = useLocation();

  // Initialize filters from URL parameters first, then localStorage (CHAOS-023)
  const getInitialFilters = () => {
    const params = new URLSearchParams(window.location.search);
    const urlStatus = params.get('status');

    // If URL has status param, use it (for deep linking)
    if (urlStatus && ['PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'PACKED'].includes(urlStatus)) {
      return { activeTab: 'confirmed' as const, statusFilter: urlStatus };
    }

    // Otherwise try localStorage
    const stored = loadOrdersFiltersFromStorage();
    if (stored) {
      return stored;
    }

    return { activeTab: 'confirmed' as const, statusFilter: 'ALL' };
  };

  const initialFilters = getInitialFilters();
  const [activeTab, setActiveTab] = useState<'draft' | 'confirmed'>(initialFilters.activeTab);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>(initialFilters.statusFilter);

  // Persist filter changes to localStorage (CHAOS-023)
  useEffect(() => {
    saveOrdersFiltersToStorage({ activeTab, statusFilter });
  }, [activeTab, statusFilter]);

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showShipModal, setShowShipModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  // FEAT-008: State for edit invoice dialog
  const [showEditInvoiceDialog, setShowEditInvoiceDialog] = useState(false);
  const [editInvoiceId, setEditInvoiceId] = useState<number | null>(null);
  
  // Fetch clients for name lookup - handle paginated response
  const { data: clientsData } = trpc.clients.list.useQuery({ limit: 1000 });
  const clients = Array.isArray(clientsData) ? clientsData : (clientsData?.items ?? []);
  
  // Helper to get client name
  const getClientName = (clientId: number) => {
    const client = clients.find((c: any) => c.id === clientId);
    return client?.name || 'Unknown';
  };

  // Test endpoint removed - use browser DevTools for API debugging

  // Fetch draft orders - handle paginated response
  const { data: draftOrdersData, isLoading: loadingDrafts, refetch: refetchDrafts } = trpc.orders.getAll.useQuery({
    isDraft: true,
  });
  const draftOrders = Array.isArray(draftOrdersData) ? draftOrdersData : (draftOrdersData?.items ?? []);

  // Fetch confirmed orders - handle paginated response
  const { data: confirmedOrdersData, isLoading: loadingConfirmed, refetch: refetchConfirmed } = trpc.orders.getAll.useQuery({
    isDraft: false,
    fulfillmentStatus: statusFilter === 'ALL' ? undefined : statusFilter,
  }, {
    refetchOnMount: 'always',
    staleTime: 0,
    gcTime: 0,
  });
  const confirmedOrders = Array.isArray(confirmedOrdersData) ? confirmedOrdersData : (confirmedOrdersData?.items ?? []);

  // Debug logging removed - use browser DevTools Network tab for API debugging

  // Filter orders by search query
  const filteredDrafts = draftOrders.filter((order: any) => {
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
  });

  const filteredConfirmed = confirmedOrders.filter((order: any) => {
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
  });
  
  // Calculate statistics
  const draftStats = {
    total: draftOrders.length,
  };

  const confirmedStats = {
    pending: confirmedOrders.filter((o: any) => o.fulfillmentStatus === 'PENDING').length,
    packed: confirmedOrders.filter((o: any) => o.fulfillmentStatus === 'PACKED').length,
    shipped: confirmedOrders.filter((o: any) => o.fulfillmentStatus === 'SHIPPED').length,
    total: confirmedOrders.length,
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
    } catch (error: any) {
      toast.error(error.message || 'Export failed');
    }
  };

  return (
    <PageErrorBoundary pageName="Orders">
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
                <TableSkeleton rows={5} columns={4} />
              ) : filteredDrafts.length === 0 ? (
                <EmptyState
                  variant="orders"
                  title="No draft orders"
                  description={searchQuery 
                    ? 'No draft orders match your search. Try a different search term.'
                    : 'Create a draft order to save work in progress without reducing inventory.'}
                  action={!searchQuery ? {
                    label: "Create Draft Order",
                    onClick: () => setLocation('/orders/create')
                  } : undefined}
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
                <TableSkeleton rows={10} columns={5} />
              ) : filteredConfirmed.length === 0 ? (
                <EmptyState
                  variant="orders"
                  title="No confirmed orders"
                  description={searchQuery || statusFilter !== 'ALL'
                    ? 'No orders match your current filters. Try adjusting your search or status filter.'
                    : 'Confirmed orders will appear here once you confirm a draft order.'}
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
                              <Badge variant="outline" className="text-xs" title="Payment Status">
                                Payment: {order.saleStatus}
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
                    {/* FEAT-008: Edit Invoice Button */}
                    {selectedOrder.invoiceId && (
                      <Button
                        className="w-full"
                        variant="outline"
                        onClick={() => {
                          setEditInvoiceId(selectedOrder.invoiceId);
                          setShowEditInvoiceDialog(true);
                        }}
                      >
                        <Receipt className="h-4 w-4 mr-2" />
                        Edit Invoice
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

      {/* FEAT-008: Edit Invoice Dialog */}
      <EditInvoiceDialog
        open={showEditInvoiceDialog}
        onOpenChange={setShowEditInvoiceDialog}
        invoiceId={editInvoiceId}
        onSuccess={() => {
          setEditInvoiceId(null);
          refetchConfirmed();
        }}
      />
    </div>
    </PageErrorBoundary>
  );
}

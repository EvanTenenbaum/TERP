/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface LiveCatalogConfigProps {
  clientId: number;
}

export function LiveCatalogConfig({ clientId }: LiveCatalogConfigProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("configuration");
  
  // Fetch configuration
  const {
    data: config,
    isLoading: configLoading,
    refetch: refetchConfig,
  } = trpc.vipPortalAdmin.liveCatalog.getConfiguration.useQuery({
    clientId,
  });

  // Fetch interest lists
  const {
    data: interestListsData,
    isLoading: interestListsLoading,
    refetch: refetchInterestLists,
  } = trpc.vipPortalAdmin.liveCatalog.interestLists.getByClient.useQuery({
    clientId,
    limit: 50,
    offset: 0,
  });

  // Fetch draft interests
  const {
    data: draftInterests,
    isLoading: draftLoading,
    refetch: _refetchDraft,
  } = trpc.vipPortalAdmin.liveCatalog.draftInterests.getByClient.useQuery({
    clientId,
  });

  // Configuration state
  const [enabled, setEnabled] = useState(false);
  const [showQuantity, setShowQuantity] = useState(true);
  const [showBrand, setShowBrand] = useState(true);
  const [showGrade, setShowGrade] = useState(true);
  const [showDate, setShowDate] = useState(true);
  const [showBasePrice, setShowBasePrice] = useState(false);
  const [showMarkup, setShowMarkup] = useState(false);
  const [enablePriceAlerts, setEnablePriceAlerts] = useState(false);

  // Interest list detail modal
  const [selectedListId, setSelectedListId] = useState<number | null>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Load configuration when data is available
  useEffect(() => {
    if (config) {
      setEnabled(config.moduleLiveCatalogEnabled || false);
      // Type assertion needed because featuresConfig is a JSON column with flexible structure
      const featuresConfig = config.featuresConfig as {
        liveCatalog?: {
          showQuantity?: boolean;
          showBrand?: boolean;
          showGrade?: boolean;
          showDate?: boolean;
          showBasePrice?: boolean;
          showMarkup?: boolean;
          enablePriceAlerts?: boolean;
        };
      } | null;
      const liveCatalogConfig = featuresConfig?.liveCatalog;
      if (liveCatalogConfig) {
        setShowQuantity(liveCatalogConfig.showQuantity ?? true);
        setShowBrand(liveCatalogConfig.showBrand ?? true);
        setShowGrade(liveCatalogConfig.showGrade ?? true);
        setShowDate(liveCatalogConfig.showDate ?? true);
        setShowBasePrice(liveCatalogConfig.showBasePrice ?? false);
        setShowMarkup(liveCatalogConfig.showMarkup ?? false);
        setEnablePriceAlerts(liveCatalogConfig.enablePriceAlerts ?? false);
      }
    }
  }, [config]);

  // Save configuration mutation
  const saveConfigMutation = trpc.vipPortalAdmin.liveCatalog.saveConfiguration.useMutation({
    onSuccess: () => {
      toast({
        title: "Configuration saved",
        description: "Live Catalog configuration has been updated successfully.",
      });
      refetchConfig();
    },
    onError: (error) => {
      toast({
        title: "Error saving configuration",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update status mutation
  const updateStatusMutation = trpc.vipPortalAdmin.liveCatalog.interestLists.updateStatus.useMutation({
    onSuccess: () => {
      toast({
        title: "Status updated",
        description: "Interest list status has been updated.",
      });
      refetchInterestLists();
    },
    onError: (error) => {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSaveConfiguration = () => {
    saveConfigMutation.mutate({
      clientId,
      enabled,
      showQuantity,
      showBrand,
      showGrade,
      showDate,
      showBasePrice,
      showMarkup,
      enablePriceAlerts,
    });
  };

  const handleViewDetails = (listId: number) => {
    setSelectedListId(listId);
    setDetailModalOpen(true);
  };

  const handleUpdateStatus = (listId: number, status: 'NEW' | 'REVIEWED' | 'CONVERTED' | 'ARCHIVED') => {
    updateStatusMutation.mutate({
      listId,
      status,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      NEW: { variant: "default" as const, label: "New" },
      REVIEWED: { variant: "secondary" as const, label: "Reviewed" },
      CONVERTED: { variant: "default" as const, label: "Converted" },
      ARCHIVED: { variant: "outline" as const, label: "Archived" },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.NEW;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (configLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
          <TabsTrigger value="interest-lists">
            Interest Lists
            {interestListsData && interestListsData.total > 0 && (
              <Badge variant="secondary" className="ml-2">
                {interestListsData.total}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="draft">
            Current Draft
            {draftInterests && draftInterests.totalItems > 0 && (
              <Badge variant="secondary" className="ml-2">
                {draftInterests.totalItems}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="price-alerts">
            Price Alerts
          </TabsTrigger>
        </TabsList>

        {/* Configuration Tab */}
        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Live Catalog Settings</CardTitle>
              <CardDescription>
                Configure what inventory and attributes are visible to this client in their VIP portal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Enable/Disable */}
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="enabled" className="text-base">
                    Enable Live Catalog
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Allow this client to browse and mark interest in inventory
                  </p>
                </div>
                <Switch
                  id="enabled"
                  checked={enabled}
                  onCheckedChange={setEnabled}
                />
              </div>

              {enabled && (
                <>
                  {/* Attribute Visibility */}
                  <div className="space-y-4">
                    <div>
                      <Label className="text-base">Visible Attributes</Label>
                      <p className="text-sm text-muted-foreground">
                        Select which product attributes to display
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="showQuantity"
                          checked={showQuantity}
                          onCheckedChange={(checked) => setShowQuantity(checked as boolean)}
                        />
                        <Label htmlFor="showQuantity" className="font-normal">
                          Show Quantity Available
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="showBrand"
                          checked={showBrand}
                          onCheckedChange={(checked) => setShowBrand(checked as boolean)}
                        />
                        <Label htmlFor="showBrand" className="font-normal">
                          Show Brand
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="showGrade"
                          checked={showGrade}
                          onCheckedChange={(checked) => setShowGrade(checked as boolean)}
                        />
                        <Label htmlFor="showGrade" className="font-normal">
                          Show Grade
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="showDate"
                          checked={showDate}
                          onCheckedChange={(checked) => setShowDate(checked as boolean)}
                        />
                        <Label htmlFor="showDate" className="font-normal">
                          Show Date
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="showBasePrice"
                          checked={showBasePrice}
                          onCheckedChange={(checked) => setShowBasePrice(checked as boolean)}
                        />
                        <Label htmlFor="showBasePrice" className="font-normal">
                          Show Base Price
                        </Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="showMarkup"
                          checked={showMarkup}
                          onCheckedChange={(checked) => setShowMarkup(checked as boolean)}
                        />
                        <Label htmlFor="showMarkup" className="font-normal">
                          Show Markup
                        </Label>
                      </div>
                    </div>
                  </div>

                  {/* Price Alerts */}
                  <div className="flex items-center justify-between pt-4 border-t">
                    <div className="space-y-0.5">
                      <Label htmlFor="enablePriceAlerts" className="text-base">
                        Enable Price Alerts
                      </Label>
                      <p className="text-sm text-muted-foreground">
                        Allow client to set price alerts for specific items
                      </p>
                    </div>
                    <Switch
                      id="enablePriceAlerts"
                      checked={enablePriceAlerts}
                      onCheckedChange={setEnablePriceAlerts}
                    />
                  </div>
                </>
              )}

              {/* Save Button */}
              <div className="flex justify-end pt-4 border-t">
                <Button
                  onClick={handleSaveConfiguration}
                  disabled={saveConfigMutation.isPending}
                >
                  {saveConfigMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Configuration
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interest Lists Tab */}
        <TabsContent value="interest-lists" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Submitted Interest Lists</CardTitle>
              <CardDescription>
                View and manage interest lists submitted by this client
              </CardDescription>
            </CardHeader>
            <CardContent>
              {interestListsLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : interestListsData && interestListsData.lists.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Total Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {interestListsData.lists.map((list) => (
                      <TableRow key={list.id}>
                        <TableCell className="font-medium">#{list.id}</TableCell>
                        <TableCell>
                          {new Date(list.submittedAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell>{list.totalItems || 0}</TableCell>
                        <TableCell>${list.totalValue || '0.00'}</TableCell>
                        <TableCell>{getStatusBadge(list.status)}</TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewDetails(list.id)}
                          >
                            View Details
                          </Button>
                          {list.status === 'NEW' && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleUpdateStatus(list.id, 'REVIEWED')}
                            >
                              Mark Reviewed
                            </Button>
                          )}
                          {list.status === 'REVIEWED' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleUpdateStatus(list.id, 'ARCHIVED')}
                            >
                              Archive
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No interest lists submitted yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Draft Tab */}
        <TabsContent value="draft" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Draft Interest List</CardTitle>
              <CardDescription>
                Items currently in the client's draft (not yet submitted)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {draftLoading ? (
                <div className="flex items-center justify-center p-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : draftInterests && draftInterests.items.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Quantity</TableHead>
                        <TableHead>Added</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {draftInterests.items.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.itemName}</TableCell>
                          <TableCell>{item.category || 'N/A'}</TableCell>
                          <TableCell>${item.retailPrice}</TableCell>
                          <TableCell>{item.quantity} lbs</TableCell>
                          <TableCell>
                            {new Date(item.addedAt).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <div className="text-sm text-muted-foreground">
                      {draftInterests.totalItems} items
                    </div>
                    <div className="text-lg font-semibold">
                      Total: ${draftInterests.totalValue}
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No items in draft</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Price Alerts Tab */}
        <TabsContent value="price-alerts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Client Price Alerts</CardTitle>
              <CardDescription>
                View and manage price alerts for this client. Clients receive notifications when prices drop to their target.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!enablePriceAlerts ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p>Price alerts are not enabled for this client.</p>
                  <p className="text-sm mt-2">Enable price alerts in the Configuration tab.</p>
                </div>
              ) : (
                <PriceAlertsTable clientId={clientId} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Interest List Detail Modal */}
      {selectedListId && (
        <InterestListDetailModal
          listId={selectedListId}
          open={detailModalOpen}
          onOpenChange={setDetailModalOpen}
        />
      )}
    </div>
  );
}

// Interest List Detail Modal Component
interface InterestListDetailModalProps {
  listId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function InterestListDetailModal({
  listId,
  open,
  onOpenChange,
}: InterestListDetailModalProps) {
  const { toast } = useToast();
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [addToOrderDialogOpen, setAddToOrderDialogOpen] = useState(false);
  const [draftOrderId, setDraftOrderId] = useState<string>("");
  
  const { data: listDetail, isLoading } =
    trpc.vipPortalAdmin.liveCatalog.interestLists.getById.useQuery(
      { listId },
      { enabled: open }
    );
  
  // Add to new order mutation
  const addToNewOrderMutation = trpc.vipPortalAdmin.liveCatalog.interestLists.addToNewOrder.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Order created",
        description: `Draft order #${data.orderNumber} created with ${data.itemCount} items.`,
      });
      onOpenChange(false);
    },
    onError: (error) => {
      toast({
        title: "Error creating order",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Add to draft order mutation
  const addToDraftOrderMutation = trpc.vipPortalAdmin.liveCatalog.interestLists.addToDraftOrder.useMutation({
    onSuccess: (data) => {
      toast({
        title: "Items added to order",
        description: `Added ${data.itemsAdded} items to order #${data.orderNumber}.`,
      });
      setAddToOrderDialogOpen(false);
      setDraftOrderId("");
    },
    onError: (error) => {
      toast({
        title: "Error adding to order",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Select all items by default when modal opens
  useEffect(() => {
    if (listDetail?.items) {
      setSelectedItems(listDetail.items.map((item: any) => item.id));
    }
  }, [listDetail]);
  
  const handleAddToNewOrder = () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to add to order.",
        variant: "destructive",
      });
      return;
    }
    addToNewOrderMutation.mutate({
      listId,
      itemIds: selectedItems,
    });
  };
  
  const handleAddToDraftOrder = () => {
    if (selectedItems.length === 0) {
      toast({
        title: "No items selected",
        description: "Please select at least one item to add to order.",
        variant: "destructive",
      });
      return;
    }
    const orderId = parseInt(draftOrderId);
    if (isNaN(orderId) || orderId <= 0) {
      toast({
        title: "Invalid order ID",
        description: "Please enter a valid order ID.",
        variant: "destructive",
      });
      return;
    }
    addToDraftOrderMutation.mutate({
      listId,
      orderId,
      itemIds: selectedItems,
    });
  };
  
  const toggleItemSelection = (itemId: number) => {
    setSelectedItems(prev =>
      prev.includes(itemId)
        ? prev.filter(id => id !== itemId)
        : [...prev, itemId]
    );
  };
  
  const toggleSelectAll = () => {
    if (selectedItems.length === listDetail?.items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems((listDetail?.items || []).map((item: any) => item.id));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Interest List #{listId}</DialogTitle>
          <DialogDescription>
            Submitted on{" "}
            {listDetail?.submittedAt &&
              new Date(listDetail.submittedAt).toLocaleDateString()}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : listDetail ? (
          <div className="space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedItems.length === listDetail.items.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Price at Interest</TableHead>
                  <TableHead>Current Price</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {listDetail.items.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedItems.includes(item.id)}
                        onCheckedChange={() => toggleItemSelection(item.id)}
                      />
                    </TableCell>
                    <TableCell className="font-medium">{item.itemName}</TableCell>
                    <TableCell>{item.category || 'N/A'}</TableCell>
                    <TableCell>${item.priceAtInterest}</TableCell>
                    <TableCell>
                      {item.priceChanged ? (
                        <span className="font-bold text-red-600">
                          ${item.currentPrice}
                        </span>
                      ) : (
                        <span>${item.currentPrice}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {item.quantityChanged ? (
                        <span className="font-bold text-red-600">
                          {item.currentQuantity} lbs
                        </span>
                      ) : (
                        <span>{item.currentQuantity} lbs</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {!item.currentlyAvailable ? (
                        <Badge variant="destructive">Out of Stock</Badge>
                      ) : item.priceChanged || item.quantityChanged ? (
                        <Badge variant="secondary">Changed</Badge>
                      ) : (
                        <Badge variant="default">Available</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-muted-foreground">
                {listDetail.totalItems} items
              </div>
              <div className="text-lg font-semibold">
                Total: ${listDetail.totalValue}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <p>Interest list not found</p>
          </div>
        )}

        <DialogFooter className="flex justify-between">
          <div className="flex gap-2">
            <Button
              variant="default"
              onClick={handleAddToNewOrder}
              disabled={selectedItems.length === 0 || addToNewOrderMutation.isPending}
            >
              {addToNewOrderMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Add to New Order
            </Button>
            <Button
              variant="secondary"
              onClick={() => setAddToOrderDialogOpen(true)}
              disabled={selectedItems.length === 0}
            >
              Add to Draft Order
            </Button>
          </div>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
        
        {/* Add to Draft Order Dialog */}
        <Dialog open={addToOrderDialogOpen} onOpenChange={setAddToOrderDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add to Draft Order</DialogTitle>
              <DialogDescription>
                Enter the order ID of the draft order you want to add these items to.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="orderId">Order ID</Label>
                <Input
                  id="orderId"
                  type="number"
                  placeholder="Enter order ID"
                  value={draftOrderId}
                  onChange={(e) => setDraftOrderId(e.target.value)}
                />
              </div>
              <div className="text-sm text-muted-foreground">
                {selectedItems.length} item(s) will be added to the order.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddToOrderDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleAddToDraftOrder}
                disabled={addToDraftOrderMutation.isPending}
              >
                {addToDraftOrderMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Add to Order
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}

// Price Alerts Table Component
function PriceAlertsTable({ clientId }: { clientId: number }) {
  const { toast } = useToast();
  const [deactivateAlertId, setDeactivateAlertId] = useState<number | null>(null);

  // Fetch price alerts (admin endpoint - to be created)
  const {
    data: priceAlerts,
    isLoading,
    refetch,
  } = trpc.vipPortalAdmin.liveCatalog.priceAlerts.list.useQuery({
    clientId,
  });

  // Deactivate alert mutation
  const deactivateAlertMutation = trpc.vipPortalAdmin.liveCatalog.priceAlerts.deactivate.useMutation({
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Price alert deactivated",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to deactivate price alert",
        variant: "destructive",
      });
    },
  });

  const handleDeactivateAlert = (alertId: number) => {
    setDeactivateAlertId(alertId);
  };

  const confirmDeactivateAlert = () => {
    if (deactivateAlertId) {
      deactivateAlertMutation.mutate({ alertId: deactivateAlertId });
      setDeactivateAlertId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!priceAlerts || priceAlerts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No active price alerts for this client.</p>
      </div>
    );
  }

  return (
    <>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>Category</TableHead>
          <TableHead>Target Price</TableHead>
          <TableHead>Current Price</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Created</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {priceAlerts.map((alert) => {
          const priceDropped = alert.currentPrice !== null && alert.currentPrice <= alert.targetPrice;
          const priceDropPercentage = alert.priceDropPercentage;

          return (
            <TableRow key={alert.id}>
              <TableCell className="font-medium">{alert.productName}</TableCell>
              <TableCell>{alert.category || "N/A"}</TableCell>
              <TableCell>${alert.targetPrice.toFixed(2)}</TableCell>
              <TableCell>
                {alert.currentPrice !== null ? (
                  <span className={priceDropped ? "text-green-600 font-bold" : ""}>
                    ${alert.currentPrice.toFixed(2)}
                    {priceDropped && priceDropPercentage !== null && (
                      <span className="text-xs ml-1">({priceDropPercentage.toFixed(1)}% off)</span>
                    )}
                  </span>
                ) : (
                  <span className="text-muted-foreground">N/A</span>
                )}
              </TableCell>
              <TableCell>
                {alert.isActive ? (
                  priceDropped ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Triggered
                    </Badge>
                  ) : (
                    <Badge variant="default">
                      <Eye className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  )
                ) : (
                  <Badge variant="secondary">
                    <EyeOff className="h-3 w-3 mr-1" />
                    Inactive
                  </Badge>
                )}
              </TableCell>
              <TableCell>
                {new Date(alert.createdAt).toLocaleDateString()}
              </TableCell>
              <TableCell>
                {alert.isActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeactivateAlert(alert.id)}
                    disabled={deactivateAlertMutation.isPending}
                  >
                    {deactivateAlertMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Deactivate"
                    )}
                  </Button>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>

    <ConfirmDialog
      open={!!deactivateAlertId}
      onOpenChange={(open) => !open && setDeactivateAlertId(null)}
      title="Deactivate Price Alert"
      description="Are you sure you want to deactivate this price alert?"
      confirmLabel="Deactivate"
      variant="destructive"
      onConfirm={confirmDeactivateAlert}
      isLoading={deactivateAlertMutation.isPending}
    />
  </>
  );
}

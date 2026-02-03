/**
 * Sprint 4 Track B - 4.B.9: MEET-055 - Office Needs Auto-Population
 *
 * Component for managing office supply needs:
 * - Track office supply products
 * - Monitor low stock for office items
 * - Auto-generate reorder suggestions
 * - Weekly/monthly needs report
 */

import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Package,
  AlertTriangle,
  RefreshCw,
  MoreHorizontal,
  Edit,
  Trash2,
  Check,
  X,
  Clock,
  AlertCircle,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";

/**
 * OfficeSupplyManager - Main component for office supply management
 */
export function OfficeSupplyManager() {
  const [activeTab, setActiveTab] = useState("items");
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editItem, setEditItem] = useState<unknown>(null);
  
  // BUG-007: State for deactivate confirmation dialog (replaces window.confirm)
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [itemToDeactivate, setItemToDeactivate] = useState<number | null>(null);

  const utils = trpc.useUtils();

  // Fetch office supply items
  const { data: itemsData, isLoading: itemsLoading } =
    trpc.officeSupply.list.useQuery({
      onlyLowStock: showLowStockOnly,
    });

  // Fetch pending needs
  const { data: needsData, isLoading: needsLoading } =
    trpc.officeSupply.getPendingNeeds.useQuery({});

  // Fetch summary report
  const { data: summaryData, isLoading: summaryLoading } =
    trpc.officeSupply.getSummaryReport.useQuery({
      period: "month",
    });

  // Mutations
  const registerMutation = trpc.officeSupply.registerItem.useMutation({
    onSuccess: () => {
      toast.success("Item registered successfully");
      setAddDialogOpen(false);
      utils.officeSupply.list.invalidate();
    },
    onError: error => {
      toast.error(error.message || "Failed to register item");
    },
  });

  const updateMutation = trpc.officeSupply.update.useMutation({
    onSuccess: () => {
      toast.success("Item updated successfully");
      setEditItem(null);
      utils.officeSupply.list.invalidate();
    },
  });

  const deactivateMutation = trpc.officeSupply.deactivate.useMutation({
    onSuccess: () => {
      toast.success("Item deactivated");
      utils.officeSupply.list.invalidate();
    },
  });

  const approveNeedMutation = trpc.officeSupply.approveNeed.useMutation({
    onSuccess: () => {
      toast.success("Need approved");
      utils.officeSupply.getPendingNeeds.invalidate();
    },
  });

  const cancelNeedMutation = trpc.officeSupply.cancelNeed.useMutation({
    onSuccess: () => {
      toast.success("Need cancelled");
      utils.officeSupply.getPendingNeeds.invalidate();
    },
  });

  // Format numbers
  const formatQuantity = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "0";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return num.toFixed(0);
  };

  // Get stock status
  const getStockStatus = (current: number, reorderPoint: number) => {
    if (current === 0)
      return { label: "Out of Stock", variant: "destructive" as const };
    if (current <= reorderPoint)
      return { label: "Low Stock", variant: "default" as const };
    return { label: "In Stock", variant: "outline" as const };
  };

  const items = (itemsData?.items || []) as Array<{
    id: number;
    product_id: number;
    product_name: string;
    product_sku: string | null;
    current_stock: number;
    reorder_point: string;
    reorder_quantity: string;
    supplier_name: string | null;
    auto_reorder_enabled: boolean;
    is_active: boolean;
  }>;

  const needs = (needsData?.needs || []) as Array<{
    id: number;
    product_name: string;
    current_stock: string;
    suggested_quantity: string;
    status: string;
    supplier_name: string | null;
    created_at: string;
  }>;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tracked</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {summaryData?.summary.totalTracked || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Low Stock</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-yellow-600">
                {summaryData?.summary.belowReorder || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
            <AlertCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-destructive">
                {summaryData?.summary.outOfStock || 0}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Pending Orders
            </CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {summaryLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">
                {summaryData?.summary.pendingNeeds || 0}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Office Supply Manager
              </CardTitle>
              <CardDescription>
                Track and auto-reorder office supplies
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={async () => {
                  const result =
                    await utils.officeSupply.generateReorderSuggestions.fetch();
                  if (result) {
                    toast.success(
                      `Generated ${result.suggestions.length} suggestions`
                    );
                    utils.officeSupply.getPendingNeeds.invalidate();
                  }
                }}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Generate Suggestions
              </Button>
              <Button onClick={() => setAddDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="items">Tracked Items</TabsTrigger>
              <TabsTrigger value="needs">Pending Needs</TabsTrigger>
              <TabsTrigger value="report">Report</TabsTrigger>
            </TabsList>

            {/* Tracked Items Tab */}
            <TabsContent value="items" className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    id="low-stock-filter"
                    checked={showLowStockOnly}
                    onCheckedChange={setShowLowStockOnly}
                  />
                  <Label htmlFor="low-stock-filter">Show low stock only</Label>
                </div>
              </div>

              {itemsLoading ? (
                <Skeleton className="h-64" />
              ) : items.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">
                        Current Stock
                      </TableHead>
                      <TableHead className="text-right">
                        Reorder Point
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Auto-Reorder</TableHead>
                      <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map(item => {
                      const currentStock = Number(item.current_stock) || 0;
                      const reorderPoint = parseFloat(item.reorder_point) || 0;
                      const status = getStockStatus(currentStock, reorderPoint);

                      return (
                        <TableRow key={item.id}>
                          <TableCell>
                            <div>
                              <span className="font-medium">
                                {item.product_name}
                              </span>
                              {item.product_sku && (
                                <span className="text-muted-foreground ml-2">
                                  ({item.product_sku})
                                </span>
                              )}
                            </div>
                            {item.supplier_name && (
                              <p className="text-sm text-muted-foreground">
                                Supplier: {item.supplier_name}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            {formatQuantity(currentStock)}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatQuantity(reorderPoint)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={status.variant}>
                              {status.label}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {item.auto_reorder_enabled ? (
                              <Badge variant="secondary">Enabled</Badge>
                            ) : (
                              <Badge variant="outline">Disabled</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => setEditItem(item)}
                                >
                                  <Edit className="h-4 w-4 mr-2" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-destructive"
                                  onClick={() => {
                                    // BUG-007: Show confirm dialog instead of window.confirm
                                    setItemToDeactivate(item.id);
                                    setDeactivateDialogOpen(true);
                                  }}
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Deactivate
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No office supply items tracked</p>
                  <p className="text-sm mt-1">Add items to start tracking</p>
                </div>
              )}
            </TabsContent>

            {/* Pending Needs Tab */}
            <TabsContent value="needs" className="space-y-4">
              {needsLoading ? (
                <Skeleton className="h-64" />
              ) : needs.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead className="text-right">Current</TableHead>
                      <TableHead className="text-right">
                        Suggested Qty
                      </TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="w-[100px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {needs.map(need => (
                      <TableRow key={need.id}>
                        <TableCell className="font-medium">
                          {need.product_name}
                        </TableCell>
                        <TableCell className="text-right">
                          {formatQuantity(need.current_stock)}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatQuantity(need.suggested_quantity)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              need.status === "PENDING"
                                ? "default"
                                : need.status === "APPROVED"
                                  ? "secondary"
                                  : "outline"
                            }
                          >
                            {need.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(need.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-1">
                            {need.status === "PENDING" && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    approveNeedMutation.mutate({
                                      needId: need.id,
                                    })
                                  }
                                >
                                  <Check className="h-4 w-4 text-green-600" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() =>
                                    cancelNeedMutation.mutate({
                                      needId: need.id,
                                    })
                                  }
                                >
                                  <X className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending reorder needs</p>
                </div>
              )}
            </TabsContent>

            {/* Report Tab */}
            <TabsContent value="report" className="space-y-4">
              {summaryLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">
                          Period Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Period
                            </span>
                            <span className="font-medium">
                              Last {summaryData?.periodDays} days
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">
                              Needs Completed
                            </span>
                            <span className="font-medium">
                              {summaryData?.summary.completedNeeds || 0}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-sm">
                          Most Reordered
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {summaryData?.topReordered &&
                        summaryData.topReordered.length > 0 ? (
                          <div className="space-y-2">
                            {summaryData.topReordered
                              .slice(0, 3)
                              .map((item, idx) => (
                                <div key={item.product_name} className="flex justify-between">
                                  <span className="text-muted-foreground truncate">
                                    {item.product_name}
                                  </span>
                                  <span className="font-medium">
                                    {item.reorder_count}x
                                  </span>
                                </div>
                              ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            No data
                          </p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Add Item Dialog */}
      <AddItemDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
        onSubmit={data => registerMutation.mutate(data)}
        isSubmitting={registerMutation.isPending}
      />

      {/* Edit Item Dialog */}
      {editItem ? (
        <EditItemDialog
          open={!!editItem}
          onOpenChange={() => setEditItem(null)}
          item={
            editItem as {
              id: number;
              reorder_point: string;
              reorder_quantity: string;
              auto_reorder_enabled: boolean;
            }
          }
          onSubmit={data => updateMutation.mutate(data)}
          isSubmitting={updateMutation.isPending}
        />
      ) : null}
      
      {/* BUG-007: Deactivate Confirmation Dialog (replaces window.confirm) */}
      <AlertDialog open={deactivateDialogOpen} onOpenChange={setDeactivateDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deactivate Item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will deactivate the office supply item. You can reactivate it later if needed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setItemToDeactivate(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => {
                if (itemToDeactivate !== null) {
                  deactivateMutation.mutate({ id: itemToDeactivate });
                  setItemToDeactivate(null);
                }
                setDeactivateDialogOpen(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Deactivate
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Add Item Dialog
interface AddItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    productId: number;
    reorderPoint: number;
    reorderQuantity: number;
    autoReorderEnabled: boolean;
  }) => void;
  isSubmitting: boolean;
}

function AddItemDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
}: AddItemDialogProps) {
  const [productId, setProductId] = useState("");
  const [reorderPoint, setReorderPoint] = useState("10");
  const [reorderQuantity, setReorderQuantity] = useState("20");
  const [autoReorder, setAutoReorder] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      toast.error("Please enter a product ID");
      return;
    }
    onSubmit({
      productId: parseInt(productId),
      reorderPoint: parseFloat(reorderPoint),
      reorderQuantity: parseFloat(reorderQuantity),
      autoReorderEnabled: autoReorder,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Office Supply Item</DialogTitle>
          <DialogDescription>
            Register a product for office supply tracking
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="productId">Product ID</Label>
            <Input
              id="productId"
              type="number"
              placeholder="Enter product ID"
              value={productId}
              onChange={e => setProductId(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reorderPoint">Reorder Point</Label>
              <Input
                id="reorderPoint"
                type="number"
                value={reorderPoint}
                onChange={e => setReorderPoint(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reorderQuantity">Reorder Quantity</Label>
              <Input
                id="reorderQuantity"
                type="number"
                value={reorderQuantity}
                onChange={e => setReorderQuantity(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="autoReorder"
              checked={autoReorder}
              onCheckedChange={setAutoReorder}
            />
            <Label htmlFor="autoReorder">Enable auto-reorder</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Adding...
                </>
              ) : (
                "Add Item"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Edit Item Dialog
interface EditItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: {
    id: number;
    reorder_point: string;
    reorder_quantity: string;
    auto_reorder_enabled: boolean;
  };
  onSubmit: (data: {
    id: number;
    reorderPoint?: number;
    reorderQuantity?: number;
    autoReorderEnabled?: boolean;
  }) => void;
  isSubmitting: boolean;
}

function EditItemDialog({
  open,
  onOpenChange,
  item,
  onSubmit,
  isSubmitting,
}: EditItemDialogProps) {
  const [reorderPoint, setReorderPoint] = useState(item.reorder_point);
  const [reorderQuantity, setReorderQuantity] = useState(item.reorder_quantity);
  const [autoReorder, setAutoReorder] = useState(item.auto_reorder_enabled);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      id: item.id,
      reorderPoint: parseFloat(reorderPoint),
      reorderQuantity: parseFloat(reorderQuantity),
      autoReorderEnabled: autoReorder,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Office Supply Item</DialogTitle>
          <DialogDescription>
            Update reorder settings for this item
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-reorderPoint">Reorder Point</Label>
              <Input
                id="edit-reorderPoint"
                type="number"
                value={reorderPoint}
                onChange={e => setReorderPoint(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-reorderQuantity">Reorder Quantity</Label>
              <Input
                id="edit-reorderQuantity"
                type="number"
                value={reorderQuantity}
                onChange={e => setReorderQuantity(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Switch
              id="edit-autoReorder"
              checked={autoReorder}
              onCheckedChange={setAutoReorder}
            />
            <Label htmlFor="edit-autoReorder">Enable auto-reorder</Label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default OfficeSupplyManager;

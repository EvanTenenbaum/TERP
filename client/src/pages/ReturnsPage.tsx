import { useState, Fragment } from "react";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { useToast } from "../hooks/use-toast";
import { PackageX, Plus, TrendingDown } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { Checkbox } from "../components/ui/checkbox";
import { useAuth } from "@/hooks/useAuth";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReturnGLStatus } from "@/components/accounting/GLReversalStatus";

type ReturnReason =
  | "DEFECTIVE"
  | "WRONG_ITEM"
  | "NOT_AS_DESCRIBED"
  | "CUSTOMER_CHANGED_MIND"
  | "OTHER";

interface OrderLineItemOption {
  id: number;
  batchId: number;
  quantity: string;
  unitPrice?: string;
  productDisplayName?: string | null;
}

const RETURN_REASONS: ReturnReason[] = [
  "DEFECTIVE",
  "WRONG_ITEM",
  "NOT_AS_DESCRIBED",
  "CUSTOMER_CHANGED_MIND",
  "OTHER",
];

const isReturnReason = (value: string): value is ReturnReason =>
  RETURN_REASONS.includes(value as ReturnReason);

/**
 * Derive GL-relevant status from return notes markers.
 * Status is tracked via markers in notes (e.g. "[PROCESSED ...]").
 * Maps to the subset accepted by ReturnGLStatus component.
 */
function deriveGLStatus(
  notes: string | null
): "PENDING" | "APPROVED" | "PROCESSED" | "CANCELLED" {
  if (!notes) return "PENDING";
  if (notes.includes("[CANCELLED")) return "CANCELLED";
  if (notes.includes("[PROCESSED")) return "PROCESSED";
  // REJECTED maps to CANCELLED for GL purposes (no reversal entry)
  if (notes.includes("[REJECTED")) return "CANCELLED";
  // RECEIVED and APPROVED both map to APPROVED (reversal pending)
  if (notes.includes("[RECEIVED")) return "APPROVED";
  if (notes.includes("[APPROVED")) return "APPROVED";
  return "PENDING";
}

export default function ReturnsPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [orderIdInput, setOrderIdInput] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [returnReason, setReturnReason] = useState<ReturnReason | "">("");
  const [notes, setNotes] = useState("");
  const [returnItems, setReturnItems] = useState<
    Array<{ batchId: number; quantity: string; reason?: string }>
  >([]);
  const [restockInventory, setRestockInventory] = useState(true);
  const [deleteReturnItemConfirm, setDeleteReturnItemConfirm] = useState<
    number | null
  >(null);
  const [expandedReturnId, setExpandedReturnId] = useState<number | null>(null);

  const {
    data: returns,
    isLoading,
    refetch,
  } = trpc.returns.getAll.useQuery({ limit: 100 });
  const { data: stats } = trpc.returns.getStats.useQuery();

  // Get order details when order ID is entered
  const { data: orderDetails } = trpc.orders.getOrderWithLineItems.useQuery(
    { orderId: selectedOrderId ?? 0 },
    { enabled: !!selectedOrderId }
  );

  const createReturn = trpc.returns.create.useMutation({
    onSuccess: () => {
      toast({ title: "Return processed successfully" });
      setIsCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: error => {
      toast({
        title: "Error processing return",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setOrderIdInput("");
    setSelectedOrderId(null);
    setReturnReason("");
    setNotes("");
    setReturnItems([]);
    setRestockInventory(true);
  };

  const handleCreateReturn = () => {
    if (!selectedOrderId || !returnReason || returnItems.length === 0) {
      toast({
        title: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({ title: "User not authenticated", variant: "destructive" });
      return;
    }

    createReturn.mutate({
      orderId: selectedOrderId,
      items: returnItems,
      reason: returnReason,
      notes,
      restockInventory,
    });
  };

  // Handle order ID input
  const handleOrderIdChange = (value: string) => {
    setOrderIdInput(value);
    const orderId = parseInt(value);
    if (!isNaN(orderId) && orderId > 0) {
      setSelectedOrderId(orderId);
      setReturnItems([]); // Clear previous items
    } else {
      setSelectedOrderId(null);
    }
  };

  // Add order line item to return items
  const addOrderItemToReturn = (lineItem: OrderLineItemOption) => {
    // Check if item already added
    const exists = returnItems.some(item => item.batchId === lineItem.batchId);
    if (exists) {
      toast({ title: "Item already added to return", variant: "default" });
      return;
    }

    setReturnItems([
      ...returnItems,
      {
        batchId: lineItem.batchId,
        quantity: lineItem.quantity.toString(),
        reason: "",
      },
    ]);
  };

  const updateReturnItem = (
    index: number,
    field: string,
    value: string | number
  ) => {
    const updated = [...returnItems];
    updated[index] = { ...updated[index], [field]: value };
    setReturnItems(updated);
  };

  const removeReturnItem = (index: number) => {
    setReturnItems(returnItems.filter((_, i) => i !== index));
  };

  if (isLoading) {
    return <div className="p-8">Loading returns...</div>;
  }

  return (
    <div className="p-8">
      <BackButton label="Back to Orders" to="/orders" className="mb-4" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Returns Management</h1>
        <p className="text-muted-foreground">Process and track order returns</p>
      </div>

      {/* Statistics */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <PackageX className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Total Returns</h3>
            </div>
            <p className="text-3xl font-bold">{stats.totalReturns}</p>
          </div>
          <div className="border rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingDown className="h-5 w-5 text-red-500" />
              <h3 className="font-semibold">Defective Items</h3>
            </div>
            <p className="text-3xl font-bold">{stats.defectiveCount}</p>
          </div>
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold mb-2">Return Reasons</h3>
            <div className="text-sm space-y-1">
              <div>Wrong Item: {stats.wrongItemCount}</div>
              <div>Not As Described: {stats.notAsDescribedCount}</div>
              <div>Changed Mind: {stats.customerChangedMindCount}</div>
              <div>Other: {stats.otherCount}</div>
            </div>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="mb-4">
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Process Return
        </Button>
      </div>

      {/* Returns Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Return ID</TableHead>
              <TableHead>Order ID</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Processed By</TableHead>
              <TableHead>Processed At</TableHead>
              <TableHead>Notes</TableHead>
              <TableHead>GL Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {returns && returns.length > 0 ? (
              returns.map(returnRecord => (
                <Fragment key={returnRecord.id}>
                  <TableRow>
                    <TableCell>#{returnRecord.id}</TableCell>
                    <TableCell>#{returnRecord.orderId}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-red-100 text-red-700">
                        {returnRecord.returnReason}
                      </span>
                    </TableCell>
                    <TableCell>User #{returnRecord.processedBy}</TableCell>
                    <TableCell>
                      {new Date(returnRecord.processedAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {returnRecord.notes || "-"}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setExpandedReturnId(
                            expandedReturnId === returnRecord.id
                              ? null
                              : returnRecord.id
                          )
                        }
                      >
                        {expandedReturnId === returnRecord.id
                          ? "Hide GL"
                          : "View GL"}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedReturnId === returnRecord.id && (
                    <TableRow>
                      <TableCell colSpan={7} className="p-4 bg-muted/30">
                        <ReturnGLStatus
                          returnId={returnRecord.id}
                          returnNumber={`RET-${returnRecord.id}`}
                          status={deriveGLStatus(returnRecord.notes)}
                          processedAt={new Date(returnRecord.processedAt)}
                          reason={returnRecord.returnReason}
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-muted-foreground"
                >
                  No returns found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Return Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="w-full sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process Return</DialogTitle>
            <DialogDescription>
              Process a customer return and optionally restock inventory
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="orderId">Order ID *</Label>
              <Input
                id="orderId"
                type="number"
                value={orderIdInput}
                onChange={e => handleOrderIdChange(e.target.value)}
                placeholder="Enter order ID"
              />
              {selectedOrderId && orderDetails && (
                <div className="mt-2 p-3 bg-accent rounded-lg">
                  <div className="font-medium">
                    Order #
                    {orderDetails.order.orderNumber || orderDetails.order.id}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Client ID: {orderDetails.order.clientId || "N/A"} - Total: $
                    {parseFloat(orderDetails.order.total || "0").toFixed(2)}
                  </div>
                </div>
              )}
              {selectedOrderId && !orderDetails && (
                <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <div className="text-sm text-yellow-800">
                    Loading order details...
                  </div>
                </div>
              )}
            </div>

            {/* Order Line Items Selection */}
            {orderDetails &&
              orderDetails.lineItems &&
              orderDetails.lineItems.length > 0 && (
                <div>
                  <Label>Select Items to Return</Label>
                  <div className="mt-2 space-y-2 max-h-48 overflow-y-auto border rounded-lg p-2">
                    {orderDetails.lineItems.map(
                      (lineItem: OrderLineItemOption) => {
                        const isSelected = returnItems.some(
                          item => item.batchId === lineItem.batchId
                        );
                        return (
                          <div
                            key={lineItem.id}
                            className={`p-2 border rounded cursor-pointer ${
                              isSelected
                                ? "bg-primary/10 border-primary"
                                : "hover:bg-accent"
                            }`}
                            onClick={() =>
                              !isSelected && addOrderItemToReturn(lineItem)
                            }
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">
                                  {lineItem.productDisplayName ||
                                    `Batch #${lineItem.batchId}`}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                  Qty: {lineItem.quantity} × $
                                  {Number.parseFloat(
                                    lineItem.unitPrice ?? "0"
                                  ).toFixed(2)}
                                </div>
                              </div>
                              {isSelected && (
                                <div className="text-sm text-primary font-medium">
                                  Added
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      }
                    )}
                  </div>
                </div>
              )}

            <div>
              <Label htmlFor="returnReason">Return Reason *</Label>
              <Select
                value={returnReason}
                onValueChange={value => {
                  if (isReturnReason(value)) {
                    setReturnReason(value);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEFECTIVE">Defective</SelectItem>
                  <SelectItem value="WRONG_ITEM">Wrong Item</SelectItem>
                  <SelectItem value="NOT_AS_DESCRIBED">
                    Not As Described
                  </SelectItem>
                  <SelectItem value="CUSTOMER_CHANGED_MIND">
                    Customer Changed Mind
                  </SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Additional notes about the return"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="restockInventory"
                checked={restockInventory}
                onCheckedChange={checked =>
                  setRestockInventory(checked as boolean)
                }
              />
              <Label htmlFor="restockInventory" className="cursor-pointer">
                Restock inventory automatically
              </Label>
            </div>

            {/* Return Items List */}
            {returnItems.length > 0 && (
              <div>
                <Label>Return Items ({returnItems.length})</Label>
                <div className="mt-2 space-y-2">
                  {returnItems.map((item, index) => {
                    const lineItem = orderDetails?.lineItems?.find(
                      (li: OrderLineItemOption) => li.batchId === item.batchId
                    );
                    return (
                      <div
                        key={`page-item-${item.batchId}`}
                        className="flex gap-2 items-center p-2 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="font-medium">
                            {lineItem?.productDisplayName ||
                              `Batch #${item.batchId}`}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Quantity: {item.quantity}
                          </div>
                        </div>
                        <Input
                          type="text"
                          placeholder="Item reason (optional)"
                          value={item.reason || ""}
                          onChange={e =>
                            updateReturnItem(index, "reason", e.target.value)
                          }
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteReturnItemConfirm(index)}
                        >
                          Remove
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {returnItems.length === 0 && selectedOrderId && (
              <p className="text-sm text-muted-foreground">
                Select items from the order above to add them to the return.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateReturn}
              disabled={createReturn.isPending}
            >
              {createReturn.isPending ? "Processing..." : "Process Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Return Item Delete Confirmation */}
      <ConfirmDialog
        open={deleteReturnItemConfirm !== null}
        onOpenChange={open => !open && setDeleteReturnItemConfirm(null)}
        title="Remove Return Item"
        description="Are you sure you want to remove this item from the return?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={() => {
          if (deleteReturnItemConfirm !== null) {
            removeReturnItem(deleteReturnItemConfirm);
          }
          setDeleteReturnItemConfirm(null);
        }}
      />
    </div>
  );
}

import { useState } from "react";
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
import { Checkbox } from "../components/ui/checkbox";

export default function ReturnsPage() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [returnReason, setReturnReason] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [returnItems, setReturnItems] = useState<Array<{ batchId: number; quantity: string; reason?: string }>>([]);
  const [restockInventory, setRestockInventory] = useState(true);

  const { data: returns, isLoading, refetch } = trpc.returns.getAll.useQuery({ limit: 100 });
  const { data: stats } = trpc.returns.getStats.useQuery();
  const createReturn = trpc.returns.create.useMutation({
    onSuccess: () => {
      toast({ title: "Return processed successfully" });
      setIsCreateDialogOpen(false);
      resetForm();
      refetch();
    },
    onError: (error) => {
      toast({ title: "Error processing return", description: error.message, variant: "destructive" });
    },
  });

  const resetForm = () => {
    setOrderId("");
    setReturnReason("");
    setNotes("");
    setReturnItems([]);
    setRestockInventory(true);
  };

  const handleCreateReturn = () => {
    if (!orderId || !returnReason || returnItems.length === 0) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    createReturn.mutate({
      orderId: parseInt(orderId),
      items: returnItems,
      reason: returnReason as any,
      notes,
      processedBy: 1, // TODO: Get from auth context
      restockInventory,
    });
  };

  const addReturnItem = () => {
    setReturnItems([...returnItems, { batchId: 0, quantity: "0", reason: "" }]);
  };

  const updateReturnItem = (index: number, field: string, value: string | number) => {
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
            </TableRow>
          </TableHeader>
          <TableBody>
            {returns && returns.length > 0 ? (
              returns.map((returnRecord) => (
                <TableRow key={returnRecord.id}>
                  <TableCell>#{returnRecord.id}</TableCell>
                  <TableCell>#{returnRecord.orderId}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-red-100 text-red-700">
                      {returnRecord.reason}
                    </span>
                  </TableCell>
                  <TableCell>User #{returnRecord.processedBy}</TableCell>
                  <TableCell>{new Date(returnRecord.processedAt).toLocaleDateString()}</TableCell>
                  <TableCell className="max-w-xs truncate">{returnRecord.notes || "-"}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  No returns found
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Return Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Process Return</DialogTitle>
            <DialogDescription>Process a customer return and optionally restock inventory</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="orderId">Order ID *</Label>
              <Input
                id="orderId"
                type="number"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter order ID"
              />
            </div>

            <div>
              <Label htmlFor="returnReason">Return Reason *</Label>
              <Select value={returnReason} onValueChange={setReturnReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEFECTIVE">Defective</SelectItem>
                  <SelectItem value="WRONG_ITEM">Wrong Item</SelectItem>
                  <SelectItem value="NOT_AS_DESCRIBED">Not As Described</SelectItem>
                  <SelectItem value="CUSTOMER_CHANGED_MIND">Customer Changed Mind</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Additional notes about the return"
                rows={3}
              />
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="restockInventory"
                checked={restockInventory}
                onCheckedChange={(checked) => setRestockInventory(checked as boolean)}
              />
              <Label htmlFor="restockInventory" className="cursor-pointer">
                Restock inventory automatically
              </Label>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <Label>Return Items *</Label>
                <Button type="button" variant="outline" size="sm" onClick={addReturnItem}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Item
                </Button>
              </div>

              {returnItems.map((item, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    type="number"
                    placeholder="Batch ID"
                    value={item.batchId || ""}
                    onChange={(e) => updateReturnItem(index, "batchId", parseInt(e.target.value) || 0)}
                    className="flex-1"
                  />
                  <Input
                    type="text"
                    placeholder="Quantity"
                    value={item.quantity}
                    onChange={(e) => updateReturnItem(index, "quantity", e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    type="text"
                    placeholder="Item reason (optional)"
                    value={item.reason || ""}
                    onChange={(e) => updateReturnItem(index, "reason", e.target.value)}
                    className="flex-1"
                  />
                  <Button type="button" variant="destructive" size="sm" onClick={() => removeReturnItem(index)}>
                    Remove
                  </Button>
                </div>
              ))}

              {returnItems.length === 0 && (
                <p className="text-sm text-muted-foreground">No items added. Click "Add Item" to start.</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateReturn} disabled={createReturn.isPending}>
              {createReturn.isPending ? "Processing..." : "Process Return"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

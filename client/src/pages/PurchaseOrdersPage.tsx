import { useState, useMemo } from "react";
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Plus, Search, FileText, Trash2 } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { useLocation } from "wouter";

export default function PurchaseOrdersPage() {
  const { toast } = useToast();
  const [, _setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedPO, setSelectedPO] = useState<any>(null);

  // Fetch data - handle paginated responses
  const { data: posData, refetch } = trpc.purchaseOrders.getAll.useQuery();
  const pos = Array.isArray(posData) ? posData : (posData?.items ?? []);
  
  // Use clients with isSeller=true (suppliers) instead of deprecated vendors
  const { data: suppliersRawData } = trpc.clients.list.useQuery({ 
    clientTypes: ['seller'],
    limit: 1000,
  });
  const suppliersData = Array.isArray(suppliersRawData) ? suppliersRawData : (suppliersRawData?.items ?? []);
  
  const suppliers: Array<{ id: number; name: string; contactName: string | null; contactEmail: string | null; contactPhone: string | null; paymentTerms: string | null }> = useMemo(() => {
    if (!suppliersData || suppliersData.length === 0) return [];
    return suppliersData.map((client: any) => ({
      id: client.id,
      name: client.name,
      contactName: null, // Contact name not in clients table
      contactEmail: client.email ?? null,
      contactPhone: client.phone ?? null,
      paymentTerms: null, // Payment terms are in supplier_profile, fetched separately if needed
    }));
  }, [suppliersData]);
  const { data: productsData } = trpc.inventory.list.useQuery({});
  const products = productsData?.items ?? [];

  // Mutations
  const createPO = trpc.purchaseOrders.create.useMutation({
    onSuccess: () => {
      toast({ title: "Purchase order created successfully" });
      refetch();
      setIsCreateDialogOpen(false);
      resetForm();
    },
    onError: error => {
      toast({
        title: "Error creating purchase order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deletePO = trpc.purchaseOrders.delete.useMutation({
    onSuccess: () => {
      toast({ title: "Purchase order deleted successfully" });
      refetch();
      setIsDeleteDialogOpen(false);
      setSelectedPO(null);
    },
    onError: error => {
      toast({
        title: "Error deleting purchase order",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const _updateStatus = trpc.purchaseOrders.updateStatus.useMutation({
    onSuccess: () => {
      toast({ title: "Status updated successfully" });
      refetch();
    },
    onError: error => {
      toast({
        title: "Error updating status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Form state
  const [formData, setFormData] = useState({
    supplierClientId: "",
    orderDate: new Date().toISOString().split("T")[0],
    expectedDeliveryDate: "",
    paymentTerms: "",
    notes: "",
    supplierNotes: "",
    items: [{ productId: "", quantityOrdered: "", unitCost: "" }],
  });

  const resetForm = () => {
    setFormData({
      supplierClientId: "",
      orderDate: new Date().toISOString().split("T")[0],
      expectedDeliveryDate: "",
      paymentTerms: "",
      notes: "",
      supplierNotes: "",
      items: [{ productId: "", quantityOrdered: "", unitCost: "" }],
    });
  };

  const formatDate = (dateString: string | Date | null | undefined) => {
    if (!dateString) return "-";
    try {
      const d = new Date(dateString);
      if (isNaN(d.getTime())) return "Invalid Date";
      return d.toLocaleDateString();
    } catch (e) {
      return "Error";
    }
  };

  // Filter and search
  const filteredPOs = useMemo(() => {
    if (!pos || pos.length === 0) return [];
    return pos.filter((po: any) => {
      // Search by PO number or supplier name (check both supplierClientId and legacy vendorId)
      const supplierId = po.supplierClientId ?? po.vendorId;
      const matchesSearch =
        (po.poNumber || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
        suppliers
          .find((s: { id: number; name: string }) => s.id === supplierId)
          ?.name.toLowerCase()
          .includes(searchQuery.toLowerCase());

      const matchesStatus =
        statusFilter === "all" || po.purchaseOrderStatus === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [pos, searchQuery, statusFilter, suppliers]);

  const handleCreatePO = () => {
    const items = formData.items
      .filter(item => item.productId && item.quantityOrdered && item.unitCost)
      .map(item => ({
        productId: parseInt(item.productId),
        quantityOrdered: parseFloat(item.quantityOrdered),
        unitCost: parseFloat(item.unitCost),
      }));

    if (!formData.supplierClientId || items.length === 0) {
      toast({
        title: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createPO.mutate({
      supplierClientId: parseInt(formData.supplierClientId),
      orderDate: formData.orderDate,
      expectedDeliveryDate: formData.expectedDeliveryDate || undefined,
      paymentTerms: formData.paymentTerms || undefined,
      notes: formData.notes || undefined,
      vendorNotes: formData.supplierNotes || undefined,
      createdBy: 1, // TODO: Get from auth context
      items,
    });
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { productId: "", quantityOrdered: "", unitCost: "" },
      ],
    });
  };

  const handleRemoveItem = (index: number) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index),
    });
  };

  const handleItemChange = (index: number, field: string, value: string) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const getSupplierName = (supplierId: number | null | undefined) => {
    if (!supplierId) return "Unknown";
    return suppliers.find((s: { id: number; name: string }) => s.id === supplierId)?.name || "Unknown";
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      DRAFT: "bg-gray-100 text-gray-800",
      SENT: "bg-blue-100 text-blue-800",
      CONFIRMED: "bg-green-100 text-green-800",
      RECEIVING: "bg-yellow-100 text-yellow-800",
      RECEIVED: "bg-purple-100 text-purple-800",
      CANCELLED: "bg-red-100 text-red-800",
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${colors[status] || colors.DRAFT}`}
      >
        {status}
      </span>
    );
  };

  return (
    <div className="p-6">
      <BackButton label="Back to Dashboard" to="/" className="mb-4" />
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Purchase Orders</h1>
        <p className="text-gray-600">
          Manage purchase orders for supplier inventory
        </p>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 flex gap-4 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search by PO number or supplier..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="DRAFT">Draft</SelectItem>
            <SelectItem value="SENT">Sent</SelectItem>
            <SelectItem value="CONFIRMED">Confirmed</SelectItem>
            <SelectItem value="RECEIVING">Receiving</SelectItem>
            <SelectItem value="RECEIVED">Received</SelectItem>
            <SelectItem value="CANCELLED">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create PO
        </Button>
      </div>

      {/* Purchase Orders Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>PO Number</TableHead>
              <TableHead>Supplier</TableHead>
              <TableHead>Order Date</TableHead>
              <TableHead>Expected Delivery</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredPOs.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center text-gray-500 py-8"
                >
                  No purchase orders found
                </TableCell>
              </TableRow>
            ) : (
              filteredPOs.map(po => (
                <TableRow key={po.id}>
                  <TableCell className="font-medium">{po.poNumber}</TableCell>
                  <TableCell>{getSupplierName(po.supplierClientId ?? po.vendorId)}</TableCell>
                  <TableCell>
                    {formatDate(po.orderDate)}
                  </TableCell>
                  <TableCell>
                    {formatDate(po.expectedDeliveryDate)}
                  </TableCell>
                  <TableCell>{getStatusBadge(po.purchaseOrderStatus)}</TableCell>
                  <TableCell>${parseFloat(po.total || '0').toFixed(2)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          _setLocation(`/purchase-orders/${po.id}`)
                        }
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedPO(po);
                          setIsDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-red-600" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create PO Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Purchase Order</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="supplier">Supplier *</Label>
              <Select
                value={formData.supplierClientId}
                onValueChange={value =>
                  setFormData({ ...formData, supplierClientId: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map(supplier => (
                    <SelectItem key={supplier.id} value={supplier.id.toString()}>
                      {supplier.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="orderDate">Order Date *</Label>
                <Input
                  id="orderDate"
                  type="date"
                  value={formData.orderDate}
                  onChange={e =>
                    setFormData({ ...formData, orderDate: e.target.value })
                  }
                />
              </div>

              <div>
                <Label htmlFor="expectedDeliveryDate">Expected Delivery</Label>
                <Input
                  id="expectedDeliveryDate"
                  type="date"
                  value={formData.expectedDeliveryDate}
                  onChange={e =>
                    setFormData({
                      ...formData,
                      expectedDeliveryDate: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Select
                value={formData.paymentTerms}
                onValueChange={value =>
                  setFormData({ ...formData, paymentTerms: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select payment terms" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Net 15">Net 15</SelectItem>
                  <SelectItem value="Net 30">Net 30</SelectItem>
                  <SelectItem value="Net 45">Net 45</SelectItem>
                  <SelectItem value="Net 60">Net 60</SelectItem>
                  <SelectItem value="Due on Receipt">Due on Receipt</SelectItem>
                  <SelectItem value="COD">COD</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Line Items *</Label>
              {formData.items.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-2 mb-2">
                  <div className="col-span-5">
                    <Select
                      value={item.productId}
                      onValueChange={value =>
                        handleItemChange(index, "productId", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select product" />
                      </SelectTrigger>
                      <SelectContent>
                        {products.map(item => (
                          <SelectItem
                            key={item.batch?.id || item.product?.id}
                            value={(item.batch?.id || item.product?.id || 0).toString()}
                          >
                            {item.product?.nameCanonical || item.batch?.sku || "Unknown"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      placeholder="Quantity"
                      value={item.quantityOrdered}
                      onChange={e =>
                        handleItemChange(
                          index,
                          "quantityOrdered",
                          e.target.value
                        )
                      }
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      type="number"
                      placeholder="Unit Cost"
                      value={item.unitCost}
                      onChange={e =>
                        handleItemChange(index, "unitCost", e.target.value)
                      }
                    />
                  </div>
                  <div className="col-span-1">
                    {formData.items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveItem(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>

            <div>
              <Label htmlFor="notes">Internal Notes</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={e =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="supplierNotes">Supplier Notes</Label>
              <Textarea
                id="supplierNotes"
                value={formData.supplierNotes}
                onChange={e =>
                  setFormData({ ...formData, supplierNotes: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreateDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleCreatePO} disabled={createPO.isPending}>
              {createPO.isPending ? "Creating..." : "Create Purchase Order"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Purchase Order</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to delete PO {selectedPO?.poNumber}? This
            action cannot be undone.
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDeleteDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                selectedPO && deletePO.mutate({ id: selectedPO.id })
              }
              disabled={deletePO.isPending}
            >
              {deletePO.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

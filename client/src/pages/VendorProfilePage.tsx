import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { trpc } from "../lib/trpc";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { BackButton } from "@/components/common/BackButton";
import {
  Pencil,
  FileText,
  Package,
  ShoppingCart,
  Mail,
  Phone,
  Calendar,
  DollarSign,
  ArrowLeft,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { VendorNotesDialog } from "../components/VendorNotesDialog";
import { formatDistanceToNow } from "date-fns";

interface Vendor {
  id: number;
  name: string;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  paymentTerms: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface VendorFormData {
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  paymentTerms: string;
  notes: string;
}

const PAYMENT_TERMS_OPTIONS = [
  "Net 15",
  "Net 30",
  "Net 45",
  "Net 60",
  "Net 90",
  "Due on Receipt",
  "COD (Cash on Delivery)",
  "2/10 Net 30",
  "Custom",
];

export default function VendorProfilePage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);

  const [formData, setFormData] = useState<VendorFormData>({
    name: "",
    contactName: "",
    contactEmail: "",
    contactPhone: "",
    paymentTerms: "",
    notes: "",
  });

  // Fetch vendor details
  const { data: vendorResponse, isLoading } = trpc.vendors.getById.useQuery(
    { id: Number(id) },
    { enabled: !!id }
  );

  const vendor = useMemo((): Vendor | undefined => {
    if (!vendorResponse) return undefined;
    if ('success' in vendorResponse && vendorResponse.success && 'data' in vendorResponse) {
      return vendorResponse.data as Vendor;
    }
    return undefined;
  }, [vendorResponse]);

  // Fetch vendor batches (products supplied)
  // _Requirements: 7.1, 7.2_
  const { data: vendorBatches } = trpc.inventory.getBatchesByVendor.useQuery(
    { vendorId: Number(id) },
    { enabled: !!id }
  );

  // Fetch vendor purchase orders
  // _Requirements: 7.3_
  const { data: vendorPOs } = trpc.purchaseOrders.getByVendor.useQuery(
    { vendorId: Number(id) },
    { enabled: !!id }
  );

  // Calculate stats from actual data
  const productsSuppliedCount = vendorBatches?.length ?? 0;
  const purchaseOrdersCount = vendorPOs?.length ?? 0;
  const lastOrderDate = useMemo(() => {
    if (!vendorPOs || vendorPOs.length === 0) return null;
    const sortedPOs = [...vendorPOs].sort((a, b) => 
      new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
    );
    return sortedPOs[0]?.orderDate ? new Date(sortedPOs[0].orderDate) : null;
  }, [vendorPOs]);

  // Update vendor mutation
  const updateMutation = trpc.vendors.update.useMutation({
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor", id] });
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
      setIsEditDialogOpen(false);
      toast({
        title: "Vendor updated",
        description: "Vendor information has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update vendor. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleEdit = () => {
    if (!vendor) return;
    setFormData({
      name: vendor.name,
      contactName: vendor.contactName || "",
      contactEmail: vendor.contactEmail || "",
      contactPhone: vendor.contactPhone || "",
      paymentTerms: vendor.paymentTerms || "",
      notes: vendor.notes || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = () => {
    if (!vendor) return;
    updateMutation.mutate({ ...formData, id: vendor.id });
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading vendor profile...</p>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <p className="text-muted-foreground mb-4">Vendor not found</p>
            <Button onClick={() => setLocation("/vendors")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Vendors
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <BackButton to="/vendors" size="icon" />
          <div>
            <h1 className="text-3xl font-bold">{vendor.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Vendor Profile • Created{" "}
              {formatDistanceToNow(new Date(vendor.createdAt), {
                addSuffix: true,
              })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setNotesDialogOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Notes & History
          </Button>
          <Button onClick={handleEdit}>
            <Pencil className="mr-2 h-4 w-4" />
            Edit Profile
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Contact Information */}
          <Card>
            <CardHeader>
              <CardTitle>Contact Information</CardTitle>
              <CardDescription>
                Primary contact details for this vendor
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Contact Person
                  </div>
                  <div className="flex items-center gap-2">
                    {vendor.contactName || (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Payment Terms
                  </div>
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                    {vendor.paymentTerms || (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Email
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {vendor.contactEmail ? (
                      <a
                        href={`mailto:${vendor.contactEmail}`}
                        className="text-primary hover:underline"
                      >
                        {vendor.contactEmail}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-1">
                    Phone
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    {vendor.contactPhone ? (
                      <a
                        href={`tel:${vendor.contactPhone}`}
                        className="text-primary hover:underline"
                      >
                        {vendor.contactPhone}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">Not set</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          {vendor.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{vendor.notes}</p>
              </CardContent>
            </Card>
          )}

          {/* Purchase Orders Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Purchase Orders
              </CardTitle>
              <CardDescription>
                Recent purchase orders from this vendor ({purchaseOrdersCount} total)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vendorPOs && vendorPOs.length > 0 ? (
                <div className="space-y-3">
                  {vendorPOs.slice(0, 5).map((po) => (
                    <div
                      key={po.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">{po.poNumber}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(po.orderDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          ${parseFloat(po.total || "0").toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {po.purchaseOrderStatus?.toLowerCase().replace("_", " ")}
                        </div>
                      </div>
                    </div>
                  ))}
                  {vendorPOs.length > 5 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{vendorPOs.length - 5} more purchase orders
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No purchase orders yet</p>
                  <p className="text-sm">
                    Purchase orders will appear here once created
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Products Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Products
              </CardTitle>
              <CardDescription>
                Products supplied by this vendor ({productsSuppliedCount} batches)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {vendorBatches && vendorBatches.length > 0 ? (
                <div className="space-y-3">
                  {vendorBatches.slice(0, 10).map((item) => (
                    <div
                      key={item.batch.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div>
                        <div className="font-medium">
                          {item.product?.nameCanonical || "Unknown Product"}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {item.batch.sku} • {item.brand?.name || "No Brand"}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">
                          {parseFloat(item.batch.onHandQty || "0").toFixed(2)} units
                        </div>
                        <div className="text-xs text-muted-foreground capitalize">
                          {item.batch.batchStatus?.toLowerCase().replace("_", " ")}
                        </div>
                      </div>
                    </div>
                  ))}
                  {vendorBatches.length > 10 && (
                    <p className="text-sm text-muted-foreground text-center">
                      +{vendorBatches.length - 10} more batches
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No products linked yet</p>
                  <p className="text-sm">
                    Products will appear here once linked to this vendor
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="text-sm text-muted-foreground">
                  Total Purchase Orders
                </div>
                <div className="text-2xl font-bold">{purchaseOrdersCount}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Products Supplied
                </div>
                <div className="text-2xl font-bold">{productsSuppliedCount}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">
                  Last Order Date
                </div>
                <div className="text-sm">
                  {lastOrderDate 
                    ? formatDistanceToNow(lastOrderDate, { addSuffix: true })
                    : "Never"}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Metadata */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Metadata
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <div className="text-muted-foreground">Created</div>
                <div>
                  {new Date(vendor.createdAt).toLocaleDateString()} at{" "}
                  {new Date(vendor.createdAt).toLocaleTimeString()}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Last Updated</div>
                <div>
                  {new Date(vendor.updatedAt).toLocaleDateString()} at{" "}
                  {new Date(vendor.updatedAt).toLocaleTimeString()}
                </div>
              </div>
              <div>
                <div className="text-muted-foreground">Vendor ID</div>
                <div className="font-mono">#{vendor.id}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Vendor Profile</DialogTitle>
            <DialogDescription>
              Update vendor information and contact details
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Vendor Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Enter vendor name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-contactName">Contact Name</Label>
              <Input
                id="edit-contactName"
                value={formData.contactName}
                onChange={e =>
                  setFormData({ ...formData, contactName: e.target.value })
                }
                placeholder="Enter contact person name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-contactEmail">Contact Email</Label>
              <Input
                id="edit-contactEmail"
                type="email"
                value={formData.contactEmail}
                onChange={e =>
                  setFormData({ ...formData, contactEmail: e.target.value })
                }
                placeholder="vendor@example.com"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-contactPhone">Contact Phone</Label>
              <Input
                id="edit-contactPhone"
                type="tel"
                value={formData.contactPhone}
                onChange={e =>
                  setFormData({ ...formData, contactPhone: e.target.value })
                }
                placeholder="+1 (555) 123-4567"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-paymentTerms">Payment Terms</Label>
              <select
                id="edit-paymentTerms"
                value={formData.paymentTerms}
                onChange={e =>
                  setFormData({ ...formData, paymentTerms: e.target.value })
                }
                className="w-full h-10 px-3 border border-input bg-background rounded-md text-sm"
              >
                <option value="">Select payment terms</option>
                {PAYMENT_TERMS_OPTIONS.map(term => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-notes">Notes</Label>
              <Textarea
                id="edit-notes"
                value={formData.notes}
                onChange={e =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="Add any additional notes about this vendor..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsEditDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdate}
              disabled={!formData.name || updateMutation.isPending}
            >
              {updateMutation.isPending ? "Updating..." : "Update Vendor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Vendor Notes & History Dialog */}
      <VendorNotesDialog
        vendorId={vendor.id}
        vendorName={vendor.name}
        open={notesDialogOpen}
        onOpenChange={setNotesDialogOpen}
      />
    </div>
  );
}

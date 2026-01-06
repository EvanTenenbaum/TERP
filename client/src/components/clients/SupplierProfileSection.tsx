import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Edit,
  Package,
  FileText,
  CreditCard,
  Building2,
  Phone,
  Mail,
  User,
} from "lucide-react";

interface SupplierProfileSectionProps {
  clientId: number;
  clientName: string;
}

/**
 * SupplierProfileSection - Displays supplier-specific information for clients with isSeller=true
 * Part of the Canonical Model Unification - replaces VendorProfilePage functionality
 */
export const SupplierProfileSection = React.memo(function SupplierProfileSection({
  clientId,
  clientName,
}: SupplierProfileSectionProps) {
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const utils = trpc.useUtils();

  // Fetch supplier profile data
  const { data: supplierProfile, isLoading: profileLoading } =
    trpc.clients.getSupplierProfile.useQuery({ clientId });

  // Fetch purchase orders for this supplier
  const { data: purchaseOrders, isLoading: posLoading } =
    trpc.purchaseOrders.getBySupplier.useQuery(
      { supplierClientId: clientId },
      { enabled: !!clientId }
    );

  // Update supplier profile mutation
  const updateProfileMutation = trpc.clients.updateSupplierProfile.useMutation({
    onSuccess: () => {
      utils.clients.getSupplierProfile.invalidate({ clientId });
      setEditDialogOpen(false);
    },
  });

  // Format currency
  const formatCurrency = (value: string | number | null | undefined) => {
    if (value === null || value === undefined) return "$0.00";
    const num = typeof value === "string" ? parseFloat(value) : value;
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(num);
  };

  // Format date
  const formatDate = (date: string | Date | null | undefined) => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Get PO status badge
  const getPOStatusBadge = (status: string) => {
    const variants: Record<
      string,
      "default" | "secondary" | "destructive" | "outline"
    > = {
      DRAFT: "outline",
      SENT: "secondary",
      CONFIRMED: "default",
      RECEIVING: "secondary",
      RECEIVED: "default",
      CANCELLED: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  if (profileLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Loading supplier profile...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Supplier Profile Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Supplier Profile
              </CardTitle>
              <CardDescription>
                Supplier-specific information and settings
              </CardDescription>
            </div>
            <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contact Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Contact Information
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Contact Name</Label>
                    <p className="text-sm">{supplierProfile?.contactName || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Contact Email</Label>
                    <p className="text-sm">{supplierProfile?.contactEmail || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Contact Phone</Label>
                    <p className="text-sm">{supplierProfile?.contactPhone || "-"}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Information */}
            <div className="space-y-4">
              <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
                Business Information
              </h4>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">License Number</Label>
                    <p className="text-sm">{supplierProfile?.licenseNumber || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Tax ID</Label>
                    <p className="text-sm">{supplierProfile?.taxId || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Payment Terms</Label>
                    <p className="text-sm">{supplierProfile?.paymentTerms || "-"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-xs text-muted-foreground">Preferred Payment</Label>
                    <p className="text-sm">{supplierProfile?.preferredPaymentMethod || "-"}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Supplier Notes */}
          {supplierProfile?.supplierNotes && (
            <div className="mt-6 pt-6 border-t">
              <Label className="text-xs text-muted-foreground">Supplier Notes</Label>
              <p className="text-sm mt-1 whitespace-pre-wrap">
                {supplierProfile.supplierNotes}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Purchase Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Recent Purchase Orders
              </CardTitle>
              <CardDescription>
                Purchase orders from this supplier
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {posLoading ? (
            <div className="text-center py-4 text-muted-foreground">
              Loading purchase orders...
            </div>
          ) : !purchaseOrders || purchaseOrders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No purchase orders found</p>
              <p className="text-sm mt-1">
                Purchase orders from this supplier will appear here
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>PO Number</TableHead>
                  <TableHead>Order Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {purchaseOrders.slice(0, 5).map((po) => (
                  <TableRow key={po.id}>
                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                    <TableCell>{formatDate(po.orderDate)}</TableCell>
                    <TableCell>{getPOStatusBadge(po.purchaseOrderStatus)}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(po.total)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {purchaseOrders && purchaseOrders.length > 5 && (
            <div className="mt-4 text-center">
              <Button variant="link" size="sm">
                View all {purchaseOrders.length} purchase orders
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Supplier Profile Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="w-full sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Supplier Profile</DialogTitle>
            <DialogDescription>
              Update supplier information for {clientName}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              const paymentMethod = formData.get("preferredPaymentMethod") as string;
              const validPaymentMethods = ['CASH', 'CHECK', 'WIRE', 'ACH', 'CREDIT_CARD', 'OTHER', ''] as const;
              type PaymentMethod = typeof validPaymentMethods[number];
              
              updateProfileMutation.mutate({
                clientId,
                contactName: (formData.get("contactName") as string) || undefined,
                contactEmail: (formData.get("contactEmail") as string) || undefined,
                contactPhone: (formData.get("contactPhone") as string) || undefined,
                licenseNumber: (formData.get("licenseNumber") as string) || undefined,
                taxId: (formData.get("taxId") as string) || undefined,
                paymentTerms: (formData.get("paymentTerms") as string) || undefined,
                preferredPaymentMethod: (validPaymentMethods.includes(paymentMethod as PaymentMethod) ? paymentMethod : undefined) as PaymentMethod | undefined,
                supplierNotes: (formData.get("supplierNotes") as string) || undefined,
              });
            }}
          >
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contactName">Contact Name</Label>
                  <Input
                    id="contactName"
                    name="contactName"
                    defaultValue={supplierProfile?.contactName || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    name="contactEmail"
                    type="email"
                    defaultValue={supplierProfile?.contactEmail || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    name="contactPhone"
                    defaultValue={supplierProfile?.contactPhone || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="licenseNumber">License Number</Label>
                  <Input
                    id="licenseNumber"
                    name="licenseNumber"
                    defaultValue={supplierProfile?.licenseNumber || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="taxId">Tax ID</Label>
                  <Input
                    id="taxId"
                    name="taxId"
                    defaultValue={supplierProfile?.taxId || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="paymentTerms">Payment Terms</Label>
                  <Input
                    id="paymentTerms"
                    name="paymentTerms"
                    placeholder="e.g., Net 30"
                    defaultValue={supplierProfile?.paymentTerms || ""}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="preferredPaymentMethod">Preferred Payment Method</Label>
                  <Select
                    name="preferredPaymentMethod"
                    defaultValue={supplierProfile?.preferredPaymentMethod || ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select payment method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CHECK">Check</SelectItem>
                      <SelectItem value="WIRE">Wire Transfer</SelectItem>
                      <SelectItem value="ACH">ACH</SelectItem>
                      <SelectItem value="CREDIT_CARD">Credit Card</SelectItem>
                      <SelectItem value="OTHER">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="supplierNotes">Supplier Notes</Label>
                <Textarea
                  id="supplierNotes"
                  name="supplierNotes"
                  rows={4}
                  placeholder="Notes about this supplier..."
                  defaultValue={supplierProfile?.supplierNotes || ""}
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateProfileMutation.isPending}>
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
});

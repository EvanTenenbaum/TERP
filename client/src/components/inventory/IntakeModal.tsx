import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

interface IntakeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function IntakeModal({ open, onClose, onSuccess }: IntakeModalProps) {
  const [formData, setFormData] = useState({
    vendorName: "",
    brandName: "",
    productName: "",
    category: "Flower",
    subcategory: "",
    grade: "A",
    quantity: "",
    cogsMode: "FIXED" as "FIXED" | "RANGE",
    unitCogs: "",
    unitCogsMin: "",
    unitCogsMax: "",
    paymentTerms: "NET_30" as "COD" | "NET_7" | "NET_15" | "NET_30" | "CONSIGNMENT" | "PARTIAL",
    siteCode: "WH1",
    locationSite: "Warehouse 1",
    locationZone: "",
    locationRack: "",
    locationShelf: "",
    locationBin: "",
  });

  const utils = trpc.useUtils();
  const intakeMutation = trpc.inventory.intake.useMutation({
    onSuccess: () => {
      toast.success("Batch created successfully!");
      utils.inventory.list.invalidate();
      onSuccess?.();
      onClose();
      resetForm();
    },
    onError: (error) => {
      toast.error(`Failed to create batch: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      vendorName: "",
      brandName: "",
      productName: "",
      category: "Flower",
      subcategory: "",
      grade: "A",
      quantity: "",
      cogsMode: "FIXED",
      unitCogs: "",
      unitCogsMin: "",
      unitCogsMax: "",
      paymentTerms: "NET_30",
      siteCode: "WH1",
      locationSite: "Warehouse 1",
      locationZone: "",
      locationRack: "",
      locationShelf: "",
      locationBin: "",
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!formData.vendorName || !formData.brandName || !formData.productName) {
      toast.error("Please fill in all required fields");
      return;
    }

    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    // COGS validation
    if (formData.cogsMode === "FIXED" && !formData.unitCogs) {
      toast.error("Please enter unit COGS for FIXED mode");
      return;
    }



    if (formData.cogsMode === "RANGE" && (!formData.unitCogsMin || !formData.unitCogsMax)) {
      toast.error("Please enter unit COGS min and max for RANGE mode");
      return;
    }

    intakeMutation.mutate({
      vendorName: formData.vendorName,
      brandName: formData.brandName,
      productName: formData.productName,
      category: formData.category,
      subcategory: formData.subcategory || undefined,
      grade: formData.grade || undefined,
      quantity: parseFloat(formData.quantity),
      cogsMode: formData.cogsMode,
      unitCogs: formData.unitCogs || undefined,
      unitCogsMin: formData.unitCogsMin || undefined,
      unitCogsMax: formData.unitCogsMax || undefined,
      paymentTerms: formData.paymentTerms,
      location: {
        site: formData.locationSite,
        zone: formData.locationZone || undefined,
        rack: formData.locationRack || undefined,
        shelf: formData.locationShelf || undefined,
        bin: formData.locationBin || undefined,
      },
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto w-[95vw] sm:w-full">
        <DialogHeader>
          <DialogTitle>New Inventory Intake</DialogTitle>
          <DialogDescription>
            Create a new batch by entering vendor, product, and quantity information.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vendor & Brand */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vendorName">Vendor Name *</Label>
              <Input
                id="vendorName"
                value={formData.vendorName}
                onChange={(e) => setFormData({ ...formData, vendorName: e.target.value })}
                placeholder="e.g., Green Valley Farms"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brandName">Brand Name *</Label>
              <Input
                id="brandName"
                value={formData.brandName}
                onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                placeholder="e.g., Premium Organics"
                required
              />
            </div>
          </div>

          {/* Product Info */}
          <div className="space-y-2">
            <Label htmlFor="productName">Product Name *</Label>
            <Input
              id="productName"
              value={formData.productName}
              onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
              placeholder="e.g., Gelato #41"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value })}
              >
                <SelectTrigger id="category">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Flower">Flower</SelectItem>
                  <SelectItem value="Concentrate">Concentrate</SelectItem>
                  <SelectItem value="Edible">Edible</SelectItem>
                  <SelectItem value="Vape">Vape</SelectItem>
                  <SelectItem value="Topical">Topical</SelectItem>
                  <SelectItem value="Accessory">Accessory</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory</Label>
              <Input
                id="subcategory"
                value={formData.subcategory}
                onChange={(e) => setFormData({ ...formData, subcategory: e.target.value })}
                placeholder="e.g., Indica"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">Grade</Label>
              <Select
                value={formData.grade}
                onValueChange={(value) => setFormData({ ...formData, grade: value })}
              >
                <SelectTrigger id="grade">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity *</Label>
            <Input
              id="quantity"
              type="number"
              step="0.01"
              value={formData.quantity}
              onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              placeholder="e.g., 1000.00"
              required
            />
          </div>

          {/* COGS Mode */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cogsMode">COGS Mode *</Label>
              <Select
                value={formData.cogsMode}
                onValueChange={(value: any) => setFormData({ ...formData, cogsMode: value })}
              >
                <SelectTrigger id="cogsMode">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="FIXED">Fixed Price</SelectItem>
                  <SelectItem value="RANGE">Price Range</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.cogsMode === "FIXED" && (
              <div className="space-y-2">
                <Label htmlFor="unitCogs">Unit COGS *</Label>
                <Input
                  id="unitCogs"
                  type="number"
                  step="0.01"
                  value={formData.unitCogs}
                  onChange={(e) => setFormData({ ...formData, unitCogs: e.target.value })}
                  placeholder="e.g., 25.00"
                  required
                />
              </div>
            )}


            {formData.cogsMode === "RANGE" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitCogsMin">Unit COGS Min *</Label>
                  <Input
                    id="unitCogsMin"
                    type="number"
                    step="0.01"
                    value={formData.unitCogsMin}
                    onChange={(e) => setFormData({ ...formData, unitCogsMin: e.target.value })}
                    placeholder="e.g., 20.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitCogsMax">Unit COGS Max *</Label>
                  <Input
                    id="unitCogsMax"
                    type="number"
                    step="0.01"
                    value={formData.unitCogsMax}
                    onChange={(e) => setFormData({ ...formData, unitCogsMax: e.target.value })}
                    placeholder="e.g., 30.00"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payment Terms */}
          <div className="space-y-2">
            <Label htmlFor="paymentTerms">Payment Terms *</Label>
            <Select
              value={formData.paymentTerms}
              onValueChange={(value: any) => setFormData({ ...formData, paymentTerms: value })}
            >
              <SelectTrigger id="paymentTerms">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="COD">COD (Cash on Delivery)</SelectItem>
                <SelectItem value="NET_7">Net 7 Days</SelectItem>
                <SelectItem value="NET_15">Net 15 Days</SelectItem>
                <SelectItem value="NET_30">Net 30 Days</SelectItem>
                <SelectItem value="CONSIGNMENT">Consignment</SelectItem>
                <SelectItem value="PARTIAL">Partial Payment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div className="space-y-4">
            <h3 className="font-semibold">Storage Location</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="siteCode">Site Code *</Label>
                <Input
                  id="siteCode"
                  value={formData.siteCode}
                  onChange={(e) => setFormData({ ...formData, siteCode: e.target.value })}
                  placeholder="e.g., WH1"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationSite">Site Name *</Label>
                <Input
                  id="locationSite"
                  value={formData.locationSite}
                  onChange={(e) => setFormData({ ...formData, locationSite: e.target.value })}
                  placeholder="e.g., Warehouse 1"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="locationZone">Zone</Label>
                <Input
                  id="locationZone"
                  value={formData.locationZone}
                  onChange={(e) => setFormData({ ...formData, locationZone: e.target.value })}
                  placeholder="e.g., A"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationRack">Rack</Label>
                <Input
                  id="locationRack"
                  value={formData.locationRack}
                  onChange={(e) => setFormData({ ...formData, locationRack: e.target.value })}
                  placeholder="e.g., R1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationShelf">Shelf</Label>
                <Input
                  id="locationShelf"
                  value={formData.locationShelf}
                  onChange={(e) => setFormData({ ...formData, locationShelf: e.target.value })}
                  placeholder="e.g., S3"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="locationBin">Bin</Label>
                <Input
                  id="locationBin"
                  value={formData.locationBin}
                  onChange={(e) => setFormData({ ...formData, locationBin: e.target.value })}
                  placeholder="e.g., B12"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={intakeMutation.isPending}>
              {intakeMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Batch
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


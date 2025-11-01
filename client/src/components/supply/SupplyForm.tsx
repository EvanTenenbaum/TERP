import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";
import { StrainInput } from "@/components/inventory/StrainInput";

/**
 * Supply Form Component
 * Form for creating or editing vendor supply items with validation
 */

interface SupplyFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vendorId: number;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  mode?: "create" | "edit";
}

export function SupplyForm({
  open,
  onOpenChange,
  vendorId,
  onSubmit,
  initialData,
  mode = "create",
}: SupplyFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    strain: initialData?.strain || "",
    productName: initialData?.productName || "",
    strainId: initialData?.strainId || null,
    category: initialData?.category || "",
    subcategory: initialData?.subcategory || "",
    grade: initialData?.grade || "",
    quantityAvailable: initialData?.quantityAvailable || "",
    unitPrice: initialData?.unitPrice || "",
    availableUntil: initialData?.availableUntil
      ? new Date(initialData.availableUntil).toISOString().split("T")[0]
      : "",
    notes: initialData?.notes || "",
    internalNotes: initialData?.internalNotes || "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const validateForm = () => {
    // Validate quantity
    if (!formData.quantityAvailable || parseFloat(formData.quantityAvailable) <= 0) {
      setError("Quantity available must be greater than 0");
      return false;
    }

    // Validate based on category (flower vs non-flower)
    const isFlower =
      formData.category?.toLowerCase() === "flower" ||
      formData.category?.toLowerCase() === "flowers";

    if (isFlower) {
      // Flower: strain is required
      if (!formData.strain) {
        setError("Strain is required for flower products");
        return false;
      }
    } else {
      // Non-flower: product name OR strain required (at least one)
      if (!formData.productName && !formData.strain) {
        setError("Product name or strain is required for non-flower products");
        return false;
      }
    }

    // At least one search criteria required
    if (
      !formData.strain &&
      !formData.productName &&
      !formData.category &&
      !formData.subcategory &&
      !formData.grade
    ) {
      setError("Please specify at least one product criteria");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await onSubmit({
        ...formData,
        vendorId,
      });

      // Reset form on success
      setFormData({
        strain: "",
        productName: "",
        strainId: null,
        category: "",
        subcategory: "",
        grade: "",
        quantityAvailable: "",
        unitPrice: "",
        availableUntil: "",
        notes: "",
        internalNotes: "",
      });

      onOpenChange(false);
    } catch (err: any) {
      console.error("Error submitting supply:", err);
      setError(err.message || "Failed to save supply. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Add Vendor Supply" : "Edit Vendor Supply"}
          </DialogTitle>
          <DialogDescription>
            Record what this vendor has available. The system will automatically find matching client needs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Product Criteria */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Product Information</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  placeholder="e.g., Flower, Vape, Edible"
                />
              </div>

              {/* Conditional: Flower vs Non-Flower */}
              {formData.category?.toLowerCase() === "flower" ||
              formData.category?.toLowerCase() === "flowers" ? (
                // FLOWER: Only strain input
                <div className="space-y-2">
                  <Label htmlFor="strain">Strain *</Label>
                  <StrainInput
                    value={formData.strainId}
                    onChange={(strainId, strainName) => {
                      setFormData((prev) => ({
                        ...prev,
                        strain: strainName,
                        strainId,
                      }));
                      setError(null);
                    }}
                    placeholder="e.g., Blue Dream"
                  />
                </div>
              ) : (
                // NON-FLOWER: Product name + optional strain
                <>
                  <div className="space-y-2">
                    <Label htmlFor="productName">
                      Product Name {formData.category && "(or Strain)"}*
                    </Label>
                    <Input
                      id="productName"
                      value={formData.productName}
                      onChange={(e) => handleChange("productName", e.target.value)}
                      placeholder="e.g., Ceramic 510 Cart, Mixed Fruit Gummies"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="strain">Strain (Optional)</Label>
                    <StrainInput
                      value={formData.strainId}
                      onChange={(strainId, strainName) => {
                        setFormData((prev) => ({
                          ...prev,
                          strain: strainName,
                          strainId,
                        }));
                        setError(null);
                      }}
                      placeholder="e.g., OG Kush"
                    />
                  </div>
                </>
              )}

              <div className="space-y-2">
                <Label htmlFor="subcategory">Subcategory</Label>
                <Input
                  id="subcategory"
                  value={formData.subcategory}
                  onChange={(e) => handleChange("subcategory", e.target.value)}
                  placeholder="e.g., Indoor"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  value={formData.grade}
                  onChange={(e) => handleChange("grade", e.target.value)}
                  placeholder="e.g., A+"
                />
              </div>
            </div>
          </div>

          {/* Quantity and Price */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Quantity & Price</h4>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quantityAvailable">Quantity Available *</Label>
                <Input
                  id="quantityAvailable"
                  type="number"
                  step="0.01"
                  value={formData.quantityAvailable}
                  onChange={(e) => handleChange("quantityAvailable", e.target.value)}
                  placeholder="0"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="unitPrice">Unit Price</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  value={formData.unitPrice}
                  onChange={(e) => handleChange("unitPrice", e.target.value)}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="availableUntil">Available Until</Label>
                <Input
                  id="availableUntil"
                  type="date"
                  value={formData.availableUntil}
                  onChange={(e) => handleChange("availableUntil", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Notes</h4>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Visible to Vendor)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Additional information about this supply..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="internalNotes">Internal Notes (Staff Only)</Label>
              <Textarea
                id="internalNotes"
                value={formData.internalNotes}
                onChange={(e) => handleChange("internalNotes", e.target.value)}
                placeholder="Internal notes not visible to vendor..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : mode === "create" ? (
                "Create Supply"
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


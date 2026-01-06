import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type {
  NeedFormMode,
  NeedFormPayload,
  NeedFormState,
} from "./needForm.types";

/**
 * Need Form Component
 * Form for creating or editing client needs with validation
 */

interface NeedFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  onSubmit: (data: NeedFormPayload) => Promise<void>;
  initialData?: Partial<NeedFormPayload>;
  mode?: NeedFormMode;
}

export function NeedForm({
  open,
  onOpenChange,
  clientId,
  onSubmit,
  initialData,
  mode = "create",
}: NeedFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDuplicate, setIsDuplicate] = useState(false);

  const [formData, setFormData] = useState<NeedFormState>({
    strain: initialData?.strain || "",
    productName: initialData?.productName || "",
    strainId: initialData?.strainId ?? null,
    category: initialData?.category || "",
    subcategory: initialData?.subcategory || "",
    grade: initialData?.grade || "",
    quantityMin:
      initialData?.quantityMin !== undefined
        ? String(initialData.quantityMin)
        : "",
    quantityMax:
      initialData?.quantityMax !== undefined
        ? String(initialData.quantityMax)
        : "",
    priceMax:
      initialData?.priceMax !== undefined ? String(initialData.priceMax) : "",
    priority: initialData?.priority || "MEDIUM",
    neededBy: initialData?.neededBy
      ? new Date(initialData.neededBy).toISOString().split("T")[0]
      : "",
    expiresAt: initialData?.expiresAt
      ? new Date(initialData.expiresAt).toISOString().split("T")[0]
      : "",
    notes: initialData?.notes || "",
    internalNotes: initialData?.internalNotes || "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError(null);
    setIsDuplicate(false);
  };

  const parseNumber = (value: string) => {
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? null : parsed;
  };

  const validateForm = (parsedValues: {
    minQty: number | null;
    maxQty: number | null;
    maxPrice: number | null;
  }) => {
    const { minQty, maxQty, maxPrice } = parsedValues;

    if (formData.quantityMin && minQty === null) {
      setError("Minimum quantity must be a valid number");
      return false;
    }

    if (formData.quantityMax && maxQty === null) {
      setError("Maximum quantity must be a valid number");
      return false;
    }

    if (formData.priceMax && maxPrice === null) {
      setError("Maximum price must be a valid number");
      return false;
    }

    // Validate quantities
    if (minQty !== null && maxQty !== null) {
      if (maxQty < minQty) {
        setError(
          "Maximum quantity must be greater than or equal to minimum quantity"
        );
        return false;
      }
    }

    // Validate dates
    if (formData.neededBy && formData.expiresAt) {
      const neededBy = new Date(formData.neededBy);
      const expiresAt = new Date(formData.expiresAt);
      if (expiresAt <= neededBy) {
        setError("Expiration date must be after needed by date");
        return false;
      }
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
      setError("Please specify at least one search criteria");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsedValues = {
      minQty: formData.quantityMin ? parseNumber(formData.quantityMin) : null,
      maxQty: formData.quantityMax ? parseNumber(formData.quantityMax) : null,
      maxPrice: formData.priceMax ? parseNumber(formData.priceMax) : null,
    };

    if (!validateForm(parsedValues)) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSubmit({
        clientId,
        ...formData,
        // Convert empty strings to undefined
        strain: formData.strain || undefined,
        strainId: formData.strainId || undefined,
        category: formData.category || undefined,
        subcategory: formData.subcategory || undefined,
        grade: formData.grade || undefined,
        quantityMin: parsedValues.minQty ?? undefined,
        quantityMax: parsedValues.maxQty ?? undefined,
        priceMax: parsedValues.maxPrice ?? undefined,
        neededBy: formData.neededBy || undefined,
        expiresAt: formData.expiresAt || undefined,
        notes: formData.notes || undefined,
        internalNotes: formData.internalNotes || undefined,
      });

      // Reset form on success
      setFormData({
        strain: "",
        productName: "",
        strainId: null,
        category: "",
        subcategory: "",
        grade: "",
        quantityMin: "",
        quantityMax: "",
        priceMax: "",
        priority: "MEDIUM",
        neededBy: "",
        expiresAt: "",
        notes: "",
        internalNotes: "",
      });

      onOpenChange(false);
    } catch (err: unknown) {
      console.error("Error submitting need:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Failed to save need. Please try again.";

      if (message.includes("similar")) {
        setIsDuplicate(true);
        setError(message);
      } else {
        setError(message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Client Need" : "Edit Client Need"}
          </DialogTitle>
          <DialogDescription>
            Specify what the client is looking for. The system will
            automatically find matches.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant={isDuplicate ? "default" : "destructive"}>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Product Criteria */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Product Criteria</h4>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={e => handleChange("category", e.target.value)}
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
                      setFormData(prev => ({
                        ...prev,
                        strain: strainName,
                        strainId,
                      }));
                      setError(null);
                      setIsDuplicate(false);
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
                      onChange={e =>
                        handleChange("productName", e.target.value)
                      }
                      placeholder="e.g., Ceramic 510 Cart, Mixed Fruit Gummies"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="strain">Strain (Optional)</Label>
                    <StrainInput
                      value={formData.strainId}
                      onChange={(strainId, strainName) => {
                        setFormData(prev => ({
                          ...prev,
                          strain: strainName,
                          strainId,
                        }));
                        setError(null);
                        setIsDuplicate(false);
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
                  onChange={e => handleChange("subcategory", e.target.value)}
                  placeholder="e.g., Indoor"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  value={formData.grade}
                  onChange={e => handleChange("grade", e.target.value)}
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
                <Label htmlFor="quantityMin">Min Quantity</Label>
                <Input
                  id="quantityMin"
                  type="number"
                  step="0.01"
                  value={formData.quantityMin}
                  onChange={e => handleChange("quantityMin", e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="quantityMax">Max Quantity</Label>
                <Input
                  id="quantityMax"
                  type="number"
                  step="0.01"
                  value={formData.quantityMax}
                  onChange={e => handleChange("quantityMax", e.target.value)}
                  placeholder="0"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="priceMax">Max Price (per unit)</Label>
                <Input
                  id="priceMax"
                  type="number"
                  step="0.01"
                  value={formData.priceMax}
                  onChange={e => handleChange("priceMax", e.target.value)}
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>

          {/* Priority and Dates */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium">Priority & Timeline</h4>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority</Label>
                <Select
                  value={formData.priority}
                  onValueChange={value => handleChange("priority", value)}
                >
                  <SelectTrigger id="priority">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="neededBy">Needed By</Label>
                <Input
                  id="neededBy"
                  type="date"
                  value={formData.neededBy}
                  onChange={e => handleChange("neededBy", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expires At</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={formData.expiresAt}
                  onChange={e => handleChange("expiresAt", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (visible to client)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={e => handleChange("notes", e.target.value)}
                placeholder="Additional details about this need..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="internalNotes">Internal Notes (private)</Label>
              <Textarea
                id="internalNotes"
                value={formData.internalNotes}
                onChange={e => handleChange("internalNotes", e.target.value)}
                placeholder="Internal notes for team..."
                rows={2}
              />
            </div>
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
              {isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {mode === "create" ? "Create Need" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

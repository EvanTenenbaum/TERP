import { useState } from "react";
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

/**
 * Need Form Component
 * Form for creating or editing client needs with validation
 */

interface NeedFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientId: number;
  onSubmit: (data: any) => Promise<void>;
  initialData?: any;
  mode?: "create" | "edit";
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

  const [formData, setFormData] = useState({
    strain: initialData?.strain || "",
    category: initialData?.category || "",
    subcategory: initialData?.subcategory || "",
    grade: initialData?.grade || "",
    quantityMin: initialData?.quantityMin || "",
    quantityMax: initialData?.quantityMax || "",
    priceMax: initialData?.priceMax || "",
    priority: initialData?.priority || "MEDIUM",
    neededBy: initialData?.neededBy ? new Date(initialData.neededBy).toISOString().split("T")[0] : "",
    expiresAt: initialData?.expiresAt ? new Date(initialData.expiresAt).toISOString().split("T")[0] : "",
    notes: initialData?.notes || "",
    internalNotes: initialData?.internalNotes || "",
  });

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
    setIsDuplicate(false);
  };

  const validateForm = () => {
    // Validate quantities
    if (formData.quantityMin && formData.quantityMax) {
      const min = parseFloat(formData.quantityMin);
      const max = parseFloat(formData.quantityMax);
      if (max < min) {
        setError("Maximum quantity must be greater than or equal to minimum quantity");
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

    // At least one search criteria required
    if (!formData.strain && !formData.category && !formData.subcategory && !formData.grade) {
      setError("Please specify at least one search criteria (strain, category, subcategory, or grade)");
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
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
        category: formData.category || undefined,
        subcategory: formData.subcategory || undefined,
        grade: formData.grade || undefined,
        quantityMin: formData.quantityMin || undefined,
        quantityMax: formData.quantityMax || undefined,
        priceMax: formData.priceMax || undefined,
        neededBy: formData.neededBy || undefined,
        expiresAt: formData.expiresAt || undefined,
        notes: formData.notes || undefined,
        internalNotes: formData.internalNotes || undefined,
      });
      
      // Reset form on success
      setFormData({
        strain: "",
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
    } catch (err: any) {
      console.error("Error submitting need:", err);
      
      // Check if it's a duplicate
      if (err.message && err.message.includes("similar")) {
        setIsDuplicate(true);
        setError(err.message);
      } else {
        setError(err.message || "Failed to save need. Please try again.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === "create" ? "Create Client Need" : "Edit Client Need"}
          </DialogTitle>
          <DialogDescription>
            Specify what the client is looking for. The system will automatically find matches.
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
                <Label htmlFor="strain">Strain</Label>
                <Input
                  id="strain"
                  value={formData.strain}
                  onChange={(e) => handleChange("strain", e.target.value)}
                  placeholder="e.g., Blue Dream"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  placeholder="e.g., Flower"
                />
              </div>

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
                <Label htmlFor="quantityMin">Min Quantity</Label>
                <Input
                  id="quantityMin"
                  type="number"
                  step="0.01"
                  value={formData.quantityMin}
                  onChange={(e) => handleChange("quantityMin", e.target.value)}
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
                  onChange={(e) => handleChange("quantityMax", e.target.value)}
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
                  onChange={(e) => handleChange("priceMax", e.target.value)}
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
                <Select value={formData.priority} onValueChange={(value) => handleChange("priority", value)}>
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
                  onChange={(e) => handleChange("neededBy", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="expiresAt">Expires At</Label>
                <Input
                  id="expiresAt"
                  type="date"
                  value={formData.expiresAt}
                  onChange={(e) => handleChange("expiresAt", e.target.value)}
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
                onChange={(e) => handleChange("notes", e.target.value)}
                placeholder="Additional details about this need..."
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="internalNotes">Internal Notes (private)</Label>
              <Textarea
                id="internalNotes"
                value={formData.internalNotes}
                onChange={(e) => handleChange("internalNotes", e.target.value)}
                placeholder="Internal notes for team..."
                rows={2}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === "create" ? "Create Need" : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


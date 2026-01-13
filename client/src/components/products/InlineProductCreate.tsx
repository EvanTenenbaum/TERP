/**
 * InlineProductCreate Component - ENH-003, MEET-031
 * Quick product creation modal triggered from order forms
 *
 * Features:
 * - Minimal form: name, category, brand, subcategory (no SKU field)
 * - SKU/Product code auto-generated on backend (MEET-031)
 * - Format: [CATEGORY]-[BRAND]-[SEQUENCE]
 * - Triggered when product not found during order entry
 * - Creates product and returns it for immediate use
 * - Success state with product details and generated code
 * - Error handling with retry option
 */

import React, { useState, useCallback, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Loader2,
  Plus,
  AlertCircle,
  CheckCircle2,
  Package,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

export interface InlineProductCreateProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback when dialog open state changes */
  onOpenChange: (open: boolean) => void;
  /** Pre-filled product name (from search that found no results) */
  initialName?: string;
  /** Pre-selected category */
  initialCategory?: string;
  /** Pre-selected brand ID */
  initialBrandId?: number;
  /** Callback when product is created/selected, returns the product for use */
  onProductCreated: (product: CreatedProduct) => void;
  /** Title for the dialog */
  title?: string;
}

export interface CreatedProduct {
  id: number;
  nameCanonical: string;
  category: string;
  brandId: number;
  brandName: string | null;
  strainId: number | null;
  strainName: string | null;
  subcategory: string | null;
  uomSellable: string;
  generatedCode: string;
  isDuplicate: boolean;
}

// Standard product categories
const PRODUCT_CATEGORIES = [
  "Flower",
  "Concentrate",
  "Edible",
  "Vape",
  "Pre-Roll",
  "Topical",
  "Tincture",
  "Accessory",
  "Other",
];

// ============================================================================
// COMPONENT
// ============================================================================

export function InlineProductCreate({
  open,
  onOpenChange,
  initialName = "",
  initialCategory = "",
  initialBrandId,
  onProductCreated,
  title = "Create New Product",
}: InlineProductCreateProps): React.ReactElement {
  // Form state
  const [name, setName] = useState(initialName);
  const [category, setCategory] = useState(initialCategory);
  const [brandId, setBrandId] = useState<number | null>(initialBrandId ?? null);
  const [subcategory, setSubcategory] = useState("");

  // UI state
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [createdProduct, setCreatedProduct] = useState<CreatedProduct | null>(
    null
  );

  // Fetch brands for dropdown
  const { data: brands, isLoading: brandsLoading } =
    trpc.productCatalogue.getBrands.useQuery();

  // Quick create mutation
  const quickCreate = trpc.productCatalogue.quickCreate.useMutation({
    onSuccess: result => {
      if (result.isDuplicate) {
        toast.info(`Found existing product: ${result.product.nameCanonical}`);
      } else {
        toast.success(`Created product: ${result.product.nameCanonical}`);
      }
      setCreatedProduct(result.product);
      setSuccess(true);
      setError(null);
    },
    onError: err => {
      setError(err.message);
      toast.error(`Failed to create product: ${err.message}`);
    },
  });

  // Reset form when dialog opens with new initial values
  useEffect(() => {
    if (open) {
      setName(initialName);
      setCategory(initialCategory);
      setBrandId(initialBrandId ?? null);
      setSubcategory("");
      setError(null);
      setSuccess(false);
      setCreatedProduct(null);
    }
  }, [open, initialName, initialCategory, initialBrandId]);

  // Handle form submission
  const handleSubmit = useCallback(() => {
    // Validation
    if (!name.trim()) {
      setError("Product name is required");
      return;
    }
    if (!category) {
      setError("Category is required");
      return;
    }
    if (!brandId) {
      setError("Brand is required");
      return;
    }

    setError(null);
    quickCreate.mutate({
      name: name.trim(),
      category,
      brandId,
      subcategory: subcategory.trim() || null,
      uomSellable: "EA",
    });
  }, [name, category, brandId, subcategory, quickCreate]);

  // Handle using the created product
  const handleUseProduct = useCallback(() => {
    if (createdProduct) {
      onProductCreated(createdProduct);
      onOpenChange(false);
    }
  }, [createdProduct, onProductCreated, onOpenChange]);

  // Handle dialog close
  const handleClose = useCallback(() => {
    if (!quickCreate.isPending) {
      onOpenChange(false);
    }
  }, [quickCreate.isPending, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>
            {success
              ? "Product is ready to use in your order."
              : "Create a new product quickly with minimal details."}
          </DialogDescription>
        </DialogHeader>

        {success && createdProduct ? (
          // Success State
          <div className="py-4 space-y-4">
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {createdProduct.isDuplicate
                  ? "Found existing product that matches your criteria."
                  : "Product created successfully!"}
              </AlertDescription>
            </Alert>

            <div className="bg-muted rounded-lg p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Name:</span>
                <span className="text-sm font-medium">
                  {createdProduct.nameCanonical}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Category:</span>
                <span className="text-sm font-medium">
                  {createdProduct.category}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Brand:</span>
                <span className="text-sm font-medium">
                  {createdProduct.brandName ?? "Unknown"}
                </span>
              </div>
              {createdProduct.subcategory && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">
                    Subcategory:
                  </span>
                  <span className="text-sm font-medium">
                    {createdProduct.subcategory}
                  </span>
                </div>
              )}
              {createdProduct.generatedCode && (
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Code:</span>
                  <span className="text-sm font-mono">
                    {createdProduct.generatedCode}
                  </span>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button onClick={handleUseProduct}>
                <Plus className="h-4 w-4 mr-2" />
                Use This Product
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Form State
          <div className="py-4 space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="product-name">
                Product Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="product-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Enter product name"
                disabled={quickCreate.isPending}
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-category">
                Category <span className="text-destructive">*</span>
              </Label>
              <Select
                value={category}
                onValueChange={setCategory}
                disabled={quickCreate.isPending}
              >
                <SelectTrigger id="product-category">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_CATEGORIES.map(cat => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-brand">
                Brand <span className="text-destructive">*</span>
              </Label>
              <Select
                value={brandId?.toString() ?? ""}
                onValueChange={v => setBrandId(parseInt(v, 10))}
                disabled={quickCreate.isPending || brandsLoading}
              >
                <SelectTrigger id="product-brand">
                  <SelectValue
                    placeholder={brandsLoading ? "Loading..." : "Select brand"}
                  />
                </SelectTrigger>
                <SelectContent>
                  {brands?.map(brand => (
                    <SelectItem key={brand.id} value={brand.id.toString()}>
                      {brand.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-subcategory">
                Subcategory (optional)
              </Label>
              <Input
                id="product-subcategory"
                value={subcategory}
                onChange={e => setSubcategory(e.target.value)}
                placeholder="e.g., Smalls, Indoor, Outdoor"
                disabled={quickCreate.isPending}
              />
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={quickCreate.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  quickCreate.isPending || !name || !category || !brandId
                }
              >
                {quickCreate.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Product
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default InlineProductCreate;

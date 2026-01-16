# Specification: ENH-003 - Integrate In-line Product Creation UI

**Status:** Draft
**Priority:** HIGH
**Estimate:** 16h
**Module:** Frontend / Purchase Orders
**Dependencies:** FEAT-003 (In-line Product Creation API)
**Spec Author:** Claude AI
**Spec Date:** 2026-01-12

---

## 1. Problem Statement

When creating a Purchase Order and a product doesn't exist in the system, users must leave the PO workflow to create the product elsewhere. The frontend needs a modal/drawer interface that allows product creation directly within the PO form, calling the in-line product creation API.

**User Quote:**
> "skew product creation process should be happening here. You shouldn't have to go somewhere else to create a product and then add it to an intake process."

## 2. User Stories

1. **As a purchasing manager**, I want to create a new product without leaving the PO form, so that my workflow isn't interrupted.

2. **As a warehouse staff member**, I want a quick product creation form, so that I can process vendor deliveries faster.

## 3. Functional Requirements

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-01 | "Create New Product" button in PO line item area | Must Have |
| FR-02 | Modal form with product fields | Must Have |
| FR-03 | Brand dropdown with "Add New Brand" option | Must Have |
| FR-04 | Category/subcategory selection | Must Have |
| FR-05 | COGS input with mode selection (FIXED/RANGE) | Must Have |
| FR-06 | Created product auto-added to PO line | Must Have |
| FR-07 | Strain lookup with auto-complete for flower | Should Have |
| FR-08 | Form validation with clear error messages | Must Have |

## 4. Technical Specification

### 4.1 Component Structure

**File:** `/home/user/TERP/client/src/components/products/InlineProductCreationModal.tsx`

```typescript
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc";
import {
  Dialog,
  DialogContent,
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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Loader2 } from "lucide-react";
import { BrandCombobox } from "./BrandCombobox";
import { StrainAutocomplete } from "./StrainAutocomplete";
import { CategorySelect } from "./CategorySelect";

const formSchema = z.object({
  productName: z.string().min(1, "Product name is required"),
  category: z.string().min(1, "Category is required"),
  subcategory: z.string().optional(),
  description: z.string().optional(),
  uomSellable: z.string().default("EA"),
  brandType: z.enum(["existing", "new"]),
  brandId: z.number().optional(),
  newBrandName: z.string().optional(),
  strainType: z.enum(["existing", "new", "none"]),
  strainId: z.number().optional(),
  newStrainName: z.string().optional(),
  strainCategory: z.enum(["Indica", "Sativa", "Hybrid"]).optional(),
  cogsMode: z.enum(["FIXED", "RANGE"]),
  unitCogs: z.number().optional(),
  unitCogsMin: z.number().optional(),
  unitCogsMax: z.number().optional(),
  quantity: z.number().positive("Quantity must be positive"),
  paymentTerms: z.enum(["COD", "NET_7", "NET_15", "NET_30", "CONSIGNMENT", "PARTIAL"]),
  grade: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface InlineProductCreationModalProps {
  open: boolean;
  onClose: () => void;
  onProductCreated: (result: {
    productId: number;
    sku: string;
    batchId: number;
    batchCode: string;
  }) => void;
  vendorClientId?: number;
  lotId?: number;
}

export function InlineProductCreationModal({
  open,
  onClose,
  onProductCreated,
  vendorClientId,
  lotId,
}: InlineProductCreationModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      brandType: "existing",
      strainType: "none",
      cogsMode: "FIXED",
      uomSellable: "EA",
      paymentTerms: "NET_30",
    },
  });

  const createProduct = trpc.products.createInline.useMutation({
    onSuccess: (result) => {
      onProductCreated(result);
      form.reset();
      onClose();
    },
    onError: (error) => {
      // Handle error
      console.error("Failed to create product:", error);
    },
  });

  const watchCategory = form.watch("category");
  const watchBrandType = form.watch("brandType");
  const watchStrainType = form.watch("strainType");
  const watchCogsMode = form.watch("cogsMode");
  const isFlower = watchCategory === "Flower";

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);

    try {
      await createProduct.mutateAsync({
        product: {
          nameCanonical: data.productName,
          category: data.category,
          subcategory: data.subcategory,
          description: data.description,
          uomSellable: data.uomSellable,
        },
        brand: data.brandType === "existing"
          ? { type: "existing", brandId: data.brandId! }
          : { type: "new", name: data.newBrandName!, vendorClientId },
        strain: data.strainType === "existing"
          ? { type: "existing", strainId: data.strainId! }
          : data.strainType === "new"
            ? { type: "new", name: data.newStrainName!, category: data.strainCategory }
            : { type: "none" },
        initialBatch: {
          lotId,
          quantity: data.quantity,
          cogsMode: data.cogsMode,
          unitCogs: data.cogsMode === "FIXED" ? data.unitCogs : undefined,
          unitCogsMin: data.cogsMode === "RANGE" ? data.unitCogsMin : undefined,
          unitCogsMax: data.cogsMode === "RANGE" ? data.unitCogsMax : undefined,
          paymentTerms: data.paymentTerms,
          grade: data.grade,
        },
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Product</DialogTitle>
        </DialogHeader>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Product Info Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">Product Information</h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="productName">Product Name *</Label>
                <Input
                  id="productName"
                  {...form.register("productName")}
                  placeholder="e.g., Blue Dream Indoor"
                />
                {form.formState.errors.productName && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.productName.message}
                  </p>
                )}
              </div>

              <div>
                <Label>Category *</Label>
                <CategorySelect
                  value={form.watch("category")}
                  onChange={(value) => form.setValue("category", value)}
                />
              </div>

              <div>
                <Label>Subcategory</Label>
                <CategorySelect
                  parentCategory={watchCategory}
                  value={form.watch("subcategory")}
                  onChange={(value) => form.setValue("subcategory", value)}
                  isSubcategory
                />
              </div>
            </div>
          </div>

          {/* Brand Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">
              {isFlower ? "Farmer" : "Brand"}
            </h3>

            <RadioGroup
              value={watchBrandType}
              onValueChange={(v) => form.setValue("brandType", v as "existing" | "new")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="existing" id="brand-existing" />
                <Label htmlFor="brand-existing">Select Existing</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new" id="brand-new" />
                <Label htmlFor="brand-new">Create New</Label>
              </div>
            </RadioGroup>

            {watchBrandType === "existing" ? (
              <BrandCombobox
                value={form.watch("brandId")}
                onChange={(value) => form.setValue("brandId", value)}
              />
            ) : (
              <Input
                placeholder={`New ${isFlower ? "Farmer" : "Brand"} Name`}
                {...form.register("newBrandName")}
              />
            )}
          </div>

          {/* Strain Section (Flower only) */}
          {isFlower && (
            <div className="space-y-4">
              <h3 className="font-medium text-sm text-muted-foreground">Strain</h3>

              <RadioGroup
                value={watchStrainType}
                onValueChange={(v) => form.setValue("strainType", v as "existing" | "new" | "none")}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="strain-existing" />
                  <Label htmlFor="strain-existing">Select Existing</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="strain-new" />
                  <Label htmlFor="strain-new">Create New</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="none" id="strain-none" />
                  <Label htmlFor="strain-none">N/A</Label>
                </div>
              </RadioGroup>

              {watchStrainType === "existing" && (
                <StrainAutocomplete
                  value={form.watch("strainId")}
                  onChange={(value) => form.setValue("strainId", value)}
                />
              )}

              {watchStrainType === "new" && (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Strain Name"
                    {...form.register("newStrainName")}
                  />
                  <Select
                    value={form.watch("strainCategory")}
                    onValueChange={(v) => form.setValue("strainCategory", v as any)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Strain Type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Indica">Indica</SelectItem>
                      <SelectItem value="Sativa">Sativa</SelectItem>
                      <SelectItem value="Hybrid">Hybrid</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* COGS Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">Cost of Goods (COGS)</h3>

            <RadioGroup
              value={watchCogsMode}
              onValueChange={(v) => form.setValue("cogsMode", v as "FIXED" | "RANGE")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="FIXED" id="cogs-fixed" />
                <Label htmlFor="cogs-fixed">Fixed Price</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="RANGE" id="cogs-range" />
                <Label htmlFor="cogs-range">Price Range</Label>
              </div>
            </RadioGroup>

            {watchCogsMode === "FIXED" ? (
              <div>
                <Label>Unit COGS *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  {...form.register("unitCogs", { valueAsNumber: true })}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Min COGS *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...form.register("unitCogsMin", { valueAsNumber: true })}
                  />
                </div>
                <div>
                  <Label>Max COGS *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...form.register("unitCogsMax", { valueAsNumber: true })}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Batch Details Section */}
          <div className="space-y-4">
            <h3 className="font-medium text-sm text-muted-foreground">Initial Batch</h3>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Quantity *</Label>
                <Input
                  type="number"
                  step="0.01"
                  {...form.register("quantity", { valueAsNumber: true })}
                />
              </div>
              <div>
                <Label>Payment Terms</Label>
                <Select
                  value={form.watch("paymentTerms")}
                  onValueChange={(v) => form.setValue("paymentTerms", v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="COD">COD</SelectItem>
                    <SelectItem value="NET_7">Net 7</SelectItem>
                    <SelectItem value="NET_15">Net 15</SelectItem>
                    <SelectItem value="NET_30">Net 30</SelectItem>
                    <SelectItem value="CONSIGNMENT">Consignment</SelectItem>
                    <SelectItem value="PARTIAL">Partial</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Grade</Label>
                <Input {...form.register("grade")} placeholder="A, B, C..." />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Product & Add to PO
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 4.2 Integration with Purchase Order Form

**File:** `/home/user/TERP/client/src/pages/PurchaseOrderCreate.tsx`

```typescript
// Add import
import { InlineProductCreationModal } from "@/components/products/InlineProductCreationModal";

// In component:
const [showCreateProductModal, setShowCreateProductModal] = useState(false);

// In JSX:
<Button
  variant="outline"
  onClick={() => setShowCreateProductModal(true)}
>
  + Create New Product
</Button>

<InlineProductCreationModal
  open={showCreateProductModal}
  onClose={() => setShowCreateProductModal(false)}
  onProductCreated={(result) => {
    // Add to PO line items
    addLineItem({
      productId: result.productId,
      sku: result.sku,
      batchId: result.batchId,
      // ... other fields
    });
  }}
  vendorClientId={selectedVendor?.id}
  lotId={currentLot?.id}
/>
```

## 5. UI/UX Specification

### 5.1 Wireframe

```
┌─────────────────────────────────────────────────────────────┐
│  Create New Product                                    [X] │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Product Information                                        │
│  ┌────────────────────────────────────────────────────────┐│
│  │ Product Name *                                         ││
│  │ [Blue Dream Indoor________________________]            ││
│  ├───────────────────────┬────────────────────────────────┤│
│  │ Category *            │ Subcategory                    ││
│  │ [Flower         ▼]    │ [Indoor          ▼]           ││
│  └───────────────────────┴────────────────────────────────┘│
│                                                             │
│  Farmer                                                     │
│  ○ Select Existing  ● Create New                           │
│  [Green Thumb Farms___________________]                     │
│                                                             │
│  Strain                                                     │
│  ● Select Existing  ○ Create New  ○ N/A                    │
│  [Blue Dream___________________ ▼]                         │
│                                                             │
│  Cost of Goods (COGS)                                       │
│  ● Fixed Price  ○ Price Range                              │
│  ┌─────────────────────────────┐                           │
│  │ Unit COGS *                 │                           │
│  │ [$ 100.00              ]    │                           │
│  └─────────────────────────────┘                           │
│                                                             │
│  Initial Batch                                              │
│  ┌──────────────┬──────────────┬──────────────┐           │
│  │ Quantity *   │ Payment Terms│ Grade        │           │
│  │ [50     ]    │ [Net 30   ▼] │ [A      ]    │           │
│  └──────────────┴──────────────┴──────────────┘           │
│                                                             │
│                    [Cancel]  [Create Product & Add to PO]  │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Acceptance Criteria (UI)

- [ ] Modal opens when "Create New Product" clicked
- [ ] Form validates all required fields
- [ ] Brand/Farmer label changes based on category
- [ ] Strain section only shows for Flower category
- [ ] COGS inputs change based on mode selection
- [ ] Submit creates product and adds to PO
- [ ] Modal closes on success
- [ ] Error messages displayed clearly

## 6. Edge Cases & Error Handling

| Scenario | Expected Behavior |
|----------|-------------------|
| Duplicate product name | Allow (SKU will be unique) |
| API error during creation | Show error message, keep form open |
| Network timeout | Show retry button |
| Invalid COGS (min > max) | Validation error |

## 7. Testing Requirements

### 7.1 Unit Tests
- [ ] Form validation
- [ ] Dynamic field visibility

### 7.2 Integration Tests
- [ ] Full creation flow

### 7.3 E2E Tests
- [ ] Create product via modal in PO

## 8. Migration & Rollout

### 8.1 Feature Flag
`FEATURE_INLINE_PRODUCT_CREATION` - Enable for testing.

## 9. Success Metrics

| Metric | Target | Measurement Method |
|--------|--------|-------------------|
| Modal completion rate | > 90% | Analytics |
| Time to create | < 30s | User timing |

---

**Approval:**
- [ ] Product Owner
- [ ] Tech Lead
- [ ] QA Lead

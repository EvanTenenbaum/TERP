import React, { useState } from "react";
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
import { Loader2, Upload, X } from "lucide-react";
import { StrainInput } from "@/components/inventory/StrainInput";
import { useDebounce } from "@/hooks/useDebounce";

interface PurchaseModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function PurchaseModal({ open, onClose, onSuccess }: PurchaseModalProps) {
  const [formData, setFormData] = useState({
    vendorName: "",
    brandName: "",
    strainId: null as number | null,
    strainName: "",
    productName: "",
    category: "",
    subcategory: "",
    grade: "",
    quantity: "",
    cogsMode: "FIXED" as "FIXED" | "RANGE",
    unitCogs: "",
    unitCogsMin: "",
    unitCogsMax: "",
    paymentTerms: "NET_30" as "COD" | "NET_7" | "NET_15" | "NET_30" | "CONSIGNMENT" | "PARTIAL",
    amountPaid: "", // For COD and PARTIAL payment
    locationSite: "",
  });

  const [vendorSearch, setVendorSearch] = useState("");
  const [brandSearch, setBrandSearch] = useState("");
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [showVendorDropdown, setShowVendorDropdown] = useState(false);
  const [showBrandDropdown, setShowBrandDropdown] = useState(false);

  const debouncedVendorSearch = useDebounce(vendorSearch, 300);
  const debouncedBrandSearch = useDebounce(brandSearch, 300);

  // Fetch autocomplete data
  const { data: vendors } = trpc.inventory.vendors.useQuery(
    { query: debouncedVendorSearch },
    { enabled: debouncedVendorSearch.length > 0 }
  );

  const { data: brands } = trpc.inventory.brands.useQuery(
    { query: debouncedBrandSearch },
    { enabled: debouncedBrandSearch.length > 0 }
  );



  // Fetch settings data
  const { data: categories } = trpc.settings.categories.list.useQuery();
  const { data: grades } = trpc.settings.grades.list.useQuery();
  const { data: locations } = trpc.settings.locations.list.useQuery();

  const uploadMediaMutation = trpc.inventory.uploadMedia.useMutation();
  const deleteMediaMutation = trpc.inventory.deleteMedia.useMutation();
  const createPurchaseMutation = trpc.inventory.intake.useMutation({
    onSuccess: () => {
      toast.success("Product purchase created successfully!");
      resetForm();
      onClose();
      onSuccess?.();
    },
    onError: (error) => {
      toast.error(`Failed to create purchase: ${error.message}`);
    },
  });

  const resetForm = () => {
    setFormData({
      vendorName: "",
      brandName: "",
      strainId: null,
      strainName: "",
      productName: "",
      category: "",
      subcategory: "",
      grade: "",
      quantity: "",
      cogsMode: "FIXED",
      unitCogs: "",
      unitCogsMin: "",
      unitCogsMax: "",
      paymentTerms: "NET_30",
      amountPaid: "",
      locationSite: "",
    });
    setVendorSearch("");
    setBrandSearch("");
    setMediaFiles([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    const isFlowerCategory = formData.category?.toLowerCase() === "flower";
    
    if (!formData.vendorName || !formData.brandName) {
      toast.error("Please fill in all required fields");
      return;
    }
    
    // For flower, require strain name; for others, require product name
    if (isFlowerCategory && !formData.strainName) {
      toast.error("Please select a strain for flower products");
      return;
    }
    
    if (!isFlowerCategory && !formData.productName) {
      toast.error("Please enter a product name");
      return;
    }

    if (!formData.quantity || parseFloat(formData.quantity) <= 0) {
      toast.error("Please enter a valid quantity");
      return;
    }

    if (formData.cogsMode === "FIXED" && (!formData.unitCogs || parseFloat(formData.unitCogs) <= 0)) {
      toast.error("Please enter a valid unit COGS");
      return;
    }

    if (formData.cogsMode === "RANGE") {
      if (!formData.unitCogsMin || !formData.unitCogsMax) {
        toast.error("Please enter both min and max COGS");
        return;
      }
      if (parseFloat(formData.unitCogsMin) >= parseFloat(formData.unitCogsMax)) {
        toast.error("Min COGS must be less than max COGS");
        return;
      }
    }

    if ((formData.paymentTerms === "COD" || formData.paymentTerms === "PARTIAL") && !formData.amountPaid) {
      toast.error("Please enter the amount paid");
      return;
    }

    // BUG-004: Upload media files first
    // BUG-071: Track uploaded media URLs for rollback on failure
    let uploadedMediaUrls: Array<{ url: string; fileName: string; fileType: string; fileSize: number }> = [];

    try {
      // Step 1: Upload media files
      if (mediaFiles.length > 0) {
        toast.info("Uploading media files...");
        const uploadPromises = mediaFiles.map(async (file) => {
          return new Promise<{ url: string; fileName: string; fileType: string; fileSize: number }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async () => {
              try {
                const base64 = (reader.result as string).split(",")[1]; // Remove data:type;base64, prefix
                const result = await uploadMediaMutation.mutateAsync({
                  fileData: base64,
                  fileName: file.name,
                  fileType: file.type,
                });
                resolve({
                  url: result.url,
                  fileName: result.fileName,
                  fileType: result.fileType,
                  fileSize: result.fileSize,
                });
              } catch (error) {
                reject(error);
              }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        });

        uploadedMediaUrls = await Promise.all(uploadPromises);
        toast.success(`Uploaded ${uploadedMediaUrls.length} file(s)`);
      }

      // Step 2: Create purchase with media URLs
      await createPurchaseMutation.mutateAsync({
        vendorName: formData.vendorName,
        brandName: formData.brandName,
        productName: formData.productName,
        category: formData.category,
        subcategory: formData.subcategory || undefined,
        grade: formData.grade,
        strainId: formData.strainId,
        quantity: parseFloat(formData.quantity),
        cogsMode: formData.cogsMode,
        unitCogs: formData.cogsMode === "FIXED" ? formData.unitCogs : undefined,
        unitCogsMin: formData.cogsMode === "RANGE" ? formData.unitCogsMin : undefined,
        unitCogsMax: formData.cogsMode === "RANGE" ? formData.unitCogsMax : undefined,
        paymentTerms: formData.paymentTerms,
        location: {
          site: formData.locationSite || "Default",
        },
        mediaUrls: uploadedMediaUrls.length > 0 ? uploadedMediaUrls : undefined,
      });
    } catch (error) {
      // Step 3: Rollback - Delete uploaded media files if purchase creation fails
      if (uploadedMediaUrls.length > 0) {
        toast.info("Cleaning up uploaded files...");
        try {
          await Promise.all(
            uploadedMediaUrls.map((media) =>
              deleteMediaMutation.mutateAsync({ url: media.url })
            )
          );
          toast.info("Cleanup completed");
        } catch (cleanupError) {
          console.error("Failed to cleanup media files:", cleanupError);
          toast.warning("Some media files could not be cleaned up");
        }
      }

      // Re-throw the original error
      toast.error(`Failed to create purchase: ${error instanceof Error ? error.message : "Unknown error"}`);
      return;
    }
  };

  const handleMediaUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setMediaFiles([...mediaFiles, ...newFiles]);
    }
  };

  const removeMedia = (index: number) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index));
  };

  const showAmountPaidField = formData.paymentTerms === "COD" || formData.paymentTerms === "PARTIAL";

  return (
    // BUG-095 FIX: onOpenChange expects (isOpen: boolean) => void, but onClose is () => void
    // Wrap onClose to only trigger when dialog is closing (isOpen=false)
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Product Purchase</DialogTitle>
          <DialogDescription>
            Record a new product purchase. You can add detailed location and other information during intake.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Vendor Autocomplete */}
          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor *</Label>
            <div className="relative">
              <Input
                id="vendor"
                value={vendorSearch}
                onChange={(e) => {
                  setVendorSearch(e.target.value);
                  setFormData({ ...formData, vendorName: e.target.value });
                  setShowVendorDropdown(true);
                }}
                onFocus={() => setShowVendorDropdown(true)}
                placeholder="Start typing vendor name..."
                required
              />
              {showVendorDropdown && vendors?.items && vendors.items.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                  {vendors.items.map((vendor) => (
                    <div
                      key={vendor.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setVendorSearch(vendor.name);
                        setFormData({ ...formData, vendorName: vendor.name });
                        setShowVendorDropdown(false);
                      }}
                    >
                      {vendor.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Brand Autocomplete */}
          <div className="space-y-2">
            <Label htmlFor="brand">Brand *</Label>
            <div className="relative">
              <Input
                id="brand"
                value={brandSearch}
                onChange={(e) => {
                  setBrandSearch(e.target.value);
                  setFormData({ ...formData, brandName: e.target.value });
                  setShowBrandDropdown(true);
                }}
                onFocus={() => setShowBrandDropdown(true)}
                placeholder="Start typing brand name..."
                required
              />
              {showBrandDropdown && brands?.items && brands.items.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border rounded-md shadow-lg max-h-60 overflow-auto">
                  {brands.items.map((brand) => (
                    <div
                      key={brand.id}
                      className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                      onClick={() => {
                        setBrandSearch(brand.name);
                        setFormData({ ...formData, brandName: brand.name });
                        setShowBrandDropdown(false);
                      }}
                    >
                      {brand.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Conditional: Flower = Strain Only, Others = Product + Strain */}
          {formData.category?.toLowerCase() === "flower" ? (
            // FLOWER: Only show strain input (required)
            <div className="space-y-2">
              <Label htmlFor="strain">Strain Name *</Label>
              <StrainInput
                value={formData.strainId}
                onChange={(strainId, strainName) => {
                  // For flower, strain name IS the product name
                  setFormData({ ...formData, strainId, strainName, productName: strainName });
                }}
                category={formData.category as "indica" | "sativa" | "hybrid" | null}
                placeholder="Enter strain name..."
                required
              />
              <p className="text-xs text-muted-foreground">
                For flower products, the strain name is used as the product name
              </p>
            </div>
          ) : (
            // NON-FLOWER: Show product name + optional strain
            <>
              <div className="space-y-2">
                <Label htmlFor="productName">Product Name *</Label>
                <Input
                  id="productName"
                  value={formData.productName}
                  onChange={(e) => setFormData({ ...formData, productName: e.target.value })}
                  placeholder="e.g., Gummy Bears, Vape Cartridge"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="strain">Strain (Optional)</Label>
                <StrainInput
                  value={formData.strainId}
                  onChange={(strainId, strainName) => {
                    setFormData({ ...formData, strainId, strainName });
                  }}
                  category={formData.category as "indica" | "sativa" | "hybrid" | null}
                  placeholder="Search for a strain..."
                />
              </div>
            </>
          )}

          {/* Category and Grade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Select
                value={formData.category}
                onValueChange={(value) => setFormData({ ...formData, category: value, subcategory: "" })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.name}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="grade">Grade *</Label>
              <Select
                value={formData.grade}
                onValueChange={(value) => setFormData({ ...formData, grade: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select grade" />
                </SelectTrigger>
                <SelectContent>
                  {grades?.map((grade) => (
                    <SelectItem key={grade.id} value={grade.name}>
                      {grade.name}
                    </SelectItem>
                  ))}
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
              min="0.01"
              value={formData.quantity}
              onChange={(e) => {
                const value = e.target.value;
                // Allow empty string for typing, or positive values only
                if (value === '' || parseFloat(value) > 0) {
                  setFormData({ ...formData, quantity: value });
                }
              }}
              placeholder="Enter quantity (must be positive)"
              required
            />
            {formData.quantity && parseFloat(formData.quantity) <= 0 && (
              <p className="text-sm text-red-500">Quantity must be greater than 0</p>
            )}
          </div>

          {/* COGS Mode */}
          <div className="space-y-4">
            <Label>COGS Mode *</Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.cogsMode === "FIXED"}
                  onChange={() => setFormData({ ...formData, cogsMode: "FIXED" })}
                />
                <span>Fixed Price</span>
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={formData.cogsMode === "RANGE"}
                  onChange={() => setFormData({ ...formData, cogsMode: "RANGE" })}
                />
                <span>Price Range</span>
              </label>
            </div>

            {formData.cogsMode === "FIXED" ? (
              <div className="space-y-2">
                <Label htmlFor="unitCogs">Unit COGS *</Label>
                <Input
                  id="unitCogs"
                  type="number"
                  step="0.01"
                  value={formData.unitCogs}
                  onChange={(e) => setFormData({ ...formData, unitCogs: e.target.value })}
                  placeholder="Enter unit cost"
                  required
                />
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unitCogsMin">Min Unit COGS *</Label>
                  <Input
                    id="unitCogsMin"
                    type="number"
                    step="0.01"
                    value={formData.unitCogsMin}
                    onChange={(e) => setFormData({ ...formData, unitCogsMin: e.target.value })}
                    placeholder="Minimum cost"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unitCogsMax">Max Unit COGS *</Label>
                  <Input
                    id="unitCogsMax"
                    type="number"
                    step="0.01"
                    value={formData.unitCogsMax}
                    onChange={(e) => setFormData({ ...formData, unitCogsMax: e.target.value })}
                    placeholder="Maximum cost"
                    required
                  />
                </div>
              </div>
            )}
          </div>

          {/* Payment Terms */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="paymentTerms">Payment Terms *</Label>
              <Select
                value={formData.paymentTerms}
                onValueChange={(value: any) => setFormData({ ...formData, paymentTerms: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COD">Cash on Delivery (COD)</SelectItem>
                  <SelectItem value="NET_7">Net 7 Days</SelectItem>
                  <SelectItem value="NET_15">Net 15 Days</SelectItem>
                  <SelectItem value="NET_30">Net 30 Days</SelectItem>
                  <SelectItem value="CONSIGNMENT">Consignment</SelectItem>
                  <SelectItem value="PARTIAL">Partial Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {showAmountPaidField && (
              <div className="space-y-2">
                <Label htmlFor="amountPaid">Amount Paid *</Label>
                <Input
                  id="amountPaid"
                  type="number"
                  step="0.01"
                  value={formData.amountPaid}
                  onChange={(e) => setFormData({ ...formData, amountPaid: e.target.value })}
                  placeholder="Enter amount paid"
                  required
                />
              </div>
            )}
          </div>

          {/* Location Site */}
          <div className="space-y-2">
            <Label htmlFor="locationSite">Warehouse/Site</Label>
            <Select
              value={formData.locationSite}
              onValueChange={(value) => setFormData({ ...formData, locationSite: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select warehouse" />
              </SelectTrigger>
              <SelectContent>
                {locations?.map((loc) => (
                  <SelectItem key={loc.id} value={loc.site}>
                    {loc.site}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Media Upload */}
          <div className="space-y-2">
            <Label>Product Media (Optional)</Label>
            <div className="border-2 border-dashed rounded-lg p-4">
              <input
                type="file"
                multiple
                accept="image/*,video/*"
                onChange={handleMediaUpload}
                className="hidden"
                id="media-upload"
              />
              <label
                htmlFor="media-upload"
                className="flex flex-col items-center justify-center cursor-pointer"
              >
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">Click to upload images or videos</span>
              </label>

              {mediaFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {mediaFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 p-2 rounded">
                      <span className="text-sm truncate flex-1">{file.name}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMedia(index)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createPurchaseMutation.isPending}>
              {createPurchaseMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Purchase
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}


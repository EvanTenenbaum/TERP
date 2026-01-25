/**
 * ProductsWorkSurface - Work Surface implementation for Product Catalogue
 * WS-PROD-001: Aligns Products page with Work Surface patterns
 *
 * Features:
 * - Keyboard contract (Cmd+K search, arrow navigation, Enter to open)
 * - Save state indicator
 * - Inspector panel for product details and editing
 * - Summary metrics bar (Total Products, Active, Archived)
 * - CRUD operations (Create, Update, Archive, Restore)
 *
 * @see ATOMIC_UX_STRATEGY.md for the complete Work Surface specification
 */

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Separator } from "@/components/ui/separator";

// Work Surface Hooks
import { useWorkSurfaceKeyboard } from "@/hooks/work-surface/useWorkSurfaceKeyboard";
import { useSaveState } from "@/hooks/work-surface/useSaveState";
import {
  InspectorPanel,
  InspectorSection,
  InspectorField,
  useInspectorPanel,
} from "./InspectorPanel";

// Icons
import {
  Search,
  Plus,
  Package,
  ChevronRight,
  Loader2,
  Edit,
  Trash2,
  RotateCcw,
  AlertCircle,
  RefreshCw,
  Tag,
  Beaker,
  Box,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

interface Product {
  id: number;
  nameCanonical: string;
  category: string;
  subcategory: string | null;
  brandId: number;
  brandName: string | null;
  strainId: number | null;
  strainName: string | null;
  uomSellable: string;
  description: string | null;
  deletedAt: Date | null;
}

interface ProductFormData {
  brandId: number | null;
  strainId: number | null;
  nameCanonical: string;
  category: string;
  subcategory: string;
  uomSellable: string;
  description: string;
}

const initialFormData: ProductFormData = {
  brandId: null,
  strainId: null,
  nameCanonical: "",
  category: "",
  subcategory: "",
  uomSellable: "EA",
  description: "",
};

// ============================================================================
// CONSTANTS
// ============================================================================

const PRODUCT_FILTERS = [
  { value: "active", label: "Active Products" },
  { value: "archived", label: "Archived Products" },
  { value: "all", label: "All Products" },
];

const UOM_OPTIONS = [
  { value: "EA", label: "Each (EA)" },
  { value: "G", label: "Gram (G)" },
  { value: "OZ", label: "Ounce (OZ)" },
  { value: "LB", label: "Pound (LB)" },
  { value: "MG", label: "Milligram (MG)" },
];

// ============================================================================
// HELPERS
// ============================================================================

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    Flower: "bg-green-100 text-green-800",
    Concentrate: "bg-amber-100 text-amber-800",
    Edible: "bg-purple-100 text-purple-800",
    Preroll: "bg-blue-100 text-blue-800",
    Vape: "bg-indigo-100 text-indigo-800",
    Topical: "bg-pink-100 text-pink-800",
  };
  return colors[category] || "bg-gray-100 text-gray-800";
}

// ============================================================================
// PRODUCT INSPECTOR
// ============================================================================

interface ProductInspectorProps {
  product: Product | null;
  brands: Array<{ id: number; name: string }>;
  strains: Array<{ id: number; name: string; category?: string | null }>;
  categories: string[];
  onEdit: (product: Product) => void;
  onArchive: (product: Product) => void;
  onRestore: (productId: number) => void;
  isRestoring: boolean;
}

function ProductInspectorContent({
  product,
  brands,
  strains,
  onEdit,
  onArchive,
  onRestore,
  isRestoring,
}: ProductInspectorProps) {
  if (!product) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <Package className="h-12 w-12 mb-4 opacity-50" />
        <p>Select a product to view details</p>
      </div>
    );
  }

  const brand = brands.find(b => b.id === product.brandId);
  const strain = strains.find(s => s.id === product.strainId);

  return (
    <div className="space-y-6">
      <InspectorSection title="Product Information" defaultOpen>
        <InspectorField label="Name">
          <p className="font-semibold text-lg">{product.nameCanonical}</p>
          {product.deletedAt && (
            <Badge variant="secondary" className="mt-1">Archived</Badge>
          )}
        </InspectorField>

        <div className="grid grid-cols-2 gap-4">
          <InspectorField label="Category">
            <Badge className={getCategoryColor(product.category)}>
              {product.category}
            </Badge>
          </InspectorField>
          {product.subcategory && (
            <InspectorField label="Subcategory">
              <p>{product.subcategory}</p>
            </InspectorField>
          )}
        </div>

        <InspectorField label="Brand">
          <p className="font-medium">{brand?.name || product.brandName || "Unknown"}</p>
        </InspectorField>

        {strain && (
          <InspectorField label="Strain">
            <div className="flex items-center gap-2">
              <Beaker className="h-4 w-4 text-muted-foreground" />
              <span>{strain.name}</span>
              {strain.category && (
                <Badge variant="outline" className="text-xs">{strain.category}</Badge>
              )}
            </div>
          </InspectorField>
        )}

        <InspectorField label="Unit of Measure">
          <div className="flex items-center gap-2">
            <Box className="h-4 w-4 text-muted-foreground" />
            <span>{UOM_OPTIONS.find(u => u.value === product.uomSellable)?.label || product.uomSellable}</span>
          </div>
        </InspectorField>
      </InspectorSection>

      {product.description && (
        <InspectorSection title="Description">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {product.description}
          </p>
        </InspectorSection>
      )}

      <InspectorSection title="Actions" defaultOpen>
        <div className="space-y-2">
          {!product.deletedAt ? (
            <>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => onEdit(product)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Product
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-destructive hover:text-destructive"
                onClick={() => onArchive(product)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Archive Product
              </Button>
            </>
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => onRestore(product.id)}
              disabled={isRestoring}
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              {isRestoring ? "Restoring..." : "Restore Product"}
            </Button>
          )}
        </div>
      </InspectorSection>
    </div>
  );
}

// ============================================================================
// PRODUCT FORM DIALOG
// ============================================================================

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  formData: ProductFormData;
  setFormData: (data: ProductFormData) => void;
  brands: Array<{ id: number; name: string }>;
  strains: Array<{ id: number; name: string; category?: string | null }>;
  categories: string[];
  onSubmit: () => void;
  isPending: boolean;
}

function ProductFormDialog({
  open,
  onOpenChange,
  mode,
  formData,
  setFormData,
  brands,
  strains,
  categories,
  onSubmit,
  isPending,
}: ProductFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add New Product" : "Edit Product"}</DialogTitle>
          <DialogDescription>
            {mode === "create" ? "Create a new product in the catalogue" : "Update product information"}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="nameCanonical">Product Name *</Label>
            <Input
              id="nameCanonical"
              value={formData.nameCanonical}
              onChange={e => setFormData({ ...formData, nameCanonical: e.target.value })}
              placeholder="Enter product name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brand">Brand *</Label>
            <Select
              value={formData.brandId?.toString() ?? ""}
              onValueChange={v => setFormData({ ...formData, brandId: parseInt(v) })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a brand" />
              </SelectTrigger>
              <SelectContent>
                {brands.map(brand => (
                  <SelectItem key={brand.id} value={brand.id.toString()}>
                    {brand.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="category">Category *</Label>
            <Input
              id="category"
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              placeholder="e.g., Flower, Concentrate, Edible"
              list="category-suggestions"
            />
            <datalist id="category-suggestions">
              {categories.map(cat => (
                <option key={cat} value={cat} />
              ))}
            </datalist>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subcategory">Subcategory</Label>
            <Input
              id="subcategory"
              value={formData.subcategory}
              onChange={e => setFormData({ ...formData, subcategory: e.target.value })}
              placeholder="e.g., Smalls, Indoor, Outdoor"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="strain">Strain</Label>
            <Select
              value={formData.strainId?.toString() ?? "none"}
              onValueChange={v => setFormData({
                ...formData,
                strainId: v === "none" ? null : parseInt(v),
              })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a strain (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Strain</SelectItem>
                {strains.map(strain => (
                  <SelectItem key={strain.id} value={strain.id.toString()}>
                    {strain.name}
                    {strain.category && (
                      <span className="text-muted-foreground ml-2">({strain.category})</span>
                    )}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="uomSellable">Unit of Measure</Label>
            <Select
              value={formData.uomSellable}
              onValueChange={v => setFormData({ ...formData, uomSellable: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {UOM_OPTIONS.map(uom => (
                  <SelectItem key={uom.value} value={uom.value}>
                    {uom.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional product description"
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSubmit} disabled={isPending}>
            {isPending
              ? mode === "create" ? "Creating..." : "Saving..."
              : mode === "create" ? "Create Product" : "Save Changes"
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ProductsWorkSurface() {
  const searchInputRef = useRef<HTMLInputElement>(null);

  // State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("active");
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showArchiveDialog, setShowArchiveDialog] = useState(false);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productToArchive, setProductToArchive] = useState<Product | null>(null);

  // Work Surface hooks
  const { setSaving, setSaved, setError, SaveStateIndicator } = useSaveState();
  const inspector = useInspectorPanel();

  // Utilities
  const utils = trpc.useContext();

  // Determine if we should include deleted products
  const includeDeleted = statusFilter === "archived" || statusFilter === "all";

  // Data queries
  const {
    data: productsData,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.productCatalogue.list.useQuery({
    limit: 500,
    includeDeleted,
  });

  const { data: brands = [] } = trpc.productCatalogue.getBrands.useQuery();
  const { data: strains = [] } = trpc.productCatalogue.getStrains.useQuery();
  const { data: categories = [] } = trpc.productCatalogue.getCategories.useQuery();

  // Transform products data
  const products = useMemo<Product[]>(() => {
    const items = productsData?.items ?? [];
    return items.map(p => ({
      id: p.id,
      nameCanonical: p.nameCanonical,
      category: p.category,
      subcategory: p.subcategory,
      brandId: p.brandId,
      brandName: p.brandName,
      strainId: p.strainId,
      strainName: p.strainName,
      uomSellable: p.uomSellable,
      description: p.description,
      deletedAt: p.deletedAt,
    }));
  }, [productsData]);

  // Filter products based on status and search
  const displayProducts = useMemo(() => {
    let filtered = products;

    // Apply status filter
    if (statusFilter === "active") {
      filtered = filtered.filter(p => !p.deletedAt);
    } else if (statusFilter === "archived") {
      filtered = filtered.filter(p => p.deletedAt);
    }

    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(p =>
        p.nameCanonical.toLowerCase().includes(searchLower) ||
        p.category.toLowerCase().includes(searchLower) ||
        (p.brandName?.toLowerCase().includes(searchLower) ?? false) ||
        (p.strainName?.toLowerCase().includes(searchLower) ?? false)
      );
    }

    return filtered;
  }, [products, statusFilter, search]);

  // Selected product
  const selectedProduct = useMemo(
    () => displayProducts.find(p => p.id === selectedProductId) || null,
    [displayProducts, selectedProductId]
  );

  // Statistics
  const stats = useMemo(() => ({
    total: products.length,
    active: products.filter(p => !p.deletedAt).length,
    archived: products.filter(p => p.deletedAt).length,
    categories: new Set(products.map(p => p.category)).size,
  }), [products]);

  // Mutations
  const createMutation = trpc.productCatalogue.create.useMutation({
    onMutate: () => setSaving("Creating product..."),
    onSuccess: () => {
      toast.success("Product created successfully");
      setSaved();
      utils.productCatalogue.list.invalidate();
      utils.productCatalogue.getCategories.invalidate();
      setShowCreateDialog(false);
      setFormData(initialFormData);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to create product");
      setError(err.message);
    },
  });

  const updateMutation = trpc.productCatalogue.update.useMutation({
    onMutate: () => setSaving("Updating product..."),
    onSuccess: () => {
      toast.success("Product updated successfully");
      setSaved();
      utils.productCatalogue.list.invalidate();
      utils.productCatalogue.getCategories.invalidate();
      setShowEditDialog(false);
      setEditingProduct(null);
      setFormData(initialFormData);
    },
    onError: (err) => {
      toast.error(err.message || "Failed to update product");
      setError(err.message);
    },
  });

  const deleteMutation = trpc.productCatalogue.delete.useMutation({
    onMutate: () => setSaving("Archiving product..."),
    onSuccess: () => {
      toast.success("Product archived successfully");
      setSaved();
      utils.productCatalogue.list.invalidate();
      setShowArchiveDialog(false);
      setProductToArchive(null);
      inspector.close();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to archive product");
      setError(err.message);
    },
  });

  const restoreMutation = trpc.productCatalogue.restore.useMutation({
    onMutate: () => setSaving("Restoring product..."),
    onSuccess: () => {
      toast.success("Product restored successfully");
      setSaved();
      utils.productCatalogue.list.invalidate();
    },
    onError: (err) => {
      toast.error(err.message || "Failed to restore product");
      setError(err.message);
    },
  });

  // Keyboard contract
  const { keyboardProps } = useWorkSurfaceKeyboard({
    gridMode: false,
    isInspectorOpen: inspector.isOpen,
    onInspectorClose: inspector.close,
    customHandlers: {
      "cmd+k": (e) => {
        e.preventDefault();
        searchInputRef.current?.focus();
      },
      "ctrl+k": (e) => {
        e.preventDefault();
        searchInputRef.current?.focus();
      },
      "cmd+n": (e) => {
        e.preventDefault();
        setShowCreateDialog(true);
      },
      arrowdown: (e) => {
        e.preventDefault();
        const newIndex = Math.min(displayProducts.length - 1, selectedIndex + 1);
        setSelectedIndex(newIndex);
        const product = displayProducts[newIndex];
        if (product) setSelectedProductId(product.id);
      },
      arrowup: (e) => {
        e.preventDefault();
        const newIndex = Math.max(0, selectedIndex - 1);
        setSelectedIndex(newIndex);
        const product = displayProducts[newIndex];
        if (product) setSelectedProductId(product.id);
      },
      enter: (e) => {
        if (selectedProduct) {
          e.preventDefault();
          inspector.open();
        }
      },
    },
    onCancel: () => {
      if (showCreateDialog) setShowCreateDialog(false);
      else if (showEditDialog) setShowEditDialog(false);
      else if (showArchiveDialog) setShowArchiveDialog(false);
      else if (inspector.isOpen) inspector.close();
    },
  });

  // Handlers
  const handleEdit = useCallback((product: Product) => {
    setEditingProduct(product);
    setFormData({
      brandId: product.brandId,
      strainId: product.strainId,
      nameCanonical: product.nameCanonical,
      category: product.category,
      subcategory: product.subcategory ?? "",
      uomSellable: product.uomSellable,
      description: product.description ?? "",
    });
    setShowEditDialog(true);
  }, []);

  const handleArchive = useCallback((product: Product) => {
    setProductToArchive(product);
    setShowArchiveDialog(true);
  }, []);

  const handleRestore = useCallback((productId: number) => {
    restoreMutation.mutate({ id: productId });
  }, [restoreMutation]);

  const handleCreateSubmit = useCallback(() => {
    if (!formData.brandId) {
      toast.error("Please select a brand");
      return;
    }
    if (!formData.nameCanonical.trim()) {
      toast.error("Please enter a product name");
      return;
    }
    if (!formData.category.trim()) {
      toast.error("Please enter a category");
      return;
    }

    createMutation.mutate({
      brandId: formData.brandId,
      strainId: formData.strainId,
      nameCanonical: formData.nameCanonical.trim(),
      category: formData.category.trim(),
      subcategory: formData.subcategory.trim() || null,
      uomSellable: formData.uomSellable,
      description: formData.description.trim() || null,
    });
  }, [formData, createMutation]);

  const handleUpdateSubmit = useCallback(() => {
    if (!editingProduct) return;

    updateMutation.mutate({
      id: editingProduct.id,
      data: {
        brandId: formData.brandId ?? undefined,
        strainId: formData.strainId,
        nameCanonical: formData.nameCanonical.trim(),
        category: formData.category.trim(),
        subcategory: formData.subcategory.trim() || null,
        uomSellable: formData.uomSellable,
        description: formData.description.trim() || null,
      },
    });
  }, [editingProduct, formData, updateMutation]);

  const confirmArchive = useCallback(() => {
    if (productToArchive) {
      deleteMutation.mutate({ id: productToArchive.id });
    }
  }, [productToArchive, deleteMutation]);

  // Error state
  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <h3 className="font-semibold">Error Loading Products</h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {error?.message || "Failed to load products from the server."}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="mt-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div {...keyboardProps} className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Package className="h-6 w-6" />
            Product Catalogue
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your unified product catalogue for sales workflow
          </p>
        </div>
        <div className="flex items-center gap-4">
          {SaveStateIndicator}
          <div className="text-sm text-muted-foreground flex gap-4">
            <span>
              Total: <span className="font-semibold text-foreground">{stats.total}</span>
            </span>
            <span>
              Active: <span className="font-semibold text-foreground">{stats.active}</span>
            </span>
            <span>
              Categories: <span className="font-semibold text-foreground">{stats.categories}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="px-6 py-3 border-b bg-muted/30">
        <div className="flex items-center justify-between gap-4">
          <div className="flex gap-4 items-center flex-1">
            <div className="relative w-72">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                ref={searchInputRef}
                placeholder="Search products... (Cmd+K)"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_FILTERS.map(f => (
                  <SelectItem key={f.value} value={f.value}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <div className={cn(
          "flex-1 overflow-auto transition-all duration-200",
          inspector.isOpen && "mr-96"
        )}>
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : displayProducts.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                <p className="font-medium">No products found</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {search ? "Try adjusting your search" : "Create your first product"}
                </p>
              </div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Subcategory</TableHead>
                  <TableHead>Brand</TableHead>
                  <TableHead>Strain</TableHead>
                  <TableHead>UOM</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {displayProducts.map((product, index) => (
                  <TableRow
                    key={product.id}
                    className={cn(
                      "cursor-pointer hover:bg-muted/50",
                      selectedProductId === product.id && "bg-muted",
                      selectedIndex === index && "ring-1 ring-inset ring-primary"
                    )}
                    onClick={() => {
                      setSelectedProductId(product.id);
                      setSelectedIndex(index);
                      inspector.open();
                    }}
                  >
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{product.nameCanonical}</span>
                        {product.deletedAt && (
                          <Badge variant="secondary" className="text-xs">Archived</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={getCategoryColor(product.category)}>
                        {product.category}
                      </Badge>
                    </TableCell>
                    <TableCell>{product.subcategory || "-"}</TableCell>
                    <TableCell>{product.brandName || "-"}</TableCell>
                    <TableCell>{product.strainName || "-"}</TableCell>
                    <TableCell>{product.uomSellable}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {/* Inspector */}
        <InspectorPanel
          isOpen={inspector.isOpen}
          onClose={inspector.close}
          title={selectedProduct?.nameCanonical || "Product Details"}
          subtitle={selectedProduct?.category}
        >
          <ProductInspectorContent
            product={selectedProduct}
            brands={brands}
            strains={strains}
            categories={categories}
            onEdit={handleEdit}
            onArchive={handleArchive}
            onRestore={handleRestore}
            isRestoring={restoreMutation.isPending}
          />
        </InspectorPanel>
      </div>

      {/* Create Product Dialog */}
      <ProductFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        mode="create"
        formData={formData}
        setFormData={setFormData}
        brands={brands}
        strains={strains}
        categories={categories}
        onSubmit={handleCreateSubmit}
        isPending={createMutation.isPending}
      />

      {/* Edit Product Dialog */}
      <ProductFormDialog
        open={showEditDialog}
        onOpenChange={(open) => {
          setShowEditDialog(open);
          if (!open) {
            setEditingProduct(null);
            setFormData(initialFormData);
          }
        }}
        mode="edit"
        formData={formData}
        setFormData={setFormData}
        brands={brands}
        strains={strains}
        categories={categories}
        onSubmit={handleUpdateSubmit}
        isPending={updateMutation.isPending}
      />

      {/* Archive Confirmation Dialog */}
      <Dialog open={showArchiveDialog} onOpenChange={setShowArchiveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Archive Product</DialogTitle>
          </DialogHeader>
          <p>
            Are you sure you want to archive "{productToArchive?.nameCanonical}"?
            This product will be hidden from the catalogue but can be restored later.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowArchiveDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmArchive}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Archiving..." : "Archive"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProductsWorkSurface;

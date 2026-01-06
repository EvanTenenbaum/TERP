import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import { trpc } from "@/lib/trpc";
import { TableSkeleton } from "@/components/skeletons/TableSkeleton";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, RotateCcw, Package } from "lucide-react";
import { toast } from "sonner";

interface ProductRow {
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

export default function ProductsPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductRow | null>(null);
  const [formData, setFormData] = useState<ProductFormData>(initialFormData);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductRow | null>(
    null
  );
  const [showDeleted, setShowDeleted] = useState(false);

  const utils = trpc.useContext();

  // Fetch products from product catalogue
  const { data: productsData, isLoading } = trpc.productCatalogue.list.useQuery(
    {
      limit: 500,
      includeDeleted: showDeleted,
    }
  );

  // Fetch brands and strains for dropdowns
  const { data: brands } = trpc.productCatalogue.getBrands.useQuery();
  const { data: strains } = trpc.productCatalogue.getStrains.useQuery();
  const { data: categories } = trpc.productCatalogue.getCategories.useQuery();

  // Mutations
  const createProduct = trpc.productCatalogue.create.useMutation({
    onSuccess: () => {
      toast.success("Product created successfully");
      utils.productCatalogue.list.invalidate();
      utils.productCatalogue.getCategories.invalidate();
      setIsCreateDialogOpen(false);
      setFormData(initialFormData);
    },
    onError: error => {
      toast.error(`Failed to create product: ${error.message}`);
    },
  });

  const updateProduct = trpc.productCatalogue.update.useMutation({
    onSuccess: () => {
      toast.success("Product updated successfully");
      utils.productCatalogue.list.invalidate();
      utils.productCatalogue.getCategories.invalidate();
      setIsEditDialogOpen(false);
      setEditingProduct(null);
      setFormData(initialFormData);
    },
    onError: error => {
      toast.error(`Failed to update product: ${error.message}`);
    },
  });

  const deleteProduct = trpc.productCatalogue.delete.useMutation({
    onSuccess: () => {
      toast.success("Product archived successfully");
      utils.productCatalogue.list.invalidate();
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
    },
    onError: error => {
      toast.error(`Failed to archive product: ${error.message}`);
    },
  });

  const restoreProduct = trpc.productCatalogue.restore.useMutation({
    onSuccess: () => {
      toast.success("Product restored successfully");
      utils.productCatalogue.list.invalidate();
    },
    onError: error => {
      toast.error(`Failed to restore product: ${error.message}`);
    },
  });

  // Transform data for table
  const productRows = useMemo<ProductRow[]>(() => {
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

  // Table columns
  const columns = useMemo<Array<DataTableColumn<ProductRow>>>(() => {
    const categoryOptions = Array.from(
      new Set(productRows.map(row => row.category).filter(Boolean))
    ).map(value => ({ label: value, value: value.toLowerCase() }));

    const brandOptions = Array.from(
      new Set(
        productRows
          .map(row => row.brandName)
          .filter((v): v is string => Boolean(v))
      )
    ).map(value => ({ label: value, value: value.toLowerCase() }));

    return [
      {
        id: "nameCanonical",
        header: "Product Name",
        accessor: row => (
          <div className="flex items-center gap-2">
            <span>{row.nameCanonical}</span>
            {row.deletedAt && (
              <Badge variant="secondary" className="text-xs">
                Archived
              </Badge>
            )}
          </div>
        ),
        valueAccessor: row => row.nameCanonical,
        searchable: true,
      },
      {
        id: "category",
        header: "Category",
        accessor: row => row.category,
        valueAccessor: row => row.category,
        filterOptions: categoryOptions,
        searchable: true,
      },
      {
        id: "subcategory",
        header: "Subcategory",
        accessor: row => row.subcategory ?? "-",
        valueAccessor: row => row.subcategory ?? "",
      },
      {
        id: "brandName",
        header: "Brand",
        accessor: row => row.brandName ?? "-",
        valueAccessor: row => row.brandName ?? "",
        filterOptions: brandOptions,
      },
      {
        id: "strainName",
        header: "Strain",
        accessor: row => row.strainName ?? "-",
        valueAccessor: row => row.strainName ?? "",
      },
      {
        id: "uomSellable",
        header: "UOM",
        accessor: row => row.uomSellable,
        valueAccessor: row => row.uomSellable,
        enableFiltering: false,
      },
      {
        id: "actions",
        header: "Actions",
        accessor: row => (
          <div className="flex items-center gap-2">
            {!row.deletedAt ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    handleEdit(row);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.stopPropagation();
                    handleDelete(row);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={e => {
                  e.stopPropagation();
                  restoreProduct.mutate({ id: row.id });
                }}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            )}
          </div>
        ),
        valueAccessor: () => "",
        enableFiltering: false,
        enableSorting: false,
      },
    ];
  }, [productRows, restoreProduct]);

  // Handlers
  const handleEdit = (product: ProductRow) => {
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
    setIsEditDialogOpen(true);
  };

  const handleDelete = (product: ProductRow) => {
    setProductToDelete(product);
    setDeleteConfirmOpen(true);
  };

  const handleCreateSubmit = () => {
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

    createProduct.mutate({
      brandId: formData.brandId,
      strainId: formData.strainId,
      nameCanonical: formData.nameCanonical.trim(),
      category: formData.category.trim(),
      subcategory: formData.subcategory.trim() || null,
      uomSellable: formData.uomSellable,
      description: formData.description.trim() || null,
    });
  };

  const handleUpdateSubmit = () => {
    if (!editingProduct) return;

    updateProduct.mutate({
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
  };

  const confirmDelete = () => {
    if (productToDelete) {
      deleteProduct.mutate({ id: productToDelete.id });
    }
  };

  if (isLoading) {
    return (
      <Card className="p-4" data-testid="products-skeleton">
        <TableSkeleton rows={6} columns={7} />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Product Catalogue
              </CardTitle>
              <CardDescription>
                Manage your unified product catalogue for sales workflow
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDeleted(!showDeleted)}
              >
                {showDeleted ? "Hide Archived" : "Show Archived"}
              </Button>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Product
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable<ProductRow>
            data={productRows}
            columns={columns}
            enableSorting
            enableColumnFilters
            enableGlobalSearch
            enablePagination
            enableColumnVisibility
            initialPageSize={10}
          />
        </CardContent>
      </Card>

      {/* Create Product Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
            <DialogDescription>
              Create a new product in the catalogue
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="nameCanonical">Product Name *</Label>
              <Input
                id="nameCanonical"
                value={formData.nameCanonical}
                onChange={e =>
                  setFormData({ ...formData, nameCanonical: e.target.value })
                }
                placeholder="Enter product name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="brand">Brand *</Label>
              <Select
                value={formData.brandId?.toString() ?? ""}
                onValueChange={v =>
                  setFormData({ ...formData, brandId: parseInt(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a brand" />
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
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={e =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="e.g., Flower, Concentrate, Edible"
                list="category-suggestions"
              />
              <datalist id="category-suggestions">
                {categories?.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory</Label>
              <Input
                id="subcategory"
                value={formData.subcategory}
                onChange={e =>
                  setFormData({ ...formData, subcategory: e.target.value })
                }
                placeholder="e.g., Indoor, Outdoor, Live Rosin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="strain">Strain</Label>
              <Select
                value={formData.strainId?.toString() ?? "none"}
                onValueChange={v =>
                  setFormData({
                    ...formData,
                    strainId: v === "none" ? null : parseInt(v),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a strain (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Strain</SelectItem>
                  {strains?.map(strain => (
                    <SelectItem key={strain.id} value={strain.id.toString()}>
                      {strain.name}
                      {strain.category && (
                        <span className="text-muted-foreground ml-2">
                          ({strain.category})
                        </span>
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
                onValueChange={v =>
                  setFormData({ ...formData, uomSellable: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EA">Each (EA)</SelectItem>
                  <SelectItem value="G">Gram (G)</SelectItem>
                  <SelectItem value="OZ">Ounce (OZ)</SelectItem>
                  <SelectItem value="LB">Pound (LB)</SelectItem>
                  <SelectItem value="MG">Milligram (MG)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional product description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsCreateDialogOpen(false);
                setFormData(initialFormData);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateSubmit}
              disabled={createProduct.isPending}
            >
              {createProduct.isPending ? "Creating..." : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
            <DialogDescription>Update product information</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-nameCanonical">Product Name *</Label>
              <Input
                id="edit-nameCanonical"
                value={formData.nameCanonical}
                onChange={e =>
                  setFormData({ ...formData, nameCanonical: e.target.value })
                }
                placeholder="Enter product name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-brand">Brand *</Label>
              <Select
                value={formData.brandId?.toString() ?? ""}
                onValueChange={v =>
                  setFormData({ ...formData, brandId: parseInt(v) })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a brand" />
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
              <Label htmlFor="edit-category">Category *</Label>
              <Input
                id="edit-category"
                value={formData.category}
                onChange={e =>
                  setFormData({ ...formData, category: e.target.value })
                }
                placeholder="e.g., Flower, Concentrate, Edible"
                list="edit-category-suggestions"
              />
              <datalist id="edit-category-suggestions">
                {categories?.map(cat => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-subcategory">Subcategory</Label>
              <Input
                id="edit-subcategory"
                value={formData.subcategory}
                onChange={e =>
                  setFormData({ ...formData, subcategory: e.target.value })
                }
                placeholder="e.g., Indoor, Outdoor, Live Rosin"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-strain">Strain</Label>
              <Select
                value={formData.strainId?.toString() ?? "none"}
                onValueChange={v =>
                  setFormData({
                    ...formData,
                    strainId: v === "none" ? null : parseInt(v),
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a strain (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Strain</SelectItem>
                  {strains?.map(strain => (
                    <SelectItem key={strain.id} value={strain.id.toString()}>
                      {strain.name}
                      {strain.category && (
                        <span className="text-muted-foreground ml-2">
                          ({strain.category})
                        </span>
                      )}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-uomSellable">Unit of Measure</Label>
              <Select
                value={formData.uomSellable}
                onValueChange={v =>
                  setFormData({ ...formData, uomSellable: v })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EA">Each (EA)</SelectItem>
                  <SelectItem value="G">Gram (G)</SelectItem>
                  <SelectItem value="OZ">Ounce (OZ)</SelectItem>
                  <SelectItem value="LB">Pound (LB)</SelectItem>
                  <SelectItem value="MG">Milligram (MG)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional product description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsEditDialogOpen(false);
                setEditingProduct(null);
                setFormData(initialFormData);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateSubmit}
              disabled={updateProduct.isPending}
            >
              {updateProduct.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Archive Product"
        description={`Are you sure you want to archive "${productToDelete?.nameCanonical}"? This product will be hidden from the catalogue but can be restored later.`}
        confirmLabel="Archive"
        variant="destructive"
        onConfirm={confirmDelete}
        isLoading={deleteProduct.isPending}
      />
    </div>
  );
}

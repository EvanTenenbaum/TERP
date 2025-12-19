import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Search,
  Filter,
  ShoppingCart,
  X,
  Check,
  Loader2,
  ChevronDown,
  AlertCircle,
  Trash2,
  Send,
  Bell,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface LiveCatalogProps {
  clientId: number;
}

export function LiveCatalog({ clientId }: LiveCatalogProps) {
  const { toast } = useToast();

  // State
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>();
  const [brandFilter, setBrandFilter] = useState<string[]>([]);
  const [gradeFilter, setGradeFilter] = useState<string[]>([]);
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'low_stock' | undefined>();
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1000]);
  const [sortBy, setSortBy] = useState<string>("name");
  const [page, setPage] = useState(0);
  const [limit] = useState(50);

  // UI State
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [interestListOpen, setInterestListOpen] = useState(false);
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [savedViewsOpen, setSavedViewsOpen] = useState(false);
  const [saveViewDialogOpen, setSaveViewDialogOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");
  const [priceAlertDialogOpen, setPriceAlertDialogOpen] = useState(false);
  const [selectedProductForAlert, setSelectedProductForAlert] = useState<any>(null);
  const [targetPrice, setTargetPrice] = useState<string>("");
  const [showClearDraftConfirm, setShowClearDraftConfirm] = useState(false);
  const [deleteViewId, setDeleteViewId] = useState<number | null>(null);

  // Fetch client configuration to check if price alerts are enabled
  const { data: clientConfig } = trpc.vipPortal.config.get.useQuery({ clientId });
  const priceAlertsEnabled = (clientConfig?.featuresConfig as { liveCatalog?: { enablePriceAlerts?: boolean } } | null)?.liveCatalog?.enablePriceAlerts ?? false;

  // Fetch catalog
  const {
    data: catalogData,
    isLoading: catalogLoading,
    refetch: refetchCatalog,
  } = trpc.vipPortal.liveCatalog.get.useQuery({
    search: search || undefined,
    category: categoryFilter,
    brand: brandFilter.length > 0 ? brandFilter : undefined,
    grade: gradeFilter.length > 0 ? gradeFilter : undefined,
    stockLevel: stockFilter === 'all' ? undefined : (stockFilter as 'in_stock' | 'low_stock' | undefined),
    priceMin: priceRange[0],
    priceMax: priceRange[1],
    sortBy: sortBy as 'name' | 'price' | 'category' | 'date',
    limit,
    offset: page * limit,
  });

  // Fetch filter options
  const { data: filterOptions } =
    trpc.vipPortal.liveCatalog.getFilterOptions.useQuery();

  // Fetch draft interests
  const {
    data: draftData,
    refetch: refetchDraft,
  } = trpc.vipPortal.liveCatalog.getDraftInterests.useQuery();

  // Fetch saved views
  const {
    data: savedViewsData,
    refetch: refetchViews,
  } = trpc.vipPortal.liveCatalog.views.list.useQuery();

  const savedViews = savedViewsData?.views || [];

  // Mutations
  const addToDraftMutation = trpc.vipPortal.liveCatalog.addToDraft.useMutation({
    onSuccess: () => {
      refetchDraft();
      toast({
        title: "Added to interest list",
        description: "Item has been added to your interest list.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeFromDraftMutation =
    trpc.vipPortal.liveCatalog.removeFromDraft.useMutation({
      onSuccess: () => {
        refetchDraft();
        toast({
          title: "Removed from interest list",
          description: "Item has been removed from your interest list.",
        });
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const clearDraftMutation = trpc.vipPortal.liveCatalog.clearDraft.useMutation({
    onSuccess: () => {
      refetchDraft();
      toast({
        title: "Interest list cleared",
        description: "All items have been removed from your interest list.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const submitInterestListMutation =
    trpc.vipPortal.liveCatalog.submitInterestList.useMutation({
      onSuccess: (data) => {
        refetchDraft();
        setSubmitDialogOpen(false);
        setInterestListOpen(false);
        toast({
          title: "Interest list submitted",
          description: `Your interest list (#${data.interestListId}) has been submitted successfully.`,
        });
      },
      onError: (error) => {
        toast({
          title: "Error submitting interest list",
          description: error.message,
          variant: "destructive",
        });
      },
    });

  const saveViewMutation = trpc.vipPortal.liveCatalog.views.save.useMutation({
    onSuccess: () => {
      refetchViews();
      setSaveViewDialogOpen(false);
      setNewViewName("");
      toast({
        title: "View saved",
        description: "Your filter view has been saved successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error saving view",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteViewMutation = trpc.vipPortal.liveCatalog.views.delete.useMutation({
    onSuccess: () => {
      refetchViews();
      toast({
        title: "View deleted",
        description: "Your saved view has been deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error deleting view",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Price Alert Mutations
  const createPriceAlertMutation = trpc.vipPortal.liveCatalog.priceAlerts.create.useMutation({
    onSuccess: () => {
      toast({
        title: "Price alert set",
        description: "You'll be notified when the price drops to your target.",
      });
      setPriceAlertDialogOpen(false);
      setTargetPrice("");
      setSelectedProductForAlert(null);
    },
    onError: (error) => {
      toast({
        title: "Error setting price alert",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Handlers
  const handleAddToInterestList = (batchId: number) => {
    addToDraftMutation.mutate({ batchId });
  };

  const handleRemoveFromInterestList = (batchId: number) => {
    removeFromDraftMutation.mutate({ draftId: batchId });
  };

  const handleClearDraft = () => {
    setShowClearDraftConfirm(true);
  };

  const confirmClearDraft = () => {
    clearDraftMutation.mutate();
    setShowClearDraftConfirm(false);
  };

  const handleSubmitInterestList = () => {
    if (!draftData || draftData.items.length === 0) {
      toast({
        title: "Empty interest list",
        description: "Please add items to your interest list before submitting.",
        variant: "destructive",
      });
      return;
    }

    // Check for changes
    const hasChanges = draftData.items.some(
      (item: any) => item.priceChanged || item.quantityChanged || !item.currentlyAvailable
    );

    if (hasChanges) {
      setSubmitDialogOpen(true);
    } else {
      submitInterestListMutation.mutate();
    }
  };

  const handleConfirmSubmit = () => {
    submitInterestListMutation.mutate();
  };

  const handleOpenPriceAlertDialog = (item: any) => {
    setSelectedProductForAlert(item);
    setTargetPrice(item.retailPrice.toString());
    setPriceAlertDialogOpen(true);
  };

  const handleCreatePriceAlert = () => {
    if (!selectedProductForAlert || !targetPrice) {
      toast({
        title: "Invalid input",
        description: "Please enter a valid target price.",
        variant: "destructive",
      });
      return;
    }

    const price = parseFloat(targetPrice);
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid price",
        description: "Please enter a valid positive number.",
        variant: "destructive",
      });
      return;
    }

    createPriceAlertMutation.mutate({
      batchId: selectedProductForAlert.id,
      targetPrice: price,
    });
  };

  const handleSaveView = () => {
    if (!newViewName.trim()) {
      toast({
        title: "View name required",
        description: "Please enter a name for your view.",
        variant: "destructive",
      });
      return;
    }

    saveViewMutation.mutate({
      name: newViewName,
      filters: {
        category: categoryFilter,
        brand: brandFilter.length > 0 ? brandFilter : undefined,
        grade: gradeFilter.length > 0 ? gradeFilter : undefined,
        stockLevel: stockFilter,
        priceMin: priceRange[0],
        priceMax: priceRange[1],
        search: search || undefined,
      },
    });
  };

  const handleLoadView = (view: { name: string; filters: { search?: string; category?: string | null; brand?: string[]; grade?: string[]; stockLevel?: 'all' | 'in_stock' | 'low_stock'; priceMin?: number; priceMax?: number }; sortBy?: string }) => {
    setSearch(view.filters.search || "");
    setCategoryFilter(view.filters.category || undefined);
    setBrandFilter(view.filters.brand || []);
    setGradeFilter(view.filters.grade || []);
    setStockFilter(view.filters.stockLevel);
    setPriceRange([view.filters.priceMin || 0, view.filters.priceMax || 1000]);
    setSortBy(view.sortBy || "name");
    setSavedViewsOpen(false);
    toast({
      title: "View loaded",
      description: `Applied filters from "${view.name}"`,
    });
  };

  const handleClearFilters = () => {
    setSearch("");
    setCategoryFilter(undefined);
    setBrandFilter([]);
    setGradeFilter([]);
    setStockFilter(undefined);
    setPriceRange([0, 1000]);
    setSortBy("name");
    setPage(0);
  };

  const isInDraft = (batchId: number) => {
    return draftData?.items.some((item: any) => item.batchId === batchId);
  };

  const activeFiltersCount = [
    categoryFilter,
    brandFilter.length > 0,
    gradeFilter.length > 0,
    stockFilter,
    priceRange[0] > 0 || priceRange[1] < 1000,
    search,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* Mobile-First Header */}
      <div className="sticky top-0 z-40 bg-card border-b">
        <div className="container mx-auto px-4 py-3 space-y-3">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 pr-4"
            />
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2">
            {/* Filter Button */}
            <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="flex-1 md:flex-none">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                  {activeFiltersCount > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {activeFiltersCount}
                    </Badge>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-full sm:max-w-md overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Filters</SheetTitle>
                  <SheetDescription>
                    Refine your catalog search
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-6 mt-6">
                  {/* Category Filter */}
                  {filterOptions?.categories && filterOptions.categories.length > 0 && (
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All categories</SelectItem>
                          {filterOptions.categories.map((cat) => (
                            <SelectItem key={cat.id} value={cat.name}>
                              {cat.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Brand Filter */}
                  {filterOptions?.brands && filterOptions.brands.length > 0 && (
                    <div className="space-y-2">
                      <Label>Brands</Label>
                      <div className="space-y-2 max-h-48 overflow-y-auto">
                        {filterOptions.brands.map((brand) => (
                          <div key={brand} className="flex items-center space-x-2">
                            <Checkbox
                              id={`brand-${brand}`}
                              checked={brandFilter.includes(brand)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setBrandFilter([...brandFilter, brand]);
                                } else {
                                  setBrandFilter(brandFilter.filter((b) => b !== brand));
                                }
                              }}
                            />
                            <Label htmlFor={`brand-${brand}`} className="font-normal">
                              {brand}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Grade Filter */}
                  {filterOptions?.grades && filterOptions.grades.length > 0 && (
                    <div className="space-y-2">
                      <Label>Grades</Label>
                      <div className="space-y-2">
                        {filterOptions.grades.map((grade) => (
                          <div key={grade} className="flex items-center space-x-2">
                            <Checkbox
                              id={`grade-${grade}`}
                              checked={gradeFilter.includes(grade)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setGradeFilter([...gradeFilter, grade]);
                                } else {
                                  setGradeFilter(gradeFilter.filter((g) => g !== grade));
                                }
                              }}
                            />
                            <Label htmlFor={`grade-${grade}`} className="font-normal">
                              {grade}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Stock Level Filter */}
                  <div className="space-y-2">
                    <Label>Stock Level</Label>
                    <Select value={stockFilter} onValueChange={(value) => setStockFilter(value as 'all' | 'in_stock' | 'low_stock' | undefined)}>
                      <SelectTrigger>
                        <SelectValue placeholder="All items" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All items</SelectItem>
                        <SelectItem value="in_stock">In Stock</SelectItem>
                        <SelectItem value="low_stock">Low Stock</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Price Range Filter */}
                  {filterOptions?.priceRange && (
                    <div className="space-y-2">
                      <Label>
                        Price Range: ${priceRange[0]} - ${priceRange[1]}
                      </Label>
                      <Slider
                        min={filterOptions.priceRange.min}
                        max={filterOptions.priceRange.max}
                        step={10}
                        value={priceRange}
                        onValueChange={(value) => setPriceRange(value as [number, number])}
                        className="mt-2"
                      />
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button
                      variant="outline"
                      onClick={handleClearFilters}
                      className="flex-1"
                    >
                      Clear All
                    </Button>
                    <Button
                      onClick={() => setFilterSheetOpen(false)}
                      className="flex-1"
                    >
                      Apply Filters
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>

            {/* Saved Views */}
            <Sheet open={savedViewsOpen} onOpenChange={setSavedViewsOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm">
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Views
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full sm:max-w-md">
                <SheetHeader>
                  <SheetTitle>Saved Views</SheetTitle>
                  <SheetDescription>
                    Quick access to your saved filter combinations
                  </SheetDescription>
                </SheetHeader>

                <div className="space-y-4 mt-6">
                  <Button
                    onClick={() => {
                      setSavedViewsOpen(false);
                      setSaveViewDialogOpen(true);
                    }}
                    className="w-full"
                  >
                    Save Current View
                  </Button>

                  {savedViews && savedViews.length > 0 ? (
                    <div className="space-y-2">
                      {savedViews.map((view: any) => (
                        <Card key={view.id} className="cursor-pointer hover:bg-accent">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div
                                className="flex-1"
                                onClick={() => handleLoadView(view)}
                              >
                                <p className="font-medium">{view.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {new Date(view.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteViewId(view.id);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-center text-muted-foreground py-8">
                      No saved views yet
                    </p>
                  )}
                </div>
              </SheetContent>
            </Sheet>

            {/* Sort */}
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="price_asc">Price: Low to High</SelectItem>
                <SelectItem value="price_desc">Price: High to Low</SelectItem>
                <SelectItem value="quantity_desc">Quantity: High to Low</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active Filters Chips */}
          {activeFiltersCount > 0 && (
            <div className="flex flex-wrap gap-2">
              {categoryFilter && categoryFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {categoryFilter}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setCategoryFilter(undefined)}
                  />
                </Badge>
              )}
              {brandFilter.map((brand) => (
                <Badge key={brand} variant="secondary" className="gap-1">
                  {brand}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() =>
                      setBrandFilter(brandFilter.filter((b) => b !== brand))
                    }
                  />
                </Badge>
              ))}
              {gradeFilter.map((grade) => (
                <Badge key={grade} variant="secondary" className="gap-1">
                  {grade}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() =>
                      setGradeFilter(gradeFilter.filter((g) => g !== grade))
                    }
                  />
                </Badge>
              ))}
              {stockFilter && stockFilter !== "all" && (
                <Badge variant="secondary" className="gap-1">
                  {stockFilter === "in_stock" ? "In Stock" : "Low Stock"}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => setStockFilter(undefined)}
                  />
                </Badge>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Catalog Grid */}
      <div className="container mx-auto px-4 py-6">
        {catalogLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : catalogData && catalogData.items.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {catalogData.items.map((item: any) => (
                <Card
                  key={item.id}
                  className={cn(
                    "relative overflow-hidden transition-all hover:shadow-md",
                    isInDraft(item.id) && "ring-2 ring-primary"
                  )}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base line-clamp-2">
                        {item.name}
                      </CardTitle>
                      {isInDraft(item.id) && (
                        <Badge variant="default" className="shrink-0">
                          <Check className="h-3 w-3" />
                        </Badge>
                      )}
                    </div>
                    {item.category && (
                      <CardDescription className="text-sm">
                        {item.category}
                        {item.subcategory && ` • ${item.subcategory}`}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Price */}
                    <div className="text-2xl font-bold text-primary">
                      ${item.retailPrice}
                      <span className="text-sm font-normal text-muted-foreground">
                        {" "}
                        / lb
                      </span>
                    </div>

                    {/* Attributes */}
                    <div className="space-y-1 text-sm">
                      {item.quantity !== undefined && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Available:</span>
                          <span className="font-medium">{item.quantity} lbs</span>
                        </div>
                      )}
                      {item.brand && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Brand:</span>
                          <span className="font-medium">{item.brand}</span>
                        </div>
                      )}
                      {item.grade && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Grade:</span>
                          <span className="font-medium">{item.grade}</span>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="space-y-2">
                      <Button
                        onClick={() =>
                          isInDraft(item.id)
                            ? handleRemoveFromInterestList(item.id)
                            : handleAddToInterestList(item.id)
                        }
                        variant={isInDraft(item.id) ? "outline" : "default"}
                        className="w-full"
                        disabled={
                          addToDraftMutation.isPending ||
                          removeFromDraftMutation.isPending
                        }
                      >
                        {isInDraft(item.id) ? (
                          <>
                            <Check className="h-4 w-4 mr-2" />
                            In Interest List
                          </>
                        ) : (
                          <>
                            <ShoppingCart className="h-4 w-4 mr-2" />
                            Add to Interest List
                          </>
                        )}
                      </Button>
                      
                      {/* Price Alert Button (if enabled) */}
                      {priceAlertsEnabled && (
                        <Button
                          onClick={() => handleOpenPriceAlertDialog(item)}
                          variant="outline"
                          size="sm"
                          className="w-full"
                        >
                          <Bell className="h-4 w-4 mr-2" />
                          Set Price Alert
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Pagination */}
            {catalogData.total > limit && (
              <div className="flex items-center justify-between mt-6">
                <Button
                  variant="outline"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {Math.ceil(catalogData.total / limit)}
                </span>
                <Button
                  variant="outline"
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * limit >= catalogData.total}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">
              No products found. Try adjusting your filters.
            </p>
          </div>
        )}
      </div>

      {/* My Price Alerts Section */}
      {priceAlertsEnabled && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>My Price Alerts</CardTitle>
            <CardDescription>
              You'll be notified when prices drop to your target
            </CardDescription>
          </CardHeader>
          <CardContent>
            <MyPriceAlerts />
          </CardContent>
        </Card>
      )}

      {/* Floating Action Button (Mobile) */}
      <div className="fixed bottom-4 right-4 md:hidden z-50">
        <Button
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg"
          onClick={() => setInterestListOpen(true)}
        >
          <ShoppingCart className="h-6 w-6" />
          {draftData && draftData.items.length > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0 flex items-center justify-center"
            >
              {draftData.items.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* Interest List Sheet (Mobile) */}
      <Sheet open={interestListOpen} onOpenChange={setInterestListOpen}>
        <SheetContent side="bottom" className="h-[80vh]">
          <SheetHeader>
            <SheetTitle>Interest List</SheetTitle>
            <SheetDescription>
              Items you're interested in purchasing
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4 overflow-y-auto max-h-[calc(80vh-200px)]">
            {draftData && draftData.items.length > 0 ? (
              <>
                {draftData.items.map((item: any) => (
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium line-clamp-2">{item.itemName}</p>
                          {item.category && (
                            <p className="text-sm text-muted-foreground">
                              {item.category}
                            </p>
                          )}
                          <div className="mt-2 space-y-1">
                            <p className="text-lg font-bold text-primary">
                              ${item.retailPrice}
                              <span className="text-sm font-normal text-muted-foreground">
                                {" "}
                                / lb
                              </span>
                            </p>
                            {item.quantity !== undefined && (
                              <p className="text-sm text-muted-foreground">
                                {item.quantity} lbs available
                              </p>
                            )}
                          </div>

                          {/* Change Indicators */}
                          {(item.priceChanged ||
                            item.quantityChanged ||
                            !item.currentlyAvailable) && (
                            <div className="mt-2 space-y-1">
                              {item.priceChanged && (
                                <p className="text-sm font-bold text-red-600">
                                  Price changed to ${item.currentPrice}
                                </p>
                              )}
                              {item.quantityChanged && (
                                <p className="text-sm font-bold text-red-600">
                                  Quantity changed to {item.currentQuantity} lbs
                                </p>
                              )}
                              {!item.currentlyAvailable && (
                                <p className="text-sm font-bold text-red-600">
                                  Out of stock
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveFromInterestList(item.batchId)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {/* Total */}
                <div className="pt-4 border-t">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">
                      {draftData.totalItems} items
                    </span>
                    <span className="text-lg font-bold">
                      Total: ${draftData.totalValue}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={handleClearDraft}
                    disabled={clearDraftMutation.isPending}
                    className="flex-1"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Clear All
                  </Button>
                  <Button
                    onClick={handleSubmitInterestList}
                    disabled={submitInterestListMutation.isPending}
                    className="flex-1"
                  >
                    {submitInterestListMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4 mr-2" />
                    )}
                    Submit List
                  </Button>
                </div>
              </>
            ) : (
              <div className="text-center py-12">
                <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  Your interest list is empty
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Browse the catalog and add items you're interested in
                </p>
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Submit Confirmation Dialog */}
      <Dialog open={submitDialogOpen} onOpenChange={setSubmitDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Submission</DialogTitle>
            <DialogDescription>
              Some items in your interest list have changed since you added them.
              Do you want to proceed with submission?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium">Changes detected:</p>
                <ul className="list-disc list-inside mt-1 text-muted-foreground">
                  {draftData?.items.some((item: any) => item.priceChanged) && (
                    <li>Price changes</li>
                  )}
                  {draftData?.items.some((item: any) => item.quantityChanged) && (
                    <li>Quantity changes</li>
                  )}
                  {draftData?.items.some((item: any) => !item.currentlyAvailable) && (
                    <li>Items out of stock</li>
                  )}
                </ul>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSubmitDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleConfirmSubmit}>
              Submit Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save View Dialog */}
      <Dialog open={saveViewDialogOpen} onOpenChange={setSaveViewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Current View</DialogTitle>
            <DialogDescription>
              Save your current filter settings for quick access later
            </DialogDescription>
          </DialogHeader>

          <div className="py-4">
            <Label htmlFor="viewName">View Name</Label>
            <Input
              id="viewName"
              placeholder="e.g., Premium Flower"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              className="mt-2"
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveViewDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveView}
              disabled={saveViewMutation.isPending}
            >
              {saveViewMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Save View
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Price Alert Dialog */}
      <Dialog open={priceAlertDialogOpen} onOpenChange={setPriceAlertDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Price Alert</DialogTitle>
            <DialogDescription>
              Get notified when the price drops to your target
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedProductForAlert && (
              <div>
                <Label>Product: {selectedProductForAlert.name}</Label>
                <p className="text-sm text-muted-foreground">
                  Current Price: ${selectedProductForAlert.retailPrice}
                </p>
              </div>
            )}
            <div>
              <Label htmlFor="targetPrice">Target Price</Label>
              <Input
                id="targetPrice"
                type="number"
                step="0.01"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="Enter target price"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPriceAlertDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreatePriceAlert}
              disabled={createPriceAlertMutation.isPending}
            >
              {createPriceAlertMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Set Alert
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={showClearDraftConfirm}
        onOpenChange={setShowClearDraftConfirm}
        title="Clear Interest List"
        description="Are you sure you want to clear all items from your interest list? This action cannot be undone."
        confirmLabel="Clear All"
        variant="destructive"
        onConfirm={confirmClearDraft}
        isLoading={clearDraftMutation.isPending}
      />

      <ConfirmDialog
        open={!!deleteViewId}
        onOpenChange={(open) => !open && setDeleteViewId(null)}
        title="Delete View"
        description="Are you sure you want to delete this saved view?"
        confirmLabel="Delete"
        variant="destructive"
        onConfirm={() => {
          if (deleteViewId) {
            deleteViewMutation.mutate({ viewId: deleteViewId });
            setDeleteViewId(null);
          }
        }}
        isLoading={deleteViewMutation.isPending}
      />
    </div>
  );
}

// My Price Alerts Component
function MyPriceAlerts() {
  const { toast } = useToast();
  const [removeAlertId, setRemoveAlertId] = useState<number | null>(null);

  // Fetch price alerts
  const {
    data: priceAlerts,
    isLoading,
    refetch,
  } = trpc.vipPortal.liveCatalog.priceAlerts.list.useQuery();

  // Deactivate alert mutation
  const deactivateAlertMutation = trpc.vipPortal.liveCatalog.priceAlerts.deactivate.useMutation({
    onSuccess: () => {
      toast({
        title: "Alert removed",
        description: "Price alert has been removed.",
      });
      refetch();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove price alert",
        variant: "destructive",
      });
    },
  });

  const handleRemoveAlert = (alertId: number) => {
    setRemoveAlertId(alertId);
  };

  const confirmRemoveAlert = () => {
    if (removeAlertId) {
      deactivateAlertMutation.mutate({ alertId: removeAlertId });
      setRemoveAlertId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!priceAlerts || priceAlerts.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No active price alerts.</p>
        <p className="text-sm mt-2">Set a price alert on any product to get notified when prices drop.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {priceAlerts.map((alert) => {
        const priceDropped = alert.currentPrice !== null && alert.currentPrice <= alert.targetPrice;
        const priceDropPercentage = alert.priceDropPercentage;

        return (
          <div
            key={alert.id}
            className={cn(
              "flex items-center justify-between p-4 border rounded-lg",
              priceDropped && "bg-green-50 border-green-200"
            )}
          >
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{alert.productName}</p>
                {priceDropped && (
                  <Badge variant="default" className="bg-green-600">
                    <Check className="h-3 w-3 mr-1" />
                    Price Dropped!
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Target: ${alert.targetPrice.toFixed(2)}
                {alert.currentPrice !== null && (
                  <>
                    {" • "}
                    Current: 
                    <span className={priceDropped ? "text-green-600 font-bold ml-1" : "ml-1"}>
                      ${alert.currentPrice.toFixed(2)}
                    </span>
                    {priceDropped && priceDropPercentage !== null && (
                      <span className="text-green-600 ml-1">({priceDropPercentage.toFixed(1)}% off)</span>
                    )}
                  </>
                )}
              </div>
              {alert.category && (
                <div className="text-xs text-muted-foreground mt-1">
                  {alert.category}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveAlert(alert.id)}
              disabled={deactivateAlertMutation.isPending}
            >
              {deactivateAlertMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <X className="h-4 w-4" />
              )}
            </Button>
          </div>
        );
      })}

      <ConfirmDialog
        open={!!removeAlertId}
        onOpenChange={(open) => !open && setRemoveAlertId(null)}
        title="Remove Price Alert"
        description="Are you sure you want to remove this price alert?"
        confirmLabel="Remove"
        variant="destructive"
        onConfirm={confirmRemoveAlert}
        isLoading={deactivateAlertMutation.isPending}
      />
    </div>
  );
}

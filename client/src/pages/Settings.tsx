import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2, Save, X, Database, AlertTriangle } from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { UserManagement } from "@/components/UserManagement";
import { UserRoleManagement } from "@/components/settings/rbac/UserRoleManagement";
import { RoleManagement } from "@/components/settings/rbac/RoleManagement";
import { PermissionAssignment } from "@/components/settings/rbac/PermissionAssignment";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export default function Settings() {
  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6">
      <BackButton label="Back to Dashboard" to="/" className="mb-2 sm:mb-4" />
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm sm:text-base">
          Manage system configurations and master data
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-3 sm:space-y-4">
        <div className="overflow-x-auto -mx-3 sm:-mx-4 px-3 sm:px-4 md:mx-0 md:px-0 scrollbar-hide">
          <TabsList className="inline-flex w-full min-w-max md:w-auto md:grid md:grid-cols-8 gap-1 h-auto">
            <TabsTrigger value="users" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Users</TabsTrigger>
            <TabsTrigger value="rbac" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">User Roles</TabsTrigger>
            <TabsTrigger value="roles" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Roles</TabsTrigger>
            <TabsTrigger value="permissions" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Permissions</TabsTrigger>
            <TabsTrigger value="locations" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Locations</TabsTrigger>
            <TabsTrigger value="categories" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Categories</TabsTrigger>
            <TabsTrigger value="grades" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Grades</TabsTrigger>
            <TabsTrigger value="database" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3 py-1.5 sm:py-2">Database</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="users" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <UserManagement />
        </TabsContent>

        <TabsContent value="rbac" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <UserRoleManagement />
        </TabsContent>

        <TabsContent value="roles" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <RoleManagement />
        </TabsContent>

        <TabsContent value="permissions" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <PermissionAssignment />
        </TabsContent>

        <TabsContent value="locations" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <LocationsManager />
        </TabsContent>

        <TabsContent value="categories" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <CategoriesManager />
        </TabsContent>

        <TabsContent value="grades" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <GradesManager />
        </TabsContent>

        <TabsContent value="database" className="space-y-3 sm:space-y-4 mt-3 sm:mt-4">
          <DatabaseManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function DatabaseManager() {
  const [scenario, setScenario] = useState<"light" | "full" | "edgeCases" | "chaos">("light");
  const [isOpen, setIsOpen] = useState(false);

  const seedMutation = trpc.settings.seedDatabase.useMutation({
    onSuccess: () => {
      toast.success("Database seeded successfully");
      setIsOpen(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to seed database");
    },
  });

  const handleSeed = () => {
    seedMutation.mutate({ scenario });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Database className="h-4 w-4 sm:h-5 sm:w-5" />
          Database Seeding
        </CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Seed the database with test data. This will clear all existing data and create fresh test data.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6 px-4 sm:px-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="space-y-2">
            <Label htmlFor="scenario" className="text-sm sm:text-base">Seed Scenario</Label>
            <select
              id="scenario"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={scenario}
              onChange={(e) => setScenario(e.target.value as typeof scenario)}
            >
              <option value="light">Light (~30s) - Fast seed for integration tests</option>
              <option value="full">Full (~2min) - Complete dataset for E2E tests</option>
              <option value="edgeCases">Edge Cases (~45s) - Extreme scenarios for stress testing</option>
              <option value="chaos">Chaos (~60s) - Random anomalies for chaos testing</option>
            </select>
          </div>

          <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-3 sm:p-4">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive mt-0.5 flex-shrink-0" />
              <div className="space-y-1 sm:space-y-2 min-w-0">
                <p className="font-semibold text-destructive text-sm sm:text-base">Warning: Destructive Operation</p>
                <p className="text-xs sm:text-sm text-muted-foreground">
                  This will permanently delete all existing data in the database and replace it with test data.
                  This action cannot be undone.
                </p>
              </div>
            </div>
          </div>

          <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full sm:w-auto">
                <Database className="h-4 w-4 mr-2" />
                Seed Database
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-[95vw] sm:max-w-lg mx-4">
              <AlertDialogHeader>
                <AlertDialogTitle className="text-base sm:text-lg">Confirm Database Seeding</AlertDialogTitle>
                <AlertDialogDescription className="space-y-2 text-sm sm:text-base max-h-[60vh] overflow-y-auto">
                  <p>
                    You are about to seed the database with the <strong>{scenario}</strong> scenario.
                  </p>
                  <p className="font-semibold text-destructive">
                    This will permanently delete ALL existing data including:
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>All users (except system users)</li>
                    <li>All clients and vendors</li>
                    <li>All products, strains, and inventory</li>
                    <li>All orders, invoices, and returns</li>
                    <li>All other business data</li>
                  </ul>
                  <p className="pt-2">
                    Are you absolutely sure you want to continue?
                  </p>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleSeed}
                  disabled={seedMutation.isPending}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {seedMutation.isPending ? "Seeding..." : "Yes, Seed Database"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

function LocationsManager() {
  const [newLocation, setNewLocation] = useState({
    site: "",
    zone: "",
    rack: "",
    shelf: "",
    bin: "",
  });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editData, setEditData] = useState<any>(null);

  const { data: locations, refetch } = trpc.settings.locations.list.useQuery();
  const createMutation = trpc.settings.locations.create.useMutation({
    onSuccess: () => {
      toast.success("Location created successfully");
      setNewLocation({ site: "", zone: "", rack: "", shelf: "", bin: "" });
      refetch();
    },
    onError: () => {
      toast.error("Failed to create location");
    },
  });

  const updateMutation = trpc.settings.locations.update.useMutation({
    onSuccess: () => {
      toast.success("Location updated successfully");
      setEditingId(null);
      setEditData(null);
      refetch();
    },
    onError: () => {
      toast.error("Failed to update location");
    },
  });

  const deleteMutation = trpc.settings.locations.delete.useMutation({
    onSuccess: () => {
      toast.success("Location deleted successfully");
      refetch();
    },
    onError: () => {
      toast.error("Failed to delete location");
    },
  });

  const handleCreate = () => {
    if (!newLocation.site) {
      toast.error("Site is required");
      return;
    }
    createMutation.mutate(newLocation);
  };

  const handleUpdate = () => {
    if (editData && editingId) {
      updateMutation.mutate({ id: editingId, ...editData });
    }
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="text-base sm:text-lg">Storage Locations</CardTitle>
        <CardDescription className="text-xs sm:text-sm">
          Define warehouse locations (site, zone, rack, shelf, bin)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Add New Location */}
        <div className="border rounded-lg p-3 sm:p-4 space-y-3 sm:space-y-4">
          <h3 className="font-semibold text-sm sm:text-base">Add New Location</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="new-site">Site *</Label>
              <Input
                id="new-site"
                value={newLocation.site}
                onChange={(e) => setNewLocation({ ...newLocation, site: e.target.value })}
                placeholder="e.g., WH1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-zone">Zone</Label>
              <Input
                id="new-zone"
                value={newLocation.zone}
                onChange={(e) => setNewLocation({ ...newLocation, zone: e.target.value })}
                placeholder="e.g., A"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-rack">Rack</Label>
              <Input
                id="new-rack"
                value={newLocation.rack}
                onChange={(e) => setNewLocation({ ...newLocation, rack: e.target.value })}
                placeholder="e.g., R1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-shelf">Shelf</Label>
              <Input
                id="new-shelf"
                value={newLocation.shelf}
                onChange={(e) => setNewLocation({ ...newLocation, shelf: e.target.value })}
                placeholder="e.g., S1"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-bin">Bin</Label>
              <Input
                id="new-bin"
                value={newLocation.bin}
                onChange={(e) => setNewLocation({ ...newLocation, bin: e.target.value })}
                placeholder="e.g., B1"
              />
            </div>
          </div>
          <Button onClick={handleCreate} disabled={createMutation.isPending}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>

        {/* Locations List */}
        <div className="space-y-2">
          <h3 className="font-semibold">Existing Locations</h3>
          <div className="border rounded-lg divide-y">
            {locations?.map((location: any) => (
              <div key={location.id} className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-2">
                {editingId === location.id ? (
                  <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                    <Input
                      value={editData.site}
                      onChange={(e) => setEditData({ ...editData, site: e.target.value })}
                      placeholder="Site"
                    />
                    <Input
                      value={editData.zone || ""}
                      onChange={(e) => setEditData({ ...editData, zone: e.target.value })}
                      placeholder="Zone"
                    />
                    <Input
                      value={editData.rack || ""}
                      onChange={(e) => setEditData({ ...editData, rack: e.target.value })}
                      placeholder="Rack"
                    />
                    <Input
                      value={editData.shelf || ""}
                      onChange={(e) => setEditData({ ...editData, shelf: e.target.value })}
                      placeholder="Shelf"
                    />
                    <Input
                      value={editData.bin || ""}
                      onChange={(e) => setEditData({ ...editData, bin: e.target.value })}
                      placeholder="Bin"
                    />
                  </div>
                ) : (
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">{location.site}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground truncate">
                      {[location.zone, location.rack, location.shelf, location.bin]
                        .filter(Boolean)
                        .join(" > ") || "No sub-locations"}
                    </p>
                  </div>
                )}
                <div className="flex gap-2 self-end sm:self-auto">
                  {editingId === location.id ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={handleUpdate}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(null);
                          setEditData(null);
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(location.id);
                          setEditData(location);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteMutation.mutate({ id: location.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
            {(!locations || locations.length === 0) && (
              <div className="p-8 text-center text-muted-foreground">
                No locations defined yet
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoriesManager() {
  const [newCategory, setNewCategory] = useState("");
  const [newSubcategory, setNewSubcategory] = useState({ categoryId: 0, name: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const { data: categories, refetch } = trpc.settings.categories.list.useQuery();
  
  const createCategoryMutation = trpc.settings.categories.create.useMutation({
    onSuccess: () => {
      toast.success("Category created successfully");
      setNewCategory("");
      refetch();
    },
  });

  const createSubcategoryMutation = trpc.settings.subcategories.create.useMutation({
    onSuccess: () => {
      toast.success("Subcategory created successfully");
      setNewSubcategory({ categoryId: 0, name: "" });
      refetch();
    },
  });

  const updateCategoryMutation = trpc.settings.categories.update.useMutation({
    onSuccess: () => {
      toast.success("Category updated successfully");
      setEditingId(null);
      refetch();
    },
  });

  const deleteCategoryMutation = trpc.settings.categories.delete.useMutation({
    onSuccess: () => {
      toast.success("Category deleted successfully");
      refetch();
    },
  });

  const handleUpdateCategory = (id: number) => {
    // Note: updateProducts functionality would need to be implemented in the router
    // For now, just update the category name
    updateCategoryMutation.mutate({ id, name: editName });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
      <Card className="overflow-hidden">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Categories</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Manage product categories</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category name"
              className="flex-1"
            />
            <Button onClick={() => createCategoryMutation.mutate({ name: newCategory })} className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="border rounded-lg divide-y">
            {categories?.map((category: any) => (
              <div key={category.id} className="p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                {editingId === category.id ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 w-full sm:mr-2"
                  />
                ) : (
                  <span className="font-medium text-sm sm:text-base truncate flex-1 min-w-0">{category.name}</span>
                )}
                <div className="flex gap-2 self-end sm:self-auto">
                  {editingId === category.id ? (
                    <>
                      <Button size="sm" variant="ghost" onClick={() => handleUpdateCategory(category.id)}>
                        <Save className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          setEditingId(category.id);
                          setEditName(category.name);
                        }}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => deleteCategoryMutation.mutate({ id: category.id })}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="px-4 sm:px-6">
          <CardTitle className="text-base sm:text-lg">Subcategories</CardTitle>
          <CardDescription className="text-xs sm:text-sm">Manage product subcategories</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row gap-2">
            <select
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={newSubcategory.categoryId}
              onChange={(e) => setNewSubcategory({ ...newSubcategory, categoryId: parseInt(e.target.value) })}
            >
              <option value={0}>Select category</option>
              {categories?.map((cat: any) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <Input
              value={newSubcategory.name}
              onChange={(e) => setNewSubcategory({ ...newSubcategory, name: e.target.value })}
              placeholder="Subcategory name"
              className="flex-1"
            />
            <Button onClick={() => createSubcategoryMutation.mutate(newSubcategory)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
            {categories?.map((category: any) => (
              <div key={category.id}>
                <div className="p-2 bg-muted font-semibold text-xs sm:text-sm">{category.name}</div>
                {category.subcategories?.map((sub: any) => (
                  <div key={sub.id} className="p-2 pl-4 sm:pl-6 flex items-center justify-between gap-2">
                    <span className="text-xs sm:text-sm truncate flex-1 min-w-0">{sub.name}</span>
                    <Button size="sm" variant="ghost" className="flex-shrink-0">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function GradesManager() {
  const [newGrade, setNewGrade] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");

  const { data: grades, refetch } = trpc.settings.grades.list.useQuery();
  
  const createMutation = trpc.settings.grades.create.useMutation({
    onSuccess: () => {
      toast.success("Grade created successfully");
      setNewGrade("");
      refetch();
    },
  });

  const updateMutation = trpc.settings.grades.update.useMutation({
    onSuccess: () => {
      toast.success("Grade updated successfully");
      setEditingId(null);
      refetch();
    },
  });

  const deleteMutation = trpc.settings.grades.delete.useMutation({
    onSuccess: () => {
      toast.success("Grade deleted successfully");
      refetch();
    },
  });

  const handleUpdate = (id: number) => {
    // Note: updateProducts functionality would need to be implemented in the router
    // For now, just update the grade name
    updateMutation.mutate({ id, name: editName });
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="text-base sm:text-lg">Product Grades</CardTitle>
        <CardDescription className="text-xs sm:text-sm">Define and manage product quality grades</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 sm:space-y-4 px-4 sm:px-6">
        <div className="flex flex-col sm:flex-row gap-2">
          <Input
            value={newGrade}
            onChange={(e) => setNewGrade(e.target.value)}
            placeholder="New grade (e.g., A, B, Premium)"
            className="flex-1"
          />
          <Button onClick={() => createMutation.mutate({ name: newGrade })} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add Grade
          </Button>
        </div>
        <div className="border rounded-lg divide-y">
          {grades?.map((grade: any) => (
            <div key={grade.id} className="p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              {editingId === grade.id ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 w-full sm:mr-2"
                />
              ) : (
                <span className="font-medium text-sm sm:text-base truncate flex-1 min-w-0">{grade.name}</span>
              )}
              <div className="flex gap-2 self-end sm:self-auto">
                {editingId === grade.id ? (
                  <>
                    <Button size="sm" variant="ghost" onClick={() => handleUpdate(grade.id)}>
                      <Save className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setEditingId(grade.id);
                        setEditName(grade.name);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => deleteMutation.mutate({ id: grade.id })}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
          {(!grades || grades.length === 0) && (
            <div className="p-8 text-center text-muted-foreground">
              No grades defined yet
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}


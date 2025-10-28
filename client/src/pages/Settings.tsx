import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Edit2, Save, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { UserManagement } from "@/components/UserManagement";

export default function Settings() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage system configurations and master data
        </p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto">
          <TabsTrigger value="users">Users</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="grades">Grades</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <LocationsManager />
        </TabsContent>

        <TabsContent value="categories" className="space-y-4">
          <CategoriesManager />
        </TabsContent>

        <TabsContent value="grades" className="space-y-4">
          <GradesManager />
        </TabsContent>
      </Tabs>
    </div>
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
    <Card>
      <CardHeader>
        <CardTitle>Storage Locations</CardTitle>
        <CardDescription>
          Define warehouse locations (site, zone, rack, shelf, bin)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Add New Location */}
        <div className="border rounded-lg p-4 space-y-4">
          <h3 className="font-semibold">Add New Location</h3>
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
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
              <div key={location.id} className="p-4 flex items-center justify-between">
                {editingId === location.id ? (
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-5 gap-2">
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
                  <div className="flex-1">
                    <p className="font-medium">{location.site}</p>
                    <p className="text-sm text-muted-foreground">
                      {[location.zone, location.rack, location.shelf, location.bin]
                        .filter(Boolean)
                        .join(" > ") || "No sub-locations"}
                    </p>
                  </div>
                )}
                <div className="flex gap-2">
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
    if (window.confirm("Do you want to update this category for all existing products?")) {
      updateCategoryMutation.mutate({ id, name: editName, updateProducts: true });
    } else {
      updateCategoryMutation.mutate({ id, name: editName, updateProducts: false });
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Categories</CardTitle>
          <CardDescription>Manage product categories</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder="New category name"
            />
            <Button onClick={() => createCategoryMutation.mutate({ name: newCategory })}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="border rounded-lg divide-y">
            {categories?.map((category: any) => (
              <div key={category.id} className="p-3 flex items-center justify-between">
                {editingId === category.id ? (
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="flex-1 mr-2"
                  />
                ) : (
                  <span className="font-medium">{category.name}</span>
                )}
                <div className="flex gap-2">
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

      <Card>
        <CardHeader>
          <CardTitle>Subcategories</CardTitle>
          <CardDescription>Manage product subcategories</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
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
            />
            <Button onClick={() => createSubcategoryMutation.mutate(newSubcategory)}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <div className="border rounded-lg divide-y max-h-96 overflow-y-auto">
            {categories?.map((category: any) => (
              <div key={category.id}>
                <div className="p-2 bg-muted font-semibold text-sm">{category.name}</div>
                {category.subcategories?.map((sub: any) => (
                  <div key={sub.id} className="p-2 pl-6 flex items-center justify-between">
                    <span>{sub.name}</span>
                    <Button size="sm" variant="ghost">
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
    if (window.confirm("Do you want to update this grade for all existing products?")) {
      updateMutation.mutate({ id, name: editName, updateProducts: true });
    } else {
      updateMutation.mutate({ id, name: editName, updateProducts: false });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Grades</CardTitle>
        <CardDescription>Define and manage product quality grades</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            value={newGrade}
            onChange={(e) => setNewGrade(e.target.value)}
            placeholder="New grade (e.g., A, B, Premium)"
          />
          <Button onClick={() => createMutation.mutate({ name: newGrade })}>
            <Plus className="h-4 w-4 mr-2" />
            Add Grade
          </Button>
        </div>
        <div className="border rounded-lg divide-y">
          {grades?.map((grade: any) => (
            <div key={grade.id} className="p-4 flex items-center justify-between">
              {editingId === grade.id ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="flex-1 mr-2"
                />
              ) : (
                <span className="font-medium">{grade.name}</span>
              )}
              <div className="flex gap-2">
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


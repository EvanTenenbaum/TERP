import { useCallback, useState } from "react";
import { trpc } from "../lib/trpc";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import { Button } from "../components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Warehouse,
  MapPin,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Package,
} from "lucide-react";
import { BackButton } from "@/components/common/BackButton";
import { TableSkeleton } from "@/components/ui/skeleton-loaders";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  LocationFormDialog,
  LocationFormData,
  DeleteLocationDialog,
  AssignBatchDialog,
} from "@/components/locations";

interface Location {
  id: number;
  site: string;
  zone: string | null;
  rack: string | null;
  shelf: string | null;
  bin: string | null;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
}

export default function LocationsPage(): React.ReactElement {
  const [limit] = useState(100);
  const [offset] = useState(0);
  const { toast } = useToast();

  // Dialog states
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const utils = trpc.useUtils();

  const { data: locations, isLoading } = trpc.locations.getAll.useQuery({
    limit,
    offset,
  });

  const createMutation = trpc.locations.create.useMutation({
    onSuccess: () => {
      utils.locations.getAll.invalidate();
      toast({
        title: "Location created",
        description: "The location has been created successfully.",
      });
      setFormDialogOpen(false);
    },
    onError: error => {
      toast({
        title: "Error",
        description: error.message || "Failed to create location",
        variant: "destructive",
      });
    },
  });

  const updateMutation = trpc.locations.update.useMutation({
    onSuccess: () => {
      utils.locations.getAll.invalidate();
      toast({
        title: "Location updated",
        description: "The location has been updated successfully.",
      });
      setFormDialogOpen(false);
      setSelectedLocation(null);
    },
    onError: error => {
      toast({
        title: "Error",
        description: error.message || "Failed to update location",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = trpc.locations.delete.useMutation({
    onSuccess: () => {
      utils.locations.getAll.invalidate();
      toast({
        title: "Location deleted",
        description: "The location has been marked as inactive.",
      });
      setDeleteDialogOpen(false);
      setSelectedLocation(null);
    },
    onError: error => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete location",
        variant: "destructive",
      });
    },
  });

  const assignBatchMutation = trpc.locations.assignBatchToLocation.useMutation({
    onSuccess: () => {
      utils.locations.getBatchLocations.invalidate();
      toast({
        title: "Batch assigned",
        description: "The batch has been assigned to the location.",
      });
      setAssignDialogOpen(false);
    },
    onError: error => {
      toast({
        title: "Error",
        description: error.message || "Failed to assign batch",
        variant: "destructive",
      });
    },
  });

  const handleCreateClick = useCallback(() => {
    setSelectedLocation(null);
    setFormDialogOpen(true);
  }, []);

  const handleEditClick = useCallback((location: Location) => {
    setSelectedLocation(location);
    setFormDialogOpen(true);
  }, []);

  const handleDeleteClick = useCallback((location: Location) => {
    setSelectedLocation(location);
    setDeleteDialogOpen(true);
  }, []);

  const handleFormSubmit = useCallback(
    async (data: LocationFormData) => {
      setIsSubmitting(true);
      try {
        if (data.id) {
          await updateMutation.mutateAsync({
            id: data.id,
            site: data.site,
            zone: data.zone || undefined,
            rack: data.rack || undefined,
            shelf: data.shelf || undefined,
            bin: data.bin || undefined,
            isActive: data.isActive,
          });
        } else {
          await createMutation.mutateAsync({
            site: data.site,
            zone: data.zone || undefined,
            rack: data.rack || undefined,
            shelf: data.shelf || undefined,
            bin: data.bin || undefined,
            isActive: data.isActive,
          });
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [createMutation, updateMutation]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!selectedLocation) return;
    setIsSubmitting(true);
    try {
      await deleteMutation.mutateAsync({ id: selectedLocation.id });
    } finally {
      setIsSubmitting(false);
    }
  }, [selectedLocation, deleteMutation]);

  const handleAssignBatch = useCallback(
    async (data: {
      batchId: number;
      site: string;
      zone?: string;
      rack?: string;
      shelf?: string;
      bin?: string;
      quantity: string;
    }) => {
      setIsSubmitting(true);
      try {
        await assignBatchMutation.mutateAsync(data);
      } finally {
        setIsSubmitting(false);
      }
    },
    [assignBatchMutation]
  );

  const getLocationFormData = (
    location: Location | null
  ): LocationFormData | null => {
    if (!location) return null;
    return {
      id: location.id,
      site: location.site,
      zone: location.zone || "",
      rack: location.rack || "",
      shelf: location.shelf || "",
      bin: location.bin || "",
      isActive: Boolean(location.isActive),
    };
  };

  const getLocationDisplayName = (location: Location): string => {
    const parts = [location.site];
    if (location.zone) parts.push(location.zone);
    if (location.rack) parts.push(location.rack);
    return parts.join(" > ");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <BackButton label="Back to Dashboard" to="/" className="mb-4" />
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Warehouse className="h-8 w-8" />
            Warehouse Locations
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage warehouse locations and inventory placement
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setAssignDialogOpen(true)}>
            <Package className="h-4 w-4 mr-2" />
            Assign Batch
          </Button>
          <Button onClick={handleCreateClick}>
            <Plus className="h-4 w-4 mr-2" />
            Add Location
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            All Locations
            {locations && (
              <span className="text-sm font-normal text-muted-foreground ml-2">
                ({locations.length} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <TableSkeleton rows={6} columns={7} />
          ) : locations && locations.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site</TableHead>
                  <TableHead>Zone</TableHead>
                  <TableHead>Rack</TableHead>
                  <TableHead>Shelf</TableHead>
                  <TableHead>Bin</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[70px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations.map((location: Location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">
                      {location.site}
                    </TableCell>
                    <TableCell>{location.zone || "-"}</TableCell>
                    <TableCell>{location.rack || "-"}</TableCell>
                    <TableCell>{location.shelf || "-"}</TableCell>
                    <TableCell>{location.bin || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          location.isActive
                            ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400"
                        }`}
                      >
                        {location.isActive ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Actions for ${location.site}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => handleEditClick(location)}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(location)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <Warehouse className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground mb-4">No locations found</p>
              <Button onClick={handleCreateClick}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Location
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Location Dialog */}
      <LocationFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSubmit={handleFormSubmit}
        initialData={getLocationFormData(selectedLocation)}
        isLoading={isSubmitting}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteLocationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
        locationName={
          selectedLocation ? getLocationDisplayName(selectedLocation) : ""
        }
        isLoading={isSubmitting}
      />

      {/* Assign Batch Dialog */}
      <AssignBatchDialog
        open={assignDialogOpen}
        onOpenChange={setAssignDialogOpen}
        onSubmit={handleAssignBatch}
        isLoading={isSubmitting}
      />
    </div>
  );
}

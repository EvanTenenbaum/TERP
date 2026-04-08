/**
 * ProductsPage - Strain & Product Catalogue Management
 *
 * TER-642: Fix strain management at /products so chain test can create strains
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Loader2, Plus, Search, Beaker, RefreshCw } from "lucide-react";

type StrainCategory = "indica" | "sativa" | "hybrid";

interface StrainFormData {
  name: string;
  category: StrainCategory | "";
  description: string;
}

const initialFormData: StrainFormData = {
  name: "",
  category: "",
  description: "",
};

function getCategoryColor(category: string): string {
  const colors: Record<string, string> = {
    indica: "bg-purple-100 text-purple-800",
    sativa: "bg-green-100 text-green-800",
    hybrid: "bg-amber-100 text-amber-800",
  };
  return colors[category] ?? "bg-gray-100 text-gray-800";
}

interface CreateStrainDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: StrainFormData) => void;
  isPending: boolean;
}

function CreateStrainDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: CreateStrainDialogProps) {
  const [formData, setFormData] = useState<StrainFormData>(initialFormData);

  const handleOpenChange = useCallback(
    (value: boolean) => {
      if (!value) setFormData(initialFormData);
      onOpenChange(value);
    },
    [onOpenChange]
  );

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!formData.name.trim()) {
        toast.error("Strain name is required");
        return;
      }
      if (!formData.category) {
        toast.error("Please select a strain type");
        return;
      }
      onSubmit(formData);
    },
    [formData, onSubmit]
  );

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Strain</DialogTitle>
            <DialogDescription>
              Add a new strain to the catalogue.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="strain-name">
                Strain Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="strain-name"
                name="name"
                aria-label="strain name"
                placeholder="e.g., Blue Dream"
                value={formData.name}
                onChange={e =>
                  setFormData(prev => ({ ...prev, name: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="strain-type">
                Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.category}
                onValueChange={v =>
                  setFormData(prev => ({
                    ...prev,
                    category: v as StrainCategory,
                  }))
                }
              >
                <SelectTrigger
                  id="strain-type"
                  aria-label="type"
                  data-testid="strain-type"
                >
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="indica">Indica</SelectItem>
                  <SelectItem value="sativa">Sativa</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="strain-description">Description (Optional)</Label>
              <Textarea
                id="strain-description"
                name="description"
                placeholder="Enter strain description"
                value={formData.description}
                onChange={e =>
                  setFormData(prev => ({
                    ...prev,
                    description: e.target.value,
                  }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isPending ? "Creating..." : "Create Strain"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default function ProductsPage() {
  const routeSearch = useSearch();
  const [search, setSearch] = useState("");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const utils = trpc.useUtils();

  const {
    data: strainsData,
    isLoading,
    isError,
    error,
    refetch,
  } = trpc.strains.list.useQuery({ limit: 500 });

  useEffect(() => {
    const params = new URLSearchParams(routeSearch);
    const routeQuery = params.get("search");
    if (routeQuery) {
      setSearch(routeQuery);
    }
  }, [routeSearch]);

  const createMutation = trpc.strains.create.useMutation({
    onSuccess: () => {
      toast.success("Strain created successfully");
      utils.strains.list.invalidate();
      setShowCreateDialog(false);
    },
    onError: err => {
      toast.error(err.message ?? "Failed to create strain");
    },
  });

  const strains = useMemo(() => {
    const items = strainsData?.items ?? [];
    if (!search.trim()) return items;
    const lower = search.toLowerCase();
    return items.filter(s => s.name.toLowerCase().includes(lower));
  }, [strainsData, search]);

  const handleCreateSubmit = useCallback(
    (data: StrainFormData) => {
      if (!data.category) return;
      createMutation.mutate({
        name: data.name.trim(),
        category: data.category,
        description: data.description.trim() || undefined,
      });
    },
    [createMutation]
  );

  if (isError) {
    return (
      <div className="p-6">
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
          <p className="text-destructive font-semibold">
            Error Loading Strains
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {error?.message ?? "Failed to load strains from the server."}
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
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b bg-background">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            <Beaker className="h-6 w-6" />
            Products &amp; Strains
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Manage strains and product varieties
          </p>
        </div>
        <Button
          data-testid="create-strain"
          onClick={() => setShowCreateDialog(true)}
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Strain
        </Button>
      </div>
      <div className="px-6 py-3 border-b bg-muted/30">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search strains..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>
      <div className="flex-1 overflow-auto px-6 py-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : strains.length === 0 ? (
          <div className="flex items-center justify-center h-40">
            <div className="text-center">
              <Beaker className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
              <p className="font-medium">No strains found</p>
              <p className="text-sm text-muted-foreground mt-1">
                {search
                  ? "Try adjusting your search"
                  : "Create your first strain"}
              </p>
            </div>
          </div>
        ) : (
          <Table data-testid="strains-table">
            <TableHeader>
              <TableRow>
                <TableHead>Strain Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {strains.map(strain => (
                <TableRow
                  key={strain.id}
                  data-testid="strain-row"
                  className="cursor-pointer hover:bg-muted/50"
                >
                  <TableCell className="font-medium">{strain.name}</TableCell>
                  <TableCell>
                    {strain.category ? (
                      <Badge className={getCategoryColor(strain.category)}>
                        {strain.category.charAt(0).toUpperCase() +
                          strain.category.slice(1)}
                      </Badge>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {strain.description ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
      <CreateStrainDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onSubmit={handleCreateSubmit}
        isPending={createMutation.isPending}
      />
    </div>
  );
}
